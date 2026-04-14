import { useEffect, useRef, useState } from "react";

// ── Key features to highlight in the result panel ──
const KEY_FEATURES = [
  { id: "radius_mean",          label: "Radius Mean",        benignAvg: 12.1,  malignantAvg: 17.5 },
  { id: "area_mean",            label: "Area Mean",          benignAvg: 462,   malignantAvg: 978 },
  { id: "concavity_mean",       label: "Concavity Mean",     benignAvg: 0.046, malignantAvg: 0.161 },
  { id: "concave_points_mean",  label: "Concave Pts Mean",   benignAvg: 0.026, malignantAvg: 0.088 },
  { id: "radius_worst",         label: "Radius Worst",       benignAvg: 14.2,  malignantAvg: 21.1 },
  { id: "area_worst",           label: "Area Worst",         benignAvg: 558,   malignantAvg: 1422 },
];

function classifyChip(val, benignAvg, malignantAvg) {
  const mid = (benignAvg + malignantAvg) / 2;
  return val > mid ? "elevated" : "normal";
}

function formatVal(val) {
  if (Math.abs(val) >= 100) return Math.round(val).toString();
  if (Math.abs(val) >= 10)  return val.toFixed(1);
  return val.toFixed(3);
}

// ── AI report generator via Anthropic API ──
async function generateReport(prediction, confidence, inputValues, setReport) {
  const isMalignant = prediction === "Malignant";

  const v = inputValues;
  const prompt = `You are an expert oncology data analyst. Based on the following 30 FNA (Fine Needle Aspiration) biopsy measurements from the Wisconsin Breast Cancer Dataset, write a concise 4-section clinical analysis report.

ML PREDICTION: ${prediction.toUpperCase()} (Confidence: ${confidence}%)

MEASUREMENTS:
Mean — Radius:${v.radius_mean}, Texture:${v.texture_mean}, Perimeter:${v.perimeter_mean}, Area:${v.area_mean}, Smoothness:${v.smoothness_mean}, Compactness:${v.compactness_mean}, Concavity:${v.concavity_mean}, Concave Points:${v.concave_points_mean}, Symmetry:${v.symmetry_mean}, Fractal Dim:${v.fractal_dimension_mean}
SE — Radius:${v.radius_se}, Texture:${v.texture_se}, Perimeter:${v.perimeter_se}, Area:${v.area_se}, Smoothness:${v.smoothness_se}, Compactness:${v.compactness_se}, Concavity:${v.concavity_se}, Concave Pts:${v.concave_points_se}, Symmetry:${v.symmetry_se}, Fractal Dim:${v.fractal_dimension_se}
Worst — Radius:${v.radius_worst}, Texture:${v.texture_worst}, Perimeter:${v.perimeter_worst}, Area:${v.area_worst}, Smoothness:${v.smoothness_worst}, Compactness:${v.compactness_worst}, Concavity:${v.concavity_worst}, Concave Pts:${v.concave_points_worst}, Symmetry:${v.symmetry_worst}, Fractal Dim:${v.fractal_dimension_worst}

Dataset reference averages:
• Benign:    radius_mean≈12.1, area_mean≈462,  concavity_mean≈0.046, radius_worst≈14.2, area_worst≈558
• Malignant: radius_mean≈17.5, area_mean≈978,  concavity_mean≈0.161, radius_worst≈21.1, area_worst≈1422

Write these 4 sections with the exact emoji headers:

🔍 KEY FINDINGS
Identify the 3-4 most diagnostically significant measurements. State whether each is within expected ${isMalignant ? "malignant" : "benign"} range and how they compare to dataset averages.

📊 RISK FACTOR ANALYSIS
Explain which specific features most strongly drove the ${prediction} classification. Reference the threshold values and describe how the measurements deviate from typical benign vs malignant patterns.

🏥 CLINICAL INTERPRETATION
In plain language, explain what these FNA morphology measurements indicate about the tissue sample and what the ${confidence}% confidence score means clinically.

✅ RECOMMENDED NEXT STEPS
Provide 2-3 specific, actionable recommendations. Always include consulting a qualified oncologist as the primary step. Tailor steps to the ${prediction} result.

Keep each section to 3 sentences maximum. Professional tone. No disclaimers inside the report.`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await res.json();
    if (data.content?.[0]?.text) {
      // Typewriter effect
      const text = data.content[0].text;
      let i = 0;
      const tick = setInterval(() => {
        if (i <= text.length) {
          setReport({ text: text.slice(0, i), done: i === text.length });
          i++;
        } else {
          clearInterval(tick);
        }
      }, 9);
    } else {
      setReport({ text: "Report generation failed. Please try again.", done: true });
    }
  } catch {
    setReport({ text: "Unable to generate AI report. Check your connection.", done: true });
  }
}

