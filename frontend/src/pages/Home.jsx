import { useNavigate } from "react-router-dom";
import { isLoggedIn, isAdmin } from "../api/client.js";

const FEATURES = [
  { icon: "⬡", title: "Immutable records",   desc: "Every annotation is anchored to an Ethereum transaction hash. Tamper-proof by design." },
  { icon: "κ",  title: "Fleiss' Kappa",       desc: "Scientific inter-annotator agreement measurement used in NLP, medical AI, and CV research." },
  { icon: "Ξ",  title: "ETH rewards",         desc: "Smart contract distributes rewards directly to annotator wallets. No middleman." },
  { icon: "⛓",  title: "Full auditability",   desc: "Every action — annotation, reward, agreement score — verifiable on Etherscan forever." },
];

export default function Home() {
  const navigate = useNavigate();
  const loggedIn = isLoggedIn();
  const admin    = isAdmin();

  return (
    <div className="home-page">
      <section className="hero">
        <div className="hero-badge">Ethereum Sepolia · Fleiss' κ · FastAPI · React</div>
        <h1>Annotation you can<br />trust on-chain</h1>
        <p className="hero-sub">
          A research-grade crowdsourcing platform where every label is immutably recorded on Ethereum,
          inter-annotator agreement is scientifically validated, and contributors earn real ETH.
        </p>
        <div className="hero-actions">
          {loggedIn ? (
            <>
              <button onClick={() => navigate(admin ? "/admin" : "/tasks")}>
                {admin ? "Go to Admin Panel" : "Browse Tasks"} →
              </button>
              <button className="btn-outline" onClick={() => navigate("/dashboard")}>
                My Dashboard
              </button>
            </>
          ) : (
            <>
              <button onClick={() => navigate("/register")}>Start Annotating</button>
              <button className="btn-outline" onClick={() => navigate("/login")}>Sign In</button>
            </>
          )}
        </div>
      </section>

      <section className="features">
        {FEATURES.map((f) => (
          <div key={f.title} className="feature-card">
            <div className="feature-icon">{f.icon}</div>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </div>
        ))}
      </section>

      <section className="workflow">
        <h2>End-to-end pipeline</h2>
        <div className="steps">
          {[
            ["01", "Admin publishes task",     "Creates task on-chain, uploads data items with expert labels, funds contract with ETH."],
            ["02", "Annotators label data",    "Browse tasks, submit labels. Each annotation triggers an Ethereum transaction."],
            ["03", "Agreement validated",      "Fleiss' Kappa computed across all annotators. Reliability scored against expert ground truth."],
            ["04", "Rewards distributed",      "Smart contract pays ETH directly to annotator wallets. Fully transparent on Etherscan."],
            ["05", "Research export",          "Download CSV or JSON with every annotation, tx hash, kappa score — ready for your paper."],
          ].map(([n, title, desc]) => (
            <div key={n} className="step">
              <div className="step-num">{n}</div>
              <div>
                <strong>{title}</strong>
                <p>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
