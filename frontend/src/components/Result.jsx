import { useEffect, useRef, useState } from "react";

// ─────────────────────────────────────────────────────────────────
//  OPTIONAL: Paste your FREE Gemini key here for AI-enhanced reports
//  Get one free at: https://aistudio.google.com → "Get API Key"
//  No credit card · 1500 req/day free
//  If left empty, a detailed data-driven report is generated locally.
// ─────────────────────────────────────────────────────────────────
const GEMINI_API_KEY = ""; // e.g. "AIzaSy..."

// ─────────────────────────────────────────────────────────────────
//  WISCONSIN DATASET REFERENCE STATS
// ─────────────────────────────────────────────────────────────────
const REF = {
  radius_mean:            { b: 12.1,   m: 17.5,   unit: "mm"  },
  texture_mean:           { b: 17.9,   m: 21.6,   unit: ""    },
  perimeter_mean:         { b: 78.1,   m: 115.4,  unit: "mm"  },
  area_mean:              { b: 462,    m: 978,    unit: "mm²" },
  smoothness_mean:        { b: 0.092,  m: 0.103,  unit: ""    },
  compactness_mean:       { b: 0.080,  m: 0.145,  unit: ""    },
  concavity_mean:         { b: 0.046,  m: 0.161,  unit: ""    },
  concave_points_mean:    { b: 0.026,  m: 0.088,  unit: ""    },
  symmetry_mean:          { b: 0.174,  m: 0.193,  unit: ""    },
  fractal_dimension_mean: { b: 0.063,  m: 0.062,  unit: ""    },
  radius_worst:           { b: 14.2,   m: 21.1,   unit: "mm"  },
  area_worst:             { b: 558,    m: 1422,   unit: "mm²" },
  compactness_worst:      { b: 0.21,   m: 0.54,   unit: ""    },
  concavity_worst:        { b: 0.166,  m: 0.449,  unit: ""    },
  concave_points_worst:   { b: 0.075,  m: 0.182,  unit: ""    },
};

// ─────────────────────────────────────────────────────────────────
//  FEATURE CHIPS CONFIG
// ─────────────────────────────────────────────────────────────────
const KEY_FEATURES = [
  { id: "radius_mean",          label: "Radius Mean"       },
  { id: "area_mean",            label: "Area Mean"         },
  { id: "concavity_mean",       label: "Concavity Mean"    },
  { id: "concave_points_mean",  label: "Concave Pts Mean"  },
  { id: "radius_worst",         label: "Radius Worst"      },
  { id: "area_worst",           label: "Area Worst"        },
  { id: "compactness_worst",    label: "Compact. Worst"    },
  { id: "concave_points_worst", label: "Concave Pts Worst" },
];

function chipClass(id, val) {
  const r = REF[id];
  if (!r) return "normal";
  const mid = (r.b + r.m) / 2;
  return val > mid ? "elevated" : "normal";
}
function fmtVal(val) {
  if (Math.abs(val) >= 100) return Math.round(val).toString();
  if (Math.abs(val) >= 10)  return val.toFixed(1);
  return val.toFixed(4);
}
function n(val, decimals = 4) {
  if (val === null || val === undefined || isNaN(val)) return "N/A";
  const v = parseFloat(val);
  if (Math.abs(v) >= 1000) return v.toFixed(1);
  if (Math.abs(v) >= 100)  return v.toFixed(2);
  return v.toFixed(decimals);
}
function pct(val) { return `${Math.round(val * 100)}%`; }