export default function Result({ result }) {
  const [report, setReport] = useState(null);
  const [confWidth, setConfWidth] = useState(0);
  const cardRef = useRef(null);

  useEffect(() => {
    if (!result || result.error) return;
    setReport(null);
    setConfWidth(0);

    // Trigger confidence bar animation
    const t = setTimeout(() => setConfWidth(result.probability * 100), 150);

    // Scroll result into view on mobile
    if (cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    // Generate AI report if input values present
    if (result.inputValues) {
      setReport({ text: "", done: false });
      generateReport(
        result.prediction,
        Math.round(result.probability * 100),
        result.inputValues,
        setReport
      );
    }

    return () => clearTimeout(t);
  }, [result]);

  // Empty state
  if (!result) {
    return (
      <div className="result-panel">
        <div className="result-empty">
          <div className="result-empty-icon">🔬</div>
          <h4>Awaiting Analysis</h4>
          <p>
            Fill in the 30 clinical measurements and click{" "}
            <strong>Analyze &amp; Predict</strong> to receive your AI-powered
            diagnosis and detailed clinical report.
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (result.error) {
    return (
      <div className="result-panel">
        <div className="result-empty" style={{ borderColor: "rgba(220,38,38,0.3)" }}>
          <div className="result-empty-icon">❌</div>
          <h4>Prediction Failed</h4>
          <p style={{ color: "var(--red)" }}>{result.error}</p>
          <p style={{ marginTop: 12 }}>
            Make sure the FastAPI backend is running on{" "}
            <code style={{ background: "var(--cream)", padding: "2px 6px", borderRadius: 4, fontSize: 12 }}>
              localhost:8000
            </code>
          </p>
        </div>
      </div>
    );
  }

  const isMalignant = result.prediction === "Malignant";
  const pctStr = `${Math.round(result.probability * 100)}%`;
  const benignPct  = Math.round((result.benign_prob  ?? 0) * 100);
  const malignPct  = Math.round((result.malignant_prob ?? 0) * 100);

  return (
    <div className="result-panel" ref={cardRef}>
      <div className="result-card">

        {/* ── Verdict banner ── */}
        <div className={`result-verdict ${isMalignant ? "malignant" : "benign"}`}>
          <div className="verdict-icon-wrap">
            {isMalignant ? "⚠️" : "✅"}
          </div>
          <div>
            <div className="verdict-label">
              {isMalignant ? "Possible Malignant" : "Likely Benign"}
            </div>
            <div className="verdict-title">{result.prediction}</div>
            <div className="verdict-subtitle">
              {pctStr} model confidence
            </div>
          </div>
        </div>

        {/* ── Confidence bar ── */}
        <div className="result-confidence">
          <div className="conf-header">
            <span>Overall Confidence</span>
            <strong>{pctStr}</strong>
          </div>
          <div className="conf-track">
            <div
              className={`conf-fill ${isMalignant ? "malignant" : "benign"}`}
              style={{ width: `${confWidth}%` }}
            />
          </div>
        </div>

        {/* ── Probability gauges ── */}
        <div className="prob-gauges">
          <div className="prob-gauge">
            <div className="prob-gauge-label">Benign Probability</div>
            <div className={`prob-gauge-val ${!isMalignant ? "green" : ""}`}>
              {benignPct}%
            </div>
            <div className="prob-mini-bar">
              <div
                className="prob-mini-fill green"
                style={{ width: `${benignPct}%` }}
              />
            </div>
          </div>
          <div className="prob-gauge">
            <div className="prob-gauge-label">Malignant Probability</div>
            <div className={`prob-gauge-val ${isMalignant ? "red" : ""}`}>
              {malignPct}%
            </div>
            <div className="prob-mini-bar">
              <div
                className="prob-mini-fill red"
                style={{ width: `${malignPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* ── Key feature chips ── */}
        {result.inputValues && (
          <div className="result-features">
            <h4>Key Diagnostic Features</h4>
            <div className="feat-chips">
              {KEY_FEATURES.map(({ id, label, benignAvg, malignantAvg }) => {
                const val = parseFloat(result.inputValues[id]);
                if (isNaN(val)) return null;
                const cls = classifyChip(val, benignAvg, malignantAvg);
                return (
                  <div className={`feat-chip ${cls}`} key={id} title={`Benign avg ≈ ${benignAvg} | Malignant avg ≈ ${malignantAvg}`}>
                    <strong>{formatVal(val)}</strong>
                    {label}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── AI Clinical Report ── */}
        <div className="result-report">
          <div className="report-header">
            <span className="ai-badge">AI Report</span>
            <h4>Clinical Analysis</h4>
          </div>

          {!report ? (
            <div className="report-spinner">
              <div className="spinner" />
              Generating clinical report…
            </div>
          ) : (
            <div className="report-text">
              {report.text}
              {!report.done && <span className="report-cursor" />}
            </div>
          )}
        </div>

        {/* ── Disclaimer ── */}
        <div className="result-disclaimer">
          ⚠️ <strong>For educational &amp; research use only.</strong> This tool
          is not a certified medical device and does not constitute medical advice.
          Always consult a qualified oncologist or healthcare professional for
          diagnosis and treatment decisions.
        </div>

      </div>
    </div>
  );
}