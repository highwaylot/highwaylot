import React, { useState, useMemo } from "react";
import {
  Search, MapPin, Gauge, Fuel, Calendar, X, Plus, ChevronLeft, ChevronRight,
  ShieldCheck, Phone, SlidersHorizontal, Car as CarIcon, Check, Star,
  TrendingUp, Zap, BarChart3, Building2
} from "lucide-react";

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

// ---------- Analytics ----------
// Every tracked action funnels through here. In production this posts to your
// own analytics/events table (e.g. Supabase) instead of local state.
function useAnalytics() {
  const [events, setEvents] = useState([]);
  const log = (type, payload = {}) => {
    const evt = { id: Date.now() + Math.random(), type, payload, ts: new Date().toISOString() };
    setEvents((prev) => [evt, ...prev].slice(0, 500));
  };
  return { events, log };
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
  const tones = { neutral: { bg: "#EFEDE4", color: C.steel }, verified: { bg: C.greenBg, color: C.green }, yellow: { bg: "#FFF3D6", color: C.yellowDark } };
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
        <div style={{ marginTop: 10, display: "flex", gap: 6 }}>
          {listing.verified && <Badge tone="verified"><ShieldCheck size={11} />Verified</Badge>}
          <Badge tone="neutral">{listing.seller}</Badge>
        </div>
      </div>
    </div>
  );
}

