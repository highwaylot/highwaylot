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
  Toyota: ["camry", "corolla", "rav4", "highlander", "tacoma", "tundra"],
  Honda: ["civic", "accord", "cr-v", "pilot", "odyssey"],
  Ford: ["f-150", "explorer", "escape", "mustang", "bronco sport"],
  Chevrolet: ["silverado", "equinox", "malibu", "tahoe", "traverse"],
  Ram: ["1500"],
  Jeep: ["grand cherokee", "wrangler", "cherokee", "compass"],
  Nissan: ["altima", "rogue", "sentra"],
  Hyundai: ["elantra", "tucson", "santa fe"],
  Kia: ["forte", "sportage", "telluride"],
  Subaru: ["outback", "forester", "crosstrek"],
  Tesla: ["model 3", "model y"],
};

function xmlEscape(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export default async function handler(req, res) {
  try {
    const listingsRes = await fetch(
      `${SUPABASE_URL}/rest/v1/listings?select=id,make,state,body,updated_at,created_at&status=eq.active&deleted_at=is.null`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    const listings = listingsRes.ok ? await listingsRes.json() : [];

    const urls = new Map(); // path -> lastmod, dedupes category combos automatically

    for (const route of STATIC_ROUTES) urls.set(route, null);

    for (const make of GUIDE_MAKES) {
      urls.set(`/guide/${slugify(make)}`, null);
      for (const model of GUIDE_MODELS[make] || []) urls.set(`/guide/${slugify(make)}/${slugify(model)}`, null);
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
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=3600"); // CDN can cache an hour; browsers shouldn't
    res.status(200).send(body);
  } catch (err) {
    console.error("sitemap generation failed:", err.message);
    res.status(500).send("");
  }
}
