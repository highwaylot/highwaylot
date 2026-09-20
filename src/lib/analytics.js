import { supabase } from "./supabaseClient";

export function captureAttribution() {
  try {
    const params = new URLSearchParams(window.location.search);
    const src = params.get("src");
    if (src) {
      const isNew = sessionStorage.getItem("hl_src") !== src;
      sessionStorage.setItem("hl_src", src);
      // A real per-visit id, only generated for QR-tagged sessions — this is
      // what lets admin group one anonymous visitor's actions together
      // (their valuation, their quiz result, what they browsed) without
      // ever tying it to a name or contact info.
      if (!sessionStorage.getItem("hl_session_id")) {
        const id = (crypto && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        sessionStorage.setItem("hl_session_id", id);
      }
      return { src, isNew };
    }
    return { src: sessionStorage.getItem("hl_src") || null, isNew: false };
  } catch { return { src: null, isNew: false }; }
}
// For attaching attribution to a real database row (valuations, quiz
// responses, listings) at the moment it's submitted — separate from the
// event-logging path below, since these go into their own tables, not events.
export function getAttribution() {
  try {
    return { source: sessionStorage.getItem("hl_src") || null, session_id: sessionStorage.getItem("hl_session_id") || null };
  } catch { return { source: null, session_id: null }; }
}

export function useAnalytics() {
  const log = (type, payload = {}) => {
    let src = null, sessionId = null;
    try { src = sessionStorage.getItem("hl_src"); sessionId = sessionStorage.getItem("hl_session_id"); } catch {}
    const extra = {};
    if (src) extra.src = src;
    if (sessionId) extra.session_id = sessionId;
    supabase.from("events").insert({ type, payload: Object.keys(extra).length ? { ...payload, ...extra } : payload }).then(({ error }) => {
      if (error) console.error("event log failed:", error.message);
    });
  };
  return { log };
}
