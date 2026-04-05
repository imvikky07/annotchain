const BANDS = [
  { label: "Almost perfect", min: 0.81,  color: "#34d399" },
  { label: "Substantial",    min: 0.61,  color: "#86efac" },
  { label: "Moderate",       min: 0.41,  color: "#fbbf24" },
  { label: "Fair",           min: 0.21,  color: "#fb923c" },
  { label: "Slight",         min: 0.01,  color: "#f87171" },
  { label: "Less than chance", min: -Infinity, color: "#ef4444" },
];

function getBand(k) {
  return BANDS.find((b) => k >= b.min) || BANDS[BANDS.length - 1];
}

export default function AgreementChart({ data }) {
  if (!data) return null;
  const { fleiss_kappa: k, n_annotators, n_annotations, annotator_reliability = {} } = data;
  const band = getBand(k);
  const pct  = Math.round(((Math.max(-1, Math.min(1, k)) + 1) / 2) * 100);

  return (
    <div className="agreement-widget">
      <div className="kappa-display">
        <span className="kappa-value" style={{ color: band.color }}>κ = {k.toFixed(4)}</span>
        <span className="kappa-label">{band.label}</span>
      </div>

      <div className="kappa-track">
        <div className="kappa-fill" style={{ width: `${pct}%`, background: band.color }} />
        <div className="kappa-midline" />
      </div>
      <div className="kappa-axis"><span>−1</span><span>0</span><span>+1</span></div>

      <div className="kappa-stats">
        <span>{n_annotators} annotator{n_annotators !== 1 ? "s" : ""}</span>
        <span>·</span>
        <span>{n_annotations} annotation{n_annotations !== 1 ? "s" : ""}</span>
      </div>

      {Object.keys(annotator_reliability).length > 0 && (
        <div className="reliability-section">
          <h4>Reliability vs Expert Ground Truth</h4>
          <table className="reliability-table">
            <thead>
              <tr><th>Annotator</th><th>Score</th><th>Bar</th></tr>
            </thead>
            <tbody>
              {Object.entries(annotator_reliability)
                .sort((a, b) => b[1] - a[1])
                .map(([uid, score]) => (
                  <tr key={uid}>
                    <td className="mono">{uid.slice(0, 8)}…</td>
                    <td style={{ color: score >= 0.7 ? "#34d399" : score >= 0.5 ? "#fbbf24" : "#f87171", fontWeight: 600 }}>
                      {(score * 100).toFixed(1)}%
                    </td>
                    <td>
                      <div className="mini-bar">
                        <div className="mini-fill" style={{ width: `${score * 100}%`, background: score >= 0.7 ? "#34d399" : score >= 0.5 ? "#fbbf24" : "#f87171" }} />
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
