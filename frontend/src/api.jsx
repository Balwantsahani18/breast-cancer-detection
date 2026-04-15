import { useState, useCallback } from "react";
import Navbar from "./components/Navbar";
import Form   from "./components/Form";
import Result from "./components/Result";
import "./App.css";

// ── Toast ─────────────────────────────────────────────────────────
function useToasts() {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((msg, type = "info") => {
    const id = Date.now();
    setToasts((p) => [...p, { id, msg, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3500);
  }, []);
  return { toasts, add };
}

// ── History helpers ───────────────────────────────────────────────
function loadHistory() {
  try { return JSON.parse(localStorage.getItem("onco_history") || "[]"); }
  catch { return []; }
}
function saveHistory(items) {
  localStorage.setItem("onco_history", JSON.stringify(items.slice(0, 50)));
}

// ═════════════════════════════════════════════════════════════════
//  HOME PAGE
// ═════════════════════════════════════════════════════════════════
function HomePage({ onNavigate }) {
  return (
    <section className="hero">
      <div className="hero-blobs">
        <div className="hero-blob hero-blob-1" />
        <div className="hero-blob hero-blob-2" />
        <div className="hero-blob hero-blob-3" />
      </div>
      <div className="hero-inner">
        <div>
          <div className="hero-badge">
            <span className="hero-badge-dot" />
            AI-Powered Medical Screening
          </div>
          <h1 className="hero-title">
            Predict Breast Cancer Risk <em>with Precision</em>
          </h1>
          <p className="hero-desc">
            OncoSight uses a trained Random Forest model on the Wisconsin Breast
            Cancer Dataset — enter just 14 core measurements, we calculate the
            rest, and Claude AI generates a full clinical report.
          </p>
          <div className="hero-actions">
            <button className="btn-hero-primary" onClick={() => onNavigate("predict")}>
              🔬 Run Prediction
            </button>
            <button className="btn-hero-secondary" onClick={() => onNavigate("about")}>
              Learn More →
            </button>
          </div>
          <div className="hero-stats">
            {[
              { val: "96.4%", label: "Model Accuracy"    },
              { val: "569",   label: "Training Samples"  },
              { val: "14",    label: "Fields to Fill"    },
              { val: "<1s",   label: "Prediction Time"   },
            ].map(({ val, label }) => (
              <div key={label}>
                <div className="hero-stat-num">{val}</div>
                <div className="hero-stat-label">{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="hero-visual">
          <div className="hero-mock-card">
            <div className="float-badge top-right">
              <div className="float-badge-icon" style={{ background: "var(--green-bg)" }}>✅</div>
              <div className="float-badge-text">
                <strong>Benign · Low Risk</strong>
                <span>Confidence 97%</span>
              </div>
            </div>
            <div className="mock-card-top">
              <span className="mock-card-title">Prediction Result</span>
              <span className="mock-chip success">Complete</span>
            </div>
            <div className="mock-meter-label">
              <span>Risk Score</span><strong>23%</strong>
            </div>
            <div className="mock-track"><div className="mock-track-fill" /></div>
            <div className="mock-feat-grid">
              {[["17.8","Radius Mean"],["1001","Area Mean"],["0.300","Concavity"],["0.147","Concave Pts"]].map(([v,l]) => (
                <div className="mock-feat" key={l}><strong>{v}</strong>{l}</div>
              ))}
            </div>
            <button className="mock-btn" onClick={() => onNavigate("predict")}>
              Try Your Own Analysis
            </button>
            <div className="float-badge bot-left">
              <div className="float-badge-icon" style={{ background: "var(--rose-pale)" }}>🧠</div>
              <div className="float-badge-text">
                <strong>AI Report Ready</strong>
                <span>5-section clinical analysis</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ═════════════════════════════════════════════════════════════════
//  PREDICT PAGE
// ═════════════════════════════════════════════════════════════════
function PredictPage({ onNewResult }) {
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);

  function handleResult(r) {
    setResult(r);
    if (r && !r.error) onNewResult(r);
  }

  return (
    <div className="predict-page">
      <div className="predict-page-header">
        <span className="section-tag">Prediction Tool</span>
        <h2>Breast Cancer Risk Analysis</h2>
        <p>
          Enter 14 core measurements or upload a biopsy report PDF/image.
          Remaining values are auto-calculated · AI clinical report generated automatically.
        </p>
      </div>

      {loading && (
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:12, background:"white", padding:"12px 24px", borderRadius:"var(--radius-pill)", boxShadow:"var(--shadow-sm)", fontSize:14, color:"var(--text-muted)" }}>
            <div className="btn-spinner" style={{ borderColor:"rgba(232,99,122,0.3)", borderTopColor:"var(--rose)" }} />
            Running analysis…
          </div>
        </div>
      )}

      <div className="predict-layout">
        <Form onResult={handleResult} onLoading={setLoading} />
        <Result result={result} />
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
//  HISTORY PAGE
// ═════════════════════════════════════════════════════════════════
function HistoryPage({ history, onClear }) {
  const total    = history.length;
  const malCount = history.filter((h) => h.prediction === "Malignant").length;
  const benCount = total - malCount;
  const avgConf  = total
    ? Math.round(history.reduce((s, h) => s + h.probability * 100, 0) / total)
    : 0;

  function fmtTime(ts) {
    return new Date(ts).toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }

  return (
    <div className="history-page">
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:16, marginBottom:8 }}>
        <div>
          <h2>Prediction History</h2>
          <p className="sub">All past analyses stored in this browser</p>
        </div>
        {history.length > 0 && (
          <button className="history-clear-btn" onClick={onClear}>🗑 Clear History</button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="history-empty">
          <div className="icon">📋</div>
          <h4>No predictions yet</h4>
          <p>Run your first prediction and it will appear here.</p>
        </div>
      ) : (
        <>
          <div className="history-stats">
            {[
              { val: total,         label: "Total",    color: null          },
              { val: benCount,      label: "Benign",   color: "var(--green)"},
              { val: malCount,      label: "Malignant",color: "var(--red)"  },
              { val: avgConf + "%", label: "Avg Conf", color: null          },
            ].map(({ val, label, color }) => (
              <div className="hstat" key={label}>
                <div className="hstat-val" style={color ? { color } : {}}>{val}</div>
                <div className="hstat-label">{label}</div>
              </div>
            ))}
          </div>
          <div className="history-list">
            {[...history].reverse().map((item, i) => {
              const isMal = item.prediction === "Malignant";
              return (
                <div className="history-item" key={item.timestamp + i}>
                  <div className={`history-item-badge ${isMal ? "malignant" : "benign"}`}>
                    {isMal ? "⚠️" : "✅"}
                  </div>
                  <div className="history-item-info">
                    <div className="history-item-title">{item.prediction}</div>
                    <div className="history-item-sub">
                      Radius mean: {parseFloat(item.inputValues?.radius_mean ?? 0).toFixed(2)} ·
                      Area mean: {Math.round(parseFloat(item.inputValues?.area_mean ?? 0))} ·
                      Concavity: {parseFloat(item.inputValues?.concavity_mean ?? 0).toFixed(4)}
                    </div>
                  </div>
                  <div className="history-item-meta">
                    <div className="history-item-conf">{Math.round(item.probability * 100)}%</div>
                    <div className="history-item-time">{fmtTime(item.timestamp)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
//  ABOUT PAGE
// ═════════════════════════════════════════════════════════════════
function AboutPage() {
  return (
    <div className="about-page">
      <span className="section-tag">About</span>
      <h2>OncoSight</h2>
      <p className="lead">
        A full-stack AI application combining a scikit-learn Random Forest classifier
        with Claude-powered report generation. Users enter 14 core biopsy measurements;
        16 derived values are auto-calculated using geometric formulas, and Claude AI
        generates a detailed 5-section oncology report via the FastAPI backend.
      </p>

      <div className="about-grid">
        {[
          { icon:"🧬", title:"Dataset",   body:"Wisconsin Breast Cancer Dataset — 569 samples (212 malignant, 357 benign) with 30 FNA features computed from digitized biopsy images." },
          { icon:"🤖", title:"ML Model",  body:"Random Forest classifier trained with scikit-learn. StandardScaler normalization. ~96.4% accuracy on the held-out test set." },
          { icon:"⚙️", title:"Backend",   body:"FastAPI (Python) with /predict, /report, and /extract endpoints. Claude API proxied server-side to avoid browser CORS restrictions." },
          { icon:"📎", title:"Upload",    body:"Upload PDF, JPG, or PNG biopsy reports. Claude vision/document AI extracts measurements and auto-fills the 14 input fields." },
        ].map((c) => (
          <div className="about-card" key={c.title}>
            <div className="about-card-icon">{c.icon}</div>
            <h4>{c.title}</h4>
            <p>{c.body}</p>
          </div>
        ))}
      </div>

      <div className="about-card" style={{ marginBottom: 24 }}>
        <h4 style={{ marginBottom: 12 }}>Field Reduction: 30 → 14 Inputs</h4>
        <table className="dataset-table">
          <thead><tr><th>Derived Field</th><th>Formula</th><th>From Input</th></tr></thead>
          <tbody>
            {[
              ["Perimeter (mean/se/worst)", "2π × radius",          "Radius"],
              ["Area (mean/se/worst)",       "π × radius²",          "Radius"],
              ["Compactness (mean/se/worst)","perimeter² / area − 1","Radius (via perimeter + area)"],
              ["Concavity (mean/se/worst)",  "concave_points × 1.8", "Concave Points"],
              ["Smoothness worst",           "smoothness_mean × 1.35","Smoothness Mean"],
              ["Symmetry worst",             "symmetry_mean × 1.35", "Symmetry Mean"],
              ["Fractal Dim worst",          "fractal_dim_mean × 1.3","Fractal Dim Mean"],
            ].map(([f,formula,from]) => (
              <tr key={f}><td>{f}</td><td><code>{formula}</code></td><td>{from}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ background:"var(--amber-bg)", border:"1px solid rgba(217,119,6,0.25)", borderRadius:"var(--radius-md)", padding:"16px 20px", fontSize:13, color:"#92400e", lineHeight:1.7 }}>
        ⚠️ <strong>Medical Disclaimer:</strong> OncoSight is a research and educational tool, not a certified medical device. Always consult a qualified oncologist for diagnosis and treatment decisions.
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
//  ROOT APP
// ═════════════════════════════════════════════════════════════════
export default function App() {
  const [page,    setPage]    = useState("home");
  const [history, setHistory] = useState(loadHistory);
  const { toasts, add }       = useToasts();

  function navigate(p) {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleNewResult(r) {
    const entry   = { ...r, timestamp: Date.now() };
    const updated = [...history, entry];
    setHistory(updated);
    saveHistory(updated);
    add(
      `${r.prediction} · ${Math.round(r.probability * 100)}% confidence`,
      r.prediction === "Benign" ? "success" : "error"
    );
  }

  function clearHistory() {
    setHistory([]);
    saveHistory([]);
    add("History cleared", "info");
  }

  return (
    <div className="app-shell">
      <Navbar currentPage={page} onNavigate={navigate} />

      <main className="page-content">
        {page === "home"    && <HomePage    onNavigate={navigate} />}
        {page === "predict" && <PredictPage onNewResult={handleNewResult} />}
        {page === "history" && <HistoryPage history={history} onClear={clearHistory} />}
        {page === "about"   && <AboutPage />}
      </main>

      <div className="footer-disclaimer">
        ⚠️ <strong>Medical Disclaimer:</strong> OncoSight is a research and educational tool, not a certified medical device. Always consult a qualified healthcare provider.
      </div>
      <footer className="site-footer">
        <div className="footer-logo"><span className="footer-dot" />OncoSight</div>
        <span className="footer-copy">Wisconsin Breast Cancer Dataset · FastAPI · React · Claude AI</span>
        <div className="footer-links">
          <a href="https://archive.ics.uci.edu/dataset/17/breast+cancer+wisconsin+diagnostic" target="_blank" rel="noreferrer">Dataset</a>
          <a href="https://fastapi.tiangolo.com" target="_blank" rel="noreferrer">FastAPI</a>
          <a href="https://anthropic.com" target="_blank" rel="noreferrer">Claude API</a>
        </div>
      </footer>

      <div className="toast-container">
        {toasts.map((t) => (
          <div className={`toast ${t.type}`} key={t.id}>
            {t.type === "success" ? "✅ " : t.type === "error" ? "⚠️ " : "ℹ️ "}
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  );
}