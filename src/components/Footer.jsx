import { Link } from "react-router-dom";
import { C } from "../data/constants";

export function Footer() {
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
