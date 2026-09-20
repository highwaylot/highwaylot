export function estimateFairness(listing, allListings) {
  const comps = allListings.filter((c) => c.id !== listing.id && c.make === listing.make && c.model === listing.model && Math.abs(c.year - listing.year) <= 2);
  if (comps.length < 2) return null;
  const avg = comps.reduce((s, c) => s + c.price, 0) / comps.length;
  const diffPct = (listing.price - avg) / avg;
  let verdict, tone;
  if (diffPct <= -0.07) { verdict = "Good deal"; tone = "verified"; }
  else if (diffPct >= 0.07) { verdict = "Above market"; tone = "yellow"; }
  else { verdict = "Fair price"; tone = "neutral"; }
  return { verdict, tone, diffPct, compCount: comps.length, avg };
}

export function computeCredibility(listing, allListings) {
  const flags = [];
  if (listing.fairness && listing.fairness.diffPct <= -0.4) {
    const hasNoDamageDisclosed = !listing.issues || !Object.values(listing.issues).some((v) => v === "Broken" || v === "Major" || v === true);
    const noIssuesReported = hasNoDamageDisclosed && ["Excellent", "Good"].includes(listing.condition);
    if (noIssuesReported) flags.push({ weight: 40, label: "Priced far below similar listings with no reported issues" });
    else flags.push({ weight: 15, label: "Priced notably below similar listings" });
  }
  const duplicate = allListings.some((c) => c.id !== listing.id && c.year === listing.year && c.make === listing.make && c.model === listing.model && Math.abs(c.mileage - listing.mileage) < 500);
  if (duplicate) flags.push({ weight: 25, label: "Matches another listing's year, make, model, and mileage closely" });
  if (!listing.desc || listing.desc.trim().length < 20 || listing.desc === "No additional description provided.") {
    flags.push({ weight: 10, label: "Little to no description provided" });
  }
  const totalWeight = flags.reduce((s, f) => s + f.weight, 0);
  const level = totalWeight >= 40 ? "red" : totalWeight >= 15 ? "yellow" : "green";
  return { level, flags };
}

export const MECHANICAL_SYSTEMS = [
  { key: "engine", label: "Engine", max: 4000 },
  { key: "transmission", label: "Transmission", max: 2500 },
  { key: "body", label: "Body / frame", max: 2000 },
  { key: "suspension", label: "Suspension / axle", max: 1200 },
  { key: "electrical", label: "Electrical", max: 800 },
  { key: "ac", label: "AC / heating", max: 600 },
  { key: "brakes", label: "Brakes", max: 500 },
];
export const STATUS_OPTIONS = [
  { key: "Fixed", tone: "verified", weight: 0 },
  { key: "Ongoing", tone: "yellow", weight: 0.35 },
  { key: "Broken", tone: "danger", weight: 1 },
];

// Cosmetic damage doesn't have a "fixed" state the way a mechanical system
// does — a dent isn't "broken," it just is or isn't there. These use their
// own severity language and weights (no zero-cost tier, since selecting any
// tier means real damage was reported; skipping the category entirely is
// what represents "no damage").
export const COSMETIC_SYSTEMS = [
  { key: "paint", label: "Paint / exterior (fading, chips, clear coat)", max: 1000 },
  { key: "dents", label: "Dents & scratches", max: 1200 },
];
export const COSMETIC_OPTIONS = [
  { key: "Minor", tone: "verified", weight: 0.18 },
  { key: "Moderate", tone: "yellow", weight: 0.5 },
  { key: "Major", tone: "danger", weight: 1 },
];

// Burn marks scale by count, not severity — cost is driven by how many spots
// there are more than how bad any single one looks. Blended per-burn figure
// (fabric/vinyl/leather averaged, since we don't ask seat material) sourced
// from real repair-cost research: $50-$280/burn fabric, $75-$200 vinyl,
// $140-$420 leather. 4+ spots crosses into "just replace the panel" territory
// per that same research, so it's priced as a partial reupholstery job, not
// a per-burn multiple.
export const BURN_TIERS = [
  { key: "1", label: "1 spot", cost: 150 },
  { key: "2-3", label: "2–3 spots", cost: 400 },
  { key: "4+", label: "4+ spots", cost: 1500 },
];
// Smoke/odor treatment is a flat detailing service, not brand-specific repair
// work — real cars, not annual-repair-rate territory — so only the regional
// labor adjustment applies here, not the brand multiplier.
export const ODOR_TREATMENT_COST = 115; // midpoint of real $80-$150 range found

