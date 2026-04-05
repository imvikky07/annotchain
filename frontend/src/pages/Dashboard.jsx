import { useEffect, useState } from "react";
import { getMyAnnotations, getRewardHistory, getMe } from "../api/client.js";

const SEPOLIA = "https://sepolia.etherscan.io/tx/";

function StatCard({ value, label, sub, color }) {
  return (
    <div className="stat-card">
      <div className="stat-value" style={color ? { color } : {}}>{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

function EmptyRow({ message }) {
  return (
    <tr>
      <td colSpan={10} style={{ textAlign: "center", padding: "2rem", color: "var(--muted)" }}>
        {message}
      </td>
    </tr>
  );
}

export default function Dashboard() {
  const [me,          setMe]          = useState(null);
  const [annotations, setAnnotations] = useState([]);
  const [rewards,     setRewards]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [tab,         setTab]         = useState("annotations");

  useEffect(() => {
    Promise.all([getMe(), getMyAnnotations(), getRewardHistory()])
      .then(([m, anns, rwds]) => { setMe(m); setAnnotations(anns); setRewards(rwds); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const onChain      = annotations.filter((a) => a.tx_hash).length;
  const totalEthWei  = rewards.reduce((s, r) => s + Number(r.amount_wei), 0);
  const totalEth     = (totalEthWei / 1e18).toFixed(6);
  const pendingCount = annotations.filter((a) => !a.rewarded).length;

  if (loading) return (
    <div className="page">
      <div className="skeleton-grid">{[1,2,3,4].map((i) => <div key={i} className="skeleton-card" />)}</div>
    </div>
  );

  return (
    <div className="page">
      <div className="dash-header">
        <div>
          <h2>My Work</h2>
          {me && <p className="muted">@{me.username} · {me.wallet_address || "No wallet connected"}</p>}
        </div>
        {me && !me.wallet_address && (
          <div className="wallet-warning">
            ⚠ No wallet address — you won't receive ETH rewards
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="stats-row">
        <StatCard value={annotations.length}    label="Annotations"   sub="total submitted" />
        <StatCard value={onChain}               label="On-chain"      sub="confirmed txns" color="var(--accent)" />
        <StatCard value={pendingCount}          label="Pending reward" sub="not yet paid" color="var(--amber)" />
        <StatCard value={`Ξ ${totalEth}`}      label="ETH earned"    sub="lifetime total" color="var(--green)" />
      </div>

      {/* Tabs */}
      <div className="dash-tabs">
        {["annotations", "rewards"].map((t) => (
          <button
            key={t}
            className={`tab-btn ${tab === t ? "active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t === "annotations"
              ? `Annotations (${annotations.length})`
              : `Rewards (${rewards.length})`}
          </button>
        ))}
      </div>

      {/* Annotations table */}
      {tab === "annotations" && (
        <div className="panel">
          <div className="tx-table-wrapper">
            <table className="tx-table">
              <thead>
                <tr>
                  <th>Label</th>
                  <th>Task</th>
                  <th>On-chain tx</th>
                  <th>Reward</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {annotations.length === 0
                  ? <EmptyRow message="No annotations yet. Go to Tasks to start labeling!" />
                  : annotations.map((a) => (
                    <tr key={a.id}>
                      <td><span className="label-pill">{a.label}</span></td>
                      <td className="muted mono">{String(a.task_id).slice(0,8)}…</td>
                      <td>
                        {a.tx_hash
                          ? <a href={`${SEPOLIA}${a.tx_hash}`} target="_blank" rel="noreferrer" className="tx-link">{a.tx_hash.slice(0,12)}…</a>
                          : <span className="muted">—</span>}
                      </td>
                      <td>
                        <span className={`reward-status ${a.rewarded ? "paid" : "pending"}`}>
                          {a.rewarded ? "Paid" : "Pending"}
                        </span>
                      </td>
                      <td className="muted">{new Date(a.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Rewards table */}
      {tab === "rewards" && (
        <div className="panel">
          <div className="tx-table-wrapper">
            <table className="tx-table">
              <thead>
                <tr>
                  <th>Amount</th>
                  <th>Transaction</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {rewards.length === 0
                  ? <EmptyRow message="No rewards yet. Complete annotations to earn ETH!" />
                  : rewards.map((r) => (
                    <tr key={r.id}>
                      <td style={{ color: "var(--green)", fontWeight: 600 }}>
                        +Ξ {(Number(r.amount_wei) / 1e18).toFixed(6)}
                      </td>
                      <td>
                        <a href={`${SEPOLIA}${r.tx_hash}`} target="_blank" rel="noreferrer" className="tx-link">
                          {r.tx_hash.slice(0, 14)}…
                        </a>
                      </td>
                      <td className="muted">{new Date(r.paid_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
