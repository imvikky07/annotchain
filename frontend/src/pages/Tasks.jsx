import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getTasks, getMyAnnotations } from "../api/client.js";

function weiToEth(wei) {
  return (Number(wei) / 1e18).toFixed(4);
}

function TaskCard({ task, annotatedItemIds, onStart }) {
  const reward = weiToEth(task.reward_per_annotation_wei);
  return (
    <div className="task-card">
      <div className="task-card-header">
        <h3>{task.title}</h3>
        <span className={`status-badge status-badge--${task.status}`}>{task.status}</span>
      </div>

      <p className="task-desc">{task.description || "No description provided."}</p>

      <div className="task-footer">
        <div className="task-meta">
          <span className="reward-badge">
            <span className="eth-glyph">Ξ</span> {reward} ETH
            <span className="reward-sub"> / annotation</span>
          </span>
        </div>
        <button className="start-btn" onClick={() => onStart(task.id)}>
          Annotate →
        </button>
      </div>
    </div>
  );
}

export default function Tasks() {
  const [tasks,           setTasks]           = useState([]);
  const [annotatedItems,  setAnnotatedItems]  = useState(new Set());
  const [loading,         setLoading]         = useState(true);
  const [search,          setSearch]          = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([getTasks(), getMyAnnotations()])
      .then(([t, anns]) => {
        setTasks(t);
        setAnnotatedItems(new Set(anns.map((a) => a.item_id)));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = tasks.filter((t) =>
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    (t.description || "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="page">
        <div className="skeleton-grid">
          {[1,2,3].map((i) => <div key={i} className="skeleton-card" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="tasks-header">
        <div>
          <h2>Available Tasks</h2>
          <p className="muted">{tasks.length} task{tasks.length !== 1 ? "s" : ""} available</p>
        </div>
        {tasks.length > 0 && (
          <div className="search-box">
            <span className="search-icon">⌕</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks…"
              className="search-input"
            />
          </div>
        )}
      </div>

      {tasks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h3>No tasks yet</h3>
          <p className="muted">An admin will publish tasks soon. Check back later.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <h3>No matches</h3>
          <p className="muted">Try a different search term.</p>
        </div>
      ) : (
        <div className="task-grid">
          {filtered.map((t) => (
            <TaskCard
              key={t.id}
              task={t}
              annotatedItemIds={annotatedItems}
              onStart={(id) => navigate(`/annotate/${id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
