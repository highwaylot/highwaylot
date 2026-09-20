import { Link } from "react-router-dom";
import { FileText } from "lucide-react";
import { C, FONT_HEAD } from "../data/constants";

export function Terms() {
  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "48px 20px 70px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <FileText size={20} color={C.ink} /><h2 style={{ fontFamily: FONT_HEAD, fontSize: 24, color: C.ink, margin: 0 }}>Terms summary</h2>
      </div>
      <p style={{ color: C.steel, fontSize: 13, marginBottom: 20 }}>Plain-language summary — the full legal terms would live here before launch.</p>
      {[
        ["We're a listing platform, not a party to any sale.", "HIGHWAYLOT connects buyers and sellers. We are not involved in, and do not facilitate, the actual exchange of money or the vehicle."],
        ["We don't verify listings.", "We don't inspect vehicles, confirm seller identity, or check vehicle history unless explicitly noted on a listing. Buyers are responsible for their own due diligence."],
        ["No ID required to list or browse.", "You don't need to submit identification to use HIGHWAYLOT. Contact info is only shared when you choose to reveal it."],
        ["Transactions are at your own risk.", "Meet in public, verify the vehicle in person, and use secure payment methods. HIGHWAYLOT does not mediate disputes between buyers and sellers."],
      ].map(([title, body], i) => (
        <div key={i} style={{ marginBottom: 18 }}>
          <div style={{ fontFamily: FONT_HEAD, fontSize: 15, color: C.ink, marginBottom: 4 }}>{title}</div>
          <div style={{ fontSize: 13.5, color: "#3B4250", lineHeight: 1.6 }}>{body}</div>
        </div>
      ))}
      <Link to="/" style={{ marginTop: 8, background: "transparent", border: `1px solid ${C.line}`, borderRadius: 4, padding: "10px 20px", fontFamily: FONT_HEAD, textDecoration: "none", display: "inline-block", color: C.ink }}>Back</Link>
    </div>
  );
}