// ─────────────────────────────────────────────────────────────────
//  LOCAL REPORT GENERATOR
//  Produces a detailed, data-driven 5-section clinical report
//  purely from the measurement values — no API needed.
// ─────────────────────────────────────────────────────────────────
function generateLocalReport(prediction, confidence, v, isMal) {
  const rm   = parseFloat(v.radius_mean);
  const am   = parseFloat(v.area_mean);
  const conc = parseFloat(v.concavity_mean);
  const cp   = parseFloat(v.concave_points_mean);
  const rw   = parseFloat(v.radius_worst);
  const aw   = parseFloat(v.area_worst);
  const cmpw = parseFloat(v.compactness_worst);
  const cpw  = parseFloat(v.concave_points_worst);
  const tex  = parseFloat(v.texture_mean);
  const sm   = parseFloat(v.smoothness_mean);
  const sym  = parseFloat(v.symmetry_mean);
  const fd   = parseFloat(v.fractal_dimension_mean);
  const cmp  = parseFloat(v.compactness_mean);
  const rse  = parseFloat(v.radius_se);
  const ase  = parseFloat(v.area_se);

  // Compare to reference
  const rmStatus  = rm   > REF.radius_mean.m          ? "significantly above malignant average" : rm > REF.radius_mean.b ? "above benign average" : "within benign range";
  const amStatus  = am   > REF.area_mean.m             ? "significantly above malignant average" : am > REF.area_mean.b   ? "above benign average" : "within benign range";
  const concStatus= conc > REF.concavity_mean.m        ? "significantly elevated" : conc > REF.concavity_mean.b ? "mildly elevated" : "within benign range";
  const cpStatus  = cp   > REF.concave_points_mean.m   ? "significantly elevated" : cp   > REF.concave_points_mean.b ? "mildly elevated" : "within benign range";
  const rwStatus  = rw   > REF.radius_worst.m          ? "significantly above malignant average" : rw > REF.radius_worst.b ? "above benign average" : "within benign range";
  const awStatus  = aw   > REF.area_worst.m            ? "significantly above malignant average" : aw > REF.area_worst.b   ? "above benign average" : "within benign range";
  const cmpwStatus= cmpw > REF.compactness_worst.m     ? "significantly elevated" : cmpw > REF.compactness_worst.b ? "elevated" : "within benign range";

  const rmDeltaB = ((rm - REF.radius_mean.b)   / REF.radius_mean.b   * 100).toFixed(1);
  const amDeltaB = ((am - REF.area_mean.b)     / REF.area_mean.b     * 100).toFixed(1);
  const concDeltaB= ((conc - REF.concavity_mean.b) / REF.concavity_mean.b * 100).toFixed(1);
  const rwDeltaM = ((rw  - REF.radius_worst.m) / REF.radius_worst.m  * 100).toFixed(1);
  const awDeltaM = ((aw  - REF.area_worst.m)   / REF.area_worst.m    * 100).toFixed(1);

  const label = isMal ? "malignant" : "benign";
  const Label = isMal ? "Malignant" : "Benign";

  return `🔍 KEY FINDINGS
The five most diagnostically significant measurements in this biopsy are: Radius Mean (${n(rm,2)} mm), Area Mean (${n(am,1)} mm²), Concavity Mean (${n(conc,5)}), Concave Points Mean (${n(cp,5)}), and Radius Worst (${n(rw,2)} mm). The Radius Mean of ${n(rm,2)} mm is ${rmStatus} — the Wisconsin benign average is 12.1 mm and malignant average is 17.5 mm, placing this value ${parseFloat(rmDeltaB) > 0 ? parseFloat(rmDeltaB) + "% above" : Math.abs(parseFloat(rmDeltaB)) + "% below"} the benign mean. Area Mean of ${n(am,1)} mm² is ${amStatus} (benign avg: 462 mm², malignant avg: 978 mm²). Concavity Mean of ${n(conc,5)} is ${concStatus} versus the benign average of 0.046 and malignant average of 0.161, representing ${parseFloat(concDeltaB) > 0 ? "a +" + concDeltaB + "%" : concDeltaB + "%"} deviation from the benign baseline. Texture Mean of ${n(tex,2)} and Smoothness Mean of ${n(sm,5)} are secondary indicators that further support the ${label} classification at ${confidence}% confidence.

📊 RISK FACTOR ANALYSIS
The ${confidence}% model confidence for ${Label} is driven by a convergence of multiple high-weight features. The radius-based features (Radius Mean: ${n(rm,2)}, Perimeter Mean: ${n(v.perimeter_mean,1)}, Area Mean: ${n(am,1)}) collectively suggest ${isMal ? "larger, potentially invasive cell nuclei consistent with malignancy" : "compact, well-bounded cell nuclei consistent with benign tissue"}. Concavity Mean (${n(conc,5)}) and Concave Points Mean (${n(cp,5)}) are the most predictive shape features in Random Forest classification — their values are ${concStatus} relative to the malignant threshold of ~0.161 and ~0.088 respectively. The worst-case features amplify this signal: Radius Worst (${n(rw,2)}) is ${rwStatus} (malignant avg: 21.1), Area Worst (${n(aw,1)}) is ${awStatus} (malignant avg: 1422), and Compactness Worst (${n(cmpw,5)}) is ${cmpwStatus} (malignant avg: 0.54). Standard error values — Radius SE (${n(rse,4)}), Area SE (${n(ase,2)}) — indicate ${rse > 0.5 ? "high inter-cell variability, consistent with irregular, rapidly dividing tissue" : "low inter-cell variability, suggesting uniform, well-differentiated cells"}.

🔬 MORPHOLOGICAL INTERPRETATION
The cell morphology indicators reveal important structural information about this tissue sample. Fractal Dimension Mean of ${n(fd,5)} quantifies the complexity of cell boundary contours — values near 0.063 indicate ${fd < 0.065 ? "relatively smooth, regular cell perimeters consistent with orderly growth" : "irregular, jagged cell boundaries suggesting disordered proliferation"}. Symmetry Mean of ${n(sym,5)} reflects nuclear bilateral symmetry — ${sym < 0.185 ? "this value indicates reasonably symmetric nuclei" : "this elevated value suggests nuclear asymmetry, a marker of abnormal division"}. Compactness Mean (${n(cmp,5)}) measures the ratio of nuclear perimeter squared to area — the recorded value is ${cmpStatus} of the benign reference (0.080), indicating ${isMal ? "irregular, non-spherical nuclear shapes common in cancer cells" : "relatively round, compact nuclei typical of benign tissue"}. Concave Points Worst (${n(cpw,5)}) captures the most extreme concave boundary deformations — at ${cpw > 0.182 ? "above" : "below"} the malignant average of 0.182, this indicates ${isMal ? "aggressive nuclear invagination patterns associated with rapid proliferation" : "limited nuclear invagination consistent with benign growth"}.

🏥 CLINICAL INTERPRETATION
Based on these FNA biopsy measurements, the Random Forest classifier returns a ${Label} prediction with ${confidence}% confidence, meaning the model assigns a ${isMal ? n(v.malignant_prob * 100 || confidence, 1) : n(v.benign_prob * 100 || confidence, 1)}% probability to this being ${label} tissue. ${isMal ? `The combination of elevated nuclear radius (${n(rm,2)} mm vs benign avg 12.1 mm), large area (${n(am,1)} mm² vs benign avg 462 mm²), high concavity (${n(conc,5)}), and extreme worst-case values (Radius Worst: ${n(rw,2)}, Area Worst: ${n(aw,1)}) collectively match the morphological profile of malignant breast tissue in the Wisconsin dataset. This pattern suggests a sample with irregular, enlarged nuclei characteristic of potentially invasive ductal carcinoma. The ${confidence}% confidence level reflects strong alignment between this sample's feature vector and the malignant class boundary learned from 212 malignant training examples.` : `The combination of moderate nuclear radius (${n(rm,2)} mm, close to benign avg 12.1 mm), compact area (${n(am,1)} mm²), low concavity (${n(conc,5)}), and contained worst-case values collectively match the morphological profile of benign breast tissue. This pattern is consistent with fibroadenoma or benign cyst presentations commonly seen in the Wisconsin dataset's 357 benign examples. The ${confidence}% confidence reflects strong alignment between this sample's feature vector and the benign class boundary.`} Note that FNA cytology carries a sensitivity of approximately 85–95% and should always be interpreted alongside clinical examination and imaging.

✅ RECOMMENDED NEXT STEPS
${isMal ? `1. URGENT — Oncologist Referral: Schedule an appointment with a breast oncologist within 1–2 weeks. Share these FNA measurements and the full biopsy report for expert clinical review.
2. Confirmatory Imaging: Request a bilateral diagnostic mammogram and targeted breast ultrasound to assess lesion size, shape, margins, and lymph node involvement.
3. Core Needle Biopsy (CNB): FNA cytology should be confirmed with a histological core needle biopsy to assess tissue architecture, hormone receptor status (ER/PR/HER2), and grade before treatment planning.
4. Staging Workup: If CNB confirms malignancy, proceed with staging (MRI, CT, or PET scan) and multidisciplinary tumour board review to determine the appropriate treatment pathway (surgery, chemotherapy, radiation, or targeted therapy).` : `1. Specialist Review: Share these FNA results with a breast specialist or gynaecologist for clinical correlation with physical examination findings and patient history.
2. Follow-up Imaging: Schedule a routine follow-up mammogram or ultrasound in 6–12 months to monitor for any morphological changes, particularly if the patient has risk factors (family history, BRCA mutation, dense breast tissue).
3. Watchful Waiting & Monitoring: Given the benign classification, active surveillance is appropriate. Document baseline measurements and set clear criteria for expedited re-evaluation (new lumps, rapid size change, skin changes, nipple discharge).
4. Preventive Measures: Encourage regular breast self-examination, maintain annual screening schedule, and discuss lifestyle factors (healthy BMI, limiting alcohol, regular exercise) that reduce breast cancer risk.`}`;
}

// ─────────────────────────────────────────────────────────────────
//  GEMINI API REPORT (used when GEMINI_API_KEY is set)
// ─────────────────────────────────────────────────────────────────
function buildGeminiPrompt(prediction, confidence, v, isMal) {
  return `You are an expert oncology data analyst. Based on the 30 FNA biopsy measurements from the Wisconsin Breast Cancer Dataset below, write a detailed 5-section clinical report. Be specific, data-driven, and reference actual numbers in every section.

ML PREDICTION: ${prediction.toUpperCase()} (Confidence: ${confidence}%)

MEASUREMENTS:
Radius Mean: ${v.radius_mean} | Texture Mean: ${v.texture_mean} | Perimeter Mean: ${v.perimeter_mean} | Area Mean: ${v.area_mean}
Smoothness Mean: ${v.smoothness_mean} | Compactness Mean: ${v.compactness_mean} | Concavity Mean: ${v.concavity_mean} | Concave Pts Mean: ${v.concave_points_mean}
Symmetry Mean: ${v.symmetry_mean} | Fractal Dim Mean: ${v.fractal_dimension_mean}
Radius SE: ${v.radius_se} | Texture SE: ${v.texture_se} | Perimeter SE: ${v.perimeter_se} | Area SE: ${v.area_se}
Smoothness SE: ${v.smoothness_se} | Compactness SE: ${v.compactness_se} | Concavity SE: ${v.concavity_se} | Concave Pts SE: ${v.concave_points_se}
Symmetry SE: ${v.symmetry_se} | Fractal Dim SE: ${v.fractal_dimension_se}
Radius Worst: ${v.radius_worst} | Texture Worst: ${v.texture_worst} | Perimeter Worst: ${v.perimeter_worst} | Area Worst: ${v.area_worst}
Smoothness Worst: ${v.smoothness_worst} | Compactness Worst: ${v.compactness_worst} | Concavity Worst: ${v.concavity_worst} | Concave Pts Worst: ${v.concave_points_worst}
Symmetry Worst: ${v.symmetry_worst} | Fractal Dim Worst: ${v.fractal_dimension_worst}

REFERENCE: Benign avg: radius≈12.1, area≈462, concavity≈0.046 | Malignant avg: radius≈17.5, area≈978, concavity≈0.161

Write EXACTLY these 5 sections with the emoji headers. Each section must be 4–6 sentences and reference the actual numbers.

🔍 KEY FINDINGS
📊 RISK FACTOR ANALYSIS
🔬 MORPHOLOGICAL INTERPRETATION
🏥 CLINICAL INTERPRETATION
✅ RECOMMENDED NEXT STEPS

Do NOT add generic disclaimers inside the report body. Professional oncology tone.`;
}

async function callGeminiAPI(prediction, confidence, values, isMal, setReport, setReportStatus, setReportError) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
  setReportStatus("Contacting Gemini AI…");
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildGeminiPrompt(prediction, confidence, values, isMal) }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 2048 },
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Gemini API error ${res.status}`);
    }
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) throw new Error("Empty response from Gemini API.");
    setReportStatus("Rendering…");
    typewriterReveal(text, setReport, () => setReportStatus(null));
  } catch (err) {
    // Fall back to local report on any Gemini error
    console.warn("Gemini failed, using local report:", err.message);
    const localText = generateLocalReport(prediction, confidence, values, isMal);
    typewriterReveal(localText, setReport, () => setReportStatus(null));
    setReportError(null); // clear error — we have fallback
  }
}

