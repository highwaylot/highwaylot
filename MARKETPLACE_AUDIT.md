# Marketplace code audit (Oct 2026)

Benchmark of the dormant buy/sell marketplace code on `next`, for whenever
it's revived. Business direction as of Oct 2026 is content-first
(valuation + wikiLOT); this is a snapshot of what exists, not a plan to
ship it.

## Size, by component (`src/App.jsx`, lines as of this commit)

| Component | ~Lines | What it does |
| --- | --- | --- |
| `AdminPage` | ~930 | Full ops dashboard: listing moderation, QR-campaign analytics, cross-reference tables, search/filter over all listings. By far the largest single piece. |
| `ManagePage` | ~374 | Token-link seller self-service: edit price/description, mark sold, delete. No login — security by possession of a long random URL. |
| `ListingDetail` | ~274 | Full listing page: photos, fairness-vs-market badge, credibility score, phone-reveal, duplicate-listing warning, comps. |
| `PostAd` | ~195 | Posting form: VIN auto-fill, CAPTCHA (Turnstile), duplicate-listing detection before submit, photo upload. |
| `Home` | ~122 | Search/filter/sort over live listings, hero, recently-sold strip, popular-searches chips. |
| `ListingCard` | ~63 | Shared card used by Home/CategoryPage — fairness badge, credibility dot, verified/featured badges. |
| `Hero` / `FilterBar` / `TopBar` | ~40 each | Search bar, filter row, nav — pre-"Highway" visual design, not yet redesigned. |
| `CategoryPage` | ~38 | SEO landing pages (`/category/make/:make/:state`), auto-generated from live data. |
| `RecentlySold` / `PopularSearches` | ~30 each | Homepage social-proof strips. |

Total marketplace-specific surface: **~2,100 lines** out of App.jsx's
~4,800 (the rest is the valuation tool, wikiLOT, and shared
infrastructure).

## What's genuinely production-grade already

- **No-login model**: manage-token links (long random string, revoked at
  the DB column level) instead of accounts — a real, intentional
  tradeoff, not a cut corner.
- **Fraud/trust signals**: fairness-vs-market %, a credibility score, a
  duplicate-listing detector (same year/make/model/mileage within 500mi),
  CAPTCHA on post. These aren't stubs — the logic is real.
- **SEO infrastructure**: auto-generated category pages, a dynamic
  sitemap (`api/sitemap.xml.js`) that queries live listings — built for
  organic growth, not just a demo.
- **Admin tooling**: the QR-campaign attribution system (`?src=` tracking
  → `QR_SOURCES`) and the admin xref tables are real operational tooling,
  not placeholder UI.

## What would need attention before a real relaunch

- **AdminPage's size** (~930 lines in one function) is the biggest
  maintenance risk in the whole file — it predates every later
  refactoring pattern used elsewhere (shared `Field`/ink tokens/etc.)
  and would benefit from being split up before more is added to it.
- **No visual design pass** — `Home`, `PostAd`, `ListingDetail`,
  `TopBar`/`Hero`/`FilterBar` all predate "The Highway" redesign
  (ink/lane-line system) shipped to main's two live pages. They're
  functionally complete but visually stuck on the old yellow/diagonal
  design language.
- **Unreviewed legal draft** (`LegalPlaceholder`/`DraftReviewBanner`,
  commit `9c8a10b`) still sits in `next`'s history, never merged to
  main — the substantial Terms/Privacy rewrite covering listings,
  contact-info handling, and DMCA is drafted but never got attorney
  review. Needed before listings go live again (real phone numbers,
  real addresses in play).
- **Cold-start problem is unsolved** — this is a product/GTM problem,
  not a code one, but worth repeating: the code being ready doesn't
  address needing both sides of the marketplace convinced at once.

## Bottom line

The marketplace isn't a prototype — it's a mostly-complete, reasonably
sophisticated build (real fraud signals, real SEO infra, a real
no-login security model). What's missing is a visual design pass to
match the current site, a legal review, and — the actual hard part —
a plan for getting both buyers and sellers in the door at once.