// Big featured strip — the "larger photo grid slot" treatment
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
          <NavLink label="Browse" active={["home","listing"].includes(view.name)} onClick={() => setView({ name: "home" })} />
          <NavLink label="Find my car" active={["quiz","quizResults"].includes(view.name)} onClick={() => setView({ name: "quiz" })} />
          <NavLink label="Dealers" active={view.name === "dealer"} onClick={() => setView({ name: "dealer" })} />
          <NavLink label="Ad data" active={view.name === "data"} onClick={() => setView({ name: "data" })} />
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
        {(filters.query || filters.state || filters.make || filters.price || filters.seller) && (
          <button onClick={() => setFilters({ query: "", state: "", make: "", price: "", seller: "" })} style={{ ...selectStyle, cursor: "pointer", color: C.steel, display: "flex", alignItems: "center", gap: 4 }}><X size={13} /> Clear</button>
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
  const [filters, setFilters] = useState({ query: "", state: "", make: "", price: "", seller: "" });
  const [sort, setSort] = useState("new");
  const filtered = useMemo(() => {
    let list = allListings.filter((c) => {
      if (filters.query && !(`${c.make} ${c.model} ${c.trim}`.toLowerCase().includes(filters.query.toLowerCase()))) return false;
      if (filters.state && c.state !== filters.state) return false;
      if (filters.make && c.make !== filters.make) return false;
      if (filters.price && c.price > Number(filters.price)) return false;
      if (filters.seller && c.seller !== filters.seller) return false;
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
      <FilterBar filters={filters} setFilters={setFilters} count={filtered.length} sort={sort} setSort={setSort} log={log} />
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "24px 20px 60px" }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: C.steel }}>
            <div style={{ fontFamily: FONT_HEAD, fontSize: 20, color: C.ink, marginBottom: 6 }}>No matches</div>Try widening your search or clearing a filter.
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

// ---------- Listing detail + boost ----------
function ListingDetail({ id, setView, allListings, onBoost, log }) {
  const [revealed, setRevealed] = useState(false);
  const [showBoost, setShowBoost] = useState(false);
  const listing = allListings.find((c) => c.id === id);
  if (!listing) return null;
  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", padding: "24px 20px 60px" }}>
      <span onClick={() => setView({ name: "home" })} style={{ display: "inline-flex", alignItems: "center", gap: 4, color: C.steel, fontSize: 13.5, cursor: "pointer", marginBottom: 16 }}><ChevronLeft size={15} /> Back to listings</span>
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 32 }}>
        <div>
          <CarThumb make={listing.make} body={listing.body} size="large" />
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
        </div>
        <div>
          <div style={{ border: `1px solid ${C.line}`, borderRadius: 6, padding: 20 }}>
            <div style={{ fontFamily: FONT_HEAD, fontSize: 15, color: C.steel }}>{listing.year} {listing.make} {listing.model}</div>
            <div style={{ fontSize: 13, color: C.steel, marginTop: 2 }}>{listing.trim}</div>
            <div style={{ fontFamily: FONT_HEAD, fontSize: 30, color: C.ink, marginTop: 10 }}>{fmtPrice(listing.price)}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 8, fontSize: 13, color: C.steel }}><MapPin size={13} /> {listing.city}, {stateAbbr(listing.state)}</div>
            <div style={{ marginTop: 18, paddingTop: 16, borderTop: `1px solid ${C.line}` }}>
              {!revealed ? (
                <button onClick={() => { setRevealed(true); log("contact_reveal", { listingId: listing.id }); }} style={{ width: "100%", background: C.yellow, color: C.ink, border: "none", borderRadius: 4, padding: "12px 0", fontFamily: FONT_HEAD, fontSize: 14.5, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Phone size={15} /> Show contact info</button>
              ) : (
                <div style={{ background: "#F4F2EA", borderRadius: 4, padding: "12px 14px", fontSize: 14 }}>
                  <div style={{ color: C.steel, fontSize: 12 }}>Seller phone</div>
                  <div style={{ color: C.ink, fontWeight: 600, marginTop: 2 }}>(555) 019-{String(1000 + listing.id).slice(-4)}</div>
                </div>
              )}
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
  const plans = [
    { days: 3, price: 9, label: "3-day boost" },
    { days: 7, price: 19, label: "7-day boost" },
    { days: 14, price: 29, label: "14-day boost" },
  ];
  const [selected, setSelected] = useState(1);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(27,36,49,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 8, padding: 24, width: 360, maxWidth: "90vw" }}>
        <div style={{ fontFamily: FONT_HEAD, fontSize: 18, color: C.ink, marginBottom: 4 }}>Boost your listing</div>
        <div style={{ fontSize: 13, color: C.steel, marginBottom: 16 }}>Featured listings get a yellow-bordered card and a top slot on the homepage.</div>
        {plans.map((p, i) => (
          <label key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", border: `1px solid ${selected === i ? C.ink : C.line}`, borderRadius: 4, padding: "10px 12px", marginBottom: 8, cursor: "pointer" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
              <input type="radio" checked={selected === i} onChange={() => setSelected(i)} /> {p.label}
            </span>
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

// ---------- Post an ad ----------
function PostAd({ setView, onSubmit }) {
  const [form, setForm] = useState({ year:"", make:"", model:"", trim:"", price:"", mileage:"", city:"", state:"", fuel:"Gas", trans:"Automatic", color:"", seller:"Private", desc:"", phone:"" });
  const [errors, setErrors] = useState({});
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const submit = () => {
    const req = ["year","make","model","price","mileage","city","state","phone"];
    const errs = {}; req.forEach((k) => { if (!String(form[k]).trim()) errs[k] = true; });
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    onSubmit({ ...form, year: Number(form.year), price: Number(form.price), mileage: Number(form.mileage), body: "Sedan", verified: false, posted: "Just now", featured: false, desc: form.desc || "No additional description provided." });
  };
  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "36px 20px 70px" }}>
      <span onClick={() => setView({ name: "home" })} style={{ display: "inline-flex", alignItems: "center", gap: 4, color: C.steel, fontSize: 13.5, cursor: "pointer", marginBottom: 12 }}><ChevronLeft size={15} /> Cancel</span>
      <h2 style={{ fontFamily: FONT_HEAD, fontSize: 28, color: C.ink, margin: "0 0 4px" }}>Post your car</h2>
      <p style={{ color: C.steel, fontSize: 14, marginBottom: 24 }}>Listings are visible across the United States. Fields marked required.</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
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
      </div>
      <div style={{ marginTop: 14 }}><Field label="Description"><textarea value={form.desc} onChange={set("desc")} rows={4} style={{ ...inputStyle, resize: "vertical" }} /></Field></div>
      <button onClick={submit} style={{ marginTop: 24, background: C.yellow, color: C.ink, border: "none", borderRadius: 4, padding: "13px 26px", fontFamily: FONT_HEAD, fontSize: 15, cursor: "pointer" }}>Publish listing</button>
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

// ---------- Quiz ----------
const QUIZ_QUESTIONS = [
  { key: "use", q: "What's this car mainly for?", options: ["Daily commute", "Family/hauling", "Work/towing", "Fun/performance"] },
  { key: "budget", q: "What's your rough budget?", options: ["Under $20k", "$20k–$30k", "$30k–$40k", "$40k+"] },
  { key: "priority", q: "What matters most?", options: ["Fuel economy", "Space", "Reliability", "Speed"] },
];
const BODY_MAP = { "Daily commute": "Sedan", "Family/hauling": "SUV", "Work/towing": "Truck", "Fun/performance": "Coupe" };
const BUDGET_MAP = { "Under $20k": 20000, "$20k–$30k": 30000, "$30k–$40k": 40000, "$40k+": 100000 };

function Quiz({ setView, log, onComplete }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const q = QUIZ_QUESTIONS[step];
  const choose = (opt) => {
    const next = { ...answers, [q.key]: opt };
    setAnswers(next);
    log("quiz_answer", { question: q.key, answer: opt });
    if (step + 1 < QUIZ_QUESTIONS.length) setStep(step + 1);
    else { log("quiz_complete", next); onComplete(next); }
  };
  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: "60px 20px" }}>
      <div style={{ fontSize: 12.5, color: C.steel, marginBottom: 8 }}>Question {step + 1} of {QUIZ_QUESTIONS.length}</div>
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
  const bodyPref = BODY_MAP[answers.use];
  const maxPrice = BUDGET_MAP[answers.budget];
  const matches = allListings.filter((c) => c.body === bodyPref && c.price <= maxPrice).slice(0, 6);
  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "48px 20px 60px" }}>
      <div style={{ textAlign: "center", marginBottom: 30 }}>
        <div style={{ fontSize: 13, color: C.steel }}>Based on your answers</div>
        <h2 style={{ fontFamily: FONT_HEAD, fontSize: 30, color: C.ink, margin: "6px 0" }}>You're a {bodyPref} person</h2>
        <p style={{ color: C.steel, fontSize: 14 }}>Prioritizing {answers.priority?.toLowerCase()}, budget {answers.budget}.</p>
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
    { name: "Starter", price: 0, features: ["Up to 3 active listings", "Standard placement", "Basic seller badge"] },
    { name: "Dealer Pro", price: 149, highlight: true, features: ["Unlimited listings", "Always-featured placement", "Priority in search results", "Monthly market data report"] },
    { name: "Dealer Elite", price: 349, features: ["Everything in Pro", "Homepage banner rotation", "Custom regional ad targeting", "Dedicated account contact"] },
  ];
  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "48px 20px 70px" }}>
      <div style={{ textAlign: "center", marginBottom: 34 }}>
        <Building2 size={28} color={C.ink} style={{ marginBottom: 8 }} />
        <h2 style={{ fontFamily: FONT_HEAD, fontSize: 30, color: C.ink, margin: "0 0 6px" }}>Dealer subscriptions</h2>
        <p style={{ color: C.steel, fontSize: 14 }}>Bulk posting and always-boosted placement for dealerships.</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {tiers.map((t) => (
          <div key={t.name} style={{ border: t.highlight ? `2px solid ${C.yellow}` : `1px solid ${C.line}`, borderRadius: 8, padding: 22, background: "#fff" }}>
            {t.highlight && <div style={{ marginBottom: 8 }}><Badge tone="yellow">Most popular</Badge></div>}
            <div style={{ fontFamily: FONT_HEAD, fontSize: 18, color: C.ink }}>{t.name}</div>
            <div style={{ fontFamily: FONT_HEAD, fontSize: 30, color: C.ink, margin: "8px 0" }}>{t.price === 0 ? "Free" : `$${t.price}`}{t.price > 0 && <span style={{ fontSize: 13, color: C.steel }}>/mo</span>}</div>
            <div style={{ marginTop: 12 }}>
              {t.features.map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13.5, color: "#3B4250", marginBottom: 8 }}><Check size={14} color={C.green} style={{ marginTop: 2, flexShrink: 0 }} />{f}</div>
              ))}
            </div>
            <button onClick={() => log("dealer_plan_click", { plan: t.name })} style={{ width: "100%", marginTop: 12, background: t.highlight ? C.yellow : "transparent", border: t.highlight ? "none" : `1px solid ${C.line}`, borderRadius: 4, padding: "10px 0", fontFamily: FONT_HEAD, cursor: "pointer" }}>{t.price === 0 ? "Get started" : "Choose plan"}</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Ad data dashboard ----------
