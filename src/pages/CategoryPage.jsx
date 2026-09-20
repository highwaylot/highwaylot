import { useParams, Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { C, FONT_HEAD, US_STATES, BODY_SLUGS_REVERSE } from "../data/constants";
import { slugify, fmtPrice } from "../lib/format";
import { ListingCard } from "../components/shared";

export function CategoryPage({ listings, openListing }) {
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
