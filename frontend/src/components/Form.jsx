import { useState, useRef } from "react";

// ─────────────────────────────────────────────────────────────────
//  14 core fields the user fills in.
//  The other 16 are auto-derived and shown as live purple chips.
//
//  Derivation formulas (geometry-based, clinically grounded):
//    perimeter   = 2π × radius
//    area        = π × radius²
//    compactness = perimeter² / area − 1   (standard shape index)
//    concavity   = concave_points × 1.8    (WBCD proportional ratio)
//
//  Worst group extras:
//    smoothness_worst       = smoothness_mean   × 1.35
//    symmetry_worst         = symmetry_mean     × 1.35
//    fractal_dimension_worst = fractal_dim_mean × 1.30
//    fractal_dimension_se   = smoothness_se     × 0.40
// ─────────────────────────────────────────────────────────────────

const INPUT_FIELDS = [
  // ── MEAN (6 fields) ──────────────────────────────────────────────
  {
    id: "radius_mean", group: "mean", label: "Radius Mean", unit: "mm",
    placeholder: "e.g. 14.1",
    hint: "Mean radius of cell nuclei. Benign ≈ 12.1 mm · Malignant ≈ 17.5 mm",
  },
  {
    id: "texture_mean", group: "mean", label: "Texture Mean", unit: "",
    placeholder: "e.g. 19.3",
    hint: "Std deviation of grey-scale values. Benign ≈ 17.9 · Malignant ≈ 21.6",
  },
  {
    id: "smoothness_mean", group: "mean", label: "Smoothness Mean", unit: "",
    placeholder: "e.g. 0.096",
    hint: "Local variation in radius lengths. Range 0.05 – 0.16",
  },
  {
    id: "concave_points_mean", group: "mean", label: "Concave Points Mean", unit: "",
    placeholder: "e.g. 0.049",
    hint: "Number of concave portions of contour. Benign ≈ 0.026 · Malignant ≈ 0.088",
  },
  {
    id: "symmetry_mean", group: "mean", label: "Symmetry Mean", unit: "",
    placeholder: "e.g. 0.181",
    hint: "Cell shape symmetry. Range 0.11 – 0.30",
  },
  {
    id: "fractal_dimension_mean", group: "mean", label: "Fractal Dimension Mean", unit: "",
    placeholder: "e.g. 0.063",
    hint: "Coastline approximation − 1. Range 0.05 – 0.10",
  },

  // ── SE (5 fields) ─────────────────────────────────────────────────
  {
    id: "radius_se", group: "se", label: "Radius SE", unit: "",
    placeholder: "e.g. 0.41",
    hint: "Standard error of radius measurements. Range 0.11 – 2.87",
  },
  {
    id: "texture_se", group: "se", label: "Texture SE", unit: "",
    placeholder: "e.g. 1.22",
    hint: "Standard error of texture. Range 0.36 – 4.88",
  },
  {
    id: "smoothness_se", group: "se", label: "Smoothness SE", unit: "",
    placeholder: "e.g. 0.007",
    hint: "Standard error of smoothness. Range 0.002 – 0.031",
  },
  {
    id: "concave_points_se", group: "se", label: "Concave Points SE", unit: "",
    placeholder: "e.g. 0.012",
    hint: "Standard error of concave points. Range 0.000 – 0.053",
  },
  {
    id: "symmetry_se", group: "se", label: "Symmetry SE", unit: "",
    placeholder: "e.g. 0.020",
    hint: "Standard error of symmetry. Range 0.008 – 0.079",
  },

  // ── WORST (3 fields) ─────────────────────────────────────────────
  {
    id: "radius_worst", group: "worst", label: "Radius Worst", unit: "mm",
    placeholder: "e.g. 16.3",
    hint: "Mean of 3 largest radius values. Benign ≈ 14.2 mm · Malignant ≈ 21.1 mm",
  },
  {
    id: "texture_worst", group: "worst", label: "Texture Worst", unit: "",
    placeholder: "e.g. 25.7",
    hint: "Mean of 3 largest texture values. Benign ≈ 23.5 · Malignant ≈ 29.3",
  },
  {
    id: "concave_points_worst", group: "worst", label: "Concave Points Worst", unit: "",
    placeholder: "e.g. 0.115",
    hint: "Mean of 3 largest concave-points values. Benign ≈ 0.075 · Malignant ≈ 0.182",
  },
];

const ALL_INPUT_IDS = INPUT_FIELDS.map((f) => f.id);

// ── Ordered feature array expected by the scikit-learn model ─────
const MODEL_ORDER = [
  "radius_mean","texture_mean","perimeter_mean","area_mean","smoothness_mean",
  "compactness_mean","concavity_mean","concave_points_mean","symmetry_mean","fractal_dimension_mean",
  "radius_se","texture_se","perimeter_se","area_se","smoothness_se",
  "compactness_se","concavity_se","concave_points_se","symmetry_se","fractal_dimension_se",
  "radius_worst","texture_worst","perimeter_worst","area_worst","smoothness_worst",
  "compactness_worst","concavity_worst","concave_points_worst","symmetry_worst","fractal_dimension_worst",
];