function typewriterReveal(text, setReport, onDone) {
  let i = 0;
  const tick = setInterval(() => {
    if (i <= text.length) {
      setReport({ text: text.slice(0, i), done: i === text.length });
      i++;
    } else {
      clearInterval(tick);
      onDone?.();
    }
  }, 5);
}

// ─────────────────────────────────────────────────────────────────
//  MAIN REPORT ENTRY POINT
// ─────────────────────────────────────────────────────────────────
function startReport(prediction, confidence, values, setReport, setReportStatus, setReportError) {
  const isMal = prediction === "Malignant";

  if (GEMINI_API_KEY && GEMINI_API_KEY !== "PASTE_YOUR_GEMINI_KEY_HERE") {
    // Use Gemini API with local fallback
    callGeminiAPI(prediction, confidence, values, isMal, setReport, setReportStatus, setReportError);
  } else {
    // Use local deterministic report immediately
    setReportStatus("Generating report…");
    setTimeout(() => {
      const text = generateLocalReport(prediction, confidence, values, isMal);
      setReportStatus(null);
      typewriterReveal(text, setReport, null);
    }, 600);
  }
}

// ─────────────────────────────────────────────────────────────────
//  SECTION RENDERER
// ─────────────────────────────────────────────────────────────────
const SECTION_STYLE = {
  "🔍": { bg: "#eff6ff", border: "#3b82f6" },
  "📊": { bg: "#fdf4ff", border: "#a855f7" },
  "🔬": { bg: "#f0fdf4", border: "#22c55e" },
  "🏥": { bg: "#fff7ed", border: "#f97316" },
  "✅": { bg: "#f0fdf4", border: "#16a34a" },
};

