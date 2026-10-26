import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSending(true);
    try {
      const { data } = await api.post("/auth/forgot-password", { email });
      setMessage(data.message);
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="auth-bg">
      <img src="/logo.webp?v=fktrading1" alt="" aria-hidden="true" className="auth-watermark" />
      <div className="page-main auth-page">
        <form onSubmit={handleSubmit} className="auth-form">
          <h1>Forgot password</h1>
          {message ? (
            <p className="auth-sub" role="status">
              {message} The link expires in one hour.
            </p>
          ) : (
            <>
              <p className="auth-sub">Enter your account email and we'll send you a link to set a new password.</p>
              {error && <p className="form-error">{error}</p>}
              <input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <button type="submit" className="btn btn-primary" disabled={sending}>
                {sending ? "Sending…" : "Send reset link"}
              </button>
            </>
          )}
          <p className="auth-switch">
            Remembered it? <Link to="/login">Back to sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
