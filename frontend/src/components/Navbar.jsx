import { useEffect, useState } from "react";

export default function Navbar({ currentPage, onNavigate }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { key: "home",    label: "Home" },
    { key: "predict", label: "Predict" },
    { key: "history", label: "History" },
    { key: "about",   label: "About" },
  ];

  return (
    <nav className={`navbar${scrolled ? " scrolled" : ""}`}>
      <button
        className="navbar-logo"
        onClick={() => onNavigate("home")}
        style={{ background: "none", border: "none", padding: 0 }}
      >
        <span className="navbar-logo-dot" />
        OncoSight
      </button>

      <ul className="navbar-links">
        {links.map((l) => (
          <li key={l.key}>
            <button
              className={currentPage === l.key ? "active" : ""}
              onClick={() => onNavigate(l.key)}
            >
              {l.label}
            </button>
          </li>
        ))}
        <li>
          <button
            className="navbar-cta"
            onClick={() => onNavigate("predict")}
          >
            Run Prediction
          </button>
        </li>
      </ul>
    </nav>
  );
}