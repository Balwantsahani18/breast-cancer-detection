import { useEffect, useRef, useState } from "react";

const KEY_FEATURES = [
  { id: "radius_mean",          label: "Radius Mean",       benignAvg: 12.1,  malignantAvg: 17.5  },
  { id: "area_mean",            label: "Area Mean",         benignAvg: 462,   malignantAvg: 978   },
  { id: "concavity_mean",       label: "Concavity Mean",    benignAvg: 0.046, malignantAvg: 0.161 },
  { id: "concave_points_mean",  label: "Concave Pts",       benignAvg: 0.026, malignantAvg: 0.088 },
  { id: "radius_worst",         label: "Radius Worst",      benignAvg: 14.2,  malignantAvg: 21.1  },
  { id: "area_worst",           label: "Area Worst",        benignAvg: 558,   malignantAvg: 1422  },
  { id: "compactness_worst",    label: "Compact. Worst",    benignAvg: 0.21,  malignantAvg: 0.54  },
  { id: "concave_points_worst", label: "Concave Pts Worst", benignAvg: 0.075, malignantAvg: 0.182 },
];

function chipClass(val, bAvg, mAvg) {
  const mid = (bAvg + mAvg) / 2;
  return val > mid ? "elevated" : "normal";
}
function fmtVal(val) {
  if (Math.abs(val) >= 100) return Math.round(val).toString();
  if (Math.abs(val) >= 10)  return val.toFixed(1);
  return val.toFixed(4);
}

// ── Calls backend /report (avoids browser CORS on Anthropic) ──────
async function fetchReport(prediction, confidence, values, setReport, setReportError) {
  try {
    const res = await fetch("http://localhost:8000/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prediction, confidence, values }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Server error ${res.status}`);
    }

    const data = await res.json();
    const text = data.report || "";

    // Typewriter animation
    let i = 0;
    const tick = setInterval(() => {
      if (i <= text.length) {
        setReport({ text: text.slice(0, i), done: i === text.length });
        i++;
      } else {
        clearInterval(tick);
      }
    }, 8);
  } catch (err) {
    setReportError(err.message);
    setReport({ text: "", done: true });
  }
}

// ── Section renderer: split the AI text into labelled sections ────
function ReportSections({ text, done }) {
  if (!text && !done) return null;

  const sections = [];
  const sectionRe = /(🔍|📊|🔬|🏥|✅)\s+([^\n]+)\n([\s\S]*?)(?=(?:🔍|📊|🔬|🏥|✅)|$)/g;
  let m;
  while ((m = sectionRe.exec(text)) !== null) {
    sections.push({ emoji: m[1], title: m[2].trim(), body: m[3].trim() });
  }

  if (sections.length === 0) {
    // Still streaming first section — render raw
    return (
      <div className="report-raw">
        {text}
        {!done && <span className="report-cursor" />}
      </div>
    );
  }

  return (
    <div className="report-sections">
      {sections.map((s, i) => (
        <div className="report-section" key={i}>
          <div className="report-section-head">
            <span className="report-section-emoji">{s.emoji}</span>
            <span className="report-section-title">{s.title}</span>
          </div>
          <p className="report-section-body">
            {s.body}
            {i === sections.length - 1 && !done && <span className="report-cursor" />}
          </p>
        </div>
      ))}
    </div>
  );
}

