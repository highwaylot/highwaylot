import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Search, MapPin, Gauge, Fuel, Calendar, X, Plus, ChevronLeft, ChevronRight,
  ShieldCheck, Phone, SlidersHorizontal, Car as CarIcon, Check, Star,
  TrendingUp, TrendingDown, Zap, BarChart3, Building2, Camera, Lock, FileText, DollarSign, Info
} from "lucide-react";
import { Routes, Route, useNavigate, useParams, useLocation, Link } from "react-router-dom";
import { supabase } from "./lib/supabaseClient";

// Category URL slugs — explicit map for body types (not naive lowercasing,
// since "Van/Minivan" has a slash that isn't a valid URL path segment on its
// own). Make names are open-ended, so those get resolved against real
// listing data by CategoryPage itself rather than a fixed map.
const BODY_SLUGS = { Sedan: "sedan", Coupe: "coupe", Hatchback: "hatchback", SUV: "suv", Truck: "truck", "Van/Minivan": "van-minivan", Convertible: "convertible" };
const BODY_SLUGS_REVERSE = Object.fromEntries(Object.entries(BODY_SLUGS).map(([k, v]) => [v, k]));
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
function categoryToPath(category) {
  const stateSlug = slugify(category.state);
  if (category.kind === "make") return `/category/make/${slugify(category.make)}/${stateSlug}`;
  return `/category/body/${BODY_SLUGS[category.body] || slugify(category.body)}/${stateSlug}`;
}

// Scrolls to top on every route change — without this, navigating to a new
// page keeps whatever scroll position the previous page was at, which reads
// as broken.
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

// Explicit column list, deliberately excluding manage_token — every query
// against listings uses this instead of '*', since manage_token's SELECT
// privilege is revoked for the public role in the database itself (see
// schema.sql). Using '*' would actually error for that reason, which is
// the point: even a bypass of this app's own code can't read the token.
const LISTING_COLUMNS = "id,year,make,model,trim,price,mileage,city,state,fuel,trans,color,seller,verified,featured,body,condition,loan_status,loan_balance,damage_points,issues,description,phone,photos,created_at,status,price_updated_at,sold_at";

function generateToken() {
  if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0, v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ---------- Design tokens ----------
const C = {
  ink: "#1B2431", paper: "#FAFAF6", yellow: "#F5B700", yellowDark: "#8A6600",
  steel: "#5B6472", line: "#DEDBD1", green: "#2F6B4F", greenBg: "#E7F0EA", card: "#FFFFFF",
};
const FONT_HEAD = "'Oswald', 'Arial Narrow', sans-serif";
const FONT_BODY = "'Inter', system-ui, sans-serif";

const US_STATES = ["Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware","District of Columbia","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming"];
// Newest first, one year ahead of today's calendar year to cover early
// next-model-year listings (a 2027 model can legitimately show up in late 2026).
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR + 1 - 1980 + 1 }, (_, i) => CURRENT_YEAR + 1 - i);
const STATE_ABBR = { Alabama:"AL",Alaska:"AK",Arizona:"AZ",Arkansas:"AR",California:"CA",Colorado:"CO",Connecticut:"CT",Delaware:"DE","District of Columbia":"DC",Florida:"FL",Georgia:"GA",Hawaii:"HI",Idaho:"ID",Illinois:"IL",Indiana:"IN",Iowa:"IA",Kansas:"KS",Kentucky:"KY",Louisiana:"LA",Maine:"ME",Maryland:"MD",Massachusetts:"MA",Michigan:"MI",Minnesota:"MN",Mississippi:"MS",Missouri:"MO",Montana:"MT",Nebraska:"NE",Nevada:"NV","New Hampshire":"NH","New Jersey":"NJ","New Mexico":"NM","New York":"NY","North Carolina":"NC","North Dakota":"ND",Ohio:"OH",Oklahoma:"OK",Oregon:"OR",Pennsylvania:"PA","Rhode Island":"RI","South Carolina":"SC","South Dakota":"SD",Tennessee:"TN",Texas:"TX",Utah:"UT",Vermont:"VT",Virginia:"VA",Washington:"WA","West Virginia":"WV",Wisconsin:"WI",Wyoming:"WY" };
const stateAbbr = (s) => STATE_ABBR[s] || s;
const MAKE_COLORS = { Ford:"#2B4C7E",Toyota:"#7E2B2B",Honda:"#2B7E4C",Chevrolet:"#7E6A2B",Jeep:"#3E4D2B",Tesla:"#3A3A3A",Subaru:"#2B577E",Ram:"#5A2B7E",GMC:"#7E4B2B",Nissan:"#2B7E7A",BMW:"#2B3A7E",Dodge:"#7E2B4A",Hyundai:"#1F6B5E",Kia:"#7E1F5E",Mazda:"#8E2A2A",Volkswagen:"#2A5A8E",Lexus:"#5E5E2A",Audi:"#2A2A5E",Acura:"#4A2A6E",Cadillac:"#6E4A2A",Buick:"#3A5A5A","Mercedes-Benz":"#2A3A3A",Chrysler:"#5A2A2A",Mitsubishi:"#7E4A1F",Volvo:"#1F4A6E" };

let seed = [
  { year:2021, make:"Ford", model:"F-150", trim:"XLT SuperCrew", price:34900, mileage:28500, city:"Austin", state:"Texas", fuel:"Gas", trans:"Automatic", color:"Oxford White", seller:"Dealer", verified:true, posted:"2 days ago", body:"Truck", desc:"One-owner F-150 with tow package, backup camera, and clean Carfax.", featured:true },
  { year:2019, make:"Toyota", model:"Camry", trim:"SE", price:17200, mileage:41200, city:"Sacramento", state:"California", fuel:"Gas", trans:"Automatic", color:"Celestial Silver", seller:"Private", verified:false, posted:"5 hours ago", body:"Sedan", desc:"Well-maintained Camry, single owner, always garaged.", featured:false },
  { year:2022, make:"Honda", model:"Civic", trim:"Sport", price:21400, mileage:15300, city:"Orlando", state:"Florida", fuel:"Gas", trans:"Manual", color:"Rallye Red", seller:"Private", verified:true, posted:"1 day ago", body:"Sedan", desc:"Manual transmission Civic Sport, fun to drive and cheap on gas.", featured:false },
  { year:2020, make:"Chevrolet", model:"Silverado 1500", trim:"LT Trail Boss", price:32800, mileage:36700, city:"Buffalo", state:"New York", fuel:"Gas", trans:"Automatic", color:"Black", seller:"Dealer", verified:true, posted:"3 days ago", body:"Truck", desc:"Lifted Trail Boss trim, off-road package, tow hitch.", featured:true },
  { year:2018, make:"Jeep", model:"Wrangler", trim:"Rubicon", price:28900, mileage:52100, city:"Chicago", state:"Illinois", fuel:"Gas", trans:"Manual", color:"Firecracker Red", seller:"Private", verified:false, posted:"6 days ago", body:"SUV", desc:"Rubicon with soft top and hard top included.", featured:false },
  { year:2023, make:"Tesla", model:"Model 3", trim:"Long Range", price:38500, mileage:9800, city:"Columbus", state:"Ohio", fuel:"Electric", trans:"Automatic", color:"Pearl White", seller:"Private", verified:true, posted:"12 hours ago", body:"Sedan", desc:"Like-new Model 3 Long Range, full self-driving capable.", featured:false },
  { year:2019, make:"Subaru", model:"Outback", trim:"Premium", price:19700, mileage:47300, city:"Atlanta", state:"Georgia", fuel:"Gas", trans:"Automatic", color:"Wilderness Green", seller:"Private", verified:false, posted:"4 days ago", body:"Wagon", desc:"AWD Outback, great for road trips.", featured:false },
  { year:2021, make:"Ram", model:"1500", trim:"Big Horn", price:33200, mileage:24100, city:"Seattle", state:"Washington", fuel:"Gas", trans:"Automatic", color:"Granite Crystal", seller:"Dealer", verified:true, posted:"1 day ago", body:"Truck", desc:"Big Horn crew cab, leather seats, sunroof.", featured:false },
  { year:2020, make:"Honda", model:"CR-V", trim:"EX-L", price:24600, mileage:31500, city:"Phoenix", state:"Arizona", fuel:"Gas", trans:"Automatic", color:"Modern Steel", seller:"Dealer", verified:true, posted:"8 hours ago", body:"SUV", desc:"CR-V EX-L with leather, sunroof, and Honda Sensing.", featured:true },
  { year:2022, make:"Toyota", model:"RAV4", trim:"XLE", price:27800, mileage:18200, city:"Philadelphia", state:"Pennsylvania", fuel:"Hybrid", trans:"Automatic", color:"Blueprint", seller:"Private", verified:true, posted:"2 days ago", body:"SUV", desc:"Hybrid RAV4, excellent fuel economy.", featured:false },
  { year:2016, make:"Ford", model:"Mustang", trim:"GT Premium", price:23900, mileage:44800, city:"Charlotte", state:"North Carolina", fuel:"Gas", trans:"Manual", color:"Race Red", seller:"Private", verified:false, posted:"3 days ago", body:"Coupe", desc:"5.0 GT with manual gearbox.", featured:false },
  { year:2019, make:"Chevrolet", model:"Tahoe", trim:"LT", price:36700, mileage:39400, city:"Detroit", state:"Michigan", fuel:"Gas", trans:"Automatic", color:"Black", seller:"Dealer", verified:true, posted:"5 days ago", body:"SUV", desc:"Third-row Tahoe LT, tow package, captains chairs.", featured:false },
  { year:2018, make:"Nissan", model:"Altima", trim:"SV", price:15300, mileage:58600, city:"Nashville", state:"Tennessee", fuel:"Gas", trans:"Automatic", color:"Gun Metallic", seller:"Private", verified:false, posted:"4 days ago", body:"Sedan", desc:"Reliable commuter car, recent inspection.", featured:false },
  { year:2021, make:"BMW", model:"3 Series", trim:"330i", price:31900, mileage:22700, city:"Las Vegas", state:"Nevada", fuel:"Gas", trans:"Automatic", color:"Alpine White", seller:"Dealer", verified:true, posted:"6 hours ago", body:"Sedan", desc:"330i with premium package, heated seats.", featured:false },
  { year:2020, make:"Dodge", model:"Charger", trim:"R/T", price:29400, mileage:27900, city:"Portland", state:"Oregon", fuel:"Gas", trans:"Automatic", color:"Octane Red", seller:"Private", verified:false, posted:"2 days ago", body:"Sedan", desc:"5.7 HEMI Charger R/T, strong and quick.", featured:false },
];
seed = seed.map((c, i) => ({ ...c, id: i + 1 }));

const fmtPrice = (n) => "$" + n.toLocaleString("en-US");
const fmtMiles = (n) => n.toLocaleString("en-US") + " mi";

// Compares a listing's price against real comps already on the site (same
// make/model, within 2 model years). Needs at least 2 comps to say anything —
// otherwise it honestly shows nothing rather than a guess.
function estimateFairness(listing, allListings) {
  const comps = allListings.filter((c) => c.id !== listing.id && c.make === listing.make && c.model === listing.model && Math.abs(c.year - listing.year) <= 2);
  if (comps.length < 2) return null;
  const avg = comps.reduce((s, c) => s + c.price, 0) / comps.length;
  const diffPct = (listing.price - avg) / avg;
  let verdict, tone;
  if (diffPct <= -0.07) { verdict = "Good deal"; tone = "verified"; }
  else if (diffPct >= 0.07) { verdict = "Above market"; tone = "yellow"; }
  else { verdict = "Fair price"; tone = "neutral"; }
  return { verdict, tone, diffPct, compCount: comps.length, avg };
}

function FairnessBadge({ fairness, size = "small" }) {
  if (!fairness) return null;
  const Icon = fairness.diffPct <= -0.07 ? TrendingDown : fairness.diffPct >= 0.07 ? TrendingUp : Info;
  return <Badge tone={fairness.tone}><Icon size={11} />{fairness.verdict}</Badge>;
}

// Credibility score — real signals only, no guessing beyond what's in the
// data. Flags: price way below comps combined with no reported damage and
// good/excellent condition (the actual signature of a bait listing), a
// likely duplicate elsewhere on the site, or a near-empty description.
function computeCredibility(listing, allListings) {
  const flags = [];
  if (listing.fairness && listing.fairness.diffPct <= -0.4) {
    const hasNoDamageDisclosed = !listing.issues || !Object.values(listing.issues).some((v) => v === "Broken" || v === "Major" || v === true);
    const noIssuesReported = hasNoDamageDisclosed && ["Excellent", "Good"].includes(listing.condition);
    if (noIssuesReported) flags.push({ weight: 40, label: "Priced far below similar listings with no reported issues" });
    else flags.push({ weight: 15, label: "Priced notably below similar listings" });
  }
  const duplicate = allListings.some((c) => c.id !== listing.id && c.year === listing.year && c.make === listing.make && c.model === listing.model && Math.abs(c.mileage - listing.mileage) < 500);
  if (duplicate) flags.push({ weight: 25, label: "Matches another listing's year, make, model, and mileage closely" });
  if (!listing.desc || listing.desc.trim().length < 20 || listing.desc === "No additional description provided.") {
    flags.push({ weight: 10, label: "Little to no description provided" });
  }
  const totalWeight = flags.reduce((s, f) => s + f.weight, 0);
  const level = totalWeight >= 40 ? "red" : totalWeight >= 15 ? "yellow" : "green";
  return { level, flags };
}
function CredibilityDot({ credibility }) {
  if (!credibility) return null;
  const colors = { green: "#3B9E5F", yellow: C.yellow, red: "#E24B4A" };
  const titles = { green: "No issues detected", yellow: "Worth a closer look before contacting", red: "Multiple red flags — verify carefully" };
  const tooltip = credibility.flags.length > 0 ? credibility.flags.map((f) => f.label).join(". ") : titles[credibility.level];
  return (
    <span title={tooltip} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, color: C.steel }}>
      <span style={{ width: 9, height: 9, borderRadius: "50%", background: colors[credibility.level], flexShrink: 0 }} />
      {titles[credibility.level]}
    </span>
  );
}

// ---------- Analytics ----------
// Every call writes a real row into Supabase's `events` table. Fire-and-forget:
// we don't block the UI on it, and we don't read it back (no public read policy
// on this table — see schema.sql).
// QR/flyer attribution — captured once, the moment someone lands from a
// tagged link (?src=flyer-keywest), then attached to every event for the
// rest of that browser session. sessionStorage is the right tool here —
// this is a real deployed site, not the sandboxed artifact preview where
// browser storage is off-limits.
function captureAttribution() {
  try {
    const params = new URLSearchParams(window.location.search);
    const src = params.get("src");
    if (src) sessionStorage.setItem("hl_src", src);
    return sessionStorage.getItem("hl_src") || null;
  } catch { return null; }
}

function useAnalytics() {
  const log = (type, payload = {}) => {
    let src = null;
    try { src = sessionStorage.getItem("hl_src"); } catch {}
    supabase.from("events").insert({ type, payload: src ? { ...payload, src } : payload }).then(({ error }) => {
      if (error) console.error("event log failed:", error.message);
    });
  };
  return { log };
}

// ---------- Shared UI ----------
function CarThumb({ make, body, size = "normal" }) {
  const bg = MAKE_COLORS[make] || C.steel;
  const h = size === "large" ? 340 : size === "hero" ? 220 : 160;
  return (
    <div style={{ background: bg, height: h, borderRadius: size === "large" ? 8 : "6px 6px 0 0", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
      <CarIcon size={size === "large" ? 96 : size === "hero" ? 72 : 52} color="rgba(255,255,255,0.28)" strokeWidth={1.25} />
      <div style={{ position: "absolute", bottom: 10, left: 12, fontFamily: FONT_HEAD, fontSize: 12, letterSpacing: 1, color: "rgba(255,255,255,0.75)", textTransform: "uppercase" }}>{body}</div>
    </div>
  );
}
function Badge({ children, tone = "neutral" }) {
  const tones = { neutral: { bg: "#EFEDE4", color: C.steel }, verified: { bg: C.greenBg, color: C.green }, yellow: { bg: "#FFF3D6", color: C.yellowDark }, danger: { bg: "#FBE4E3", color: "#A32D2D" } };
  const t = tones[tone];
  return <span style={{ background: t.bg, color: t.color, fontSize: 12, fontWeight: 600, padding: "3px 9px", borderRadius: 4, display: "inline-flex", alignItems: "center", gap: 4 }}>{children}</span>;
}
function OptionalTag() {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, fontWeight: 700, color: C.steel, border: `1.5px dashed ${C.line}`, borderRadius: 20, padding: "3px 10px", letterSpacing: 0.3, textTransform: "uppercase" }}>
      Optional — skip if unsure
    </span>
  );
}
const POPULAR_MAKES = ["Ford", "Toyota", "Honda", "Chevrolet", "Jeep", "Ram", "GMC", "Nissan", "Hyundai", "Kia", "Subaru", "Volkswagen", "BMW", "Mercedes-Benz", "Audi", "Lexus", "Mazda", "Dodge", "Chrysler", "Buick", "Cadillac", "Tesla", "Mitsubishi", "Volvo", "Acura"];