// ── Derive all 16 calculated fields ──────────────────────────────
function deriveAll(get) {
  const safe = (x) => (isNaN(x) || !isFinite(x) ? null : +x.toFixed(6));
  const perim = (r) => safe(2 * Math.PI * r);
  const area  = (r) => safe(Math.PI * r * r);
  const comp  = (p, a) => (p && a ? safe(p * p / a - 1) : null);
  const conc  = (cp)  => safe(cp * 1.8);

  const r   = get("radius_mean"),           cp  = get("concave_points_mean");
  const rse = get("radius_se"),             cpse = get("concave_points_se");
  const rw  = get("radius_worst"),          cpw  = get("concave_points_worst");
  const sm  = get("smoothness_mean"),       smse = get("smoothness_se");
  const sy  = get("symmetry_mean"),         fd   = get("fractal_dimension_mean");

  const pm = perim(r),  am = area(r);
  const ps = perim(rse), as_ = area(rse);
  const pw = perim(rw),  aw = area(rw);

  return {
    // mean derived
    perimeter_mean:           pm,
    area_mean:                am,
    compactness_mean:         comp(pm, am),
    concavity_mean:           conc(cp),
    // SE derived
    perimeter_se:             ps,
    area_se:                  as_,
    compactness_se:           comp(ps, as_),
    concavity_se:             conc(cpse),
    fractal_dimension_se:     safe(smse * 0.40),
    // worst derived
    perimeter_worst:          pw,
    area_worst:               aw,
    compactness_worst:        comp(pw, aw),
    concavity_worst:          conc(cpw),
    smoothness_worst:         safe(sm  * 1.35),
    symmetry_worst:           safe(sy  * 1.35),
    fractal_dimension_worst:  safe(fd  * 1.30),
  };
}

// ── Chips to display per group ────────────────────────────────────
const DERIVED_BY_GROUP = {
  mean:  ["perimeter_mean","area_mean","compactness_mean","concavity_mean"],
  se:    ["perimeter_se","area_se","compactness_se","concavity_se","fractal_dimension_se"],
  worst: ["perimeter_worst","area_worst","compactness_worst","concavity_worst",
          "smoothness_worst","symmetry_worst","fractal_dimension_worst"],
};

// ── Sample data (real Wisconsin rows) ─────────────────────────────
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

// ── Formatting helper ─────────────────────────────────────────────
function fmtChip(val) {
  if (val === null || val === undefined) return "—";
  const n = Math.abs(val);
  if (n >= 1000) return val.toFixed(0);
  if (n >= 100)  return val.toFixed(1);
  if (n >= 10)   return val.toFixed(2);
  return val.toFixed(4);
}

const GROUP_META = {
  mean:  { label: "Mean Values",                emoji: "📐",
           desc:  "Average values across all cell nuclei in the biopsy image" },
  se:    { label: "Standard Error (SE) Values", emoji: "📊",
           desc:  "Variability / spread of measurements across cells" },
  worst: { label: "Worst (Largest) Values",     emoji: "🔬",
           desc:  "Mean of the 3 largest values — represents worst-case cells" },
};

