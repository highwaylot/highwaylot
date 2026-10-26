// Renders every public page to its own static HTML file after `vite build`,
// so crawlers get real content, titles and links instead of an empty
// <div id="root">. The browser then hydrates that HTML into the normal app.
// URLs not listed here fall back to dist/spa.html (the plain app shell).
// Also writes dist/sitemap.xml from the same page list, so the sitemap only
// ever lists pages that actually exist.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const ssr = await import(pathToFileURL(path.join(root, "dist-ssr/entry-server.js")).href);
const { render, GUIDE_CATALOG, MAKE_BASE_PRICE, slugify, isGuideCarModel, classifyGuideBodyTypes } = ssr;

// NHTSA is a public API that stalls and throttles bursts (on Vercel's build
// machines it started refusing requests partway through), so every request
// gets a timeout plus retries with backoff. A make that still fails ships
// without its long-tail model pages rather than failing the deploy.
const realFetch = globalThis.fetch;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
globalThis.fetch = async (url, opts = {}) => {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await realFetch(url, { ...opts, signal: AbortSignal.timeout(20000) });
      // Only throttling and server errors are worth retrying; other 4xx are answers.
      if (res.ok || (res.status !== 429 && res.status < 500) || attempt === 4) return res;
    } catch (e) {
      if (attempt === 4) throw e;
    }
    await sleep(1000 * 2 ** attempt);
  }
};

async function fetchMakeData(make) {
  try {
    const [data, bodyByModel] = await Promise.all([
      fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/getmodelsformake/${encodeURIComponent(make)}?format=json`).then((r) => r.json()),
      classifyGuideBodyTypes(make),
    ]);
    const names = Array.from(new Set((data.Results || []).map((m) => m.Model_Name))).filter(isGuideCarModel).sort();
    return { names, bodyByModel };
  } catch (e) {
    console.warn(`prerender: NHTSA data unavailable for ${make} (${e.message}) — rendering curated models only`);
    return null;
  }
}

async function mapLimited(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: limit }, async () => {
    while (next < items.length) { const i = next++; out[i] = await fn(items[i]); }
  }));
  return out;
}

// ---------- Live data: NHTSA complaints/recalls + BLS used-car prices ----------
// NHTSA answers "no records for this model year" with HTTP 400 and an empty
// result list, so a 400 carrying that shape is a real zero, not a failure.
const nhtsaJson = async (url) => {
  const res = await fetch(url);
  if (res.ok) return res.json();
  const body = await res.json().catch(() => null);
  if (res.status === 400 && Array.isArray(body?.results) && body.results.length === 0) return body;
  throw new Error(`HTTP ${res.status}`);
};
const friendlyComponent = (c) => c.split(":")[0].trim().toLowerCase().replace(/^\w/, (ch) => ch.toUpperCase());
const IGNORED_COMPONENTS = new Set(["unknown or other"]);

const currentYear = new Date().getFullYear();
const MODEL_YEARS = Array.from({ length: 11 }, (_, i) => currentYear - 10 + i);

async function fetchModelYear({ make, modelKey }, year) {
  const q = `make=${encodeURIComponent(make)}&model=${encodeURIComponent(modelKey)}&modelYear=${year}`;
  const [complaints, recalls] = await Promise.all([
    nhtsaJson(`https://api.nhtsa.gov/complaints/complaintsByVehicle?${q}`),
    nhtsaJson(`https://api.nhtsa.gov/recalls/recallsByVehicle?${q}`),
  ]);
  const byComponent = {};
  for (const c of complaints.results || []) {
    for (const raw of String(c.components || "").split(",")) {
      const name = friendlyComponent(raw);
      if (name && !IGNORED_COMPONENTS.has(name.toLowerCase())) byComponent[name] = (byComponent[name] || 0) + 1;
    }
  }
  return {
    year,
    complaints: complaints.count ?? (complaints.results || []).length,
    recalls: recalls.Count ?? (recalls.results || []).length,
    byComponent,
  };
}

// One model's last 11 model years. Any failed year drops the whole model
// (it falls back to the notes-only section) rather than shipping a chart
// with silently missing years.
function summarizeHistory(entry, years) {
  if (!years || years.some((y) => !y)) {
    console.warn(`prerender: NHTSA complaints/recalls unavailable for ${entry.make} ${entry.modelKey}`);
    return null;
  }
  if (!years.some((y) => y.complaints || y.recalls)) return null;
  const overall = {};
  for (const y of years) for (const [k, v] of Object.entries(y.byComponent)) overall[k] = (overall[k] || 0) + v;
  const top = (counts, n) => Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, n);
  return {
    years: years.map(({ year, complaints, recalls, byComponent }) => ({ year, complaints, recalls, top: top(byComponent, 3) })),
    topAreas: top(overall, 5),
  };
}