// Make list is curated (the common ones people actually sell). Models are
// fetched live from NHTSA's free public vPIC API for whichever make is
// picked — real data, no maintenance on our end. "Other" always available
// as an escape hatch on both fields so nobody's ever blocked from listing.
function MakeModelPicker({ make, model, onMakeChange, onModelChange, errors, clearError }) {
  const [customMake, setCustomMake] = useState(Boolean(make) && !POPULAR_MAKES.includes(make));
  const [customModel, setCustomModel] = useState(false);
  const [models, setModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(false);

  useEffect(() => {
    if (customMake || !make) { setModels([]); return; }
    setLoadingModels(true);
    fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/getmodelsformake/${encodeURIComponent(make)}?format=json`)
      .then((r) => r.json())
      .then((data) => {
        const names = Array.from(new Set((data.Results || []).map((m) => m.Model_Name))).sort();
        setModels(names);
      })
      .catch(() => setModels([]))
      .finally(() => setLoadingModels(false));
  }, [make, customMake]);

  const smallBtn = { fontSize: 11.5, background: "transparent", border: `1px solid ${C.line}`, borderRadius: 4, padding: "0 10px", cursor: "pointer", color: C.steel, whiteSpace: "nowrap" };

  return (
    <>
      <Field label="Make" required error={errors.make}>
        {!customMake ? (
          <select value={make} onChange={(e) => { if (e.target.value === "__other__") { setCustomMake(true); onMakeChange(""); } else { onMakeChange(e.target.value); setCustomModel(false); onModelChange(""); clearError && clearError("make"); } }} style={inputStyle}>
            <option value="">Select make</option>
            {POPULAR_MAKES.map((m) => <option key={m} value={m}>{m}</option>)}
            <option value="__other__">Other (type it in)</option>
          </select>
        ) : (
          <div style={{ display: "flex", gap: 6 }}>
            <input value={make} onChange={(e) => { onMakeChange(e.target.value); clearError && clearError("make"); }} placeholder="Type the make" style={inputStyle} />
            <button type="button" onClick={() => { setCustomMake(false); onMakeChange(""); }} style={smallBtn}>Use list</button>
          </div>
        )}
      </Field>
      <Field label="Model" required error={errors.model}>
        {!customMake && !customModel ? (
          <select
            value={model}
            onChange={(e) => { if (e.target.value === "__other__") { setCustomModel(true); onModelChange(""); } else { onModelChange(e.target.value); clearError && clearError("model"); } }}
            style={inputStyle}
            disabled={!make || loadingModels}
          >
            <option value="">{loadingModels ? "Loading models…" : make ? "Select model" : "Pick a make first"}</option>
            {models.map((m) => <option key={m} value={m}>{m}</option>)}
            <option value="__other__">Other (type it in)</option>
          </select>
        ) : (
          <div style={{ display: "flex", gap: 6 }}>
            <input value={model} onChange={(e) => { onModelChange(e.target.value); clearError && clearError("model"); }} placeholder="Type the model" style={inputStyle} />
            {!customMake && <button type="button" onClick={() => { setCustomModel(false); onModelChange(""); }} style={smallBtn}>Use list</button>}
          </div>
        )}
      </Field>
    </>
  );
}

const selectStyle = { border: `1.5px solid ${C.line}`, borderRadius: 5, padding: "9px 12px", fontSize: 14.5, color: C.ink, background: "#fff", fontFamily: FONT_BODY, cursor: "pointer" };
const inputStyle = { width: "100%", border: `1.5px solid ${C.line}`, borderRadius: 5, padding: "11px 12px", fontSize: 15, color: C.ink, fontFamily: FONT_BODY, boxSizing: "border-box", background: "#fff" };

function ListingCard({ listing, onOpen }) {
  const photo = listing.photos && listing.photos.length ? listing.photos[0] : null;
  return (
    <div onClick={() => onOpen(listing.id)} style={{ background: C.card, border: listing.featured ? `2px solid ${C.yellow}` : `1.5px solid ${C.line}`, borderRadius: 6, cursor: "pointer", overflow: "hidden" }}>
      {photo ? (
        <img src={photo} alt={`${listing.year} ${listing.make} ${listing.model}`} style={{ width: "100%", height: 160, objectFit: "cover", display: "block" }} />
      ) : (
        <CarThumb make={listing.make} body={listing.body} />
      )}
      <div style={{ padding: "14px 14px 16px" }}>
        {listing.featured && <div style={{ marginBottom: 6 }}><Badge tone="yellow"><Star size={11} />Featured</Badge></div>}
        <div style={{ fontFamily: FONT_HEAD, fontSize: 17, color: C.ink, lineHeight: 1.25 }}>{listing.year} {listing.make} {listing.model}</div>
        <div style={{ fontSize: 13, color: C.steel, marginTop: 2 }}>{listing.trim}</div>
        <div style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 26, color: C.ink, marginTop: 8 }}>{fmtPrice(listing.price)}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8, fontSize: 14, fontWeight: 600, color: C.ink }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Gauge size={14} />{fmtMiles(listing.mileage)}</span>
          <span style={{ display: "flex", alignItems: "center", gap: 4, fontWeight: 400, color: C.steel, fontSize: 12.5 }}><MapPin size={13} />{listing.city}, {stateAbbr(listing.state)}</span>
        </div>
        <div style={{ fontSize: 11.5, color: C.steel, marginTop: 4 }}>Listed {listing.posted}</div>
        <div style={{ marginTop: 6 }}><CredibilityDot credibility={listing.credibility} /></div>
        <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
          {listing.verified && <Badge tone="verified"><ShieldCheck size={11} />Verified</Badge>}
          <Badge tone="neutral">{listing.seller}</Badge>
          <FairnessBadge fairness={listing.fairness} />
        </div>
      </div>
    </div>
  );
}

function FeaturedStrip({ listings, onOpen }) {
  const featured = listings.filter((c) => c.featured);
  if (featured.length === 0) return null;
  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", padding: "24px 20px 0" }}>
      <div style={{ fontFamily: FONT_HEAD, fontSize: 14, color: C.steel, letterSpacing: 0.5, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
        <Star size={14} color={C.yellow} fill={C.yellow} /> FEATURED LISTINGS
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
        {featured.slice(0, 3).map((c) => (
          <div key={c.id} onClick={() => onOpen(c.id)} style={{ cursor: "pointer", border: `2px solid ${C.yellow}`, borderRadius: 6, overflow: "hidden", background: "#fff" }}>
            {c.photos && c.photos.length ? (
              <img src={c.photos[0]} alt={`${c.year} ${c.make} ${c.model}`} style={{ width: "100%", height: 220, objectFit: "cover", display: "block" }} />
            ) : (
              <CarThumb make={c.make} body={c.body} size="hero" />
            )}
            <div style={{ padding: "12px 14px" }}>
              <div style={{ fontFamily: FONT_HEAD, fontSize: 16, color: C.ink }}>{c.year} {c.make} {c.model}</div>
              <div style={{ fontFamily: FONT_HEAD, fontSize: 20, color: C.ink, marginTop: 4 }}>{fmtPrice(c.price)}</div>
              <div style={{ fontSize: 12.5, color: C.steel, marginTop: 4 }}>{c.city}, {stateAbbr(c.state)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Auto-generated "Zillow method" landing pages — built from the data itself,
// not hand-written. In a real deployment each of these becomes its own
// crawlable URL (e.g. /trucks-for-sale/texas); here they're simulated as
// in-app pages so you can see the concept before we rebuild the routing.
function PopularSearches({ listings, onOpenCategory }) {
  const combos = useMemo(() => {
    const bodyMap = {}, makeMap = {};
    listings.forEach((c) => {
      const bKey = `${c.body}|${c.state}`;
      bodyMap[bKey] = (bodyMap[bKey] || 0) + 1;
      const mKey = `${c.make}|${c.state}`;
      makeMap[mKey] = (makeMap[mKey] || 0) + 1;
    });
    const bodyCombos = Object.entries(bodyMap).map(([key, count]) => { const [body, state] = key.split("|"); return { kind: "body", body, state, count }; });
    const makeCombos = Object.entries(makeMap).map(([key, count]) => { const [make, state] = key.split("|"); return { kind: "make", make, state, count }; });
    return [...bodyCombos, ...makeCombos].sort((a, b) => b.count - a.count).slice(0, 8);
  }, [listings]);

  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", padding: "28px 20px 0" }}>
      <div style={{ fontFamily: FONT_HEAD, fontSize: 14, color: C.steel, letterSpacing: 0.5, marginBottom: 10 }}>POPULAR SEARCHES</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {combos.map((c, i) => (
          <button key={i} onClick={() => onOpenCategory(c)} style={{ border: `1px solid ${C.line}`, background: "#fff", borderRadius: 20, padding: "8px 14px", fontSize: 13, color: C.ink, cursor: "pointer" }}>
            {c.kind === "body" ? `${c.body}s for sale in ${c.state}` : `${c.make}s for sale in ${c.state}`} ({c.count})
          </button>
        ))}
      </div>
    </div>
  );
}

function CategoryPage({ listings, openListing }) {
  const { kind, value, state: stateSlug } = useParams();
  const stateName = US_STATES.find((s) => slugify(s) === stateSlug) || stateSlug.replace(/-/g, " ");
  const bodyLabel = kind === "body" ? (BODY_SLUGS_REVERSE[value] || value) : null;

  const matches = listings.filter((c) => {
    if (slugify(c.state) !== stateSlug) return false;
    if (kind === "make") return slugify(c.make) === value;
    return c.body === bodyLabel;
  });
  const avgPrice = matches.length ? Math.round(matches.reduce((s, c) => s + c.price, 0) / matches.length) : 0;
  const noun = kind === "make" ? (matches[0]?.make || value) : (bodyLabel || value);
  const title = `${noun}s for sale in ${stateName}`;

  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", padding: "28px 20px 60px" }}>
      <Link to="/" style={{ display: "inline-flex", alignItems: "center", gap: 4, color: C.steel, fontSize: 13.5, cursor: "pointer", marginBottom: 16, textDecoration: "none" }}><ChevronLeft size={15} /> Back to all listings</Link>
      <h1 style={{ fontFamily: FONT_HEAD, fontSize: 28, color: C.ink, margin: "0 0 8px" }}>{title}</h1>
      <p style={{ color: C.steel, fontSize: 14.5, maxWidth: 640, marginBottom: 24 }}>
        {matches.length} {noun.toLowerCase()}{matches.length === 1 ? "" : "s"} currently listed in {stateName}, averaging {fmtPrice(avgPrice)}. Updated automatically as sellers post and sell — this page is generated straight from live listing data.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
        {matches.map((c) => <ListingCard key={c.id} listing={c} onOpen={openListing} />)}
      </div>
      <div style={{ marginTop: 24, padding: 14, background: "#F4F2EA", borderRadius: 6, fontSize: 12.5, color: C.steel }}>
        This page lives at its own real address, so it can show up directly in Google search results — every combination gets one automatically as inventory grows. Read-only view of listings already public on the browse page.
      </div>
    </div>
  );
}

// ---------- Top nav ----------
function TopBar({ onPost }) {
  const { pathname } = useLocation();
  return (
    <div style={{ background: C.ink, borderBottom: `4px solid ${C.yellow}` }}>
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "12px 20px", display: "flex", alignItems: "center", flexWrap: "wrap", rowGap: 10, columnGap: 20, minHeight: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
          <Link to="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
            <div style={{ width: 32, height: 34, position: "relative", flexShrink: 0 }}>
              <svg viewBox="0 0 32 34" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
                <path d="M 16 1 L 30 6.5 L 30 17 Q 30 27 16 33 Q 2 27 2 17 L 2 6.5 Z" fill={C.yellow} stroke={C.ink} strokeWidth={2} />
                <path d="M 16 6 L 16 28" stroke={C.ink} strokeWidth={1.5} strokeDasharray="4,3" opacity={0.5} />
              </svg>
              <div style={{ position: "relative", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <CarIcon size={15} color={C.ink} strokeWidth={2.5} />
              </div>
            </div>
            <span style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: "clamp(15px, 4vw, 20px)", letterSpacing: 0.5, color: "#fff", whiteSpace: "nowrap" }}>HIGHWAYLOT</span>
          </Link>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <NavLink label="Browse" to="/" active={pathname === "/" || pathname.startsWith("/listing") || pathname.startsWith("/category")} />
            <NavLink label="Value my car" to="/value" active={pathname === "/value"} />
            <NavLink label="Find my car" to="/quiz" active={pathname.startsWith("/quiz")} />
          </div>
        </div>
        <button onClick={onPost} style={{ background: C.yellow, color: C.ink, border: "none", borderRadius: 4, padding: "9px 16px", fontFamily: FONT_HEAD, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
          <Plus size={16} strokeWidth={2.5} /> Post an ad
        </button>
      </div>
    </div>
  );
}
function NavLink({ label, to, active }) {
  return <Link to={to} style={{ textDecoration: "none", color: active ? "#fff" : "rgba(255,255,255,0.65)", fontSize: 13.5, fontWeight: 500, display: "flex", alignItems: "center", padding: "4px 0", borderBottom: active ? `2px solid ${C.yellow}` : "2px solid transparent", whiteSpace: "nowrap" }}>{label}</Link>;
}

// ---------- Hero + filters ----------
function Hero({ filters, setFilters, log }) {
  return (
    <div style={{ background: C.ink }}>
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "44px 20px 24px" }}>
        <div style={{ maxWidth: 640, margin: "0 auto", textAlign: "center" }}>
          <h1 style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: "clamp(26px, 6vw, 38px)", color: "#fff", margin: "0 auto", lineHeight: 1.1 }}>Buy and sell cars, coast to coast.</h1>
          <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 15, marginTop: 10 }}>{seed.length.toLocaleString()}+ listings from private sellers and dealers across the United States.</p>
          <div style={{ background: "#fff", borderRadius: 6, marginTop: 22, padding: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", textAlign: "left" }}>
            <div style={{ flex: "2 1 220px", display: "flex", alignItems: "center", gap: 8, borderRight: `1px solid ${C.line}`, paddingRight: 10 }}>
              <Search size={16} color={C.steel} />
              <input placeholder="Search make or model" value={filters.query}
                onChange={(e) => { setFilters({ ...filters, query: e.target.value }); }}
                onBlur={(e) => e.target.value && log("search", { query: e.target.value })}
                style={{ border: "none", outline: "none", fontSize: 14, width: "100%", color: C.ink, fontFamily: FONT_BODY }} />
            </div>
            <select value={filters.state} onChange={(e) => { setFilters({ ...filters, state: e.target.value }); log("filter_state", { state: e.target.value }); }} style={{ border: "none", outline: "none", fontSize: 14, color: C.ink, background: "transparent", flex: "1 1 140px" }}>
              <option value="">All states</option>
              {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button style={{ background: C.yellow, color: C.ink, border: "none", borderRadius: 4, padding: "10px 22px", fontFamily: FONT_HEAD, fontSize: 14.5, cursor: "pointer" }}>Search</button>
          </div>
          <div style={{ marginTop: 10, fontSize: 12.5, color: "rgba(255,255,255,0.5)" }}>Available in the United States only.</div>
        </div>
      </div>
    </div>
  );
}

function PriceSlider({ value, onChange, log }) {
  const MAX = 100000;
  const current = value ? Number(value) : MAX;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 220 }}>
      <span style={{ fontSize: 12.5, color: C.steel, whiteSpace: "nowrap" }}>Up to {current >= MAX ? "any price" : fmtPrice(current)}</span>
      <input
        type="range" min={5000} max={MAX} step={1000} value={current}
        onChange={(e) => onChange(e.target.value)}
        onMouseUp={() => log("filter_price", { max: current >= MAX ? "" : current })}
        onTouchEnd={() => log("filter_price", { max: current >= MAX ? "" : current })}
        style={{ flex: 1, minWidth: 100 }}
      />
    </div>
  );
}

function FilterBar({ filters, setFilters, count, sort, setSort, log }) {
  const makes = Array.from(new Set(seed.map((c) => c.make))).sort();
  return (
    <div style={{ borderBottom: `1px solid ${C.line}`, background: C.paper, position: "sticky", top: 0, zIndex: 5 }}>
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "14px 20px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: C.steel, fontSize: 13 }}><SlidersHorizontal size={14} /> Filters</div>
        <select value={filters.make} onChange={(e) => { setFilters({ ...filters, make: e.target.value }); log("filter_make", { make: e.target.value }); }} style={selectStyle}>
          <option value="">Any make</option>{makes.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <PriceSlider value={filters.price} onChange={(v) => setFilters({ ...filters, price: v === String(100000) ? "" : v })} log={log} />
        <select value={filters.mileage} onChange={(e) => { setFilters({ ...filters, mileage: e.target.value }); log("filter_mileage", { max: e.target.value }); }} style={selectStyle}>
          <option value="">Any mileage</option>
          <option value="30000">Under 30,000 mi</option>
          <option value="60000">Under 60,000 mi</option>
          <option value="100000">Under 100,000 mi</option>
          <option value="150000">Under 150,000 mi</option>
        </select>
        <select value={filters.seller} onChange={(e) => setFilters({ ...filters, seller: e.target.value })} style={selectStyle}>
          <option value="">Any seller</option><option value="Private">Private party</option><option value="Dealer">Dealer</option>
        </select>
        <select value={filters.age} onChange={(e) => { setFilters({ ...filters, age: e.target.value }); log("filter_age", { age: e.target.value }); }} style={selectStyle}>
          <option value="">Listed anytime</option>
          <option value="1">Last 24 hours</option>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
        </select>
        {(filters.query || filters.state || filters.make || filters.price || filters.mileage || filters.seller || filters.age) && (
          <button onClick={() => setFilters({ query: "", state: "", make: "", price: "", mileage: "", seller: "", age: "" })} style={{ ...selectStyle, cursor: "pointer", color: C.steel, display: "flex", alignItems: "center", gap: 4 }}><X size={13} /> Clear</button>
        )}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 13, color: C.steel }}>{count} results</span>
          <select value={sort} onChange={(e) => setSort(e.target.value)} style={selectStyle}>
            <option value="new">Newest</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option><option value="miles">Lowest mileage</option>
          </select>
        </div>
      </div>
    </div>
  );
}

// ---------- Home ----------
function Home({ allListings, log, openListing }) {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ query: "", state: "", make: "", price: "", mileage: "", seller: "", age: "" });
  const [sort, setSort] = useState("new");
  const filtered = useMemo(() => {
    let list = allListings.filter((c) => {
      if (filters.query && !(`${c.make} ${c.model} ${c.trim}`.toLowerCase().includes(filters.query.toLowerCase()))) return false;
      if (filters.state && c.state !== filters.state) return false;
      if (filters.make && c.make !== filters.make) return false;
      if (filters.price && c.price > Number(filters.price)) return false;
      if (filters.mileage && c.mileage > Number(filters.mileage)) return false;
      if (filters.seller && c.seller !== filters.seller) return false;
      if (filters.age) {
        const days = (Date.now() - new Date(c.created_at).getTime()) / 86400000;
        if (days > Number(filters.age)) return false;
      }
      return true;
    });
    if (sort === "low") list = [...list].sort((a, b) => a.price - b.price);
    if (sort === "high") list = [...list].sort((a, b) => b.price - a.price);
    if (sort === "miles") list = [...list].sort((a, b) => a.mileage - b.mileage);
    return list;
  }, [allListings, filters, sort]);

  return (
    <div>
      <Hero filters={filters} setFilters={setFilters} log={log} />
      <FeaturedStrip listings={allListings} onOpen={openListing} />
      <PopularSearches listings={allListings} onOpenCategory={(cat) => { log("category_view", cat); navigate(categoryToPath(cat)); }} />
      <FilterBar filters={filters} setFilters={setFilters} count={filtered.length} sort={sort} setSort={setSort} log={log} />
      <SavedSearchPrompt filters={filters} log={log} />
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "24px 20px 60px" }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: C.steel }}>
            <div style={{ fontFamily: FONT_HEAD, fontSize: 20, color: C.ink, marginBottom: 6 }}>{allListings.length === 0 ? "No listings yet" : "No matches"}</div>
            {allListings.length === 0 ? "Be the first to post a car." : "Try widening your search or clearing a filter."}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
            {filtered.map((c) => <ListingCard key={c.id} listing={c} onOpen={openListing} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function SavedSearchPrompt({ filters, log }) {
  const [email, setEmail] = useState("");
  const [saved, setSaved] = useState(false);
  const hasFilters = filters.make || filters.state || filters.price || filters.mileage;

  const submit = () => {
    if (!email.trim() || !email.includes("@")) return;
    supabase.from("saved_searches").insert({ email: email.trim(), make: filters.make || null, state: filters.state || null, max_price: filters.price ? Number(filters.price) : null }).then(({ error }) => {
      if (error) console.error("saved search failed:", error.message);
    });
    log("saved_search_created", { email, make: filters.make, state: filters.state, price: filters.price });
    setSaved(true);
  };

  if (!hasFilters) return null;
  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 20px" }}>
      <div style={{ background: "#F4F2EA", borderRadius: 6, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 4 }}>
        {saved ? (
          <span style={{ fontSize: 13.5, color: C.ink, display: "flex", alignItems: "center", gap: 6 }}><Check size={15} color={C.green} /> You're on the list for this search.</span>
        ) : (
          <>
            <span style={{ fontSize: 13.5, color: C.ink }}>Get emailed when new matches like this show up:</span>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" style={{ ...inputStyle, width: 200 }} />
            <button onClick={submit} style={{ background: C.yellow, border: "none", borderRadius: 4, padding: "8px 14px", fontFamily: FONT_HEAD, fontSize: 13, cursor: "pointer" }}>Notify me</button>
            <span style={{ fontSize: 11, color: C.steel, width: "100%" }}>Email alerts aren't sending yet — we're saving your spot now, delivery is coming.</span>
          </>
        )}
      </div>
    </div>
  );
}


// ---------- Listing detail + boost ----------
function PhotoCarousel({ photos, alt }) {
  const [index, setIndex] = useState(0);
  const go = (dir) => setIndex((i) => (i + dir + photos.length) % photos.length);
  return (
    <div>
      <div style={{ position: "relative" }}>
        <img src={photos[index]} alt={alt} style={{ width: "100%", height: 340, objectFit: "cover", borderRadius: 8, display: "block" }} />
        {photos.length > 1 && (
          <>
            <button onClick={go.bind(null, -1)} aria-label="Previous photo" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", background: "rgba(27,36,49,0.65)", color: "#fff", border: "none", borderRadius: "50%", width: 36, height: 36, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><ChevronLeft size={20} /></button>
            <button onClick={go.bind(null, 1)} aria-label="Next photo" style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "rgba(27,36,49,0.65)", color: "#fff", border: "none", borderRadius: "50%", width: 36, height: 36, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><ChevronRight size={20} /></button>
            <div style={{ position: "absolute", bottom: 10, right: 10, background: "rgba(27,36,49,0.65)", color: "#fff", fontSize: 11.5, padding: "3px 8px", borderRadius: 20 }}>{index + 1} / {photos.length}</div>
          </>
        )}
      </div>
      {photos.length > 1 && (
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          {photos.map((p, i) => (
            <img
              key={i} src={p} alt="" onClick={() => setIndex(i)}
              style={{ width: 64, height: 48, objectFit: "cover", borderRadius: 4, cursor: "pointer", border: i === index ? `2px solid ${C.yellow}` : `2px solid transparent`, opacity: i === index ? 1 : 0.7 }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ListingDetail({ allListings, log }) {
  const { id: idParam } = useParams();
  const id = Number(idParam);
  const navigate = useNavigate();
  const [revealed, setRevealed] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [fetchedListing, setFetchedListing] = useState(null);
  const [fetchState, setFetchState] = useState("idle"); // idle | loading | notfound
  const listing = allListings.find((c) => c.id === id) || fetchedListing;

  // If this listing isn't in the already-loaded list — a shared link opened
  // in a fresh tab, a direct visit, a refresh — go get it directly instead
  // of assuming it'll show up.
  useEffect(() => {
    if (listing || fetchState !== "idle") return;
    setFetchState("loading");
    supabase.from("listings").select(LISTING_COLUMNS).eq("id", id).single().then(({ data, error }) => {
      if (error || !data) { setFetchState("notfound"); return; }
      setFetchedListing(rowToListing(data));
      setFetchState("idle");
    });
  }, [id, listing, fetchState]);

  if (!listing && fetchState === "loading") {
    return <div style={{ textAlign: "center", padding: "80px 20px", color: C.steel }}>Loading listing…</div>;
  }
  if (!listing) {
    return (
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "80px 20px", textAlign: "center" }}>
        <div style={{ fontFamily: FONT_HEAD, fontSize: 22, color: C.ink, marginBottom: 8 }}>Listing not found</div>
        <p style={{ color: C.steel, fontSize: 14 }}>It may have been removed or the link's incorrect.</p>
        <Link to="/" style={{ display: "inline-block", marginTop: 16, background: C.ink, color: "#fff", border: "none", borderRadius: 4, padding: "10px 20px", fontFamily: FONT_HEAD, textDecoration: "none" }}>Back to HIGHWAYLOT</Link>
      </div>
    );
  }
  const photos = listing.photos && listing.photos.length ? listing.photos : null;
  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", padding: "24px 20px 60px" }}>
      <span onClick={() => navigate(-1)} style={{ display: "inline-flex", alignItems: "center", gap: 4, color: C.steel, fontSize: 13.5, cursor: "pointer", marginBottom: 16 }}><ChevronLeft size={15} /> Back</span>
      {listing.status === "sold" && (
        <div style={{ background: "#EFEDE4", border: `1px solid ${C.line}`, borderRadius: 6, padding: "12px 16px", marginBottom: 16, fontSize: 13.5, color: C.steel }}>This car has been marked sold — no longer available.</div>
      )}
      {listing.status === "active" && getExpiryInfo(listing).expired && (
        <div style={{ background: "#EFEDE4", border: `1px solid ${C.line}`, borderRadius: 6, padding: "12px 16px", marginBottom: 16, fontSize: 13.5, color: C.steel }}>This listing has expired and is no longer active.</div>
      )}
      <div className="hl-detail-grid">
        <div>
          {photos ? (
            <PhotoCarousel photos={photos} alt={`${listing.year} ${listing.make} ${listing.model}`} />
          ) : (
            <CarThumb make={listing.make} body={listing.body} size="large" />
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            {listing.featured && <Badge tone="yellow"><Star size={11} />Featured</Badge>}
            {listing.verified && <Badge tone="verified"><ShieldCheck size={11} />Verified seller</Badge>}
            <Badge tone="neutral">{listing.seller}</Badge>
          </div>
          <div style={{ marginTop: 26, borderTop: `1px solid ${C.line}`, paddingTop: 20 }}>
            <div style={{ fontFamily: FONT_HEAD, fontSize: 16, color: C.ink, marginBottom: 12 }}>Vehicle details</div>
            <div className="hl-spec-grid">
              <Spec icon={<Calendar size={14} />} label="Year" value={listing.year} />
              <Spec icon={<Gauge size={14} />} label="Mileage" value={fmtMiles(listing.mileage)} />
              <Spec icon={<Fuel size={14} />} label="Fuel type" value={listing.fuel} />
              <Spec label="Transmission" value={listing.trans} />
              <Spec label="Exterior color" value={listing.color} />
              <Spec label="Body style" value={listing.body} />
              <Spec label="Ownership" value={listing.loan_status || "Paid off"} />
              {listing.loan_status === "Still financed (loan payoff needed)" && listing.loan_balance && (
                <Spec label="Loan balance" value={fmtPrice(listing.loan_balance)} />
              )}
            </div>
          </div>
          <div style={{ marginTop: 26, borderTop: `1px solid ${C.line}`, paddingTop: 20 }}>
            <div style={{ fontFamily: FONT_HEAD, fontSize: 16, color: C.ink, marginBottom: 8 }}>Description</div>
            <p style={{ fontSize: 14.5, color: "#3B4250", lineHeight: 1.6, margin: 0 }}>{listing.desc}</p>
          </div>
          {listing.issues && Object.keys(listing.issues).length > 0 && (
            <div style={{ marginTop: 26, borderTop: `1px solid ${C.line}`, paddingTop: 20 }}>
              <div style={{ fontFamily: FONT_HEAD, fontSize: 16, color: C.ink, marginBottom: 12 }}>Condition disclosed by seller</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px" }}>
                {getIssuesSummary(listing.issues).map((row, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, gap: 10 }}>
                    <span style={{ color: C.steel }}>{row.label}</span>
                    <span style={{ color: row.positive ? C.green : C.ink, fontWeight: 500 }}>{row.statusText}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div>
          <div style={{ border: `1px solid ${C.line}`, borderRadius: 6, padding: 20 }}>
            <div style={{ fontFamily: FONT_HEAD, fontSize: 15, color: C.steel }}>{listing.year} {listing.make} {listing.model}</div>
            <div style={{ fontSize: 13, color: C.steel, marginTop: 2 }}>{listing.trim}</div>
            <div style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: "clamp(24px, 7vw, 30px)", color: C.ink, marginTop: 10 }}>{fmtPrice(listing.price)}</div>
            {listing.fairness && (
              <div style={{ marginTop: 6 }}>
                <FairnessBadge fairness={listing.fairness} />
                <div style={{ fontSize: 11.5, color: C.steel, marginTop: 4 }}>
                  {Math.abs(Math.round(listing.fairness.diffPct * 100))}% {listing.fairness.diffPct < 0 ? "below" : "above"} the average of {listing.fairness.compCount} similar {listing.fairness.compCount === 1 ? "listing" : "listings"} on HIGHWAYLOT
                </div>
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 8, fontSize: 13, color: C.steel }}><MapPin size={13} /> {listing.city}, {stateAbbr(listing.state)}</div>
            <div style={{ fontSize: 12, color: C.steel, marginTop: 4 }}>Listed {listing.posted}</div>
            {listing.credibility && (
              <div style={{ marginTop: 8 }}>
                <CredibilityDot credibility={listing.credibility} />
                {listing.credibility.flags.length > 0 && (
                  <ul style={{ margin: "4px 0 0", paddingLeft: 16, fontSize: 11.5, color: C.steel }}>
                    {listing.credibility.flags.map((f, i) => <li key={i}>{f.label}</li>)}
                  </ul>
                )}
              </div>
            )}
            <div style={{ marginTop: 18, paddingTop: 16, borderTop: `1px solid ${C.line}` }}>
              {!revealed ? (
                <button onClick={() => { setRevealed(true); log("contact_reveal", { listingId: listing.id }); }} style={{ width: "100%", background: C.yellow, color: C.ink, border: "none", borderRadius: 4, padding: "12px 0", fontFamily: FONT_HEAD, fontSize: 14.5, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Phone size={15} /> Contact seller</button>
              ) : (
                <div style={{ background: "#F4F2EA", borderRadius: 4, padding: "12px 14px", fontSize: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, color: C.steel, fontSize: 11.5, marginBottom: 4 }}><Lock size={11} /> Relayed number — real number stays private</div>
                  <div style={{ color: C.ink, fontWeight: 600 }}>(555) 019-{String(1000 + listing.id).slice(-4)}</div>
                </div>
              )}
              <div style={{ fontSize: 11, color: C.steel, marginTop: 8, lineHeight: 1.5 }}>
                Meet in a public place. HIGHWAYLOT doesn't handle payments or verify vehicles between buyers and sellers — see our <Link to="/terms" style={{ textDecoration: "underline", color: "inherit" }}>terms</Link>.
              </div>
            </div>
            <button onClick={() => setShowReport(true)} style={{ width: "100%", marginTop: 8, background: "transparent", color: C.steel, border: "none", fontSize: 12, cursor: "pointer", textDecoration: "underline" }}>Report this listing</button>
          </div>
        </div>
      </div>
      {showReport && <ReportModal listing={listing} log={log} onClose={() => setShowReport(false)} />}
    </div>
  );
}
function ReportModal({ listing, log, onClose }) {
  const [reason, setReason] = useState("");
  const [sent, setSent] = useState(false);
  const submit = () => {
    if (!reason.trim()) return;
    supabase.from("reports").insert({ listing_id: listing.id, reason: reason.trim() }).then(({ error }) => {
      if (error) console.error("report save failed:", error.message);
    });
    log("listing_reported", { listingId: listing.id });
    setSent(true);
  };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(27,36,49,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 8, padding: 24, width: 380, maxWidth: "90vw" }}>
        {sent ? (
          <>
            <div style={{ fontFamily: FONT_HEAD, fontSize: 18, color: C.ink, marginBottom: 6 }}>Thanks — we've got it</div>
            <p style={{ fontSize: 13.5, color: C.steel, marginBottom: 16 }}>Your report's been logged for review. There's no automated moderation yet, so this goes into a queue we check manually.</p>
            <button onClick={onClose} style={{ background: C.ink, color: "#fff", border: "none", borderRadius: 4, padding: "10px 20px", fontFamily: FONT_HEAD, cursor: "pointer" }}>Close</button>
          </>
        ) : (
          <>
            <div style={{ fontFamily: FONT_HEAD, fontSize: 18, color: C.ink, marginBottom: 4 }}>Report this listing</div>
            <p style={{ fontSize: 13, color: C.steel, marginBottom: 12 }}>What seems wrong with it?</p>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} placeholder="e.g. Price seems fake, photos don't match description, seller won't respond..." style={{ ...inputStyle, resize: "vertical" }} />
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button onClick={onClose} style={{ flex: 1, background: "transparent", border: `1px solid ${C.line}`, borderRadius: 4, padding: "10px 0", fontFamily: FONT_HEAD, cursor: "pointer" }}>Cancel</button>
              <button onClick={submit} style={{ flex: 1, background: C.yellow, border: "none", borderRadius: 4, padding: "10px 0", fontFamily: FONT_HEAD, cursor: "pointer" }}>Submit report</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
function Spec({ icon, label, value }) {
  return <div><div style={{ fontSize: 11.5, color: C.steel, display: "flex", alignItems: "center", gap: 4 }}>{icon}{label}</div><div style={{ fontSize: 14, color: C.ink, fontWeight: 500, marginTop: 2 }}>{value}</div></div>;
}

// BoostModal removed in v15 — see shelved-boost-feature.jsx. It was granting
// free boosts with no actual payment step, a real bug, not just unfinished.

// ---------- Post an ad (with photo requirement) ----------
function PostAd({ onSubmit, existingListings, log }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ year:"", make:"", model:"", trim:"", price:"", mileage:"", city:"", state:"", fuel:"Gas", trans:"Automatic", color:"", seller:"Private", body:"", condition:"Good", loan_status:"Paid off", loan_balance:"", desc:"", phone:"" });
  const [photos, setPhotos] = useState([]);
  const [issues, setIssues] = useState({});
  const [confirmDuplicate, setConfirmDuplicate] = useState(false);
  const [honeypot, setHoneypot] = useState(""); // bots fill this; real users never see it
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const set = (k) => (e) => { const val = e.target.value; setForm((prev) => ({ ...prev, [k]: val })); setErrors((prev) => (prev[k] ? { ...prev, [k]: false } : prev)); };
  // For number-only fields (price, mileage, loan balance) — strips anything
  // that isn't a digit as it's typed, so a letter or stray comma literally
  // can't end up in the field rather than being caught after the fact.
  const setNumeric = (k) => (e) => { const val = e.target.value.replace(/[^0-9]/g, ""); setForm((prev) => ({ ...prev, [k]: val })); setErrors((prev) => (prev[k] ? { ...prev, [k]: false } : prev)); };

  const addPhotos = (fileList) => {
    const files = Array.from(fileList).slice(0, 8 - photos.length);
    const urls = files.map((f) => URL.createObjectURL(f));
    setPhotos([...photos, ...urls]);
  };
  const removePhoto = (i) => setPhotos(photos.filter((_, idx) => idx !== i));

  const possibleDuplicate = useMemo(() => {
    if (!form.year || !form.make || !form.model || !form.mileage) return null;
    return (existingListings || []).find((c) =>
      c.year === Number(form.year) && c.make === form.make && c.model === form.model && Math.abs(c.mileage - Number(form.mileage)) < 500
    ) || null;
  }, [form.year, form.make, form.model, form.mileage, existingListings]);

  const submit = async () => {
    if (honeypot.trim() !== "") return; // bot filled the hidden field — silently drop, no error shown
    setSubmitError(null);
    const req = ["year","make","model","price","mileage","city","state","phone","body"];
    const errs = {}; req.forEach((k) => { if (!String(form[k]).trim()) errs[k] = true; });
    if (photos.length < 3) errs.photos = true;
    if (possibleDuplicate && !confirmDuplicate) errs.duplicate = true;
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    if (possibleDuplicate) log("listing_duplicate_confirmed", { matchedId: possibleDuplicate.id });
    setSubmitting(true);
    const errMsg = await onSubmit({ ...form, year: Number(form.year), price: Number(form.price), mileage: Number(form.mileage), loan_balance: form.loan_status === "Still financed (loan payoff needed)" && form.loan_balance ? Number(form.loan_balance) : null, verified: false, featured: false, photos, issues, desc: form.desc || "No additional description provided." });
    setSubmitting(false);
    if (errMsg) setSubmitError(errMsg);
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "36px 20px 70px" }}>
      <Link to="/" style={{ display: "inline-flex", alignItems: "center", gap: 4, color: C.steel, fontSize: 13.5, marginBottom: 12, textDecoration: "none" }}><ChevronLeft size={15} /> Cancel</Link>
      <h2 style={{ fontFamily: FONT_HEAD, fontSize: 28, color: C.ink, margin: "0 0 4px" }}>Post your car</h2>
      <p style={{ color: C.steel, fontSize: 14, marginBottom: 24 }}>Listings are visible across the United States. Fields marked required.</p>

      <input
        type="text" name="company_website" value={honeypot} onChange={(e) => setHoneypot(e.target.value)}
        tabIndex={-1} autoComplete="off" aria-hidden="true"
        style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
      />

      <Field label="Photos" required error={errors.photos}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
          {photos.map((p, i) => (
            <div key={i} style={{ position: "relative", width: 84, height: 84 }}>
              <img src={p} alt="" style={{ width: 84, height: 84, objectFit: "cover", borderRadius: 4, border: `1px solid ${C.line}` }} />
              <button onClick={() => removePhoto(i)} style={{ position: "absolute", top: -6, right: -6, background: C.ink, color: "#fff", border: "none", borderRadius: "50%", width: 20, height: 20, cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}><X size={12} /></button>
            </div>
          ))}
          {photos.length < 8 && (
            <label style={{ width: 84, height: 84, border: `1px dashed ${C.line}`, borderRadius: 4, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", color: C.steel, gap: 4 }}>
              <Camera size={18} /><span style={{ fontSize: 10.5 }}>Add photo</span>
              <input type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(e) => addPhotos(e.target.files)} />
            </label>
          )}
        </div>
        <div style={{ fontSize: 12, color: C.steel }}>{photos.length} of 3 minimum added.</div>
      </Field>

      <div className="hl-form-grid" style={{ marginTop: 18 }}>
        <Field label="Year" required error={errors.year}>
          <select value={form.year} onChange={set("year")} style={inputStyle}><option value="">Select year</option>{YEARS.map((y) => <option key={y} value={y}>{y}</option>)}</select>
        </Field>
        <MakeModelPicker make={form.make} model={form.model} onMakeChange={(v) => setForm((prev) => ({ ...prev, make: v }))} onModelChange={(v) => setForm((prev) => ({ ...prev, model: v }))} errors={errors} clearError={(k) => setErrors((prev) => ({ ...prev, [k]: false }))} />
        <Field label="Trim"><input value={form.trim} onChange={set("trim")} placeholder="XLT" style={inputStyle} /></Field>
        <Field label="Price (USD)" required error={errors.price}><input value={form.price} onChange={setNumeric("price")} inputMode="numeric" placeholder="24999" style={inputStyle} /></Field>
        <Field label="Mileage" required error={errors.mileage}><input value={form.mileage} onChange={setNumeric("mileage")} inputMode="numeric" placeholder="42000" style={inputStyle} /></Field>
        <Field label="City" required error={errors.city}><input value={form.city} onChange={set("city")} placeholder="Austin" style={inputStyle} /></Field>
        <Field label="State" required error={errors.state}>
          <select value={form.state} onChange={set("state")} style={inputStyle}><option value="">Select state</option>{US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}</select>
        </Field>
        <Field label="Seller type"><select value={form.seller} onChange={set("seller")} style={inputStyle}><option>Private</option><option>Dealer</option></select></Field>
        <Field label="Contact phone" required error={errors.phone}><input value={form.phone} onChange={set("phone")} placeholder="(555) 019-1234" style={inputStyle} /></Field>
        <Field label="Body style" required error={errors.body}>
          <select value={form.body} onChange={set("body")} style={inputStyle}><option value="">Select body style</option><option>Sedan</option><option>Coupe</option><option>Hatchback</option><option>SUV</option><option>Truck</option><option>Van/Minivan</option><option>Convertible</option></select>
        </Field>
        <Field label="Condition"><select value={form.condition} onChange={set("condition")} style={inputStyle}><option>Excellent</option><option>Good</option><option>Fair</option><option>Needs work</option></select></Field>
        <Field label="Ownership status"><select value={form.loan_status} onChange={set("loan_status")} style={inputStyle}><option>Paid off</option><option>Still financed (loan payoff needed)</option></select></Field>
        {form.loan_status === "Still financed (loan payoff needed)" && (
          <Field label="Remaining loan balance ($)"><input value={form.loan_balance} onChange={setNumeric("loan_balance")} inputMode="numeric" placeholder="8500" style={inputStyle} /></Field>
        )}
      </div>

      {possibleDuplicate && (
        <div style={{ marginTop: 16, padding: 14, background: "#FFF3D6", borderRadius: 6, border: `1px solid ${C.yellow}` }}>
          <div style={{ fontSize: 13.5, color: C.yellowDark, fontWeight: 600, marginBottom: 4 }}>This looks like it might already be listed</div>
          <div style={{ fontSize: 12.5, color: "#6B4F00", marginBottom: 8 }}>
            A {possibleDuplicate.year} {possibleDuplicate.make} {possibleDuplicate.model} with ~{fmtMiles(possibleDuplicate.mileage)} is already on HIGHWAYLOT ({possibleDuplicate.posted}). If this is a different car, just confirm below.
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "#6B4F00", cursor: "pointer" }}>
            <input type="checkbox" checked={confirmDuplicate} onChange={(e) => setConfirmDuplicate(e.target.checked)} />
            This is a different vehicle — continue anyway
          </label>
          {errors.duplicate && <div style={{ fontSize: 11.5, color: "#A32D2D", marginTop: 4 }}>Please confirm before continuing.</div>}
        </div>
      )}

      <div style={{ marginTop: 14 }}><Field label="Description"><textarea value={form.desc} onChange={set("desc")} rows={4} style={{ ...inputStyle, resize: "vertical" }} /></Field></div>

      <div style={{ marginTop: 18 }}>
        <IssuesGate issues={issues} onChange={setIssues} />
      </div>
      <div style={{ fontSize: 11.5, color: C.steel, marginTop: 10 }}>
        We only share your phone number with buyers who request it, and it's never posted publicly. No ID or real name required to list.
      </div>
      {submitError && (
        <div style={{ marginTop: 14, padding: 12, background: "#FBE4E3", border: "1px solid #E24B4A", borderRadius: 6, fontSize: 13, color: "#A32D2D" }}>
          Couldn't publish your listing: {submitError}. Nothing was lost — fix this and try again.
        </div>
      )}
      <button onClick={submit} disabled={submitting} style={{ marginTop: 18, background: C.yellow, color: C.ink, border: "none", borderRadius: 4, padding: "13px 26px", fontFamily: FONT_HEAD, fontSize: 15, cursor: submitting ? "default" : "pointer", opacity: submitting ? 0.7 : 1 }}>{submitting ? "Publishing…" : "Publish listing"}</button>
    </div>
  );
}
function Field({ label, required, error, children }) {
  return <div><label style={{ fontSize: 12.5, color: error ? "#B23A3A" : C.steel, display: "block", marginBottom: 4 }}>{label}{required && " *"}{error && " — required"}</label>{children}</div>;
}

function Success() {
  const location = useLocation();
  const navigate = useNavigate();
  const { listingId, manageLink } = location.state || {};
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(manageLink).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  // This screen only makes sense right after a real submission — if someone
  // refreshes or visits it directly, that transient data is gone. Send them
  // somewhere useful instead of showing a broken confirmation.
  useEffect(() => {
    if (!listingId) navigate("/", { replace: true });
  }, [listingId, navigate]);
  if (!listingId) return null;

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "60px 20px", textAlign: "center" }}>
      <div style={{ width: 52, height: 52, borderRadius: "50%", background: C.greenBg, color: C.green, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}><Check size={26} /></div>
      <h2 style={{ fontFamily: FONT_HEAD, fontSize: 24, color: C.ink, margin: "0 0 8px" }}>Your ad is live</h2>
      <p style={{ color: C.steel, fontSize: 14.5, marginBottom: 20 }}>Buyers across the country can now see your listing.</p>

      {manageLink && (
        <div style={{ background: "#FFF3D6", border: `1px solid ${C.yellow}`, borderRadius: 8, padding: 18, textAlign: "left", marginBottom: 24 }}>
          <div style={{ fontFamily: FONT_HEAD, fontSize: 14.5, color: C.yellowDark, marginBottom: 4 }}>Save this link — it's the only way to edit or delete this listing</div>
          <div style={{ fontSize: 12, color: "#6B4F00", marginBottom: 10 }}>There's no login, so this exact link is what proves it's yours. We can't recover it if you lose it.</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input readOnly value={manageLink} onClick={(e) => e.target.select()} style={{ ...inputStyle, fontSize: 12, background: "#fff" }} />
            <button onClick={copy} style={{ background: C.ink, color: "#fff", border: "none", borderRadius: 4, padding: "0 16px", fontFamily: FONT_HEAD, cursor: "pointer", whiteSpace: "nowrap" }}>{copied ? "Copied" : "Copy"}</button>
          </div>
        </div>
      )}

      <Link to={`/listing/${listingId}`} style={{ background: C.ink, color: "#fff", border: "none", borderRadius: 4, padding: "11px 22px", fontFamily: FONT_HEAD, cursor: "pointer", marginRight: 10, textDecoration: "none", display: "inline-block" }}>View listing</Link>
      <Link to="/" style={{ background: "transparent", color: C.ink, border: `1px solid ${C.line}`, borderRadius: 4, padding: "11px 22px", fontFamily: FONT_HEAD, textDecoration: "none", display: "inline-block" }}>Back to browse</Link>
    </div>
  );
}

// ---------- Quiz (expanded, categorized, archetype result) ----------
const QUIZ_STATEMENTS = [
  { key: "haul", text: "I need a car that can haul stuff." },
  { key: "speed", text: "Speed matters more to me than saving gas money." },
  { key: "fun", text: "Driving is fun for me." },
  { key: "people", text: "I like having people in the car with me." },
  { key: "dirt", text: "A little dirt never hurt." },
  { key: "identity", text: "My car feels like an extension of me." },
  { key: "notice", text: "I want people to notice my car." },
  { key: "whim", text: "I could buy a car on a whim." },
  { key: "tradehp", text: "I'd trade horsepower for better gas mileage." },
  { key: "opinion", text: "I'd be embarrassed showing up in a beat-up car." },
];

// Each archetype's ideal answer (1-5) on every statement above. Scoring
// compares a real person's answers against all 10 of these and picks
// whichever is numerically closest — a similarity match, not a rigid
// binary/16-type system, since 10 archetypes don't divide cleanly into one.
const ARCHETYPE_PROFILES = {
  "Soccer Mom Mode": { haul: 5, speed: 1, fun: 2, people: 5, dirt: 4, identity: 2, notice: 1, whim: 1, tradehp: 4, opinion: 2 },
  "Midlife Crisis": { haul: 2, speed: 5, fun: 5, people: 2, dirt: 2, identity: 5, notice: 5, whim: 5, tradehp: 1, opinion: 4 },
  "Dad Truck Energy": { haul: 5, speed: 3, fun: 3, people: 3, dirt: 5, identity: 3, notice: 2, whim: 2, tradehp: 2, opinion: 2 },
  "Broke College Energy": { haul: 3, speed: 2, fun: 3, people: 4, dirt: 5, identity: 1, notice: 1, whim: 1, tradehp: 3, opinion: 1 },
  "Main Character Energy": { haul: 1, speed: 3, fun: 4, people: 3, dirt: 1, identity: 5, notice: 5, whim: 4, tradehp: 1, opinion: 5 },
  "Beach Cruiser": { haul: 3, speed: 1, fun: 4, people: 4, dirt: 5, identity: 2, notice: 1, whim: 3, tradehp: 4, opinion: 1 },
  "Frat Row Special": { haul: 2, speed: 4, fun: 5, people: 5, dirt: 5, identity: 3, notice: 4, whim: 4, tradehp: 1, opinion: 2 },
  "Grandma's Sunday Car": { haul: 2, speed: 1, fun: 1, people: 3, dirt: 1, identity: 2, notice: 1, whim: 1, tradehp: 5, opinion: 3 },
  "Pedal to the Metal": { haul: 1, speed: 5, fun: 5, people: 2, dirt: 2, identity: 3, notice: 2, whim: 4, tradehp: 1, opinion: 2 },
  "CEO Commute": { haul: 1, speed: 3, fun: 2, people: 1, dirt: 1, identity: 4, notice: 4, whim: 1, tradehp: 3, opinion: 3 },
};
const ARCHETYPE_BLURBS = {
  "Soccer Mom Mode": "Hauls the kids, the gear, and the snacks, and doesn't care what it looks like doing it.",
  "Midlife Crisis": "Top down, radio up, making up for lost time.",
  "Dad Truck Energy": "Practical, proud of it, and always ready to tow something.",
  "Broke College Energy": "Runs on hope and duct tape, and that's fine by them.",
  "Main Character Energy": "The car's a whole personality, and it's playing the lead.",
  "Beach Cruiser": "Windows down, no rush, vibes over horsepower.",
  "Frat Row Special": "Loud, a little chaotic, always got a full car.",
  "Grandma's Sunday Car": "Barely driven, perfectly kept, zero drama.",
  "Pedal to the Metal": "Horsepower over everything, gas mileage be damned.",
  "CEO Commute": "Sleek, efficient, no time to waste getting there.",
};
// Loose body-style pairing per archetype, used only to surface relevant
// listings on the results page — not part of the scoring itself.
const ARCHETYPE_BODY = {
  "Soccer Mom Mode": "Van/Minivan", "Midlife Crisis": "Convertible", "Dad Truck Energy": "Truck",
  "Broke College Energy": "Sedan", "Main Character Energy": "Coupe", "Beach Cruiser": "Convertible",
  "Frat Row Special": "SUV", "Grandma's Sunday Car": "Sedan", "Pedal to the Metal": "Coupe", "CEO Commute": "Sedan",
};

function scoreQuiz(answers) {
  const distances = Object.entries(ARCHETYPE_PROFILES).map(([name, profile]) => {
    const dist = QUIZ_STATEMENTS.reduce((sum, s) => sum + Math.pow((answers[s.key] || 3) - profile[s.key], 2), 0);
    return { name, dist };
  }).sort((a, b) => a.dist - b.dist);

  let [best, second] = distances;
  // Tie-breaker: when the top two are nearly even, defer to whichever
  // archetype matches the person's single most extreme (least neutral)
  // answer — rooted in something they actually felt strongly about,
  // not an arbitrary pick.
  if (second && (second.dist - best.dist) < 2) {
    let mostExtremeKey = null, maxDeviation = -1;
    QUIZ_STATEMENTS.forEach((s) => {
      const deviation = Math.abs((answers[s.key] || 3) - 3);
      if (deviation > maxDeviation) { maxDeviation = deviation; mostExtremeKey = s.key; }
    });
    const userVal = answers[mostExtremeKey];
    const bestDiff = Math.abs(userVal - ARCHETYPE_PROFILES[best.name][mostExtremeKey]);
    const secondDiff = Math.abs(userVal - ARCHETYPE_PROFILES[second.name][mostExtremeKey]);
    if (secondDiff < bestDiff) best = second;
  }
  // Runner-up is whichever wasn't picked as best, from the original top two —
  // shown quietly on the results page, not part of the tie-break logic above.
  const runnerUpEntry = distances.find((d) => d.name !== best.name);
  const gap = runnerUpEntry ? runnerUpEntry.dist - best.dist : 999;
  return {
    name: best.name,
    blurb: ARCHETYPE_BLURBS[best.name],
    runnerUp: runnerUpEntry ? { name: runnerUpEntry.name } : null,
    matchStrength: gap < 4 ? "close" : "strong",
  };
}

function Quiz({ log, onComplete }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const s = QUIZ_STATEMENTS[step];
  const progress = Math.round((step / QUIZ_STATEMENTS.length) * 100);

  const choose = (val) => {
    const next = { ...answers, [s.key]: val };
    setAnswers(next);
    log("quiz_answer", { question: s.key, answer: val });
    if (step + 1 < QUIZ_STATEMENTS.length) setStep(step + 1);
    else { log("quiz_complete", next); onComplete(next); }
  };

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: "48px 20px" }}>
      <div style={{ height: 5, background: "#EFEDE4", borderRadius: 3, marginBottom: 20, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${progress}%`, background: C.yellow, transition: "width 200ms" }} />
      </div>
      <div style={{ fontSize: 12, color: C.steel, letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 6 }}>{step + 1} of {QUIZ_STATEMENTS.length}</div>
      <h2 style={{ fontFamily: FONT_HEAD, fontSize: 25, color: C.ink, margin: "0 0 24px", lineHeight: 1.35 }}>{s.text}</h2>
      <div style={{ display: "flex", gap: 8 }}>
        {[1, 2, 3, 4, 5].map((v) => (
          <button key={v} onClick={() => choose(v)} style={{ flex: 1, padding: "20px 0", border: `1.5px solid ${C.line}`, borderRadius: 8, background: "#fff", fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 19, color: C.ink, cursor: "pointer" }}>{v}</button>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11.5, color: C.steel }}>
        <span>Disagree</span><span>Neutral</span><span>Agree</span>
      </div>
    </div>
  );
}

function QuizResults({ allListings, openListing }) {
  const location = useLocation();
  const navigate = useNavigate();
  const answers = location.state?.answers;

  useEffect(() => {
    if (!answers) navigate("/quiz", { replace: true });
  }, [answers, navigate]);
  if (!answers) return null;

  const archetype = scoreQuiz(answers);
  const bodyPref = ARCHETYPE_BODY[archetype.name] || "Sedan";
  const matches = allListings.filter((c) => c.body === bodyPref).sort((a, b) => a.price - b.price).slice(0, 6);

  // "Share my result" scrapped in v16 — reported broken, root cause never
  // confirmed after two rounds of tracing (code checked out clean on
  // inspection both times). Not worth guessing at a fix with no repro
  // evidence. If revisited: the old implementation used navigator.share()
  // with a clipboard-copy fallback, pointing at the plain /quiz URL.
  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "48px 20px 60px" }}>
      <div style={{ textAlign: "center", marginBottom: 30 }}>
        <div style={{ fontSize: 13, color: C.steel }}>Your result</div>
        <h2 style={{ fontFamily: FONT_HEAD, fontSize: 32, color: C.ink, margin: "6px 0" }}>You're a {archetype.name}</h2>
        <p style={{ color: C.steel, fontSize: 14.5, maxWidth: 440, margin: "0 auto 8px" }}>{archetype.blurb}</p>
        <div style={{ marginBottom: 4 }}>
          <Badge tone={archetype.matchStrength === "close" ? "yellow" : "verified"}>{archetype.matchStrength === "close" ? "Close call between two types" : "Strong match"}</Badge>
        </div>
        {archetype.runnerUp && (
          <div style={{ fontSize: 12, color: C.steel, marginBottom: 16 }}>with a bit of {archetype.runnerUp.name} in you</div>
        )}
      </div>
      {matches.length === 0 ? (
        <div style={{ textAlign: "center", color: C.steel }}>No matching listings right now — try browsing all listings.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
          {matches.map((c) => <ListingCard key={c.id} listing={c} onOpen={openListing} />)}
        </div>
      )}
      <div style={{ textAlign: "center", marginTop: 26 }}>
        <Link to="/quiz" style={{ background: "transparent", border: `1px solid ${C.line}`, borderRadius: 4, padding: "10px 20px", fontFamily: FONT_HEAD, textDecoration: "none", display: "inline-block", color: C.ink }}>Retake quiz</Link>
      </div>
    </div>
  );
}

