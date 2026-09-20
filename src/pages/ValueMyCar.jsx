import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DollarSign } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { C, FONT_HEAD, US_STATES, YEARS, inputStyle } from "../data/constants";
import { fmtPrice, guessBodyStyle } from "../lib/format";
import { getAttribution } from "../lib/analytics";
import { computeMechanicalDeduction } from "../lib/pricing";
import { Field, Badge } from "../components/shared";
import { MakeModelPicker, IssuesGate } from "../components/forms";

const BODY_DEPRECIATION_CURVES = {
  // { year1: retained after year 1, after: retained per year after that, floor: minimum retained }
  Truck: { year1: 0.88, after: 0.94, floor: 0.30 },
  SUV: { year1: 0.86, after: 0.93, floor: 0.28 },
  "Van/Minivan": { year1: 0.80, after: 0.88, floor: 0.18 },
  Coupe: { year1: 0.80, after: 0.87, floor: 0.15 },
  Convertible: { year1: 0.80, after: 0.87, floor: 0.15 },
  Hatchback: { year1: 0.79, after: 0.87, floor: 0.15 },
  Sedan: { year1: 0.80, after: 0.88, floor: 0.15 },
};
// Used only as a fallback anchor when the seller doesn't know/won't give what
// they paid — a rough "typical new price for this body style" starting point,
// not a stand-in for real MSRP data. Comps (once there are any) still pull
// harder than this the moment they exist.
const TYPICAL_NEW_PRICE_BY_BODY = {
  Sedan: 28000, Coupe: 32000, Hatchback: 24000, SUV: 38000, Truck: 45000, "Van/Minivan": 36000, Convertible: 40000,
};
function estimateValue(input, allListings, issues = {}) {
  const age = Math.max(new Date().getFullYear() - input.year, 0);
  const curve = BODY_DEPRECIATION_CURVES[input.body] || BODY_DEPRECIATION_CURVES.Sedan;
  let retained = 1;
  for (let y = 0; y < age; y++) retained *= y === 0 ? curve.year1 : curve.after;
  retained = Math.max(retained, curve.floor);

  const usedOriginalPrice = Boolean(input.originalPrice) && input.originalPrice > 0;
  const anchorPrice = usedOriginalPrice ? input.originalPrice : (TYPICAL_NEW_PRICE_BY_BODY[input.body] || TYPICAL_NEW_PRICE_BY_BODY.Sedan);
  const basePrice = anchorPrice * retained;

  const expectedMileage = age * 12000;
  const mileageDelta = input.mileage - expectedMileage;
  const mileageAdjustment = -(mileageDelta / 12000) * 0.02 * basePrice; // ~2% of value per year-equivalent of extra/fewer miles

  const conditionMultiplier = { Excellent: 1.08, Good: 1.0, Fair: 0.88, "Needs work": 0.7 }[input.condition] ?? 1.0;

  let estimate = (basePrice + mileageAdjustment) * conditionMultiplier;

  // Comp-based blend: pull real same make/model listings within +/- 3 years.
  // Ramps to max pull at 4 comps now instead of 8 — a real comp is a better
  // signal than the formula, so it shouldn't take that many to matter most.
  const comps = allListings.filter((c) => c.make.toLowerCase() === input.make.toLowerCase() && c.model.toLowerCase() === input.model.toLowerCase() && Math.abs(c.year - input.year) <= 3);
  let confidence = "Low";
  if (comps.length > 0) {
    const compAvg = comps.reduce((s, c) => s + c.price, 0) / comps.length;
    const weight = Math.min(comps.length / 4, 0.75); // comps can pull up to 75% of the estimate once there are enough
    estimate = estimate * (1 - weight) + compAvg * weight;
    confidence = comps.length >= 4 ? "High" : comps.length >= 2 ? "Medium" : "Low";
  }

  const { total: mechanicalDeduction, breakdown, brandMult, hasBrandData } = computeMechanicalDeduction(issues, input.make, input.regionalMultiplier ?? 1.0);
  // Floor the final number so a pile of deductions can't push it to $0 or negative —
  // a car is worth at least scrap/parts value even in bad shape.
  const floor = Math.max(estimate * 0.1, 400);
  estimate = Math.max(estimate - mechanicalDeduction, floor);

  return { estimate: Math.round(estimate / 100) * 100, confidence, compCount: comps.length, mechanicalDeduction, breakdown, brandMult, hasBrandData, usedOriginalPrice };
}