// BLS CPI "used cars and trucks" (U.S. city average). The latest month vs
// the same month a year earlier is the market trend shown on the site.
async function fetchUsedCarTrend() {
  try {
    const json = await nhtsaJson("https://api.bls.gov/publicAPI/v1/timeseries/data/CUUR0000SETA02");
    const data = (json.Results?.series?.[0]?.data || []).filter((d) => /^M(0[1-9]|1[0-2])$/.test(d.period));
    const latest = data[0];
    const yearAgo = data.find((d) => d.period === latest.period && Number(d.year) === Number(latest.year) - 1);
    if (!latest || !yearAgo) return null;
    const yoyPct = Math.round(((Number(latest.value) - Number(yearAgo.value)) / Number(yearAgo.value)) * 1000) / 10;
    return { period: `${latest.periodName} ${latest.year}`, yoyPct };
  } catch (e) {
    console.warn(`prerender: BLS used-car index unavailable (${e.message})`);
    return null;
  }
}

const updatedAt = new Date().toISOString().slice(0, 10);
const market = await fetchUsedCarTrend();
const globalData = { updatedAt, ...(market ? { market } : {}) };

const yearTasks = GUIDE_CATALOG.flatMap((entry) => MODEL_YEARS.map((year) => ({ entry, year })));
const yearResults = await mapLimited(yearTasks, 10, ({ entry, year }) => fetchModelYear(entry, year).catch(() => null));
const history = Object.fromEntries(GUIDE_CATALOG.map((entry, i) => [
  `${slugify(entry.make)}/${slugify(entry.modelKey)}`,
  summarizeHistory(entry, yearResults.slice(i * MODEL_YEARS.length, (i + 1) * MODEL_YEARS.length)),
]));
for (const [key, h] of Object.entries(history)) {
  if (!h) continue;
  const file = path.join(dist, "data", "nhtsa", `${key}.json`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(h));
}

const makes = Object.keys(MAKE_BASE_PRICE);
const makeData = Object.fromEntries((await mapLimited(makes, 2, fetchMakeData)).map((d, i) => [makes[i], d]));

const pages = ["/", "/value", "/wikilot", "/terms", "/privacy"].map((url) => ({ url, data: {} }));
for (const make of makes) {
  const md = makeData[make];
  pages.push({ url: `/wikilot/${slugify(make)}`, data: md ? { makeModels: { [make]: md } } : {} });
  const curated = GUIDE_CATALOG.filter((g) => g.make === make);
  for (const g of curated) {
    const key = `${slugify(make)}/${slugify(g.modelKey)}`;
    pages.push({ url: `/wikilot/${key}`, data: history[key] ? { nhtsa: { [key]: history[key] } } : {} });
  }
  if (!md) continue;
  const curatedKeys = new Set(curated.map((g) => g.modelKey));
  const seen = new Set();
  for (const name of md.names) {
    const slug = slugify(name);
    if (curatedKeys.has(name.toLowerCase()) || !md.bodyByModel[name] || seen.has(slug)) continue;
    seen.add(slug);
    const key = `${slugify(make)}/${slug}`;
    pages.push({ url: `/wikilot/${key}`, data: { guideFallback: { [key]: { name, body: md.bodyByModel[name] } } } });
  }
}

const template = fs.readFileSync(path.join(dist, "index.html"), "utf8");

const escapeJson = (obj) => JSON.stringify(obj).replace(/</g, "\\u003c");
const withData = (html, data) => html.replace("<script", `<script>window.__HL_DATA__=${escapeJson(data)}</script>\n    <script`);
fs.writeFileSync(path.join(dist, "spa.html"), withData(template, globalData));
const headTagsFrom = (helmet) => ["title", "meta", "link", "script"].map((k) => helmet[k].toString()).join("");

for (const entry of pages) {
  const { url } = entry;
  const data = { ...globalData, ...entry.data };
  const { html, helmet } = render(url, data);
  const tags = headTagsFrom(helmet);
  let page = template;
  // Drop the template's generic tags wherever this page sets its own.
  if (/<title/.test(tags)) page = page.replace(/<title>[\s\S]*?<\/title>/, "");
  for (const attr of ['name="description"', 'property="og:title"', 'property="og:description"', 'property="og:url"']) {
    if (tags.includes(attr)) page = page.replace(new RegExp(`\\s*<meta ${attr}[^>]*>`), "");
  }
  page = page
    .replace("</head>", `${tags}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${html}</div>`);
  page = withData(page, data);
  const out = url === "/" ? path.join(dist, "index.html") : path.join(dist, url.slice(1), "index.html");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, page);
}

const SITE_URL = "https://www.highwaylot.com";
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(({ url }) => `  <url><loc>${SITE_URL}${url === "/" ? "/" : url}</loc></url>`).join("\n")}
</urlset>
`;
fs.writeFileSync(path.join(dist, "sitemap.xml"), sitemap);

fs.rmSync(path.join(root, "dist-ssr"), { recursive: true, force: true });
const perMake = makes.map((m) => `${m} ${pages.filter((p) => p.url.startsWith(`/wikilot/${slugify(m)}/`)).length}`).join(", ");
console.log(`prerender: wrote ${pages.length} pages (model pages per make: ${perMake})`);
console.log(`prerender: NHTSA complaint/recall history for ${Object.values(history).filter(Boolean).length}/${GUIDE_CATALOG.length} curated models; BLS used-car trend: ${market ? `${market.yoyPct}% YoY (${market.period})` : "unavailable"}`);
