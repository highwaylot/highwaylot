import { useState, useEffect } from "react";
import { Check } from "lucide-react";
import { C, FONT_HEAD, POPULAR_MAKES, inputStyle } from "../data/constants";
import { MECHANICAL_SYSTEMS, STATUS_OPTIONS, COSMETIC_SYSTEMS, COSMETIC_OPTIONS, BURN_TIERS } from "../lib/pricing";
import { Field } from "./shared";

export function MakeModelPicker({ make, model, onMakeChange, onModelChange, errors, clearError }) {
  const [customMake, setCustomMake] = useState(Boolean(make) && !POPULAR_MAKES.includes(make));
  const [customModel, setCustomModel] = useState(false);
  const [models, setModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(false);

  useEffect(() => {
    if (customMake || !make) { setModels([]); return; }
    setLoadingModels(true);
    fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/getmodelsformake/${encodeURIComponent(make)}?format=json`)
      .then((r) => r.json())
      .then((data) => {
        const names = Array.from(new Set((data.Results || []).map((m) => m.Model_Name))).sort();
        setModels(names);
      })
      .catch(() => setModels([]))
      .finally(() => setLoadingModels(false));
  }, [make, customMake]);

  const smallBtn = { fontSize: 11.5, background: "transparent", border: `1px solid ${C.line}`, borderRadius: 4, padding: "0 10px", cursor: "pointer", color: C.steel, whiteSpace: "nowrap" };

  return (
    <>
      <Field label="Make" required error={errors.make}>
        {!customMake ? (
          <select value={make} onChange={(e) => { if (e.target.value === "__other__") { setCustomMake(true); onMakeChange(""); } else { onMakeChange(e.target.value); setCustomModel(false); onModelChange(""); clearError && clearError("make"); } }} style={inputStyle}>
            <option value="">Select make</option>
            {POPULAR_MAKES.map((m) => <option key={m} value={m}>{m}</option>)}
            <option value="__other__">Other (type it in)</option>
          </select>
        ) : (
          <div style={{ display: "flex", gap: 6 }}>
            <input value={make} onChange={(e) => { onMakeChange(e.target.value); clearError && clearError("make"); }} placeholder="Type the make" style={inputStyle} />
            <button type="button" onClick={() => { setCustomMake(false); onMakeChange(""); }} style={smallBtn}>Use list</button>
          </div>
        )}
      </Field>
      <Field label="Model" required error={errors.model}>
        {!customMake && !customModel ? (
          <select
            value={model}
            onChange={(e) => { if (e.target.value === "__other__") { setCustomModel(true); onModelChange(""); } else { onModelChange(e.target.value); clearError && clearError("model"); } }}
            style={inputStyle}
            disabled={!make || loadingModels}
          >
            <option value="">{loadingModels ? "Loading models…" : make ? "Select model" : "Pick a make first"}</option>
            {models.map((m) => <option key={m} value={m}>{m}</option>)}
            <option value="__other__">Other (type it in)</option>
          </select>
        ) : (
          <div style={{ display: "flex", gap: 6 }}>
            <input value={model} onChange={(e) => { onModelChange(e.target.value); clearError && clearError("model"); }} placeholder="Type the model" style={inputStyle} />
            {!customMake && <button type="button" onClick={() => { setCustomModel(false); onModelChange(""); }} style={smallBtn}>Use list</button>}
          </div>
        )}
      </Field>
    </>
  );
}

function MechanicalChecklist({ issues, onChange }) {
  return (
    <div>
      {MECHANICAL_SYSTEMS.map((sys) => (
        <div key={sys.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.line}`, gap: 10 }}>
          <span style={{ fontSize: 13.5, color: C.ink }}>{sys.label}</span>
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            {STATUS_OPTIONS.map((opt) => {
              const active = issues[sys.key] === opt.key;
              const activeColors = { verified: { bg: C.greenBg, color: C.green }, yellow: { bg: "#FFF3D6", color: C.yellowDark }, danger: { bg: "#FBE4E3", color: "#A32D2D" } };
              const c = activeColors[opt.tone];
              return (
                <button
                  key={opt.key}
                  onClick={() => onChange({ ...issues, [sys.key]: active ? undefined : opt.key })}
                  style={{
                    fontSize: 11.5, padding: "5px 10px", borderRadius: 4, cursor: "pointer",
                    border: active ? "none" : `1px solid ${C.line}`,
                    background: active ? c.bg : "#fff", color: active ? c.color : C.steel, fontWeight: active ? 600 : 400,
                  }}
                >{opt.key === "Ongoing" ? "Ongoing/okay" : opt.key}</button>
              );
            })}
          </div>
        </div>
      ))}

      {COSMETIC_SYSTEMS.map((sys) => (
        <div key={sys.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.line}`, gap: 10 }}>
          <span style={{ fontSize: 13.5, color: C.ink }}>{sys.label}</span>
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            {COSMETIC_OPTIONS.map((opt) => {
              const active = issues[sys.key] === opt.key;
              const activeColors = { verified: { bg: C.greenBg, color: C.green }, yellow: { bg: "#FFF3D6", color: C.yellowDark }, danger: { bg: "#FBE4E3", color: "#A32D2D" } };
              const c = activeColors[opt.tone];
              return (
                <button
                  key={opt.key}
                  onClick={() => onChange({ ...issues, [sys.key]: active ? undefined : opt.key })}
                  style={{
                    fontSize: 11.5, padding: "5px 10px", borderRadius: 4, cursor: "pointer",
                    border: active ? "none" : `1px solid ${C.line}`,
                    background: active ? c.bg : "#fff", color: active ? c.color : C.steel, fontWeight: active ? 600 : 400,
                  }}
                >{opt.key}</button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Burn marks — counted, not rated by severity, since cost scales with how many there are */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.line}`, gap: 10 }}>
        <span style={{ fontSize: 13.5, color: C.ink }}>Burn marks (seats, carpet)</span>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          {BURN_TIERS.map((tier) => {
            const active = issues.burnCount === tier.key;
            return (
              <button
                key={tier.key}
                onClick={() => onChange({ ...issues, burnCount: active ? undefined : tier.key })}
                style={{
                  fontSize: 11.5, padding: "5px 10px", borderRadius: 4, cursor: "pointer",
                  border: active ? "none" : `1px solid ${C.line}`,
                  background: active ? "#FBE4E3" : "#fff", color: active ? "#A32D2D" : C.steel, fontWeight: active ? 600 : 400,
                }}
              >{tier.label}</button>
            );
          })}
        </div>
      </div>

      {/* Smoke odor — flat yes/no, it's one detailing service regardless of how bad it is */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", gap: 10 }}>
        <span style={{ fontSize: 13.5, color: C.ink }}>Smoked-in / lingering odor</span>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          {[{ key: false, label: "No" }, { key: true, label: "Yes" }].map((opt) => {
            const active = Boolean(issues.odorTreatment) === opt.key;
            return (
              <button
                key={String(opt.key)}
                onClick={() => onChange({ ...issues, odorTreatment: opt.key })}
                style={{
                  fontSize: 11.5, padding: "5px 14px", borderRadius: 4, cursor: "pointer",
                  border: active ? "none" : `1px solid ${C.line}`,
                  background: active && opt.key ? "#FBE4E3" : active ? C.greenBg : "#fff",
                  color: active && opt.key ? "#A32D2D" : active ? C.green : C.steel,
                  fontWeight: active ? 600 : 400,
                }}
              >{opt.label}</button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const NO_ISSUES_STATE = { engine: "Fixed", transmission: "Fixed", body: "Fixed", suspension: "Fixed", electrical: "Fixed", ac: "Fixed", brakes: "Fixed", odorTreatment: false };

// Replaces the old 2D damage pickers. A clear yes/no decision up front —
// makes the shift into this optional section obvious, and produces a real
// data signal: "confirmed no issues" is meaningfully different from "skipped
// this section entirely," which a blank form can't tell apart.
export function IssuesGate({ issues, onChange, context = "listing" }) {
  const [mode, setMode] = useState(null); // null | "none" | "some"
  const introText = context === "valuation"
    ? "Optional — but honest detail here gets you a more accurate estimate."
    : "Optional — but honest detail here builds more buyer trust than leaving it blank.";

  if (mode === null) {
    return (
      <div style={{ background: "#F4F2EA", border: `1px solid ${C.line}`, borderRadius: 8, padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <div style={{ width: 4, height: 20, background: C.yellow, borderRadius: 2 }} />
          <div style={{ fontFamily: FONT_HEAD, fontSize: 16, color: C.ink }}>Any known issues?</div>
        </div>
        <p style={{ fontSize: 13, color: C.steel, marginBottom: 14 }}>{introText}</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={() => { onChange(NO_ISSUES_STATE); setMode("none"); }} style={{ flex: "1 1 160px", background: C.greenBg, color: C.green, border: "none", borderRadius: 6, padding: "12px 8px", fontFamily: FONT_HEAD, fontSize: 14, cursor: "pointer" }}>No, it's in good shape</button>
          <button onClick={() => setMode("some")} style={{ flex: "1 1 160px", background: "#fff", color: C.ink, border: `1px solid ${C.line}`, borderRadius: 6, padding: "12px 8px", fontFamily: FONT_HEAD, fontSize: 14, cursor: "pointer" }}>Yes, let me note a few things</button>
        </div>
      </div>
    );
  }

  if (mode === "none") {
    return (
      <div style={{ background: C.greenBg, border: `1px solid ${C.line}`, borderRadius: 8, padding: 16, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <span style={{ fontSize: 13.5, color: C.green, display: "flex", alignItems: "center", gap: 6 }}><Check size={15} /> Marked as no known issues</span>
        <button onClick={() => setMode("some")} style={{ background: "transparent", border: "none", color: C.steel, fontSize: 12.5, textDecoration: "underline", cursor: "pointer" }}>Actually, let me add something</button>
      </div>
    );
  }

  return (
    <div style={{ background: "#F4F2EA", border: `1px solid ${C.line}`, borderRadius: 8, padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <div style={{ width: 4, height: 20, background: C.yellow, borderRadius: 2 }} />
        <div style={{ fontFamily: FONT_HEAD, fontSize: 16, color: C.ink }}>What's going on?</div>
      </div>
      <p style={{ fontSize: 12.5, color: C.steel, marginBottom: 12 }}>Only mark what applies — leave the rest blank.</p>
      <MechanicalChecklist issues={issues} onChange={onChange} />
    </div>
  );
}