// ═════════════════════════════════════════════════════════════════
export default function Form({ onResult, onLoading }) {
  const [values,    setValues]    = useState({});
  const [errors,    setErrors]    = useState({});
  const [tooltip,   setTooltip]   = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState(null);
  const fileRef = useRef(null);

  // ── Live derived values ────────────────────────────────────────
  const getV    = (id) => parseFloat(values[id]);
  const derived = deriveAll(getV);

  // ── Merge all 30 values (14 input + 16 derived) ───────────────
  function allValues() {
    const merged = { ...derived };
    ALL_INPUT_IDS.forEach((id) => { merged[id] = parseFloat(values[id]); });
    return merged;
  }

  // ── Handlers ──────────────────────────────────────────────────
  function handleChange(id, val) {
    setValues((p) => ({ ...p, [id]: val }));
    if (errors[id]) setErrors((p) => ({ ...p, [id]: false }));
  }

  function loadSample(type) {
    setValues(
      Object.fromEntries(
        Object.entries(SAMPLES[type]).map(([k, v]) => [k, String(v)])
      )
    );
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
    if (!ok) window.scrollTo({ top: 0, behavior: "smooth" });
    return ok;
  }

  // ── Submit → predict ──────────────────────────────────────────
  async function handleSubmit() {
    if (!validate()) return;

    const merged   = allValues();
    const features = MODEL_ORDER.map((id) => {
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
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Server error ${res.status}`);
      }
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      data.inputValues = merged;   // attach for report + chips
      onResult(data);
    } catch (err) {
      onResult({ error: err.message });
    } finally {
      setLoading(false);
      onLoading(false);
    }
  }

  // ── File upload → extract → autofill ─────────────────────────
  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    setUploading(true);
    setUploadMsg({ type: "info", text: `📂 Reading "${file.name}"…` });

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res  = await fetch("http://localhost:8000/extract", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Extraction failed");

      const extracted = data.values || {};
      const newVals   = {};
      ALL_INPUT_IDS.forEach((id) => {
        if (extracted[id] !== undefined) newVals[id] = String(extracted[id]);
      });

      if (Object.keys(newVals).length === 0) {
        setUploadMsg({
          type: "warn",
          text: "⚠️ No matching measurements found. Try a clearer scan or fill in manually.",
        });
      } else {
        setValues((prev) => ({ ...prev, ...newVals }));
        setErrors({});
        const n = Object.keys(newVals).length;
        setUploadMsg({
          type: "success",
          text: `✅ Auto-filled ${n} field${n !== 1 ? "s" : ""} from your report. Please verify before predicting.`,
        });
      }
    } catch (err) {
      setUploadMsg({ type: "error", text: `❌ Upload failed: ${err.message}` });
    } finally {
      setUploading(false);
    }
  }

  // ── Progress ──────────────────────────────────────────────────
  const filledCount = ALL_INPUT_IDS.filter((id) => !isNaN(parseFloat(values[id]))).length;
  const progress    = Math.round((filledCount / ALL_INPUT_IDS.length) * 100);

  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="form-panel">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="form-panel-header">
        <div>
          <h3>Clinical Measurements</h3>
          <p>
            Enter <strong>{ALL_INPUT_IDS.length} core values</strong> ·{" "}
            <span style={{ color: "#6366f1" }}>
              {Object.keys(derived).length} fields auto-calculated
            </span>
          </p>
        </div>
        <div className="sample-btns">
          <button className="sample-btn benign"    onClick={() => loadSample("benign")}>
            ✅ Benign Sample
          </button>
          <button className="sample-btn malignant" onClick={() => loadSample("malignant")}>
            ⚠️ Malignant Sample
          </button>
        </div>
      </div>

      {/* ── Upload zone ────────────────────────────────────────── */}
      <div
        className="upload-zone"
        onClick={() => !uploading && fileRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && !uploading && fileRef.current?.click()}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.txt"
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
              <span>PDF · JPG · PNG · TXT — Gemini AI auto-fills the fields</span>
            </div>
          </div>
        )}
      </div>

      {uploadMsg && (
        <div className={`upload-msg upload-msg-${uploadMsg.type}`}>
          <span>{uploadMsg.text}</span>
          <button className="upload-msg-close" onClick={() => setUploadMsg(null)}>×</button>
        </div>
      )}

      {/* ── Progress bar ───────────────────────────────────────── */}
      <div className="form-progress">
        <div className="form-progress-bar-track">
          <div className="form-progress-bar-fill" style={{ width: `${progress}%` }} />
        </div>
        <span className="form-progress-label">{filledCount} / {ALL_INPUT_IDS.length} filled</span>
      </div>

      {/* ── Field groups ───────────────────────────────────────── */}
      <div className="form-body">
        {(["mean", "se", "worst"]).map((grp) => {
          const fields  = INPUT_FIELDS.filter((f) => f.group === grp);
          const meta    = GROUP_META[grp];
          const chipIds = DERIVED_BY_GROUP[grp];

          return (
            <div key={grp}>
              {/* Group header */}
              <div className="form-group-title">
                <span>{meta.emoji}</span>
                <div>
                  <span>{meta.label}</span>
                  <span className="form-group-desc">{meta.desc}</span>
                </div>
              </div>

              {/* Input grid */}
              <div className="form-grid">
                {fields.map((field) => (
                  <div className="field" key={field.id}>
                    <label htmlFor={field.id}>
                      {field.label}
                      {field.unit && (
                        <span className="field-unit"> ({field.unit})</span>
                      )}
                    </label>
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
              <div className="derived-group">
                <div className="derived-label">
                  ⚡ Auto-calculated from above
                </div>
                <div className="derived-chips">
                  {chipIds.map((id) => {
                    const val = derived[id];
                    const name = id
                      .replace(/_mean$|_se$|_worst$/, "")
                      .replace(/_/g, " ");
                    return (
                      <div
                        className={`derived-chip ${val === null ? "derived-chip-empty" : ""}`}
                        key={id}
                        title={`${id} = ${val ?? "needs input"}`}
                      >
                        <span className="derived-chip-name">{name}</span>
                        <span className="derived-chip-val">
                          {fmtChip(val)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Footer actions ─────────────────────────────────────── */}
      <div className="form-footer">
        <button
          className="btn-predict"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <><span className="btn-spinner" />Analyzing…</>
          ) : (
            <>🔬 Analyze &amp; Predict</>
          )}
        </button>
        <button className="btn-clear" onClick={clearForm} disabled={loading}>
          Clear
        </button>
      </div>
    </div>
  );
}