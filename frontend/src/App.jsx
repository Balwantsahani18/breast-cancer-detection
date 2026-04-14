import { useState, useEffect, useCallback } from "react";
import Navbar  from "./components/Navbar";
import Form    from "./components/Form";
import Result  from "./components/Result";
import "./App.css";

// ─── Toast system ────────────────────────────────────────────────
function useToasts() {
  const [toasts, setToasts] = useState([]);
  const addToast = useCallback((msg, type = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);
  return { toasts, addToast };
}

// ─── History helpers ─────────────────────────────────────────────
function loadHistory() {
  try { return JSON.parse(localStorage.getItem("onco_history") || "[]"); }
  catch { return []; }
}
function saveHistory(items) {
  localStorage.setItem("onco_history", JSON.stringify(items.slice(0, 50)));
}

// ═════════════════════════════════════════════════════════════════
//  PAGES
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
        {/* Left content */}
        <div>
          <div className="hero-badge">
            <span className="hero-badge-dot" />
            AI-Powered Medical Screening
          </div>
          <h1 className="hero-title">
            Predict Breast Cancer Risk{" "}
            <em>with Precision</em>
          </h1>
          <p className="hero-desc">
            OncoSight uses a trained Random Forest model on the Wisconsin Breast
            Cancer Dataset to deliver fast, accurate, and interpretable risk
            assessments — complete with a live AI-generated clinical report.
          </p>
          <div className="hero-actions">
            <button
              className="btn-hero-primary"
              onClick={() => onNavigate("predict")}
            >
              🔬 Run Prediction
            </button>
            <button
              className="btn-hero-secondary"
              onClick={() => onNavigate("about")}
            >
              Learn More →
            </button>
          </div>
          <div className="hero-stats">
            {[
              { val: "96.4%", label: "Model Accuracy" },
              { val: "569",   label: "Training Samples" },
              { val: "30",    label: "Clinical Features" },
              { val: "<1s",   label: "Prediction Time"  },
            ].map(({ val, label }) => (
              <div key={label}>
                <div className="hero-stat-num">{val}</div>
                <div className="hero-stat-label">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — mock preview card */}
        <div className="hero-visual">
          <div className="hero-mock-card">
            <div className="float-badge top-right">
              <div className="float-badge-icon" style={{ background: "var(--green-bg)" }}>✅</div>
              <div className="float-badge-text">
                <strong>Benign · Low Risk</strong>
                <span>Confidence 97.3%</span>
              </div>
            </div>

            <div className="mock-card-top">
              <span className="mock-card-title">Prediction Result</span>
              <span className="mock-chip success">Complete</span>
            </div>
            <div className="mock-meter-label">
              <span>Risk Score</span>
              <strong>23%</strong>
            </div>
            <div className="mock-track"><div className="mock-track-fill" /></div>
            <div className="mock-feat-grid">
              {[
                ["17.8", "Mean Radius"],
                ["1001", "Area Mean"],
                ["0.300", "Concavity"],
                ["0.147", "Concave Pts"],
              ].map(([v, l]) => (
                <div className="mock-feat" key={l}>
                  <strong>{v}</strong>{l}
                </div>
              ))}
            </div>
            <button
              className="mock-btn"
              onClick={() => onNavigate("predict")}
            >
              Try Your Own Analysis
            </button>

            <div className="float-badge bot-left">
              <div className="float-badge-icon" style={{ background: "var(--rose-pale)" }}>🧠</div>
              <div className="float-badge-text">
                <strong>AI Report Ready</strong>
                <span>Clinical analysis generated</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Predict Page ─────────────────────────────────────────────────
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
          Enter all 30 FNA biopsy measurements or load a sample case. The
          model will predict the diagnosis and an AI report will be generated
          automatically.
        </p>
      </div>

      {loading && (
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 12, background: "white", padding: "12px 24px", borderRadius: "var(--radius-pill)", boxShadow: "var(--shadow-sm)", fontSize: 14, color: "var(--text-muted)" }}>
            <div className="loading-spinner" style={{ width: 20, height: 20, margin: 0 }} />
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

// ─── History Page ─────────────────────────────────────────────────
function HistoryPage({ history, onClear }) {
  const totalPredictions = history.length;
  const malignantCount   = history.filter((h) => h.prediction === "Malignant").length;
  const benignCount      = totalPredictions - malignantCount;
  const avgConf          = totalPredictions
    ? Math.round(history.reduce((s, h) => s + h.probability * 100, 0) / totalPredictions)
    : 0;

  function formatTime(ts) {
    const d = new Date(ts);
    return d.toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }

  return (
    <div className="history-page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: 8 }}>
        <div>
          <h2>Prediction History</h2>
          <p className="sub">All past analyses run in this browser session</p>
        </div>
        {history.length > 0 && (
          <button className="history-clear-btn" onClick={onClear}>
            🗑 Clear History
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="history-empty">
          <div className="icon">📋</div>
          <h4>No predictions yet</h4>
          <p>Run a prediction and it will appear here.</p>
        </div>
      ) : (
        <>
          <div className="history-stats">
            {[
              { val: totalPredictions, label: "Total Predictions" },
              { val: benignCount,      label: "Benign Results",   color: "var(--green)" },
              { val: malignantCount,   label: "Malignant Results",color: "var(--red)"   },
              { val: avgConf + "%",    label: "Avg Confidence"    },
            ].map(({ val, label, color }) => (
              <div className="hstat" key={label}>
                <div className="hstat-val" style={color ? { color } : {}}>{val}</div>
                <div className="hstat-label">{label}</div>
              </div>
            ))}
          </div>

          <div className="history-list">
            {[...history].reverse().map((item, idx) => {
              const isMalignant = item.prediction === "Malignant";
              return (
                <div className="history-item" key={item.timestamp + idx}>
                  <div className={`history-item-badge ${isMalignant ? "malignant" : "benign"}`}>
                    {isMalignant ? "⚠️" : "✅"}
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
                    <div className="history-item-conf">
                      {Math.round(item.probability * 100)}%
                    </div>
                    <div className="history-item-time">{formatTime(item.timestamp)}</div>
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

// ─── About Page ───────────────────────────────────────────────────
function AboutPage() {
  const cards = [
    {
      icon: "🧬",
      title: "Dataset",
      body: "The Wisconsin Breast Cancer Dataset (WBCD) contains 569 samples (212 malignant, 357 benign) with 30 features computed from digitized FNA biopsy images.",
    },
    {
      icon: "🤖",
      title: "ML Model",
      body: "A Random Forest classifier trained and serialized with scikit-learn. Feature scaling uses StandardScaler. Achieves ~96.4% accuracy on the held-out test set.",
    },
    {
      icon: "⚙️",
      title: "Backend",
      body: "FastAPI (Python) serves the trained model via a POST /predict endpoint. CORS-enabled for local React development. Inputs are scaled before inference.",
    },
    {
      icon: "⚛️",
      title: "Frontend",
      body: "React 18 + Vite for fast development. Custom CSS design system using CSS variables. AI report generation powered by the Anthropic Claude API.",
    },
  ];

  return (
    <div className="about-page">
      <span className="section-tag">About</span>
      <h2>OncoSight</h2>
      <p className="lead">
        A full-stack AI application that combines a trained scikit-learn Random
        Forest classifier with a Claude-powered report generator to provide
        interpretable breast cancer risk predictions from fine needle aspiration
        biopsy measurements.
      </p>

      <div className="about-grid">
        {cards.map((c) => (
          <div className="about-card" key={c.title}>
            <div className="about-card-icon">{c.icon}</div>
            <h4>{c.title}</h4>
            <p>{c.body}</p>
          </div>
        ))}
      </div>

      <div className="about-card" style={{ marginBottom: 24 }}>
        <h4 style={{ marginBottom: 12 }}>Feature Groups</h4>
        <table className="dataset-table">
          <thead>
            <tr>
              <th>Group</th>
              <th>Features</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Mean</td>
              <td>10 features</td>
              <td>Mean value of each characteristic across all cells in the image</td>
            </tr>
            <tr>
              <td>SE</td>
              <td>10 features</td>
              <td>Standard error — variability of each feature across cells</td>
            </tr>
            <tr>
              <td>Worst</td>
              <td>10 features</td>
              <td>Mean of the 3 largest values (worst-case cells) for each feature</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        style={{
          background: "var(--amber-bg)", border: "1px solid rgba(217,119,6,0.25)",
          borderRadius: "var(--radius-md)", padding: "16px 20px",
          fontSize: 13, color: "#92400e", lineHeight: 1.7,
        }}
      >
        ⚠️ <strong>Medical Disclaimer:</strong> OncoSight is a research and
        educational tool. It is not a certified medical device and must not be
        used as a substitute for professional medical diagnosis. Always consult
        a qualified oncologist or healthcare professional.
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
  const { toasts, addToast }  = useToasts();

  function navigate(p) {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleNewResult(r) {
    const entry = { ...r, timestamp: Date.now() };
    const updated = [...history, entry];
    setHistory(updated);
    saveHistory(updated);
    addToast(
      `${r.prediction} · ${Math.round(r.probability * 100)}% confidence`,
      r.prediction === "Benign" ? "success" : "error"
    );
  }

  function clearHistory() {
    setHistory([]);
    saveHistory([]);
    addToast("History cleared", "info");
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
        ⚠️ <strong>Medical Disclaimer:</strong> OncoSight is a research and
        educational tool, not a certified medical device. Always consult a
        qualified healthcare provider for medical decisions.
      </div>
      <footer className="site-footer">
        <div className="footer-logo">
          <span className="footer-dot" />
          OncoSight
        </div>
        <span className="footer-copy">
          Wisconsin Breast Cancer Dataset · Built with FastAPI, React &amp; Claude
        </span>
        <div className="footer-links">
          <a href="https://archive.ics.uci.edu/dataset/17/breast+cancer+wisconsin+diagnostic" target="_blank" rel="noreferrer">Dataset</a>
          <a href="https://fastapi.tiangolo.com" target="_blank" rel="noreferrer">FastAPI</a>
          <a href="https://anthropic.com" target="_blank" rel="noreferrer">Claude API</a>
        </div>
      </footer>

      {/* Toast notifications */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div className={`toast ${t.type}`} key={t.id}>
            {t.type === "success" && "✅ "}
            {t.type === "error"   && "⚠️ "}
            {t.type === "info"    && "ℹ️ "}
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  );
}