// ---------- Dealer subscription ----------
function DealerPage({ log }) {
  const tiers = [
    { name: "1–10 listings", price: 49, features: ["Up to 10 active listings", "Standard placement", "Basic dealer badge"] },
    { name: "11–30 listings", price: 129, highlight: true, features: ["Up to 30 active listings", "Always-featured placement", "Priority in search results", "Cheaper per-listing than boosting individually"] },
    { name: "31+ listings", price: 279, features: ["Unlimited listings", "Everything in the mid tier", "Homepage banner rotation", "Monthly regional market report"] },
  ];
  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "48px 20px 70px" }}>
      <div style={{ textAlign: "center", marginBottom: 34 }}>
        <Building2 size={28} color={C.ink} style={{ marginBottom: 8 }} />
        <h2 style={{ fontFamily: FONT_HEAD, fontSize: 30, color: C.ink, margin: "0 0 6px" }}>Dealer subscriptions</h2>
        <p style={{ color: C.steel, fontSize: 14, maxWidth: 480, margin: "0 auto" }}>Priced by how many active listings you run — always cheaper than boosting each one individually.</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {tiers.map((t) => (
          <div key={t.name} style={{ border: t.highlight ? `2px solid ${C.yellow}` : `1px solid ${C.line}`, borderRadius: 8, padding: 22, background: "#fff" }}>
            {t.highlight && <div style={{ marginBottom: 8 }}><Badge tone="yellow">Best value</Badge></div>}
            <div style={{ fontFamily: FONT_HEAD, fontSize: 18, color: C.ink }}>{t.name}</div>
            <div style={{ fontFamily: FONT_HEAD, fontSize: 30, color: C.ink, margin: "8px 0" }}>${t.price}<span style={{ fontSize: 13, color: C.steel }}>/mo</span></div>
            <div style={{ marginTop: 12 }}>
              {t.features.map((f, i) => <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13.5, color: "#3B4250", marginBottom: 8 }}><Check size={14} color={C.green} style={{ marginTop: 2, flexShrink: 0 }} />{f}</div>)}
            </div>
            <button onClick={() => log("dealer_plan_click", { plan: t.name })} style={{ width: "100%", marginTop: 12, background: t.highlight ? C.yellow : "transparent", border: t.highlight ? "none" : `1px solid ${C.line}`, borderRadius: 4, padding: "10px 0", fontFamily: FONT_HEAD, cursor: "pointer" }}>Choose plan</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Value my car ----------
// Rough repair-cost ceilings per system — real shop quotes vary a lot by
// region and specific failure, so these are reasonable US-average ballparks,
// not a substitute for an actual mechanic's diagnosis.
const MECHANICAL_SYSTEMS = [
  { key: "engine", label: "Engine", max: 4000 },
  { key: "transmission", label: "Transmission", max: 2500 },
  { key: "body", label: "Body / frame", max: 2000 },
  { key: "suspension", label: "Suspension / axle", max: 1200 },
  { key: "electrical", label: "Electrical", max: 800 },
  { key: "ac", label: "AC / heating", max: 600 },
  { key: "brakes", label: "Brakes", max: 500 },
];
const STATUS_OPTIONS = [
  { key: "Fixed", tone: "verified", weight: 0 },
  { key: "Ongoing", tone: "yellow", weight: 0.35 },
  { key: "Broken", tone: "danger", weight: 1 },
];

// Cosmetic damage doesn't have a "fixed" state the way a mechanical system
// does — a dent isn't "broken," it just is or isn't there. These use their
// own severity language and weights (no zero-cost tier, since selecting any
// tier means real damage was reported; skipping the category entirely is
// what represents "no damage").
const COSMETIC_SYSTEMS = [
  { key: "paint", label: "Paint / exterior (fading, chips, clear coat)", max: 1000 },
  { key: "dents", label: "Dents & scratches", max: 1200 },
];
const COSMETIC_OPTIONS = [
  { key: "Minor", tone: "verified", weight: 0.18 },
  { key: "Moderate", tone: "yellow", weight: 0.5 },
  { key: "Major", tone: "danger", weight: 1 },
];

// Burn marks scale by count, not severity — cost is driven by how many spots
// there are more than how bad any single one looks. Blended per-burn figure
// (fabric/vinyl/leather averaged, since we don't ask seat material) sourced
// from real repair-cost research: $50-$280/burn fabric, $75-$200 vinyl,
// $140-$420 leather. 4+ spots crosses into "just replace the panel" territory
// per that same research, so it's priced as a partial reupholstery job, not
// a per-burn multiple.
const BURN_TIERS = [
  { key: "1", label: "1 spot", cost: 150 },
  { key: "2-3", label: "2–3 spots", cost: 400 },
  { key: "4+", label: "4+ spots", cost: 1500 },
];
// Smoke/odor treatment is a flat detailing service, not brand-specific repair
// work — real cars, not annual-repair-rate territory — so only the regional
// labor adjustment applies here, not the brand multiplier.
const ODOR_TREATMENT_COST = 115; // midpoint of real $80-$150 range found

// Plain-language summary for public display — what's disclosed, not what it
// costs. Pricing logic stays internal; the fact of a disclosed issue is fine
// to show a buyer, the dollar breakdown isn't.
function getIssuesSummary(issues) {
  const rows = [];
  MECHANICAL_SYSTEMS.forEach((sys) => {
    const status = issues[sys.key];
    if (!status) return;
    const text = status === "Broken" ? "Not working" : status === "Ongoing" ? "Ongoing issue" : "Working fine";
    rows.push({ label: sys.label, statusText: text, positive: status === "Fixed" });
  });
  COSMETIC_SYSTEMS.forEach((sys) => {
    const status = issues[sys.key];
    if (!status) return;
    rows.push({ label: sys.label, statusText: status, positive: false });
  });
  if (issues.burnCount) {
    const tier = BURN_TIERS.find((t) => t.key === issues.burnCount);
    if (tier) rows.push({ label: "Burn marks", statusText: tier.label, positive: false });
  }
  if (issues.odorTreatment === true) rows.push({ label: "Smoke odor", statusText: "Present", positive: false });
  if (issues.odorTreatment === false) rows.push({ label: "Smoke odor", statusText: "None", positive: true });
  return rows;
}

// Real RepairPal average-annual-repair-cost-by-brand data (repairpal.com/reliability),
// checked September 2026. All-brand average is $652/yr — every brand's ceiling gets
// scaled by (brand figure ÷ 652). Brands not in this table (no RepairPal figure
// found/published, e.g. Tesla) fall back to a neutral 1.0 multiplier rather than a
// guess. This list should be refreshed periodically, same as the regional figure below.
const BRAND_REPAIR_COST = {
  Honda: 428, Acura: 501, Kia: 474, Hyundai: 468, Mazda: 462, Lexus: 551, Toyota: 441,
  Nissan: 500, Ford: 775, Chevrolet: 649, Jeep: 634, BMW: 968, "Mercedes-Benz": 908,
  Audi: 987, GMC: 744, Volkswagen: 676, Subaru: 617,
};
const ALL_BRAND_AVG_REPAIR_COST = 652;
function getBrandMultiplier(make) {
  const cost = BRAND_REPAIR_COST[make];
  return cost ? cost / ALL_BRAND_AVG_REPAIR_COST : 1.0;
}

// National baseline for the regional multiplier — real per-state figures
// come from the state_labor_rates table in Supabase (fetched by ValueMyCar),
// same BLS OEWS May 2025 source. States not yet in that table fall back to
// this national figure (multiplier of 1.0) rather than guessing.
const NATIONAL_MEDIAN_WAGE = 50620;

function computeMechanicalDeduction(issues, make, regionalMultiplier = 1.0) {
  const brandMult = getBrandMultiplier(make);
  const breakdown = [];
  let total = 0;
  MECHANICAL_SYSTEMS.forEach((sys) => {
    const status = issues[sys.key];
    if (!status) return;
    const opt = STATUS_OPTIONS.find((o) => o.key === status);
    const adjustedMax = sys.max * brandMult * regionalMultiplier;
    const deduction = Math.round(adjustedMax * opt.weight);
    if (deduction > 0) { breakdown.push({ label: sys.label, status, deduction }); total += deduction; }
    else breakdown.push({ label: sys.label, status, deduction: 0 });
  });
  COSMETIC_SYSTEMS.forEach((sys) => {
    const status = issues[sys.key];
    if (!status) return;
    const opt = COSMETIC_OPTIONS.find((o) => o.key === status);
    const adjustedMax = sys.max * brandMult * regionalMultiplier;
    const deduction = Math.round(adjustedMax * opt.weight);
    breakdown.push({ label: sys.label, status, deduction });
    total += deduction;
  });
  if (issues.burnCount) {
    const tier = BURN_TIERS.find((t) => t.key === issues.burnCount);
    if (tier) {
      const deduction = Math.round(tier.cost * brandMult * regionalMultiplier);
      breakdown.push({ label: "Burn marks", status: tier.label, deduction });
      total += deduction;
    }
  }
  if (issues.odorTreatment) {
    // Regional labor adjustment only — this is a flat detailing service, not
    // brand-specific repair work, so the brand multiplier doesn't apply.
    const deduction = Math.round(ODOR_TREATMENT_COST * regionalMultiplier);
    breakdown.push({ label: "Smoke odor treatment", status: "Needed", deduction });
    total += deduction;
  }
  return { total, breakdown, brandMult, hasBrandData: Boolean(BRAND_REPAIR_COST[make]) };
}

function MechanicalChecklist({ issues, onChange }) {
  return (
    <div>
      {MECHANICAL_SYSTEMS.map((sys) => (
        <div key={sys.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.line}`, gap: 10 }}>
          <span style={{ fontSize: 13.5, color: C.ink }}>{sys.label}</span>
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            {STATUS_OPTIONS.map((opt) => {
              const active = issues[sys.key] === opt.key;
              const activeColors = { verified: { bg: C.greenBg, color: C.green }, yellow: { bg: "#FFF3D6", color: C.yellowDark }, danger: { bg: "#FBE4E3", color: "#A32D2D" } };
              const c = activeColors[opt.tone];
              return (
                <button
                  key={opt.key}
                  onClick={() => onChange({ ...issues, [sys.key]: active ? undefined : opt.key })}
                  style={{
                    fontSize: 11.5, padding: "5px 10px", borderRadius: 4, cursor: "pointer",
                    border: active ? "none" : `1px solid ${C.line}`,
                    background: active ? c.bg : "#fff", color: active ? c.color : C.steel, fontWeight: active ? 600 : 400,
                  }}
                >{opt.key === "Ongoing" ? "Ongoing/okay" : opt.key}</button>
              );
            })}
          </div>
        </div>
      ))}

      {COSMETIC_SYSTEMS.map((sys) => (
        <div key={sys.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.line}`, gap: 10 }}>
          <span style={{ fontSize: 13.5, color: C.ink }}>{sys.label}</span>
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            {COSMETIC_OPTIONS.map((opt) => {
              const active = issues[sys.key] === opt.key;
              const activeColors = { verified: { bg: C.greenBg, color: C.green }, yellow: { bg: "#FFF3D6", color: C.yellowDark }, danger: { bg: "#FBE4E3", color: "#A32D2D" } };
              const c = activeColors[opt.tone];
              return (
                <button
                  key={opt.key}
                  onClick={() => onChange({ ...issues, [sys.key]: active ? undefined : opt.key })}
                  style={{
                    fontSize: 11.5, padding: "5px 10px", borderRadius: 4, cursor: "pointer",
                    border: active ? "none" : `1px solid ${C.line}`,
                    background: active ? c.bg : "#fff", color: active ? c.color : C.steel, fontWeight: active ? 600 : 400,
                  }}
                >{opt.key}</button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Burn marks — counted, not rated by severity, since cost scales with how many there are */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.line}`, gap: 10 }}>
        <span style={{ fontSize: 13.5, color: C.ink }}>Burn marks (seats, carpet)</span>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          {BURN_TIERS.map((tier) => {
            const active = issues.burnCount === tier.key;
            return (
              <button
                key={tier.key}
                onClick={() => onChange({ ...issues, burnCount: active ? undefined : tier.key })}
                style={{
                  fontSize: 11.5, padding: "5px 10px", borderRadius: 4, cursor: "pointer",
                  border: active ? "none" : `1px solid ${C.line}`,
                  background: active ? "#FBE4E3" : "#fff", color: active ? "#A32D2D" : C.steel, fontWeight: active ? 600 : 400,
                }}
              >{tier.label}</button>
            );
          })}
        </div>
      </div>

      {/* Smoke odor — flat yes/no, it's one detailing service regardless of how bad it is */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", gap: 10 }}>
        <span style={{ fontSize: 13.5, color: C.ink }}>Smoked-in / lingering odor</span>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          {[{ key: false, label: "No" }, { key: true, label: "Yes" }].map((opt) => {
            const active = Boolean(issues.odorTreatment) === opt.key;
            return (
              <button
                key={String(opt.key)}
                onClick={() => onChange({ ...issues, odorTreatment: opt.key })}
                style={{
                  fontSize: 11.5, padding: "5px 14px", borderRadius: 4, cursor: "pointer",
                  border: active ? "none" : `1px solid ${C.line}`,
                  background: active && opt.key ? "#FBE4E3" : active ? C.greenBg : "#fff",
                  color: active && opt.key ? "#A32D2D" : active ? C.green : C.steel,
                  fontWeight: active ? 600 : 400,
                }}
              >{opt.label}</button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// A clean, explicit confirmed-good state — all mechanical systems marked
// Fixed, odor explicitly marked absent. Cosmetic/burn categories stay unset,
// since "unset" already means "no damage reported" for those.
const NO_ISSUES_STATE = { engine: "Fixed", transmission: "Fixed", body: "Fixed", suspension: "Fixed", electrical: "Fixed", ac: "Fixed", brakes: "Fixed", odorTreatment: false };

// Replaces the old 2D damage pickers. A clear yes/no decision up front —
// makes the shift into this optional section obvious, and produces a real
// data signal: "confirmed no issues" is meaningfully different from "skipped
// this section entirely," which a blank form can't tell apart.
function IssuesGate({ issues, onChange }) {
  const [mode, setMode] = useState(null); // null | "none" | "some"

  if (mode === null) {
    return (
      <div style={{ background: "#F4F2EA", border: `1px solid ${C.line}`, borderRadius: 8, padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <div style={{ width: 4, height: 20, background: C.yellow, borderRadius: 2 }} />
          <div style={{ fontFamily: FONT_HEAD, fontSize: 16, color: C.ink }}>Any known issues?</div>
        </div>
        <p style={{ fontSize: 13, color: C.steel, marginBottom: 14 }}>Optional — but honest detail here builds more buyer trust than leaving it blank.</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={() => { onChange(NO_ISSUES_STATE); setMode("none"); }} style={{ flex: "1 1 160px", background: C.greenBg, color: C.green, border: "none", borderRadius: 6, padding: "12px 8px", fontFamily: FONT_HEAD, fontSize: 14, cursor: "pointer" }}>No, it's in good shape</button>
          <button onClick={() => setMode("some")} style={{ flex: "1 1 160px", background: "#fff", color: C.ink, border: `1px solid ${C.line}`, borderRadius: 6, padding: "12px 8px", fontFamily: FONT_HEAD, fontSize: 14, cursor: "pointer" }}>Yes, let me note a few things</button>
        </div>
      </div>
    );
  }

  if (mode === "none") {
    return (
      <div style={{ background: C.greenBg, border: `1px solid ${C.line}`, borderRadius: 8, padding: 16, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <span style={{ fontSize: 13.5, color: C.green, display: "flex", alignItems: "center", gap: 6 }}><Check size={15} /> Marked as no known issues</span>
        <button onClick={() => setMode("some")} style={{ background: "transparent", border: "none", color: C.steel, fontSize: 12.5, textDecoration: "underline", cursor: "pointer" }}>Actually, let me add something</button>
      </div>
    );
  }

  return (
    <div style={{ background: "#F4F2EA", border: `1px solid ${C.line}`, borderRadius: 8, padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <div style={{ width: 4, height: 20, background: C.yellow, borderRadius: 2 }} />
        <div style={{ fontFamily: FONT_HEAD, fontSize: 16, color: C.ink }}>What's going on?</div>
      </div>
      <p style={{ fontSize: 12.5, color: C.steel, marginBottom: 12 }}>Only mark what applies — leave the rest blank.</p>
      <MechanicalChecklist issues={issues} onChange={onChange} />
    </div>
  );
}

// Depreciation-curve baseline, adjusted for mileage vs. expected mileage for
// the car's age, then blended with real comps from HIGHWAYLOT's own listings
// once there are enough of them. Confidence is shown honestly rather than
// presenting an early, comp-starved guess as certain.
function estimateValue(input, allListings, issues = {}) {
  const age = Math.max(new Date().getFullYear() - input.year, 0);
  // Rough depreciation curve: ~20% year one, ~12%/year after, floored at 15% of original.
  let retained = 1;
  for (let y = 0; y < age; y++) retained *= y === 0 ? 0.80 : 0.88;
  retained = Math.max(retained, 0.15);
  const basePrice = input.originalPrice * retained;

  const expectedMileage = age * 12000;
  const mileageDelta = input.mileage - expectedMileage;
  const mileageAdjustment = -(mileageDelta / 12000) * 0.02 * basePrice; // ~2% of value per year-equivalent of extra/fewer miles

  const conditionMultiplier = { Excellent: 1.08, Good: 1.0, Fair: 0.88, "Needs work": 0.7 }[input.condition] ?? 1.0;

  let estimate = (basePrice + mileageAdjustment) * conditionMultiplier;

  // Comp-based blend: pull real same make/model listings within +/- 3 years.
  const comps = allListings.filter((c) => c.make.toLowerCase() === input.make.toLowerCase() && c.model.toLowerCase() === input.model.toLowerCase() && Math.abs(c.year - input.year) <= 3);
  let confidence = "Low";
  if (comps.length > 0) {
    const compAvg = comps.reduce((s, c) => s + c.price, 0) / comps.length;
    const weight = Math.min(comps.length / 8, 0.6); // comps can pull up to 60% of the estimate once there are enough
    estimate = estimate * (1 - weight) + compAvg * weight;
    confidence = comps.length >= 5 ? "High" : comps.length >= 2 ? "Medium" : "Low";
  }

  const { total: mechanicalDeduction, breakdown, brandMult, hasBrandData } = computeMechanicalDeduction(issues, input.make, input.regionalMultiplier ?? 1.0);
  // Floor the final number so a pile of deductions can't push it to $0 or negative —
  // a car is worth at least scrap/parts value even in bad shape.
  const floor = Math.max(estimate * 0.1, 400);
  estimate = Math.max(estimate - mechanicalDeduction, floor);

  return { estimate: Math.round(estimate / 100) * 100, confidence, compCount: comps.length, mechanicalDeduction, breakdown, brandMult, hasBrandData };
}

function ValueMyCar({ allListings, log }) {
  const [form, setForm] = useState({ year: "", make: "", model: "", mileage: "", condition: "Good", originalPrice: "", body: "Sedan", state: "", loan_status: "Paid off", loan_balance: "" });
  const [issues, setIssues] = useState({});
  const [result, setResult] = useState(null);
  const [errors, setErrors] = useState({});
  const [stateRates, setStateRates] = useState({}); // { "Florida": { multiplier: 0.95 }, ... } — only states we have real data for
  const set = (k) => (e) => { const val = e.target.value; setForm((prev) => ({ ...prev, [k]: val })); setErrors((prev) => (prev[k] ? { ...prev, [k]: false } : prev)); };
  const setNumeric = (k) => (e) => { const val = e.target.value.replace(/[^0-9]/g, ""); setForm((prev) => ({ ...prev, [k]: val })); setErrors((prev) => (prev[k] ? { ...prev, [k]: false } : prev)); };

  // Real state-by-state labor rate reference — only covers the states we've
  // actually pulled BLS figures for. Anything not in here falls back to the
  // national average honestly, rather than assuming Florida for everyone.
  useEffect(() => {
    supabase.from("state_labor_rates").select("state,multiplier").then(({ data, error }) => {
      if (error) { console.error("state labor rates fetch failed:", error.message); return; }
      const map = {};
      (data || []).forEach((row) => { map[row.state] = Number(row.multiplier); });
      setStateRates(map);
    });
  }, []);

  const hasStateData = form.state && stateRates[form.state] !== undefined;
  const regionalMultiplier = hasStateData ? stateRates[form.state] : 1.0;

  const submit = async () => {
    const req = ["year", "make", "model", "mileage", "originalPrice"];
    const errs = {}; req.forEach((k) => { if (!String(form[k]).trim()) errs[k] = true; });
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const input = { year: Number(form.year), make: form.make, model: form.model, mileage: Number(form.mileage), condition: form.condition, originalPrice: Number(form.originalPrice), regionalMultiplier };
    const res = estimateValue(input, allListings, issues);
    setResult({ ...res, stateUsed: form.state, hasStateData });
    const loanBalance = form.loan_status === "Still financed (loan payoff needed)" && form.loan_balance ? Number(form.loan_balance) : null;
    log("valuation_submitted", { ...input, issues, body: form.body, loan_balance: loanBalance, state: form.state });
    supabase.from("valuations").insert({ ...input, estimate: res.estimate, confidence: res.confidence, issues, body: form.body, loan_status: form.loan_status, loan_balance: loanBalance, state: form.state }).then(({ error }) => {
      if (error) console.error("valuation save failed:", error.message);
    });
  };

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "48px 20px 70px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 4 }}>
        <DollarSign size={26} color={C.ink} />
        <h2 style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: "clamp(26px, 6vw, 34px)", color: C.ink, margin: 0, textTransform: "uppercase", letterSpacing: 0.5 }}>What's Your Car Worth?</h2>
      </div>
      <p style={{ color: C.steel, fontSize: 14, marginBottom: 24, textAlign: "center" }}>Fill in your car's details to get an estimate.</p>

      <div className="hl-form-grid">
        <Field label="Year" required error={errors.year}>
          <select value={form.year} onChange={set("year")} style={inputStyle}><option value="">Select year</option>{YEARS.map((y) => <option key={y} value={y}>{y}</option>)}</select>
        </Field>
        <MakeModelPicker make={form.make} model={form.model} onMakeChange={(v) => setForm((prev) => ({ ...prev, make: v }))} onModelChange={(v) => setForm((prev) => ({ ...prev, model: v }))} errors={errors} clearError={(k) => setErrors((prev) => ({ ...prev, [k]: false }))} />
        <Field label="Current mileage" required error={errors.mileage}><input value={form.mileage} onChange={setNumeric("mileage")} inputMode="numeric" placeholder="52000" style={inputStyle} /></Field>
        <Field label="Original price paid" required error={errors.originalPrice}><input value={form.originalPrice} onChange={setNumeric("originalPrice")} inputMode="numeric" placeholder="28000" style={inputStyle} /></Field>
        <Field label="Overall condition"><select value={form.condition} onChange={set("condition")} style={inputStyle}><option>Excellent</option><option>Good</option><option>Fair</option><option>Needs work</option></select></Field>
        <Field label="Body style"><select value={form.body} onChange={set("body")} style={inputStyle}><option>Sedan</option><option>Coupe</option><option>Hatchback</option><option>SUV</option><option>Truck</option><option>Van/Minivan</option><option>Convertible</option></select></Field>
        <Field label="State"><select value={form.state} onChange={set("state")} style={inputStyle}><option value="">Select state</option>{US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}</select></Field>
        <Field label="Ownership status"><select value={form.loan_status} onChange={set("loan_status")} style={inputStyle}><option>Paid off</option><option>Still financed (loan payoff needed)</option></select></Field>
        {form.loan_status === "Still financed (loan payoff needed)" && (
          <Field label="Remaining loan balance ($)"><input value={form.loan_balance} onChange={setNumeric("loan_balance")} inputMode="numeric" placeholder="8500" style={inputStyle} /></Field>
        )}
      </div>

      <div style={{ marginTop: 22 }}>
        <IssuesGate issues={issues} onChange={setIssues} />
      </div>

      <button onClick={submit} style={{ marginTop: 20, background: C.yellow, color: C.ink, border: "none", borderRadius: 4, padding: "13px 26px", fontFamily: FONT_HEAD, fontSize: 15, cursor: "pointer" }}>Get my estimate</button>

      {result && (
        <div style={{ marginTop: 28, border: `1px solid ${C.line}`, borderRadius: 8, padding: 24, textAlign: "center" }}>
          <div style={{ fontSize: 12.5, color: C.steel, textTransform: "uppercase", letterSpacing: 0.4 }}>Estimated value</div>
          <div style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: "clamp(28px, 9vw, 40px)", color: C.ink, margin: "8px 0" }}>{fmtPrice(result.estimate)}</div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Badge tone={result.confidence === "High" ? "verified" : result.confidence === "Medium" ? "yellow" : "neutral"}>{result.confidence} confidence</Badge>
          </div>
          <div style={{ fontSize: 12.5, color: C.steel, marginTop: 12, lineHeight: 1.5 }}>
            {result.compCount > 0
              ? `Based on depreciation modeling plus ${result.compCount} similar ${result.compCount === 1 ? "listing" : "listings"} currently on HIGHWAYLOT.`
              : "Based on depreciation modeling only — no similar listings on HIGHWAYLOT yet to compare against. Estimates get sharper as more real cars get listed."}
          </div>

          {form.loan_status === "Still financed (loan payoff needed)" && form.loan_balance && (
            <div style={{ marginTop: 18, paddingTop: 16, borderTop: `1px solid ${C.line}` }}>
              <div style={{ fontSize: 12.5, color: C.steel, textTransform: "uppercase", letterSpacing: 0.4 }}>Estimated equity</div>
              <div style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 24, color: (result.estimate - Number(form.loan_balance)) < 0 ? "#A32D2D" : C.ink, marginTop: 4 }}>
                {fmtPrice(result.estimate - Number(form.loan_balance))}
              </div>
              <div style={{ fontSize: 11.5, color: C.steel, marginTop: 6 }}>
                {(result.estimate - Number(form.loan_balance)) < 0
                  ? "You may owe more than the car's worth right now — this is what you'd pay out of pocket to close out the loan on a sale."
                  : "What you'd walk away with after paying off the remaining loan balance. This doesn't affect the value estimate above — what you owe doesn't change what the car's worth."}
              </div>
            </div>
          )}

          {result.mechanicalDeduction > 0 && (
            <div style={{ marginTop: 18, paddingTop: 16, borderTop: `1px solid ${C.line}`, textAlign: "left" }}>
              <div style={{ fontSize: 12.5, color: C.steel, marginBottom: 8, textAlign: "center" }}>
                <strong style={{ color: "#A32D2D" }}>-{fmtPrice(result.mechanicalDeduction)}</strong> knocked off for known issues
              </div>
              {result.breakdown.filter((b) => b.deduction > 0).map((b, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "#3B4250", padding: "3px 0" }}>
                  <span>{b.label} — {b.status === "Broken" ? "not working" : b.status === "Ongoing" ? "ongoing issue" : b.status}</span>
                  <span style={{ color: "#A32D2D" }}>-{fmtPrice(b.deduction)}</span>
                </div>
              ))}
              <div style={{ fontSize: 11, color: C.steel, marginTop: 8 }}>
                {(() => {
                  const brandPart = result.hasBrandData ? `${form.make}'s typical repair costs` : null;
                  const regionPart = result.hasStateData ? `${result.stateUsed}'s real labor rates` : (result.stateUsed ? `the national average labor rate (real ${result.stateUsed} data isn't available yet)` : "the national average labor rate");
                  const parts = [brandPart, regionPart].filter(Boolean);
                  return `Adjusted for ${parts.join(" and ")}. Rough repair-cost estimates, not a mechanic's quote — actual costs vary by shop.`;
                })()}
              </div>
            </div>
          )}

          <Link to="/post" style={{ marginTop: 16, background: "transparent", border: `1px solid ${C.line}`, borderRadius: 4, padding: "10px 20px", fontFamily: FONT_HEAD, textDecoration: "none", display: "inline-block", color: C.ink }}>List this car</Link>
        </div>
      )}
    </div>
  );
}

