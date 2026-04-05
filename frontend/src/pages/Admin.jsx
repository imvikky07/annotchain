import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { isAdmin, getTasks, createTask, addTaskItem, fundTask, computeKappa, exportJSON, exportCSV, getOverview, payAllTaskRewards, getTaskItems, getTaskAnnotations } from "../api/client.js";
import AgreementChart from "../components/AgreementChart.jsx";

// ── Shared form field ─────────────────────────────────────────────────
function Field({ label, hint, error, children }) {
  return (
    <label className="admin-field">
      <span className="admin-field-label">{label}</span>
      {children}
      {hint  && !error && <span className="field-hint">{hint}</span>}
      {error && <span className="field-error">{error}</span>}
    </label>
  );
}

// ── Toast notification ────────────────────────────────────────────────
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [message]);
  if (!message) return null;
  return (
    <div className={`toast toast--${type}`}>
      {type === "success" ? "✓" : "✕"} {message}
      <button className="toast-close" onClick={onClose}>×</button>
    </div>
  );
}

// ── Section: Overview ─────────────────────────────────────────────────
function OverviewSection({ overview }) {
  if (!overview) return null;
  const stats = [
    { label: "Tasks",             value: overview.total_tasks },
    { label: "Annotations",       value: overview.total_annotations },
    { label: "Annotators",        value: overview.total_annotators },
    { label: "On-chain txns",     value: overview.on_chain_confirmed },
    { label: "Rewards paid",      value: overview.total_rewards_paid },
  ];
  return (
    <div className="overview-strip">
      {stats.map((s) => (
        <div key={s.label} className="overview-stat">
          <span className="overview-val">{s.value}</span>
          <span className="overview-lbl">{s.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Tab: Create Task ──────────────────────────────────────────────────
function CreateTaskTab({ onCreated, notify }) {
  const [form, setForm] = useState({ title: "", description: "", reward_per_annotation_eth: "0.0001" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  function set(k) { return (e) => { setForm(f => ({...f, [k]: e.target.value})); setErrors(er => ({...er, [k]: null})); }; }

  function validate() {
    const e = {};
    if (!form.title.trim())                                 e.title  = "Title is required";
    if (isNaN(form.reward_per_annotation_eth) || Number(form.reward_per_annotation_eth) <= 0)
                                                            e.reward = "Enter a valid positive number";
    return e;
  }

  async function submit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      const task = await createTask({
        title: form.title.trim(),
        description: form.description.trim(),
        reward_per_annotation_eth: parseFloat(form.reward_per_annotation_eth),
      });
      notify("success", `Task "${task.title}" created and registered on-chain!`);
      setForm({ title: "", description: "", reward_per_annotation_eth: "0.0001" });
      onCreated();
    } catch (err) {
      notify("error", err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="admin-form" onSubmit={submit} noValidate>
      <Field label="Task Title" error={errors.title}>
        <input value={form.title} onChange={set("title")} placeholder="e.g. Sentiment Analysis — Product Reviews" autoFocus />
      </Field>
      <Field label="Description" hint="Explain to annotators what they should do and how to decide">
        <textarea value={form.description} onChange={set("description")} rows={4} placeholder="Label each sentence based on the expressed sentiment…" />
      </Field>
      <Field label="Reward per Annotation (ETH)" error={errors.reward} hint="Each annotator receives this amount for every label they submit">
        <div className="input-with-unit">
          <input type="number" step="0.0001" min="0.0001" value={form.reward_per_annotation_eth} onChange={set("reward_per_annotation_eth")} />
          <span className="input-unit">ETH</span>
        </div>
      </Field>
      <button type="submit" className="admin-submit-btn" disabled={loading}>
        {loading ? "Creating on-chain…" : "Create Task"}
      </button>
    </form>
  );
}

// ── Tab: Add Items ────────────────────────────────────────────────────
function AddItemsTab({ tasks, notify }) {
  const [taskId,      setTaskId]      = useState("");
  const [content,     setContent]     = useState("");
  const [labels,      setLabels]      = useState("positive, negative, neutral");
  const [expertLabel, setExpertLabel] = useState("");
  const [loading,     setLoading]     = useState(false);
  const [added,       setAdded]       = useState(0);
  const [existingItems, setExistingItems] = useState([]);

  async function loadItems(tid) {
    setTaskId(tid);
    if (!tid) { setExistingItems([]); return; }
    try {
      const items = await getTaskItems(tid);
      setExistingItems(items);
    } catch { setExistingItems([]); }
  }

  async function submit(e) {
    e.preventDefault();
    if (!taskId || !content.trim()) return;
    const labelsArr = labels.split(",").map(l => l.trim()).filter(Boolean);
    if (labelsArr.length < 2) { notify("error", "At least 2 labels required"); return; }
    setLoading(true);
    try {
      const item = await addTaskItem(taskId, {
        content: content.trim(),
        item_type: "text",
        labels: labelsArr,
        expert_label: expertLabel.trim() || null,
      });
      setAdded(a => a + 1);
      setExistingItems(ei => [...ei, item]);
      setContent(""); setExpertLabel("");
      notify("success", `Item ${added + 1} added successfully`);
    } catch (err) {
      notify("error", err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="split-layout">
      <form className="admin-form" onSubmit={submit} noValidate>
        <Field label="Task">
          <select value={taskId} onChange={(e) => loadItems(e.target.value)} required>
            <option value="">— select a task —</option>
            {tasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
        </Field>
        <Field label="Content" hint="The text sentence or passage the annotator will label">
          <textarea value={content} onChange={e => setContent(e.target.value)} rows={4} placeholder="e.g. The delivery was extremely fast and the product works perfectly!" required />
        </Field>
        <Field label="Labels (comma-separated)" hint="All possible categories annotators can choose from">
          <input value={labels} onChange={e => setLabels(e.target.value)} placeholder="positive, negative, neutral" required />
        </Field>
        <Field label="Expert Label (ground truth)" hint="Used to compute annotator reliability score. Leave blank if unknown.">
          <input value={expertLabel} onChange={e => setExpertLabel(e.target.value)} placeholder="e.g. positive" />
        </Field>
        <button type="submit" className="admin-submit-btn" disabled={loading || !taskId || !content.trim()}>
          {loading ? "Adding…" : `Add Item ${added > 0 ? `(${added} added)` : ""}`}
        </button>
      </form>

      <div className="items-preview">
        <h4>Items in task <span className="muted">({existingItems.length})</span></h4>
        {existingItems.length === 0
          ? <p className="muted">No items yet.</p>
          : <div className="items-list">
              {existingItems.map((it, i) => (
                <div key={it.id} className="item-preview-row">
                  <span className="item-num">{i + 1}</span>
                  <div>
                    <p className="item-preview-text">{it.content}</p>
                    <div className="item-preview-meta">
                      {(it.labels || []).map(l => <span key={l} className="label-pill">{l}</span>)}
                      {it.expert_label && <span className="expert-pill">GT: {it.expert_label}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
        }
      </div>
    </div>
  );
}

// ── Tab: Fund Contract ────────────────────────────────────────────────
function FundTab({ tasks, notify }) {
  const [taskId,  setTaskId]  = useState("");
  const [amount,  setAmount]  = useState("0.01");
  const [loading, setLoading] = useState(false);
  const [txHash,  setTxHash]  = useState(null);

  async function submit(e) {
    e.preventDefault();
    if (!taskId) return;
    setLoading(true); setTxHash(null);
    try {
      const result = await fundTask(taskId, parseFloat(amount));
      setTxHash(result.tx_hash);
      notify("success", `Deposited ${amount} ETH into contract`);
    } catch (err) {
      notify("error", err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="admin-form" onSubmit={submit} noValidate>
      <div className="info-box">
        <strong>Why fund the contract?</strong>
        <p>The smart contract holds ETH in escrow. When you pay annotator rewards, funds are pulled from this balance. Always fund before paying rewards.</p>
      </div>
      <Field label="Task">
        <select value={taskId} onChange={e => setTaskId(e.target.value)} required>
          <option value="">— select a task —</option>
          {tasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
        </select>
      </Field>
      <Field label="Amount to deposit (ETH)" hint="This ETH is sent from your wallet to the smart contract">
        <div className="input-with-unit">
          <input type="number" step="0.001" min="0.001" value={amount} onChange={e => setAmount(e.target.value)} required />
          <span className="input-unit">ETH</span>
        </div>
      </Field>
      <button type="submit" className="admin-submit-btn" disabled={loading || !taskId}>
        {loading ? "Depositing on-chain…" : "Fund Contract"}
      </button>
      {txHash && (
        <a href={`https://sepolia.etherscan.io/tx/${txHash}`} target="_blank" rel="noreferrer" className="tx-result-link">
          ✓ Transaction confirmed · View on Etherscan ↗
        </a>
      )}
    </form>
  );
}

// ── Tab: Analytics ────────────────────────────────────────────────────
function AnalyticsTab({ tasks, notify }) {
  const [taskId,     setTaskId]     = useState("");
  const [kappaData,  setKappaData]  = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const [payResults, setPayResults] = useState(null);
  const [annCount,   setAnnCount]   = useState(null);

  async function loadTaskStats(tid) {
    setTaskId(tid);
    setKappaData(null); setPayResults(null); setAnnCount(null);
    if (!tid) return;
    try {
      const anns = await getTaskAnnotations(tid);
      setAnnCount(anns.length);
    } catch { setAnnCount(0); }
  }

  async function handleKappa() {
    if (!taskId) return;
    setLoading(true); setKappaData(null);
    try {
      const data = await computeKappa(taskId);
      setKappaData(data);
      notify("success", `Fleiss' κ = ${data.fleiss_kappa} (${data.interpretation})`);
    } catch (err) {
      notify("error", "Kappa failed: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handlePayAll() {
    if (!taskId) return;
    setPayLoading(true); setPayResults(null);
    try {
      const result = await payAllTaskRewards(taskId);
      setPayResults(result.results);
      const paid = result.results.filter(r => r.status === "paid").length;
      notify("success", `${paid} reward${paid !== 1 ? "s" : ""} paid on-chain`);
    } catch (err) {
      notify("error", err.message);
    } finally {
      setPayLoading(false);
    }
  }

  async function handleExport(fmt) {
    if (!taskId) return;
    try {
      if (fmt === "csv") { await exportCSV(taskId); }
      else {
        const data = await exportJSON(taskId);
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url  = URL.createObjectURL(blob);
        Object.assign(document.createElement("a"), { href: url, download: `annotations-${taskId.slice(0,8)}.json` }).click();
        URL.revokeObjectURL(url);
      }
      notify("success", `${fmt.toUpperCase()} exported`);
    } catch (err) {
      notify("error", err.message);
    }
  }

  return (
    <div className="analytics-layout">
      <div className="analytics-controls">
        <Field label="Task">
          <select value={taskId} onChange={e => loadTaskStats(e.target.value)}>
            <option value="">— select a task —</option>
            {tasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
        </Field>

        {annCount !== null && (
          <div className="ann-count-badge">
            {annCount} annotation{annCount !== 1 ? "s" : ""} collected
          </div>
        )}

        <div className="analytics-btns">
          <button className="admin-submit-btn" onClick={handleKappa} disabled={!taskId || loading}>
            {loading ? "Computing…" : "Compute Fleiss' κ"}
          </button>
          <button className="admin-submit-btn btn-pay" onClick={handlePayAll} disabled={!taskId || payLoading}>
            {payLoading ? "Paying…" : "Pay All Rewards"}
          </button>
          <div className="export-row">
            <button className="btn-export" onClick={() => handleExport("json")} disabled={!taskId}>Export JSON</button>
            <button className="btn-export" onClick={() => handleExport("csv")}  disabled={!taskId}>Export CSV</button>
          </div>
        </div>

        {payResults && (
          <div className="pay-results">
            {payResults.map((r, i) => (
              <div key={i} className={`pay-result-row ${r.status === "paid" ? "paid" : "skipped"}`}>
                <span>{r.status === "paid" ? "✓" : "—"}</span>
                <span className="mono">{r.annotation_id?.slice(0,10)}…</span>
                <span>{r.status}</span>
                {r.tx_hash && (
                  <a href={`https://sepolia.etherscan.io/tx/${r.tx_hash}`} target="_blank" rel="noreferrer" className="tx-link">↗</a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="analytics-chart-area">
        {kappaData
          ? <AgreementChart data={kappaData} />
          : <div className="chart-placeholder">
              <span>Select a task and click<br />"Compute Fleiss' κ"</span>
            </div>
        }
      </div>
    </div>
  );
}

// ── Main Admin page ───────────────────────────────────────────────────
const TABS = [
  { id: "overview",  label: "Overview"       },
  { id: "tasks",     label: "Create Task"    },
  { id: "items",     label: "Add Items"      },
  { id: "fund",      label: "Fund Contract"  },
  { id: "analytics", label: "Analytics"      },
];

export default function Admin() {
  const navigate = useNavigate();
  const [tab,      setTab]      = useState("overview");
  const [tasks,    setTasks]    = useState([]);
  const [overview, setOverview] = useState(null);
  const [toast,    setToast]    = useState({ message: null, type: "success" });

  useEffect(() => {
    if (!isAdmin()) { navigate("/tasks", { replace: true }); return; }
    loadData();
  }, []);

  function loadData() {
    getTasks().then(setTasks).catch(console.error);
    getOverview().then(setOverview).catch(console.error);
  }

  function notify(type, message) {
    setToast({ type, message });
  }

  return (
    <div className="page admin-page">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: null })} />

      <div className="admin-header">
        <div>
          <h2>Admin Panel</h2>
          <p className="muted">Manage tasks, annotate data, validate agreement, distribute rewards</p>
        </div>
        <span className="admin-badge">Admin</span>
      </div>

      <OverviewSection overview={overview} />

      <div className="admin-tabs">
        {TABS.map(t => (
          <button key={t.id} className={`tab-btn ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="admin-panel">
        {tab === "overview"  && (
          <div className="overview-tab">
            <p className="muted" style={{ marginBottom: "1.5rem" }}>
              Use the tabs above to manage your annotation pipeline end-to-end:
              create tasks → add data items → fund the contract → collect annotations → compute agreement → pay rewards → export for research.
            </p>
            <div className="pipeline-steps">
              {[
                ["1", "Create Task",     "Register task on Ethereum. Set reward per annotation."],
                ["2", "Add Items",       "Upload text items annotators will label. Add expert ground-truth labels."],
                ["3", "Fund Contract",   "Deposit ETH so rewards can be paid out on-chain."],
                ["4", "Annotators Work", "Share the platform URL. Annotators browse tasks and submit labels."],
                ["5", "Analytics",       "Compute Fleiss' κ, check agreement, pay all rewards, export CSV/JSON."],
              ].map(([n, title, desc]) => (
                <div key={n} className="pipeline-step">
                  <div className="pipeline-num">{n}</div>
                  <div>
                    <strong>{title}</strong>
                    <p className="muted">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {tab === "tasks"     && <CreateTaskTab onCreated={loadData} notify={notify} />}
        {tab === "items"     && <AddItemsTab   tasks={tasks}        notify={notify} />}
        {tab === "fund"      && <FundTab        tasks={tasks}        notify={notify} />}
        {tab === "analytics" && <AnalyticsTab   tasks={tasks}        notify={notify} />}
      </div>
    </div>
  );
}