function DataDashboard({ events }) {
  const counts = useMemo(() => {
    const c = {};
    events.forEach((e) => { c[e.type] = (c[e.type] || 0) + 1; });
    return c;
  }, [events]);
  const searchTerms = events.filter((e) => e.type === "search").map((e) => e.payload.query);
  const stateFilters = events.filter((e) => e.type === "filter_state" && e.payload.state).map((e) => e.payload.state);
  const quizProfiles = events.filter((e) => e.type === "quiz_complete");

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 20px 70px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <BarChart3 size={22} color={C.ink} />
        <h2 style={{ fontFamily: FONT_HEAD, fontSize: 26, color: C.ink, margin: 0 }}>Ad targeting data</h2>
      </div>
      <p style={{ color: C.steel, fontSize: 14, marginBottom: 24, maxWidth: 640 }}>
        Every search, filter, quiz answer, and boost click on this site feeds this table. This is the raw material an ad-targeting product would run on — segments get built from patterns here, not sold as this raw feed.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 28 }}>
        {Object.entries(counts).map(([type, n]) => (
          <div key={type} style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 6, padding: "14px 16px" }}>
            <div style={{ fontSize: 11.5, color: C.steel, textTransform: "uppercase", letterSpacing: 0.3 }}>{type.replace(/_/g, " ")}</div>
            <div style={{ fontFamily: FONT_HEAD, fontSize: 24, color: C.ink, marginTop: 4 }}>{n}</div>
          </div>
        ))}
        {events.length === 0 && <div style={{ color: C.steel, fontSize: 13.5, gridColumn: "1 / -1" }}>No activity yet — browse, search, or take the quiz to generate data.</div>}
      </div>

      {searchTerms.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontFamily: FONT_HEAD, fontSize: 14, color: C.ink, marginBottom: 8 }}>Recent search terms</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{searchTerms.slice(0, 20).map((t, i) => <Badge key={i} tone="neutral">{t}</Badge>)}</div>
        </div>
      )}
      {stateFilters.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontFamily: FONT_HEAD, fontSize: 14, color: C.ink, marginBottom: 8 }}>State interest signals</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{stateFilters.slice(0, 20).map((s, i) => <Badge key={i} tone="neutral">{s}</Badge>)}</div>
        </div>
      )}
      {quizProfiles.length > 0 && (
        <div>
          <div style={{ fontFamily: FONT_HEAD, fontSize: 14, color: C.ink, marginBottom: 8 }}>Quiz-derived buyer profiles</div>
          {quizProfiles.slice(0, 10).map((e, i) => (
            <div key={i} style={{ fontSize: 13, color: "#3B4250", background: "#fff", border: `1px solid ${C.line}`, borderRadius: 4, padding: "8px 12px", marginBottom: 6 }}>
              {e.payload.use} · {e.payload.budget} · prioritizes {e.payload.priority?.toLowerCase()}
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 30, padding: 16, background: C.greenBg, borderRadius: 6, display: "flex", gap: 10, alignItems: "flex-start" }}>
        <TrendingUp size={18} color={C.green} style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: 13, color: "#1F4432", lineHeight: 1.5 }}>
          In production, this table lives in a real database instead of memory, and gets rolled up into aggregate segments (e.g. "truck-interested, Texas, $20–35k budget") — that's what gets packaged for advertisers, never raw individual records.
        </div>
      </div>
    </div>
  );
}