// ---------- Manage listing (token link, no login) ----------
// Whoever holds this exact URL can edit or delete this one listing — nothing
// else. The token is a long random string, never readable through the public
// API (revoked at the database column level, not just hidden in the UI), and
// every check happens through a narrow database function rather than a
// general-purpose open policy. It's "security by possession of a secret
// link," not identity-based login — a real, honest tradeoff for a site with
// no accounts, not a full substitute for one.
function ManagePage() {
  const { id: idParamRaw, token } = useParams();
  const idParam = Number(idParamRaw);
  const navigate = useNavigate();
  const [status, setStatus] = useState("checking"); // checking | denied | ready | deleted
  const [listing, setListing] = useState(null);
  const [price, setPrice] = useState("");
  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showSoldForm, setShowSoldForm] = useState(false);
  const [soldPrice, setSoldPrice] = useState("");
  const [markingSold, setMarkingSold] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: ok, error: verifyErr } = await supabase.rpc("verify_listing_token", { p_id: idParam, p_token: token });
      if (verifyErr || !ok) { setStatus("denied"); return; }
      const { data, error } = await supabase.from("listings").select(LISTING_COLUMNS).eq("id", idParam).single();
      if (error || !data) { setStatus("denied"); return; }
      setListing(rowToListing(data));
      setPrice(String(data.price));
      setDesc(data.description || "");
      setStatus("ready");
    })();
  }, [idParam, token]);

  const goHome = () => navigate("/");

  const saveChanges = async () => {
    setSaving(true);
    const { data: ok } = await supabase.rpc("update_listing_with_token", { p_id: idParam, p_token: token, p_price: Number(price), p_description: desc });
    setSaving(false);
    if (ok) {
      // Refetch rather than assume — price_updated_at may or may not have
      // changed server-side depending on whether this crossed the 2.5%
      // threshold, and the countdown display needs the real value.
      const { data } = await supabase.from("listings").select(LISTING_COLUMNS).eq("id", idParam).single();
      if (data) setListing(rowToListing(data));
      setSaved(true); setTimeout(() => setSaved(false), 2500);
    }
  };

  const markSold = async () => {
    setMarkingSold(true);
    const priceVal = soldPrice.trim() ? Number(soldPrice) : null;
    const { data: ok } = await supabase.rpc("mark_listing_sold", { p_id: idParam, p_token: token, p_sold_price: priceVal });
    setMarkingSold(false);
    if (ok) setListing({ ...listing, status: "sold" });
  };

  const deleteListing = async () => {
    if (!window.confirm("Delete this listing? This can't be undone.")) return;
    const { data: ok } = await supabase.rpc("delete_listing_with_token", { p_id: idParam, p_token: token });
    if (ok) setStatus("deleted");
  };

  if (status === "checking") return <div style={{ textAlign: "center", padding: "80px 20px", color: C.steel }}>Checking your link…</div>;
  if (status === "denied") return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "80px 20px", textAlign: "center" }}>
      <div style={{ fontFamily: FONT_HEAD, fontSize: 22, color: C.ink, marginBottom: 8 }}>This link isn't valid</div>
      <p style={{ color: C.steel, fontSize: 14 }}>Either the listing's already been removed, or this management link is incorrect.</p>
      <button onClick={goHome} style={{ marginTop: 16, background: C.ink, color: "#fff", border: "none", borderRadius: 4, padding: "10px 20px", fontFamily: FONT_HEAD, cursor: "pointer" }}>Back to HIGHWAYLOT</button>
    </div>
  );
  if (status === "deleted") return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "80px 20px", textAlign: "center" }}>
      <div style={{ fontFamily: FONT_HEAD, fontSize: 22, color: C.ink, marginBottom: 8 }}>Listing deleted</div>
      <p style={{ color: C.steel, fontSize: 14 }}>It's no longer visible on HIGHWAYLOT.</p>
      <button onClick={goHome} style={{ marginTop: 16, background: C.ink, color: "#fff", border: "none", borderRadius: 4, padding: "10px 20px", fontFamily: FONT_HEAD, cursor: "pointer" }}>Back to HIGHWAYLOT</button>
    </div>
  );

  const expiry = listing ? getExpiryInfo(listing) : null;

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "40px 20px 70px" }}>
      <div style={{ fontFamily: FONT_HEAD, fontSize: 24, color: C.ink, marginBottom: 4 }}>Manage your listing</div>
      <p style={{ color: C.steel, fontSize: 13.5, marginBottom: 8 }}>{listing.year} {listing.make} {listing.model} — only visible to whoever has this exact link.</p>

      {listing.status === "sold" && (
        <div style={{ background: C.greenBg, border: `1px solid ${C.line}`, borderRadius: 6, padding: "10px 14px", fontSize: 13, color: C.green, marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>
          <Check size={14} /> Marked sold — no longer visible on HIGHWAYLOT
        </div>
      )}
      {listing.status === "active" && expiry && expiry.daysLeft <= 14 && !expiry.expired && (
        <div style={{ fontSize: 13, color: "#A32D2D", fontWeight: 600, marginBottom: 16 }}>
          Expires in {expiry.daysLeft} day{expiry.daysLeft === 1 ? "" : "s"} — update the price to keep it active.
        </div>
      )}
      {listing.status === "active" && expiry && expiry.expired && (
        <div style={{ fontSize: 13, color: "#A32D2D", fontWeight: 600, marginBottom: 16 }}>
          This listing has expired and is hidden from browse — update the price to bring it back.
        </div>
      )}

      <Field label="Price (USD)"><input value={price} onChange={(e) => setPrice(e.target.value)} style={inputStyle} disabled={listing.status === "sold"} /></Field>
      <div style={{ marginTop: 14 }}><Field label="Description"><textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={4} style={{ ...inputStyle, resize: "vertical" }} disabled={listing.status === "sold"} /></Field></div>
      {listing.status !== "sold" && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16 }}>
          <button onClick={saveChanges} disabled={saving} style={{ background: C.yellow, border: "none", borderRadius: 4, padding: "11px 20px", fontFamily: FONT_HEAD, cursor: "pointer" }}>{saving ? "Saving…" : "Save changes"}</button>
          {saved && <span style={{ fontSize: 12.5, color: C.green, display: "flex", alignItems: "center", gap: 4 }}><Check size={14} /> Saved</span>}
        </div>
      )}

      {listing.status !== "sold" && (
        <div style={{ marginTop: 30, paddingTop: 20, borderTop: `1px solid ${C.line}` }}>
          <div style={{ fontFamily: FONT_HEAD, fontSize: 15, color: C.ink, marginBottom: 6 }}>Sold it?</div>
          {!showSoldForm ? (
            <button onClick={() => setShowSoldForm(true)} style={{ background: C.greenBg, color: C.green, border: "none", borderRadius: 4, padding: "10px 18px", fontFamily: FONT_HEAD, cursor: "pointer" }}>Mark as sold</button>
          ) : (
            <div>
              <label style={{ fontSize: 12.5, color: C.steel, display: "block", marginBottom: 4 }}>What did it sell for? (optional)</label>
              <input value={soldPrice} onChange={(e) => setSoldPrice(e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" placeholder="e.g. 15500" style={inputStyle} />
              <div style={{ fontSize: 11.5, color: C.steel, marginTop: 6, lineHeight: 1.5 }}>
                This stays completely private — it's never shown on your listing or anywhere public. It just helps us understand how prices actually move so we can make our tools more accurate for everyone.
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button onClick={markSold} disabled={markingSold} style={{ background: C.green, color: "#fff", border: "none", borderRadius: 4, padding: "10px 18px", fontFamily: FONT_HEAD, cursor: "pointer" }}>{markingSold ? "Saving…" : "Confirm sold"}</button>
                <button onClick={() => setShowSoldForm(false)} style={{ background: "transparent", border: `1px solid ${C.line}`, borderRadius: 4, padding: "10px 18px", fontFamily: FONT_HEAD, cursor: "pointer" }}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {listing.status !== "sold" && (
        <div style={{ marginTop: 30, paddingTop: 20, borderTop: `1px solid ${C.line}` }}>
          <div style={{ fontFamily: FONT_HEAD, fontSize: 15, color: "#A32D2D", marginBottom: 6 }}>Danger zone</div>
          <button onClick={deleteListing} style={{ background: "#FBE4E3", color: "#A32D2D", border: "none", borderRadius: 4, padding: "10px 18px", fontFamily: FONT_HEAD, cursor: "pointer" }}>Delete this listing</button>
        </div>
      )}
      <span onClick={goHome} style={{ display: "inline-block", marginTop: 24, color: C.steel, fontSize: 13, cursor: "pointer", textDecoration: "underline" }}>Back to HIGHWAYLOT</span>
    </div>
  );
}

// ---------- Terms ----------
// ---------- Admin dashboard (v17) ----------
// Secret-gated, not logged-in — see the admin RPC functions in schema.sql
// for how the actual secret check works (entirely server-side, never
// shipped in this bundle).
//
// v17.1 — added detailed per-category drill-down tabs (Listings, Quiz,
// Valuations), sold-price analytics, a data-coverage tracker for the
// repair estimator's brand/state tables, a simple two-dimension
// cross-reference tool, and inline report snippets instead of a dead link.
// Overview tab uses a responsive grid instead of full-width stacked cards.
function SimpleBarRow({ label, value, max, suffix = "" }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: C.ink, marginBottom: 3 }}>
        <span>{label}</span><span style={{ fontWeight: 600 }}>{value}{suffix}</span>
      </div>
      <div style={{ height: 8, background: "#EFEDE4", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: C.yellow }} />
      </div>
    </div>
  );
}
function AdminSection({ title, children, span }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 8, padding: 20, gridColumn: span === "full" ? "1 / -1" : undefined }}>
      <div style={{ fontFamily: FONT_HEAD, fontSize: 16, color: C.ink, marginBottom: 14 }}>{title}</div>
      {children}
    </div>
  );
}
// Compact inline detail card for a listing — used on the reports queue so
// an admin can judge a report without navigating away (the link never
// worked well as a review flow; the actual details are what's needed).
function ListingSnippet({ listing }) {
  if (!listing) return <div style={{ fontSize: 12.5, color: C.steel, fontStyle: "italic" }}>Listing not found (may have been deleted).</div>;
  return (
    <div style={{ background: "#FAFAF6", border: `1px solid ${C.line}`, borderRadius: 6, padding: 12, marginTop: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontFamily: FONT_HEAD, fontSize: 14.5, color: C.ink }}>{listing.year} {listing.make} {listing.model} {listing.trim}</div>
        <div style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 16, color: C.ink }}>{fmtPrice(listing.price)}</div>
      </div>
      <div style={{ fontSize: 12, color: C.steel, marginTop: 4 }}>{fmtMiles(listing.mileage)} · {listing.city}, {stateAbbr(listing.state)} · {listing.condition} · {listing.seller}</div>
      <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
        <CredibilityDot credibility={listing.credibility} />
        {listing.verified && <Badge tone="verified">Verified</Badge>}
        {listing.featured && <Badge tone="yellow">Featured</Badge>}
        <FairnessBadge fairness={listing.fairness} />
      </div>
      <div style={{ fontSize: 12, color: "#3B4250", marginTop: 8, lineHeight: 1.5 }}>{listing.desc}</div>
    </div>
  );
}

