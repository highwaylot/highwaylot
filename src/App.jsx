import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Search, MapPin, Gauge, Fuel, Calendar, X, Plus, ChevronLeft, ChevronRight,
  ShieldCheck, Phone, SlidersHorizontal, Car as CarIcon, Check, Star,
  TrendingUp, TrendingDown, Zap, BarChart3, Building2, Camera, Lock, FileText, DollarSign, Info
} from "lucide-react";
import { supabase } from "./lib/supabaseClient";

// ---------- Design tokens ----------
const C = {
  ink: "#1B2431", paper: "#FAFAF6", yellow: "#F5B700", yellowDark: "#8A6600",
  steel: "#5B6472", line: "#DEDBD1", green: "#2F6B4F", greenBg: "#E7F0EA", card: "#FFFFFF",
};
const FONT_HEAD = "'Oswald', 'Arial Narrow', sans-serif";
const FONT_BODY = "'Inter', system-ui, sans-serif";

const US_STATES = ["California","Texas","Florida","New York","Illinois","Ohio","Georgia","Washington","Colorado","Arizona","Pennsylvania","North Carolina","Michigan","Tennessee","Nevada","Oregon"];
const STATE_ABBR = { California:"CA",Texas:"TX",Florida:"FL","New York":"NY",Illinois:"IL",Ohio:"OH",Georgia:"GA",Washington:"WA",Colorado:"CO",Arizona:"AZ",Pennsylvania:"PA","North Carolina":"NC",Michigan:"MI",Tennessee:"TN",Nevada:"NV",Oregon:"OR" };
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
const selectStyle = { border: `1px solid ${C.line}`, borderRadius: 4, padding: "7px 10px", fontSize: 13, color: C.ink, background: "#fff", fontFamily: FONT_BODY };
const inputStyle = { width: "100%", border: `1px solid ${C.line}`, borderRadius: 4, padding: "9px 10px", fontSize: 14, color: C.ink, fontFamily: FONT_BODY, boxSizing: "border-box", background: "#fff" };