// Plain-language summary for public display — what's disclosed, not what it
// costs. Pricing logic stays internal; the fact of a disclosed issue is fine
// to show a buyer, the dollar breakdown isn't.
export function getIssuesSummary(issues) {
  const rows = [];
  MECHANICAL_SYSTEMS.forEach((sys) => {
    const status = issues[sys.key];
    if (!status) return;
    const text = status === "Broken" ? "Not working" : status === "Ongoing" ? "Ongoing issue" : "Working fine";
    rows.push({ label: sys.label, statusText: text, positive: status === "Fixed" });
  });
  COSMETIC_SYSTEMS.forEach((sys) => {
    const status = issues[sys.key];
    if (!status) return;
    rows.push({ label: sys.label, statusText: status, positive: false });
  });
  if (issues.burnCount) {
    const tier = BURN_TIERS.find((t) => t.key === issues.burnCount);
    if (tier) rows.push({ label: "Burn marks", statusText: tier.label, positive: false });
  }
  if (issues.odorTreatment === true) rows.push({ label: "Smoke odor", statusText: "Present", positive: false });
  if (issues.odorTreatment === false) rows.push({ label: "Smoke odor", statusText: "None", positive: true });
  return rows;
}

// Real RepairPal average-annual-repair-cost-by-brand data (repairpal.com/reliability),
// checked September 2026. All-brand average is $652/yr — every brand's ceiling gets
// scaled by (brand figure ÷ 652). Brands not in this table (no RepairPal figure
// found/published, e.g. Tesla) fall back to a neutral 1.0 multiplier rather than a
// guess. This list should be refreshed periodically, same as the regional figure below.
export const BRAND_REPAIR_COST = {
  Honda: 428, Acura: 501, Kia: 474, Hyundai: 468, Mazda: 462, Lexus: 551, Toyota: 441,
  Nissan: 500, Ford: 775, Chevrolet: 649, Jeep: 634, BMW: 968, "Mercedes-Benz": 908,
  Audi: 987, GMC: 744, Volkswagen: 676, Subaru: 617,
};
export const ALL_BRAND_AVG_REPAIR_COST = 652;
export function getBrandMultiplier(make) {
  const cost = BRAND_REPAIR_COST[make];
  return cost ? cost / ALL_BRAND_AVG_REPAIR_COST : 1.0;
}

// National baseline for the regional multiplier — real per-state figures
// come from the state_labor_rates table in Supabase (fetched by ValueMyCar),
// same BLS OEWS May 2025 source. States not yet in that table fall back to
// this national figure (multiplier of 1.0) rather than guessing.
export const NATIONAL_MEDIAN_WAGE = 50620;

export function computeMechanicalDeduction(issues, make, regionalMultiplier = 1.0) {
  const brandMult = getBrandMultiplier(make);
  const breakdown = [];
  let total = 0;
  MECHANICAL_SYSTEMS.forEach((sys) => {
    const status = issues[sys.key];
    if (!status) return;
    const opt = STATUS_OPTIONS.find((o) => o.key === status);
    const adjustedMax = sys.max * brandMult * regionalMultiplier;
    const deduction = Math.round(adjustedMax * opt.weight);
    if (deduction > 0) { breakdown.push({ label: sys.label, status, deduction }); total += deduction; }
    else breakdown.push({ label: sys.label, status, deduction: 0 });
  });
  COSMETIC_SYSTEMS.forEach((sys) => {
    const status = issues[sys.key];
    if (!status) return;
    const opt = COSMETIC_OPTIONS.find((o) => o.key === status);
    const adjustedMax = sys.max * brandMult * regionalMultiplier;
    const deduction = Math.round(adjustedMax * opt.weight);
    breakdown.push({ label: sys.label, status, deduction });
    total += deduction;
  });
  if (issues.burnCount) {
    const tier = BURN_TIERS.find((t) => t.key === issues.burnCount);
    if (tier) {
      const deduction = Math.round(tier.cost * brandMult * regionalMultiplier);
      breakdown.push({ label: "Burn marks", status: tier.label, deduction });
      total += deduction;
    }
  }
  if (issues.odorTreatment) {
    // Regional labor adjustment only — this is a flat detailing service, not
    // brand-specific repair work, so the brand multiplier doesn't apply.
    const deduction = Math.round(ODOR_TREATMENT_COST * regionalMultiplier);
    breakdown.push({ label: "Smoke odor treatment", status: "Needed", deduction });
    total += deduction;
  }
  return { total, breakdown, brandMult, hasBrandData: Boolean(BRAND_REPAIR_COST[make]) };
}