const TH = { textAlign: "left", padding: "8px 10px", fontSize: 11.5, color: C.steel, borderBottom: `1px solid ${C.line}`, whiteSpace: "nowrap" };
const TD = { padding: "8px 10px", fontSize: 12.5, color: C.ink, borderBottom: `1px solid ${C.line}`, whiteSpace: "nowrap" };

function AdminPage() {
  const { secret } = useParams();
  const [tab, setTab] = useState("overview");
  const [status, setStatus] = useState("checking"); // checking | denied | ready
  const [listings, setListings] = useState([]);
  const [reports, setReports] = useState([]);
  const [quizResponses, setQuizResponses] = useState([]);
  const [valuations, setValuations] = useState([]);
  const [soldListings, setSoldListings] = useState([]);
  const [stateRates, setStateRates] = useState([]);
  const [sortKey, setSortKey] = useState("created_at");
  const [xrefMake, setXrefMake] = useState("");
  const [xrefState, setXrefState] = useState("");

  useEffect(() => {
    (async () => {
      const [reportsRes, quizRes, valRes, soldRes, listingsRes, ratesRes] = await Promise.all([
        supabase.rpc("admin_get_reports", { p_secret: secret }),
        supabase.rpc("admin_get_quiz_responses", { p_secret: secret }),
        supabase.rpc("admin_get_valuations", { p_secret: secret }),
        supabase.rpc("admin_get_sold_listings", { p_secret: secret }),
        supabase.from("listings").select(LISTING_COLUMNS),
        supabase.from("state_labor_rates").select("state,median_annual_wage,multiplier"),
      ]);
      if (reportsRes.error || quizRes.error || valRes.error || soldRes.error) { setStatus("denied"); return; }
      setReports(reportsRes.data || []);
      setQuizResponses(quizRes.data || []);
      setValuations(valRes.data || []);
      setSoldListings((soldRes.data || []).map(rowToListing));
      setListings((listingsRes.data || []).map(rowToListing));
      setStateRates(ratesRes.data || []);
      setStatus("ready");
    })();
  }, [secret]);

  const updateReportStatus = async (reportId, newStatus) => {
    setReports(reports.map((r) => (r.id === reportId ? { ...r, status: newStatus } : r))); // optimistic
    const { error } = await supabase.rpc("admin_update_report_status", { p_secret: secret, p_report_id: reportId, p_status: newStatus });
    if (error) console.error("report status update failed:", error.message);
  };

  if (status === "checking") return <div style={{ textAlign: "center", padding: "80px 20px", color: C.steel }}>Checking access…</div>;
  if (status === "denied") return (
    <div style={{ maxWidth: 420, margin: "0 auto", padding: "80px 20px", textAlign: "center" }}>
      <div style={{ fontFamily: FONT_HEAD, fontSize: 20, color: C.ink }}>Access denied</div>
      <p style={{ color: C.steel, fontSize: 13.5, marginTop: 8 }}>This link isn't valid, or doesn't have admin access.</p>
    </div>
  );

  const withFairness = listings.map((l) => ({ ...l, fairness: estimateFairness(l, listings) }));
  const withCred = withFairness.map((l) => ({ ...l, credibility: computeCredibility(l, withFairness) }));

  // ----- Overview computations -----
  const soldCount = listings.filter((l) => l.status === "sold").length;
  const expiredCount = listings.filter((l) => l.status === "active" && getExpiryInfo(l).expired).length;
  const activeCount = listings.filter((l) => l.status === "active" && !getExpiryInfo(l).expired).length;
  const credCounts = { green: 0, yellow: 0, red: 0 };
  withCred.forEach((l) => { if (credCounts[l.credibility?.level] !== undefined) credCounts[l.credibility.level]++; });
  const byState = {};
  listings.forEach((l) => { byState[l.state] = (byState[l.state] || 0) + 1; });
  const stateEntries = Object.entries(byState).sort((a, b) => b[1] - a[1]);
  const maxStateCount = stateEntries.length ? stateEntries[0][1] : 1;
  const archetypeCounts = {};
  quizResponses.forEach((r) => { archetypeCounts[r.archetype] = (archetypeCounts[r.archetype] || 0) + 1; });
  const archetypeEntries = Object.entries(archetypeCounts).sort((a, b) => b[1] - a[1]);
  const maxArchetypeCount = archetypeEntries.length ? archetypeEntries[0][1] : 1;
  const avgEstimate = valuations.length ? Math.round(valuations.reduce((s, v) => s + (v.estimate || 0), 0) / valuations.length) : 0;

  // ----- Listings tab sort -----
  const sortedListings = [...withCred].sort((a, b) => {
    if (sortKey === "price") return b.price - a.price;
    if (sortKey === "mileage") return a.mileage - b.mileage;
    return new Date(b.created_at) - new Date(a.created_at);
  });

  // ----- Coverage tracker -----
  const coveredStates = new Set(stateRates.map((r) => r.state));
  const missingStates = US_STATES.filter((s) => !coveredStates.has(s));
  const coveredMakes = Object.keys(BRAND_REPAIR_COST);
  const missingMakes = POPULAR_MAKES.filter((m) => !coveredMakes.includes(m));

  // ----- Cross-reference tool -----
  const xrefMatches = listings.filter((l) => (!xrefMake || l.make === xrefMake) && (!xrefState || l.state === xrefState));
  const xrefAvg = xrefMatches.length ? Math.round(xrefMatches.reduce((s, l) => s + l.price, 0) / xrefMatches.length) : 0;

  const REPORT_STATUSES = ["New", "In review", "Resolved"];
  const TABS = [
    { key: "overview", label: "Overview" },
    { key: "listings", label: `Listings (${listings.length})` },
    { key: "quiz", label: `Quiz (${quizResponses.length})` },
    { key: "valuations", label: `Valuations (${valuations.length})` },
    { key: "sold", label: `Sold analytics (${soldListings.length})` },
    { key: "coverage", label: "Data coverage" },
    { key: "xref", label: "Cross-reference" },
    { key: "reports", label: `Reports (${reports.length})` },
  ];

  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", padding: "32px 20px 60px" }}>
      <div style={{ fontFamily: FONT_HEAD, fontSize: 24, color: C.ink, marginBottom: 2 }}>Admin dashboard</div>
      <p style={{ fontSize: 12.5, color: C.steel, marginBottom: 18 }}>{listings.length} listings · {quizResponses.length} quiz completions · {valuations.length} valuations · {reports.length} reports</p>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 22, borderBottom: `1px solid ${C.line}`, paddingBottom: 12 }}>
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            fontSize: 12.5, padding: "7px 12px", borderRadius: 4, cursor: "pointer",
            border: tab === t.key ? "none" : `1px solid ${C.line}`,
            background: tab === t.key ? C.ink : "#fff", color: tab === t.key ? "#fff" : C.ink, fontWeight: tab === t.key ? 600 : 400,
          }}>{t.label}</button>
        ))}
      </div>

      {tab === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
          <AdminSection title={`Listing lifecycle (${listings.length} total)`}>
            <div style={{ display: "flex", gap: 24 }}>
              <div><div style={{ fontFamily: FONT_HEAD, fontSize: 24, color: C.green }}>{activeCount}</div><div style={{ fontSize: 12, color: C.steel }}>Active</div></div>
              <div><div style={{ fontFamily: FONT_HEAD, fontSize: 24, color: C.steel }}>{expiredCount}</div><div style={{ fontSize: 12, color: C.steel }}>Expired</div></div>
              <div><div style={{ fontFamily: FONT_HEAD, fontSize: 24, color: C.ink }}>{soldCount}</div><div style={{ fontSize: 12, color: C.steel }}>Sold</div></div>
            </div>
          </AdminSection>

          <AdminSection title="Credibility distribution">
            <SimpleBarRow label="No issues detected" value={credCounts.green} max={listings.length} />
            <SimpleBarRow label="Worth a closer look" value={credCounts.yellow} max={listings.length} />
            <SimpleBarRow label="Flagged" value={credCounts.red} max={listings.length} />
          </AdminSection>

          <AdminSection title="Value My Car submissions">
            <div style={{ fontSize: 13.5, color: C.ink }}>Average estimate: <strong>{fmtPrice(avgEstimate)}</strong></div>
            <div style={{ fontSize: 12, color: C.steel, marginTop: 4 }}>{valuations.length} total submissions</div>
          </AdminSection>

          <AdminSection title="Quiz results" span="full">
            {archetypeEntries.length === 0 ? <div style={{ fontSize: 13, color: C.steel }}>No quiz completions yet.</div> :
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "4px 24px" }}>
                {archetypeEntries.map(([name, count]) => <SimpleBarRow key={name} label={name} value={count} max={maxArchetypeCount} />)}
              </div>}
          </AdminSection>

          <AdminSection title="Listings by state" span="full">
            {stateEntries.length === 0 ? <div style={{ fontSize: 13, color: C.steel }}>No listings yet.</div> :
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "4px 24px" }}>
                {stateEntries.map(([state, count]) => <SimpleBarRow key={state} label={state} value={count} max={maxStateCount} />)}
              </div>}
          </AdminSection>
        </div>
      )}

      {tab === "listings" && (
        <AdminSection title="All listings" span="full">
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            {[{ k: "created_at", l: "Newest" }, { k: "price", l: "Price" }, { k: "mileage", l: "Mileage" }].map((s) => (
              <button key={s.k} onClick={() => setSortKey(s.k)} style={{ fontSize: 11.5, padding: "4px 10px", borderRadius: 4, cursor: "pointer", border: sortKey === s.k ? "none" : `1px solid ${C.line}`, background: sortKey === s.k ? C.yellow : "#fff" }}>{s.l}</button>
            ))}
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>{["Car", "Price", "Mileage", "State", "Status", "Credibility", "Posted"].map((h) => <th key={h} style={TH}>{h}</th>)}</tr></thead>
              <tbody>
                {sortedListings.map((l) => (
                  <tr key={l.id}>
                    <td style={TD}>{l.year} {l.make} {l.model}</td>
                    <td style={TD}>{fmtPrice(l.price)}</td>
                    <td style={TD}>{fmtMiles(l.mileage)}</td>
                    <td style={TD}>{stateAbbr(l.state)}</td>
                    <td style={TD}>{l.status === "sold" ? "Sold" : getExpiryInfo(l).expired ? "Expired" : "Active"}</td>
                    <td style={TD}><CredibilityDot credibility={l.credibility} /></td>
                    <td style={TD}>{timeAgo(l.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminSection>
      )}

      {tab === "quiz" && (
        <AdminSection title="Individual quiz responses" span="full">
          {quizResponses.length === 0 ? <div style={{ fontSize: 13, color: C.steel }}>No quiz completions yet.</div> : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>{["Date", "Result", ...QUIZ_STATEMENTS.map((s) => s.key)].map((h) => <th key={h} style={TH}>{h}</th>)}</tr></thead>
                <tbody>
                  {quizResponses.map((r) => (
                    <tr key={r.id}>
                      <td style={TD}>{timeAgo(r.created_at)}</td>
                      <td style={{ ...TD, fontWeight: 600 }}>{r.archetype}</td>
                      {QUIZ_STATEMENTS.map((s) => <td key={s.key} style={TD}>{r.answers?.[s.key] ?? "—"}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminSection>
      )}

      {tab === "valuations" && (
        <AdminSection title="Individual valuation submissions" span="full">
          {valuations.length === 0 ? <div style={{ fontSize: 13, color: C.steel }}>No submissions yet.</div> : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>{["Date", "Car", "Mileage", "Condition", "State", "Original price", "Estimate", "Confidence"].map((h) => <th key={h} style={TH}>{h}</th>)}</tr></thead>
                <tbody>
                  {valuations.map((v) => (
                    <tr key={v.id}>
                      <td style={TD}>{timeAgo(v.created_at)}</td>
                      <td style={TD}>{v.year} {v.make} {v.model}</td>
                      <td style={TD}>{fmtMiles(v.mileage)}</td>
                      <td style={TD}>{v.condition}</td>
                      <td style={TD}>{v.state ? stateAbbr(v.state) : "—"}</td>
                      <td style={TD}>{fmtPrice(v.originalPrice)}</td>
                      <td style={{ ...TD, fontWeight: 600 }}>{fmtPrice(v.estimate)}</td>
                      <td style={TD}>{v.confidence}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminSection>
      )}

      {tab === "sold" && (
        <AdminSection title="Sold — asking price vs. real sale price" span="full">
          <div style={{ fontSize: 12, color: C.steel, marginBottom: 12 }}>Sold price is private — sellers can optionally report it, it's never shown publicly. This is the only place it's visible.</div>
          {soldListings.length === 0 ? <div style={{ fontSize: 13, color: C.steel }}>No sold listings yet.</div> : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>{["Car", "State", "Asking", "Sold for", "Difference", "Days to sell"].map((h) => <th key={h} style={TH}>{h}</th>)}</tr></thead>
                <tbody>
                  {soldListings.map((l) => {
                    const daysToSell = l.sold_at ? Math.round((new Date(l.sold_at) - new Date(l.created_at)) / 86400000) : null;
                    const diffPct = l.sold_price ? Math.round(((l.sold_price - l.price) / l.price) * 100) : null;
                    return (
                      <tr key={l.id}>
                        <td style={TD}>{l.year} {l.make} {l.model}</td>
                        <td style={TD}>{stateAbbr(l.state)}</td>
                        <td style={TD}>{fmtPrice(l.price)}</td>
                        <td style={TD}>{l.sold_price ? fmtPrice(l.sold_price) : <span style={{ color: C.steel, fontStyle: "italic" }}>Not reported</span>}</td>
                        <td style={{ ...TD, color: diffPct == null ? C.steel : diffPct < 0 ? "#A32D2D" : C.green }}>{diffPct == null ? "—" : `${diffPct > 0 ? "+" : ""}${diffPct}%`}</td>
                        <td style={TD}>{daysToSell == null ? "—" : `${daysToSell}d`}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </AdminSection>
      )}

      {tab === "coverage" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
          <AdminSection title={`Regional labor data — ${coveredStates.size} of ${US_STATES.length} states`}>
            <div style={{ fontSize: 12, color: C.steel, marginBottom: 10 }}>States without real BLS data fall back to the national average, not a guess.</div>
            <div style={{ fontSize: 12.5, color: C.ink, lineHeight: 1.8 }}>{missingStates.join(", ")}</div>
          </AdminSection>
          <AdminSection title={`Brand repair-cost data — ${coveredMakes.length} of ${POPULAR_MAKES.length} makes`}>
            <div style={{ fontSize: 12, color: C.steel, marginBottom: 10 }}>Makes without real RepairPal data fall back to a neutral multiplier, not a guess.</div>
            <div style={{ fontSize: 12.5, color: C.ink, lineHeight: 1.8 }}>{missingMakes.join(", ")}</div>
          </AdminSection>
        </div>
      )}

      {tab === "xref" && (
        <AdminSection title="Cross-reference" span="full">
          <div style={{ fontSize: 12, color: C.steel, marginBottom: 14 }}>Pick a make and/or state to see how many listings match and their average price.</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
            <select value={xrefMake} onChange={(e) => setXrefMake(e.target.value)} style={{ ...inputStyle, width: 200 }}><option value="">Any make</option>{[...new Set(listings.map((l) => l.make))].sort().map((m) => <option key={m} value={m}>{m}</option>)}</select>
            <select value={xrefState} onChange={(e) => setXrefState(e.target.value)} style={{ ...inputStyle, width: 200 }}><option value="">Any state</option>{[...new Set(listings.map((l) => l.state))].sort().map((s) => <option key={s} value={s}>{s}</option>)}</select>
          </div>
          <div style={{ display: "flex", gap: 24 }}>
            <div><div style={{ fontFamily: FONT_HEAD, fontSize: 24, color: C.ink }}>{xrefMatches.length}</div><div style={{ fontSize: 12, color: C.steel }}>Matching listings</div></div>
            <div><div style={{ fontFamily: FONT_HEAD, fontSize: 24, color: C.ink }}>{xrefMatches.length ? fmtPrice(xrefAvg) : "—"}</div><div style={{ fontSize: 12, color: C.steel }}>Average price</div></div>
          </div>
        </AdminSection>
      )}

      {tab === "reports" && (
        <AdminSection title="Reports queue" span="full">
          {reports.length === 0 ? <div style={{ fontSize: 13, color: C.steel }}>No reports yet.</div> : reports.map((r) => {
            const listing = withCred.find((l) => l.id === r.listing_id);
            return (
              <div key={r.id} style={{ borderBottom: `1px solid ${C.line}`, padding: "14px 0" }}>
                <div style={{ fontSize: 12.5, color: C.steel }}>{r.reason} · {timeAgo(r.created_at)}</div>
                <ListingSnippet listing={listing} />
                <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                  {REPORT_STATUSES.map((s) => (
                    <button key={s} onClick={() => updateReportStatus(r.id, s)} style={{
                      fontSize: 11.5, padding: "4px 10px", borderRadius: 4, cursor: "pointer",
                      border: r.status === s ? "none" : `1px solid ${C.line}`,
                      background: r.status === s ? C.yellow : "#fff", color: C.ink, fontWeight: r.status === s ? 600 : 400,
                    }}>{s}</button>
                  ))}
                </div>
              </div>
            );
          })}
        </AdminSection>
      )}
    </div>
  );
}

function Terms() {
  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "48px 20px 70px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <FileText size={20} color={C.ink} /><h2 style={{ fontFamily: FONT_HEAD, fontSize: 24, color: C.ink, margin: 0 }}>Terms summary</h2>
      </div>
      <p style={{ color: C.steel, fontSize: 13, marginBottom: 20 }}>Plain-language summary — the full legal terms would live here before launch.</p>
      {[
        ["We're a listing platform, not a party to any sale.", "HIGHWAYLOT connects buyers and sellers. We are not involved in, and do not facilitate, the actual exchange of money or the vehicle."],
        ["We don't verify listings.", "We don't inspect vehicles, confirm seller identity, or check vehicle history unless explicitly noted on a listing. Buyers are responsible for their own due diligence."],
        ["No ID required to list or browse.", "You don't need to submit identification to use HIGHWAYLOT. Contact info is only shared when you choose to reveal it."],
        ["Transactions are at your own risk.", "Meet in public, verify the vehicle in person, and use secure payment methods. HIGHWAYLOT does not mediate disputes between buyers and sellers."],
      ].map(([title, body], i) => (
        <div key={i} style={{ marginBottom: 18 }}>
          <div style={{ fontFamily: FONT_HEAD, fontSize: 15, color: C.ink, marginBottom: 4 }}>{title}</div>
          <div style={{ fontSize: 13.5, color: "#3B4250", lineHeight: 1.6 }}>{body}</div>
        </div>
      ))}
      <Link to="/" style={{ marginTop: 8, background: "transparent", border: `1px solid ${C.line}`, borderRadius: 4, padding: "10px 20px", fontFamily: FONT_HEAD, textDecoration: "none", display: "inline-block", color: C.ink }}>Back</Link>
    </div>
  );
}

// ---------- Footer ----------
function Footer() {
  return (
    <div style={{ background: C.ink, borderTop: `4px solid ${C.yellow}`, marginTop: 40 }}>
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "26px 20px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12.5 }}>HIGHWAYLOT — buy and sell cars nationwide.</div>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <Link to="/terms" style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, textDecoration: "underline" }}>Terms</Link>
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>United States only, for now.</div>
        </div>
      </div>
    </div>
  );
}

// ---------- App ----------
function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${Math.max(mins, 1)} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}
// DB uses `description` (since `desc` is a reserved SQL word); the rest of
// the app uses `desc`. This maps between the two at the boundary.
const rowToListing = (row) => ({ ...row, desc: row.description, posted: timeAgo(row.created_at) });

// 90-day expiry, computed on read rather than stored — a listing "expires"
// the moment 90 days pass since its last real price change (price_updated_at),
// not since it was first posted. No scheduled job needed: this just gets
// recalculated every time listings are fetched.
const EXPIRY_DAYS = 90;
function getExpiryInfo(listing) {
  if (listing.status !== "active") return { expired: false, daysLeft: null }; // sold listings don't "expire"
  const clockStart = new Date(listing.price_updated_at || listing.created_at).getTime();
  const expiresAt = clockStart + EXPIRY_DAYS * 86400000;
  const daysLeft = Math.ceil((expiresAt - Date.now()) / 86400000);
  return { expired: daysLeft <= 0, daysLeft };
}
function isVisibleOnBrowse(listing) {
  if (listing.status === "sold") return false;
  return !getExpiryInfo(listing).expired;
}

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const { log } = useAnalytics();

  // Capture QR/flyer attribution once, on first load of any page.
  useEffect(() => { captureAttribution(); }, []);

  useEffect(() => {
    if (location.pathname.startsWith("/manage/") || location.pathname.startsWith("/admin/")) { setLoading(false); return; } // these routes fetch their own data
    (async () => {
      const { data, error } = await supabase.from("listings").select(LISTING_COLUMNS).order("created_at", { ascending: false });
      if (error) { console.error("fetch listings failed:", error.message); setFetchError(error.message); setLoading(false); return; }
      setListings(data.map(rowToListing));
      setLoading(false);
    })();
  }, [location.pathname.startsWith("/manage/"), location.pathname.startsWith("/admin/")]);

  const openListing = (id) => { log("listing_view", { listingId: id }); navigate(`/listing/${id}`); };

  const enrichedListings = useMemo(() => {
    const withFairness = listings.map((l) => ({ ...l, fairness: estimateFairness(l, listings) }));
    return withFairness.map((l) => ({ ...l, credibility: computeCredibility(l, withFairness) }));
  }, [listings]);
  // Sold/expired listings still exist for anyone with a direct link
  // (ListingDetail uses the full enrichedListings above), but shouldn't show
  // up in browse/category/quiz-match contexts — this is the filtered view
  // for those.
  const visibleListings = useMemo(() => enrichedListings.filter(isVisibleOnBrowse), [enrichedListings]);

  const handlePostSubmit = async (data) => {
    const { desc, ...rest } = data;
    const manage_token = generateToken();
    const { data: inserted, error } = await supabase.from("listings").insert({ ...rest, description: desc, manage_token }).select(LISTING_COLUMNS).single();
    if (error) { console.error("post listing failed:", error.message); return error.message; }
    const newListing = rowToListing(inserted);
    setListings([newListing, ...listings]);
    const manageLink = `${window.location.origin}/manage/${newListing.id}/${manage_token}`;
    log("listing_created", { listingId: newListing.id });
    navigate("/post/success", { state: { listingId: newListing.id, manageLink } });
    return null;
  };

  // handleBoost removed in v15, shelved — see shelved-boost-feature.jsx

  const handleQuizComplete = async (answers) => {
    const archetype = scoreQuiz(answers).name;
    supabase.from("quiz_responses").insert({ answers, archetype }).then(({ error }) => {
      if (error) console.error("quiz save failed:", error.message);
    });
    log("quiz_complete", answers);
    navigate("/quiz/results", { state: { answers } });
  };

  const isManageRoute = location.pathname.startsWith("/manage/") || location.pathname.startsWith("/admin/");

  if (!isManageRoute && loading) {
    return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_BODY, color: C.steel }}>Loading listings…</div>;
  }
  if (!isManageRoute && fetchError) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_BODY, padding: 20 }}>
        <div style={{ maxWidth: 440, textAlign: "center" }}>
          <div style={{ fontFamily: FONT_HEAD, fontSize: 20, color: "#A32D2D", marginBottom: 8 }}>Couldn't load listings</div>
          <div style={{ fontSize: 13, color: C.steel, marginBottom: 4 }}>{fetchError}</div>
          <div style={{ fontSize: 12, color: C.steel }}>This is usually a database schema mismatch — check that the latest schema.sql has been run in Supabase.</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: FONT_BODY, background: C.paper, minHeight: "100%" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap');
        .hl-detail-grid { display: grid; grid-template-columns: 1.6fr 1fr; gap: 32px; }
        .hl-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .hl-spec-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px 18px; }
        @media (max-width: 720px) { .hl-detail-grid { grid-template-columns: 1fr; gap: 24px; } }
        @media (max-width: 480px) { .hl-form-grid { grid-template-columns: 1fr; } .hl-spec-grid { grid-template-columns: 1fr 1fr; } }
      `}</style>
      <ScrollToTop />
      <TopBar onPost={() => navigate("/post")} />
      <Routes>
        <Route path="/" element={<Home allListings={visibleListings} log={log} openListing={openListing} />} />
        <Route path="/listing/:id" element={<ListingDetail allListings={enrichedListings} log={log} />} />
        <Route path="/category/:kind/:value/:state" element={<CategoryPage listings={visibleListings} openListing={openListing} />} />
        <Route path="/post" element={<PostAd onSubmit={handlePostSubmit} existingListings={listings} log={log} />} />
        <Route path="/post/success" element={<Success />} />
        <Route path="/value" element={<ValueMyCar allListings={listings} log={log} />} />
        <Route path="/quiz" element={<Quiz log={log} onComplete={handleQuizComplete} />} />
        <Route path="/quiz/results" element={<QuizResults allListings={visibleListings} openListing={openListing} />} />
        <Route path="/manage/:id/:token" element={<ManagePage />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/admin/:secret" element={<AdminPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Footer />
    </div>
  );
}

function NotFound() {
  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "80px 20px", textAlign: "center" }}>
      <div style={{ fontFamily: FONT_HEAD, fontSize: 22, color: C.ink, marginBottom: 8 }}>Page not found</div>
      <p style={{ color: C.steel, fontSize: 14 }}>That link doesn't lead anywhere on HIGHWAYLOT.</p>
      <Link to="/" style={{ display: "inline-block", marginTop: 16, background: C.ink, color: "#fff", border: "none", borderRadius: 4, padding: "10px 20px", fontFamily: FONT_HEAD, textDecoration: "none" }}>Back to HIGHWAYLOT</Link>
    </div>
  );
}
