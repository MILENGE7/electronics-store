import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../api/client";

// Opened from the emailed link: /reset-password?token=...
export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("The two passwords don't match.");
    setSaving(true);
    try {
      const { data } = await api.post("/auth/reset-password", { token, password });
      setDone(data.message);
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="auth-bg">
      <img src="/logo.webp?v=fktrading1" alt="" aria-hidden="true" className="auth-watermark" />
      <div className="page-main auth-page">
        <form onSubmit={handleSubmit} className="auth-form">
          <h1>Set a new password</h1>
          {!token ? (
            <p className="form-error">
              This reset link is incomplete. Please <Link to="/forgot-password">request a new one</Link>.
            </p>
          ) : done ? (
            <>
              <p className="auth-sub" role="status">{done}</p>
              <Link to="/login" className="btn btn-primary">
                Sign in
              </Link>
            </>
          ) : (
            <>
              {error && <p className="form-error">{error}</p>}
              <input
                placeholder="New password (min. 8 characters)"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <input
                placeholder="Confirm new password"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Saving…" : "Reset password"}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
