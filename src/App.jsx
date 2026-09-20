import { useState, useMemo, useEffect, lazy, Suspense } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "./lib/supabaseClient";
import { LISTING_COLUMNS, FONT_BODY, FONT_HEAD, C } from "./data/constants";
import { rowToListing, generateToken, getExpiryInfo } from "./lib/format";
import { estimateFairness, computeCredibility } from "./lib/pricing";
import { captureAttribution, getAttribution, useAnalytics } from "./lib/analytics";
import { ScrollToTop } from "./components/ScrollToTop";
import { TopBar } from "./components/TopBar";
import { Footer } from "./components/Footer";
import { Home } from "./pages/Home";
import { ListingDetail } from "./pages/ListingDetail";
import { CategoryPage } from "./pages/CategoryPage";
import { PostAd } from "./pages/PostAd";
import { Success } from "./pages/Success";
import { ValueMyCar } from "./pages/ValueMyCar";
import { Quiz, scoreQuiz } from "./pages/Quiz";
import { QuizResults } from "./pages/QuizResults";
import { ManagePage } from "./pages/ManagePage";
import { Terms } from "./pages/Terms";
import { NotFound } from "./pages/NotFound";
import { ChunkErrorBoundary } from "./components/ChunkErrorBoundary";

// AdminPage is lazy-loaded — it's the least-visited/heaviest page (dashboard,
// charts, tables), so there's no reason to ship it in the main bundle.
const AdminPage = lazy(() => import("./pages/AdminPage").then((m) => ({ default: m.AdminPage })));

