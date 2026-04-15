import { useState, useRef } from "react";

// ─────────────────────────────────────────────────────────────────
//  FIELD DESIGN
//  User enters 14 core measurements.
//  The remaining 16 are auto-derived and shown as calculated chips.
//
//  Derivation rules (clinically grounded approximations):
//    perimeter  ≈ 2π × radius
//    area       ≈ π × radius²
//    compactness = perimeter² / area - 1   (shape index)
//    concavity  ≈ concave_points × 1.8    (proportional relationship in WBCD)
//    [se]       = user-entered directly for radius, texture, smoothness, concave_points, symmetry
//    [worst]    = user-entered directly for radius, texture, smoothness, concave_points, symmetry
//    perimeter/area/compactness/concavity worst and se → derived same way
// ─────────────────────────────────────────────────────────────────

const INPUT_FIELDS = [
  // ── MEAN ──
  { id: "radius_mean",         group: "mean",  label: "Radius Mean",            placeholder: "e.g. 14.1",   hint: "Benign ≈ 12.1 · Malignant ≈ 17.5", unit: "mm" },
  { id: "texture_mean",        group: "mean",  label: "Texture Mean",           placeholder: "e.g. 19.3",   hint: "Benign ≈ 17.9 · Malignant ≈ 21.6", unit: "" },
  { id: "smoothness_mean",     group: "mean",  label: "Smoothness Mean",        placeholder: "e.g. 0.096",  hint: "Local variation in radius lengths (0.05–0.16)", unit: "" },
  { id: "concave_points_mean", group: "mean",  label: "Concave Points Mean",    placeholder: "e.g. 0.049",  hint: "Benign ≈ 0.026 · Malignant ≈ 0.088", unit: "" },
  { id: "symmetry_mean",       group: "mean",  label: "Symmetry Mean",          placeholder: "e.g. 0.181",  hint: "Cell shape symmetry (0.11–0.30)", unit: "" },
  { id: "fractal_dimension_mean", group: "mean", label: "Fractal Dimension Mean", placeholder: "e.g. 0.063", hint: "Coastline approximation (0.05–0.10)", unit: "" },
  // ── SE ──
  { id: "radius_se",           group: "se",    label: "Radius SE",              placeholder: "e.g. 0.41",   hint: "Standard error of radius (0.11–2.87)", unit: "" },
  { id: "texture_se",          group: "se",    label: "Texture SE",             placeholder: "e.g. 1.22",   hint: "Standard error of texture (0.36–4.88)", unit: "" },
  { id: "smoothness_se",       group: "se",    label: "Smoothness SE",          placeholder: "e.g. 0.007",  hint: "Standard error of smoothness", unit: "" },
  { id: "concave_points_se",   group: "se",    label: "Concave Points SE",      placeholder: "e.g. 0.012",  hint: "SE of concave points", unit: "" },
  { id: "symmetry_se",         group: "se",    label: "Symmetry SE",            placeholder: "e.g. 0.020",  hint: "SE of symmetry", unit: "" },
  // ── WORST ──
  { id: "radius_worst",        group: "worst", label: "Radius Worst",           placeholder: "e.g. 16.3",   hint: "Benign ≈ 14.2 · Malignant ≈ 21.1", unit: "mm" },
  { id: "texture_worst",       group: "worst", label: "Texture Worst",          placeholder: "e.g. 25.7",   hint: "Benign ≈ 23.5 · Malignant ≈ 29.3", unit: "" },
  { id: "concave_points_worst",group: "worst", label: "Concave Points Worst",   placeholder: "e.g. 0.115",  hint: "Benign ≈ 0.075 · Malignant ≈ 0.182", unit: "" },
];

const ALL_INPUT_IDS = INPUT_FIELDS.map((f) => f.id);

