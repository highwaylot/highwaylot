import { Link } from "react-router-dom";
import { C, FONT_HEAD } from "../data/constants";

export function NotFound() {
  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "80px 20px", textAlign: "center" }}>
      <div style={{ fontFamily: FONT_HEAD, fontSize: 22, color: C.ink, marginBottom: 8 }}>Page not found</div>
      <p style={{ color: C.steel, fontSize: 14 }}>That link doesn't lead anywhere on HIGHWAYLOT.</p>
      <Link to="/" style={{ display: "inline-block", marginTop: 16, background: C.ink, color: "#fff", border: "none", borderRadius: 4, padding: "10px 20px", fontFamily: FONT_HEAD, textDecoration: "none" }}>Back to HIGHWAYLOT</Link>
    </div>
  );
}
