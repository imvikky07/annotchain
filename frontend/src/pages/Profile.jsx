import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMe } from "../api/client.js";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";
const SEPOLIA = "https://sepolia.etherscan.io/address/";

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button className="copy-btn" onClick={copy} title="Copy to clipboard">
      {copied ? "✓ Copied" : "Copy"}
    </button>
  );
}

function Section({ title, children }) {
  return (
    <div className="profile-section">
      <h3 className="profile-section-title">{title}</h3>
      {children}
    </div>
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const [me, setMe]             = useState(null);
  const [loading, setLoading]   = useState(true);

  // Edit wallet form
  const [wallet, setWallet]     = useState("");
  const [walletErr, setWalletErr] = useState(null);
  const [walletSaving, setWalletSaving] = useState(false);
  const [walletSaved, setWalletSaved]   = useState(false);

  // Change password form
  const [pwForm, setPwForm]     = useState({ current: "", next: "", confirm: "" });
  const [pwErr, setPwErr]       = useState(null);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSaved, setPwSaved]   = useState(false);

  useEffect(() => {
    getMe()
      .then((u) => { setMe(u); setWallet(u.wallet_address || ""); })
      .catch(() => navigate("/login"))
      .finally(() => setLoading(false));
  }, []);

  // ── Save wallet ────────────────────────────────────────────────────
  async function saveWallet(e) {
    e.preventDefault();
    setWalletErr(null);
    if (wallet && !/^0x[0-9a-fA-F]{40}$/.test(wallet)) {
      setWalletErr("Invalid Ethereum address — must start with 0x followed by 40 hex characters");
      return;
    }
    setWalletSaving(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE}/auth/wallet`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ wallet_address: wallet || null }),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated = await res.json();
      setMe(updated);
      setWalletSaved(true);
      setTimeout(() => setWalletSaved(false), 3000);
    } catch (err) {
      setWalletErr(err.message);
    } finally {
      setWalletSaving(false);
    }
  }

  // ── Change password ────────────────────────────────────────────────
  async function changePassword(e) {
    e.preventDefault();
    setPwErr(null);
    if (pwForm.next.length < 8)            { setPwErr("New password must be at least 8 characters"); return; }
    if (pwForm.next !== pwForm.confirm)    { setPwErr("Passwords do not match"); return; }
    setPwSaving(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE}/auth/password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ current_password: pwForm.current, new_password: pwForm.next }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || "Password change failed");
      }
      setPwForm({ current: "", next: "", confirm: "" });
      setPwSaved(true);
      setTimeout(() => setPwSaved(false), 3000);
    } catch (err) {
      setPwErr(err.message);
    } finally {
      setPwSaving(false);
    }
  }

  if (loading) return <div className="page"><div className="loading-shimmer" /></div>;
  if (!me)     return null;

  const initials = me.username.slice(0, 2).toUpperCase();

  return (
    <div className="page profile-page">
      {/* Header */}
      <div className="profile-header">
        <div className="profile-avatar">{initials}</div>
        <div>
          <h2>{me.username}</h2>
          <p className="muted">{me.email} · <span className="role-chip role-chip--{me.role}">{me.role}</span></p>
          <p className="muted" style={{ fontSize: "0.78rem", marginTop: "0.25rem" }}>
            Member since {new Date(me.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long" })}
          </p>
        </div>
      </div>

      {/* Wallet section */}
      <Section title="Ethereum Wallet">
        <div className="wallet-explainer">
          <p>Your wallet address is where ETH rewards are sent after you complete annotations. You need a wallet to receive payments.</p>
          <a href="https://metamask.io" target="_blank" rel="noreferrer" className="wallet-get-link">
            Don't have a wallet? Get MetaMask free →
          </a>
        </div>

        {me.wallet_address ? (
          <div className="wallet-connected">
            <div className="wallet-status-row">
              <span className="wallet-dot" />
              <span className="wallet-status-text">Wallet connected</span>
            </div>
            <div className="wallet-address-row">
              <span className="wallet-addr mono">{me.wallet_address}</span>
              <CopyButton text={me.wallet_address} />
              <a
                href={`${SEPOLIA}${me.wallet_address}`}
                target="_blank" rel="noreferrer"
                className="wallet-etherscan-link"
              >
                View on Etherscan ↗
              </a>
            </div>
          </div>
        ) : (
          <div className="wallet-missing">
            ⚠ No wallet connected — you won't receive ETH rewards until you add one.
          </div>
        )}

        <form className="profile-form" onSubmit={saveWallet}>
          <label className="profile-label">
            {me.wallet_address ? "Update wallet address" : "Add wallet address"}
            <div className="wallet-input-row">
              <input
                value={wallet}
                onChange={(e) => { setWallet(e.target.value); setWalletErr(null); }}
                placeholder="0x..."
                className={walletErr ? "input-error" : ""}
                spellCheck={false}
              />
            </div>
            {walletErr && <span className="field-error">{walletErr}</span>}
          </label>

          <div className="wallet-how-to">
            <strong>How to find your wallet address:</strong>
            <ol>
              <li>Install <a href="https://metamask.io" target="_blank" rel="noreferrer">MetaMask</a> browser extension (free)</li>
              <li>Create or import a wallet</li>
              <li>Click your account name at the top of MetaMask</li>
              <li>Click the copy icon next to your address (starts with <code>0x</code>)</li>
              <li>Paste it here</li>
            </ol>
          </div>

          <div className="form-actions">
            <button type="submit" disabled={walletSaving} className="profile-save-btn">
              {walletSaving ? "Saving…" : walletSaved ? "✓ Saved" : "Save Wallet Address"}
            </button>
          </div>
        </form>
      </Section>

      {/* Account info (read-only) */}
      <Section title="Account Info">
        <div className="info-grid">
          <div className="info-row">
            <span className="info-label">Username</span>
            <div className="info-value-row">
              <span className="info-value mono">{me.username}</span>
            </div>
          </div>
          <div className="info-row">
            <span className="info-label">Email</span>
            <span className="info-value">{me.email}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Role</span>
            <span className={`role-chip role-chip--${me.role}`}>{me.role}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Account ID</span>
            <span className="info-value mono muted">{me.id}</span>
          </div>
        </div>
      </Section>

      {/* Change password */}
      <Section title="Change Password">
        {pwSaved && <div className="success-inline">✓ Password changed successfully</div>}
        {pwErr   && <div className="error-banner" style={{ marginBottom: "1rem" }}>{pwErr}</div>}
        <form className="profile-form" onSubmit={changePassword}>
          <label className="profile-label">
            Current Password
            <input
              type="password"
              value={pwForm.current}
              onChange={(e) => setPwForm(f => ({ ...f, current: e.target.value }))}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </label>
          <div className="form-row-2">
            <label className="profile-label">
              New Password
              <input
                type="password"
                value={pwForm.next}
                onChange={(e) => setPwForm(f => ({ ...f, next: e.target.value }))}
                placeholder="Min 8 characters"
                autoComplete="new-password"
              />
            </label>
            <label className="profile-label">
              Confirm New Password
              <input
                type="password"
                value={pwForm.confirm}
                onChange={(e) => setPwForm(f => ({ ...f, confirm: e.target.value }))}
                placeholder="Repeat password"
                autoComplete="new-password"
              />
            </label>
          </div>
          <div className="form-actions">
            <button type="submit" disabled={pwSaving || !pwForm.current || !pwForm.next} className="profile-save-btn">
              {pwSaving ? "Updating…" : "Change Password"}
            </button>
          </div>
        </form>
      </Section>

      {/* Danger zone */}
      <Section title="Account">
        <div className="danger-zone">
          <div>
            <strong>Sign out of all sessions</strong>
            <p className="muted">This clears your session token from this browser.</p>
          </div>
          <button
            className="btn-danger"
            onClick={() => { localStorage.removeItem("token"); navigate("/login"); }}
          >
            Sign Out
          </button>
        </div>
      </Section>
    </div>
  );
}