// ── Derive the remaining 16 fields from the 14 inputs ──────────────
function deriveAll(v) {
  const r  = v("radius_mean"),  sm = v("smoothness_mean"), cp = v("concave_points_mean");
  const rse = v("radius_se"),   cpse = v("concave_points_se");
  const rw = v("radius_worst"), cpw = v("concave_points_worst");

  const safe = (x) => (isNaN(x) || !isFinite(x) ? null : x);
  const p  = (rad) => safe(2 * Math.PI * rad);
  const a  = (rad) => safe(Math.PI * rad * rad);
  const cmp = (perim, area) => (perim && area ? safe((perim * perim) / area - 1) : null);
  const cnc = (cp_val) => safe(cp_val * 1.8);

  // Derived mean
  const perimeter_mean        = p(r);
  const area_mean             = a(r);
  const compactness_mean      = cmp(perimeter_mean, area_mean);
  const concavity_mean        = cnc(cp);
  const fractal_dimension_mean_derived = null; // user enters this

  // Derived SE
  const perimeter_se          = p(rse);
  const area_se               = a(rse);
  const compactness_se        = cmp(perimeter_se, area_se);
  const concavity_se          = cnc(cpse);
  const fractal_dimension_se  = safe(v("smoothness_se") * 0.4); // weak proxy

  // Derived worst
  const perimeter_worst       = p(rw);
  const area_worst            = a(rw);
  const compactness_worst     = cmp(perimeter_worst, area_worst);
  const concavity_worst       = cnc(cpw);
  const smoothness_worst      = safe(v("smoothness_mean") * 1.35);
  const symmetry_worst        = safe(v("symmetry_mean") * 1.35);
  const fractal_dimension_worst = safe(v("fractal_dimension_mean") * 1.3);

  return {
    perimeter_mean, area_mean, compactness_mean, concavity_mean,
    perimeter_se, area_se, compactness_se, concavity_se, fractal_dimension_se,
    perimeter_worst, area_worst, compactness_worst, concavity_worst,
    smoothness_worst, symmetry_worst, fractal_dimension_worst,
  };
}

// ── Samples from Wisconsin dataset ─────────────────────────────────
const SAMPLES = {
  malignant: {
    radius_mean: 17.99, texture_mean: 10.38, smoothness_mean: 0.1184,
    concave_points_mean: 0.1471, symmetry_mean: 0.2419, fractal_dimension_mean: 0.07871,
    radius_se: 1.095, texture_se: 0.9053, smoothness_se: 0.006399,
    concave_points_se: 0.01587, symmetry_se: 0.03003,
    radius_worst: 25.38, texture_worst: 17.33, concave_points_worst: 0.2654,
  },
  benign: {
    radius_mean: 13.08, texture_mean: 15.71, smoothness_mean: 0.1075,
    concave_points_mean: 0.0311, symmetry_mean: 0.1967, fractal_dimension_mean: 0.06811,
    radius_se: 0.1852, texture_se: 0.7477, smoothness_se: 0.004097,
    concave_points_se: 0.00628, symmetry_se: 0.01523,
    radius_worst: 14.5, texture_worst: 20.49, concave_points_worst: 0.07283,
  },
};

// ── Feature order expected by the trained model ─────────────────
const MODEL_FEATURE_ORDER = [
  "radius_mean","texture_mean","perimeter_mean","area_mean","smoothness_mean",
  "compactness_mean","concavity_mean","concave_points_mean","symmetry_mean","fractal_dimension_mean",
  "radius_se","texture_se","perimeter_se","area_se","smoothness_se",
  "compactness_se","concavity_se","concave_points_se","symmetry_se","fractal_dimension_se",
  "radius_worst","texture_worst","perimeter_worst","area_worst","smoothness_worst",
  "compactness_worst","concavity_worst","concave_points_worst","symmetry_worst","fractal_dimension_worst",
];

function fmtDerived(val) {
  if (val === null || val === undefined) return "—";
  if (Math.abs(val) >= 100) return val.toFixed(1);
  if (Math.abs(val) >= 10)  return val.toFixed(2);
  return val.toFixed(5);
}

