import { useState, useEffect } from "react";

// ── Feature definitions with typical ranges for contextual help ──
const FEATURE_GROUPS = [
  {
    label: "Mean Values",
    emoji: "📐",
    fields: [
      { id: "radius_mean",            label: "Radius Mean",             placeholder: "e.g. 14.1",    hint: "Benign ≈ 12.1  |  Malignant ≈ 17.5" },
      { id: "texture_mean",           label: "Texture Mean",            placeholder: "e.g. 19.3",    hint: "Benign ≈ 17.9  |  Malignant ≈ 21.6" },
      { id: "perimeter_mean",         label: "Perimeter Mean",          placeholder: "e.g. 91.9",    hint: "Benign ≈ 78.1  |  Malignant ≈ 115.4" },
      { id: "area_mean",              label: "Area Mean",               placeholder: "e.g. 655",     hint: "Benign ≈ 462   |  Malignant ≈ 978" },
      { id: "smoothness_mean",        label: "Smoothness Mean",         placeholder: "e.g. 0.096",   hint: "Range: 0.05 – 0.16" },
      { id: "compactness_mean",       label: "Compactness Mean",        placeholder: "e.g. 0.104",   hint: "Range: 0.02 – 0.35" },
      { id: "concavity_mean",         label: "Concavity Mean",          placeholder: "e.g. 0.089",   hint: "Benign ≈ 0.046 |  Malignant ≈ 0.161" },
      { id: "concave_points_mean",    label: "Concave Points Mean",     placeholder: "e.g. 0.049",   hint: "Benign ≈ 0.026 |  Malignant ≈ 0.088" },
      { id: "symmetry_mean",          label: "Symmetry Mean",           placeholder: "e.g. 0.181",   hint: "Range: 0.11 – 0.30" },
      { id: "fractal_dimension_mean", label: "Fractal Dimension Mean",  placeholder: "e.g. 0.063",   hint: "Range: 0.05 – 0.10" },
    ],
  },
  {
    label: "Standard Error (SE) Values",
    emoji: "📊",
    fields: [
      { id: "radius_se",              label: "Radius SE",               placeholder: "e.g. 0.405",   hint: "Range: 0.11 – 2.87" },
      { id: "texture_se",             label: "Texture SE",              placeholder: "e.g. 1.217",   hint: "Range: 0.36 – 4.88" },
      { id: "perimeter_se",           label: "Perimeter SE",            placeholder: "e.g. 2.866",   hint: "Range: 0.76 – 21.9" },
      { id: "area_se",                label: "Area SE",                 placeholder: "e.g. 40.3",    hint: "Range: 6.8 – 542" },
      { id: "smoothness_se",          label: "Smoothness SE",           placeholder: "e.g. 0.007",   hint: "Range: 0.002 – 0.031" },
      { id: "compactness_se",         label: "Compactness SE",          placeholder: "e.g. 0.025",   hint: "Range: 0.002 – 0.135" },
      { id: "concavity_se",           label: "Concavity SE",            placeholder: "e.g. 0.032",   hint: "Range: 0.000 – 0.396" },
      { id: "concave_points_se",      label: "Concave Points SE",       placeholder: "e.g. 0.012",   hint: "Range: 0.000 – 0.053" },
      { id: "symmetry_se",            label: "Symmetry SE",             placeholder: "e.g. 0.020",   hint: "Range: 0.008 – 0.079" },
      { id: "fractal_dimension_se",   label: "Fractal Dimension SE",    placeholder: "e.g. 0.004",   hint: "Range: 0.001 – 0.030" },
    ],
  },
  {
    label: "Worst (Largest) Values",
    emoji: "🔬",
    fields: [
      { id: "radius_worst",           label: "Radius Worst",            placeholder: "e.g. 16.3",    hint: "Benign ≈ 14.2  |  Malignant ≈ 21.1" },
      { id: "texture_worst",          label: "Texture Worst",           placeholder: "e.g. 25.7",    hint: "Benign ≈ 23.5  |  Malignant ≈ 29.3" },
      { id: "perimeter_worst",        label: "Perimeter Worst",         placeholder: "e.g. 107.3",   hint: "Benign ≈ 92.0  |  Malignant ≈ 141.4" },
      { id: "area_worst",             label: "Area Worst",              placeholder: "e.g. 880",     hint: "Benign ≈ 558   |  Malignant ≈ 1422" },
      { id: "smoothness_worst",       label: "Smoothness Worst",        placeholder: "e.g. 0.132",   hint: "Range: 0.07 – 0.22" },
      { id: "compactness_worst",      label: "Compactness Worst",       placeholder: "e.g. 0.254",   hint: "Range: 0.03 – 1.06" },
      { id: "concavity_worst",        label: "Concavity Worst",         placeholder: "e.g. 0.272",   hint: "Benign ≈ 0.166 |  Malignant ≈ 0.449" },
      { id: "concave_points_worst",   label: "Concave Points Worst",    placeholder: "e.g. 0.115",   hint: "Benign ≈ 0.075 |  Malignant ≈ 0.182" },
      { id: "symmetry_worst",         label: "Symmetry Worst",          placeholder: "e.g. 0.290",   hint: "Range: 0.16 – 0.66" },
      { id: "fractal_dimension_worst",label: "Fractal Dimension Worst", placeholder: "e.g. 0.084",   hint: "Range: 0.055 – 0.208" },
    ],
  },
];

const ALL_FIELDS = FEATURE_GROUPS.flatMap((g) => g.fields.map((f) => f.id));

