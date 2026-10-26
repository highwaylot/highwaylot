// Refreshes data/live-data.json: NHTSA owner-complaint and recall counts per
// model year for every curated wikiLOT model, plus the BLS used-car price
// trend. Run weekly by .github/workflows/refresh-live-data.yml; the commit it
// produces triggers a normal deploy. Paced one request at a time because
// NHTSA's firewall blocks bursts. Anything that fails keeps last run's data.
//
// Needs the SSR bundle for the model catalog:
//   npx vite build --ssr src/entry-server.jsx --outDir dist-ssr && node scripts/refresh-live-data.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { GUIDE_CATALOG, slugify } = await import(pathToFileURL(path.join(root, "dist-ssr/entry-server.js")).href);
const outFile = path.join(root, "data", "live-data.json");
const previous = fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile, "utf8")) : {};

const PACE_MS = 350;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
class Blocked extends Error {}

async function getJson(url) {
  for (let attempt = 0; attempt < 4; attempt++) {
    await sleep(PACE_MS);
    let res;
    try {
      res = await fetch(url, { signal: AbortSignal.timeout(30000), headers: { "User-Agent": "HighwaylotDataRefresh/1.0 (+https://www.highwaylot.com)" } });
    } catch (e) {
      if (attempt === 3) throw e;
      await sleep(5000 * (attempt + 1));
      continue;
    }
    if (res.ok) return res.json();
    // NHTSA answers "no records for this model year" with 400 + an empty list.
    if (res.status === 400) {
      const body = await res.json().catch(() => null);
      if (Array.isArray(body?.results) && body.results.length === 0) return body;
      throw new Error("HTTP 400");
    }
    if (res.status === 403 || res.status === 429 || res.status >= 500) {
      if (attempt === 3) throw new Blocked(`HTTP ${res.status}`);
      await sleep(60000 * (attempt + 1));
      continue;
    }
    throw new Error(`HTTP ${res.status}`);
  }
}

async function fetchUsedCarTrend() {
  const json = await getJson("https://api.bls.gov/publicAPI/v1/timeseries/data/CUUR0000SETA02");
  const data = (json.Results?.series?.[0]?.data || []).filter((d) => /^M(0[1-9]|1[0-2])$/.test(d.period));
  const latest = data[0];
  const yearAgo = latest && data.find((d) => d.period === latest.period && Number(d.year) === Number(latest.year) - 1);
  if (!yearAgo) throw new Error("no year-ago value");
  const yoyPct = Math.round(((Number(latest.value) - Number(yearAgo.value)) / Number(yearAgo.value)) * 1000) / 10;
  return { period: `${latest.periodName} ${latest.year}`, yoyPct };
}

const friendlyComponent = (c) => c.split(":")[0].trim().toLowerCase().replace(/^\w/, (ch) => ch.toUpperCase());
const IGNORED = new Set(["Unknown or other"]);
const currentYear = new Date().getFullYear();
// Last 10 finished model years; the current one has almost no reports yet
// and would read as a misleading zero.
const MODEL_YEARS = Array.from({ length: 10 }, (_, i) => currentYear - 10 + i);
const top = (counts, n) => Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, n);

// NHTSA files most models under several variant names ("F-150 SUPER CREW",
// "F-150 REGULAR CAB", "RX 350", "RX 450H"…), and newer years often have no
// plain name at all. So each make/year's own name list is fetched, every
// variant of the model is queried, and results are de-duplicated.
const norm = (s) => s.toUpperCase().replace(/-/g, "").replace(/\s+/g, " ").trim();
// Separate vehicles that share a name prefix with a catalog model.
const DISTINCT_MODELS = ["COROLLA CROSS", "MUSTANG MACHE", "EQUINOX EV", "BLAZER EV", "SILVERADO EV", "SIERRA EV", "ESCALADE IQ", "ACCORD CROSSTOUR"];
function isVariantOf(name, modelKey) {
  const n = norm(name), k = norm(modelKey);
  if (n.includes("POLICE") || !n.startsWith(k)) return false;
  if (DISTINCT_MODELS.some((d) => n.startsWith(d) && !k.startsWith(d))) return false;
  const next = n.charAt(k.length);
  // "CX5" must not match "CX50"; "RX" may match "RX350".
  return !next || !(/\d$/.test(k) && /\d/.test(next));
}