const GROUP_META = {
  mean:  { label: "Mean Values",                emoji: "📐" },
  se:    { label: "Standard Error (SE) Values", emoji: "📊" },
  worst: { label: "Worst (Largest) Values",     emoji: "🔬" },
};

export default function Form({ onResult, onLoading }) {
  const [values,    setValues]    = useState({});
  const [errors,    setErrors]    = useState({});
  const [tooltip,   setTooltip]   = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState(null);
  const fileRef = useRef(null);

  // Live-derive values whenever inputs change
  const getV = (id) => parseFloat(values[id]);
  const derived = deriveAll(getV);

  // Merge user inputs + derived for full 30-feature vector
  function allValues() {
    const merged = { ...derived };
    ALL_INPUT_IDS.forEach((id) => { merged[id] = parseFloat(values[id]); });
    return merged;
  }

  function handleChange(id, val) {
    setValues((p) => ({ ...p, [id]: val }));
    if (errors[id]) setErrors((p) => ({ ...p, [id]: false }));
  }

  function loadSample(type) {
    setValues(Object.fromEntries(Object.entries(SAMPLES[type]).map(([k, v]) => [k, String(v)])));
    setErrors({});
    setUploadMsg(null);
  }

  function clearForm() {
    setValues({});
    setErrors({});
    setUploadMsg(null);
    onResult(null);
  }

  function validate() {
    const errs = {};
    let ok = true;
    ALL_INPUT_IDS.forEach((id) => {
      if (isNaN(parseFloat(values[id]))) { errs[id] = true; ok = false; }
    });
    setErrors(errs);
    return ok;
  }

  async function handleSubmit() {
    if (!validate()) return;
    const merged = allValues();

    // Build ordered feature array for the model
    const features = MODEL_FEATURE_ORDER.map((id) => {
      const v = merged[id];
      return (v === null || v === undefined || isNaN(v)) ? 0 : v;
    });

    setLoading(true);
    onLoading(true);
    onResult(null);

    try {
      const res = await fetch("http://localhost:8000/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ features }),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Attach full merged values for report generation
      data.inputValues = merged;
      onResult(data);
    } catch (err) {
      onResult({ error: err.message });
    } finally {
      setLoading(false);
      onLoading(false);
    }
  }

  // ── File upload → extract → autofill ───────────────────────────
  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    setUploading(true);
    setUploadMsg({ type: "info", text: `Reading "${file.name}"…` });

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://localhost:8000/extract", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Extraction failed");

      const extracted = data.values || {};
      const count = data.found || 0;

      if (count === 0) {
        setUploadMsg({ type: "warn", text: "No measurements found in the file. Please fill in manually." });
      } else {
        // Only fill the 14 input fields; derived fields are auto-computed
        const newVals = {};
        ALL_INPUT_IDS.forEach((id) => {
          if (extracted[id] !== undefined) newVals[id] = String(extracted[id]);
        });
        setValues((prev) => ({ ...prev, ...newVals }));
        setErrors({});
        const filled = Object.keys(newVals).length;
        setUploadMsg({
          type: "success",
          text: `✅ Auto-filled ${filled} field${filled !== 1 ? "s" : ""} from your report. Please verify the values.`,
        });
      }
    } catch (err) {
      setUploadMsg({ type: "error", text: `Upload failed: ${err.message}` });
    } finally {
      setUploading(false);
    }
  }

  const filledCount = ALL_INPUT_IDS.filter((id) => !isNaN(parseFloat(values[id]))).length;
  const progress = Math.round((filledCount / ALL_INPUT_IDS.length) * 100);

  const groups = ["mean", "se", "worst"];

  return (
    <div className="form-panel">
      {/* ── Header ── */}
      <div className="form-panel-header">
        <div>
          <h3>Clinical Measurements</h3>
          <p>Enter {ALL_INPUT_IDS.length} core values · remaining {Object.keys(derived).length} are auto-calculated</p>
        </div>
        <div className="sample-btns">
          <button className="sample-btn benign"    onClick={() => loadSample("benign")}>✅ Benign</button>
          <button className="sample-btn malignant" onClick={() => loadSample("malignant")}>⚠️ Malignant</button>
        </div>
      </div>

      {/* ── Upload banner ── */}
      <div className="upload-zone" onClick={() => !uploading && fileRef.current?.click()}>
        <input
          ref={fileRef} type="file"
          accept=".pdf,.png,.jpg,.jpeg,.txt,.doc,.docx"
          style={{ display: "none" }}
          onChange={handleFileUpload}
        />
        {uploading ? (
          <div className="upload-inner uploading">
            <div className="upload-spinner" />
            <span>Extracting measurements from file…</span>
          </div>
        ) : (
          <div className="upload-inner">
            <span className="upload-icon">📎</span>
            <div>
              <strong>Upload Biopsy Report</strong>
              <span>PDF, image (JPG/PNG), or text file · AI will auto-fill fields</span>
            </div>
          </div>
        )}
      </div>

      {uploadMsg && (
        <div className={`upload-msg upload-msg-${uploadMsg.type}`}>
          {uploadMsg.text}
          <button onClick={() => setUploadMsg(null)} className="upload-msg-close">×</button>
        </div>
      )}

      {/* ── Progress ── */}
      <div className="form-progress">
        <div className="form-progress-bar-track">
          <div className="form-progress-bar-fill" style={{ width: `${progress}%` }} />
        </div>
        <span className="form-progress-label">{filledCount}/{ALL_INPUT_IDS.length} core fields</span>
      </div>

      {/* ── Fields grouped ── */}
      <div className="form-body">
        {groups.map((grp) => {
          const fields = INPUT_FIELDS.filter((f) => f.group === grp);
          const meta   = GROUP_META[grp];

          // Derived fields for this group to show as chips
          const derivedForGroup = Object.entries(derived).filter(([id]) => {
            if (grp === "mean")  return ["perimeter_mean","area_mean","compactness_mean","concavity_mean"].includes(id);
            if (grp === "se")    return ["perimeter_se","area_se","compactness_se","concavity_se","fractal_dimension_se"].includes(id);
            if (grp === "worst") return ["perimeter_worst","area_worst","compactness_worst","concavity_worst","smoothness_worst","symmetry_worst","fractal_dimension_worst"].includes(id);
            return false;
          });

          return (
            <div key={grp}>
              <div className="form-group-title">
                <span>{meta.emoji}</span> {meta.label}
              </div>

              <div className="form-grid">
                {fields.map((field) => (
                  <div className="field" key={field.id}>
                    <label htmlFor={field.id}>{field.label}{field.unit ? ` (${field.unit})` : ""}</label>
                    <input
                      id={field.id}
                      type="number"
                      step="any"
                      placeholder={field.placeholder}
                      value={values[field.id] ?? ""}
                      className={errors[field.id] ? "error" : ""}
                      onChange={(e) => handleChange(field.id, e.target.value)}
                      onFocus={() => setTooltip(field.id)}
                      onBlur={() => setTooltip(null)}
                    />
                    {tooltip === field.id && (
                      <span className="field-hint">{field.hint}</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Auto-calculated chips */}
              {derivedForGroup.length > 0 && (
                <div className="derived-group">
                  <div className="derived-label">⚡ Auto-calculated from above inputs</div>
                  <div className="derived-chips">
                    {derivedForGroup.map(([id, val]) => (
                      <div className="derived-chip" key={id} title={id}>
                        <span className="derived-chip-name">
                          {id.replace(/_mean|_se|_worst/g, "").replace(/_/g, " ")}
                        </span>
                        <span className="derived-chip-val">{fmtDerived(val)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Actions ── */}
      <div className="form-footer">
        <button className="btn-predict" onClick={handleSubmit} disabled={loading}>
          {loading
            ? <><span className="btn-spinner" />Analyzing…</>
            : <>🔬 Analyze &amp; Predict</>}
        </button>
        <button className="btn-clear" onClick={clearForm} disabled={loading}>Clear</button>
      </div>
    </div>
  );
}