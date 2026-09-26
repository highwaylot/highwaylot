// Dynamic sitemap — the wikiLOT guide's model coverage comes from a live
// NHTSA classification pass, so a static file would go stale immediately.
// Regenerated fresh on every request rather than cached (the 6hr CDN
// cache below absorbs repeats).
//
// The marketplace (listings/category pages) is dormant on main right now
// — only the valuation tool and wikiLOT guide are live — so this doesn't
// query Supabase or emit /listing or /category URLs. Restore that block
// (see git history) once /post and browsing are live here again.

const SITE_URL = "https://www.highwaylot.com";

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const STATIC_ROUTES = ["/value", "/terms", "/privacy", "/guide"];

// Mirrors MAKE_BASE_PRICE / GUIDE_CATALOG in src/App.jsx (GuideMake/GuidePage
// routes) — kept in sync by hand since this file can't import from the SPA
// bundle. Update both places if a make/model is added or removed there.
const GUIDE_MAKES = ["Ford", "Toyota", "Honda", "Chevrolet", "Jeep", "Ram", "GMC", "Nissan", "Hyundai", "Kia", "Subaru", "Volkswagen", "BMW", "Mercedes-Benz", "Audi", "Lexus", "Mazda", "Dodge", "Chrysler", "Buick", "Cadillac", "Tesla", "Mitsubishi", "Volvo", "Acura"];
const GUIDE_MODELS = {
  Toyota: ["camry", "corolla", "rav4", "highlander", "tacoma", "tundra", "sienna", "4runner"],
  Honda: ["civic", "accord", "cr-v", "pilot", "odyssey", "ridgeline"],
  Ford: ["f-150", "explorer", "escape", "mustang", "bronco sport", "expedition", "edge"],
  Chevrolet: ["silverado", "equinox", "malibu", "tahoe", "traverse", "colorado", "camaro", "blazer"],
  Ram: ["1500", "2500"],
  Jeep: ["grand cherokee", "wrangler", "cherokee", "compass", "gladiator"],
  Nissan: ["altima", "rogue", "sentra", "pathfinder", "frontier", "murano"],
  Hyundai: ["elantra", "tucson", "santa fe", "sonata", "palisade", "kona"],
  Kia: ["forte", "sportage", "telluride", "k5", "soul", "seltos"],
  Subaru: ["outback", "forester", "crosstrek", "impreza", "ascent"],
  Tesla: ["model 3", "model y", "model s"],
  GMC: ["sierra", "yukon", "terrain"],
  BMW: ["3 series", "x5"],
  "Mercedes-Benz": ["c-class", "glc"],
  Audi: ["a4", "q5"],
  Lexus: ["rx", "es"],
  Mazda: ["cx-5", "cx-9", "mazda3"],
  Dodge: ["charger", "durango"],
  Chrysler: ["pacifica"],
  Buick: ["encore", "enclave"],
  Cadillac: ["escalade", "xt5"],
  Mitsubishi: ["outlander"],
  Volvo: ["xc60"],
  Acura: ["mdx", "rdx"],
  Volkswagen: ["jetta", "tiguan"],
};

function xmlEscape(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// NHTSA registers BMW Motorrad (motorcycles) under the same "BMW" make name
// as BMW Automobile — mirrors isGuideCarModel in src/App.jsx.
const NON_CAR_MODEL_PATTERN = /^(K|R|F|G|C|S)\s?\d{2,4}|^HP\d|^M\s\d{3,4}|^(L7|K1|CE\s?0[24])$/i;

// Mirrors classifyGuideBodyTypes in src/App.jsx — a model gets its own
// sitemap URL only once it either has curated pricing (GUIDE_MODELS above)
// or a real NHTSA body-type classification, since GuidePage itself only
// renders content for those two cases and redirects everything else. This
// keeps the sitemap from pointing crawlers at URLs that just 302 away.
async function classifiedModelsForMake(make, curatedSet) {
  const year = new Date().getFullYear() - 1;
  const vehicleTypes = ["car", "truck", "mpv", "van", "bus"];
  try {
    const [allRes, ...typeResList] = await Promise.all([
      fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/getmodelsformake/${encodeURIComponent(make)}?format=json`).then((r) => r.json()),
      ...vehicleTypes.map((type) =>
        fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeYear/make/${encodeURIComponent(make)}/modelyear/${year}/vehicletype/${type}?format=json`)
          .then((r) => r.json())
          .catch(() => ({ Results: [] }))
      ),
    ]);
    const allNames = new Set((allRes.Results || []).map((m) => m.Model_Name).filter((n) => !NON_CAR_MODEL_PATTERN.test(n.trim())));
    const classified = new Set();
    for (const typeRes of typeResList) for (const m of typeRes.Results || []) if (allNames.has(m.Model_Name)) classified.add(m.Model_Name);
    return [...classified].filter((n) => !curatedSet.has(n.toLowerCase()));
  } catch {
    return [];
  }
}

export default async function handler(req, res) {
  try {
    const urls = new Map(); // path -> lastmod, dedupes category combos automatically

    for (const route of STATIC_ROUTES) urls.set(route, null);

    for (const make of GUIDE_MAKES) {
      urls.set(`/guide/${slugify(make)}`, null);
      for (const model of GUIDE_MODELS[make] || []) urls.set(`/guide/${slugify(make)}/${slugify(model)}`, null);
    }
    // Run all 25 makes' classification fetches concurrently rather than one
    // at a time — sequential would be ~150 fetches in series, too slow for
    // a serverless response even with the 6hr CDN cache absorbing repeats.
    const classifiedByMake = await Promise.all(
      GUIDE_MAKES.map((make) => classifiedModelsForMake(make, new Set((GUIDE_MODELS[make] || []).map((m) => m.toLowerCase()))))
    );
    GUIDE_MAKES.forEach((make, i) => {
      for (const model of classifiedByMake[i]) urls.set(`/guide/${slugify(make)}/${slugify(model)}`, null);
    });

    const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...urls.entries()]
      .map(([path, lastmod]) => `  <url>\n    <loc>${xmlEscape(SITE_URL + path)}</loc>${lastmod ? `\n    <lastmod>${new Date(lastmod).toISOString().slice(0, 10)}</lastmod>` : ""}\n  </url>`)
      .join("\n")}\n</urlset>\n`;

    res.setHeader("Content-Type", "application/xml");
    // 6hr CDN cache (was 1hr) — this now runs ~150 live NHTSA fetches per
    // build (6 per make x 25 makes) to classify long-tail model body types,
    // and that data barely changes day to day.
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=21600");
    res.status(200).send(body);
  } catch (err) {
    console.error("sitemap generation failed:", err.message);
    res.status(500).send("");
  }
}
