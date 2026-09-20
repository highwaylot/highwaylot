import { useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { Check } from "lucide-react";
import { C, FONT_HEAD, inputStyle } from "../data/constants";

export function Success() {
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
