import { useEffect, useState } from "react";
import { getMyAnnotations } from "../api/client.js";

export default function TxHistory() {
  const [annotations, setAnnotations] = useState([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    getMyAnnotations()
      .then(setAnnotations)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="muted">Loading transactions…</p>;
  if (!annotations.length) return <p className="muted">No transactions yet.</p>;

  return (
    <div className="tx-table-wrapper">
      <table className="tx-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Label</th>
            <th>Tx Hash</th>
            <th>Rewarded</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {annotations.map((a) => (
            <tr key={a.id}>
              <td className="mono">{String(a.item_id).slice(0, 8)}…</td>
              <td>
                <span className="label-pill">{a.label}</span>
              </td>
              <td>
                {a.tx_hash ? (
                  <a
                    href={`https://sepolia.etherscan.io/tx/${a.tx_hash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="tx-link"
                  >
                    {a.tx_hash.slice(0, 12)}…
                  </a>
                ) : (
                  <span className="muted">—</span>
                )}
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
  );
}
