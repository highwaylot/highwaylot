// Dynamic sitemap — listings and category pages come from live Supabase
// data, so a static file would go stale immediately. Regenerated fresh on
// every request rather than cached, since inventory changes constantly and
// this is cheap (a couple of small selects).
//
// Uses the same public anon key as the frontend (src/lib/supabaseClient.js)
// — read-only, same RLS as any visitor already gets in their browser.

const SUPABASE_URL = "https://tssjnvyqvzocqntvssco.supabase.co";
const SUPABASE_KEY = "sb_publishable_eVlH-_ITZKhNNOsKB890cQ_Nacto5eW";
const SITE_URL = "https://www.highwaylot.com";

const BODY_SLUGS = { Sedan: "sedan", Coupe: "coupe", Hatchback: "hatchback", SUV: "suv", Truck: "truck", "Van/Minivan": "van-minivan", Convertible: "convertible" };
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const STATIC_ROUTES = ["/", "/post", "/value", "/quiz", "/terms", "/privacy", "/guide"];

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

// Full model list per make, straight from NHTSA's free public API — same
// source GuideMake fetches client-side for the "every other model" section,
// pulled here too so the sitemap can point crawlers directly at those URLs
// instead of relying on them discovering client-rendered links. This
// sandbox's dev proxy can't reach vpic.nhtsa.dot.gov, but this function runs
// on real Vercel infra in production with normal internet access — same as
// any other fetch already in this file. A per-make failure just means that
// make's long-tail models are missing from this run's sitemap, not a
// broken build.
async function fetchNhtsaModels(make) {
  try {
    const r = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/getmodelsformake/${encodeURIComponent(make)}?format=json`);
    if (!r.ok) return [];
    const data = await r.json();
    return Array.from(new Set((data.Results || []).map((m) => m.Model_Name)));
  } catch {
    return [];
  }
}

export default async function handler(req, res) {
  try {
    const listingsRes = await fetch(
      `${SUPABASE_URL}/rest/v1/listings?select=id,make,state,body,updated_at,created_at&status=eq.active&deleted_at=is.null`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    const listings = listingsRes.ok ? await listingsRes.json() : [];
    const nhtsaByMake = Object.fromEntries(
      await Promise.all(GUIDE_MAKES.map(async (make) => [make, await fetchNhtsaModels(make)]))
    );

    const urls = new Map(); // path -> lastmod, dedupes category combos automatically

    for (const route of STATIC_ROUTES) urls.set(route, null);

    for (const make of GUIDE_MAKES) {
      const makeSlug = slugify(make);
      urls.set(`/guide/${makeSlug}`, null);
      const curated = new Set((GUIDE_MODELS[make] || []).map((m) => m.toLowerCase()));
      for (const model of GUIDE_MODELS[make] || []) urls.set(`/guide/${makeSlug}/${slugify(model)}`, null);
      for (const model of nhtsaByMake[make] || []) {
        if (!curated.has(model.toLowerCase())) urls.set(`/guide/${makeSlug}/${slugify(model)}`, null);
      }
    }

    for (const l of listings) {
      const lastmod = l.updated_at || l.created_at || null;
      urls.set(`/listing/${l.id}`, lastmod);

      if (l.state) {
        const stateSlug = slugify(l.state);
        if (l.make) urls.set(`/category/make/${slugify(l.make)}/${stateSlug}`, lastmod);
        if (l.body) urls.set(`/category/body/${BODY_SLUGS[l.body] || slugify(l.body)}/${stateSlug}`, lastmod);
      }
    }

    const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...urls.entries()]
      .map(([path, lastmod]) => `  <url>\n    <loc>${xmlEscape(SITE_URL + path)}</loc>${lastmod ? `\n    <lastmod>${new Date(lastmod).toISOString().slice(0, 10)}</lastmod>` : ""}\n  </url>`)
      .join("\n")}\n</urlset>\n`;

    res.setHeader("Content-Type", "application/xml");
    // Longer CDN cache than before (was 1hr) now that this fetches ~25 live
    // NHTSA model lists per request on top of the Supabase listings query —
    // that data barely changes day to day, so no reason to re-fetch it hourly.
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=21600"); // 6hr CDN cache; browsers shouldn't cache
    res.status(200).send(body);
  } catch (err) {
    console.error("sitemap generation failed:", err.message);
    res.status(500).send("");
  }
}
