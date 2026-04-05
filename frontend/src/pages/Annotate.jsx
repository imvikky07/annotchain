import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getTask, getTaskItems, getMyAnnotations, submitAnnotation } from "../api/client.js";

const SEPOLIA = "https://sepolia.etherscan.io/tx/";

function ProgressBar({ current, total }) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  return (
    <div className="ann-progress">
      <div className="ann-progress-bar">
        <div className="ann-progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="ann-progress-label">{current} / {total}</span>
    </div>
  );
}

function TxBadge({ txHash }) {
  if (!txHash) return null;
  return (
    <a
      href={`${SEPOLIA}${txHash}`}
      target="_blank"
      rel="noreferrer"
      className="tx-badge"
      title="View on Etherscan"
    >
      <span className="tx-dot" />
      On-chain · {txHash.slice(0, 10)}…{txHash.slice(-6)}
      <span className="tx-arrow">↗</span>
    </a>
  );
}

export default function Annotate() {
  const { taskId } = useParams();
  const navigate   = useNavigate();

  const [task,     setTask]     = useState(null);
  const [items,    setItems]    = useState([]);
  const [cursor,   setCursor]   = useState(0);
  const [selected, setSelected] = useState(null);
  const [phase,    setPhase]    = useState("idle"); // idle|submitting|success|error|already_done
  const [txHash,   setTxHash]   = useState(null);
  const [errMsg,   setErrMsg]   = useState("");
  const [skipped,  setSkipped]  = useState(new Set()); // item ids already annotated by user
  const [done,     setDone]     = useState(false);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Promise.all([getTask(taskId), getTaskItems(taskId), getMyAnnotations()])
      .then(([t, its, mine]) => {
        setTask(t);
        const annotatedIds = new Set(mine.map((a) => String(a.item_id)));
        setItems(its);
        setSkipped(annotatedIds);
        // Skip to first unannotated item
        const firstPending = its.findIndex((i) => !annotatedIds.has(String(i.id)));
        if (firstPending === -1) setDone(true);
        else setCursor(firstPending);
      })
      .catch(() => navigate("/tasks"))
      .finally(() => setLoading(false));
  }, [taskId]);

  // Keyboard shortcut: 1-9 selects label, Enter submits
  useEffect(() => {
    function handleKey(e) {
      if (phase !== "idle") return;
      const item = items[cursor];
      if (!item) return;
      const labels = item.labels || [];
      const num = parseInt(e.key);
      if (num >= 1 && num <= labels.length) setSelected(labels[num - 1]);
      if (e.key === "Enter" && selected) handleSubmit();
      if (e.key === "ArrowRight" && phase === "success") advance();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [phase, cursor, items, selected]);

  async function handleSubmit() {
    if (!selected || phase === "submitting") return;
    setPhase("submitting");
    setErrMsg("");
    try {
      const result = await submitAnnotation({ item_id: items[cursor].id, label: selected });
      setTxHash(result.tx_hash);
      setSkipped((s) => new Set([...s, String(items[cursor].id)]));
      setPhase("success");
    } catch (err) {
      if (err.message.includes("already annotated")) {
        setPhase("already_done");
        setSkipped((s) => new Set([...s, String(items[cursor].id)]));
      } else {
        setErrMsg(err.message || "Submission failed");
        setPhase("error");
      }
    }
  }

  function advance() {
    const nextIdx = items.findIndex(
      (item, idx) => idx > cursor && !skipped.has(String(item.id))
    );
    if (nextIdx === -1) { setDone(true); return; }
    setCursor(nextIdx);
    setSelected(null);
    setPhase("idle");
    setTxHash(null);
    setErrMsg("");
  }

  const completedCount  = items.filter((i) => skipped.has(String(i.id))).length;
  const pendingCount    = items.length - completedCount;

  if (loading) return <div className="page"><div className="loading-shimmer" /></div>;

  if (done || pendingCount === 0) {
    return (
      <div className="page centered">
        <div className="completion-card">
          <div className="completion-icon">✓</div>
          <h2>Task complete!</h2>
          <p>You labeled <strong>{completedCount}</strong> item{completedCount !== 1 ? "s" : ""}.</p>
          <p className="muted" style={{ marginTop: "0.5rem" }}>
            All annotations are immutably recorded on Sepolia. Rewards are paid after admin validates agreement.
          </p>
          <div className="completion-actions">
            <button onClick={() => navigate("/tasks")}>Browse More Tasks</button>
            <button className="btn-outline" onClick={() => navigate("/dashboard")}>View My Work</button>
          </div>
        </div>
      </div>
    );
  }

  const item   = items[cursor];
  const labels = item?.labels || [];

  return (
    <div className="page ann-page">
      {/* Top bar */}
      <div className="ann-topbar">
        <div className="ann-topbar-left">
          <button className="ann-back" onClick={() => navigate("/tasks")}>← Tasks</button>
          <div>
            <h2 className="ann-title">{task?.title}</h2>
            <p className="ann-desc muted">{task?.description}</p>
          </div>
        </div>
        <div className="ann-topbar-right">
          <span className="ann-stat"><strong>{completedCount}</strong> done</span>
          <span className="ann-stat"><strong>{pendingCount}</strong> remaining</span>
        </div>
      </div>

      <ProgressBar current={completedCount} total={items.length} />

      {/* Item card */}
      <div className="ann-item-card">
        <div className="ann-item-meta">
          <span className="ann-item-type">{item?.item_type?.toUpperCase()}</span>
          <span className="ann-item-num">Item {cursor + 1} of {items.length}</span>
        </div>
        <div className="ann-item-body">{item?.content}</div>
      </div>

      {/* Labels */}
      <div className="ann-labels-section">
        <p className="ann-labels-hint">
          Select a label
          <span className="keyboard-hint"> — or press <kbd>1</kbd>–<kbd>{labels.length}</kbd></span>
        </p>
        <div className="ann-labels">
          {labels.map((label, idx) => (
            <button
              key={label}
              className={`ann-label-btn ${selected === label ? "ann-label-btn--selected" : ""}`}
              onClick={() => phase === "idle" && setSelected(label)}
              disabled={phase === "submitting" || phase === "success" || phase === "already_done"}
            >
              <span className="label-key">{idx + 1}</span>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Action zone */}
      <div className="ann-actions">
        {phase === "idle" || phase === "error" ? (
          <>
            <button
              className="ann-submit-btn"
              onClick={handleSubmit}
              disabled={!selected}
            >
              Submit Annotation
            </button>
            {phase === "error" && (
              <div className="error-banner" style={{ marginTop: "0.75rem" }}>
                {errMsg}
              </div>
            )}
          </>
        ) : phase === "submitting" ? (
          <button className="ann-submit-btn" disabled>
            <span className="spinner" /> Sending to blockchain…
          </button>
        ) : phase === "success" || phase === "already_done" ? (
          <div className="ann-success-zone">
            {phase === "success" ? (
              <>
                <div className="ann-success-msg">✓ Annotation recorded</div>
                <TxBadge txHash={txHash} />
              </>
            ) : (
              <div className="ann-already-msg">Already annotated — skipping</div>
            )}
            <button className="ann-next-btn" onClick={advance}>
              {pendingCount <= 1 ? "Finish" : "Next →"}
              <span className="keyboard-hint"> <kbd>→</kbd></span>
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
