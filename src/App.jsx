import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Search, MapPin, Gauge, Fuel, Calendar, X, Plus, ChevronLeft, ChevronRight,
  ShieldCheck, Phone, SlidersHorizontal, Car as CarIcon, Check, Star,
  TrendingUp, TrendingDown, Zap, BarChart3, Building2, Camera, Lock, FileText, DollarSign, Info
} from "lucide-react";
import { Routes, Route, useNavigate, useParams, useLocation, useSearchParams, Link } from "react-router-dom";
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
const LISTING_COLUMNS = "id,year,make,model,trim,price,mileage,city,state,fuel,trans,color,seller,verified,featured,body,condition,loan_status,loan_balance,damage_points,issues,description,phone,photos,created_at,status,price_updated_at,sold_at,source";

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
// Plain client-side CSV export — no library needed for something this
// simple. Wraps any field containing a comma/quote/newline in quotes,
// doubling internal quotes, which is the actual CSV escaping rule.
// Compresses a photo before it ever leaves the browser — real storage means
// real bandwidth and quota now, not just a throwaway blob URL. Resizes to a
// reasonable max width and re-encodes as JPEG; a typical phone photo goes
// from several MB down to a few hundred KB with no visible quality loss at
// the sizes this site actually displays images.
function compressImage(file, maxWidth = 1600, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Couldn't read the file"));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Couldn't read the image"));
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => { if (blob) resolve(blob); else reject(new Error("Compression failed")); }, "image/jpeg", quality);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function downloadCSV(filename, rows, columns) {
  const escape = (val) => {
    const s = val === null || val === undefined ? "" : String(val);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = columns.map((c) => escape(c.label)).join(",");
  const body = rows.map((row) => columns.map((c) => escape(typeof c.value === "function" ? c.value(row) : row[c.value])).join(",")).join("\n");
  const blob = new Blob([header + "\n" + body], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function captureAttribution() {
  try {
    const params = new URLSearchParams(window.location.search);
    const src = params.get("src");
    if (src) {
      const isNew = sessionStorage.getItem("hl_src") !== src;
      sessionStorage.setItem("hl_src", src);
      // A real per-visit id, only generated for QR-tagged sessions — this is
      // what lets admin group one anonymous visitor's actions together
      // (their valuation, their quiz result, what they browsed) without
      // ever tying it to a name or contact info.
      if (!sessionStorage.getItem("hl_session_id")) {
        const id = (crypto && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        sessionStorage.setItem("hl_session_id", id);
      }
      return { src, isNew };
    }
    return { src: sessionStorage.getItem("hl_src") || null, isNew: false };
  } catch { return { src: null, isNew: false }; }
}
// For attaching attribution to a real database row (valuations, quiz
// responses, listings) at the moment it's submitted — separate from the
// event-logging path below, since these go into their own tables, not events.
function getAttribution() {
  try {
    return { source: sessionStorage.getItem("hl_src") || null, session_id: sessionStorage.getItem("hl_session_id") || null };
  } catch { return { source: null, session_id: null }; }
}

function useAnalytics() {
  const log = (type, payload = {}) => {
    let src = null, sessionId = null;
    try { src = sessionStorage.getItem("hl_src"); sessionId = sessionStorage.getItem("hl_session_id"); } catch {}
    const extra = {};
    if (src) extra.src = src;
    if (sessionId) extra.session_id = sessionId;
    supabase.from("events").insert({ type, payload: Object.keys(extra).length ? { ...payload, ...extra } : payload }).then(({ error }) => {
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

// Homepage subfeed, not its own page — social proof for a first-time
// visitor without exposing real sale volume. Never shows sold_price (it's
// private, and this component never even receives it — the data passed in
// only ever has public fields). Capped upstream at 10, always, regardless
// of how many cars have actually sold.
function RecentlySold({ listings, onOpen }) {
  if (!listings || listings.length === 0) return null;
  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", padding: "24px 20px 0" }}>
      <div style={{ fontFamily: FONT_HEAD, fontSize: 14, color: C.steel, letterSpacing: 0.5, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
        <Check size={14} color={C.green} /> RECENTLY SOLD
      </div>
      <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 4 }}>
        {listings.map((c) => (
          <div key={c.id} onClick={() => onOpen(c.id)} style={{ cursor: "pointer", border: `1.5px solid ${C.line}`, borderRadius: 6, overflow: "hidden", background: "#fff", flex: "0 0 180px", opacity: 0.9 }}>
            <div style={{ position: "relative" }}>
              {c.photos && c.photos.length ? (
                <img src={c.photos[0]} alt={`${c.year} ${c.make} ${c.model}`} style={{ width: "100%", height: 110, objectFit: "cover", display: "block", filter: "grayscale(30%)" }} />
              ) : (
                <CarThumb make={c.make} body={c.body} />
              )}
              <div style={{ position: "absolute", top: 6, left: 6, background: C.ink, color: "#fff", fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 3 }}>SOLD</div>
            </div>
            <div style={{ padding: "8px 10px" }}>
              <div style={{ fontFamily: FONT_HEAD, fontSize: 13, color: C.ink }}>{c.year} {c.make} {c.model}</div>
              <div style={{ fontSize: 11, color: C.steel, marginTop: 2 }}>{c.city}, {stateAbbr(c.state)} · {timeAgo(c.sold_at)}</div>
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
function Home({ allListings, recentlySold, log, openListing }) {
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
      <RecentlySold listings={recentlySold} onOpen={openListing} />
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
    supabase.from("listings").select(LISTING_COLUMNS).eq("id", id).is("deleted_at", null).single().then(({ data, error }) => {
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
  const location = useLocation();
  const prefill = location.state?.prefill;
  const [form, setForm] = useState({ year:"", make:"", model:"", trim:"", price:"", mileage:"", city:"", state:"", fuel:"Gas", trans:"Automatic", color:"", seller:"Private", body:"", condition:"Good", loan_status:"Paid off", loan_balance:"", desc:"", phone:"", ...prefill });
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

  const [photoError, setPhotoError] = useState(null);
  const addPhotos = async (fileList) => {
    setPhotoError(null);
    const files = Array.from(fileList).slice(0, 8 - photos.length);
    try {
      const compressed = await Promise.all(files.map(async (f) => {
        const blob = await compressImage(f);
        return { blob, previewUrl: URL.createObjectURL(blob) };
      }));
      setPhotos((prev) => [...prev, ...compressed]);
    } catch (err) {
      setPhotoError("One of those photos couldn't be processed — try a different file.");
    }
  };
  const removePhoto = (i) => {
    URL.revokeObjectURL(photos[i].previewUrl);
    setPhotos(photos.filter((_, idx) => idx !== i));
  };

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

    // Real upload, not a throwaway blob URL — this is what actually fixes
    // photos disappearing on reload. If any single upload fails, stop and
    // say so on screen rather than publishing a listing with some photos
    // silently missing.
    const photoUrls = [];
    for (const p of photos) {
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.jpg`;
      const { error: uploadError } = await supabase.storage.from("listing-photos").upload(path, p.blob, { contentType: "image/jpeg" });
      if (uploadError) {
        setSubmitting(false);
        setSubmitError(`Photo upload failed: ${uploadError.message}`);
        return;
      }
      const { data: urlData } = supabase.storage.from("listing-photos").getPublicUrl(path);
      photoUrls.push(urlData.publicUrl);
    }

    const errMsg = await onSubmit({ ...form, year: Number(form.year), price: Number(form.price), mileage: Number(form.mileage), loan_balance: form.loan_status === "Still financed (loan payoff needed)" && form.loan_balance ? Number(form.loan_balance) : null, verified: false, featured: false, photos: photoUrls, issues, desc: form.desc || "No additional description provided." });
    setSubmitting(false);
    if (errMsg) setSubmitError(errMsg);
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "36px 20px 70px" }}>
      <Link to="/" style={{ display: "inline-flex", alignItems: "center", gap: 4, color: C.steel, fontSize: 13.5, marginBottom: 12, textDecoration: "none" }}><ChevronLeft size={15} /> Cancel</Link>
      <h2 style={{ fontFamily: FONT_HEAD, fontSize: 28, color: C.ink, margin: "0 0 4px" }}>Post your car</h2>
      <p style={{ color: C.steel, fontSize: 14, marginBottom: 24 }}>Listings are visible across the United States. Fields marked required.</p>
      {prefill && (
        <div style={{ background: C.greenBg, color: C.green, fontSize: 12.5, padding: "8px 12px", borderRadius: 6, marginBottom: 18 }}>
          Carried over from your Value My Car estimate — double-check everything before posting.
        </div>
      )}

      <input
        type="text" name="company_website" value={honeypot} onChange={(e) => setHoneypot(e.target.value)}
        tabIndex={-1} autoComplete="off" aria-hidden="true"
        style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
      />

      <Field label="Photos" required error={errors.photos}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
          {photos.map((p, i) => (
            <div key={i} style={{ position: "relative", width: 84, height: 84 }}>
              <img src={p.previewUrl} alt="" style={{ width: 84, height: 84, objectFit: "cover", borderRadius: 4, border: `1px solid ${C.line}` }} />
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
        {photoError && <div style={{ fontSize: 12, color: "#A32D2D", marginBottom: 6 }}>{photoError}</div>}
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
function IssuesGate({ issues, onChange, context = "listing" }) {
  const [mode, setMode] = useState(null); // null | "none" | "some"
  const introText = context === "valuation"
    ? "Optional — but honest detail here gets you a more accurate estimate."
    : "Optional — but honest detail here builds more buyer trust than leaving it blank.";

  if (mode === null) {
    return (
      <div style={{ background: "#F4F2EA", border: `1px solid ${C.line}`, borderRadius: 8, padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <div style={{ width: 4, height: 20, background: C.yellow, borderRadius: 2 }} />
          <div style={{ fontFamily: FONT_HEAD, fontSize: 16, color: C.ink }}>Any known issues?</div>
        </div>
        <p style={{ fontSize: 13, color: C.steel, marginBottom: 14 }}>{introText}</p>
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
  const navigate = useNavigate();
  const [form, setForm] = useState({ year: "", make: "", model: "", mileage: "", condition: "Good", originalPrice: "", body: "Sedan", state: "", loan_status: "Paid off", loan_balance: "" });
  const [issues, setIssues] = useState({});
  const [result, setResult] = useState(null);
  const [saveError, setSaveError] = useState(null);
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
    const { regionalMultiplier: _rm, ...inputForDb } = input; // regionalMultiplier is calculation-only, no matching column
    supabase.from("valuations").insert({ ...inputForDb, estimate: res.estimate, confidence: res.confidence, issues, body: form.body, loan_status: form.loan_status, loan_balance: loanBalance, state: form.state, ...getAttribution() }).then(({ error }) => {
      if (error) { console.error("valuation save failed:", error.message); setSaveError(error.message); }
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
        <IssuesGate issues={issues} onChange={setIssues} context="valuation" />
      </div>

      <button onClick={submit} style={{ marginTop: 20, background: C.yellow, color: C.ink, border: "none", borderRadius: 4, padding: "13px 26px", fontFamily: FONT_HEAD, fontSize: 15, cursor: "pointer" }}>Get my estimate</button>

      {result && (
        <div style={{ marginTop: 28, border: `1px solid ${C.line}`, borderRadius: 8, padding: 24, textAlign: "center" }}>
          {saveError && (
            <div style={{ background: "#FBE4E3", color: "#A32D2D", fontSize: 12, padding: "8px 12px", borderRadius: 6, marginBottom: 14, textAlign: "left" }}>
              Your estimate above is accurate, but this submission couldn't be saved on our end ({saveError}).
            </div>
          )}
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

          <button onClick={() => navigate("/post", { state: { prefill: {
            year: String(form.year), make: form.make, model: form.model, mileage: String(form.mileage),
            condition: form.condition, body: form.body, state: form.state,
            loan_status: form.loan_status, loan_balance: form.loan_balance,
            price: result ? String(result.estimate) : "",
          } } })} style={{ marginTop: 16, background: "transparent", border: `1px solid ${C.line}`, borderRadius: 4, padding: "10px 20px", fontFamily: FONT_HEAD, cursor: "pointer", color: C.ink }}>List this car</button>
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
      const { data, error } = await supabase.from("listings").select(LISTING_COLUMNS).eq("id", idParam).is("deleted_at", null).single();
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
      const { data } = await supabase.from("listings").select(LISTING_COLUMNS).eq("id", idParam).is("deleted_at", null).single();
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
// The "signifier" — a small tag showing which flyer/QR source a listing,
// quiz, or valuation came from. Renders nothing for organic traffic.
function SourceBadge({ source }) {
  if (!source) return null;
  return <span style={{ fontSize: 9.5, background: C.yellow, color: C.ink, padding: "1px 6px", borderRadius: 10, marginLeft: 6, fontWeight: 600, whiteSpace: "nowrap", display: "inline-block" }}>{source}</span>;
}
// Simple, clean vertical bar chart — no charting library, just styled divs.
// Used in the QR Results scroll-carousel.
function MiniBarChart({ title, data }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div style={{ minWidth: 260, maxWidth: 260, scrollSnapAlign: "start", background: "#fff", border: `1px solid ${C.line}`, borderRadius: 8, padding: 16, flexShrink: 0 }}>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: C.ink, marginBottom: 14 }}>{title}</div>
      {data.length === 0 ? <div style={{ fontSize: 12, color: C.steel }}>No data yet.</div> : (
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 140 }}>
          {data.map((d) => (
            <div key={d.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.ink, marginBottom: 4 }}>{d.value}</div>
              <div style={{ width: "100%", maxWidth: 36, height: `${Math.max(4, (d.value / max) * 100)}px`, background: C.yellow, borderRadius: "3px 3px 0 0" }} />
              <div style={{ fontSize: 9.5, color: C.steel, marginTop: 6, textAlign: "center", lineHeight: 1.2 }}>{d.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Real US state geometry (react-us-state-map, MIT/CC-BY-SA) — not a
// hand-drawn shape, so none of the risk that made the car icon hard. Each
// state gets colored via CSS targeting its two-letter class, which the
// package applies automatically; a hovered state's name+status shows in a
// small fixed label since the underlying SVG has no built-in tooltip.
const US_STATE_PATHS = {
  AK: "M161.1,453.7 l-0.3,85.4 1.6,1 3.1,0.2 1.5,-1.1 h2.6 l0.2,2.9 7,6.8 0.5,2.6 3.4,-1.9 0.6,-0.2 0.3,-3.1 1.5,-1.6 1.1,-0.2 1.9,-1.5 3.1,2.1 0.6,2.9 1.9,1.1 1.1,2.4 3.9,1.8 3.4,6 2.7,3.9 2.3,2.7 1.5,3.7 5,1.8 5.2,2.1 1,4.4 0.5,3.1 -1,3.4 -1.8,2.3 -1.6,-0.8 -1.5,-3.1 -2.7,-1.5 -1.8,-1.1 -0.8,0.8 1.5,2.7 0.2,3.7 -1.1,0.5 -1.9,-1.9 -2.1,-1.3 0.5,1.6 1.3,1.8 -0.8,0.8 c0,0 -0.8,-0.3 -1.3,-1 -0.5,-0.6 -2.1,-3.4 -2.1,-3.4 l-1,-2.3 c0,0 -0.3,1.3 -1,1 -0.6,-0.3 -1.3,-1.5 -1.3,-1.5 l1.8,-1.9 -1.5,-1.5 v-5 h-0.8 l-0.8,3.4 -1.1,0.5 -1,-3.7 -0.6,-3.7 -0.8,-0.5 0.3,5.7 v1.1 l-1.5,-1.3 -3.6,-6 -2.1,-0.5 -0.6,-3.7 -1.6,-2.9 -1.6,-1.1 v-2.3 l2.1,-1.3 -0.5,-0.3 -2.6,0.6 -3.4,-2.4 -2.6,-2.9 -4.8,-2.6 -4,-2.6 1.3,-3.2 v-1.6 l-1.8,1.6 -2.9,1.1 -3.7,-1.1 -5.7,-2.4 h-5.5 l-0.6,0.5 -6.5,-3.9 -2.1,-0.3 -2.7,-5.8 -3.6,0.3 -3.6,1.5 0.5,4.5 1.1,-2.9 1,0.3 -1.5,4.4 3.2,-2.7 0.6,1.6 -3.9,4.4 -1.3,-0.3 -0.5,-1.9 -1.3,-0.8 -1.3,1.1 -2.7,-1.8 -3.1,2.1 -1.8,2.1 -3.4,2.1 -4.7,-0.2 -0.5,-2.1 3.7,-0.6 v-1.3 l-2.3,-0.6 1,-2.4 2.3,-3.9 v-1.8 l0.2,-0.8 4.4,-2.3 1,1.3 h2.7 l-1.3,-2.6 -3.7,-0.3 -5,2.7 -2.4,3.4 -1.8,2.6 -1.1,2.3 -4.2,1.5 -3.1,2.6 -0.3,1.6 2.3,1 0.8,2.1 -2.7,3.2 -6.5,4.2 -7.8,4.2 -2.1,1.1 -5.3,1.1 -5.3,2.3 1.8,1.3 -1.5,1.5 -0.5,1.1 -2.7,-1 -3.2,0.2 -0.8,2.3 h-1 l0.3,-2.4 -3.6,1.3 -2.9,1 -3.4,-1.3 -2.9,1.9 h-3.2 l-2.1,1.3 -1.6,0.8 -2.1,-0.3 -2.6,-1.1 -2.3,0.6 -1,1 -1.6,-1.1 v-1.9 l3.1,-1.3 6.3,0.6 4.4,-1.6 2.1,-2.1 2.9,-0.6 1.8,-0.8 2.7,0.2 1.6,1.3 1,-0.3 2.3,-2.7 3.1,-1 3.4,-0.6 1.3,-0.3 0.6,0.5 h0.8 l1.3,-3.7 4,-1.5 1.9,-3.7 2.3,-4.5 1.6,-1.5 0.3,-2.6 -1.6,1.3 -3.4,0.6 -0.6,-2.4 -1.3,-0.3 -1,1 -0.2,2.9 -1.5,-0.2 -1.5,-5.8 -1.3,1.3 -1.1,-0.5 -0.3,-1.9 -4,0.2 -2.1,1.1 -2.6,-0.3 1.5,-1.5 0.5,-2.6 -0.6,-1.9 1.5,-1 1.3,-0.2 -0.6,-1.8 v-4.4 l-1,-1 -0.8,1.5 h-6.1 l-1.5,-1.3 -0.6,-3.9 -2.1,-3.6 v-1 l2.1,-0.8 0.2,-2.1 1.1,-1.1 -0.8,-0.5 -1.3,0.5 -1.1,-2.7 1,-5 4.5,-3.2 2.6,-1.6 1.9,-3.7 2.7,-1.3 2.6,1.1 0.3,2.4 2.4,-0.3 3.2,-2.4 1.6,0.6 1,0.6 h1.6 l2.3,-1.3 0.8,-4.4 c0,0 0.3,-2.9 1,-3.4 0.6,-0.5 1,-1 1,-1 l-1.1,-1.9 -2.6,0.8 -3.2,0.8 -1.9,-0.5 -3.6,-1.8 -5,-0.2 -3.6,-3.7 0.5,-3.9 0.6,-2.4 -2.1,-1.8 -1.9,-3.7 0.5,-0.8 6.8,-0.5 h2.1 l1,1 h0.6 l-0.2,-1.6 3.9,-0.6 2.6,0.3 1.5,1.1 -1.5,2.1 -0.5,1.5 2.7,1.6 5,1.8 1.8,-1 -2.3,-4.4 -1,-3.2 1,-0.8 -3.4,-1.9 -0.5,-1.1 0.5,-1.6 -0.8,-3.9 -2.9,-4.7 -2.4,-4.2 2.9,-1.9 h3.2 l1.8,0.6 4.2,-0.2 3.7,-3.6 1.1,-3.1 3.7,-2.4 1.6,1 2.7,-0.6 3.7,-2.1 1.1,-0.2 1,0.8 4.5,-0.2 2.7,-3.1 h1.1 l3.6,2.4 1.9,2.1 -0.5,1.1 0.6,1.1 1.6,-1.6 3.9,0.3 0.3,3.7 1.9,1.5 7.1,0.6 6.3,4.2 1.5,-1 5.2,2.6 2.1,-0.6 1.9,-0.8 4.8,1.9z m-115.1,28.9 2.1,5.3 -0.2,1 -2.9,-0.3 -1.8,-4 -1.8,-1.5 h-2.4 l-0.2,-2.6 1.8,-2.4 1.1,2.4 1.5,1.5z m-2.6,33.5 3.7,0.8 3.7,1 0.8,1 -1.6,3.7 -3.1,-0.2 -3.4,-3.6z m-20.7,-14.1 1.1,2.6 1.1,1.6 -1.1,0.8 -2.1,-3.1 v-1.9z m-13.7,73.1 3.4,-2.3 3.4,-1 2.6,0.3 0.5,1.6 1.9,0.5 1.9,-1.9 -0.3,-1.6 2.7,-0.6 2.9,2.6 -1.1,1.8 -4.4,1.1 -2.7,-0.5 -3.7,-1.1 -4.4,1.5 -1.6,0.3z m48.9,-4.5 1.6,1.9 2.1,-1.6 -1.5,-1.3z m2.9,3 1.1,-2.3 2.1,0.3 -0.8,1.9 h-2.4z m23.6,-1.9 1.5,1.8 1,-1.1 -0.8,-1.9z m8.8,-12.5 1.1,5.8 2.9,0.8 5,-2.9 4.4,-2.6 -1.6,-2.4 0.5,-2.4 -2.1,1.3 -2.9,-0.8 1.6,-1.1 1.9,0.8 3.9,-1.8 0.5,-1.5 -2.4,-0.8 0.8,-1.9 -2.7,1.9 -4.7,3.6 -4.8,2.9z m42.3,-19.8 2.4,-1.5 -1,-1.8 -1.8,1z",
  HI: "M233.1,519.3 l1.9,-3.6 2.3,-0.3 0.3,0.8 -2.1,3.1z m10.2,-3.7 6.1,2.6 2.1,-0.3 1.6,-3.9 -0.6,-3.4 -4.2,-0.5 -4,1.8z m30.7,10 3.7,5.5 2.4,-0.3 1.1,-0.5 1.5,1.3 3.7,-0.2 1,-1.5 -2.9,-1.8 -1.9,-3.7 -2.1,-3.6 -5.8,2.9z m20.2,8.9 1.3,-1.9 4.7,1 0.6,-0.5 6.1,0.6 -0.3,1.3 -2.6,1.5 -4.4,-0.3z m5.3,5.2 1.9,3.9 3.1,-1.1 0.3,-1.6 -1.6,-2.1 -3.7,-0.3z m7,-1.2 2.3,-2.9 4.7,2.4 4.4,1.1 4.4,2.7 v1.9 l-3.6,1.8 -4.8,1 -2.4,-1.5z m16.6,15.6 1.6,-1.3 3.4,1.6 7.6,3.6 3.4,2.1 1.6,2.4 1.9,4.4 4,2.6 -0.3,1.3 -3.9,3.2 -4.2,1.5 -1.5,-0.6 -3.1,1.8 -2.4,3.2 -2.3,2.9 -1.8,-0.2 -3.6,-2.6 -0.3,-4.5 0.6,-2.4 -1.6,-5.7 -2.1,-1.8 -0.2,-2.6 2.3,-1 2.1,-3.1 0.5,-1 -1.6,-1.8z",
  AL: "M628.5,466.4 l0.6,0.2 1.3,-2.7 1.5,-4.4 2.3,0.6 3.1,6 v1 l-2.7,1.9 2.7,0.3 5.2,-2.5 -0.3,-7.6 -2.5,-1.8 -2,-2 0.4,-4 10.5,-1.5 25.7,-2.9 6.7,-0.6 5.6,0.1 -0.5,-2.2 -1.5,-0.8 -0.9,-1.1 1,-2.6 -0.4,-5.2 -1.6,-4.5 0.8,-5.1 1.7,-4.8 -0.2,-1.7 -1.8,-0.7 -0.5,-3.6 -2.7,-3.4 -2,-6.5 -1.4,-6.7 -1.8,-5 -3.8,-16 -3.5,-7.9 -0.8,-5.6 0.1,-2.2 -9,0.8 -23.4,2.2 -12.2,0.8 -0.2,6.4 0.2,16.7 -0.7,31 -0.3,14.1 2.8,18.8 1.6,14.7z",
  AR: "M587.3,346.1 l-6.4,-0.7 0.9,-3.1 3.1,-2.6 0.6,-2.3 -1.8,-2.9 -31.9,1.2 -23.3,0.7 -23.6,0.3 1.5,6.9 0.1,8.5 1.4,10.9 0.3,38.2 2.1,1.6 3,-1.2 2.9,1.2 0.4,10.1 25.2,-0.2 26.8,-0.8 0.9,-1.9 -0.3,-3.8 -1.7,-3.1 1.5,-1.4 -1.4,-2.2 0.7,-2.4 1.1,-5.9 2.7,-2.3 -0.8,-2.2 4,-5.6 2.5,-1.1 -0.1,-1.7 -0.5,-1.7 2.9,-5.8 2.5,-1.1 0.2,-3.3 2.1,-1.4 0.9,-4.1 -1.4,-4 4.2,-2.4 0.3,-2.1 1.2,-4.2 0.9,-3.1z",
  AZ: "M135.1,389.7 l-0.3,1.5 0.5,1 18.9,10.7 12.1,7.6 14.7,8.6 16.8,10 12.3,2.4 25.4,2.7 6,-39.6 7,-53.1 4.4,-31 -24.6,-3.6 -60.7,-11 -0.2,1.1 -2.6,16.5 -2.1,3.8 -2.8,-0.2 -1.2,-2.6 -2.6,-0.4 -1.2,-1.1 -1.1,0.1 -2.1,1.7 -0.3,6.8 -0.3,1.5 -0.5,12.5 -1.5,2.4 -0.4,3.3 2.8,5 1.1,5.5 0.7,1.1 1.1,0.9 -0.4,2.4 -1.7,1.2 -3.4,1.6 -1.6,1.8 -1.6,3.6 -0.5,4.9 -3,2.9 -1.9,0.9 -0.1,5.8 -0.6,1.6 0.5,0.8 3.9,0.4 -0.9,3 -1.7,2.4 -3.7,0.4z",
  CA: "M122.7,385.9 l-19.7,-2.7 -10,-1.5 -0.5,-1.8 v-9.4 l-0.3,-3.2 -2.6,-4.2 -0.8,-2.3 -3.9,-4.2 -2.9,-4.7 -2.7,-0.2 -3.2,-0.8 -0.3,-1 1.5,-0.6 -0.6,-3.2 -1.5,-2.1 -4.8,-0.8 -3.9,-2.1 -1.1,-2.3 -2.6,-4.8 -2.9,-3.1 h-2.9 l-3.9,-2.1 -4.5,-1.8 -4.2,-0.5 -2.4,-2.7 0.5,-1.9 1.8,-7.1 0.8,-1.9 v-2.4 l-1.6,-1 -0.5,-2.9 -1.5,-2.6 -3.4,-5.8 -1.3,-3.1 -1.5,-4.7 -1.6,-5.3 -3.2,-4.4 -0.5,-2.9 0.8,-3.9 h1.1 l2.1,-1.6 1.1,-3.6 -1,-2.7 -2.7,-0.5 -1.9,-2.6 -2.1,-3.7 -0.2,-8.2 0.6,-1.9 0.6,-2.3 0.5,-2.4 -5.7,-6.3 v-2.1 l0.3,-0.5 0.3,-3.2 -1.3,-4 -2.3,-4.8 -2.7,-4.5 -1.8,-3.9 1,-3.7 0.6,-5.8 1.8,-3.1 0.3,-6.5 -1.1,-3.6 -1.6,-4.2 -2.7,-4.2 0.8,-3.2 1.5,-4.2 1.8,-0.8 0.3,-1.1 3.1,-2.6 5.2,-11.8 0.2,-7.4 1.69,-4.9 38.69,11.8 25.6,6.6 -8,31.3 -8.67,33.1 12.63,19.2 42.16,62.3 17.1,26.1 -0.4,3.1 2.8,5.2 1.1,5.4 1,1.5 0.7,0.6 -0.2,1.4 -1.4,1 -3.4,1.6 -1.9,2.1 -1.7,3.9 -0.5,4.7 -2.6,2.5 -2.3,1.1 -0.1,6.2 -0.6,1.9 1,1.7 3,0.3 -0.4,1.6 -1.4,2 -3.9,0.6z m-73.9,-48.9 1.3,1.5 -0.2,1.3 -3.2,-0.1 -0.6,-1.2 -0.6,-1.5z m1.9,0 1.2,-0.6 3.6,2.1 3.1,1.2 -0.9,0.6 -4.5,-0.2 -1.6,-1.6z m20.7,19.8 1.8,2.3 0.8,1 1.5,0.6 0.6,-1.5 -1,-1.8 -2.7,-2 -1.1,0.2 v1.2z m-1.4,8.7 1.8,3.2 1.2,1.9 -1.5,0.2 -1.3,-1.2 c0,0 -0.7,-1.5 -0.7,-1.9 0,-0.4 0,-2.2 0,-2.2z",
  CO: "M380.2,235.5 l-36,-3.5 -79.1,-8.6 -2.2,22.1 -7,50.4 -1.9,13.7 34,3.9 37.5,4.4 34.7,3 14.3,0.6z",
  CT: "M852,190.9 l3.6,-3.2 1.9,-2.1 0.8,0.6 2.7,-1.5 5.2,-1.1 7,-3.5 -0.6,-4.2 -0.8,-4.4 -1.6,-6 -4.3,1.1 -21.8,4.7 0.6,3.1 1.5,7.3 v8.3 l-0.9,2.1 1.7,2.2z",
  DE: "M834.4,247.2 l-1,0.5 -3.6,-2.4 -1.8,-4.7 -1.9,-3.6 -2.3,-1 -2.1,-3.6 0.5,-2 0.5,-2.3 0.1,-1.1 -0.6,0.1 -1.7,1 -2,1.7 -0.2,0.3 1.4,4.1 2.3,5.6 3.7,16.1 5,-0.3 6,-1.1z",
  FL: "M750.2,445.2 l-5.2,-0.7 -0.7,0.8 1.5,4.4 -0.4,5.2 -4.1,-1 -0.2,-2.8 h-4.1 l-5.3,0.7 -32.4,1.9 -8.2,-0.3 -1.7,-1.7 -2.5,-4.2 h-5.9 l-6.6,0.5 -35.4,4.2 -0.3,2.8 1.6,1.6 2.9,2 0.3,8.4 3.3,-0.6 6,-2.1 6,-0.5 4.4,-0.6 7.6,1.8 8.1,3.9 1.6,1.5 2.9,1.1 1.6,1.9 0.3,2.7 3.2,-1.3 h3.9 l3.6,-1.9 3.7,-3.6 3.1,0.2 0.5,-1.1 -0.8,-1 0.2,-1.9 4,-0.8 h2.6 l2.9,1.5 4.2,1.5 2.4,3.7 2.7,1 1.1,3.4 3.4,1.6 1.6,2.6 1.9,0.6 5.2,1.3 1.3,3.1 3,3.7 v9.5 l-1.5,4.7 0.3,2.7 1.3,4.8 1.8,4 0.8,-0.5 1.5,-4.5 -2.6,-1 -0.3,-0.6 1.6,-0.6 4.5,1 0.2,1.6 -3.2,5.5 -2.1,2.4 3.6,3.7 2.6,3.1 2.9,5.3 2.9,3.9 2.1,5 1.8,0.3 1.6,-2.1 1.8,1.1 2.6,4 0.6,3.6 3.1,4.4 0.8,-1.3 3.9,0.3 3.6,2.3 3.4,5.2 0.8,3.4 0.3,2.9 1.1,1 1.3,0.5 2.4,-1 1.5,-1.6 3.9,-0.2 3.1,-1.5 2.7,-3.2 -0.5,-1.9 -0.3,-2.4 0.6,-1.9 -0.3,-1.9 2.4,-1.3 0.3,-3.4 -0.6,-1.8 -0.5,-12 -1.3,-7.6 -4.5,-8.2 -3.6,-5.8 -2.6,-5.3 -2.9,-2.9 -2.9,-7.4 0.7,-1.4 1.1,-1.3 -1.6,-2.9 -4,-3.7 -4.8,-5.5 -3.7,-6.3 -5.3,-9.4 -3.7,-9.7 -2.3,-7.3z m17.7,132.7 2.4,-0.6 1.3,-0.2 1.5,-2.3 2.3,-1.6 1.3,0.5 1.7,0.3 0.4,1.1 -3.5,1.2 -4.2,1.5 -2.3,1.2z m13.5,-5 1.2,1.1 2.7,-2.1 5.3,-4.2 3.7,-3.9 2.5,-6.6 1,-1.7 0.2,-3.4 -0.7,0.5 -1,2.8 -1.5,4.6 -3.2,5.3 -4.4,4.2 -3.4,1.9z",
  GA: "M750.2,444.2 l-5.6,-0.7 -1.4,1.6 1.6,4.7 -0.3,3.9 -2.2,-0.6 -0.2,-3 h-5.2 l-5.3,0.7 -32.3,1.9 -7.7,-0.3 -1.4,-1.2 -2.5,-4.3 -0.8,-3.3 -1.6,-0.9 -0.5,-0.5 0.9,-2.2 -0.4,-5.5 -1.6,-4.5 0.8,-4.9 1.7,-4.8 -0.2,-2.5 -1.9,-0.7 -0.4,-3.2 -2.8,-3.5 -1.9,-6.2 -1.5,-7 -1.7,-4.8 -3.8,-16 -3.5,-8 -0.8,-5.3 0.1,-2.3 3.3,-0.3 13.6,-1.6 18.6,-2 6.3,-1.1 0.5,1.4 -2.2,0.9 -0.9,2.2 0.4,2 1.4,1.6 4.3,2.7 3.2,-0.1 3.2,4.7 0.6,1.6 2.3,2.8 0.5,1.7 4.7,1.8 3,2.2 2.3,3 2.3,1.3 2,1.8 1.4,2.7 2.1,1.9 4.1,1.8 2.7,6 1.7,5.1 2.8,0.7 2.1,1.9 2,5.7 2.9,1.6 1.7,-0.8 0.4,1.2 -3.3,6.2 0.5,2.6 -1.5,4.2 -2.3,10 0.8,6.3z",
  IA: "M556.8,183.6 l2.1,2.1 0.3,0.7 -2,3 0.3,4 2.6,4.1 3.1,1.6 2.4,0.3 0.9,1.8 0.2,2.4 2.5,1 0.9,1.1 0.5,1.6 3.8,3.3 0.6,1.9 -0.7,3 -1.7,3.7 -0.6,2.4 -2.1,1.6 -1.6,0.5 -5.7,1.5 -1.6,4.8 0.8,1.8 1.7,1.5 -0.2,3.5 -1.9,1.4 -0.7,1.8 v2.4 l-1.4,0.4 -1.7,1.4 -0.5,1.7 0.4,1.7 -1.3,1 -2.3,-2.7 -1.4,-2.8 -8.3,0.8 -10,0.6 -49.2,1.2 -1.6,-4.3 -0.4,-6.7 -1.4,-4.2 -0.7,-5.2 -2.2,-3.7 -1,-4.6 -2.7,-7.8 -1.1,-5.6 -1.4,-1.9 -1.3,-2.9 1.7,-3.8 1.2,-6.1 -2.7,-2.2 -0.3,-2.4 0.7,-2.4 1.8,-0.3 61.1,-0.6 21.2,-0.7z",
  ID: "M175.3,27.63 l-4.8,17.41 -4.5,20.86 -3.4,16.22 -0.4,9.67 1.2,4.44 3.5,2.66 -0.2,3.91 -3.9,4.4 -4.5,6.6 -0.9,2.9 -1.2,1.1 -1.8,0.8 -4.3,5.3 -0.4,3.1 -0.4,1.1 0.6,1 2.6,-0.1 1.1,2.3 -2.4,5.8 -1.2,4.2 -8.8,35.3 20.7,4.5 39.5,7.9 34.8,6.1 4.9,-29.2 3.8,-24.1 -2.7,-2.4 -0.4,-2.6 -0.8,-1.1 -2.1,1 -0.7,2.6 -3.2,0.5 -3.9,-1.6 -3.8,0.1 -2.5,0.7 -3.4,-1.5 -2.4,0.2 -2.4,2 -2,-1.1 -0.7,-4 0.7,-2.9 -2.5,-2.9 -3.3,-2.6 -2.7,-13.1 -0.1,-4.7 -0.3,-0.1 -0.2,0.4 -5.1,3.5 -1.7,-0.2 -2.9,-3.4 -0.2,-3.1 7,-17.13 -0.4,-1.94 -3.4,-1.15 -0.6,-1.18 -2.6,-3.46 -4.6,-10.23 -3.2,-1.53 -2,-4.95 1.3,-4.63 -3.2,-7.58 4.4,-21.52z",
  IL: "M618.7,214.3 l-0.8,-2.6 -1.3,-3.7 -1.6,-1.8 -1.5,-2.6 -0.4,-5.5 -15.9,1.8 -17.4,1 h-12.3 l0.2,2.1 2.2,0.9 1.1,1.4 0.4,1.4 3.9,3.4 0.7,2.4 -0.7,3.3 -1.7,3.7 -0.8,2.7 -2.4,1.9 -1.9,0.6 -5.2,1.3 -1.3,4.1 0.6,1.1 1.9,1.8 -0.2,4.3 -2.1,1.6 -0.5,1.3 v2.8 l-1.8,0.6 -1.4,1.2 -0.4,1.2 0.4,2 -1.6,1.3 -0.9,2.8 0.3,3.9 2.3,7 7,7.6 5.7,3.7 v4.4 l0.7,1.2 6.6,0.6 2.7,1.4 -0.7,3.5 -2.2,6.2 -0.8,3 2,3.7 6.4,5.3 4.8,0.8 2.2,5.1 2,3.4 -0.9,2.8 1.5,3.8 1.7,2.1 1.6,-0.3 1,-2.2 2.4,-1.7 2.8,-1 6.1,2.5 0.5,-0.2 v-1.1 l-1.2,-2.7 0.4,-2.8 2.4,-1.6 3.4,-1.2 -0.5,-1.3 -0.8,-2 1.2,-1.3 1,-2.7 v-4 l0.4,-4.9 2.5,-3 1.8,-3.8 2.5,-4 -0.5,-5.3 -1.8,-3.2 -0.3,-3.3 0.8,-5.3 -0.7,-7.2 -1.1,-15.8 -1.4,-15.3 -0.9,-11.7z",
  IN: "M622.9,216.1 l1.5,1 1.1,-0.3 2.1,-1.9 2.5,-1.8 14.3,-1.1 18.4,-1.8 1.6,15.5 4.9,42.6 -0.6,2.9 1.3,1.6 0.2,1.3 -2.3,1.6 -3.6,1.7 -3.2,0.4 -0.5,4.8 -4.7,3.6 -2.9,4 0.2,2.4 -0.5,1.4 h-3.5 l-1.4,-1.7 -5.2,3 0.2,3.1 -0.9,0.2 -0.5,-0.9 -2.4,-1.7 -3.6,1.5 -1.4,2.9 -1.2,-0.6 -1.6,-1.8 -4.4,0.5 -5.7,1 -2.5,1.3 v-2.6 l0.4,-4.7 2.3,-2.9 1.8,-3.9 2.7,-4.2 -0.5,-5.8 -1.8,-3.1 -0.3,-3.2 0.8,-5.3 -0.7,-7.1 -0.9,-12.6 -2.5,-30.1z",
  KS: "M485.9,259.5 l-43.8,-0.6 -40.6,-1.2 -21.7,-0.9 -4.3,64.8 24.3,1 44.7,2.1 46.3,0.6 12.6,-0.3 0.7,-35 -1.2,-11.1 -2.5,-2 -2.4,-3 -2.3,-3.6 0.6,-3 1.7,-1.4 v-2.1 l-0.8,-0.7 -2.6,-0.2 -3.5,-3.4z",
  KY: "M607.2,331.8 l12.6,-0.7 0.1,-4.1 h4.3 l30.4,-3.2 45.1,-4.3 5.6,-3.6 3.9,-2.1 0.1,-1.9 6,-7.8 4.1,-3.6 2.1,-2.4 -3.3,-2 -2.5,-2.7 -3,-3.8 -0.5,-2.2 -2.6,-1.4 -0.9,-1.9 -0.2,-6.1 -2.6,-2 -1.9,-1.1 -0.5,-2.3 -1.3,0.2 -2,1.2 -2.5,2.7 -1.9,-1.7 -2.5,-0.5 -2.4,1.4 h-2.3 l-1.8,-2 -5.6,-0.1 -1.8,-4.5 -2.9,-1.5 -2.1,0.8 -4.2,0.2 -0.5,2.1 1.2,1.5 0.3,2.1 -2.8,2 -3.8,1.8 -2.6,0.4 -0.5,4.5 -4.9,3.6 -2.6,3.7 0.2,2.2 -0.9,2.3 -4.5,-0.1 -1.3,-1.3 -3.9,2.2 0.2,3.3 -2.4,0.6 -0.8,-1.4 -1.7,-1.2 -2.7,1.1 -1.8,3.5 -2.2,-1 -1.4,-1.6 -3.7,0.4 -5.6,1 -2.8,1.3 -1.2,3.4 -1,1 1.5,3.7 -4.2,1.4 -1.9,1.4 -0.4,2.2 1.2,2.4 v2.2 l-1.6,0.4 -6.1,-2.5 -2.3,0.9 -2,1.4 -0.8,1.8 1.7,2.4 -0.9,1.8 -0.1,3.3 -2.4,1.3 -2.1,1.7z",
  LA: "M526.9,485.9 l8.1,-0.3 10.3,3.6 6.5,1.1 3.7,-1.5 3.2,1.1 3.2,1 0.8,-2.1 -3.2,-1.1 -2.6,0.5 -2.7,-1.6 0.8,-1.5 3.1,-1 1.8,1.5 1.8,-1 3.2,0.6 1.5,2.4 0.3,2.3 4.5,0.3 1.8,1.8 -0.8,1.6 -1.3,0.8 1.6,1.6 8.4,3.6 3.6,-1.3 1,-2.4 2.6,-0.6 1.8,-1.5 1.3,1 0.8,2.9 -2.3,0.8 0.6,0.6 3.4,-1.3 2.3,-3.4 0.8,-0.5 -2.1,-0.3 0.8,-1.6 -0.2,-1.5 2.1,-0.5 1.1,-1.3 0.6,0.8 0.6,3.1 4.2,0.6 4,1.9 1,1.5 h2.9 l1.1,1 2.3,-3.1 v-1.5 h-1.3 l-3.4,-2.7 -5.8,-0.8 -3.2,-2.3 1.1,-2.7 2.3,0.3 0.2,-0.6 -1.8,-1 v-0.5 h3.2 l1.8,-3.1 -1.3,-1.9 -0.3,-2.7 -1.5,0.2 -1.9,2.1 -0.6,2.6 -3.1,-0.6 -1,-1.8 1.8,-1.9 1.9,-1.7 -2.2,-6.5 -3.4,-3.4 1,-7.3 -0.2,-0.5 -1.3,0.2 -33.1,1.4 -0.8,-2.4 0.8,-8.5 8.6,-14.8 -0.9,-2.6 1.4,-0.4 0.4,-2 -2.2,-2 0.1,-1.9 -2,-4.5 -0.4,-5.1 0.1,-0.7 -26.4,0.8 -25.2,0.1 0.4,9.7 0.7,9.5 0.5,3.7 2.6,4.5 0.9,4.4 4.3,6 0.3,3.1 0.6,0.8 -0.7,8.3 -2.8,4.6 1.2,2.4 -0.5,2.6 -0.8,7.3 -1.3,3 0.2,3.7z",
  MA: "M887.5,172.5 l-0.5,-2.3 0.8,-1.5 2.9,-1.5 0.8,3.1 -0.5,1.8 -2.4,1.5 v1 l1.9,-1.5 3.9,-4.5 3.9,-1.9 4.2,-1.5 -0.3,-2.4 -1,-2.9 -1.9,-2.4 -1.8,-0.8 -2.1,0.2 -0.5,0.5 1,1.3 1.5,-0.8 2.1,1.6 0.8,2.7 -1.8,1.8 -2.3,1 -3.6,-0.5 -3.9,-6 -2.3,-2.6 h-1.8 l-1.1,0.8 -1.9,-2.6 0.3,-1.5 2.4,-5.2 -2.9,-4.4 -3.7,1.8 -1.8,2.9 -18.3,4.7 -13.8,2.5 -0.6,10.6 0.7,4.9 22,-4.8 11.2,-2.8 2,1.6 3.4,4.3 2.9,4.7z m12.5,1.4 2.2,-0.7 0.5,-1.7 1,0.1 1,2.3 -1.3,0.5 -3.9,0.1z m-9.4,0.8 2.3,-2.6 h1.6 l1.8,1.5 -2.4,1 -2.2,1z",
  MD: "M834.8,264.1 l1.7,-3.8 0.5,-4.8 -6.3,1.1 -5.8,0.3 -3.8,-16.8 -2.3,-5.5 -1.5,-4.6 -22.2,4.3 -37.6,7.6 2,10.4 4.8,-4.9 2.5,-0.7 1.4,-1.5 1.8,-2.7 1.6,0.7 2.6,-0.2 2.6,-2.1 2,-1.5 2.1,-0.6 1.5,1.1 2.7,1.4 1.9,1.8 1.3,1.4 4.8,1.6 -0.6,2.9 5.8,2.1 2.1,-2.6 3.7,2.5 -2.1,3.3 -0.7,3.3 -1.8,2.6 v2.1 l0.3,0.8 2,1.3 3.4,1.1 4.3,-0.1 3.1,1 2.1,0.3 1,-2.1 -1.5,-2.1 v-1.8 l-2.4,-2.1 -2.1,-5.5 1.3,-5.3 -0.2,-2.1 -1.3,-1.3 c0,0 1.5,-1.6 1.5,-2.3 0,-0.6 0.5,-2.1 0.5,-2.1 l1.9,-1.3 1.9,-1.6 0.5,1 -1.5,1.6 -1.3,3.7 0.3,1.1 1.8,0.3 0.5,5.5 -2.1,1 0.3,3.6 0.5,-0.2 1.1,-1.9 1.6,1.8 -1.6,1.3 -0.3,3.4 2.6,3.4 3.9,0.5 1.6,-0.8 3.2,4.2 1,0.4z m-14.5,0.2 1.1,2.5 0.2,1.8 1.1,1.9 c0,0 0.9,-0.9 0.9,-1.2 0,-0.3 -0.7,-3.1 -0.7,-3.1 l-0.7,-2.3z",
  ME: "M865.8,91.9 l1.5,0.4 v-2.6 l0.8,-5.5 2.6,-4.7 1.5,-4 -1.9,-2.4 v-6 l0.8,-1 0.8,-2.7 -0.2,-1.5 -0.2,-4.8 1.8,-4.8 2.9,-8.9 2.1,-4.2 h1.3 l1.3,0.2 v1.1 l1.3,2.3 2.7,0.6 0.8,-0.8 v-1 l4,-2.9 1.8,-1.8 1.5,0.2 6,2.4 1.9,1 9.1,29.9 h6 l0.8,1.9 0.2,4.8 2.9,2.3 h0.8 l0.2,-0.5 -0.5,-1.1 2.8,-0.5 1.9,2.1 2.3,3.7 v1.9 l-2.1,4.7 -1.9,0.6 -3.4,3.1 -4.8,5.5 c0,0 -0.6,0 -1.3,0 -0.6,0 -1,-2.1 -1,-2.1 l-1.8,0.2 -1,1.5 -2.4,1.5 -1,1.5 1.6,1.5 -0.5,0.6 -0.5,2.7 -1.9,-0.2 v-1.6 l-0.3,-1.3 -1.5,0.3 -1.8,-3.2 -2.1,1.3 1.3,1.5 0.3,1.1 -0.8,1.3 0.3,3.1 0.2,1.6 -1.6,2.6 -2.9,0.5 -0.3,2.9 -5.3,3.1 -1.3,0.5 -1.6,-1.5 -3.1,3.6 1,3.2 -1.5,1.3 -0.2,4.4 -1.1,6.3 -2.2,-0.9 -0.5,-3.1 -4,-1.1 -0.2,-2.5 -11.7,-37.43z m36.5,15.6 1.5,-1.5 1.4,1.1 0.6,2.4 -1.7,0.9z m6.7,-5.9 1.8,1.9 c0,0 1.3,0.1 1.3,-0.2 0,-0.3 0.2,-2 0.2,-2 l0.9,-0.8 -0.8,-1.8 -2,0.7z",
  MI: "M644.5,211 l19.1,-1.9 0.2,1.1 9.9,-1.5 12,-1.7 0.1,-0.6 0.2,-1.5 2.1,-3.7 2,-1.7 -0.2,-5.1 1.6,-1.6 1.1,-0.3 0.2,-3.6 1.5,-3 1.1,0.6 0.2,0.6 0.8,0.2 1.9,-1 -0.4,-9.1 -3.2,-8.2 -2.3,-9.1 -2.4,-3.2 -2.6,-1.8 -1.6,1.1 -3.9,1.8 -1.9,5 -2.7,3.7 -1.1,0.6 -1.5,-0.6 c0,0 -2.6,-1.5 -2.4,-2.1 0.2,-0.6 0.5,-5 0.5,-5 l3.4,-1.3 0.8,-3.4 0.6,-2.6 2.4,-1.6 -0.3,-10 -1.6,-2.3 -1.3,-0.8 -0.8,-2.1 0.8,-0.8 1.6,0.3 0.2,-1.6 -2.6,-2.2 -1.3,-2.6 h-2.6 l-4.5,-1.5 -5.5,-3.4 h-2.7 l-0.6,0.6 -1,-0.5 -3.1,-2.3 -2.9,1.8 -2.9,2.3 0.3,3.6 1,0.3 2.1,0.5 0.5,0.8 -2.6,0.8 -2.6,0.3 -1.5,1.8 -0.3,2.1 0.3,1.6 0.3,5.5 -3.6,2.1 -0.6,-0.2 v-4.2 l1.3,-2.4 0.6,-2.4 -0.8,-0.8 -1.9,0.8 -1,4.2 -2.7,1.1 -1.8,1.9 -0.2,1 0.6,0.8 -0.6,2.6 -2.3,0.5 v1.1 l0.8,2.4 -1.1,6.1 -1.6,4 0.6,4.7 0.5,1.1 -0.8,2.4 -0.3,0.8 -0.3,2.7 3.6,6 2.9,6.5 1.5,4.8 -0.8,4.7 -1,6 -2.4,5.2 -0.3,2.7 -3.2,3.1z m-33.3,-72.4 -1.3,-1.1 -1.8,-10.4 -3.7,-1.3 -1.7,-2.3 -12.6,-2.8 -2.8,-1.1 -8.1,-2.2 -7.8,-1 -3.9,-5.3 0.7,-0.5 2.7,-0.8 3.6,-2.3 v-1 l0.6,-0.6 6,-1 2.4,-1.9 4.4,-2.1 0.2,-1.3 1.9,-2.9 1.8,-0.8 1.3,-1.8 2.3,-2.3 4.4,-2.4 4.7,-0.5 1.1,1.1 -0.3,1 -3.7,1 -1.5,3.1 -2.3,0.8 -0.5,2.4 -2.4,3.2 -0.3,2.6 0.8,0.5 1,-1.1 3.6,-2.9 1.3,1.3 h2.3 l3.2,1 1.5,1.1 1.5,3.1 2.7,2.7 3.9,-0.2 1.5,-1 1.6,1.3 1.6,0.5 1.3,-0.8 h1.1 l1.6,-1 4,-3.6 3.4,-1.1 6.6,-0.3 4.5,-1.9 2.6,-1.3 1.5,0.2 v5.7 l0.5,0.3 2.9,0.8 1.9,-0.5 6.1,-1.6 1.1,-1.1 1.5,0.5 v7 l3.2,3.1 1.3,0.6 1.3,1 -1.3,0.3 -0.8,-0.3 -3.7,-0.5 -2.1,0.6 -2.3,-0.2 -3.2,1.5 h-1.8 l-5.8,-1.3 -5.2,0.2 -1.9,2.6 -7,0.6 -2.4,0.8 -1.1,3.1 -1.3,1.1 -0.5,-0.2 -1.5,-1.6 -4.5,2.4 h-0.6 l-1.1,-1.6 -0.8,0.2 -1.9,4.4 -1,4 -3.2,6.9z m-29.6,-56.5 1.8,-2.1 2.2,-0.8 5.4,-3.9 2.3,-0.6 0.5,0.5 -5.1,5.1 -3.3,1.9 -2.1,0.9z m86.2,32.1 0.6,2.5 3.2,0.2 1.3,-1.2 c0,0 -0.1,-1.5 -0.4,-1.6 -0.3,-0.2 -1.6,-1.9 -1.6,-1.9 l-2.2,0.2 -1.6,0.2 -0.3,1.1z",
  MN: "M464.6,66.79 l-0.6,3.91 v10.27 l1.6,5.03 1.9,3.32 0.5,9.93 1.8,13.45 1.8,7.3 0.4,6.4 v5.3 l-1.6,1.8 -1.8,1.3 v1.5 l0.9,1.7 4.1,3.5 0.7,3.2 v35.9 l60.3,-0.6 21.2,-0.7 -0.5,-6 -1.8,-2.1 -7.2,-4.6 -3.6,-5.3 -3.4,-0.9 -2,-2.8 h-3.2 l-3.5,-3.8 -0.5,-7 0.1,-3.9 1.5,-3 -0.7,-2.7 -2.8,-3.1 2.2,-6.1 5.4,-4 1.2,-1.4 -0.2,-8 0.2,-3 2.6,-3 3.8,-2.9 1.3,-0.2 4.5,-5 1.8,-0.8 2.3,-3.9 2.4,-3.6 3.1,-2.6 4.8,-2 9.2,-4.1 3.9,-1.8 0.6,-2.3 -4.4,0.4 -0.7,1.1 h-0.6 l-1.8,-3.1 -8.9,0.3 -1,0.8 h-1 l-0.5,-1.3 -0.8,-1.8 -2.6,0.5 -3.2,3.2 -1.6,0.8 h-3.1 l-2.6,-1 v-2.1 l-1.3,-0.2 -0.5,0.5 -2.6,-1.3 -0.5,-2.9 -1.5,0.5 -0.5,1 -2.4,-0.5 -5.3,-2.4 -3.9,-2.6 h-2.9 l-1.3,-1 -2.3,0.6 -1.1,1.1 -0.3,1.3 h-4.8 v-2.1 l-6.3,-0.3 -0.3,-1.5 h-4.8 l-1.6,-1.6 -1.5,-6.1 -0.8,-5.5 -1.9,-0.8 -2.3,-0.5 -0.6,0.2 -0.3,8.2 -30.1,-0.03z",
  MO: "M593.1,338.7 l0.5,-5.9 4.2,-3.4 1.9,-1 v-2.9 l0.7,-1.6 -1.1,-1.6 -2.4,0.3 -2.1,-2.5 -1.7,-4.5 0.9,-2.6 -2,-3.2 -1.8,-4.6 -4.6,-0.7 -6.8,-5.6 -2.2,-4.2 0.8,-3.3 2.2,-6 0.6,-3 -1.9,-1 -6.9,-0.6 -1.1,-1.9 v-4.1 l-5.3,-3.5 -7.2,-7.8 -2.3,-7.3 -0.5,-4.2 0.7,-2.4 -2.6,-3.1 -1.2,-2.4 -7.7,0.8 -10,0.6 -48.8,1.2 1.3,2.6 -0.1,2.2 2.3,3.6 3,3.9 3.1,3 2.6,0.2 1.4,1.1 v2.9 l-1.8,1.6 -0.5,2.3 2.1,3.2 2.4,3 2.6,2.1 1.3,11.6 -0.8,40 0.5,5.7 23.7,-0.2 23.3,-0.7 32.5,-1.3 2.2,3.7 -0.8,3.1 -3.1,2.5 -0.5,1.8 5.2,0.5 4.1,-1.1z",
  MS: "M604.3,472.5 l2.6,-4.2 1.8,0.8 6.8,-1.9 2.1,0.3 1.5,0.8 h5.2 l0.4,-1.6 -1.7,-14.8 -2.8,-19 1,-45.1 -0.2,-16.7 0.2,-6.3 -4.8,0.3 -19.6,1.6 -13,0.4 -0.2,3.2 -2.8,1.3 -2.6,5.1 0.5,1.6 0.1,2.4 -2.9,1.1 -3.5,5.1 0.8,2.3 -3,2.5 -1,5.7 -0.6,1.9 1.6,2.5 -1.5,1.4 1.5,2.8 0.3,4.2 -1.2,2.5 -0.2,0.9 0.4,5 2,4.5 -0.1,1.7 2.3,2 -0.7,3.1 -0.9,0.3 0.6,1.9 -8.6,15 -0.8,8.2 0.5,1.5 24.2,-0.7 8.2,-0.7 1.9,-0.3 0.6,1.4 -1,7.1 3.3,3.3 2.2,6.4z",
  MT: "M361.1,70.77 l-5.3,57.13 -1.3,15.2 -59.1,-6.6 -49,-7.1 -1.4,11.2 -1.9,-1.7 -0.4,-2.5 -1.3,-1.9 -3.3,1.5 -0.7,2.5 -2.3,0.3 -3.8,-1.6 -4.1,0.1 -2.4,0.7 -3.2,-1.5 -3,0.2 -2.1,1.9 -0.9,-0.6 -0.7,-3.4 0.7,-3.2 -2.7,-3.2 -3.3,-2.5 -2.5,-12.6 -0.1,-5.3 -1.6,-0.8 -0.6,1 -4.5,3.2 -1.2,-0.1 -2.3,-2.8 -0.2,-2.8 7,-17.15 -0.6,-2.67 -3.5,-1.12 -0.4,-0.91 -2.7,-3.5 -4.6,-10.41 -3.2,-1.58 -1.8,-4.26 1.3,-4.63 -3.2,-7.57 4.4,-21.29 32.7,6.89 18.4,3.4 32.3,5.3 29.3,4 29.2,3.5 30.8,3.07z",
  NC: "M786.7,357.7 l-12.7,-7.7 -3.1,-0.8 -16.6,2.1 -1.6,-3 -2.8,-2.2 -16.7,0.5 -7.4,0.9 -9.2,4.5 -6.8,2.7 -6.5,1.2 -13.4,1.4 0.1,-4.1 1.7,-1.3 2.7,-0.7 0.7,-3.8 3.9,-2.5 3.9,-1.5 4.5,-3.7 4.4,-2.3 0.7,-3.2 4.1,-3.8 0.7,1 2.5,0.2 2.4,-3.6 1.7,-0.4 2.6,0.3 1.8,-4 2.5,-2.4 0.5,-1.8 0.1,-3.5 4.4,0.1 38.5,-5.6 57.5,-12.3 2,4.8 3.6,6.5 2.4,2.4 0.6,2.3 -2.4,0.2 0.8,0.6 -0.3,4.2 -2.6,1.3 -0.6,2.1 -1.3,2.9 -3.7,1.6 -2.4,-0.3 -1.5,-0.2 -1.6,-1.3 0.3,1.3 v1 h1.9 l0.8,1.3 -1.9,6.3 h4.2 l0.6,1.6 2.3,-2.3 1.3,-0.5 -1.9,3.6 -3.1,4.8 h-1.3 l-1.1,-0.5 -2.7,0.6 -5.2,2.4 -6.5,5.3 -3.4,4.7 -1.9,6.5 -0.5,2.4 -4.7,0.5 -5.1,1.5z m49.3,-26.2 2.6,-2.5 3.2,-2.6 1.5,-0.6 0.2,-2 -0.6,-6.1 -1.5,-2.3 -0.6,-1.9 0.7,-0.2 2.7,5.5 0.4,4.4 -0.2,3.4 -3.4,1.5 -2.8,2.4 -1.1,1.2z",
  ND: "M471,126.4 l-0.4,-6.2 -1.8,-7.3 -1.8,-13.61 -0.5,-9.7 -1.9,-3.18 -1.6,-5.32 v-10.41 l0.6,-3.85 -1.8,-5.54 -28.6,-0.59 -18.6,-0.6 -26.5,-1.3 -25.2,-2.16 -0.9,14.42 -4.7,50.94 56.8,3.9 56.9,1.7z",
  NE: "M470.3,204.3 l-1,-2.3 -0.5,-1.6 -2.9,-1.6 -4.8,-1.5 -2.2,-1.2 -2.6,0.1 -3.7,0.4 -4.2,1.2 -6,-4.1 -2.2,-2 -10.7,0.6 -41.5,-2.4 -35.6,-2.2 -4.3,43.7 33.1,3.3 -1.4,21.1 21.7,1 40.6,1.2 43.8,0.6 h4.5 l-2.2,-3 -2.6,-3.9 0.1,-2.3 -1.4,-2.7 -1.9,-5.2 -0.4,-6.7 -1.4,-4.1 -0.5,-5 -2.3,-3.7 -1,-4.7 -2.8,-7.9 -1,-5.3z",
  NH: "M881.7,141.3 l1.1,-3.2 -2.7,-1.2 -0.5,-3.1 -4.1,-1.1 -0.3,-3 -11.7,-37.48 -0.7,0.08 -0.6,1.6 -0.6,-0.5 -1,-1 -1.5,1.9 -0.2,2.29 0.5,8.41 1.9,2.8 v4.3 l-3.9,4.8 -2.4,0.9 v0.7 l1.1,1.9 v8.6 l-0.8,9.2 -0.2,4.7 1,1.4 -0.2,4.7 -0.5,1.5 1,1.1 5.1,-1.2 13.8,-3.5 1.7,-2.9 4,-1.9z",
  NJ: "M823.7,228.3 l0.1,-1.5 2.7,-1.3 1.7,-2.8 1.7,-2.4 3.3,-3.2 v-1.2 l-6.1,-4.1 -1,-2.7 -2.7,-0.3 -0.1,-0.9 -0.7,-2.2 2.2,-1.1 0.2,-2.9 -1.3,-1.3 0.2,-1.2 1.9,-3.1 v-3.1 l2.5,-3.1 5.6,2.5 6.4,1.9 2.5,1.2 0.1,1.8 -0.5,2.7 0.4,4.5 -2.1,1.9 -1.1,1 0.5,0.5 2.7,-0.3 1.1,-0.8 1.6,3.4 0.2,9.4 0.6,1.1 -1.1,5.5 -3.1,6.5 -2.7,4 -0.8,4.8 -2.1,2.4 h-0.8 l-0.3,-2.7 0.8,-1 -0.2,-1.5 -4,-0.6 -4.8,-2.3 -3.2,-2.9 -1,-2z",
  NM: "M270.2,429.4 l-16.7,-2.6 -1.2,9.6 -15.8,-2 6,-39.7 7,-53.2 4.4,-30.9 34,3.9 37.4,4.4 32,2.8 -0.3,10.8 -1.4,-0.1 -7.4,97.7 -28.4,-1.8 -38.1,-3.7 0.7,6.3z",
  NV: "M123.1,173.6 l38.7,8.5 26,5.2 -10.6,53.1 -5.4,29.8 -3.3,15.5 -2.1,11.1 -2.6,16.4 -1.7,3.1 -1.6,-0.1 -1.2,-2.6 -2.8,-0.5 -1.3,-1.1 -1.8,0.1 -0.9,0.8 -1.8,1.3 -0.3,7.3 -0.3,1.5 -0.5,12.4 -1.1,1.8 -16.7,-25.5 -42.1,-62.1 -12.43,-19 8.55,-32.6 8.01,-31.3z",
  NY: "M843.4,200 l0.5,-2.7 -0.2,-2.4 -3,-1.5 -6.5,-2 -6,-2.6 -0.6,-0.4 -2.7,-0.3 -2,-1.5 -2.1,-5.9 -3.3,-0.5 -2.4,-2.4 -38.4,8.1 -31.6,6 -0.5,-6.5 1.6,-1.2 1.3,-1.1 1,-1.6 1.8,-1.1 1.9,-1.8 0.5,-1.6 2.1,-2.7 1.1,-1 -0.2,-1 -1.3,-3.1 -1.8,-0.2 -1.9,-6.1 2.9,-1.8 4.4,-1.5 4,-1.3 3.2,-0.5 6.3,-0.2 1.9,1.3 1.6,0.2 2.1,-1.3 2.6,-1.1 5.2,-0.5 2.1,-1.8 1.8,-3.2 1.6,-1.9 h2.1 l1.9,-1.1 0.2,-2.3 -1.5,-2.1 -0.3,-1.5 1.1,-2.1 v-1.5 h-1.8 l-1.8,-0.8 -0.8,-1.1 -0.2,-2.6 5.8,-5.5 0.6,-0.8 1.5,-2.9 2.9,-4.5 2.7,-3.7 2.1,-2.4 2.4,-1.8 3.1,-1.2 5.5,-1.3 3.2,0.2 4.5,-1.5 7.4,-2.2 0.7,4.9 2.4,6.5 0.8,5 -1,4.2 2.6,4.5 0.8,2 -0.9,3.2 3.7,1.7 2.7,10.2 v5.8 l-0.6,10.9 0.8,5.4 0.7,3.6 1.5,7.3 v8.1 l-1.1,2.3 2.1,2.7 0.5,0.9 -1.9,1.8 0.3,1.3 1.3,-0.3 1.5,-1.3 2.3,-2.6 1.1,-0.6 1.6,0.6 2.3,0.2 7.9,-3.9 2.9,-2.7 1.3,-1.5 4.2,1.6 -3.4,3.6 -3.9,2.9 -7.1,5.3 -2.6,1 -5.8,1.9 -4,1.1 -1,-0.4z",
  OH: "M663.8,211.2 l1.7,15.5 4.8,41.1 3.9,-0.2 2.3,-0.8 3.6,1.8 1.7,4.2 5.4,0.1 1.8,2 h1.7 l2.4,-1.4 3.1,0.5 1.5,1.3 1.8,-2 2.3,-1.4 2.4,-0.4 0.6,2.7 1.6,1 2.6,2 0.8,0.2 2,-0.1 1.2,-0.6 v-2.1 l1.7,-1.5 0.1,-4.8 1.1,-4.2 1.9,-1.3 1,0.7 1,1.1 0.7,0.2 0.4,-0.4 -0.9,-2.7 v-2.2 l1.1,-1.4 2.5,-3.6 1.3,-1.5 2.2,0.5 2.1,-1.5 3,-3.3 2.2,-3.7 0.2,-5.4 0.5,-5 v-4.6 l-1.2,-3.2 1.2,-1.8 1.3,-1.2 -0.6,-2.8 -4.3,-25.6 -6.2,3.7 -3.9,2.3 -3.4,3.7 -4,3.9 -3.2,0.8 -2.9,0.5 -5.5,2.6 -2.1,0.2 -3.4,-3.1 -5.2,0.6 -2.6,-1.5 -2.2,-1.3z",
  OK: "M411.9,334.9 l-1.8,24.3 -0.9,18 0.2,1.6 4,3.6 1.7,0.9 h0.9 l0.9,-2.1 1.5,1.9 1.6,0.1 0.3,-0.2 0.2,-1.1 2.8,1.4 -0.4,3.5 3.8,0.5 2.5,1 4.2,0.6 2.3,1.6 2.5,-1.7 3.5,0.7 2.2,3.1 1.2,0.1 v2.3 l2.1,0.7 2.5,-2.1 1.8,0.6 2.7,0.1 0.7,2.3 4.4,1.8 1.7,-0.3 1.9,-4.2 h1.3 l1.1,2.1 4.2,0.8 3.4,1.3 3,0.8 1.6,-0.7 0.7,-2.7 h4.5 l1.9,0.9 2.7,-1.9 h1.4 l0.6,1.4 h3.6 l2,-1.8 2.3,0.6 1.7,2.2 3,1.7 3.4,0.9 1.9,1.2 -0.3,-37.6 -1.4,-10.9 -0.1,-8.6 -1.5,-6.6 -0.6,-6.8 0.1,-4.3 -12.6,0.3 -46.3,-0.5 -44.7,-2.1 -41.5,-1.8 -0.4,10.7z",
  OR: "M67.44,158.9 l28.24,7.2 27.52,6.5 17,3.7 8.8,-35.1 1.2,-4.4 2.4,-5.5 -0.7,-1.3 -2.5,0.1 -1.3,-1.8 0.6,-1.5 0.4,-3.3 4.7,-5.7 1.9,-0.9 0.9,-0.8 0.7,-2.7 0.8,-1.1 3.9,-5.7 3.7,-4 0.2,-3.26 -3.4,-2.49 -1.2,-4.55 -13.1,-3.83 -15.3,-3.47 -14.8,0.37 -1.1,-1.31 -5.1,1.84 -4.5,-0.48 -2.4,-1.58 -1.3,0.54 -4.68,-0.29 -1.96,-1.43 -4.84,-1.77 -1.1,-0.07 -4.45,-1.27 -1.76,1.52 -6.26,-0.24 -5.31,-3.85 0.21,-9.28 -2.05,-3.5 -4.1,-0.6 -0.7,-2.5 -2.4,-0.5 -5.8,2.1 -2.3,6.5 -3.2,10 -3.2,6.5 -5,14.1 -6.5,13.6 -8.1,12.6 -1.9,2.9 -0.8,8.6 -1.3,6 2.71,3.5z",
  PA: "M736.6,192.2 l1.3,-0.5 5.7,-5.5 0.7,6.9 33.5,-6.5 36.9,-7.8 2.3,2.3 3.1,0.4 2,5.6 2.4,1.9 2.8,0.4 0.1,0.1 -2.6,3.2 v3.1 l-1.9,3.1 -0.2,1.9 1.3,1.3 -0.2,1.9 -2.4,1.1 1,3.4 0.2,1.1 2.8,0.3 0.9,2.5 5.9,3.9 v0.4 l-3.1,3 -1.5,2.2 -1.7,2.8 -2.7,1.2 -1.4,0.3 -2.1,1.3 -1.6,1.4 -22.4,4.3 -38.7,7.8 -11.3,1.4 -3.9,0.7 -5.1,-22.4 -4.3,-25.9z",
  RI: "M873.6,175.7 l-0.8,-4.4 -1.6,-6 5.7,-1.5 1.5,1.3 3.4,4.3 2.8,4.4 -2.8,1.4 -1.3,-0.2 -1.1,1.8 -2.4,1.9 -2.8,1.1z",
  SC: "M759,413.6 l-2.1,-1 -1.9,-5.6 -2.5,-2.3 -2.5,-0.5 -1.5,-4.6 -3,-6.5 -4.2,-1.8 -1.9,-1.8 -1.2,-2.6 -2.4,-2 -2.3,-1.3 -2.2,-2.9 -3.2,-2.4 -4.4,-1.7 -0.4,-1.4 -2.3,-2.8 -0.5,-1.5 -3.8,-5.4 -3.4,0.1 -3.9,-2.5 -1.2,-1.2 -0.2,-1.4 0.6,-1.6 2.7,-1.3 -0.8,-2 6.4,-2.7 9.2,-4.5 7.1,-0.9 16.4,-0.5 2.3,1.9 1.8,3.5 4.6,-0.8 12.6,-1.5 2.7,0.8 12.5,7.4 10.1,8.3 -5.3,5.4 -2.6,6.1 -0.5,6.3 -1.6,0.8 -1.1,2.7 -2.4,0.6 -2.1,3.6 -2.7,2.7 -2.3,3.4 -1.6,0.8 -3.6,3.4 -2.9,0.2 1,3.2 -5,5.3 -2.3,1.6z",
  SD: "M471,181.1 l-0.9,3.2 0.4,3 2.6,2 -1.2,5.4 -1.8,4.1 1.5,3.3 0.7,1.1 -1.3,0.1 -0.7,-1.6 -0.6,-2 -3.3,-1.8 -4.8,-1.5 -2.5,-1.3 -2.9,0.1 -3.9,0.4 -3.8,1.2 -5.3,-3.8 -2.7,-2.4 -10.9,0.8 -41.5,-2.4 -35.6,-2.2 1.5,-24.8 2.8,-34 0.4,-5 56.9,3.9 56.9,1.7 v2.7 l-1.3,1.5 -2,1.5 -0.1,2.2 1.1,2.2 4.1,3.4 0.5,2.7 v35.9z",
  TN: "M670.8,359.6 l-13.1,1.2 -23.3,2.2 -37.6,2.7 -11.8,0.4 0.9,-0.6 0.9,-4.5 -1.2,-3.6 3.9,-2.3 0.4,-2.5 1.2,-4.3 3,-9.5 0.5,-5.6 0.3,-0.2 12.3,-0.2 13.6,-0.8 0.1,-3.9 3.5,-0.1 30.4,-3.3 54,-5.2 10.3,-1.5 7.6,-0.2 2.4,-1.9 1.3,0.3 -0.1,3.3 -0.4,1.6 -2.4,2.2 -1.6,3.6 -2,-0.4 -2.4,0.9 -2.2,3.3 -1.4,-0.2 -0.8,-1.2 -1.1,0.4 -4.3,4 -0.8,3.1 -4.2,2.2 -4.3,3.6 -3.8,1.5 -4.4,2.8 -0.6,3.6 -2.5,0.5 -2,1.7 -0.2,4.8z",
  TX: "M282.8,425.6 l37,3.6 29.3,1.9 7.4,-97.7 54.4,2.4 -1.7,23.3 -1,18 0.2,2 4.4,4.1 2,1.1 h1.8 l0.5,-1.2 0.7,0.9 2.4,0.2 1.1,-0.6 v-0.2 l1,0.5 -0.4,3.7 4.5,0.7 2.4,0.9 4.2,0.7 2.6,1.8 2.8,-1.9 2.7,0.6 2.2,3.1 0.8,0.1 v2.1 l3.3,1.1 2.5,-2.1 1.5,0.5 2.1,0.1 0.6,2.1 5.2,2 2.3,-0.5 1.9,-4 h0.1 l1.1,1.9 4.6,0.9 3.4,1.3 3.2,1 2.4,-1.2 0.7,-2.3 h3.6 l2.1,1 3,-2 h0.4 l0.5,1.4 h4.7 l1.9,-1.8 1.3,0.4 1.7,2.1 3.3,1.9 3.4,1 2.5,1.4 2.7,2 3.1,-1.2 2.1,0.8 0.7,20 0.7,9.5 0.6,4.1 2.6,4.4 0.9,4.5 4.2,5.9 0.3,3.1 0.6,0.8 -0.7,7.7 -2.9,4.8 1.3,2.6 -0.5,2.4 -0.8,7.2 -1.3,3 0.3,4.2 -5.6,1.6 -9.9,4.5 -1,1.9 -2.6,1.9 -2.1,1.5 -1.3,0.8 -5.7,5.3 -2.7,2.1 -5.3,3.2 -5.7,2.4 -6.3,3.4 -1.8,1.5 -5.8,3.6 -3.4,0.6 -3.9,5.5 -4,0.3 -1,1.9 2.3,1.9 -1.5,5.5 -1.3,4.5 -1.1,3.9 -0.8,4.5 0.8,2.4 1.8,7 1,6.1 1.8,2.7 -1,1.5 -3.1,1.9 -5.7,-3.9 -5.5,-1.1 -1.3,0.5 -3.2,-0.6 -4.2,-3.1 -5.2,-1.1 -7.6,-3.4 -2.1,-3.9 -1.3,-6.5 -3.2,-1.9 -0.6,-2.3 0.6,-0.6 0.3,-3.4 -1.3,-0.6 -0.6,-1 1.3,-4.4 -1.6,-2.3 -3.2,-1.3 -3.4,-4.4 -3.6,-6.6 -4.2,-2.6 0.2,-1.9 -5.3,-12.3 -0.8,-4.2 -1.8,-1.9 -0.2,-1.5 -6,-5.3 -2.6,-3.1 v-1.1 l-2.6,-2.1 -6.8,-1.1 -7.4,-0.6 -3.1,-2.3 -4.5,1.8 -3.6,1.5 -2.3,3.2 -1,3.7 -4.4,6.1 -2.4,2.4 -2.6,-1 -1.8,-1.1 -1.9,-0.6 -3.9,-2.3 v-0.6 l-1.8,-1.9 -5.2,-2.1 -7.4,-7.8 -2.3,-4.7 v-8.1 l-3.2,-6.5 -0.5,-2.7 -1.6,-1 -1.1,-2.1 -5,-2.1 -1.3,-1.6 -7.1,-7.9 -1.3,-3.2 -4.7,-2.3 -1.5,-4.4 -2.6,-2.9 -1.7,-0.5z m174.4,141.7 -0.6,-7.1 -2.7,-7.2 -0.6,-7 1.5,-8.2 3.3,-6.9 3.5,-5.4 3.2,-3.6 0.6,0.2 -4.8,6.6 -4.4,6.5 -2,6.6 -0.3,5.2 0.9,6.1 2.6,7.2 0.5,5.2 0.2,1.5z",
  UT: "M228.4,305.9 l24.6,3.6 1.9,-13.7 7,-50.5 2.3,-22 -32.2,-3.5 2.2,-13.1 1.8,-10.6 -34.7,-6.1 -12.5,-2.5 -10.6,52.9 -5.4,30 -3.3,15.4 -1.7,9.2z",
  VA: "M834.7,265.2 l-0.2,2.8 -2.9,3.8 -0.4,4.6 0.5,3.4 -1.8,5 -2.2,1.9 -1.5,-4.6 0.4,-5.4 1.6,-4.2 0.7,-3.3 -0.1,-1.7z m-60.3,44.6 -38.6,5.6 -4.8,-0.1 -2.2,-0.3 -2.5,1.9 -7.3,0.1 -10.3,1.6 -6.7,0.6 4.1,-2.6 4.1,-2.3 v-2.1 l5.7,-7.3 4.1,-3.7 2.2,-2.5 3.6,4.3 3.8,0.9 2.7,-1 2,-1.5 2.4,1.2 4.6,-1.3 1.7,-4.4 2.4,0.7 3.2,-2.3 1.6,0.4 2.8,-3.2 0.2,-2.7 -0.8,-1.2 4.8,-10.5 1.8,-5.2 0.5,-4.7 0.7,-0.2 1.1,1.7 1.5,1.2 3.9,-0.2 1.7,-8.1 3,-0.6 0.8,-2.6 2.8,-2.2 1.1,-2.1 1.8,-4.3 0.1,-4.6 3.6,1.4 6.6,3.1 0.3,-5.2 3.4,1.2 -0.6,2.9 8.6,3.1 1.4,1.8 -0.8,3.3 -1.3,1.3 -0.5,1.7 0.5,2.4 2,1.3 3.9,1.4 2.9,1 4.9,0.9 2.2,2.1 3.2,0.4 0.9,1.2 -0.4,4.7 1.4,1.1 -0.5,1.9 1.2,0.8 -0.2,1.4 -2.7,-0.1 0.1,1.6 2.3,1.5 0.1,1.4 1.8,1.8 0.5,2.5 -2.6,1.4 1.6,1.5 5.8,-1.7 3.7,6.2z",
  VT: "M832.7,111.3 l2.4,6.5 0.8,5.3 -1,3.9 2.5,4.4 0.9,2.3 -0.7,2.6 3.3,1.5 2.9,10.8 v5.3 l11.5,-2.1 -1,-1.1 0.6,-1.9 0.2,-4.3 -1,-1.4 0.2,-4.7 0.8,-9.3 v-8.5 l-1.1,-1.8 v-1.6 l2.8,-1.1 3.5,-4.4 v-3.6 l-1.9,-2.7 -0.3,-5.79 -26.1,6.79z",
  WA: "M74.5,67.7 l-2.3,-4.3 -4.1,-0.7 -0.4,-2.4 -2.5,-0.6 -2.9,-0.5 -1.8,1 -2.3,-2.9 0.3,-2.9 2.7,-0.3 1.6,-4 -2.6,-1.1 0.2,-3.7 4.4,-0.6 -2.7,-2.7 -1.5,-7.1 0.6,-2.9 v-7.9 l-1.8,-3.2 2.3,-9.4 2.1,0.5 2.4,2.9 2.7,2.6 3.2,1.9 4.5,2.1 3.1,0.6 2.9,1.5 3.4,1 2.3,-0.2 v-2.4 l1.3,-1.1 2.1,-1.3 0.3,1.1 0.3,1.8 -2.3,0.5 -0.3,2.1 1.8,1.5 1.1,2.4 0.6,1.9 1.5,-0.2 0.2,-1.3 -1,-1.3 -0.5,-3.2 0.8,-1.8 -0.6,-1.5 v-2.6 l1.8,-3.6 -1.1,-2.6 -2.4,-4.8 0.3,-0.8 1.4,-0.8 4.4,1.5 9.7,2.7 8.6,1.9 20,5.7 23,5.7 15,3.49 -4.8,17.56 -4.5,20.83 -3.4,16.25 -0.4,9.18 v0 l-12.9,-3.72 -15.3,-3.47 -14.5,0.32 -1.1,-1.53 -5.7,2.09 -3.9,-0.42 -2.6,-1.79 -1.7,0.65 -4.15,-0.25 -1.72,-1.32 -5.16,-1.82 -1.18,-0.16 -4.8,-1.39 -1.92,1.65 -5.65,-0.25 -4.61,-3.35z m9.6,-55.4 2,-0.2 0.5,1.4 1.5,-1.6 h2.3 l0.8,1.5 -1.5,1.7 0.6,0.8 -0.7,2 -1.4,0.4 c0,0 -0.9,0.1 -0.9,-0.2 0,-0.3 1.5,-2.6 1.5,-2.6 l-1.7,-0.6 -0.3,1.5 -0.7,0.6 -1.5,-2.3z",
  WI: "M541.4,109.9 l2.9,0.5 2.9,-0.6 7.4,-3.2 2.9,-1.9 2.1,-0.8 1.9,1.5 -1.1,1.1 -1.9,3.1 -0.6,1.9 1,0.6 1.8,-1 1.1,-0.2 2.7,0.8 0.6,1.1 1.1,0.2 0.6,-1.1 4,5.3 8.2,1.2 8.2,2.2 2.6,1.1 12.3,2.6 1.6,2.3 3.6,1.2 1.7,10.2 1.6,1.4 1.5,0.9 -1.1,2.3 -1.8,1.6 -2.1,4.7 -1.3,2.4 0.2,1.8 1.5,0.3 1.1,-1.9 1.5,-0.8 0.8,-2.3 1.9,-1.8 2.7,-4 4.2,-6.3 0.8,-0.5 0.3,1 -0.2,2.3 -2.9,6.8 -2.7,5.7 -0.5,3.2 -0.6,2.6 0.8,1.3 -0.2,2.7 -1.9,2.4 -0.5,1.8 0.6,3.6 0.6,3.4 -1.5,2.6 -0.8,2.9 -1,3.1 1.1,2.4 0.6,6.1 1.6,4.5 -0.2,3 -15.9,1.8 -17.5,1 h-12.7 l-0.7,-1.5 -2.9,-0.4 -2.6,-1.3 -2.3,-3.7 -0.3,-3.6 2,-2.9 -0.5,-1.4 -2.1,-2.2 -0.8,-3.3 -0.6,-6.8 -2.1,-2.5 -7,-4.5 -3.8,-5.4 -3.4,-1 -2.2,-2.8 h-3.2 l-2.9,-3.3 -0.5,-6.5 0.1,-3.8 1.5,-3.1 -0.8,-3.2 -2.5,-2.8 1.8,-5.4 5.2,-3.8 1.6,-1.9 -0.2,-8.1 0.2,-2.8 2.4,-2.8z",
  WV: "M758.9,254.3 l5.8,-6 2.6,-0.8 1.6,-1.5 1.5,-2.2 1.1,0.3 3.1,-0.2 4.6,-3.6 1.5,-0.5 1.3,1 2.6,1.2 3,3 -0.4,4.3 -5.4,-2.6 -4.8,-1.8 -0.1,5.9 -2.6,5.7 -2.9,2.4 -0.8,2.3 -3,0.5 -1.7,8.1 -2.8,0.2 -1.1,-1 -1.2,-2 -2.2,0.5 -0.5,5.1 -1.8,5.1 -5,11 0.9,1.4 -0.1,2 -2.2,2.5 -1.6,-0.4 -3.1,2.3 -2.8,-0.8 -1.8,4.9 -3.8,1 -2.5,-1.3 -2.5,1.9 -2.3,0.7 -3.2,-0.8 -3.8,-4.5 -3.5,-2.2 -2.5,-2.5 -2.9,-3.7 -0.5,-2.3 -2.8,-1.7 -0.6,-1.3 -0.2,-5.6 0.3,0.1 2.4,-0.2 1.8,-1 v-2.2 l1.7,-1.5 0.1,-5.2 0.9,-3.6 1.1,-0.7 0.4,0.3 1,1.1 1.7,0.5 1.1,-1.3 -1,-3.1 v-1.6 l3.1,-4.6 1.2,-1.3 2,0.5 2.6,-1.8 3.1,-3.4 2.4,-4.1 0.2,-5.6 0.5,-4.8 v-4.9 l-1.1,-3 0.9,-1.3 0.8,-0.7 4.3,19.3 4.3,-0.8 11.2,-1.3z",
  WY: "M353,161.9 l-1.5,25.4 -4.4,44 -2.7,-0.3 -83.3,-9.1 -27.9,-3 2,-12 6.9,-41 3.8,-24.2 1.3,-11.2 48.2,7 59.1,6.5z",
  DC: "M801.8,253.8 l-1.1-1.6 -1-0.8 1.1-1.6 2.2,1.5z",
};
const STATE_NAME_BY_CODE = Object.fromEntries(Object.entries(STATE_ABBR).map(([name, code]) => [code, name]));
// Sold-price confidence — designed to get sharper over time, not stay a
// fixed rule forever. Below a real sample size for that make, everything
// just gets checked against a broad, generic plausibility band (a sold
// price wildly above or below asking is the clearest sign of a bad entry).
// Once there's enough real same-make sold data, new entries get judged
// against the make's own actual historical spread instead — a genuinely
// better bar than a generic rule, and it keeps improving as more real
// sales come in.
const SOLD_CONFIDENCE_MIN_SAMPLE = 3;
function computeSaleConfidence(listing, allSoldWithPrice) {
  if (!listing.sold_price || !listing.price) return null;
  const ratio = listing.sold_price / listing.price;
  const withinBasicBand = ratio >= 0.4 && ratio <= 1.5;

  const sameMakeSales = allSoldWithPrice.filter((l) => l.make === listing.make && l.id !== listing.id);
  if (sameMakeSales.length >= SOLD_CONFIDENCE_MIN_SAMPLE) {
    const ratios = sameMakeSales.map((l) => l.sold_price / l.price);
    const avg = ratios.reduce((a, b) => a + b, 0) / ratios.length;
    const stdDev = Math.sqrt(ratios.reduce((s, r) => s + Math.pow(r - avg, 2), 0) / ratios.length) || 0.01;
    const deviation = Math.abs(ratio - avg);
    if (deviation <= stdDev) return "High";
    if (deviation <= stdDev * 2) return "Medium";
    return "Low";
  }
  // Not enough same-make history yet — the generic band is all there is to judge against.
  return withinBasicBand ? "Medium" : "Low";
}

function CoverageMap({ coveredStates }) {
  const [hovered, setHovered] = useState(null);
  const covered = new Set(Object.values(STATE_ABBR).filter((code) => coveredStates.has(STATE_NAME_BY_CODE[code])));
  return (
    <div>
      <svg viewBox="0 0 959 593" style={{ width: "100%", height: "auto" }}>
        <title>US regional labor data coverage</title>
        {Object.entries(US_STATE_PATHS).map(([code, d]) => (
          <path
            key={code}
            d={d}
            fill={covered.has(code) ? C.green : "#D8D5CC"}
            stroke="#fff"
            strokeWidth={1}
            style={{ cursor: "pointer", transition: "opacity 120ms" }}
            onMouseEnter={() => setHovered(code)}
            onMouseLeave={() => setHovered(null)}
            opacity={hovered === code ? 0.75 : 1}
          />
        ))}
        {/* DC — a circle, not a state-shaped path, same as the source data */}
        <circle
          cx={801.3} cy={251.8} r={5}
          fill={covered.has("DC") ? C.green : "#D8D5CC"}
          stroke="#fff" strokeWidth={1.5}
          style={{ cursor: "pointer" }}
          onMouseEnter={() => setHovered("DC")}
          onMouseLeave={() => setHovered(null)}
          opacity={hovered === "DC" ? 0.75 : 1}
        />
      </svg>
      <div style={{ display: "flex", gap: 16, marginTop: 10, fontSize: 12, color: C.steel, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, background: C.green, display: "inline-block", borderRadius: 2 }} /> Real data</span>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, background: "#D8D5CC", display: "inline-block", borderRadius: 2 }} /> National average fallback</span>
        {hovered && <span style={{ fontWeight: 600, color: C.ink, marginLeft: "auto" }}>{STATE_NAME_BY_CODE[hovered]} — {covered.has(hovered) ? "Real data" : "Fallback"}</span>}
      </div>
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

// Real click-to-sort column headers — every sortable column uses this,
// consistently, across every admin table. Click once for ascending, click
// the same column again to flip to descending.
function SortableTH({ label, sortKey, sort, setSort }) {
  const active = sort.key === sortKey;
  const toggle = () => setSort(active ? { key: sortKey, dir: sort.dir === "asc" ? "desc" : "asc" } : { key: sortKey, dir: "asc" });
  return (
    <th onClick={toggle} style={{ ...TH, cursor: "pointer", userSelect: "none", color: active ? C.ink : C.steel, fontWeight: active ? 700 : 400 }}>
      {label}{active && <span style={{ marginLeft: 3 }}>{sort.dir === "asc" ? "▲" : "▼"}</span>}
    </th>
  );
}
// accessors maps a sortKey to a function pulling the comparable value off a
// row — needed for anything that isn't a plain field (credibility level,
// price-diff %, days-to-sell, etc.).
function sortRows(rows, sort, accessors = {}) {
  const getVal = accessors[sort.key] || ((r) => r[sort.key]);
  const sorted = [...rows].sort((a, b) => {
    const av = getVal(a), bv = getVal(b);
    if (typeof av === "string" || typeof bv === "string") return String(av ?? "").localeCompare(String(bv ?? ""));
    return (av ?? 0) - (bv ?? 0);
  });
  return sort.dir === "desc" ? sorted.reverse() : sorted;
}

function AdminPage() {
  const { secret } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "overview";
  const setTab = (t) => setSearchParams({ tab: t }, { replace: true });
  const [status, setStatus] = useState("checking"); // checking | denied | ready
  const [listings, setListings] = useState([]);
  const [reports, setReports] = useState([]);
  const [quizResponses, setQuizResponses] = useState([]);
  const [valuations, setValuations] = useState([]);
  const [soldListings, setSoldListings] = useState([]);
  const [stateRates, setStateRates] = useState([]);
  const [listingSort, setListingSort] = useState({ key: "created_at", dir: "desc" });
  const [xrefRowDim, setXrefRowDim] = useState("body");
  const [xrefColDim, setXrefColDim] = useState("state");
  const [listingSearch, setListingSearch] = useState("");
  const [valSort, setValSort] = useState({ key: "created_at", dir: "desc" });
  const [soldSort, setSoldSort] = useState({ key: "sold_at", dir: "desc" });
  const [quizSort, setQuizSort] = useState({ key: "created_at", dir: "desc" });
  const [manageLinkIds, setManageLinkIds] = useState(new Set());
  const [deletedListings, setDeletedListings] = useState([]);
  const [trendPeriod, setTrendPeriod] = useState("weekly");
  const [attributionEvents, setAttributionEvents] = useState([]);
  const [sessionPage, setSessionPage] = useState(0);

  useEffect(() => {
    (async () => {
      const [reportsRes, quizRes, valRes, soldRes, listingsRes, ratesRes, mlRes, trashRes, attrRes] = await Promise.all([
        supabase.rpc("admin_get_reports", { p_secret: secret }),
        supabase.rpc("admin_get_quiz_responses", { p_secret: secret }),
        supabase.rpc("admin_get_valuations", { p_secret: secret }),
        supabase.rpc("admin_get_sold_listings", { p_secret: secret }),
        supabase.from("listings").select(LISTING_COLUMNS).is("deleted_at", null),
        supabase.from("state_labor_rates").select("state,median_annual_wage,multiplier"),
        supabase.rpc("admin_get_manage_link_ids", { p_secret: secret }),
        supabase.rpc("admin_get_deleted_listings", { p_secret: secret }),
        supabase.rpc("admin_get_attribution_events", { p_secret: secret }),
      ]);
      if (reportsRes.error || quizRes.error || valRes.error || soldRes.error) { setStatus("denied"); return; }
      setReports(reportsRes.data || []);
      setQuizResponses(quizRes.data || []);
      setValuations(valRes.data || []);
      setSoldListings((soldRes.data || []).map(rowToListing));
      setListings((listingsRes.data || []).map(rowToListing));
      setStateRates(ratesRes.data || []);
      setManageLinkIds(new Set((mlRes.data || []).map((r) => r.id)));
      setDeletedListings((trashRes.data || []).map(rowToListing));
      setAttributionEvents(attrRes.data || []);
      setStatus("ready");
    })();
  }, [secret]);

  const updateReportStatus = async (reportId, newStatus) => {
    setReports(reports.map((r) => (r.id === reportId ? { ...r, status: newStatus } : r))); // optimistic
    const { error } = await supabase.rpc("admin_update_report_status", { p_secret: secret, p_report_id: reportId, p_status: newStatus });
    if (error) console.error("report status update failed:", error.message);
  };
  // Two real outcomes for a report, not just one generic "Resolved" — this
  // is what actually keeps the inbox meaningful once it has history: a
  // report that turned out fine vs. one that led to removing a real bad
  // listing are different things worth being able to tell apart later.
  const resolveNotSpam = (reportId) => updateReportStatus(reportId, "Resolved - No Issue");
  const resolveSpam = async (report) => {
    if (!window.confirm("Mark as spam and remove this listing? This can't be undone.")) return;
    const { error } = await supabase.rpc("admin_delete_listing", { p_secret: secret, p_id: report.listing_id });
    if (error) { console.error("admin delete failed:", error.message); return; }
    setListings(listings.filter((l) => l.id !== report.listing_id));
    updateReportStatus(report.id, "Resolved - Spam");
  };

  const deleteListing = async (id, fromReportId = null) => {
    const hasLink = manageLinkIds.has(id);
    const msg = hasLink
      ? "This listing has an active seller manage-link. Removing it won't notify the seller — their link will just silently stop working. It'll sit in Trash for 14 days before being gone for good. Continue?"
      : "Move this listing to Trash? It stays recoverable for 14 days, then gets purged automatically.";
    if (!window.confirm(msg)) return;
    const { error } = await supabase.rpc("admin_delete_listing", { p_secret: secret, p_id: id });
    if (error) { console.error("admin delete failed:", error.message); return; }
    const moved = listings.find((l) => l.id === id);
    setListings(listings.filter((l) => l.id !== id));
    if (moved) setDeletedListings([{ ...moved, deleted_at: new Date().toISOString() }, ...deletedListings]);
    if (fromReportId) updateReportStatus(fromReportId, "Resolved - Spam");
  };

  const restoreListing = async (id) => {
    const { error } = await supabase.rpc("admin_restore_listing", { p_secret: secret, p_id: id });
    if (error) { console.error("restore failed:", error.message); return; }
    const restored = deletedListings.find((l) => l.id === id);
    setDeletedListings(deletedListings.filter((l) => l.id !== id));
    if (restored) setListings([{ ...restored, deleted_at: null }, ...listings]);
  };

  const purgeListing = async (id) => {
    if (!window.confirm("Permanently delete this right now? This skips the rest of the 14-day window and can't be undone.")) return;
    const { error } = await supabase.rpc("admin_purge_listing", { p_secret: secret, p_id: id });
    if (error) { console.error("purge failed:", error.message); return; }
    setDeletedListings(deletedListings.filter((l) => l.id !== id));
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
  const valuationAccessors = {
    created_at: (v) => new Date(v.created_at).getTime(),
    car: (v) => `${v.year} ${v.make} ${v.model}`,
    mileage: (v) => v.mileage,
    condition: (v) => v.condition || "",
    state: (v) => v.state || "",
    originalPrice: (v) => v.originalPrice || 0,
    estimate: (v) => v.estimate || 0,
    confidence: (v) => v.confidence || "",
  };
  const sortedValuations = sortRows(valuations, valSort, valuationAccessors);
  const CRED_SORT_WEIGHT = { red: 0, yellow: 1, green: 2 };
  const listingAccessors = {
    car: (l) => `${l.year} ${l.make} ${l.model}`,
    price: (l) => l.price,
    mileage: (l) => l.mileage,
    state: (l) => l.state,
    status: (l) => (l.status === "sold" ? "Sold" : getExpiryInfo(l).expired ? "Expired" : "Active"),
    credibility: (l) => CRED_SORT_WEIGHT[l.credibility?.level] ?? 3,
    manage_link: (l) => (manageLinkIds.has(l.id) ? 1 : 0),
    created_at: (l) => new Date(l.created_at).getTime(),
  };
  const sortedListings = sortRows(withCred, listingSort, listingAccessors);
  const filteredListings = listingSearch.trim()
    ? sortedListings.filter((l) => `${l.make} ${l.model} ${l.city}`.toLowerCase().includes(listingSearch.trim().toLowerCase()))
    : sortedListings;

  // ----- Coverage tracker -----
  const coveredStates = new Set(stateRates.map((r) => r.state));
  const missingStates = US_STATES.filter((s) => !coveredStates.has(s));
  const coveredMakes = Object.keys(BRAND_REPAIR_COST);
  const missingMakes = POPULAR_MAKES.filter((m) => !coveredMakes.includes(m));

  // ----- Sold-price averages by make (only where a real sold price was reported) -----
  const soldWithPrice = soldListings.filter((l) => l.sold_price);
  const soldWithConfidence = soldWithPrice.map((l) => ({ ...l, confidence: computeSaleConfidence(l, soldWithPrice) }));
  const soldIncludedInAverages = soldWithConfidence.filter((l) => l.confidence !== "Low" || l.sold_confidence_override);
  const soldNeedingReview = soldWithConfidence.filter((l) => l.confidence === "Low" && !l.sold_confidence_override);
  const soldByMake = {};
  soldIncludedInAverages.forEach((l) => {
    if (!soldByMake[l.make]) soldByMake[l.make] = [];
    soldByMake[l.make].push(((l.sold_price - l.price) / l.price) * 100);
  });
  const soldByMakeEntries = Object.entries(soldByMake)
    .map(([make, diffs]) => ({ make, count: diffs.length, avgPct: Math.round(diffs.reduce((s, d) => s + d, 0) / diffs.length) }))
    .sort((a, b) => b.avgPct - a.avgPct);

  const setSoldOverride = async (id, override) => {
    setSoldListings(soldListings.map((l) => (l.id === id ? { ...l, sold_confidence_override: override } : l)));
    const { error } = await supabase.rpc("admin_set_sold_confidence_override", { p_secret: secret, p_id: id, p_override: override });
    if (error) console.error("sold confidence override failed:", error.message);
  };
  const clearSoldPrice = async (id) => {
    if (!window.confirm("Clear this reported sold price? The listing stays marked sold, just without a price.")) return;
    setSoldListings(soldListings.map((l) => (l.id === id ? { ...l, sold_price: null, sold_confidence_override: false } : l)));
    const { error } = await supabase.rpc("admin_clear_sold_price", { p_secret: secret, p_id: id });
    if (error) console.error("clear sold price failed:", error.message);
  };


  // ----- Cross-reference tool -----
  // Real pivot table — pick any two dimensions, see a count matrix. This is
  // what "cross-reference" should have meant from the start; a single
  // filter dropdown pair wasn't actually cross-referencing anything.
  const XREF_DIMENSIONS = { make: "Make", body: "Body type", state: "State", condition: "Condition" };
  const xrefRowValues = [...new Set(listings.map((l) => l[xrefRowDim]))].filter(Boolean).sort().slice(0, 12);
  const xrefColValues = [...new Set(listings.map((l) => l[xrefColDim]))].filter(Boolean).sort().slice(0, 8);
  const xrefMatrix = xrefRowValues.map((rv) => xrefColValues.map((cv) => listings.filter((l) => l[xrefRowDim] === rv && l[xrefColDim] === cv).length));
  const xrefMax = Math.max(1, ...xrefMatrix.flat());
  // Same two dimensions, average price instead of count — worth having
  // alongside the count matrix since "how many" and "how much" tell
  // different stories over the same breakdown.
  const xrefPriceMatrix = xrefRowValues.map((rv) => xrefColValues.map((cv) => {
    const matches = listings.filter((l) => l[xrefRowDim] === rv && l[xrefColDim] === cv);
    return matches.length ? Math.round(matches.reduce((s, l) => s + l.price, 0) / matches.length) : null;
  }));
  const xrefPriceValues = xrefPriceMatrix.flat().filter((v) => v != null);
  const xrefPriceMin = xrefPriceValues.length ? Math.min(...xrefPriceValues) : 0;
  const xrefPriceMax = xrefPriceValues.length ? Math.max(...xrefPriceValues) : 1;

  const pendingReports = reports.filter((r) => !r.status || r.status === "New");
  const resolvedNoIssue = reports.filter((r) => r.status === "Resolved - No Issue" || r.status === "Resolved"); // old generic "Resolved" from before this redesign lands here
  const resolvedSpam = reports.filter((r) => r.status === "Resolved - Spam");
  // ----- Weekly/monthly/yearly trends — aggregate only, by design. Every
  // number here is a count or an average within a time bucket, never a row
  // that could identify a specific seller or buyer — same discipline this
  // whole dashboard should hold going forward as more data products get
  // built on top of it.
  function getPeriodBucket(iso, period) {
    const d = new Date(iso);
    if (period === "yearly") { const key = `${d.getFullYear()}`; return { key, label: key }; }
    if (period === "monthly") { const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; return { key, label: d.toLocaleString("en-US", { month: "short", year: "numeric" }) }; }
    const day = d.getDay();
    const monday = new Date(d);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(d.getDate() + ((day === 0 ? -6 : 1) - day));
    const key = monday.toISOString().slice(0, 10);
    return { key, label: `Week of ${String(monday.getMonth() + 1).padStart(2, "0")}/${String(monday.getDate()).padStart(2, "0")}` };
  }
  const trendMap = {};
  const addToTrend = (iso, field) => {
    if (!iso) return;
    const { key, label } = getPeriodBucket(iso, trendPeriod);
    if (!trendMap[key]) trendMap[key] = { key, label, newListings: 0, quiz: 0, valuations: 0, sold: 0, soldDiffs: [] };
    trendMap[key][field]++;
  };
  listings.forEach((l) => addToTrend(l.created_at, "newListings"));
  quizResponses.forEach((r) => addToTrend(r.created_at, "quiz"));
  valuations.forEach((v) => addToTrend(v.created_at, "valuations"));
  soldListings.forEach((l) => addToTrend(l.sold_at, "sold"));
  soldIncludedInAverages.forEach((l) => {
    if (!l.sold_at) return;
    const { key } = getPeriodBucket(l.sold_at, trendPeriod);
    if (trendMap[key]) trendMap[key].soldDiffs.push(((l.sold_price - l.price) / l.price) * 100);
  });
  const trendRows = Object.values(trendMap).sort((a, b) => b.key.localeCompare(a.key)).slice(0, 12);

  // ----- QR/flyer attribution breakdown — aggregate counts only, grouped by
  // source tag and by what action (if any) followed the landing. -----
  const attributionBySource = {};
  attributionEvents.forEach((e) => {
    const src = e.payload?.src;
    if (!src) return;
    if (!attributionBySource[src]) attributionBySource[src] = { landings: 0, valuations: 0, quizzes: 0, listingViews: 0, other: 0 };
    if (e.type === "qr_landing") attributionBySource[src].landings++;
    else if (e.type === "valuation_submitted") attributionBySource[src].valuations++;
    else if (e.type === "quiz_complete") attributionBySource[src].quizzes++;
    else if (e.type === "listing_view") attributionBySource[src].listingViews++;
    else attributionBySource[src].other++;
  });
  const attributionEntries = Object.entries(attributionBySource).sort((a, b) => b[1].landings - a[1].landings);

  // Chart data — three angles on the same QR traffic, aggregate only.
  const qrTotals = Object.values(attributionBySource).reduce((acc, c) => ({
    landings: acc.landings + c.landings, valuations: acc.valuations + c.valuations,
    quizzes: acc.quizzes + c.quizzes, listingViews: acc.listingViews + c.listingViews, other: acc.other + c.other,
  }), { landings: 0, valuations: 0, quizzes: 0, listingViews: 0, other: 0 });
  const qrActionBreakdown = [
    { label: "Valuations", value: qrTotals.valuations },
    { label: "Quiz done", value: qrTotals.quizzes },
    { label: "Listings viewed", value: qrTotals.listingViews },
    { label: "Other", value: qrTotals.other },
  ];
  const qrArchetypeCounts = {};
  quizResponses.forEach((r) => { if (r.source) qrArchetypeCounts[r.archetype] = (qrArchetypeCounts[r.archetype] || 0) + 1; });
  const qrArchetypeChart = Object.entries(qrArchetypeCounts).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);

  // Per-session breakdown — the actual "individual visitor" view. Grouped
  // by the anonymous session_id, combining their valuation(s), quiz
  // result(s), listing(s) posted, and listings they viewed. No name, no
  // contact info — just a consistent anonymous id tying one visit's
  // actions together.
  const sessionMap = {};
  const ensureSession = (sessionId, src) => {
    if (!sessionId) return null;
    if (!sessionMap[sessionId]) sessionMap[sessionId] = { sessionId, src, valuations: [], quizzes: [], listings: [], listingViews: [], firstSeen: null };
    return sessionMap[sessionId];
  };
  valuations.forEach((v) => { const s = ensureSession(v.session_id, v.source); if (s) { s.valuations.push(v); if (!s.firstSeen || v.created_at < s.firstSeen) s.firstSeen = v.created_at; } });
  quizResponses.forEach((r) => { const s = ensureSession(r.session_id, r.source); if (s) { s.quizzes.push(r); if (!s.firstSeen || r.created_at < s.firstSeen) s.firstSeen = r.created_at; } });
  listings.forEach((l) => { const s = ensureSession(l.session_id, l.source); if (s) { s.listings.push(l); if (!s.firstSeen || l.created_at < s.firstSeen) s.firstSeen = l.created_at; } });
  attributionEvents.forEach((e) => {
    const sid = e.payload?.session_id;
    if (!sid || e.type !== "listing_view") return;
    const s = ensureSession(sid, e.payload?.src);
    if (s) { s.listingViews.push(e); if (!s.firstSeen || e.created_at < s.firstSeen) s.firstSeen = e.created_at; }
  });
  const sessionEntries = Object.values(sessionMap).sort((a, b) => new Date(b.firstSeen || 0) - new Date(a.firstSeen || 0));
  const SESSIONS_PER_PAGE = 10;
  const sessionPageCount = Math.max(1, Math.ceil(sessionEntries.length / SESSIONS_PER_PAGE));
  const sessionPageClamped = Math.min(sessionPage, sessionPageCount - 1);
  const sessionPageRows = sessionEntries.slice(sessionPageClamped * SESSIONS_PER_PAGE, sessionPageClamped * SESSIONS_PER_PAGE + SESSIONS_PER_PAGE);

  const TABS = [
    { key: "overview", label: "Overview" },
    { key: "trends", label: "Trends" },
    { key: "listings", label: `Listings (${listings.length})` },
    { key: "quiz", label: `Quiz (${quizResponses.length})` },
    { key: "valuations", label: `Valuations (${valuations.length})` },
    { key: "sold", label: `Sold analytics (${soldListings.length})` },
    { key: "coverage", label: "Data coverage" },
    { key: "xref", label: "Cross-reference" },
    { key: "reports", label: `Reports (${pendingReports.length})` },
    { key: "qr", label: "QR results" },
    { key: "trash", label: `Trash (${deletedListings.length})` },
  ];

  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", padding: "32px 20px 60px" }}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={{ fontFamily: FONT_HEAD, fontSize: 24, color: C.ink, marginBottom: 12 }}>Admin dashboard</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
          <button onClick={() => setTab("listings")} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, padding: "6px 12px", borderRadius: 20, border: `1px solid ${C.line}`, background: "#fff", cursor: "pointer", color: C.ink }}>
            <strong>{listings.length}</strong> listings
            <span style={{ display: "flex", gap: 3, marginLeft: 2 }}>
              <span title="No issues" style={{ width: 7, height: 7, borderRadius: "50%", background: C.green, display: "inline-block" }} />
              <span title="Worth a look" style={{ width: 7, height: 7, borderRadius: "50%", background: "#E0B33C", display: "inline-block" }} />
              <span title="Flagged" style={{ width: 7, height: 7, borderRadius: "50%", background: "#A32D2D", display: "inline-block" }} />
            </span>
          </button>
          <button onClick={() => setTab("quiz")} style={{ fontSize: 12.5, padding: "6px 12px", borderRadius: 20, border: `1px solid ${C.line}`, background: "#fff", cursor: "pointer", color: C.ink }}><strong>{quizResponses.length}</strong> quiz completions</button>
          <button onClick={() => setTab("valuations")} style={{ fontSize: 12.5, padding: "6px 12px", borderRadius: 20, border: `1px solid ${C.line}`, background: "#fff", cursor: "pointer", color: C.ink }}><strong>{valuations.length}</strong> valuations</button>
          <button onClick={() => setTab("reports")} style={{ fontSize: 12.5, padding: "6px 12px", borderRadius: 20, border: pendingReports.length > 0 ? "none" : `1px solid ${C.line}`, background: pendingReports.length > 0 ? "#FBE4E3" : "#fff", cursor: "pointer", color: pendingReports.length > 0 ? "#A32D2D" : C.ink, fontWeight: pendingReports.length > 0 ? 600 : 400 }}><strong>{pendingReports.length}</strong> pending report{pendingReports.length === 1 ? "" : "s"}</button>
        </div>
      </div>

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

      {tab === "trends" && (
        <AdminSection title="Trends" span="full">
          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
            {[{ k: "weekly", l: "Weekly" }, { k: "monthly", l: "Monthly" }, { k: "yearly", l: "Yearly" }].map((p) => (
              <button key={p.k} onClick={() => setTrendPeriod(p.k)} style={{ fontSize: 12, padding: "6px 14px", borderRadius: 4, cursor: "pointer", border: trendPeriod === p.k ? "none" : `1px solid ${C.line}`, background: trendPeriod === p.k ? C.yellow : "#fff", fontWeight: trendPeriod === p.k ? 600 : 400 }}>{p.l}</button>
            ))}
          </div>
          {trendRows.length === 0 ? <div style={{ fontSize: 13, color: C.steel }}>Not enough data yet to show trends.</div> : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>{["Period", "New listings", "Quiz completions", "Valuations", "Sold", "Avg sold vs. asking"].map((h) => <th key={h} style={TH}>{h}</th>)}</tr></thead>
                <tbody>
                  {trendRows.map((row) => {
                    const avgDiff = row.soldDiffs.length ? Math.round(row.soldDiffs.reduce((s, d) => s + d, 0) / row.soldDiffs.length) : null;
                    return (
                      <tr key={row.key}>
                        <td style={{ ...TD, fontWeight: 600 }}>{row.label}</td>
                        <td style={TD}>{row.newListings}</td>
                        <td style={TD}>{row.quiz}</td>
                        <td style={TD}>{row.valuations}</td>
                        <td style={TD}>{row.sold}</td>
                        <td style={{ ...TD, color: avgDiff == null ? C.steel : avgDiff < 0 ? "#A32D2D" : C.green }}>{avgDiff == null ? "—" : `${avgDiff > 0 ? "+" : ""}${avgDiff}%`}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </AdminSection>
      )}

      {tab === "qr" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 16, marginBottom: 16 }}>
            {/* LEFT — aggregated data pool, consolidated */}
            <AdminSection title="QR / flyer attribution — overview">
              <div style={{ fontSize: 11.5, color: C.steel, marginBottom: 14, lineHeight: 1.6 }}>
                A tagged link (<code>?src=name</code>) gets tracked from the moment someone lands, for the rest of that visit.
              </div>
              <div style={{ display: "flex", gap: 20, marginBottom: 18 }}>
                <div><div style={{ fontFamily: FONT_HEAD, fontSize: 26, color: C.ink }}>{qrTotals.landings}</div><div style={{ fontSize: 11, color: C.steel }}>Total landings</div></div>
                <div><div style={{ fontFamily: FONT_HEAD, fontSize: 26, color: C.green }}>{qrTotals.landings ? Math.round(((qrTotals.valuations + qrTotals.quizzes + qrTotals.listingViews + qrTotals.other) / qrTotals.landings) * 100) : 0}%</div><div style={{ fontSize: 11, color: C.steel }}>Took an action</div></div>
              </div>
              {attributionEntries.length === 0 ? (
                <div style={{ fontSize: 13, color: C.steel }}>No tagged traffic yet.</div>
              ) : (
                <div>
                  {attributionEntries.map(([src, counts]) => (
                    <div key={src} style={{ padding: "8px 0", borderBottom: `1px solid ${C.line}` }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, marginBottom: 3 }}>{src}</div>
                      <div style={{ fontSize: 11, color: C.steel }}>{counts.landings} landed · {counts.valuations} valuations · {counts.quizzes} quizzes · {counts.listingViews} views</div>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ fontSize: 10.5, color: C.steel, marginTop: 14 }}>
                Honest limitation: only counts someone who actually loaded the page — a scan that never opened the link isn't measurable.
              </div>
            </AdminSection>

            {/* RIGHT — horizontal-scroll chart carousel */}
            <div style={{ overflowX: "auto", scrollSnapType: "x mandatory", display: "flex", gap: 14, paddingBottom: 6 }}>
              <MiniBarChart title="Landings by source" data={attributionEntries.map(([src, c]) => ({ label: src, value: c.landings }))} />
              <MiniBarChart title="What QR visitors did" data={qrActionBreakdown} />
              <MiniBarChart title="Quiz results from QR traffic" data={qrArchetypeChart} />
            </div>
          </div>

          {/* BOTTOM — per-visitor breakdown, paginated 10 at a time */}
          <AdminSection title={`Individual visitors (${sessionEntries.length})`} span="full">
            <div style={{ fontSize: 11.5, color: C.steel, marginBottom: 14 }}>
              Each row is one anonymous visit — no name or contact info, just a consistent id tying together what that one visitor actually did.
            </div>
            {sessionEntries.length === 0 ? (
              <div style={{ fontSize: 13, color: C.steel }}>No individual QR visitors tracked yet.</div>
            ) : (
              <>
                {sessionPageRows.map((s) => (
                  <div key={s.sessionId} style={{ padding: "10px 0", borderBottom: `1px solid ${C.line}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: C.ink }}>{s.src}</span>
                      <span style={{ fontSize: 11, color: C.steel }}>{s.firstSeen ? adminDate(s.firstSeen) : "—"}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "#3B4250", marginTop: 4, lineHeight: 1.6 }}>
                      {s.valuations.map((v, i) => <div key={`v${i}`}>Valuation: {v.year} {v.make} {v.model} → {fmtPrice(v.estimate)}</div>)}
                      {s.quizzes.map((r, i) => <div key={`q${i}`}>Quiz: {r.archetype}</div>)}
                      {s.listings.map((l, i) => <div key={`l${i}`}>Posted: {l.year} {l.make} {l.model} — {fmtPrice(l.price)}</div>)}
                      {s.listingViews.length > 0 && <div>Viewed {s.listingViews.length} listing{s.listingViews.length === 1 ? "" : "s"}</div>}
                      {s.valuations.length === 0 && s.quizzes.length === 0 && s.listings.length === 0 && s.listingViews.length === 0 && <div style={{ fontStyle: "italic", color: C.steel }}>Landed, no further action yet</div>}
                    </div>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
                  <button onClick={() => setSessionPage((p) => Math.max(0, p - 1))} disabled={sessionPageClamped === 0} style={{ fontSize: 11.5, padding: "5px 12px", borderRadius: 4, cursor: sessionPageClamped === 0 ? "default" : "pointer", border: `1px solid ${C.line}`, background: "#fff", opacity: sessionPageClamped === 0 ? 0.4 : 1 }}>← Previous</button>
                  <span style={{ fontSize: 11.5, color: C.steel }}>Page {sessionPageClamped + 1} of {sessionPageCount}</span>
                  <button onClick={() => setSessionPage((p) => Math.min(sessionPageCount - 1, p + 1))} disabled={sessionPageClamped >= sessionPageCount - 1} style={{ fontSize: 11.5, padding: "5px 12px", borderRadius: 4, cursor: sessionPageClamped >= sessionPageCount - 1 ? "default" : "pointer", border: `1px solid ${C.line}`, background: "#fff", opacity: sessionPageClamped >= sessionPageCount - 1 ? 0.4 : 1 }}>Next →</button>
                </div>
              </>
            )}
          </AdminSection>
        </div>
      )}

      {tab === "listings" && (
        <AdminSection title="All listings" span="full">
          <div style={{ display: "flex", gap: 10, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
            <input value={listingSearch} onChange={(e) => setListingSearch(e.target.value)} placeholder="Search make, model, or city…" style={{ ...inputStyle, width: 240 }} />
            <button onClick={() => downloadCSV("highwaylot-listings.csv", filteredListings, [
              { label: "Year", value: "year" }, { label: "Make", value: "make" }, { label: "Model", value: "model" }, { label: "Trim", value: "trim" },
              { label: "Price", value: "price" }, { label: "Mileage", value: "mileage" }, { label: "City", value: "city" }, { label: "State", value: "state" },
              { label: "Status", value: (l) => (l.status === "sold" ? "Sold" : getExpiryInfo(l).expired ? "Expired" : "Active") },
              { label: "Credibility", value: (l) => l.credibility?.level }, { label: "Posted", value: "created_at" },
            ])} style={{ fontSize: 11.5, padding: "4px 10px", borderRadius: 4, cursor: "pointer", border: `1px solid ${C.line}`, background: "#fff", marginLeft: "auto" }}>Export CSV</button>
          </div>
          <div style={{ fontSize: 11, color: C.steel, marginBottom: 8 }}>Click any column header to sort — click again to reverse.</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <SortableTH label="Car" sortKey="car" sort={listingSort} setSort={setListingSort} />
                  <SortableTH label="Price" sortKey="price" sort={listingSort} setSort={setListingSort} />
                  <SortableTH label="Mileage" sortKey="mileage" sort={listingSort} setSort={setListingSort} />
                  <SortableTH label="State" sortKey="state" sort={listingSort} setSort={setListingSort} />
                  <SortableTH label="Status" sortKey="status" sort={listingSort} setSort={setListingSort} />
                  <SortableTH label="Credibility" sortKey="credibility" sort={listingSort} setSort={setListingSort} />
                  <SortableTH label="Manage-link" sortKey="manage_link" sort={listingSort} setSort={setListingSort} />
                  <SortableTH label="Posted" sortKey="created_at" sort={listingSort} setSort={setListingSort} />
                  <th style={TH}></th>
                </tr>
              </thead>
              <tbody>
                {filteredListings.map((l) => (
                  <tr key={l.id}>
                    <td style={TD}>{l.year} {l.make} {l.model}<SourceBadge source={l.source} /></td>
                    <td style={TD}>{fmtPrice(l.price)}</td>
                    <td style={TD}>{fmtMiles(l.mileage)}</td>
                    <td style={TD}>{stateAbbr(l.state)}</td>
                    <td style={TD}>{l.status === "sold" ? "Sold" : getExpiryInfo(l).expired ? "Expired" : "Active"}</td>
                    <td style={TD}><CredibilityDot credibility={l.credibility} /></td>
                    <td style={TD}>{manageLinkIds.has(l.id) ? <span style={{ color: C.green }}>Active</span> : <span style={{ color: C.steel }}>None (test data)</span>}</td>
                    <td style={TD}>{adminDate(l.created_at)}</td>
                    <td style={TD}><button onClick={() => deleteListing(l.id)} style={{ fontSize: 11, color: "#A32D2D", background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline" }}>Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminSection>
      )}

      {tab === "quiz" && (
        <AdminSection title="Individual quiz responses" span="full">
          {quizResponses.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <button onClick={() => downloadCSV("highwaylot-quiz-responses.csv", quizResponses, [
                { label: "Date", value: "created_at" }, { label: "Archetype", value: "archetype" },
                ...QUIZ_STATEMENTS.map((s) => ({ label: s.key, value: (r) => r.answers?.[s.key] })),
              ])} style={{ fontSize: 11.5, padding: "4px 10px", borderRadius: 4, cursor: "pointer", border: `1px solid ${C.line}`, background: "#fff" }}>Export CSV</button>
            </div>
          )}
          <div style={{ fontSize: 11, color: C.steel, marginBottom: 8 }}>Click any column header to sort — click again to reverse.</div>
          {quizResponses.length === 0 ? <div style={{ fontSize: 13, color: C.steel }}>No quiz completions yet.</div> : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <SortableTH label="Date" sortKey="created_at" sort={quizSort} setSort={setQuizSort} />
                    <SortableTH label="Result" sortKey="archetype" sort={quizSort} setSort={setQuizSort} />
                    {QUIZ_STATEMENTS.map((s) => <SortableTH key={s.key} label={s.key} sortKey={s.key} sort={quizSort} setSort={setQuizSort} />)}
                  </tr>
                </thead>
                <tbody>
                  {sortRows(quizResponses, quizSort, {
                    created_at: (r) => new Date(r.created_at).getTime(),
                    archetype: (r) => r.archetype || "",
                    ...Object.fromEntries(QUIZ_STATEMENTS.map((s) => [s.key, (r) => r.answers?.[s.key] ?? -1])),
                  }).map((r) => (
                    <tr key={r.id}>
                      <td style={TD}>{adminDate(r.created_at)}</td>
                      <td style={{ ...TD, fontWeight: 600 }}>{r.archetype}<SourceBadge source={r.source} /></td>
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
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
            {valuations.length > 0 && (
              <button onClick={() => downloadCSV("highwaylot-valuations.csv", sortedValuations, [
                { label: "Date", value: "created_at" }, { label: "Year", value: "year" }, { label: "Make", value: "make" }, { label: "Model", value: "model" },
                { label: "Mileage", value: "mileage" }, { label: "Condition", value: "condition" }, { label: "State", value: "state" },
                { label: "Original Price", value: "originalPrice" }, { label: "Estimate", value: "estimate" }, { label: "Confidence", value: "confidence" },
              ])} style={{ fontSize: 11.5, padding: "4px 10px", borderRadius: 4, cursor: "pointer", border: `1px solid ${C.line}`, background: "#fff" }}>Export CSV</button>
            )}
          </div>
          <div style={{ fontSize: 11, color: C.steel, marginBottom: 8 }}>Click any column header to sort — click again to reverse.</div>
          {valuations.length === 0 ? <div style={{ fontSize: 13, color: C.steel }}>No submissions yet.</div> : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <SortableTH label="Date" sortKey="created_at" sort={valSort} setSort={setValSort} />
                    <SortableTH label="Car" sortKey="car" sort={valSort} setSort={setValSort} />
                    <SortableTH label="Mileage" sortKey="mileage" sort={valSort} setSort={setValSort} />
                    <SortableTH label="Condition" sortKey="condition" sort={valSort} setSort={setValSort} />
                    <SortableTH label="State" sortKey="state" sort={valSort} setSort={setValSort} />
                    <SortableTH label="Original price" sortKey="originalPrice" sort={valSort} setSort={setValSort} />
                    <SortableTH label="Estimate" sortKey="estimate" sort={valSort} setSort={setValSort} />
                    <SortableTH label="Confidence" sortKey="confidence" sort={valSort} setSort={setValSort} />
                  </tr>
                </thead>
                <tbody>
                  {sortedValuations.map((v) => (
                    <tr key={v.id}>
                      <td style={TD}>{adminDate(v.created_at)}</td>
                      <td style={TD}>{v.year} {v.make} {v.model}<SourceBadge source={v.source} /></td>
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 16 }}>
          <AdminSection title="Average sold vs. asking, by make">
            <div style={{ fontSize: 11.5, color: C.steel, marginBottom: 10 }}>Low-confidence entries are excluded automatically — see "Needs review" below.</div>
            {soldByMakeEntries.length === 0 ? <div style={{ fontSize: 13, color: C.steel }}>No sold prices reported yet.</div> :
              soldByMakeEntries.map((e) => (
                <div key={e.make} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "5px 0", borderBottom: `1px solid ${C.line}` }}>
                  <span>{e.make} <span style={{ color: C.steel, fontSize: 11.5 }}>({e.count})</span></span>
                  <span style={{ fontWeight: 600, color: e.avgPct < 0 ? "#A32D2D" : C.green }}>{e.avgPct > 0 ? "+" : ""}{e.avgPct}%</span>
                </div>
              ))}
          </AdminSection>
          {soldNeedingReview.length > 0 && (
            <AdminSection title={`Needs review (${soldNeedingReview.length})`}>
              <div style={{ fontSize: 11.5, color: C.steel, marginBottom: 10 }}>Flagged as an unlikely price — a plausible real outlier can still be included on purpose.</div>
              {soldNeedingReview.map((l) => (
                <div key={l.id} style={{ padding: "8px 0", borderBottom: `1px solid ${C.line}` }}>
                  <div style={{ fontSize: 13, color: C.ink }}>{l.year} {l.make} {l.model} — {fmtPrice(l.price)} → {fmtPrice(l.sold_price)}</div>
                  <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                    <button onClick={() => setSoldOverride(l.id, true)} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 4, cursor: "pointer", border: "none", background: C.greenBg, color: C.green }}>Include anyway</button>
                    <button onClick={() => clearSoldPrice(l.id)} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 4, cursor: "pointer", border: "none", background: "#FBE4E3", color: "#A32D2D" }}>Clear price</button>
                  </div>
                </div>
              ))}
            </AdminSection>
          )}
        </div>
      )}
      {tab === "sold" && (
        <AdminSection title="Sold — asking price vs. real sale price" span="full">
          <div style={{ fontSize: 12, color: C.steel, marginBottom: 12 }}>Sold price is private — sellers can optionally report it, it's never shown publicly. This is the only place it's visible.</div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
            {soldListings.length > 0 && (
              <button onClick={() => downloadCSV("highwaylot-sold.csv", soldListings, [
                { label: "Year", value: "year" }, { label: "Make", value: "make" }, { label: "Model", value: "model" }, { label: "State", value: "state" },
                { label: "Asking", value: "price" }, { label: "Sold For", value: "sold_price" },
                { label: "Confidence", value: (l) => computeSaleConfidence(l, soldWithPrice) || "" },
                { label: "Sold Date", value: "sold_at" }, { label: "Posted Date", value: "created_at" },
              ])} style={{ fontSize: 11.5, padding: "4px 10px", borderRadius: 4, cursor: "pointer", border: `1px solid ${C.line}`, background: "#fff" }}>Export CSV</button>
            )}
          </div>
          <div style={{ fontSize: 11, color: C.steel, marginBottom: 8 }}>Click any column header to sort — click again to reverse.</div>
          {soldListings.length === 0 ? <div style={{ fontSize: 13, color: C.steel }}>No sold listings yet.</div> : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <SortableTH label="Car" sortKey="car" sort={soldSort} setSort={setSoldSort} />
                    <SortableTH label="State" sortKey="state" sort={soldSort} setSort={setSoldSort} />
                    <SortableTH label="Asking" sortKey="price" sort={soldSort} setSort={setSoldSort} />
                    <SortableTH label="Sold for" sortKey="sold_price" sort={soldSort} setSort={setSoldSort} />
                    <SortableTH label="Difference" sortKey="diff" sort={soldSort} setSort={setSoldSort} />
                    <SortableTH label="Confidence" sortKey="confidence" sort={soldSort} setSort={setSoldSort} />
                    <SortableTH label="Days to sell" sortKey="days" sort={soldSort} setSort={setSoldSort} />
                    <th style={TH}></th>
                  </tr>
                </thead>
                <tbody>
                  {sortRows(soldListings, soldSort, {
                    car: (l) => `${l.year} ${l.make} ${l.model}`,
                    state: (l) => l.state,
                    price: (l) => l.price,
                    sold_price: (l) => l.sold_price || 0,
                    diff: (l) => (l.sold_price ? (l.sold_price - l.price) / l.price : -999),
                    confidence: (l) => { const order = { High: 2, Medium: 1, Low: 0 }; return order[computeSaleConfidence(l, soldWithPrice)] ?? -1; },
                    days: (l) => (l.sold_at ? (new Date(l.sold_at) - new Date(l.created_at)) / 86400000 : -1),
                    sold_at: (l) => new Date(l.sold_at || 0).getTime(),
                  }).map((l) => {
                    const daysToSell = l.sold_at ? Math.round((new Date(l.sold_at) - new Date(l.created_at)) / 86400000) : null;
                    const diffPct = l.sold_price ? Math.round(((l.sold_price - l.price) / l.price) * 100) : null;
                    const confidence = l.sold_price ? computeSaleConfidence(l, soldWithPrice) : null;
                    const confColor = confidence === "High" ? C.green : confidence === "Medium" ? C.yellowDark : confidence === "Low" ? "#A32D2D" : C.steel;
                    return (
                      <tr key={l.id}>
                        <td style={TD}>{l.year} {l.make} {l.model}</td>
                        <td style={TD}>{stateAbbr(l.state)}</td>
                        <td style={TD}>{fmtPrice(l.price)}</td>
                        <td style={TD}>{l.sold_price ? fmtPrice(l.sold_price) : <span style={{ color: C.steel, fontStyle: "italic" }}>Not reported</span>}</td>
                        <td style={{ ...TD, color: diffPct == null ? C.steel : diffPct < 0 ? "#A32D2D" : C.green }}>{diffPct == null ? "—" : `${diffPct > 0 ? "+" : ""}${diffPct}%`}</td>
                        <td style={{ ...TD, color: confColor, fontWeight: 600 }}>{confidence || "—"}{l.sold_confidence_override && confidence === "Low" ? " (included)" : ""}</td>
                        <td style={TD}>{daysToSell == null ? "—" : `${daysToSell}d`}</td>
                        <td style={TD}>{l.sold_price && <button onClick={() => clearSoldPrice(l.id)} style={{ fontSize: 11, color: "#A32D2D", background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline" }}>Clear price</button>}</td>
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
        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 16 }}>
          <AdminSection title="Regional labor data">
            <SimpleBarRow label={`${coveredStates.size} of ${US_STATES.length} states`} value={coveredStates.size} max={US_STATES.length} />
            <div style={{ fontSize: 12, color: C.steel, margin: "10px 0 14px" }}>States without real BLS data fall back to the national average, not a guess.</div>
            <CoverageMap coveredStates={coveredStates} />
            <div style={{ fontSize: 11.5, color: C.steel, marginTop: 14, lineHeight: 1.7 }}><strong>Missing:</strong> {missingStates.join(", ")}</div>
          </AdminSection>
          <AdminSection title="Brand repair-cost data">
            <SimpleBarRow label={`${coveredMakes.length} of ${POPULAR_MAKES.length} makes`} value={coveredMakes.length} max={POPULAR_MAKES.length} />
            <div style={{ fontSize: 12, color: C.steel, margin: "10px 0 14px" }}>Makes without real RepairPal data fall back to a neutral multiplier, not a guess.</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {POPULAR_MAKES.map((m) => {
                const has = coveredMakes.includes(m);
                return (
                  <span key={m} style={{
                    fontSize: 12, padding: "5px 10px", borderRadius: 20,
                    background: has ? (MAKE_COLORS[m] || C.ink) : "#fff",
                    color: has ? "#fff" : C.steel,
                    border: has ? "none" : `1px solid ${C.line}`,
                  }}>{m}</span>
                );
              })}
            </div>
          </AdminSection>
        </div>
      )}

      {tab === "xref" && (
        <AdminSection title="Cross-reference" span="full">
          <div style={{ fontSize: 12, color: C.steel, marginBottom: 14 }}>Pick two dimensions to see how listings break down across both at once. Showing top values if either has more than the table can fit cleanly.</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
            <label style={{ fontSize: 12, color: C.steel }}>Rows:</label>
            <select value={xrefRowDim} onChange={(e) => { const v = e.target.value; setXrefRowDim(v); if (v === xrefColDim) setXrefColDim(Object.keys(XREF_DIMENSIONS).find((k) => k !== v)); }} style={{ ...inputStyle, width: 160 }}>
              {Object.entries(XREF_DIMENSIONS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
            <label style={{ fontSize: 12, color: C.steel }}>Columns:</label>
            <select value={xrefColDim} onChange={(e) => setXrefColDim(e.target.value)} style={{ ...inputStyle, width: 160 }}>
              {Object.entries(XREF_DIMENSIONS).filter(([k]) => k !== xrefRowDim).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </div>
          {listings.length === 0 ? <div style={{ fontSize: 13, color: C.steel }}>No listings yet.</div> : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={TH}></th>
                    {xrefColValues.map((cv) => <th key={cv} style={{ ...TH, textAlign: "center" }}>{cv}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {xrefRowValues.map((rv, ri) => (
                    <tr key={rv}>
                      <td style={{ ...TD, fontWeight: 600 }}>{rv}</td>
                      {xrefColValues.map((cv, ci) => {
                        const count = xrefMatrix[ri][ci];
                        const intensity = count / xrefMax;
                        return (
                          <td key={cv} style={{ ...TD, textAlign: "center", background: count > 0 ? `rgba(245,183,0,${0.15 + intensity * 0.55})` : "transparent", fontWeight: count > 0 ? 600 : 400, color: count > 0 ? C.ink : C.steel }}>
                            {count || "—"}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminSection>
      )}

      {tab === "xref" && (
        <AdminSection title="Average price, same two dimensions" span="full">
          {listings.length === 0 ? <div style={{ fontSize: 13, color: C.steel }}>No listings yet.</div> : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={TH}></th>
                    {xrefColValues.map((cv) => <th key={cv} style={{ ...TH, textAlign: "center" }}>{cv}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {xrefRowValues.map((rv, ri) => (
                    <tr key={rv}>
                      <td style={{ ...TD, fontWeight: 600 }}>{rv}</td>
                      {xrefColValues.map((cv, ci) => {
                        const price = xrefPriceMatrix[ri][ci];
                        const intensity = price != null && xrefPriceMax > xrefPriceMin ? (price - xrefPriceMin) / (xrefPriceMax - xrefPriceMin) : 0;
                        return (
                          <td key={cv} style={{ ...TD, textAlign: "center", background: price != null ? `rgba(43,116,126,${0.12 + intensity * 0.4})` : "transparent", fontWeight: price != null ? 600 : 400, color: price != null ? C.ink : C.steel }}>
                            {price != null ? fmtPrice(price) : "—"}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminSection>
      )}

      {tab === "reports" && (
        <div>
          <AdminSection title={`Inbox (${pendingReports.length})`} span="full">
            {pendingReports.length === 0 ? <div style={{ fontSize: 13, color: C.steel }}>Nothing pending — you're caught up.</div> : pendingReports.map((r) => {
              const listing = withCred.find((l) => l.id === r.listing_id);
              return (
                <div key={r.id} style={{ borderBottom: `1px solid ${C.line}`, padding: "14px 0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ fontSize: 12.5, color: C.steel }}>{r.reason} · {adminDate(r.created_at)}</div>
                    {listing && <Link to={`/listing/${listing.id}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: C.ink, textDecoration: "underline" }}>View listing ↗</Link>}
                  </div>
                  <ListingSnippet listing={listing} />
                  <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                    <button onClick={() => resolveNotSpam(r.id)} style={{ fontSize: 11.5, padding: "5px 12px", borderRadius: 4, cursor: "pointer", border: "none", background: C.greenBg, color: C.green, fontWeight: 600 }}>Not spam — dismiss</button>
                    {listing && <button onClick={() => resolveSpam(r)} style={{ fontSize: 11.5, padding: "5px 12px", borderRadius: 4, cursor: "pointer", border: "none", background: "#FBE4E3", color: "#A32D2D", fontWeight: 600 }}>Spam — remove listing</button>}
                  </div>
                </div>
              );
            })}
          </AdminSection>

          <details style={{ marginTop: 16 }}>
            <summary style={{ cursor: "pointer", fontSize: 13, color: C.steel, padding: "8px 0" }}>Archived — no issue found ({resolvedNoIssue.length})</summary>
            <AdminSection title="" span="full">
              {resolvedNoIssue.length === 0 ? <div style={{ fontSize: 13, color: C.steel }}>Nothing here yet.</div> : resolvedNoIssue.map((r) => {
                const listing = withCred.find((l) => l.id === r.listing_id);
                return (
                  <div key={r.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.line}`, fontSize: 12.5 }}>
                    <span>{listing ? `${listing.year} ${listing.make} ${listing.model}` : `Listing #${r.listing_id}`} — {r.reason}</span>
                    <span style={{ color: C.steel }}>{adminDate(r.created_at)}</span>
                  </div>
                );
              })}
            </AdminSection>
          </details>

          <details style={{ marginTop: 10 }}>
            <summary style={{ cursor: "pointer", fontSize: 13, color: C.steel, padding: "8px 0" }}>Archived — spam removed ({resolvedSpam.length})</summary>
            <AdminSection title="" span="full">
              {resolvedSpam.length === 0 ? <div style={{ fontSize: 13, color: C.steel }}>Nothing here yet.</div> : resolvedSpam.map((r) => (
                <div key={r.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.line}`, fontSize: 12.5 }}>
                  <span>{r.reason} <span style={{ color: C.steel, fontStyle: "italic" }}>(listing removed)</span></span>
                  <span style={{ color: C.steel }}>{adminDate(r.created_at)}</span>
                </div>
              ))}
            </AdminSection>
          </details>
        </div>
      )}

      {tab === "trash" && (
        <AdminSection title="Trash — 14-day recovery window" span="full">
          <div style={{ fontSize: 12, color: C.steel, marginBottom: 14 }}>Removed listings sit here for 14 days before being purged automatically. Restore anytime before then, or purge one immediately if you're sure.</div>
          {deletedListings.length === 0 ? <div style={{ fontSize: 13, color: C.steel }}>Nothing in trash right now.</div> : deletedListings.map((l) => {
            const daysLeft = Math.max(0, 14 - Math.floor((Date.now() - new Date(l.deleted_at).getTime()) / 86400000));
            return (
              <div key={l.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.line}`, gap: 10, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 13.5, color: C.ink }}>{l.year} {l.make} {l.model} — {fmtPrice(l.price)}</div>
                  <div style={{ fontSize: 11.5, color: C.steel, marginTop: 2 }}>Deleted {adminDate(l.deleted_at)} · purges permanently in {daysLeft} day{daysLeft === 1 ? "" : "s"}</div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => restoreListing(l.id)} style={{ fontSize: 11.5, padding: "5px 12px", borderRadius: 4, cursor: "pointer", border: "none", background: C.greenBg, color: C.green, fontWeight: 600 }}>Restore</button>
                  <button onClick={() => purgeListing(l.id)} style={{ fontSize: 11.5, padding: "5px 12px", borderRadius: 4, cursor: "pointer", border: "none", background: "#FBE4E3", color: "#A32D2D", fontWeight: 600 }}>Delete forever</button>
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
// Admin tables specifically: relative for anything recent (easier to scan
// "2 days ago" than a date), but caps at 3 days — beyond that, a relative
// string stops being useful at a glance and a real date is clearer.
function adminDate(iso) {
  const diffDays = (Date.now() - new Date(iso).getTime()) / 86400000;
  if (diffDays < 3) return timeAgo(iso);
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, "0");
  const month = d.toLocaleString("en-US", { month: "short" }).toUpperCase();
  return `${day}${month}${d.getFullYear()}`;
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

  // Capture QR/flyer attribution once, on first load of any page. Fires a
  // real "landing" event only when this is a genuinely new tagged visit —
  // this is the piece that makes raw scan counts measurable at all, since
  // every other event only fires from an actual action (submitting a
  // valuation, finishing the quiz), never from just showing up.
  useEffect(() => {
    const { isNew } = captureAttribution();
    if (isNew) log("qr_landing", {});
  }, []);

  useEffect(() => {
    if (location.pathname.startsWith("/manage/") || location.pathname.startsWith("/admin/")) { setLoading(false); return; } // these routes fetch their own data
    (async () => {
      const { data, error } = await supabase.from("listings").select(LISTING_COLUMNS).is("deleted_at", null).order("created_at", { ascending: false });
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
  // Homepage subfeed only — capped at 10 no matter what, and never shows
  // sold_price (which is private anyway, never even fetched into this
  // array). The cap is deliberate: this should look identical whether the
  // site has sold 12 cars or 12,000, so nobody can infer real volume from it.
  const recentlySold = useMemo(() =>
    enrichedListings.filter((l) => l.status === "sold").sort((a, b) => new Date(b.sold_at || 0) - new Date(a.sold_at || 0)).slice(0, 10)
  , [enrichedListings]);

  const handlePostSubmit = async (data) => {
    const { desc, ...rest } = data;
    const manage_token = generateToken();
    const { data: inserted, error } = await supabase.from("listings").insert({ ...rest, description: desc, manage_token, ...getAttribution() }).select(LISTING_COLUMNS).single();
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
    supabase.from("quiz_responses").insert({ answers, archetype, ...getAttribution() }).then(({ error }) => {
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
        <Route path="/" element={<Home allListings={visibleListings} recentlySold={recentlySold} log={log} openListing={openListing} />} />
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
