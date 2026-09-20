import { useState, useMemo } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { ChevronLeft, X, Camera } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { C, FONT_HEAD, YEARS, US_STATES, inputStyle } from "../data/constants";
import { fmtMiles, guessBodyStyle } from "../lib/format";
import { compressImage } from "../lib/image";
import { Field } from "../components/shared";
import { MakeModelPicker, IssuesGate } from "../components/forms";

export function PostAd({ onSubmit, existingListings, log }) {
  const navigate = useNavigate();
  const location = useLocation();
  const prefill = location.state?.prefill;
  const [form, setForm] = useState({ year:"", make:"", model:"", trim:"", price:"", mileage:"", city:"", state:"", fuel:"Gas", trans:"Automatic", color:"", seller:"Private", body:"", condition:"Good", loan_status:"Paid off", loan_balance:"", desc:"", phone:"", ...prefill });
  const [photos, setPhotos] = useState([]);
  const [issues, setIssues] = useState({});
  const [confirmDuplicate, setConfirmDuplicate] = useState(false);
  const [honeypot, setHoneypot] = useState(""); // bots fill this; real users never see it
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const set = (k) => (e) => { const val = e.target.value; setForm((prev) => ({ ...prev, [k]: val })); setErrors((prev) => (prev[k] ? { ...prev, [k]: false } : prev)); };
  // For number-only fields (price, mileage, loan balance) — strips anything
  // that isn't a digit as it's typed, so a letter or stray comma literally
  // can't end up in the field rather than being caught after the fact.
  const setNumeric = (k) => (e) => { const val = e.target.value.replace(/[^0-9]/g, ""); setForm((prev) => ({ ...prev, [k]: val })); setErrors((prev) => (prev[k] ? { ...prev, [k]: false } : prev)); };

  const [photoError, setPhotoError] = useState(null);
  const addPhotos = async (fileList) => {
    setPhotoError(null);
    const files = Array.from(fileList).slice(0, 8 - photos.length);
    try {
      const compressed = await Promise.all(files.map(async (f) => {
        const blob = await compressImage(f);
        return { blob, previewUrl: URL.createObjectURL(blob) };
      }));
      setPhotos((prev) => [...prev, ...compressed]);
    } catch (err) {
      setPhotoError("One of those photos couldn't be processed — try a different file.");
    }
  };
  const removePhoto = (i) => {
    URL.revokeObjectURL(photos[i].previewUrl);
    setPhotos(photos.filter((_, idx) => idx !== i));
  };

  const possibleDuplicate = useMemo(() => {
    if (!form.year || !form.make || !form.model || !form.mileage) return null;
    return (existingListings || []).find((c) =>
      c.year === Number(form.year) && c.make === form.make && c.model === form.model && Math.abs(c.mileage - Number(form.mileage)) < 500
    ) || null;
  }, [form.year, form.make, form.model, form.mileage, existingListings]);

  const submit = async () => {
    if (honeypot.trim() !== "") return; // bot filled the hidden field — silently drop, no error shown
    setSubmitError(null);
    const req = ["year","make","model","price","mileage","city","state","phone","body"];
    const errs = {}; req.forEach((k) => { if (!String(form[k]).trim()) errs[k] = true; });
    if (photos.length < 3) errs.photos = true;
    if (possibleDuplicate && !confirmDuplicate) errs.duplicate = true;
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    if (possibleDuplicate) log("listing_duplicate_confirmed", { matchedId: possibleDuplicate.id });
    setSubmitting(true);

    // Real upload, not a throwaway blob URL — this is what actually fixes
    // photos disappearing on reload. If any single upload fails, stop and
    // say so on screen rather than publishing a listing with some photos
    // silently missing.
    const photoUrls = [];
    for (const p of photos) {
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.jpg`;
      const { error: uploadError } = await supabase.storage.from("listing-photos").upload(path, p.blob, { contentType: "image/jpeg" });
      if (uploadError) {
        setSubmitting(false);
        setSubmitError(`Photo upload failed: ${uploadError.message}`);
        return;
      }
      const { data: urlData } = supabase.storage.from("listing-photos").getPublicUrl(path);
      photoUrls.push(urlData.publicUrl);
    }

    const errMsg = await onSubmit({ ...form, year: Number(form.year), price: Number(form.price), mileage: Number(form.mileage), loan_balance: form.loan_status === "Still financed (loan payoff needed)" && form.loan_balance ? Number(form.loan_balance) : null, verified: false, featured: false, photos: photoUrls, issues, desc: form.desc || "No additional description provided." });
    setSubmitting(false);
    if (errMsg) setSubmitError(errMsg);
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "36px 20px 70px" }}>
      <Link to="/" style={{ display: "inline-flex", alignItems: "center", gap: 4, color: C.steel, fontSize: 13.5, marginBottom: 12, textDecoration: "none" }}><ChevronLeft size={15} /> Cancel</Link>
      <h2 style={{ fontFamily: FONT_HEAD, fontSize: 28, color: C.ink, margin: "0 0 4px" }}>Post your car</h2>
      <p style={{ color: C.steel, fontSize: 14, marginBottom: 24 }}>Listings are visible across the United States. Fields marked required.</p>
      {prefill && (
        <div style={{ background: C.greenBg, color: C.green, fontSize: 12.5, padding: "8px 12px", borderRadius: 6, marginBottom: 18 }}>
          Carried over from your Value My Car estimate — double-check everything before posting.
        </div>
      )}

      <input
        type="text" name="company_website" value={honeypot} onChange={(e) => setHoneypot(e.target.value)}
        tabIndex={-1} autoComplete="off" aria-hidden="true"
        style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
      />

      <Field label="Photos" required error={errors.photos}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
          {photos.map((p, i) => (
            <div key={i} style={{ position: "relative", width: 84, height: 84 }}>
              <img src={p.previewUrl} alt="" style={{ width: 84, height: 84, objectFit: "cover", borderRadius: 4, border: `1px solid ${C.line}` }} />
              <button onClick={() => removePhoto(i)} style={{ position: "absolute", top: -6, right: -6, background: C.ink, color: "#fff", border: "none", borderRadius: "50%", width: 20, height: 20, cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}><X size={12} /></button>
            </div>
          ))}
          {photos.length < 8 && (
            <label style={{ width: 84, height: 84, border: `1px dashed ${C.line}`, borderRadius: 4, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", color: C.steel, gap: 4 }}>
              <Camera size={18} /><span style={{ fontSize: 10.5 }}>Add photo</span>
              <input type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(e) => addPhotos(e.target.files)} />
            </label>
          )}
        </div>
        {photoError && <div style={{ fontSize: 12, color: "#A32D2D", marginBottom: 6 }}>{photoError}</div>}
        <div style={{ fontSize: 12, color: C.steel }}>{photos.length} of 3 minimum added.</div>
      </Field>

      <div className="hl-form-grid" style={{ marginTop: 18 }}>
        <Field label="Year" required error={errors.year}>
          <select value={form.year} onChange={set("year")} style={inputStyle}><option value="">Select year</option>{YEARS.map((y) => <option key={y} value={y}>{y}</option>)}</select>
        </Field>
        <MakeModelPicker make={form.make} model={form.model} onMakeChange={(v) => setForm((prev) => ({ ...prev, make: v }))} onModelChange={(v) => setForm((prev) => { const guess = guessBodyStyle(v); return { ...prev, model: v, ...(guess ? { body: guess } : {}) }; })} errors={errors} clearError={(k) => setErrors((prev) => ({ ...prev, [k]: false }))} />
        <Field label="Trim"><input value={form.trim} onChange={set("trim")} placeholder="XLT" style={inputStyle} /></Field>
        <Field label="Price (USD)" required error={errors.price}><input value={form.price} onChange={setNumeric("price")} inputMode="numeric" placeholder="24999" style={inputStyle} /></Field>
        <Field label="Mileage" required error={errors.mileage}><input value={form.mileage} onChange={setNumeric("mileage")} inputMode="numeric" placeholder="42000" style={inputStyle} /></Field>
        <Field label="City" required error={errors.city}><input value={form.city} onChange={set("city")} placeholder="Austin" style={inputStyle} /></Field>
        <Field label="State" required error={errors.state}>
          <select value={form.state} onChange={set("state")} style={inputStyle}><option value="">Select state</option>{US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}</select>
        </Field>
        <Field label="Seller type"><select value={form.seller} onChange={set("seller")} style={inputStyle}><option>Private</option><option>Dealer</option></select></Field>
        <Field label="Contact phone" required error={errors.phone}><input value={form.phone} onChange={set("phone")} placeholder="(555) 019-1234" style={inputStyle} /></Field>
        <Field label="Body style" required error={errors.body}>
          <select value={form.body} onChange={set("body")} style={inputStyle}><option value="">Select body style</option><option>Sedan</option><option>Coupe</option><option>Hatchback</option><option>SUV</option><option>Truck</option><option>Van/Minivan</option><option>Convertible</option></select>
        </Field>
        <Field label="Condition"><select value={form.condition} onChange={set("condition")} style={inputStyle}><option>Excellent</option><option>Good</option><option>Fair</option><option>Needs work</option></select></Field>
        <Field label="Ownership status"><select value={form.loan_status} onChange={set("loan_status")} style={inputStyle}><option>Paid off</option><option>Still financed (loan payoff needed)</option></select></Field>
        {form.loan_status === "Still financed (loan payoff needed)" && (
          <Field label="Remaining loan balance ($)"><input value={form.loan_balance} onChange={setNumeric("loan_balance")} inputMode="numeric" placeholder="8500" style={inputStyle} /></Field>
        )}
      </div>

      {possibleDuplicate && (
        <div style={{ marginTop: 16, padding: 14, background: "#FFF3D6", borderRadius: 6, border: `1px solid ${C.yellow}` }}>
          <div style={{ fontSize: 13.5, color: C.yellowDark, fontWeight: 600, marginBottom: 4 }}>This looks like it might already be listed</div>
          <div style={{ fontSize: 12.5, color: "#6B4F00", marginBottom: 8 }}>
            A {possibleDuplicate.year} {possibleDuplicate.make} {possibleDuplicate.model} with ~{fmtMiles(possibleDuplicate.mileage)} is already on HIGHWAYLOT ({possibleDuplicate.posted}). If this is a different car, just confirm below.
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "#6B4F00", cursor: "pointer" }}>
            <input type="checkbox" checked={confirmDuplicate} onChange={(e) => setConfirmDuplicate(e.target.checked)} />
            This is a different vehicle — continue anyway
          </label>
          {errors.duplicate && <div style={{ fontSize: 11.5, color: "#A32D2D", marginTop: 4 }}>Please confirm before continuing.</div>}
        </div>
      )}

      <div style={{ marginTop: 14 }}><Field label="Description"><textarea value={form.desc} onChange={set("desc")} rows={4} style={{ ...inputStyle, resize: "vertical" }} /></Field></div>

      <div style={{ marginTop: 18 }}>
        <IssuesGate issues={issues} onChange={setIssues} />
      </div>
      <div style={{ fontSize: 11.5, color: C.steel, marginTop: 10 }}>
        We only share your phone number with buyers who request it, and it's never posted publicly. No ID or real name required to list.
      </div>
      {submitError && (
        <div style={{ marginTop: 14, padding: 12, background: "#FBE4E3", border: "1px solid #E24B4A", borderRadius: 6, fontSize: 13, color: "#A32D2D" }}>
          Couldn't publish your listing: {submitError}. Nothing was lost — fix this and try again.
        </div>
      )}
      <button onClick={submit} disabled={submitting} style={{ marginTop: 18, background: C.yellow, color: C.ink, border: "none", borderRadius: 4, padding: "13px 26px", fontFamily: FONT_HEAD, fontSize: 15, cursor: submitting ? "default" : "pointer", opacity: submitting ? 0.7 : 1 }}>{submitting ? "Publishing…" : "Publish listing"}</button>
    </div>
  );
}
