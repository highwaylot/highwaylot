import { useMemo } from "react";
import {
  Car as CarIcon, Star, Gauge, MapPin, ShieldCheck, Check, TrendingUp, TrendingDown, Info,
} from "lucide-react";
import { C, FONT_HEAD, MAKE_COLORS } from "../data/constants";
import { fmtPrice, fmtMiles, stateAbbr, timeAgo } from "../lib/format";

export function CarThumb({ make, body, size = "normal" }) {
  const bg = MAKE_COLORS[make] || C.steel;
  const h = size === "large" ? 340 : size === "hero" ? 220 : 160;
  return (
    <div style={{ background: bg, height: h, borderRadius: size === "large" ? 8 : "6px 6px 0 0", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
      <CarIcon size={size === "large" ? 96 : size === "hero" ? 72 : 52} color="rgba(255,255,255,0.28)" strokeWidth={1.25} />
      <div style={{ position: "absolute", bottom: 10, left: 12, fontFamily: FONT_HEAD, fontSize: 12, letterSpacing: 1, color: "rgba(255,255,255,0.75)", textTransform: "uppercase" }}>{body}</div>
    </div>
  );
}
export function Badge({ children, tone = "neutral" }) {
  const tones = { neutral: { bg: "#EFEDE4", color: C.steel }, verified: { bg: C.greenBg, color: C.green }, yellow: { bg: "#FFF3D6", color: C.yellowDark }, danger: { bg: "#FBE4E3", color: "#A32D2D" } };
  const t = tones[tone];
  return <span style={{ background: t.bg, color: t.color, fontSize: 12, fontWeight: 600, padding: "3px 9px", borderRadius: 4, display: "inline-flex", alignItems: "center", gap: 4 }}>{children}</span>;
}
export function OptionalTag() {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, fontWeight: 700, color: C.steel, border: `1.5px dashed ${C.line}`, borderRadius: 20, padding: "3px 10px", letterSpacing: 0.3, textTransform: "uppercase" }}>
      Optional — skip if unsure
    </span>
  );
}

export function FairnessBadge({ fairness, size = "small" }) {
  if (!fairness) return null;
  const Icon = fairness.diffPct <= -0.07 ? TrendingDown : fairness.diffPct >= 0.07 ? TrendingUp : Info;
  return <Badge tone={fairness.tone}><Icon size={11} />{fairness.verdict}</Badge>;
}

export function CredibilityDot({ credibility }) {
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

export function ListingCard({ listing, onOpen }) {
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

export function FeaturedStrip({ listings, onOpen }) {
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

export function RecentlySold({ listings, onOpen }) {
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

export function PopularSearches({ listings, onOpenCategory }) {
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

export function Field({ label, required, error, children }) {
  return <div><label style={{ fontSize: 12.5, color: error ? "#B23A3A" : C.steel, display: "block", marginBottom: 4 }}>{label}{required && " *"}{error && " — required"}</label>{children}</div>;
}

export function Spec({ icon, label, value }) {
  return <div><div style={{ fontSize: 11.5, color: C.steel, display: "flex", alignItems: "center", gap: 4 }}>{icon}{label}</div><div style={{ fontSize: 14, color: C.ink, fontWeight: 500, marginTop: 2 }}>{value}</div></div>;
}
