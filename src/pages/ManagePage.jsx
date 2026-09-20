import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { C, FONT_HEAD, LISTING_COLUMNS, inputStyle } from "../data/constants";
import { rowToListing, getExpiryInfo } from "../lib/format";
import { Field } from "../components/shared";

export function ManagePage() {
  const { id: idParamRaw, token } = useParams();
  const idParam = Number(idParamRaw);
  const navigate = useNavigate();
  const [status, setStatus] = useState("checking"); // checking | denied | ready | deleted
  const [listing, setListing] = useState(null);
  const [price, setPrice] = useState("");
  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showSoldForm, setShowSoldForm] = useState(false);
  const [soldPrice, setSoldPrice] = useState("");
  const [markingSold, setMarkingSold] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: ok, error: verifyErr } = await supabase.rpc("verify_listing_token", { p_id: idParam, p_token: token });
      if (verifyErr || !ok) { setStatus("denied"); return; }
      const { data, error } = await supabase.from("listings").select(LISTING_COLUMNS).eq("id", idParam).is("deleted_at", null).single();
      if (error || !data) { setStatus("denied"); return; }
      setListing(rowToListing(data));
      setPrice(String(data.price));
      setDesc(data.description || "");
      setStatus("ready");
    })();
  }, [idParam, token]);

  const goHome = () => navigate("/");

  const saveChanges = async () => {
    setSaving(true);
    const { data: ok } = await supabase.rpc("update_listing_with_token", { p_id: idParam, p_token: token, p_price: Number(price), p_description: desc });
    setSaving(false);
    if (ok) {
      // Refetch rather than assume — price_updated_at may or may not have
      // changed server-side depending on whether this crossed the 2.5%
      // threshold, and the countdown display needs the real value.
      const { data } = await supabase.from("listings").select(LISTING_COLUMNS).eq("id", idParam).is("deleted_at", null).single();
      if (data) setListing(rowToListing(data));
      setSaved(true); setTimeout(() => setSaved(false), 2500);
    }
  };

  const markSold = async () => {
    setMarkingSold(true);
    const priceVal = soldPrice.trim() ? Number(soldPrice) : null;
    const { data: ok } = await supabase.rpc("mark_listing_sold", { p_id: idParam, p_token: token, p_sold_price: priceVal });
    setMarkingSold(false);
    if (ok) setListing({ ...listing, status: "sold" });
  };

  const deleteListing = async () => {
    if (!window.confirm("Delete this listing? This can't be undone.")) return;
    const { data: ok } = await supabase.rpc("delete_listing_with_token", { p_id: idParam, p_token: token });
    if (ok) setStatus("deleted");
  };

  if (status === "checking") return <div style={{ textAlign: "center", padding: "80px 20px", color: C.steel }}>Checking your link…</div>;
  if (status === "denied") return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "80px 20px", textAlign: "center" }}>
      <div style={{ fontFamily: FONT_HEAD, fontSize: 22, color: C.ink, marginBottom: 8 }}>This link isn't valid</div>
      <p style={{ color: C.steel, fontSize: 14 }}>Either the listing's already been removed, or this management link is incorrect.</p>
      <button onClick={goHome} style={{ marginTop: 16, background: C.ink, color: "#fff", border: "none", borderRadius: 4, padding: "10px 20px", fontFamily: FONT_HEAD, cursor: "pointer" }}>Back to HIGHWAYLOT</button>
    </div>
  );
  if (status === "deleted") return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "80px 20px", textAlign: "center" }}>
      <div style={{ fontFamily: FONT_HEAD, fontSize: 22, color: C.ink, marginBottom: 8 }}>Listing deleted</div>
      <p style={{ color: C.steel, fontSize: 14 }}>It's no longer visible on HIGHWAYLOT.</p>
      <button onClick={goHome} style={{ marginTop: 16, background: C.ink, color: "#fff", border: "none", borderRadius: 4, padding: "10px 20px", fontFamily: FONT_HEAD, cursor: "pointer" }}>Back to HIGHWAYLOT</button>
    </div>
  );

  const expiry = listing ? getExpiryInfo(listing) : null;

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "40px 20px 70px" }}>
      <div style={{ fontFamily: FONT_HEAD, fontSize: 24, color: C.ink, marginBottom: 4 }}>Manage your listing</div>
      <p style={{ color: C.steel, fontSize: 13.5, marginBottom: 8 }}>{listing.year} {listing.make} {listing.model} — only visible to whoever has this exact link.</p>

      {listing.status === "sold" && (
        <div style={{ background: C.greenBg, border: `1px solid ${C.line}`, borderRadius: 6, padding: "10px 14px", fontSize: 13, color: C.green, marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>
          <Check size={14} /> Marked sold — no longer visible on HIGHWAYLOT
        </div>
      )}
      {listing.status === "active" && expiry && expiry.daysLeft <= 14 && !expiry.expired && (
        <div style={{ fontSize: 13, color: "#A32D2D", fontWeight: 600, marginBottom: 16 }}>
          Expires in {expiry.daysLeft} day{expiry.daysLeft === 1 ? "" : "s"} — update the price to keep it active.
        </div>
      )}
      {listing.status === "active" && expiry && expiry.expired && (
        <div style={{ fontSize: 13, color: "#A32D2D", fontWeight: 600, marginBottom: 16 }}>
          This listing has expired and is hidden from browse — update the price to bring it back.
        </div>
      )}

      <Field label="Price (USD)"><input value={price} onChange={(e) => setPrice(e.target.value)} style={inputStyle} disabled={listing.status === "sold"} /></Field>
      <div style={{ marginTop: 14 }}><Field label="Description"><textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={4} style={{ ...inputStyle, resize: "vertical" }} disabled={listing.status === "sold"} /></Field></div>
      {listing.status !== "sold" && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16 }}>
          <button onClick={saveChanges} disabled={saving} style={{ background: C.yellow, border: "none", borderRadius: 4, padding: "11px 20px", fontFamily: FONT_HEAD, cursor: "pointer" }}>{saving ? "Saving…" : "Save changes"}</button>
          {saved && <span style={{ fontSize: 12.5, color: C.green, display: "flex", alignItems: "center", gap: 4 }}><Check size={14} /> Saved</span>}
        </div>
      )}

      {listing.status !== "sold" && (
        <div style={{ marginTop: 30, paddingTop: 20, borderTop: `1px solid ${C.line}` }}>
          <div style={{ fontFamily: FONT_HEAD, fontSize: 15, color: C.ink, marginBottom: 6 }}>Sold it?</div>
          {!showSoldForm ? (
            <button onClick={() => setShowSoldForm(true)} style={{ background: C.greenBg, color: C.green, border: "none", borderRadius: 4, padding: "10px 18px", fontFamily: FONT_HEAD, cursor: "pointer" }}>Mark as sold</button>
          ) : (
            <div>
              <label style={{ fontSize: 12.5, color: C.steel, display: "block", marginBottom: 4 }}>What did it sell for? (optional)</label>
              <input value={soldPrice} onChange={(e) => setSoldPrice(e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" placeholder="e.g. 15500" style={inputStyle} />
              <div style={{ fontSize: 11.5, color: C.steel, marginTop: 6, lineHeight: 1.5 }}>
                This stays completely private — it's never shown on your listing or anywhere public. It just helps us understand how prices actually move so we can make our tools more accurate for everyone.
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button onClick={markSold} disabled={markingSold} style={{ background: C.green, color: "#fff", border: "none", borderRadius: 4, padding: "10px 18px", fontFamily: FONT_HEAD, cursor: "pointer" }}>{markingSold ? "Saving…" : "Confirm sold"}</button>
                <button onClick={() => setShowSoldForm(false)} style={{ background: "transparent", border: `1px solid ${C.line}`, borderRadius: 4, padding: "10px 18px", fontFamily: FONT_HEAD, cursor: "pointer" }}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {listing.status !== "sold" && (
        <div style={{ marginTop: 30, paddingTop: 20, borderTop: `1px solid ${C.line}` }}>
          <div style={{ fontFamily: FONT_HEAD, fontSize: 15, color: "#A32D2D", marginBottom: 6 }}>Danger zone</div>
          <button onClick={deleteListing} style={{ background: "#FBE4E3", color: "#A32D2D", border: "none", borderRadius: 4, padding: "10px 18px", fontFamily: FONT_HEAD, cursor: "pointer" }}>Delete this listing</button>
        </div>
      )}
      <span onClick={goHome} style={{ display: "inline-block", marginTop: 24, color: C.steel, fontSize: 13, cursor: "pointer", textDecoration: "underline" }}>Back to HIGHWAYLOT</span>
    </div>
  );
}
