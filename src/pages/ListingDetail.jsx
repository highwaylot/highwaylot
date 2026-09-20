import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ChevronLeft, ChevronRight, Star, ShieldCheck, MapPin, Calendar, Gauge, Fuel, Phone, Lock,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { C, FONT_HEAD, LISTING_COLUMNS, inputStyle } from "../data/constants";
import { fmtPrice, fmtMiles, stateAbbr, rowToListing, getExpiryInfo } from "../lib/format";
import { getIssuesSummary } from "../lib/pricing";
import { CarThumb, Badge, FairnessBadge, CredibilityDot, Spec } from "../components/shared";

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

export function ListingDetail({ allListings, log }) {
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