export default function Result({ result }) {
  const [report,      setReport]      = useState(null);   // { text, done }
  const [reportError, setReportError] = useState(null);
  const [confWidth,   setConfWidth]   = useState(0);
  const cardRef = useRef(null);

  useEffect(() => {
    if (!result || result.error) return;

    setReport(null);
    setReportError(null);
    setConfWidth(0);

    const t = setTimeout(() => setConfWidth(result.probability * 100), 150);

    if (cardRef.current) {
      setTimeout(() => cardRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 300);
    }

    if (result.inputValues) {
      setReport({ text: "", done: false });
      fetchReport(
        result.prediction,
        Math.round(result.probability * 100),
        result.inputValues,
        setReport,
        setReportError,
      );
    }

    return () => clearTimeout(t);
  }, [result]);

  // ── Empty ────────────────────────────────────────────────────────
  if (!result) {
    return (
      <div className="result-panel">
        <div className="result-empty">
          <div className="result-empty-icon">🔬</div>
          <h4>Awaiting Analysis</h4>
          <p>Fill in the core measurements and click <strong>Analyze &amp; Predict</strong> to receive your AI-powered diagnosis and detailed clinical report.</p>
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────
  if (result.error) {
    return (
      <div className="result-panel">
        <div className="result-empty" style={{ borderColor: "rgba(220,38,38,0.3)" }}>
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

  const isMal      = result.prediction === "Malignant";
  const pctStr     = `${Math.round(result.probability * 100)}%`;
  const benignPct  = Math.round((result.benign_prob  ?? 0) * 100);
  const malignPct  = Math.round((result.malignant_prob ?? 0) * 100);

  return (
    <div className="result-panel" ref={cardRef}>
      <div className="result-card">

        {/* ── Verdict ── */}
        <div className={`result-verdict ${isMal ? "malignant" : "benign"}`}>
          <div className="verdict-icon-wrap">{isMal ? "⚠️" : "✅"}</div>
          <div>
            <div className="verdict-label">{isMal ? "Possible Malignant" : "Likely Benign"}</div>
            <div className="verdict-title">{result.prediction}</div>
            <div className="verdict-subtitle">{pctStr} model confidence · Random Forest</div>
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
              className={`conf-fill ${isMal ? "malignant" : "benign"}`}
              style={{ width: `${confWidth}%` }}
            />
          </div>
          <div className="conf-legend">
            <span>0%</span><span>Uncertain</span><span>100% Certain</span>
          </div>
        </div>

        {/* ── Dual probability gauges ── */}
        <div className="prob-gauges">
          <div className="prob-gauge">
            <div className="prob-gauge-label">Benign Probability</div>
            <div className={`prob-gauge-val ${!isMal ? "green" : ""}`}>{benignPct}%</div>
            <div className="prob-mini-bar">
              <div className="prob-mini-fill green" style={{ width: `${benignPct}%` }} />
            </div>
          </div>
          <div className="prob-gauge">
            <div className="prob-gauge-label">Malignant Probability</div>
            <div className={`prob-gauge-val ${isMal ? "red" : ""}`}>{malignPct}%</div>
            <div className="prob-mini-bar">
              <div className="prob-mini-fill red" style={{ width: `${malignPct}%` }} />
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
                const cls = chipClass(val, benignAvg, malignantAvg);
                return (
                  <div
                    className={`feat-chip ${cls}`}
                    key={id}
                    title={`Benign avg ≈ ${benignAvg}  |  Malignant avg ≈ ${malignantAvg}`}
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

        {/* ── AI Clinical Report ── */}
        <div className="result-report">
          <div className="report-header">
            <span className="ai-badge">AI Report</span>
            <h4>Detailed Clinical Analysis</h4>
          </div>

          {/* Loading state */}
          {!report && !reportError && (
            <div className="report-spinner">
              <div className="spinner" />
              <div>
                <div style={{ fontWeight: 500, marginBottom: 4 }}>Generating clinical report…</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  Claude is analysing all 30 measurements
                </div>
              </div>
            </div>
          )}

          {/* Error state */}
          {reportError && (
            <div className="report-error">
              <strong>⚠️ Report generation failed</strong>
              <p>{reportError}</p>
              <p style={{ marginTop: 6, fontSize: 12, color: "var(--text-muted)" }}>
                Make sure your backend is running and <code>ANTHROPIC_API_KEY</code> is set.
              </p>
            </div>
          )}

          {/* Report content */}
          {report && (
            <ReportSections text={report.text} done={report.done} />
          )}
        </div>

        {/* ── Disclaimer ── */}
        <div className="result-disclaimer">
          ⚠️ <strong>Educational &amp; research use only.</strong> Not a certified medical device.
          Always consult a qualified oncologist for diagnosis and treatment decisions.
        </div>

      </div>
    </div>
  );
}