const nameLists = new Map();
async function variantNames(make, year, issueType, modelKey) {
  const cacheKey = `${make}|${year}|${issueType}`;
  if (!nameLists.has(cacheKey)) {
    const json = await getJson(`https://api.nhtsa.gov/products/vehicle/models?modelYear=${year}&make=${encodeURIComponent(make)}&issueType=${issueType}`);
    nameLists.set(cacheKey, [...new Set((json.results || []).map((r) => r.model))]);
  }
  return nameLists.get(cacheKey).filter((name) => isVariantOf(name, modelKey));
}

async function fetchModelYear(make, modelKey, year) {
  const complaints = new Map();
  for (const name of await variantNames(make, year, "c", modelKey)) {
    const json = await getJson(`https://api.nhtsa.gov/complaints/complaintsByVehicle?make=${encodeURIComponent(make)}&model=${encodeURIComponent(name)}&modelYear=${year}`);
    for (const c of json.results || []) complaints.set(c.odiNumber, c);
  }
  const recalls = new Set();
  for (const name of await variantNames(make, year, "r", modelKey)) {
    const json = await getJson(`https://api.nhtsa.gov/recalls/recallsByVehicle?make=${encodeURIComponent(make)}&model=${encodeURIComponent(name)}&modelYear=${year}`);
    for (const r of json.results || []) recalls.add(r.NHTSACampaignNumber);
  }
  const byComponent = {};
  for (const c of complaints.values()) {
    for (const raw of String(c.components || "").split(",")) {
      const comp = friendlyComponent(raw);
      if (comp && !IGNORED.has(comp)) byComponent[comp] = (byComponent[comp] || 0) + 1;
    }
  }
  return { year, complaints: complaints.size, recalls: recalls.size, byComponent };
}

async function fetchModelHistory({ make, modelKey }) {
  const years = [];
  for (const year of MODEL_YEARS) years.push(await fetchModelYear(make, modelKey, year));
  if (!years.some((y) => y.complaints || y.recalls)) return null;
  const overall = {};
  for (const y of years) for (const [k, v] of Object.entries(y.byComponent)) overall[k] = (overall[k] || 0) + v;
  return {
    years: years.map(({ year, complaints, recalls, byComponent }) => ({ year, complaints, recalls, top: top(byComponent, 3) })),
    topAreas: top(overall, 5),
  };
}

let market = previous.market || null;
try {
  market = await fetchUsedCarTrend();
} catch (e) {
  console.warn(`BLS used-car trend failed (${e.message}) — keeping previous`);
}

const nhtsa = { ...(previous.nhtsa || {}) };
let refreshed = 0, failed = 0;
for (const entry of GUIDE_CATALOG) {
  const key = `${slugify(entry.make)}/${slugify(entry.modelKey)}`;
  try {
    const h = await fetchModelHistory(entry);
    if (h) nhtsa[key] = h; else delete nhtsa[key];
    refreshed++;
    console.log(`${key}: ${h ? h.years.map((y) => y.complaints).join(",") : "no NHTSA records"}`);
  } catch (e) {
    failed++;
    console.warn(`${key}: failed (${e.message}) — keeping previous`);
    if (e instanceof Blocked) {
      failed += GUIDE_CATALOG.length - refreshed - failed;
      console.warn("NHTSA is blocking requests — stopping; remaining models keep previous data");
      break;
    }
  }
}

// The site's "data updated" date only moves when the whole set refreshed.
const today = new Date().toISOString().slice(0, 10);
const updatedAt = failed === 0 ? today : previous.updatedAt || today;
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify({ updatedAt, market, nhtsa }, null, 1) + "\n");
console.log(`live data: ${refreshed} refreshed, ${failed} kept previous; updatedAt ${updatedAt}; BLS ${market ? `${market.yoyPct}% (${market.period})` : "none"}`);
