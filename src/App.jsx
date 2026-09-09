import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Search, MapPin, Gauge, Fuel, Calendar, X, Plus, ChevronLeft, ChevronRight,
  ShieldCheck, Phone, SlidersHorizontal, Car as CarIcon, Check, Star,
  TrendingUp, TrendingDown, Zap, BarChart3, Building2, Camera, Lock, FileText, DollarSign, Info
} from "lucide-react";
import { supabase } from "./lib/supabaseClient";

// Explicit column list, deliberately excluding manage_token — every query
// against listings uses this instead of '*', since manage_token's SELECT
// privilege is revoked for the public role in the database itself (see
// schema.sql). Using '*' would actually error for that reason, which is
// the point: even a bypass of this app's own code can't read the token.
const LISTING_COLUMNS = "id,year,make,model,trim,price,mileage,city,state,fuel,trans,color,seller,verified,featured,body,condition,loan_status,loan_balance,damage_points,description,phone,photos,created_at";

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
const MAKE_COLORS = { Ford:"#2B4C7E",Toyota:"#7E2B2B",Honda:"#2B7E4C",Chevrolet:"#7E6A2B",Jeep:"#3E4D2B",Tesla:"#3A3A3A",Subaru:"#2B577E",Ram:"#5A2B7E",GMC:"#7E4B2B",Nissan:"#2B7E7A",BMW:"#2B3A7E",Dodge:"#7E2B4A" };

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
    const noIssuesReported = (!listing.damage_points || listing.damage_points.length === 0) && ["Excellent", "Good"].includes(listing.condition);
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
function useAnalytics() {
  const log = (type, payload = {}) => {
    supabase.from("events").insert({ type, payload }).then(({ error }) => {
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
  return (
    <div onClick={() => onOpen(listing.id)} style={{ background: C.card, border: listing.featured ? `2px solid ${C.yellow}` : `1.5px solid ${C.line}`, borderRadius: 6, cursor: "pointer", overflow: "hidden" }}>
      <CarThumb make={listing.make} body={listing.body} />
      <div style={{ padding: "14px 14px 16px" }}>
        {listing.featured && <div style={{ marginBottom: 6 }}><Badge tone="yellow"><Star size={11} />Featured</Badge></div>}
        <div style={{ fontFamily: FONT_HEAD, fontSize: 17, color: C.ink, lineHeight: 1.25 }}>{listing.year} {listing.make} {listing.model}</div>
        <div style={{ fontSize: 13, color: C.steel, marginTop: 2 }}>{listing.trim}</div>
        <div style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 22, color: C.ink, marginTop: 8 }}>{fmtPrice(listing.price)}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8, fontSize: 12.5, color: C.steel }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Gauge size={13} />{fmtMiles(listing.mileage)}</span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><MapPin size={13} />{listing.city}, {stateAbbr(listing.state)}</span>
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
            <CarThumb make={c.make} body={c.body} size="hero" />
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

function CategoryPage({ category, listings, openListing, setView }) {
  const matches = category.kind === "make"
    ? listings.filter((c) => c.make === category.make && c.state === category.state)
    : listings.filter((c) => c.body === category.body && c.state === category.state);
  const avgPrice = matches.length ? Math.round(matches.reduce((s, c) => s + c.price, 0) / matches.length) : 0;
  const title = category.kind === "make" ? `${category.make}s for sale in ${category.state}` : `${category.body}s for sale in ${category.state}`;
  const noun = category.kind === "make" ? category.make.toLowerCase() : category.body.toLowerCase();
  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", padding: "28px 20px 60px" }}>
      <span onClick={() => setView({ name: "home" })} style={{ display: "inline-flex", alignItems: "center", gap: 4, color: C.steel, fontSize: 13.5, cursor: "pointer", marginBottom: 16 }}><ChevronLeft size={15} /> Back to all listings</span>
      <h1 style={{ fontFamily: FONT_HEAD, fontSize: 28, color: C.ink, margin: "0 0 8px" }}>{title}</h1>
      <p style={{ color: C.steel, fontSize: 14.5, maxWidth: 640, marginBottom: 24 }}>
        {matches.length} {noun}{matches.length === 1 ? "" : "s"} currently listed in {category.state}, averaging {fmtPrice(avgPrice)}. Updated automatically as sellers post and sell — this page is generated straight from live listing data.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
        {matches.map((c) => <ListingCard key={c.id} listing={c} onOpen={openListing} />)}
      </div>
      <div style={{ marginTop: 24, padding: 14, background: "#F4F2EA", borderRadius: 6, fontSize: 12.5, color: C.steel }}>
        In production, this page lives at its own address (like /trucks-for-sale/texas or /ford-for-sale/florida) so it can show up directly in Google search results — every combination gets one automatically as inventory grows. This is a read-only filtered view — nothing here needs a login, since it's just showing listings that are already public on the browse page.
      </div>
    </div>
  );
}

// ---------- Top nav ----------
function TopBar({ view, setView, onPost }) {
  return (
    <div style={{ background: C.ink, borderBottom: `4px solid ${C.yellow}` }}>
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "12px 20px", display: "flex", alignItems: "center", flexWrap: "wrap", rowGap: 10, columnGap: 20, minHeight: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
          <div onClick={() => setView({ name: "home" })} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
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
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <NavLink label="Browse" active={["home","listing","category"].includes(view.name)} onClick={() => setView({ name: "home" })} />
            <NavLink label="Value my car" active={view.name === "value"} onClick={() => setView({ name: "value" })} />
            <NavLink label="Find my car" active={["quiz","quizResults"].includes(view.name)} onClick={() => setView({ name: "quiz" })} />
          </div>
        </div>
        <button onClick={onPost} style={{ background: C.yellow, color: C.ink, border: "none", borderRadius: 4, padding: "9px 16px", fontFamily: FONT_HEAD, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
          <Plus size={16} strokeWidth={2.5} /> Post an ad
        </button>
      </div>
    </div>
  );
}
function NavLink({ label, active, onClick }) {
  return <span onClick={onClick} style={{ color: active ? "#fff" : "rgba(255,255,255,0.65)", fontSize: 13.5, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", padding: "4px 0", borderBottom: active ? `2px solid ${C.yellow}` : "2px solid transparent", whiteSpace: "nowrap" }}>{label}</span>;
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
function Home({ setView, allListings, log, openListing }) {
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
      <PopularSearches listings={allListings} onOpenCategory={(cat) => { log("category_view", cat); setView({ name: "category", category: cat }); }} />
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

// ---------- Damage diagram ----------
// Top-down 2D diagram, not a rotatable 3D model — true 3D would need licensed
// car models and a 3D engine, which isn't realistic to fake with placeholder
// assets. This gets the actual job done: click a spot, mark what's wrong there.
function getShapeType(bodyType) {
  const map = {
    Sedan: "sedan", Coupe: "coupe", Hatchback: "hatchback",
    SUV: "suv", Truck: "truck", "Van/Minivan": "van", Convertible: "convertible",
  };
  return map[bodyType] || "sedan";
}

// Solid single-color silhouette, matching the reference sheet exactly — no
// window band, no internal detail. Wheel arches are real negative-space cuts
// (a background-colored patch layered over the body, since true path
// subtraction isn't worth the risk here), with the wheel sitting inside the
// gap rather than floating on the body edge. bg must match whatever the SVG
// is actually rendered on top of, passed in per-picker.
function CarShapeSvg({ shape, bg = "#FAFAF6" }) {
  const Arch = ({ cx, groundY, r = 22 }) => <path d={`M ${cx - r} ${groundY} A ${r} ${r} 0 0 1 ${cx + r} ${groundY} Z`} fill={bg} />;
  const Wheel = ({ cx, groundY }) => (
    <g>
      <circle cx={cx} cy={groundY - 3} r={14} fill="#12181F" />
      <circle cx={cx} cy={groundY - 3} r={5.5} fill="#4A5058" />
    </g>
  );
  const Lights = ({ frontX, backX, y }) => (
    <>
      <circle cx={frontX} cy={y} r={4} fill={C.yellow} />
      <circle cx={backX} cy={y} r={4} fill="#E24B4A" />
    </>
  );

  if (shape === "truck") {
    return (
      <g>
        <path d="M 14 120 L 14 82 C 14 70 22 64 33 62 L 58 58 C 68 44 82 39 98 38 L 128 38 C 136 38 136 46 136 52 L 136 100 L 300 100 L 300 76 L 312 76 L 312 120 Z" fill={C.ink} />
        <Arch cx={55} groundY={120} /><Arch cx={253} groundY={120} />
        <Lights frontX={22} backX={304} y={90} />
        <Wheel cx={55} groundY={120} /><Wheel cx={253} groundY={120} />
      </g>
    );
  }
  if (shape === "van") {
    return (
      <g>
        <path d="M 14 120 L 14 56 C 14 44 22 38 34 38 L 290 38 C 300 38 306 46 306 58 L 306 120 Z" fill={C.ink} />
        <Arch cx={58} groundY={120} /><Arch cx={262} groundY={120} />
        <Lights frontX={22} backX={300} y={92} />
        <Wheel cx={58} groundY={120} /><Wheel cx={262} groundY={120} />
      </g>
    );
  }
  if (shape === "suv") {
    return (
      <g>
        <path d="M 14 120 L 14 76 C 14 62 24 55 36 52 L 58 46 C 72 34 90 30 108 30 L 216 30 C 246 30 262 36 274 50 L 288 55 C 300 58 306 64 306 76 L 306 120 Z" fill={C.ink} />
        <Arch cx={62} groundY={120} /><Arch cx={258} groundY={120} />
        <Lights frontX={22} backX={298} y={92} />
        <Wheel cx={62} groundY={120} /><Wheel cx={258} groundY={120} />
      </g>
    );
  }
  if (shape === "hatchback") {
    return (
      <g>
        <path d="M 14 120 L 14 96 C 14 86 22 79 33 77 L 58 72 C 74 46 96 34 124 32 C 154 30 184 34 202 46 C 216 55 222 68 224 82 L 232 90 C 236 94 236 100 236 106 L 236 100 L 300 100 C 306 100 306 106 306 112 L 306 120 Z" fill={C.ink} />
        <path d="M 236 90 C 250 92 262 96 300 100 L 306 108 L 306 120 L 236 120 Z" fill={C.ink} />
        <Arch cx={66} groundY={120} /><Arch cx={252} groundY={120} />
        <Lights frontX={22} backX={300} y={92} />
        <Wheel cx={66} groundY={120} /><Wheel cx={252} groundY={120} />
      </g>
    );
  }
  if (shape === "convertible") {
    return (
      <g>
        <path d="M 14 120 L 14 100 C 14 92 20 87 28 85 L 60 80 C 78 62 100 52 126 49 L 190 49 C 210 51 226 60 240 74 L 284 82 C 298 85 306 90 306 102 L 306 120 Z" fill={C.ink} />
        <Arch cx={70} groundY={120} /><Arch cx={254} groundY={120} />
        <Lights frontX={22} backX={300} y={94} />
        <Wheel cx={70} groundY={120} /><Wheel cx={254} groundY={120} />
      </g>
    );
  }
  if (shape === "coupe") {
    return (
      <g>
        <path d="M 14 120 L 14 100 C 14 90 20 84 30 82 L 60 78 C 76 52 96 40 122 36 C 148 32 172 33 192 40 C 208 46 220 58 228 76 L 280 84 C 296 87 306 92 306 104 L 306 120 Z" fill={C.ink} />
        <Arch cx={68} groundY={120} /><Arch cx={252} groundY={120} />
        <Lights frontX={22} backX={300} y={94} />
        <Wheel cx={68} groundY={120} /><Wheel cx={252} groundY={120} />
      </g>
    );
  }
  // sedan (default)
  return (
    <g>
      <path d="M 14 120 L 14 98 C 14 87 21 80 32 78 L 62 74 C 76 50 96 38 122 34 C 150 30 178 30 202 34 C 224 38 240 48 252 68 L 284 78 C 298 82 306 88 306 100 L 306 120 Z" fill={C.ink} />
      <Arch cx={72} groundY={120} /><Arch cx={254} groundY={120} />
      <Lights frontX={22} backX={300} y={94} />
      <Wheel cx={72} groundY={120} /><Wheel cx={254} groundY={120} />
    </g>
  );
}
// Simplified front/back-only picker for Value My Car — deliberately not the
// full named-zone tool from the posting form. No body-style field exists
// here, so it always uses the generic sedan silhouette. Doesn't affect the
// price estimate yet — captured as data now so it can factor in once
// there's enough of it to mean something.
function FrontBackDamagePicker({ value, onChange, shape = "sedan" }) {
  const [editingZone, setEditingZone] = useState(null); // "front" | "back" | null
  const [note, setNote] = useState("");
  const [severity, setSeverity] = useState("Minor");

  const openZone = (zone) => {
    setEditingZone(zone);
    setNote(value[zone]?.note || "");
    setSeverity(value[zone]?.severity || "Minor");
  };
  const confirm = () => {
    if (!note.trim()) return;
    onChange({ ...value, [editingZone]: { note: note.trim(), severity } });
    setEditingZone(null);
  };
  const clearZone = (zone) => onChange({ ...value, [zone]: null });

  const zoneFill = (zone) => (value[zone] ? (value[zone].severity === "Major" ? "#F7C1C1" : value[zone].severity === "Moderate" ? "#FAEEDA" : "#EAF3DE") : "transparent");

  return (
    <div>
      <svg viewBox="0 0 320 150" style={{ width: "100%", maxWidth: 600, background: "#FAFAF6", borderRadius: 8, border: `1px solid ${C.line}`, display: "block" }}>
        <CarShapeSvg shape={shape} />
        {/* Clickable front half — the shape itself now has a yellow headlight up front and red taillight in back */}
        <rect x={18} y={22} width={143} height={100} fill={zoneFill("front")} opacity={0.55} style={{ cursor: "pointer" }} onClick={() => openZone("front")} />
        <text x={90} y={140} fontSize={12} fontWeight={600} textAnchor="middle" fill={C.steel}>FRONT</text>
        <rect x={161} y={22} width={143} height={100} fill={zoneFill("back")} opacity={0.55} style={{ cursor: "pointer" }} onClick={() => openZone("back")} />
        <text x={230} y={140} fontSize={12} fontWeight={600} textAnchor="middle" fill={C.steel}>BACK</text>
      </svg>

      {editingZone && (
        <div style={{ marginTop: 10, padding: 12, border: `1px solid ${C.line}`, borderRadius: 6, maxWidth: 420 }}>
          <div style={{ fontSize: 12.5, color: C.steel, marginBottom: 6 }}>Any {editingZone} damage?</div>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Cracked bumper, dent" style={inputStyle} />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <select value={severity} onChange={(e) => setSeverity(e.target.value)} style={inputStyle}><option>Minor</option><option>Moderate</option><option>Major</option></select>
            <button onClick={confirm} style={{ background: C.yellow, border: "none", borderRadius: 4, padding: "0 16px", fontFamily: FONT_HEAD, cursor: "pointer", whiteSpace: "nowrap" }}>Save</button>
            <button onClick={() => setEditingZone(null)} style={{ background: "transparent", border: `1px solid ${C.line}`, borderRadius: 4, padding: "0 12px", cursor: "pointer" }}><X size={13} /></button>
          </div>
        </div>
      )}

      {["front", "back"].map((zone) => value[zone] && (
        <div key={zone} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12.5, color: C.steel, padding: "4px 0", maxWidth: 420 }}>
          <span style={{ textTransform: "capitalize" }}>{zone} — <strong style={{ color: C.ink }}>{value[zone].severity}</strong>: {value[zone].note}</span>
          <span onClick={() => clearZone(zone)} style={{ cursor: "pointer", color: "#B23A3A" }}><X size={13} /></span>
        </div>
      ))}
    </div>
  );
}

function DamagePicker({ bodyType, points, onAddPoint, onRemovePoint, editable = true }) {
  const svgRef = useRef(null);
  const [pending, setPending] = useState(null);
  const [note, setNote] = useState("");
  const [severity, setSeverity] = useState("Minor");
  const shape = getShapeType(bodyType);

  const handleClick = (e) => {
    if (!editable) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 320;
    const y = ((e.clientY - rect.top) / rect.height) * 150;
    setPending({ x, y });
    setNote(""); setSeverity("Minor");
  };
  const confirm = () => {
    if (!note.trim()) return;
    onAddPoint({ x: pending.x, y: pending.y, note: note.trim(), severity });
    setPending(null);
  };

  return (
    <div>
      <svg ref={svgRef} viewBox="0 0 320 150" onClick={handleClick} style={{ width: "100%", maxWidth: 600, background: "#FAFAF6", borderRadius: 8, cursor: editable ? "crosshair" : "default", display: "block", border: `1px solid ${C.line}` }}>
        <CarShapeSvg shape={shape} />
        <text x={90} y={140} fontSize={12} fontWeight={600} textAnchor="middle" fill={C.steel}>FRONT</text>
        <text x={230} y={140} fontSize={12} fontWeight={600} textAnchor="middle" fill={C.steel}>BACK</text>
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={8} fill={p.severity === "Major" ? "#E24B4A" : p.severity === "Moderate" ? C.yellow : C.steel} stroke={C.ink} strokeWidth={1.25} />
            <text x={p.x} y={p.y + 3.5} fontSize={9} textAnchor="middle" fill="#fff" fontWeight="bold">{i + 1}</text>
            <title>{p.severity}: {p.note}</title>
          </g>
        ))}
        {pending && <circle cx={pending.x} cy={pending.y} r={8} fill="none" stroke={C.ink} strokeDasharray="3,2" />}
      </svg>

      {editable && pending && (
        <div style={{ marginTop: 10, padding: 12, border: `1px solid ${C.line}`, borderRadius: 6, maxWidth: 420 }}>
          <div style={{ fontSize: 12.5, color: C.steel, marginBottom: 6 }}>What's the damage here?</div>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Small dent, scratch on paint" style={inputStyle} />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <select value={severity} onChange={(e) => setSeverity(e.target.value)} style={inputStyle}><option>Minor</option><option>Moderate</option><option>Major</option></select>
            <button onClick={confirm} style={{ background: C.yellow, border: "none", borderRadius: 4, padding: "0 16px", fontFamily: FONT_HEAD, cursor: "pointer", whiteSpace: "nowrap" }}>Add</button>
            <button onClick={() => setPending(null)} style={{ background: "transparent", border: `1px solid ${C.line}`, borderRadius: 4, padding: "0 12px", cursor: "pointer" }}><X size={13} /></button>
          </div>
        </div>
      )}
      {points.length > 0 && (
        <div style={{ marginTop: 10, maxWidth: 420 }}>
          {points.map((p, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12.5, color: C.steel, padding: "4px 0" }}>
              <span>#{i + 1} — <strong style={{ color: C.ink }}>{p.severity}</strong>: {p.note}</span>
              {editable && <span onClick={() => onRemovePoint(i)} style={{ cursor: "pointer", color: "#B23A3A" }}><X size={13} /></span>}
            </div>
          ))}
        </div>
      )}
      {editable && points.length === 0 && !pending && (
        <div style={{ fontSize: 12, color: C.steel, marginTop: 8 }}>Click anywhere on the car to mark a scratch, dent, or other damage. Optional — skip if the car has none to report.</div>
      )}
    </div>
  );
}