export function ValueMyCar({ allListings, log }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ year: "", make: "", model: "", mileage: "", condition: "Good", originalPrice: "", body: "Sedan", state: "", loan_status: "Paid off", loan_balance: "" });
  const [issues, setIssues] = useState({});
  const [result, setResult] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [errors, setErrors] = useState({});
  const [stateRates, setStateRates] = useState({}); // { "Florida": { multiplier: 0.95 }, ... } — only states we have real data for
  const set = (k) => (e) => { const val = e.target.value; setForm((prev) => ({ ...prev, [k]: val })); setErrors((prev) => (prev[k] ? { ...prev, [k]: false } : prev)); };
  const setNumeric = (k) => (e) => { const val = e.target.value.replace(/[^0-9]/g, ""); setForm((prev) => ({ ...prev, [k]: val })); setErrors((prev) => (prev[k] ? { ...prev, [k]: false } : prev)); };

  // Real state-by-state labor rate reference — only covers the states we've
  // actually pulled BLS figures for. Anything not in here falls back to the
  // national average honestly, rather than assuming Florida for everyone.
  useEffect(() => {
    supabase.from("state_labor_rates").select("state,multiplier").then(({ data, error }) => {
      if (error) { console.error("state labor rates fetch failed:", error.message); return; }
      const map = {};
      (data || []).forEach((row) => { map[row.state] = Number(row.multiplier); });
      setStateRates(map);
    });
  }, []);

  const hasStateData = form.state && stateRates[form.state] !== undefined;
  const regionalMultiplier = hasStateData ? stateRates[form.state] : 1.0;

  const submit = async () => {
    const req = ["year", "make", "model", "mileage"]; // originalPrice is optional now — estimateValue() falls back to a typical-price-by-body-style anchor when it's blank
    const errs = {}; req.forEach((k) => { if (!String(form[k]).trim()) errs[k] = true; });
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const input = { year: Number(form.year), make: form.make, model: form.model, mileage: Number(form.mileage), condition: form.condition, originalPrice: Number(form.originalPrice), body: form.body, regionalMultiplier };
    const res = estimateValue(input, allListings, issues);
    setResult({ ...res, stateUsed: form.state, hasStateData });
    const loanBalance = form.loan_status === "Still financed (loan payoff needed)" && form.loan_balance ? Number(form.loan_balance) : null;
    log("valuation_submitted", { ...input, issues, body: form.body, loan_balance: loanBalance, state: form.state });
    const { regionalMultiplier: _rm, ...inputForDb } = input; // regionalMultiplier is calculation-only, no matching column
    supabase.from("valuations").insert({ ...inputForDb, estimate: res.estimate, confidence: res.confidence, issues, body: form.body, loan_status: form.loan_status, loan_balance: loanBalance, state: form.state, ...getAttribution() }).then(({ error }) => {
      if (error) { console.error("valuation save failed:", error.message); setSaveError(error.message); }
    });
  };

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "48px 20px 70px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 4 }}>
        <DollarSign size={26} color={C.ink} />
        <h2 style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: "clamp(26px, 6vw, 34px)", color: C.ink, margin: 0, textTransform: "uppercase", letterSpacing: 0.5 }}>What's Your Car Worth?</h2>
      </div>
      <p style={{ color: C.steel, fontSize: 14, marginBottom: 24, textAlign: "center" }}>Fill in your car's details to get an estimate.</p>

      <div className="hl-form-grid">
        <Field label="Year" required error={errors.year}>
          <select value={form.year} onChange={set("year")} style={inputStyle}><option value="">Select year</option>{YEARS.map((y) => <option key={y} value={y}>{y}</option>)}</select>
        </Field>
        <MakeModelPicker make={form.make} model={form.model} onMakeChange={(v) => setForm((prev) => ({ ...prev, make: v }))} onModelChange={(v) => setForm((prev) => { const guess = guessBodyStyle(v); return { ...prev, model: v, ...(guess ? { body: guess } : {}) }; })} errors={errors} clearError={(k) => setErrors((prev) => ({ ...prev, [k]: false }))} />
        <Field label="Current mileage" required error={errors.mileage}><input value={form.mileage} onChange={setNumeric("mileage")} inputMode="numeric" placeholder="52000" style={inputStyle} /></Field>
        <Field label="Original price paid (optional — sharpens the estimate)"><input value={form.originalPrice} onChange={setNumeric("originalPrice")} inputMode="numeric" placeholder="28000" style={inputStyle} /></Field>
        <Field label="Overall condition"><select value={form.condition} onChange={set("condition")} style={inputStyle}><option>Excellent</option><option>Good</option><option>Fair</option><option>Needs work</option></select></Field>
        <Field label="Body style"><select value={form.body} onChange={set("body")} style={inputStyle}><option>Sedan</option><option>Coupe</option><option>Hatchback</option><option>SUV</option><option>Truck</option><option>Van/Minivan</option><option>Convertible</option></select></Field>
        <Field label="State"><select value={form.state} onChange={set("state")} style={inputStyle}><option value="">Select state</option>{US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}</select></Field>
        <Field label="Ownership status"><select value={form.loan_status} onChange={set("loan_status")} style={inputStyle}><option>Paid off</option><option>Still financed (loan payoff needed)</option></select></Field>
        {form.loan_status === "Still financed (loan payoff needed)" && (
          <Field label="Remaining loan balance ($)"><input value={form.loan_balance} onChange={setNumeric("loan_balance")} inputMode="numeric" placeholder="8500" style={inputStyle} /></Field>
        )}
      </div>

      <div style={{ marginTop: 22 }}>
        <IssuesGate issues={issues} onChange={setIssues} context="valuation" />
      </div>

      <button onClick={submit} style={{ marginTop: 20, background: C.yellow, color: C.ink, border: "none", borderRadius: 4, padding: "13px 26px", fontFamily: FONT_HEAD, fontSize: 15, cursor: "pointer" }}>Get my estimate</button>

      {result && (
        <div style={{ marginTop: 28, border: `1px solid ${C.line}`, borderRadius: 8, padding: 24, textAlign: "center" }}>
          {saveError && (
            <div style={{ background: "#FBE4E3", color: "#A32D2D", fontSize: 12, padding: "8px 12px", borderRadius: 6, marginBottom: 14, textAlign: "left" }}>
              Your estimate above is accurate, but this submission couldn't be saved on our end ({saveError}).
            </div>
          )}
          <div style={{ fontSize: 12.5, color: C.steel, textTransform: "uppercase", letterSpacing: 0.4 }}>Estimated value</div>
          <div style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: "clamp(28px, 9vw, 40px)", color: C.ink, margin: "8px 0" }}>{fmtPrice(result.estimate)}</div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Badge tone={result.confidence === "High" ? "verified" : result.confidence === "Medium" ? "yellow" : "neutral"}>{result.confidence} confidence</Badge>
          </div>
          <div style={{ fontSize: 12.5, color: C.steel, marginTop: 12, lineHeight: 1.5 }}>
            {result.compCount > 0
              ? `Based on depreciation modeling plus ${result.compCount} similar ${result.compCount === 1 ? "listing" : "listings"} currently on HIGHWAYLOT.`
              : "Based on depreciation modeling only — no similar listings on HIGHWAYLOT yet to compare against. Estimates get sharper as more real cars get listed."}
            {!result.usedOriginalPrice && " You didn't enter what you paid, so this starts from a typical price for this body style rather than your car's actual purchase price — add it above for a tighter number."}
          </div>

          {form.loan_status === "Still financed (loan payoff needed)" && form.loan_balance && (
            <div style={{ marginTop: 18, paddingTop: 16, borderTop: `1px solid ${C.line}` }}>
              <div style={{ fontSize: 12.5, color: C.steel, textTransform: "uppercase", letterSpacing: 0.4 }}>Estimated equity</div>
              <div style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 24, color: (result.estimate - Number(form.loan_balance)) < 0 ? "#A32D2D" : C.ink, marginTop: 4 }}>
                {fmtPrice(result.estimate - Number(form.loan_balance))}
              </div>
              <div style={{ fontSize: 11.5, color: C.steel, marginTop: 6 }}>
                {(result.estimate - Number(form.loan_balance)) < 0
                  ? "You may owe more than the car's worth right now — this is what you'd pay out of pocket to close out the loan on a sale."
                  : "What you'd walk away with after paying off the remaining loan balance. This doesn't affect the value estimate above — what you owe doesn't change what the car's worth."}
              </div>
            </div>
          )}

          {result.mechanicalDeduction > 0 && (
            <div style={{ marginTop: 18, paddingTop: 16, borderTop: `1px solid ${C.line}`, textAlign: "left" }}>
              <div style={{ fontSize: 12.5, color: C.steel, marginBottom: 8, textAlign: "center" }}>
                <strong style={{ color: "#A32D2D" }}>-{fmtPrice(result.mechanicalDeduction)}</strong> knocked off for known issues
              </div>
              {result.breakdown.filter((b) => b.deduction > 0).map((b, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "#3B4250", padding: "3px 0" }}>
                  <span>{b.label} — {b.status === "Broken" ? "not working" : b.status === "Ongoing" ? "ongoing issue" : b.status}</span>
                  <span style={{ color: "#A32D2D" }}>-{fmtPrice(b.deduction)}</span>
                </div>
              ))}
              <div style={{ fontSize: 11, color: C.steel, marginTop: 8 }}>
                {(() => {
                  const brandPart = result.hasBrandData ? `${form.make}'s typical repair costs` : null;
                  const regionPart = result.hasStateData ? `${result.stateUsed}'s real labor rates` : (result.stateUsed ? `the national average labor rate (real ${result.stateUsed} data isn't available yet)` : "the national average labor rate");
                  const parts = [brandPart, regionPart].filter(Boolean);
                  return `Adjusted for ${parts.join(" and ")}. Rough repair-cost estimates, not a mechanic's quote — actual costs vary by shop.`;
                })()}
              </div>
            </div>
          )}

          <button onClick={() => navigate("/post", { state: { prefill: {
            year: String(form.year), make: form.make, model: form.model, mileage: String(form.mileage),
            condition: form.condition, body: form.body, state: form.state,
            loan_status: form.loan_status, loan_balance: form.loan_balance,
            price: result ? String(result.estimate) : "",
          } } })} style={{ marginTop: 16, background: "transparent", border: `1px solid ${C.line}`, borderRadius: 4, padding: "10px 20px", fontFamily: FONT_HEAD, cursor: "pointer", color: C.ink }}>List this car</button>
        </div>
      )}
    </div>
  );
}
