import { useState } from "react";
import { C, FONT_HEAD, QUIZ_STATEMENTS, ARCHETYPE_PROFILES, ARCHETYPE_BLURBS } from "../data/constants";

export function scoreQuiz(answers) {
  const distances = Object.entries(ARCHETYPE_PROFILES).map(([name, profile]) => {
    const dist = QUIZ_STATEMENTS.reduce((sum, s) => sum + Math.pow((answers[s.key] || 3) - profile[s.key], 2), 0);
    return { name, dist };
  }).sort((a, b) => a.dist - b.dist);

  let [best, second] = distances;
  // Tie-breaker: when the top two are nearly even, defer to whichever
  // archetype matches the person's single most extreme (least neutral)
  // answer — rooted in something they actually felt strongly about,
  // not an arbitrary pick.
  if (second && (second.dist - best.dist) < 2) {
    let mostExtremeKey = null, maxDeviation = -1;
    QUIZ_STATEMENTS.forEach((s) => {
      const deviation = Math.abs((answers[s.key] || 3) - 3);
      if (deviation > maxDeviation) { maxDeviation = deviation; mostExtremeKey = s.key; }
    });
    const userVal = answers[mostExtremeKey];
    const bestDiff = Math.abs(userVal - ARCHETYPE_PROFILES[best.name][mostExtremeKey]);
    const secondDiff = Math.abs(userVal - ARCHETYPE_PROFILES[second.name][mostExtremeKey]);
    if (secondDiff < bestDiff) best = second;
  }
  // Runner-up is whichever wasn't picked as best, from the original top two —
  // shown quietly on the results page, not part of the tie-break logic above.
  const runnerUpEntry = distances.find((d) => d.name !== best.name);
  const gap = runnerUpEntry ? runnerUpEntry.dist - best.dist : 999;
  return {
    name: best.name,
    blurb: ARCHETYPE_BLURBS[best.name],
    runnerUp: runnerUpEntry ? { name: runnerUpEntry.name } : null,
    matchStrength: gap < 4 ? "close" : "strong",
  };
}

export function Quiz({ log, onComplete }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const s = QUIZ_STATEMENTS[step];
  const progress = Math.round((step / QUIZ_STATEMENTS.length) * 100);

  const choose = (val) => {
    const next = { ...answers, [s.key]: val };
    setAnswers(next);
    log("quiz_answer", { question: s.key, answer: val });
    if (step + 1 < QUIZ_STATEMENTS.length) setStep(step + 1);
    else { log("quiz_complete", next); onComplete(next); }
  };

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: "48px 20px" }}>
      <div style={{ height: 5, background: "#EFEDE4", borderRadius: 3, marginBottom: 20, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${progress}%`, background: C.yellow, transition: "width 200ms" }} />
      </div>
      <div style={{ fontSize: 12, color: C.steel, letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 6 }}>{step + 1} of {QUIZ_STATEMENTS.length}</div>
      <h2 style={{ fontFamily: FONT_HEAD, fontSize: 25, color: C.ink, margin: "0 0 24px", lineHeight: 1.35 }}>{s.text}</h2>
      <div style={{ display: "flex", gap: 8 }}>
        {[1, 2, 3, 4, 5].map((v) => (
          <button key={v} onClick={() => choose(v)} style={{ flex: 1, padding: "20px 0", border: `1.5px solid ${C.line}`, borderRadius: 8, background: "#fff", fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 19, color: C.ink, cursor: "pointer" }}>{v}</button>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11.5, color: C.steel }}>
        <span>Disagree</span><span>Neutral</span><span>Agree</span>
      </div>
    </div>
  );
}
