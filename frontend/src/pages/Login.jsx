import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { loginUser } from "../api/client.js";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState(null);
  const [loading,  setLoading]  = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setError(null);
    setLoading(true);
    try {
      const { access_token } = await loginUser(username.trim(), password);
      localStorage.setItem("token", access_token);
      // Redirect admin to admin panel, annotators to tasks
      const payload = JSON.parse(atob(access_token.split(".")[1]));
      navigate(payload.role === "admin" ? "/admin" : "/tasks", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">⬡</div>
        <h2>Welcome back</h2>
        <p className="auth-sub">Sign in to your AnnotChain account</p>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit}>
          <label>
            Username
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="your_username"
              autoComplete="username"
              autoFocus
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </label>
          <button type="submit" disabled={loading || !username || !password}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p className="auth-footer">
          No account? <Link to="/register">Create one free</Link>
        </p>
      </div>
    </div>
  );
}
