// Server-side verification for the Cloudflare Turnstile CAPTCHA on our write
// forms (post ad, quiz, valuation). The frontend's "solved" callback can't be
// trusted on its own — it's just JS running in the requester's browser — so
// every submission re-checks the token here against Cloudflare's siteverify
// endpoint using the secret key, which never ships to the client.
//
// Requires TURNSTILE_SECRET_KEY set in Vercel's project env vars (Project
// Settings -> Environment Variables). Get it from the Cloudflare dashboard
// alongside the site key (dash.cloudflare.com -> Turnstile).

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "method_not_allowed" });
    return;
  }

  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.error("TURNSTILE_SECRET_KEY is not set");
    res.status(500).json({ success: false, error: "not_configured" });
    return;
  }

  const { token } = req.body || {};
  if (!token || typeof token !== "string") {
    res.status(400).json({ success: false, error: "missing_token" });
    return;
  }

  try {
    const remoteip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim();
    const verifyRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, response: token, ...(remoteip ? { remoteip } : {}) }),
    });
    const data = await verifyRes.json();
    res.status(200).json({ success: !!data.success });
  } catch (err) {
    console.error("turnstile siteverify request failed:", err.message);
    res.status(502).json({ success: false, error: "verify_request_failed" });
  }
}