function ListingCard({ listing, onOpen }) {
  return (
    <div onClick={() => onOpen(listing.id)} style={{ background: C.card, border: listing.featured ? `2px solid ${C.yellow}` : `1px solid ${C.line}`, borderRadius: 6, cursor: "pointer", overflow: "hidden" }}>
      <CarThumb make={listing.make} body={listing.body} />
      <div style={{ padding: "14px 14px 16px" }}>
        {listing.featured && <div style={{ marginBottom: 6 }}><Badge tone="yellow"><Star size={11} />Featured</Badge></div>}
        <div style={{ fontFamily: FONT_HEAD, fontSize: 17, color: C.ink, lineHeight: 1.25 }}>{listing.year} {listing.make} {listing.model}</div>
        <div style={{ fontSize: 13, color: C.steel, marginTop: 2 }}>{listing.trim}</div>
        <div style={{ fontFamily: FONT_HEAD, fontSize: 22, color: C.ink, marginTop: 8 }}>{fmtPrice(listing.price)}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8, fontSize: 12.5, color: C.steel }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Gauge size={13} />{fmtMiles(listing.mileage)}</span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><MapPin size={13} />{listing.city}, {stateAbbr(listing.state)}</span>
        </div>
        <div style={{ fontSize: 11.5, color: C.steel, marginTop: 4 }}>Listed {listing.posted}</div>
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
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(featured.length, 3)}, 1fr)`, gap: 16 }}>
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
    const map = {};
    listings.forEach((c) => {
      const key = `${c.body}|${c.state}`;
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map)
      .filter(([, count]) => count >= 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([key, count]) => {
        const [body, state] = key.split("|");
        return { body, state, count };
      });
  }, [listings]);

  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", padding: "28px 20px 0" }}>
      <div style={{ fontFamily: FONT_HEAD, fontSize: 14, color: C.steel, letterSpacing: 0.5, marginBottom: 10 }}>POPULAR SEARCHES</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {combos.map((c, i) => (
          <button key={i} onClick={() => onOpenCategory(c)} style={{ border: `1px solid ${C.line}`, background: "#fff", borderRadius: 20, padding: "8px 14px", fontSize: 13, color: C.ink, cursor: "pointer" }}>
            {c.body}s for sale in {c.state} ({c.count})
          </button>
        ))}
      </div>
    </div>
  );
}

function CategoryPage({ category, listings, openListing, setView }) {
  const matches = listings.filter((c) => c.body === category.body && c.state === category.state);
  const avgPrice = matches.length ? Math.round(matches.reduce((s, c) => s + c.price, 0) / matches.length) : 0;
  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", padding: "28px 20px 60px" }}>
      <span onClick={() => setView({ name: "home" })} style={{ display: "inline-flex", alignItems: "center", gap: 4, color: C.steel, fontSize: 13.5, cursor: "pointer", marginBottom: 16 }}><ChevronLeft size={15} /> Back to all listings</span>
      <h1 style={{ fontFamily: FONT_HEAD, fontSize: 28, color: C.ink, margin: "0 0 8px" }}>{category.body}s for sale in {category.state}</h1>
      <p style={{ color: C.steel, fontSize: 14.5, maxWidth: 640, marginBottom: 24 }}>
        {matches.length} {category.body.toLowerCase()}{matches.length === 1 ? "" : "s"} currently listed in {category.state}, averaging {fmtPrice(avgPrice)}. Updated automatically as sellers post and sell — this page is generated straight from live listing data.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
        {matches.map((c) => <ListingCard key={c.id} listing={c} onOpen={openListing} />)}
      </div>
      <div style={{ marginTop: 24, padding: 14, background: "#F4F2EA", borderRadius: 6, fontSize: 12.5, color: C.steel }}>
        In production, this page lives at its own address (like /trucks-for-sale/texas) so it can show up directly in Google search results — every body-style-and-state combination gets one automatically as inventory grows.
      </div>
    </div>
  );
}

// ---------- Top nav ----------
function TopBar({ view, setView, onPost }) {
  return (
    <div style={{ background: C.ink, borderBottom: `3px solid ${C.yellow}` }}>
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 20px", display: "flex", alignItems: "center", height: 64, gap: 20 }}>
        <div onClick={() => setView({ name: "home" })} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <div style={{ width: 30, height: 30, background: C.yellow, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}><CarIcon size={18} color={C.ink} strokeWidth={2.25} /></div>
          <span style={{ fontFamily: FONT_HEAD, fontSize: 20, letterSpacing: 0.5, color: "#fff" }}>HIGHWAY LOT</span>
        </div>
        <div style={{ display: "flex", gap: 18, flex: 1 }}>
          <NavLink label="Browse" active={["home","listing","category"].includes(view.name)} onClick={() => setView({ name: "home" })} />
          <NavLink label="Value my car" active={view.name === "value"} onClick={() => setView({ name: "value" })} />
          <NavLink label="Find my car" active={["quiz","quizResults"].includes(view.name)} onClick={() => setView({ name: "quiz" })} />
        </div>
        <button onClick={onPost} style={{ background: C.yellow, color: C.ink, border: "none", borderRadius: 4, padding: "9px 16px", fontFamily: FONT_HEAD, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          <Plus size={16} strokeWidth={2.5} /> Post an ad
        </button>
      </div>
    </div>
  );
}
function NavLink({ label, active, onClick }) {
  return <span onClick={onClick} style={{ color: active ? "#fff" : "rgba(255,255,255,0.65)", fontSize: 14.5, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", borderBottom: active ? `2px solid ${C.yellow}` : "2px solid transparent", height: 64 }}>{label}</span>;
}

// ---------- Hero + filters ----------
function Hero({ filters, setFilters, log }) {
  return (
    <div style={{ background: C.ink }}>
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "44px 20px 24px" }}>
        <h1 style={{ fontFamily: FONT_HEAD, fontSize: 38, color: "#fff", margin: 0, lineHeight: 1.1, maxWidth: 560 }}>Buy and sell cars, coast to coast.</h1>
        <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 15, marginTop: 10, maxWidth: 480 }}>{seed.length.toLocaleString()}+ listings from private sellers and dealers across the United States.</p>
        <div style={{ background: "#fff", borderRadius: 6, marginTop: 22, padding: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
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
        <select value={filters.price} onChange={(e) => { setFilters({ ...filters, price: e.target.value }); log("filter_price", { max: e.target.value }); }} style={selectStyle}>
          <option value="">Any price</option><option value="20000">Under $20,000</option><option value="30000">Under $30,000</option><option value="40000">Under $40,000</option>
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
        {(filters.query || filters.state || filters.make || filters.price || filters.seller || filters.age) && (
          <button onClick={() => setFilters({ query: "", state: "", make: "", price: "", seller: "", age: "" })} style={{ ...selectStyle, cursor: "pointer", color: C.steel, display: "flex", alignItems: "center", gap: 4 }}><X size={13} /> Clear</button>
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
  const [filters, setFilters] = useState({ query: "", state: "", make: "", price: "", seller: "", age: "" });
  const [sort, setSort] = useState("new");
  const filtered = useMemo(() => {
    let list = allListings.filter((c) => {
      if (filters.query && !(`${c.make} ${c.model} ${c.trim}`.toLowerCase().includes(filters.query.toLowerCase()))) return false;
      if (filters.state && c.state !== filters.state) return false;
      if (filters.make && c.make !== filters.make) return false;
      if (filters.price && c.price > Number(filters.price)) return false;
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

// ---------- Damage diagram ----------
// Top-down 2D diagram, not a rotatable 3D model — true 3D would need licensed
// car models and a 3D engine, which isn't realistic to fake with placeholder
// assets. This gets the actual job done: click a spot, mark what's wrong there.
function getShapeType(bodyType) {
  if (bodyType === "Truck") return "truck";
  if (bodyType === "SUV" || bodyType === "Wagon") return "suv";
  return "sedan"; // covers Sedan, Coupe
}
function CarShapeSvg({ shape }) {
  const wheels = (positions) => positions.map((p, i) => <rect key={i} x={p[0]} y={p[1]} width={14} height={22} rx={3} fill={C.steel} opacity={0.5} />);
  if (shape === "truck") {
    return (
      <g>
        <rect x={20} y={40} width={110} height={70} rx={10} fill="#EFEDE4" stroke={C.line} />
        <rect x={140} y={50} width={160} height={55} rx={6} fill="#EFEDE4" stroke={C.line} />
        {wheels([[35, 20], [35, 108], [250, 20], [250, 108]])}
      </g>
    );
  }
  if (shape === "suv") {
    return (
      <g>
        <rect x={20} y={35} width={280} height={80} rx={16} fill="#EFEDE4" stroke={C.line} />
        {wheels([[45, 18], [45, 110], [235, 18], [235, 110]])}
      </g>
    );
  }
  // sedan / coupe
  return (
    <g>
      <path d="M 30 75 Q 30 45 70 42 L 110 30 Q 160 22 210 30 L 250 42 Q 290 45 290 75 Q 290 100 260 105 L 60 105 Q 30 100 30 75 Z" fill="#EFEDE4" stroke={C.line} />
      {wheels([[55, 18], [55, 110], [225, 18], [225, 110]])}
    </g>
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
      <svg ref={svgRef} viewBox="0 0 320 150" onClick={handleClick} style={{ width: "100%", maxWidth: 420, background: "#FAFAF6", borderRadius: 8, cursor: editable ? "crosshair" : "default", display: "block", border: `1px solid ${C.line}` }}>
        <CarShapeSvg shape={shape} />
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
  const listing = allListings.find((c) => c.id === id);
  if (!listing) return null;
  const photos = listing.photos && listing.photos.length ? listing.photos : null;
  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", padding: "24px 20px 60px" }}>
      <span onClick={() => setView({ name: "home" })} style={{ display: "inline-flex", alignItems: "center", gap: 4, color: C.steel, fontSize: 13.5, cursor: "pointer", marginBottom: 16 }}><ChevronLeft size={15} /> Back to listings</span>
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 32 }}>
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
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px 18px" }}>
              <Spec icon={<Calendar size={14} />} label="Year" value={listing.year} />
              <Spec icon={<Gauge size={14} />} label="Mileage" value={fmtMiles(listing.mileage)} />
              <Spec icon={<Fuel size={14} />} label="Fuel type" value={listing.fuel} />
              <Spec label="Transmission" value={listing.trans} />
              <Spec label="Exterior color" value={listing.color} />
              <Spec label="Body style" value={listing.body} />
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
            <div style={{ fontFamily: FONT_HEAD, fontSize: 30, color: C.ink, marginTop: 10 }}>{fmtPrice(listing.price)}</div>
            {listing.fairness && (
              <div style={{ marginTop: 6 }}>
                <FairnessBadge fairness={listing.fairness} />
                <div style={{ fontSize: 11.5, color: C.steel, marginTop: 4 }}>
                  {Math.abs(Math.round(listing.fairness.diffPct * 100))}% {listing.fairness.diffPct < 0 ? "below" : "above"} the average of {listing.fairness.compCount} similar {listing.fairness.compCount === 1 ? "listing" : "listings"} on Highway Lot
                </div>
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 8, fontSize: 13, color: C.steel }}><MapPin size={13} /> {listing.city}, {stateAbbr(listing.state)}</div>
            <div style={{ fontSize: 12, color: C.steel, marginTop: 4 }}>Listed {listing.posted}</div>
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
                Meet in a public place. Highway Lot doesn't handle payments or verify vehicles between buyers and sellers — see our <span style={{ textDecoration: "underline", cursor: "pointer" }} onClick={() => setView({ name: "terms" })}>terms</span>.
              </div>
            </div>
            {!listing.featured && (
              <button onClick={() => setShowBoost(true)} style={{ width: "100%", marginTop: 10, background: "transparent", color: C.ink, border: `1px solid ${C.line}`, borderRadius: 4, padding: "10px 0", fontFamily: FONT_HEAD, fontSize: 13.5, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Zap size={14} /> Boost this listing</button>
            )}
          </div>
        </div>
      </div>
      {showBoost && <BoostModal listing={listing} onClose={() => setShowBoost(false)} onConfirm={() => { onBoost(listing.id); setShowBoost(false); }} />}
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
function PostAd({ setView, onSubmit }) {
  const [form, setForm] = useState({ year:"", make:"", model:"", trim:"", price:"", mileage:"", city:"", state:"", fuel:"Gas", trans:"Automatic", color:"", seller:"Private", body:"", condition:"Good", desc:"", phone:"" });
  const [photos, setPhotos] = useState([]);
  const [damagePoints, setDamagePoints] = useState([]);
  const [errors, setErrors] = useState({});
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const addPhotos = (fileList) => {
    const files = Array.from(fileList).slice(0, 8 - photos.length);
    const urls = files.map((f) => URL.createObjectURL(f));
    setPhotos([...photos, ...urls]);
  };
  const removePhoto = (i) => setPhotos(photos.filter((_, idx) => idx !== i));

  const submit = () => {
    const req = ["year","make","model","price","mileage","city","state","phone","body"];
    const errs = {}; req.forEach((k) => { if (!String(form[k]).trim()) errs[k] = true; });
    if (photos.length < 3) errs.photos = true;
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    onSubmit({ ...form, year: Number(form.year), price: Number(form.price), mileage: Number(form.mileage), verified: false, posted: "Just now", featured: false, photos, damage_points: damagePoints, desc: form.desc || "No additional description provided." });
  };

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "36px 20px 70px" }}>
      <span onClick={() => setView({ name: "home" })} style={{ display: "inline-flex", alignItems: "center", gap: 4, color: C.steel, fontSize: 13.5, cursor: "pointer", marginBottom: 12 }}><ChevronLeft size={15} /> Cancel</span>
      <h2 style={{ fontFamily: FONT_HEAD, fontSize: 28, color: C.ink, margin: "0 0 4px" }}>Post your car</h2>
      <p style={{ color: C.steel, fontSize: 14, marginBottom: 24 }}>Listings are visible across the United States. Fields marked required.</p>

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

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 18 }}>
        <Field label="Year" required error={errors.year}><input value={form.year} onChange={set("year")} placeholder="2021" style={inputStyle} /></Field>
        <Field label="Make" required error={errors.make}><input value={form.make} onChange={set("make")} placeholder="Ford" style={inputStyle} /></Field>
        <Field label="Model" required error={errors.model}><input value={form.model} onChange={set("model")} placeholder="F-150" style={inputStyle} /></Field>
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
          <select value={form.body} onChange={set("body")} style={inputStyle}><option value="">Select body style</option><option>Sedan</option><option>SUV</option><option>Truck</option><option>Coupe</option><option>Wagon</option></select>
        </Field>
        <Field label="Condition"><select value={form.condition} onChange={set("condition")} style={inputStyle}><option>Excellent</option><option>Good</option><option>Fair</option><option>Needs work</option></select></Field>
      </div>
      <div style={{ marginTop: 14 }}><Field label="Description"><textarea value={form.desc} onChange={set("desc")} rows={4} style={{ ...inputStyle, resize: "vertical" }} /></Field></div>

      <div style={{ marginTop: 18 }}>
        <Field label="Damage report (optional)">
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
      <button onClick={submit} style={{ marginTop: 18, background: C.yellow, color: C.ink, border: "none", borderRadius: 4, padding: "13px 26px", fontFamily: FONT_HEAD, fontSize: 15, cursor: "pointer" }}>Publish listing</button>
    </div>
  );
}
function Field({ label, required, error, children }) {
  return <div><label style={{ fontSize: 12.5, color: error ? "#B23A3A" : C.steel, display: "block", marginBottom: 4 }}>{label}{required && " *"}{error && " — required"}</label>{children}</div>;
}

function Success({ setView, listingId }) {
  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "80px 20px", textAlign: "center" }}>
      <div style={{ width: 52, height: 52, borderRadius: "50%", background: C.greenBg, color: C.green, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}><Check size={26} /></div>
      <h2 style={{ fontFamily: FONT_HEAD, fontSize: 24, color: C.ink, margin: "0 0 8px" }}>Your ad is live</h2>
      <p style={{ color: C.steel, fontSize: 14.5, marginBottom: 26 }}>Buyers across the country can now see your listing.</p>
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
  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "48px 20px 60px" }}>
      <div style={{ textAlign: "center", marginBottom: 30 }}>
        <div style={{ fontSize: 13, color: C.steel }}>Your result</div>
        <h2 style={{ fontFamily: FONT_HEAD, fontSize: 32, color: C.ink, margin: "6px 0" }}>You're a {archetype.name}</h2>
        <p style={{ color: C.steel, fontSize: 14.5, maxWidth: 440, margin: "0 auto" }}>{archetype.blurb}</p>
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

function computeMechanicalDeduction(issues) {
  const breakdown = [];
  let total = 0;
  MECHANICAL_SYSTEMS.forEach((sys) => {
    const status = issues[sys.key];
    if (!status) return;
    const opt = STATUS_OPTIONS.find((o) => o.key === status);
    const deduction = Math.round(sys.max * opt.weight);
    if (deduction > 0) { breakdown.push({ label: sys.label, status, deduction }); total += deduction; }
    else breakdown.push({ label: sys.label, status, deduction: 0 });
  });
  return { total, breakdown };
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
// the car's age, then blended with real comps from Highway Lot's own listings
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

  const { total: mechanicalDeduction, breakdown } = computeMechanicalDeduction(issues);
  // Floor the final number so a pile of deductions can't push it to $0 or negative —
  // a car is worth at least scrap/parts value even in bad shape.
  const floor = Math.max(estimate * 0.1, 400);
  estimate = Math.max(estimate - mechanicalDeduction, floor);

  return { estimate: Math.round(estimate / 100) * 100, confidence, compCount: comps.length, mechanicalDeduction, breakdown };
}

function ValueMyCar({ allListings, log, setView }) {
  const [form, setForm] = useState({ year: "", make: "", model: "", mileage: "", condition: "Good", originalPrice: "" });
  const [issues, setIssues] = useState({});
  const [result, setResult] = useState(null);
  const [errors, setErrors] = useState({});
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async () => {
    const req = ["year", "make", "model", "mileage", "originalPrice"];
    const errs = {}; req.forEach((k) => { if (!String(form[k]).trim()) errs[k] = true; });
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const input = { year: Number(form.year), make: form.make, model: form.model, mileage: Number(form.mileage), condition: form.condition, originalPrice: Number(form.originalPrice) };
    const res = estimateValue(input, allListings, issues);
    setResult(res);
    log("valuation_submitted", { ...input, issues });
    supabase.from("valuations").insert({ ...input, estimate: res.estimate, confidence: res.confidence, issues }).then(({ error }) => {
      if (error) console.error("valuation save failed:", error.message);
    });
  };

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "48px 20px 70px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <DollarSign size={22} color={C.ink} />
        <h2 style={{ fontFamily: FONT_HEAD, fontSize: 28, color: C.ink, margin: 0 }}>What's your car worth?</h2>
      </div>
      <p style={{ color: C.steel, fontSize: 14, marginBottom: 24 }}>A real estimate built from depreciation data and actual Highway Lot listings — not a guess.</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Field label="Year" required error={errors.year}><input value={form.year} onChange={set("year")} placeholder="2019" style={inputStyle} /></Field>
        <Field label="Make" required error={errors.make}><input value={form.make} onChange={set("make")} placeholder="Toyota" style={inputStyle} /></Field>
        <Field label="Model" required error={errors.model}><input value={form.model} onChange={set("model")} placeholder="Camry" style={inputStyle} /></Field>
        <Field label="Current mileage" required error={errors.mileage}><input value={form.mileage} onChange={set("mileage")} placeholder="52000" style={inputStyle} /></Field>
        <Field label="Original price paid" required error={errors.originalPrice}><input value={form.originalPrice} onChange={set("originalPrice")} placeholder="28000" style={inputStyle} /></Field>
        <Field label="Overall condition"><select value={form.condition} onChange={set("condition")} style={inputStyle}><option>Excellent</option><option>Good</option><option>Fair</option><option>Needs work</option></select></Field>
      </div>

      <div style={{ marginTop: 22 }}>
        <div style={{ fontSize: 12.5, color: C.steel, marginBottom: 4 }}>Known issues (optional) — flag anything specific and we'll factor it in</div>
        <MechanicalChecklist issues={issues} onChange={setIssues} />
      </div>

      <button onClick={submit} style={{ marginTop: 20, background: C.yellow, color: C.ink, border: "none", borderRadius: 4, padding: "13px 26px", fontFamily: FONT_HEAD, fontSize: 15, cursor: "pointer" }}>Get my estimate</button>

      {result && (
        <div style={{ marginTop: 28, border: `1px solid ${C.line}`, borderRadius: 8, padding: 24, textAlign: "center" }}>
          <div style={{ fontSize: 12.5, color: C.steel, textTransform: "uppercase", letterSpacing: 0.4 }}>Estimated value</div>
          <div style={{ fontFamily: FONT_HEAD, fontSize: 40, color: C.ink, margin: "8px 0" }}>{fmtPrice(result.estimate)}</div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Badge tone={result.confidence === "High" ? "verified" : result.confidence === "Medium" ? "yellow" : "neutral"}>{result.confidence} confidence</Badge>
          </div>
          <div style={{ fontSize: 12.5, color: C.steel, marginTop: 12, lineHeight: 1.5 }}>
            {result.compCount > 0
              ? `Based on depreciation modeling plus ${result.compCount} similar ${result.compCount === 1 ? "listing" : "listings"} currently on Highway Lot.`
              : "Based on depreciation modeling only — no similar listings on Highway Lot yet to compare against. Estimates get sharper as more real cars get listed."}
          </div>

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
                Rough repair-cost estimates, not a mechanic's quote — actual costs vary by shop and region.
              </div>
            </div>
          )}

          <button onClick={() => setView({ name: "post" })} style={{ marginTop: 16, background: "transparent", border: `1px solid ${C.line}`, borderRadius: 4, padding: "10px 20px", fontFamily: FONT_HEAD, cursor: "pointer" }}>List this car</button>
        </div>
      )}
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
        ["We're a listing platform, not a party to any sale.", "Highway Lot connects buyers and sellers. We are not involved in, and do not facilitate, the actual exchange of money or the vehicle."],
        ["We don't verify listings.", "We don't inspect vehicles, confirm seller identity, or check vehicle history unless explicitly noted on a listing. Buyers are responsible for their own due diligence."],
        ["No ID required to list or browse.", "You don't need to submit identification to use Highway Lot. Contact info is only shared when you choose to reveal it."],
        ["Transactions are at your own risk.", "Meet in public, verify the vehicle in person, and use secure payment methods. Highway Lot does not mediate disputes between buyers and sellers."],
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
    <div style={{ background: C.ink, borderTop: `3px solid ${C.yellow}`, marginTop: 40 }}>
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "26px 20px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12.5 }}>Highway Lot — buy and sell cars nationwide.</div>
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

export default function App() {
  const [view, setView] = useState({ name: "home" });
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastPostedId, setLastPostedId] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState(null);
  const { log } = useAnalytics();

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("listings").select("*").order("created_at", { ascending: false });
      if (error) { console.error("fetch listings failed:", error.message); setLoading(false); return; }
      setListings(data.map(rowToListing));
      setLoading(false);
    })();
  }, []);

  const openListing = (id) => { log("listing_view", { listingId: id }); setView({ name: "listing", id }); };

  const enrichedListings = useMemo(() => listings.map((l) => ({ ...l, fairness: estimateFairness(l, listings) })), [listings]);

  const handlePostSubmit = async (data) => {
    const { desc, ...rest } = data;
    const { data: inserted, error } = await supabase.from("listings").insert({ ...rest, description: desc }).select().single();
    if (error) { console.error("post listing failed:", error.message); return; }
    const newListing = rowToListing(inserted);
    setListings([newListing, ...listings]);
    setLastPostedId(newListing.id);
    log("listing_created", { listingId: newListing.id });
    setView({ name: "success" });
  };

  const handleBoost = async (id) => {
    const { error } = await supabase.from("listings").update({ featured: true }).eq("id", id);
    if (error) { console.error("boost failed:", error.message); return; }
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

  if (loading) {
    return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_BODY, color: C.steel }}>Loading listings…</div>;
  }

  return (
    <div style={{ fontFamily: FONT_BODY, background: C.paper, minHeight: "100%" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600&family=Inter:wght@400;500;600&display=swap');
        select { -webkit-appearance: none; appearance: none; }
      `}</style>
      <TopBar view={view} setView={setView} onPost={() => setView({ name: "post" })} />
      {view.name === "home" && <Home setView={setView} allListings={enrichedListings} log={log} openListing={openListing} />}
      {view.name === "category" && <CategoryPage category={view.category} listings={enrichedListings} openListing={openListing} setView={setView} />}
      {view.name === "listing" && <ListingDetail id={view.id} setView={setView} allListings={enrichedListings} onBoost={handleBoost} log={log} />}
      {view.name === "post" && <PostAd setView={setView} onSubmit={handlePostSubmit} />}
      {view.name === "success" && <Success setView={setView} listingId={lastPostedId} />}
      {view.name === "quiz" && <Quiz setView={setView} log={log} onComplete={handleQuizComplete} />}
      {view.name === "quizResults" && <QuizResults answers={quizAnswers} allListings={enrichedListings} openListing={openListing} setView={setView} />}
      {view.name === "terms" && <Terms setView={setView} />}
      {view.name === "value" && <ValueMyCar allListings={listings} log={log} setView={setView} />}
      <Footer setView={setView} />
    </div>
  );
}