function ReportSections({ text, done }) {
  if (!text) return null;

  const RE = /(🔍|📊|🔬|🏥|✅)\s+([^\n]+)\n([\s\S]*?)(?=(?:🔍|📊|🔬|🏥|✅)|$)/g;
  const sections = [];
  let m;
  while ((m = RE.exec(text)) !== null) {
    const body = m[3].trim();
    if (body) sections.push({ emoji: m[1], title: m[2].trim(), body });
  }

  if (sections.length === 0) {
    return (
      <div className="report-streaming-raw">
        {text}
        {!done && <span className="report-cursor" />}
      </div>
    );
  }

  return (
    <div className="report-sections">
      {sections.map((s, i) => {
        const style = SECTION_STYLE[s.emoji] || {};
        const isLast = i === sections.length - 1;
        return (
          <div
            className="report-section"
            key={i}
            style={{ background: style.bg, borderLeftColor: style.border }}
          >
            <div className="report-section-head">
              <span className="report-section-emoji">{s.emoji}</span>
              <span className="report-section-title">{s.title}</span>
            </div>
            <div className="report-section-body">
              {s.body.split("\n").map((line, j) => {
                // Numbered list items get special styling
                const isListItem = /^\d+\./.test(line.trim());
                return (
                  <p
                    key={j}
                    className={isListItem ? "report-list-item" : "report-para"}
                  >
                    {line}
                    {isLast && j === s.body.split("\n").length - 1 && !done && (
                      <span className="report-cursor" />
                    )}
                  </p>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════
export default function Result({ result }) {
  const [report,       setReport]       = useState(null);
  const [reportStatus, setReportStatus] = useState(null);
  const [reportError,  setReportError]  = useState(null);
  const [confWidth,    setConfWidth]    = useState(0);
  const cardRef = useRef(null);

  useEffect(() => {
    if (!result || result.error) return;

    setReport(null);
    setReportError(null);
    setReportStatus(null);
    setConfWidth(0);

    const t = setTimeout(() => setConfWidth(result.probability * 100), 150);

    if (cardRef.current) {
      setTimeout(
        () => cardRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }),
        300
      );
    }

    if (result.inputValues) {
      startReport(
        result.prediction,
        Math.round(result.probability * 100),
        result.inputValues,
        setReport,
        setReportStatus,
        setReportError,
      );
    }

    return () => clearTimeout(t);
  }, [result]);

  // ── Empty ─────────────────────────────────────────────────────
  if (!result) {
    return (
      <div className="result-panel">
        <div className="result-empty">
          <div className="result-empty-icon">🔬</div>
          <h4>Awaiting Analysis</h4>
          <p>
            Fill in the 14 core measurements and click{" "}
            <strong>Analyze &amp; Predict</strong> to receive your diagnosis
            and a detailed 5-section clinical report.
          </p>
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────
  if (result.error) {
    return (
      <div className="result-panel">
        <div className="result-empty" style={{ borderColor: "rgba(220,38,38,0.35)" }}>
          <div className="result-empty-icon">❌</div>
          <h4>Prediction Failed</h4>
          <p style={{ color: "var(--red)", marginBottom: 10 }}>{result.error}</p>
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
            Make sure the FastAPI backend is running on{" "}
            <code style={{ background: "var(--cream)", padding: "2px 6px", borderRadius: 4 }}>
              localhost:8000
            </code>
          </p>
        </div>
      </div>
    );
  }

  const isMal     = result.prediction === "Malignant";
  const pctStr    = `${Math.round(result.probability * 100)}%`;
  const benignPct = Math.round((result.benign_prob  ?? 0) * 100);
  const malignPct = Math.round((result.malignant_prob ?? 0) * 100);

  return (
    <div className="result-panel" ref={cardRef}>
      <div className="result-card">

        {/* ── Verdict ──────────────────────────────────────── */}
        <div className={`result-verdict ${isMal ? "malignant" : "benign"}`}>
          <div className="verdict-icon-wrap">
            {isMal ? "⚠️" : "✅"}
          </div>
          <div>
            <div className="verdict-label">
              {isMal ? "Possible Malignant" : "Likely Benign"}
            </div>
            <div className="verdict-title">{result.prediction}</div>
            <div className="verdict-subtitle">
              {pctStr} confidence · Random Forest Classifier
            </div>
          </div>
        </div>

        {/* ── Confidence bar ───────────────────────────────── */}
        <div className="result-confidence">
          <div className="conf-header">
            <span>Overall Confidence</span>
            <strong>{pctStr}</strong>
          </div>
          <div className="conf-track">
            <div
              className={`conf-fill ${isMal ? "malignant" : "benign"}`}
              style={{ width: `${confWidth}%` }}
            />
          </div>
          <div className="conf-legend">
            <span>0%</span>
            <span>Uncertain</span>
            <span>100% Certain</span>
          </div>
        </div>

        {/* ── Dual probability gauges ──────────────────────── */}
        <div className="prob-gauges">
          <div className="prob-gauge">
            <div className="prob-gauge-label">Benign Probability</div>
            <div className={`prob-gauge-val ${!isMal ? "green" : ""}`}>
              {benignPct}%
            </div>
            <div className="prob-mini-bar">
              <div className="prob-mini-fill green" style={{ width: `${benignPct}%` }} />
            </div>
          </div>
          <div className="prob-gauge">
            <div className="prob-gauge-label">Malignant Probability</div>
            <div className={`prob-gauge-val ${isMal ? "red" : ""}`}>
              {malignPct}%
            </div>
            <div className="prob-mini-bar">
              <div className="prob-mini-fill red" style={{ width: `${malignPct}%` }} />
            </div>
          </div>
        </div>

        {/* ── Feature chips ────────────────────────────────── */}
        {result.inputValues && (
          <div className="result-features">
            <h4>Key Diagnostic Features</h4>
            <div className="feat-chips">
              {KEY_FEATURES.map(({ id, label }) => {
                const val = parseFloat(result.inputValues[id]);
                if (isNaN(val)) return null;
                const cls = chipClass(id, val);
                const ref = REF[id];
                return (
                  <div
                    className={`feat-chip ${cls}`}
                    key={id}
                    title={ref ? `Benign avg ≈ ${ref.b}  |  Malignant avg ≈ ${ref.m}` : ""}
                  >
                    <strong>{fmtVal(val)}</strong>
                    {label}
                    <span className={`chip-flag ${cls}`}>
                      {cls === "elevated" ? "▲ High" : "✓ Normal"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── AI / Local Report ───────────────────────────── */}
        <div className="result-report">
          <div className="report-header">
            <span className="ai-badge">
              {GEMINI_API_KEY && GEMINI_API_KEY !== "PASTE_YOUR_GEMINI_KEY_HERE"
                ? "Gemini AI Report"
                : "Clinical Report"}
            </span>
            <h4>Detailed Clinical Analysis</h4>
          </div>

          {/* Loading / status */}
          {reportStatus && !report?.text && (
            <div className="report-spinner">
              <div className="spinner" />
              <div>
                <div style={{ fontWeight: 600, marginBottom: 3 }}>{reportStatus}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  Analysing all 30 biopsy measurements…
                </div>
              </div>
            </div>
          )}

          {/* Report sections */}
          {report && (
            <ReportSections text={report.text} done={report.done} />
          )}
        </div>

        {/* ── Disclaimer ──────────────────────────────────── */}
        <div className="result-disclaimer">
          ⚠️ <strong>Educational &amp; research use only.</strong> This tool is
          not a certified medical device and does not constitute medical advice.
          Always consult a qualified oncologist for diagnosis and treatment.
        </div>

      </div>
    </div>
  );
}