// 90-day expiry, computed on read rather than stored — a listing "expires"
// the moment 90 days pass since its last real price change (price_updated_at),
// not since it was first posted. No scheduled job needed: this just gets
// recalculated every time listings are fetched.
function isVisibleOnBrowse(listing) {
  if (listing.status === "sold") return false;
  return !getExpiryInfo(listing).expired;
}

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const { log } = useAnalytics();

  // Capture QR/flyer attribution once, on first load of any page. Fires a
  // real "landing" event only when this is a genuinely new tagged visit —
  // this is the piece that makes raw scan counts measurable at all, since
  // every other event only fires from an actual action (submitting a
  // valuation, finishing the quiz), never from just showing up.
  useEffect(() => {
    const { isNew } = captureAttribution();
    if (isNew) log("qr_landing", {});
  }, []);

  useEffect(() => {
    if (location.pathname.startsWith("/manage/") || location.pathname.startsWith("/admin/")) { setLoading(false); return; } // these routes fetch their own data
    (async () => {
      const { data, error } = await supabase.from("listings").select(LISTING_COLUMNS).is("deleted_at", null).order("created_at", { ascending: false });
      if (error) { console.error("fetch listings failed:", error.message); setFetchError(error.message); setLoading(false); return; }
      setListings(data.map(rowToListing));
      setLoading(false);
    })();
  }, [location.pathname.startsWith("/manage/"), location.pathname.startsWith("/admin/")]);

  const openListing = (id) => { log("listing_view", { listingId: id }); navigate(`/listing/${id}`); };

  const enrichedListings = useMemo(() => {
    const withFairness = listings.map((l) => ({ ...l, fairness: estimateFairness(l, listings) }));
    return withFairness.map((l) => ({ ...l, credibility: computeCredibility(l, withFairness) }));
  }, [listings]);
  // Sold/expired listings still exist for anyone with a direct link
  // (ListingDetail uses the full enrichedListings above), but shouldn't show
  // up in browse/category/quiz-match contexts — this is the filtered view
  // for those.
  const visibleListings = useMemo(() => enrichedListings.filter(isVisibleOnBrowse), [enrichedListings]);
  // Homepage subfeed only — capped at 10 no matter what, and never shows
  // sold_price (which is private anyway, never even fetched into this
  // array). The cap is deliberate: this should look identical whether the
  // site has sold 12 cars or 12,000, so nobody can infer real volume from it.
  const recentlySold = useMemo(() =>
    enrichedListings.filter((l) => l.status === "sold").sort((a, b) => new Date(b.sold_at || 0) - new Date(a.sold_at || 0)).slice(0, 10)
  , [enrichedListings]);

  const handlePostSubmit = async (data) => {
    const { desc, ...rest } = data;
    const manage_token = generateToken();
    const { data: inserted, error } = await supabase.from("listings").insert({ ...rest, description: desc, manage_token, ...getAttribution() }).select(LISTING_COLUMNS).single();
    if (error) { console.error("post listing failed:", error.message); return error.message; }
    const newListing = rowToListing(inserted);
    setListings([newListing, ...listings]);
    const manageLink = `${window.location.origin}/manage/${newListing.id}/${manage_token}`;
    log("listing_created", { listingId: newListing.id });
    navigate("/post/success", { state: { listingId: newListing.id, manageLink } });
    return null;
  };

  // handleBoost removed in v15, shelved — see shelved-boost-feature.jsx

  const handleQuizComplete = async (answers) => {
    const archetype = scoreQuiz(answers).name;
    supabase.from("quiz_responses").insert({ answers, archetype, ...getAttribution() }).then(({ error }) => {
      if (error) console.error("quiz save failed:", error.message);
    });
    log("quiz_complete", answers);
    navigate("/quiz/results", { state: { answers } });
  };

  const isManageRoute = location.pathname.startsWith("/manage/") || location.pathname.startsWith("/admin/");

  if (!isManageRoute && loading) {
    return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_BODY, color: C.steel }}>Loading listings…</div>;
  }
  if (!isManageRoute && fetchError) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_BODY, padding: 20 }}>
        <div style={{ maxWidth: 440, textAlign: "center" }}>
          <div style={{ fontFamily: FONT_HEAD, fontSize: 20, color: "#A32D2D", marginBottom: 8 }}>Couldn't load listings</div>
          <div style={{ fontSize: 13, color: C.steel, marginBottom: 4 }}>{fetchError}</div>
          <div style={{ fontSize: 12, color: C.steel }}>This is usually a database schema mismatch — check that the latest schema.sql has been run in Supabase.</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: FONT_BODY, background: C.paper, minHeight: "100%" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap');
        .hl-detail-grid { display: grid; grid-template-columns: 1.6fr 1fr; gap: 32px; }
        .hl-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .hl-spec-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px 18px; }
        @media (max-width: 720px) { .hl-detail-grid { grid-template-columns: 1fr; gap: 24px; } }
        @media (max-width: 480px) { .hl-form-grid { grid-template-columns: 1fr; } .hl-spec-grid { grid-template-columns: 1fr 1fr; } }
      `}</style>
      <ScrollToTop />
      <TopBar onPost={() => navigate("/post")} />
      <Routes>
        <Route path="/" element={<Home allListings={visibleListings} recentlySold={recentlySold} log={log} openListing={openListing} />} />
        <Route path="/listing/:id" element={<ListingDetail allListings={enrichedListings} log={log} />} />
        <Route path="/category/:kind/:value/:state" element={<CategoryPage listings={visibleListings} openListing={openListing} />} />
        <Route path="/post" element={<PostAd onSubmit={handlePostSubmit} existingListings={listings} log={log} />} />
        <Route path="/post/success" element={<Success />} />
        <Route path="/value" element={<ValueMyCar allListings={listings} log={log} />} />
        <Route path="/quiz" element={<Quiz log={log} onComplete={handleQuizComplete} />} />
        <Route path="/quiz/results" element={<QuizResults allListings={visibleListings} openListing={openListing} />} />
        <Route path="/manage/:id/:token" element={<ManagePage />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/admin/:secret" element={<ChunkErrorBoundary><Suspense fallback={<div style={{ textAlign: "center", padding: "80px 20px", color: C.steel }}>Loading admin…</div>}><AdminPage /></Suspense></ChunkErrorBoundary>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Footer />
    </div>
  );
}
