import { Link, useLocation } from "react-router-dom";
import { Plus } from "lucide-react";
import { C, FONT_HEAD } from "../data/constants";

export function TopBar({ onPost }) {
  const { pathname } = useLocation();
  return (
    <div style={{ background: C.ink, borderBottom: `4px solid ${C.yellow}` }}>
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "12px 20px", display: "flex", alignItems: "center", flexWrap: "wrap", rowGap: 10, columnGap: 20, minHeight: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
          <Link to="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
            <div style={{ width: 32, height: 34, position: "relative", flexShrink: 0 }}>
              <svg viewBox="0 0 32 34" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
                <path d="M 16 1 L 30 6.5 L 30 17 Q 30 27 16 33 Q 2 27 2 17 L 2 6.5 Z" fill={C.yellow} stroke={C.ink} strokeWidth={2} />
                <path d="M 16 6 L 16 28" stroke={C.ink} strokeWidth={1.5} strokeDasharray="4,3" opacity={0.5} />
              </svg>
            </div>
            <span style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: "clamp(15px, 4vw, 20px)", letterSpacing: 0.5, color: "#fff", whiteSpace: "nowrap" }}>HIGHWAYLOT</span>
          </Link>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <NavLink label="Browse" to="/" active={pathname === "/" || pathname.startsWith("/listing") || pathname.startsWith("/category")} />
            <NavLink label="Value my car" to="/value" active={pathname === "/value"} />
            <NavLink label="My Car Quiz" to="/quiz" active={pathname.startsWith("/quiz")} />
          </div>
        </div>
        <button onClick={onPost} style={{ background: C.yellow, color: C.ink, border: "none", borderRadius: 4, padding: "9px 16px", fontFamily: FONT_HEAD, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
          <Plus size={16} strokeWidth={2.5} /> Post an ad
        </button>
      </div>
    </div>
  );
}
function NavLink({ label, to, active }) {
  return <Link to={to} style={{ textDecoration: "none", color: active ? "#fff" : "rgba(255,255,255,0.65)", fontSize: 13.5, fontWeight: 500, display: "flex", alignItems: "center", padding: "4px 0", borderBottom: active ? `2px solid ${C.yellow}` : "2px solid transparent", whiteSpace: "nowrap" }}>{label}</Link>;
}
