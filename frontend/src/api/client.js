const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

// ── Core fetch wrapper ────────────────────────────────────────────────
async function api(path, options = {}) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });

  if (res.status === 401) {
    localStorage.removeItem("token");
    window.location.href = "/login";
    throw new Error("Session expired. Please log in again.");
  }

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      msg = body.detail || JSON.stringify(body);
    } catch {
      msg = await res.text() || msg;
    }
    throw new Error(msg);
  }

  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : res.text();
}

// ── Token helpers ─────────────────────────────────────────────────────
export function parseToken() {
  const token = localStorage.getItem("token");
  if (!token) return null;
  try { return JSON.parse(atob(token.split(".")[1])); }
  catch { return null; }
}
export const getRole     = () => parseToken()?.role || null;
export const isAdmin     = () => getRole() === "admin";
export const isLoggedIn  = () => !!localStorage.getItem("token");
export const getUserId   = () => parseToken()?.sub || null;

// ── Auth ──────────────────────────────────────────────────────────────
export const registerUser = (body) =>
  api("/auth/register", { method: "POST", body: JSON.stringify(body) });

export const loginUser = async (username, password) => {
  const res = await fetch(`${BASE}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username, password }),
  });
  if (!res.ok) throw new Error("Invalid username or password");
  return res.json();
};

export const getMe = () => api("/auth/me");

// ── Tasks ─────────────────────────────────────────────────────────────
export const getTasks     = ()       => api("/tasks/");
export const getTask      = (id)     => api(`/tasks/${id}`);
export const getTaskItems = (id)     => api(`/tasks/${id}/items`);
export const createTask   = (body)   => api("/tasks/", { method: "POST", body: JSON.stringify(body) });
export const addTaskItem  = (id, body) => api(`/tasks/${id}/items`, { method: "POST", body: JSON.stringify(body) });
export const fundTask     = (id, eth) => api(`/tasks/${id}/fund?amount_eth=${eth}`, { method: "POST" });
export const getTaskBalance = (id)   => api(`/tasks/${id}/balance`);

// ── Annotations ───────────────────────────────────────────────────────
export const submitAnnotation    = (body)   => api("/annotations/", { method: "POST", body: JSON.stringify(body) });
export const getMyAnnotations    = ()       => api("/annotations/mine");
export const getTaskAnnotations  = (id)     => api(`/annotations/task/${id}`);

// ── Rewards ───────────────────────────────────────────────────────────
export const payReward         = (annId)   => api(`/rewards/pay/${annId}`, { method: "POST" });
export const payAllTaskRewards = (taskId)  => api(`/rewards/pay-task/${taskId}`, { method: "POST" });
export const getRewardHistory  = ()        => api("/rewards/history");

// ── Analytics ─────────────────────────────────────────────────────────
export const computeKappa    = (taskId) => api(`/analytics/kappa/${taskId}`, { method: "POST" });
export const getKappaHistory = (taskId) => api(`/analytics/kappa/${taskId}/history`);
export const exportJSON      = (taskId) => api(`/analytics/export/${taskId}`);
export const getOverview     = ()       => api("/analytics/overview");

export async function exportCSV(taskId) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE}/analytics/export/${taskId}/csv`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Export failed");
  const blob = await res.blob();
  const url  = URL.createObjectURL(blob);
  Object.assign(document.createElement("a"), {
    href: url, download: `annotations-${taskId.slice(0,8)}.csv`,
  }).click();
  URL.revokeObjectURL(url);
}