// ---------- Footer ----------
function Footer() {
  return (
    <div style={{ background: C.ink, borderTop: `3px solid ${C.yellow}`, marginTop: 40 }}>
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "26px 20px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12.5 }}>Highway Lot — buy and sell cars nationwide.</div>
        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>Currently available in the United States only.</div>
      </div>
    </div>
  );
}

// ---------- App ----------
export default function App() {
  const [view, setView] = useState({ name: "home" });
  const [listings, setListings] = useState(seed);
  const [lastPostedId, setLastPostedId] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState(null);
  const { events, log } = useAnalytics();

  const openListing = (id) => { log("listing_view", { listingId: id }); setView({ name: "listing", id }); };
  const handlePostSubmit = (data) => {
    const newId = Math.max(...listings.map((c) => c.id)) + 1;
    setListings([{ ...data, id: newId }, ...listings]);
    setLastPostedId(newId);
    log("listing_created", { listingId: newId });
    setView({ name: "success" });
  };
  const handleBoost = (id) => {
    setListings(listings.map((c) => (c.id === id ? { ...c, featured: true } : c)));
    log("boost_confirmed", { listingId: id });
  };

  return (
    <div style={{ fontFamily: FONT_BODY, background: C.paper, minHeight: "100%" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600&family=Inter:wght@400;500;600&display=swap');
        select { -webkit-appearance: none; appearance: none; }
      `}</style>
      <TopBar view={view} setView={setView} onPost={() => setView({ name: "post" })} />
      {view.name === "home" && <Home setView={setView} allListings={listings} log={log} openListing={openListing} />}
      {view.name === "listing" && <ListingDetail id={view.id} setView={setView} allListings={listings} onBoost={handleBoost} log={log} />}
      {view.name === "post" && <PostAd setView={setView} onSubmit={handlePostSubmit} />}
      {view.name === "success" && <Success setView={setView} listingId={lastPostedId} />}
      {view.name === "quiz" && <Quiz setView={setView} log={log} onComplete={(a) => { setQuizAnswers(a); setView({ name: "quizResults" }); }} />}
      {view.name === "quizResults" && <QuizResults answers={quizAnswers} allListings={listings} openListing={openListing} setView={setView} />}
      {view.name === "dealer" && <DealerPage log={log} />}
      {view.name === "data" && <DataDashboard events={events} />}
      <Footer />
    </div>
  );
}