// ---------- Listing detail + boost ----------
function ListingDetail({ id, setView, allListings, onBoost, log }) {
  const [revealed, setRevealed] = useState(false);
  const [showBoost, setShowBoost] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const listing = allListings.find((c) => c.id === id);
  if (!listing) return null;
  const photos = listing.photos && listing.photos.length ? listing.photos : null;
  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", padding: "24px 20px 60px" }}>
      <span onClick={() => setView({ name: "home" })} style={{ display: "inline-flex", alignItems: "center", gap: 4, color: C.steel, fontSize: 13.5, cursor: "pointer", marginBottom: 16 }}><ChevronLeft size={15} /> Back to listings</span>
      <div className="hl-detail-grid">
        <div>
          {photos ? (
            <div>
              <img src={photos[0]} alt={`${listing.year} ${listing.make} ${listing.model}`} style={{ width: "100%", height: 340, objectFit: "cover", borderRadius: 8 }} />
              {photos.length > 1 && (
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  {photos.slice(1).map((p, i) => <img key={i} src={p} alt="" style={{ width: 84, height: 60, objectFit: "cover", borderRadius: 4 }} />)}
                </div>
              )}
            </div>
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
          {listing.damage_points && listing.damage_points.length > 0 && (
            <div style={{ marginTop: 26, borderTop: `1px solid ${C.line}`, paddingTop: 20 }}>
              <div style={{ fontFamily: FONT_HEAD, fontSize: 16, color: C.ink, marginBottom: 12 }}>Damage report</div>
              <DamagePicker bodyType={listing.body} points={listing.damage_points} editable={false} onAddPoint={() => {}} onRemovePoint={() => {}} />
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
                Meet in a public place. HIGHWAYLOT doesn't handle payments or verify vehicles between buyers and sellers — see our <span style={{ textDecoration: "underline", cursor: "pointer" }} onClick={() => setView({ name: "terms" })}>terms</span>.
              </div>
            </div>
            {!listing.featured && (
              <button onClick={() => setShowBoost(true)} style={{ width: "100%", marginTop: 10, background: "transparent", color: C.ink, border: `1px solid ${C.line}`, borderRadius: 4, padding: "10px 0", fontFamily: FONT_HEAD, fontSize: 13.5, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Zap size={14} /> Boost this listing</button>
            )}
            <button onClick={() => setShowReport(true)} style={{ width: "100%", marginTop: 8, background: "transparent", color: C.steel, border: "none", fontSize: 12, cursor: "pointer", textDecoration: "underline" }}>Report this listing</button>
          </div>
        </div>
      </div>
      {showBoost && <BoostModal listing={listing} onClose={() => setShowBoost(false)} onConfirm={() => { onBoost(listing.id); setShowBoost(false); }} />}
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

function BoostModal({ listing, onClose, onConfirm }) {
  const plans = [{ days: 3, price: 9, label: "3-day boost" }, { days: 7, price: 19, label: "7-day boost" }, { days: 14, price: 29, label: "14-day boost" }];
  const [selected, setSelected] = useState(1);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(27,36,49,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 8, padding: 24, width: 360, maxWidth: "90vw" }}>
        <div style={{ fontFamily: FONT_HEAD, fontSize: 18, color: C.ink, marginBottom: 4 }}>Boost your listing</div>
        <div style={{ fontSize: 13, color: C.steel, marginBottom: 16 }}>Featured listings get a yellow-bordered card and a top slot on the homepage.</div>
        {plans.map((p, i) => (
          <label key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", border: `1px solid ${selected === i ? C.ink : C.line}`, borderRadius: 4, padding: "10px 12px", marginBottom: 8, cursor: "pointer" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}><input type="radio" checked={selected === i} onChange={() => setSelected(i)} /> {p.label}</span>
            <span style={{ fontFamily: FONT_HEAD, fontSize: 15 }}>${p.price}</span>
          </label>
        ))}
        <div style={{ fontSize: 11.5, color: C.steel, margin: "8px 0 16px" }}>Payment isn't wired up yet — this confirms the flow only.</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, background: "transparent", border: `1px solid ${C.line}`, borderRadius: 4, padding: "10px 0", fontFamily: FONT_HEAD, cursor: "pointer" }}>Cancel</button>
          <button onClick={onConfirm} style={{ flex: 1, background: C.yellow, border: "none", borderRadius: 4, padding: "10px 0", fontFamily: FONT_HEAD, cursor: "pointer" }}>Confirm boost</button>
        </div>
      </div>
    </div>
  );
}

// ---------- Post an ad (with photo requirement) ----------
function PostAd({ setView, onSubmit, existingListings, log }) {
  const [form, setForm] = useState({ year:"", make:"", model:"", trim:"", price:"", mileage:"", city:"", state:"", fuel:"Gas", trans:"Automatic", color:"", seller:"Private", body:"", condition:"Good", loan_status:"Paid off", loan_balance:"", desc:"", phone:"" });
  const [photos, setPhotos] = useState([]);
  const [damagePoints, setDamagePoints] = useState([]);
  const [confirmDuplicate, setConfirmDuplicate] = useState(false);
  const [honeypot, setHoneypot] = useState(""); // bots fill this; real users never see it
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const set = (k) => (e) => { const val = e.target.value; setForm((prev) => ({ ...prev, [k]: val })); setErrors((prev) => (prev[k] ? { ...prev, [k]: false } : prev)); };

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
    const errMsg = await onSubmit({ ...form, year: Number(form.year), price: Number(form.price), mileage: Number(form.mileage), loan_balance: form.loan_status === "Still financed (loan payoff needed)" && form.loan_balance ? Number(form.loan_balance) : null, verified: false, featured: false, photos, damage_points: damagePoints, desc: form.desc || "No additional description provided." });
    setSubmitting(false);
    if (errMsg) setSubmitError(errMsg);
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "36px 20px 70px" }}>
      <span onClick={() => setView({ name: "home" })} style={{ display: "inline-flex", alignItems: "center", gap: 4, color: C.steel, fontSize: 13.5, cursor: "pointer", marginBottom: 12 }}><ChevronLeft size={15} /> Cancel</span>
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
        <Field label="Price (USD)" required error={errors.price}><input value={form.price} onChange={set("price")} placeholder="24999" style={inputStyle} /></Field>
        <Field label="Mileage" required error={errors.mileage}><input value={form.mileage} onChange={set("mileage")} placeholder="42000" style={inputStyle} /></Field>
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
          <Field label="Remaining loan balance ($)"><input value={form.loan_balance} onChange={set("loan_balance")} placeholder="8500" style={inputStyle} /></Field>
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
        <Field label="Damage report">
          <div style={{ marginBottom: 10 }}><OptionalTag /></div>
          {form.body ? (
            <DamagePicker bodyType={form.body} points={damagePoints} onAddPoint={(p) => setDamagePoints([...damagePoints, p])} onRemovePoint={(i) => setDamagePoints(damagePoints.filter((_, idx) => idx !== i))} />
          ) : (
            <div style={{ fontSize: 12.5, color: C.steel }}>Pick a body style above first.</div>
          )}
        </Field>
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

function Success({ setView, listingId, manageLink }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(manageLink).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };
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

      <button onClick={() => setView({ name: "listing", id: listingId })} style={{ background: C.ink, color: "#fff", border: "none", borderRadius: 4, padding: "11px 22px", fontFamily: FONT_HEAD, cursor: "pointer", marginRight: 10 }}>View listing</button>
      <button onClick={() => setView({ name: "home" })} style={{ background: "transparent", color: C.ink, border: `1px solid ${C.line}`, borderRadius: 4, padding: "11px 22px", fontFamily: FONT_HEAD, cursor: "pointer" }}>Back to browse</button>
    </div>
  );
}

// ---------- Quiz (expanded, categorized, archetype result) ----------
const QUIZ_SECTIONS = [
  { section: "Lifestyle", questions: [
    { key: "household", q: "Who's usually riding with you?", options: ["Just me", "Me and a partner", "Family with kids", "Crew / gear / cargo"] },
    { key: "driving", q: "Where do you drive most?", options: ["City streets", "Highway commute", "Mixed city and highway", "Backroads / off-road"] },
    { key: "climate", q: "What's your weather like?", options: ["Mild, dry most of the year", "Rain a lot", "Real winters with snow", "Extreme heat"] },
  ]},
  { section: "Ownership comfort", questions: [
    { key: "condition", q: "New or used?", options: ["Prefer newer / low miles", "Don't mind higher mileage", "Whatever's the best deal"] },
    { key: "maintenance", q: "Comfortable doing your own maintenance?", options: ["Yes, I wrench on it myself", "Some basics only", "No, I want it low-hassle"] },
    { key: "power", q: "Gas, hybrid, or electric?", options: ["Gas only", "Open to hybrid", "EV-curious"] },
  ]},
  { section: "Hard constraints", questions: [
    { key: "budget", q: "What's your rough budget?", options: ["Under $20k", "$20k–$30k", "$30k–$40k", "$40k+"] },
    { key: "musthave", q: "Any must-have feature?", options: ["AWD / 4WD", "Third row seating", "Towing capacity", "None, keep it simple"] },
  ]},
  { section: "Just for fun", questions: [
    { key: "vibe", q: "Would you rather arrive...", options: ["Early and quiet", "Fashionably loud", "Right on time, no fuss", "Whenever, it's a road trip"] },
  ]},
];
const ALL_QUESTIONS = QUIZ_SECTIONS.flatMap((s) => s.questions.map((q) => ({ ...q, section: s.section })));

const BODY_MAP = { "Just me": "Coupe", "Me and a partner": "Sedan", "Family with kids": "SUV", "Crew / gear / cargo": "Truck" };
const BUDGET_MAP = { "Under $20k": 20000, "$20k–$30k": 30000, "$30k–$40k": 40000, "$40k+": 100000 };

function getArchetype(answers) {
  if (answers.household === "Crew / gear / cargo" || answers.musthave === "Towing capacity") return { name: "Weekend Hauler", blurb: "You need real capability — towing, cargo room, and a truck bed that earns its keep." };
  if (answers.household === "Family with kids" || answers.musthave === "Third row seating") return { name: "Family Fleet Captain", blurb: "Space, safety, and enough room for everyone (and their stuff) come first." };
  if (answers.vibe === "Fashionably loud" || answers.driving === "Backroads / off-road") return { name: "Open Road Enthusiast", blurb: "Driving is the point, not just the commute. You want something with character." };
  if (answers.power === "EV-curious") return { name: "Next-Gen Commuter", blurb: "Efficient, modern, and ready to skip the gas station." };
  return { name: "Daily Commuter", blurb: "Reliable, efficient, no drama — a car that just works, day after day." };
}

function Quiz({ setView, log, onComplete }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const q = ALL_QUESTIONS[step];
  const progress = Math.round(((step) / ALL_QUESTIONS.length) * 100);

  const choose = (opt) => {
    const next = { ...answers, [q.key]: opt };
    setAnswers(next);
    log("quiz_answer", { question: q.key, answer: opt });
    if (step + 1 < ALL_QUESTIONS.length) setStep(step + 1);
    else { log("quiz_complete", next); onComplete(next); }
  };

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: "48px 20px" }}>
      <div style={{ height: 5, background: "#EFEDE4", borderRadius: 3, marginBottom: 20, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${progress}%`, background: C.yellow, transition: "width 200ms" }} />
      </div>
      <div style={{ fontSize: 12, color: C.steel, letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 6 }}>{q.section} · {step + 1} of {ALL_QUESTIONS.length}</div>
      <h2 style={{ fontFamily: FONT_HEAD, fontSize: 26, color: C.ink, margin: "0 0 20px" }}>{q.q}</h2>
      <div style={{ display: "grid", gap: 10 }}>
        {q.options.map((opt) => (
          <button key={opt} onClick={() => choose(opt)} style={{ textAlign: "left", padding: "14px 16px", border: `1px solid ${C.line}`, borderRadius: 6, background: "#fff", fontSize: 15, cursor: "pointer", fontFamily: FONT_BODY }}>{opt}</button>
        ))}
      </div>
    </div>
  );
}

function QuizResults({ answers, allListings, openListing, setView }) {
  const archetype = getArchetype(answers);
  const bodyPref = BODY_MAP[answers.household] || "Sedan";
  const maxPrice = BUDGET_MAP[answers.budget] || 40000;
  const matches = allListings.filter((c) => c.body === bodyPref && c.price <= maxPrice).slice(0, 6);
  const [shared, setShared] = useState(false);

  const shareResult = async () => {
    const text = `I'm a ${archetype.name} on HIGHWAYLOT! Find out what you are:`;
    const url = `${window.location.origin}${window.location.pathname}`;
    if (navigator.share) {
      try { await navigator.share({ title: "HIGHWAYLOT", text, url }); } catch (e) { /* user cancelled, ignore */ }
    } else {
      navigator.clipboard.writeText(`${text} ${url}`).then(() => { setShared(true); setTimeout(() => setShared(false), 2000); });
    }
  };

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "48px 20px 60px" }}>
      <div style={{ textAlign: "center", marginBottom: 30 }}>
        <div style={{ fontSize: 13, color: C.steel }}>Your result</div>
        <h2 style={{ fontFamily: FONT_HEAD, fontSize: 32, color: C.ink, margin: "6px 0" }}>You're a {archetype.name}</h2>
        <p style={{ color: C.steel, fontSize: 14.5, maxWidth: 440, margin: "0 auto 16px" }}>{archetype.blurb}</p>
        <button onClick={shareResult} style={{ background: C.yellow, color: C.ink, border: "none", borderRadius: 4, padding: "11px 22px", fontFamily: FONT_HEAD, fontSize: 14, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}>
          <Star size={15} /> {shared ? "Copied — go paste it!" : "Share my result"}
        </button>
      </div>
      {matches.length === 0 ? (
        <div style={{ textAlign: "center", color: C.steel }}>No exact matches in your budget right now — try browsing all listings.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
          {matches.map((c) => <ListingCard key={c.id} listing={c} onOpen={openListing} />)}
        </div>
      )}
      <div style={{ textAlign: "center", marginTop: 26 }}>
        <button onClick={() => setView({ name: "quiz" })} style={{ background: "transparent", border: `1px solid ${C.line}`, borderRadius: 4, padding: "10px 20px", fontFamily: FONT_HEAD, cursor: "pointer" }}>Retake quiz</button>
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

// Real BLS OEWS wage data (May 2025) for automotive service techs/mechanics —
// Florida statewide median vs. national median. HIGHWAYLOT is Florida-only right
// now, so this applies everywhere rather than guessing a Key West-specific number
// that BLS doesn't publish (see project notes — small-market data gets suppressed).
const FL_REGIONAL_MULTIPLIER = 48260 / 50620; // ≈ 0.953

function computeMechanicalDeduction(issues, make) {
  const brandMult = getBrandMultiplier(make);
  const breakdown = [];
  let total = 0;
  MECHANICAL_SYSTEMS.forEach((sys) => {
    const status = issues[sys.key];
    if (!status) return;
    const opt = STATUS_OPTIONS.find((o) => o.key === status);
    const adjustedMax = sys.max * brandMult * FL_REGIONAL_MULTIPLIER;
    const deduction = Math.round(adjustedMax * opt.weight);
    if (deduction > 0) { breakdown.push({ label: sys.label, status, deduction }); total += deduction; }
    else breakdown.push({ label: sys.label, status, deduction: 0 });
  });
  return { total, breakdown, brandMult, hasBrandData: Boolean(BRAND_REPAIR_COST[make]) };
}

function MechanicalChecklist({ issues, onChange }) {
  return (
    <div>
      {MECHANICAL_SYSTEMS.map((sys) => (
        <div key={sys.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.line}` }}>
          <span style={{ fontSize: 13.5, color: C.ink }}>{sys.label}</span>
          <div style={{ display: "flex", gap: 6 }}>
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

  const { total: mechanicalDeduction, breakdown, brandMult, hasBrandData } = computeMechanicalDeduction(issues, input.make);
  // Floor the final number so a pile of deductions can't push it to $0 or negative —
  // a car is worth at least scrap/parts value even in bad shape.
  const floor = Math.max(estimate * 0.1, 400);
  estimate = Math.max(estimate - mechanicalDeduction, floor);

  return { estimate: Math.round(estimate / 100) * 100, confidence, compCount: comps.length, mechanicalDeduction, breakdown, brandMult, hasBrandData };
}

function ValueMyCar({ allListings, log, setView }) {
  const [form, setForm] = useState({ year: "", make: "", model: "", mileage: "", condition: "Good", originalPrice: "", body: "Sedan", loan_status: "Paid off", loan_balance: "" });
  const [issues, setIssues] = useState({});
  const [damageZones, setDamageZones] = useState({ front: null, back: null });
  const [result, setResult] = useState(null);
  const [errors, setErrors] = useState({});
  const set = (k) => (e) => { const val = e.target.value; setForm((prev) => ({ ...prev, [k]: val })); setErrors((prev) => (prev[k] ? { ...prev, [k]: false } : prev)); };

  const submit = async () => {
    const req = ["year", "make", "model", "mileage", "originalPrice"];
    const errs = {}; req.forEach((k) => { if (!String(form[k]).trim()) errs[k] = true; });
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const input = { year: Number(form.year), make: form.make, model: form.model, mileage: Number(form.mileage), condition: form.condition, originalPrice: Number(form.originalPrice) };
    const res = estimateValue(input, allListings, issues); // damageZones and loan balance intentionally not passed in — neither affects the value estimate itself
    setResult(res);
    const loanBalance = form.loan_status === "Still financed (loan payoff needed)" && form.loan_balance ? Number(form.loan_balance) : null;
    log("valuation_submitted", { ...input, issues, damageZones, body: form.body, loan_balance: loanBalance });
    supabase.from("valuations").insert({ ...input, estimate: res.estimate, confidence: res.confidence, issues, damage_zones: damageZones, body: form.body, loan_status: form.loan_status, loan_balance: loanBalance }).then(({ error }) => {
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
        <Field label="Current mileage" required error={errors.mileage}><input value={form.mileage} onChange={set("mileage")} placeholder="52000" style={inputStyle} /></Field>
        <Field label="Original price paid" required error={errors.originalPrice}><input value={form.originalPrice} onChange={set("originalPrice")} placeholder="28000" style={inputStyle} /></Field>
        <Field label="Overall condition"><select value={form.condition} onChange={set("condition")} style={inputStyle}><option>Excellent</option><option>Good</option><option>Fair</option><option>Needs work</option></select></Field>
        <Field label="Body style"><select value={form.body} onChange={set("body")} style={inputStyle}><option>Sedan</option><option>Coupe</option><option>Hatchback</option><option>SUV</option><option>Truck</option><option>Van/Minivan</option><option>Convertible</option></select></Field>
        <Field label="Ownership status"><select value={form.loan_status} onChange={set("loan_status")} style={inputStyle}><option>Paid off</option><option>Still financed (loan payoff needed)</option></select></Field>
        {form.loan_status === "Still financed (loan payoff needed)" && (
          <Field label="Remaining loan balance ($)"><input value={form.loan_balance} onChange={set("loan_balance")} placeholder="8500" style={inputStyle} /></Field>
        )}
      </div>

      <div style={{ marginTop: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <div style={{ fontFamily: FONT_HEAD, fontSize: 15, color: C.ink }}>Known issues</div>
          <OptionalTag />
        </div>
        <div style={{ fontSize: 12.5, color: C.steel, marginBottom: 10 }}>Flag anything specific and we'll factor it into the estimate. Leave everything blank if you're not sure or nothing's wrong.</div>
        <MechanicalChecklist issues={issues} onChange={setIssues} />
      </div>

      <div style={{ marginTop: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <div style={{ fontFamily: FONT_HEAD, fontSize: 15, color: C.ink }}>Body damage</div>
          <OptionalTag />
        </div>
        <div style={{ fontSize: 12.5, color: C.steel, marginBottom: 10 }}>Click the front or back if there's damage there. This doesn't change your estimate yet — we're collecting it to make future estimates smarter.</div>
        <FrontBackDamagePicker value={damageZones} onChange={setDamageZones} shape={getShapeType(form.body)} />
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
                  <span>{b.label} — {b.status === "Broken" ? "not working" : "ongoing issue"}</span>
                  <span style={{ color: "#A32D2D" }}>-{fmtPrice(b.deduction)}</span>
                </div>
              ))}
              <div style={{ fontSize: 11, color: C.steel, marginTop: 8 }}>
                {result.hasBrandData
                  ? `Adjusted for ${form.make}'s typical repair costs and Florida labor rates — not a mechanic's quote, actual costs vary by shop.`
                  : "Adjusted for Florida labor rates. Rough repair-cost estimates, not a mechanic's quote — actual costs vary by shop and region."}
              </div>
            </div>
          )}

          <button onClick={() => setView({ name: "post" })} style={{ marginTop: 16, background: "transparent", border: `1px solid ${C.line}`, borderRadius: 4, padding: "10px 20px", fontFamily: FONT_HEAD, cursor: "pointer" }}>List this car</button>
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
function ManagePage({ idParam, token, setView }) {
  const [status, setStatus] = useState("checking"); // checking | denied | ready | deleted
  const [listing, setListing] = useState(null);
  const [price, setPrice] = useState("");
  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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

  const goHome = () => {
    window.history.replaceState(null, "", window.location.pathname);
    setView({ name: "home" });
  };

  const saveChanges = async () => {
    setSaving(true);
    const { data: ok } = await supabase.rpc("update_listing_with_token", { p_id: idParam, p_token: token, p_price: Number(price), p_description: desc });
    setSaving(false);
    if (ok) { setListing({ ...listing, price: Number(price), desc }); setSaved(true); setTimeout(() => setSaved(false), 2500); }
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

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "40px 20px 70px" }}>
      <div style={{ fontFamily: FONT_HEAD, fontSize: 24, color: C.ink, marginBottom: 4 }}>Manage your listing</div>
      <p style={{ color: C.steel, fontSize: 13.5, marginBottom: 20 }}>{listing.year} {listing.make} {listing.model} — only visible to whoever has this exact link.</p>
      <Field label="Price (USD)"><input value={price} onChange={(e) => setPrice(e.target.value)} style={inputStyle} /></Field>
      <div style={{ marginTop: 14 }}><Field label="Description"><textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={4} style={{ ...inputStyle, resize: "vertical" }} /></Field></div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16 }}>
        <button onClick={saveChanges} disabled={saving} style={{ background: C.yellow, border: "none", borderRadius: 4, padding: "11px 20px", fontFamily: FONT_HEAD, cursor: "pointer" }}>{saving ? "Saving…" : "Save changes"}</button>
        {saved && <span style={{ fontSize: 12.5, color: C.green, display: "flex", alignItems: "center", gap: 4 }}><Check size={14} /> Saved</span>}
      </div>
      <div style={{ marginTop: 30, paddingTop: 20, borderTop: `1px solid ${C.line}` }}>
        <div style={{ fontFamily: FONT_HEAD, fontSize: 15, color: "#A32D2D", marginBottom: 6 }}>Danger zone</div>
        <button onClick={deleteListing} style={{ background: "#FBE4E3", color: "#A32D2D", border: "none", borderRadius: 4, padding: "10px 18px", fontFamily: FONT_HEAD, cursor: "pointer" }}>Delete this listing</button>
      </div>
      <span onClick={goHome} style={{ display: "inline-block", marginTop: 24, color: C.steel, fontSize: 13, cursor: "pointer", textDecoration: "underline" }}>Back to HIGHWAYLOT</span>
    </div>
  );
}

// ---------- Terms ----------
function Terms({ setView }) {
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
      <button onClick={() => setView({ name: "home" })} style={{ marginTop: 8, background: "transparent", border: `1px solid ${C.line}`, borderRadius: 4, padding: "10px 20px", fontFamily: FONT_HEAD, cursor: "pointer" }}>Back</button>
    </div>
  );
}

// ---------- Footer ----------
function Footer({ setView }) {
  return (
    <div style={{ background: C.ink, borderTop: `4px solid ${C.yellow}`, marginTop: 40 }}>
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "26px 20px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12.5 }}>HIGHWAYLOT — buy and sell cars nationwide.</div>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <span onClick={() => setView({ name: "terms" })} style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, cursor: "pointer", textDecoration: "underline" }}>Terms</span>
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

function getInitialView() {
  const params = new URLSearchParams(window.location.search);
  const manage = params.get("manage");
  if (manage && manage.includes(".")) {
    const [id, token] = manage.split(/\.(.+)/); // split on first dot only, token may contain dashes
    if (id && token) return { name: "manage", id: Number(id), token };
  }
  return { name: "home" };
}

export default function App() {
  const [view, setView] = useState(getInitialView);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastPostedId, setLastPostedId] = useState(null);
  const [lastManageLink, setLastManageLink] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState(null);
  const { log } = useAnalytics();

  useEffect(() => {
    if (view.name === "manage") { setLoading(false); return; } // manage view fetches its own single listing
    (async () => {
      const { data, error } = await supabase.from("listings").select(LISTING_COLUMNS).order("created_at", { ascending: false });
      if (error) { console.error("fetch listings failed:", error.message); setLoading(false); return; }
      setListings(data.map(rowToListing));
      setLoading(false);
    })();
  }, []);

  const openListing = (id) => { log("listing_view", { listingId: id }); setView({ name: "listing", id }); };

  const enrichedListings = useMemo(() => {
    const withFairness = listings.map((l) => ({ ...l, fairness: estimateFairness(l, listings) }));
    return withFairness.map((l) => ({ ...l, credibility: computeCredibility(l, withFairness) }));
  }, [listings]);

  const handlePostSubmit = async (data) => {
    const { desc, ...rest } = data;
    const manage_token = generateToken();
    const { data: inserted, error } = await supabase.from("listings").insert({ ...rest, description: desc, manage_token }).select(LISTING_COLUMNS).single();
    if (error) { console.error("post listing failed:", error.message); return error.message; }
    const newListing = rowToListing(inserted);
    setListings([newListing, ...listings]);
    setLastPostedId(newListing.id);
    setLastManageLink(`${window.location.origin}${window.location.pathname}?manage=${newListing.id}.${manage_token}`);
    log("listing_created", { listingId: newListing.id });
    setView({ name: "success" });
    return null;
  };

  const handleBoost = async (id) => {
    const { data: ok, error } = await supabase.rpc("boost_listing", { p_id: id });
    if (error || !ok) { console.error("boost failed:", error?.message); return; }
    setListings(listings.map((c) => (c.id === id ? { ...c, featured: true } : c)));
    log("boost_confirmed", { listingId: id });
  };

  const handleQuizComplete = async (answers) => {
    const archetype = getArchetype(answers).name;
    supabase.from("quiz_responses").insert({ answers, archetype }).then(({ error }) => {
      if (error) console.error("quiz save failed:", error.message);
    });
    log("quiz_complete", answers);
    setQuizAnswers(answers);
    setView({ name: "quizResults" });
  };

  if (view.name === "manage") {
    return (
      <div style={{ fontFamily: FONT_BODY, background: C.paper, minHeight: "100%" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600&family=Inter:wght@400;500;600&display=swap');`}</style>
        <TopBar view={view} setView={setView} onPost={() => setView({ name: "post" })} />
        <ManagePage idParam={view.id} token={view.token} setView={setView} />
        <Footer setView={setView} />
      </div>
    );
  }

  if (loading) {
    return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_BODY, color: C.steel }}>Loading listings…</div>;
  }

  return (
    <div style={{ fontFamily: FONT_BODY, background: C.paper, minHeight: "100%" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap');
        /* Removed the appearance:none reset — it was stripping the dropdown arrow off
           every select on the site with nothing replacing it, so dropdowns looked
           like plain text boxes. Native arrows are more recognizable, not less. */
        .hl-detail-grid { display: grid; grid-template-columns: 1.6fr 1fr; gap: 32px; }
        .hl-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .hl-spec-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px 18px; }
        @media (max-width: 720px) { .hl-detail-grid { grid-template-columns: 1fr; gap: 24px; } }
        @media (max-width: 480px) { .hl-form-grid { grid-template-columns: 1fr; } .hl-spec-grid { grid-template-columns: 1fr 1fr; } }
      `}</style>
      <TopBar view={view} setView={setView} onPost={() => setView({ name: "post" })} />
      {view.name === "home" && <Home setView={setView} allListings={enrichedListings} log={log} openListing={openListing} />}
      {view.name === "category" && <CategoryPage category={view.category} listings={enrichedListings} openListing={openListing} setView={setView} />}
      {view.name === "listing" && <ListingDetail id={view.id} setView={setView} allListings={enrichedListings} onBoost={handleBoost} log={log} />}
      {view.name === "post" && <PostAd setView={setView} onSubmit={handlePostSubmit} existingListings={listings} log={log} />}
      {view.name === "success" && <Success setView={setView} listingId={lastPostedId} manageLink={lastManageLink} />}
      {view.name === "quiz" && <Quiz setView={setView} log={log} onComplete={handleQuizComplete} />}
      {view.name === "quizResults" && <QuizResults answers={quizAnswers} allListings={enrichedListings} openListing={openListing} setView={setView} />}
      {view.name === "terms" && <Terms setView={setView} />}
      {view.name === "value" && <ValueMyCar allListings={listings} log={log} setView={setView} />}
      <Footer setView={setView} />
    </div>
  );
}
