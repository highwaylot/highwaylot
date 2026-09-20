import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, SlidersHorizontal, X, Check } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { C, FONT_HEAD, FONT_BODY, US_STATES, seed, selectStyle, inputStyle } from "../data/constants";
import { fmtPrice, categoryToPath } from "../lib/format";
import { ListingCard, FeaturedStrip, RecentlySold, PopularSearches } from "../components/shared";

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

export function Home({ allListings, recentlySold, log, openListing }) {
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
