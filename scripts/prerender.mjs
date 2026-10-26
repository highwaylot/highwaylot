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

// ---------- Live data (NHTSA complaints/recalls + BLS used-car prices) ----------
// Fetched slowly by scripts/refresh-live-data.mjs on a weekly schedule and
// committed to data/live-data.json — fetching ~2,000 NHTSA records during
// every deploy gets the build IP blocked by NHTSA's firewall.
const liveDataFile = path.join(root, "data", "live-data.json");
const live = fs.existsSync(liveDataFile) ? JSON.parse(fs.readFileSync(liveDataFile, "utf8")) : {};
const history = live.nhtsa || {};
const market = live.market || null;
const globalData = { ...(live.updatedAt ? { updatedAt: live.updatedAt } : {}), ...(market ? { market } : {}) };
for (const [key, h] of Object.entries(history)) {
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
console.log(`prerender: live data from ${live.updatedAt || "nowhere (data/live-data.json missing)"} — NHTSA history for ${Object.keys(history).length}/${GUIDE_CATALOG.length} curated models, BLS trend ${market ? `${market.yoyPct}% (${market.period})` : "none"}`);
