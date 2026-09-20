import { Building2, Check } from "lucide-react";
import { C, FONT_HEAD } from "../data/constants";
import { Badge } from "../components/shared";

export function DealerPage({ log }) {
  const tiers = [
    { name: "1–10 listings", price: 49, features: ["Up to 10 active listings", "Standard placement", "Basic dealer badge"] },
    { name: "11–30 listings", price: 129, highlight: true, features: ["Up to 30 active listings", "Always-featured placement", "Priority in search results", "Cheaper per-listing than boosting individually"] },
    { name: "31+ listings", price: 279, features: ["Unlimited listings", "Everything in the mid tier", "Homepage banner rotation", "Monthly regional market report"] },
  ];
  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "48px 20px 70px" }}>
      <div style={{ textAlign: "center", marginBottom: 34 }}>
        <Building2 size={28} color={C.ink} style={{ marginBottom: 8 }} />
        <h2 style={{ fontFamily: FONT_HEAD, fontSize: 30, color: C.ink, margin: "0 0 6px" }}>Dealer subscriptions</h2>
        <p style={{ color: C.steel, fontSize: 14, maxWidth: 480, margin: "0 auto" }}>Priced by how many active listings you run — always cheaper than boosting each one individually.</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {tiers.map((t) => (
          <div key={t.name} style={{ border: t.highlight ? `2px solid ${C.yellow}` : `1px solid ${C.line}`, borderRadius: 8, padding: 22, background: "#fff" }}>
            {t.highlight && <div style={{ marginBottom: 8 }}><Badge tone="yellow">Best value</Badge></div>}
            <div style={{ fontFamily: FONT_HEAD, fontSize: 18, color: C.ink }}>{t.name}</div>
            <div style={{ fontFamily: FONT_HEAD, fontSize: 30, color: C.ink, margin: "8px 0" }}>${t.price}<span style={{ fontSize: 13, color: C.steel }}>/mo</span></div>
            <div style={{ marginTop: 12 }}>
              {t.features.map((f, i) => <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13.5, color: "#3B4250", marginBottom: 8 }}><Check size={14} color={C.green} style={{ marginTop: 2, flexShrink: 0 }} />{f}</div>)}
            </div>
            <button onClick={() => log("dealer_plan_click", { plan: t.name })} style={{ width: "100%", marginTop: 12, background: t.highlight ? C.yellow : "transparent", border: t.highlight ? "none" : `1px solid ${C.line}`, borderRadius: 4, padding: "10px 0", fontFamily: FONT_HEAD, cursor: "pointer" }}>Choose plan</button>
          </div>
        ))}
      </div>
    </div>
  );
}
