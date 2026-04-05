import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registerUser, loginUser } from "../api/client.js";

function PasswordStrength({ password }) {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;
  const labels = ["", "Weak", "Fair", "Strong"];
  const colors = ["", "var(--red)", "var(--amber)", "var(--green)"];
  if (!password) return null;
  return (
    <div className="pw-strength">
      <div className="pw-bars">
        {[0,1,2].map((i) => (
          <div key={i} className="pw-bar" style={{ background: i < score ? colors[score] : "var(--border)" }} />
        ))}
      </div>
      <span style={{ color: colors[score], fontSize: "0.75rem" }}>{labels[score]}</span>
    </div>
  );
}

export default function Register() {
  const [form, setForm] = useState({
    username: "", email: "", password: "", wallet_address: "",
  });
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const navigate = useNavigate();

  function set(key) {
    return (e) => {
      setForm((f) => ({ ...f, [key]: e.target.value }));
      setErrors((er) => ({ ...er, [key]: null }));
    };
  }

  function validate() {
    const e = {};
    if (!form.username.trim())        e.username = "Username is required";
    else if (form.username.length < 3) e.username = "Min 3 characters";
    if (!form.email.includes("@"))    e.email    = "Enter a valid email";
    if (form.password.length < 8)     e.password = "Min 8 characters";
    if (form.wallet_address && !/^0x[0-9a-fA-F]{40}$/.test(form.wallet_address))
      e.wallet_address = "Invalid Ethereum address";
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setApiError(null);
    setLoading(true);
    try {
      await registerUser({ ...form, role: "annotator" });
      const { access_token } = await loginUser(form.username.trim(), form.password);
      localStorage.setItem("token", access_token);
      navigate("/tasks", { replace: true });
    } catch (err) {
      setApiError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card auth-card--wide">
        <div className="auth-logo">⬡</div>
        <h2>Create your account</h2>
        <p className="auth-sub">Start annotating and earning ETH rewards</p>

        {apiError && <div className="error-banner">{apiError}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-row">
            <label>
              Username
              <input
                value={form.username}
                onChange={set("username")}
                placeholder="annotator_42"
                autoFocus
              />
              {errors.username && <span className="field-error">{errors.username}</span>}
            </label>
            <label>
              Email
              <input
                type="email"
                value={form.email}
                onChange={set("email")}
                placeholder="you@example.com"
              />
              {errors.email && <span className="field-error">{errors.email}</span>}
            </label>
          </div>

          <label>
            Password
            <input
              type="password"
              value={form.password}
              onChange={set("password")}
              placeholder="Min 8 characters"
            />
            <PasswordStrength password={form.password} />
            {errors.password && <span className="field-error">{errors.password}</span>}
          </label>

          <label>
            Ethereum Wallet Address
            <input
              value={form.wallet_address}
              onChange={set("wallet_address")}
              placeholder="0x... (required to receive ETH rewards)"
              className={errors.wallet_address ? "input-error" : ""}
            />
            {errors.wallet_address
              ? <span className="field-error">{errors.wallet_address}</span>
              : <span className="field-hint">Your wallet receives ETH when rewards are paid out</span>
            }
          </label>

          <button type="submit" disabled={loading}>
            {loading ? "Creating account…" : "Create Account"}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
