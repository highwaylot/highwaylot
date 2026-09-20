import { useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { C, FONT_HEAD, ARCHETYPE_BODY } from "../data/constants";
import { Badge, ListingCard } from "../components/shared";
import { scoreQuiz } from "./Quiz";

export function QuizResults({ allListings, openListing }) {
  const location = useLocation();
  const navigate = useNavigate();
  const answers = location.state?.answers;

  useEffect(() => {
    if (!answers) navigate("/quiz", { replace: true });
  }, [answers, navigate]);
  if (!answers) return null;

  const archetype = scoreQuiz(answers);
  const bodyPref = ARCHETYPE_BODY[archetype.name] || "Sedan";
  const matches = allListings.filter((c) => c.body === bodyPref).sort((a, b) => a.price - b.price).slice(0, 6);

  // "Share my result" scrapped in v16 — reported broken, root cause never
  // confirmed after two rounds of tracing (code checked out clean on
  // inspection both times). Not worth guessing at a fix with no repro
  // evidence. If revisited: the old implementation used navigator.share()
  // with a clipboard-copy fallback, pointing at the plain /quiz URL.
  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "48px 20px 60px" }}>
      <div style={{ textAlign: "center", marginBottom: 30 }}>
        <div style={{ fontSize: 13, color: C.steel }}>Your result</div>
        <h2 style={{ fontFamily: FONT_HEAD, fontSize: 32, color: C.ink, margin: "6px 0" }}>You're a {archetype.name}</h2>
        <p style={{ color: C.steel, fontSize: 14.5, maxWidth: 440, margin: "0 auto 8px" }}>{archetype.blurb}</p>
        <div style={{ marginBottom: 4 }}>
          <Badge tone={archetype.matchStrength === "close" ? "yellow" : "verified"}>{archetype.matchStrength === "close" ? "Close call between two types" : "Strong match"}</Badge>
        </div>
        {archetype.runnerUp && (
          <div style={{ fontSize: 12, color: C.steel, marginBottom: 16 }}>with a bit of {archetype.runnerUp.name} in you</div>
        )}
      </div>
      {matches.length === 0 ? (
        <div style={{ textAlign: "center", color: C.steel }}>No matching listings right now — try browsing all listings.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
          {matches.map((c) => <ListingCard key={c.id} listing={c} onOpen={openListing} />)}
        </div>
      )}
      <div style={{ textAlign: "center", marginTop: 26 }}>
        <Link to="/quiz" style={{ background: "transparent", border: `1px solid ${C.line}`, borderRadius: 4, padding: "10px 20px", fontFamily: FONT_HEAD, textDecoration: "none", display: "inline-block", color: C.ink }}>Retake quiz</Link>
      </div>
    </div>
  );
}
