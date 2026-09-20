import { BODY_SLUGS, BODY_GUESS_RULES, STATE_ABBR } from "../data/constants";

export const fmtPrice = (n) => "$" + n.toLocaleString("en-US");
export const fmtMiles = (n) => n.toLocaleString("en-US") + " mi";

export const stateAbbr = (s) => STATE_ABBR[s] || s;

export const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export function categoryToPath(category) {
  const stateSlug = slugify(category.state);
  if (category.kind === "make") return `/category/make/${slugify(category.make)}/${stateSlug}`;
  return `/category/body/${BODY_SLUGS[category.body] || slugify(category.body)}/${stateSlug}`;
}

export function generateToken() {
  if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0, v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function guessBodyStyle(model) {
  if (!model) return null;
  const m = ` ${model.toLowerCase()} `;
  for (const rule of BODY_GUESS_RULES) {
    if (rule.keywords.some((k) => m.includes(k))) return rule.body;
  }
  return null;
}

export function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${Math.max(mins, 1)} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export const rowToListing = (row) => ({ ...row, desc: row.description, posted: timeAgo(row.created_at) });

const EXPIRY_DAYS = 90;
export function getExpiryInfo(listing) {
  if (listing.status !== "active") return { expired: false, daysLeft: null }; // sold listings don't "expire"
  const clockStart = new Date(listing.price_updated_at || listing.created_at).getTime();
  const expiresAt = clockStart + EXPIRY_DAYS * 86400000;
  const daysLeft = Math.ceil((expiresAt - Date.now()) / 86400000);
  return { expired: daysLeft <= 0, daysLeft };
}