// Samples from the Wisconsin dataset
const SAMPLES = {
  malignant: {
    radius_mean: 17.99, texture_mean: 10.38, perimeter_mean: 122.8, area_mean: 1001,
    smoothness_mean: 0.1184, compactness_mean: 0.2776, concavity_mean: 0.3001,
    concave_points_mean: 0.1471, symmetry_mean: 0.2419, fractal_dimension_mean: 0.07871,
    radius_se: 1.095, texture_se: 0.9053, perimeter_se: 8.589, area_se: 153.4,
    smoothness_se: 0.006399, compactness_se: 0.04904, concavity_se: 0.05373,
    concave_points_se: 0.01587, symmetry_se: 0.03003, fractal_dimension_se: 0.006193,
    radius_worst: 25.38, texture_worst: 17.33, perimeter_worst: 184.6, area_worst: 2019,
    smoothness_worst: 0.1622, compactness_worst: 0.6656, concavity_worst: 0.7119,
    concave_points_worst: 0.2654, symmetry_worst: 0.4601, fractal_dimension_worst: 0.1189,
  },
  benign: {
    radius_mean: 13.08, texture_mean: 15.71, perimeter_mean: 85.63, area_mean: 520,
    smoothness_mean: 0.1075, compactness_mean: 0.127, concavity_mean: 0.04568,
    concave_points_mean: 0.0311, symmetry_mean: 0.1967, fractal_dimension_mean: 0.06811,
    radius_se: 0.1852, texture_se: 0.7477, perimeter_se: 1.383, area_se: 14.67,
    smoothness_se: 0.004097, compactness_se: 0.01898, concavity_se: 0.01698,
    concave_points_se: 0.00628, symmetry_se: 0.01523, fractal_dimension_se: 0.002966,
    radius_worst: 14.5, texture_worst: 20.49, perimeter_worst: 96.09, area_worst: 630.5,
    smoothness_worst: 0.1312, compactness_worst: 0.2776, concavity_worst: 0.189,
    concave_points_worst: 0.07283, symmetry_worst: 0.3184, fractal_dimension_worst: 0.08183,
  },
};

export default function Form({ onResult, onLoading }) {
  const [values, setValues]   = useState({});
  const [errors, setErrors]   = useState({});
  const [tooltip, setTooltip] = useState(null);
  const [loading, setLoading] = useState(false);

  // Count filled fields for progress bar
  const filledCount = ALL_FIELDS.filter(
    (id) => values[id] !== undefined && values[id] !== ""
  ).length;
  const progress = Math.round((filledCount / ALL_FIELDS.length) * 100);

  function handleChange(id, val) {
    setValues((prev) => ({ ...prev, [id]: val }));
    if (errors[id]) setErrors((prev) => ({ ...prev, [id]: false }));
  }

  function loadSample(type) {
    setValues(SAMPLES[type]);
    setErrors({});
  }

  function clearForm() {
    setValues({});
    setErrors({});
    onResult(null);
  }

  function validate() {
    const newErrors = {};
    let valid = true;
    ALL_FIELDS.forEach((id) => {
      const v = parseFloat(values[id]);
      if (isNaN(v)) { newErrors[id] = true; valid = false; }
    });
    setErrors(newErrors);
    return valid;
  }

  async function handleSubmit() {
    if (!validate()) return;

    const features = ALL_FIELDS.map((id) => parseFloat(values[id]));
    setLoading(true);
    onLoading(true);
    onResult(null);

    try {
      const res = await fetch("http://localhost:8000/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ features }),
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Attach input values for report generation
      data.inputValues = { ...values };
      onResult(data);
    } catch (err) {
      onResult({ error: err.message });
    } finally {
      setLoading(false);
      onLoading(false);
    }
  }

  return (
    <div className="form-panel">
      {/* Header */}
      <div className="form-panel-header">
        <div>
          <h3>Clinical Measurements</h3>
          <p>All 30 FNA biopsy features · Wisconsin Breast Cancer Dataset</p>
        </div>
        <div className="sample-btns">
          <button className="sample-btn benign" onClick={() => loadSample("benign")}>
            ✅ Benign Sample
          </button>
          <button className="sample-btn malignant" onClick={() => loadSample("malignant")}>
            ⚠️ Malignant Sample
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="form-progress">
        <div className="form-progress-bar-track">
          <div
            className="form-progress-bar-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="form-progress-label">
          {filledCount}/{ALL_FIELDS.length} fields
        </span>
      </div>

      {/* Fields */}
      <div className="form-body">
        {FEATURE_GROUPS.map((group) => (
          <div key={group.label}>
            <div className="form-group-title">
              <span>{group.emoji}</span>
              {group.label}
            </div>
            <div className="form-grid">
              {group.fields.map((field) => (
                <div className="field" key={field.id}>
                  <label htmlFor={field.id}>{field.label}</label>
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
                    <span style={{
                      fontSize: "11px", color: "var(--text-muted)",
                      background: "var(--cream)", padding: "4px 8px",
                      borderRadius: "6px", border: "1px solid var(--border)",
                      marginTop: "2px",
                    }}>
                      {field.hint}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer actions */}
      <div className="form-footer">
        <button
          className="btn-predict"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="spinner" style={{
                width: 18, height: 18,
                border: "2px solid rgba(255,255,255,0.3)",
                borderTopColor: "white",
                borderRadius: "50%",
                display: "inline-block",
                animation: "spin 0.8s linear infinite",
              }} />
              Analyzing…
            </>
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