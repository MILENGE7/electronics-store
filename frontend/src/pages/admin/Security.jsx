import { useEffect, useState } from "react";
import api from "../../api/client";

export default function AdminSecurity() {
  const [status, setStatus] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [setupOpen, setSetupOpen] = useState(false);
  const [setupPassword, setSetupPassword] = useState("");

  const [disableOpen, setDisableOpen] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");
  const [disableCode, setDisableCode] = useState("");

  function loadStatus() {
    api.get("/auth/me").then((res) => setStatus(res.data));
  }

  useEffect(loadStatus, []);

  async function handleStartSetup(e) {
    e.preventDefault();
    setError("");
    try {
      const { data } = await api.post("/auth/2fa/setup", { password: setupPassword });
      setQrDataUrl(data.qrDataUrl);
      setSetupOpen(false);
      setSetupPassword("");
    } catch (err) {
      setError(err.response?.data?.error || "Could not start 2FA setup");
    }
  }

  async function handleConfirm(e) {
    e.preventDefault();
    setError("");
    try {
      await api.post("/auth/2fa/confirm", { token: code });
      setQrDataUrl(null);
      setCode("");
      setMessage("Two-factor authentication is now enabled.");
      loadStatus();
    } catch (err) {
      setError(err.response?.data?.error || "Invalid code");
    }
  }

  async function handleDisable(e) {
    e.preventDefault();
    setError("");
    try {
      await api.post("/auth/2fa/disable", { password: disablePassword, token: disableCode });
      setDisableOpen(false);
      setDisablePassword("");
      setDisableCode("");
      setMessage("Two-factor authentication has been disabled.");
      loadStatus();
    } catch (err) {
      setError(err.response?.data?.error || "Could not disable 2FA");
    }
  }

  if (!status) return <div className="page-main"><p>Loading...</p></div>;

  return (
    <div className="page-main auth-page">
      <h1>Security</h1>
      {message && <p style={{ color: "#2f8f4e", fontSize: "0.9rem" }}>{message}</p>}
      <p style={{ color: "var(--silver)" }}>
        Two-factor authentication: <strong style={{ color: "var(--graphite)" }}>{status.twoFactorEnabled ? "Enabled" : "Disabled"}</strong>
      </p>

      {status.twoFactorEnabled && !disableOpen && (
        <button onClick={() => { setDisableOpen(true); setError(""); setMessage(""); }} className="btn btn-outline">Disable 2FA</button>
      )}

      {disableOpen && (
        <form onSubmit={handleDisable} className="auth-form" style={{ marginTop: "1rem" }}>
          <p className="auth-sub">Confirm your password and current authenticator code to disable 2FA.</p>
          {error && <p className="form-error">{error}</p>}
          <input
            type="password"
            placeholder="Current password"
            value={disablePassword}
            onChange={(e) => setDisablePassword(e.target.value)}
            autoComplete="current-password"
            required
          />
          <input
            placeholder="123456"
            value={disableCode}
            onChange={(e) => setDisableCode(e.target.value)}
            required
          />
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button type="submit" className="btn btn-primary">Confirm disable</button>
            <button type="button" className="btn btn-outline" onClick={() => { setDisableOpen(false); setDisablePassword(""); setDisableCode(""); setError(""); }}>Cancel</button>
          </div>
        </form>
      )}

      {!status.twoFactorEnabled && !qrDataUrl && !setupOpen && (
        <button onClick={() => { setSetupOpen(true); setError(""); setMessage(""); }} className="btn btn-primary">Set up 2FA</button>
      )}

      {setupOpen && (
        <form onSubmit={handleStartSetup} className="auth-form" style={{ marginTop: "1rem" }}>
          <p className="auth-sub">Confirm your password to begin 2FA setup.</p>
          {error && <p className="form-error">{error}</p>}
          <input
            type="password"
            placeholder="Current password"
            value={setupPassword}
            onChange={(e) => setSetupPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button type="submit" className="btn btn-primary">Continue</button>
            <button type="button" className="btn btn-outline" onClick={() => { setSetupOpen(false); setSetupPassword(""); setError(""); }}>Cancel</button>
          </div>
        </form>
      )}

      {qrDataUrl && (
        <form onSubmit={handleConfirm} className="auth-form" style={{ marginTop: "1rem" }}>
          <p className="auth-sub">Scan this QR code with an authenticator app, then enter the 6-digit code to confirm.</p>
          <img src={qrDataUrl} alt="2FA QR code" style={{ borderRadius: "8px", border: "1px solid var(--hairline)" }} />
          {error && <p className="form-error">{error}</p>}
          <input placeholder="123456" value={code} onChange={(e) => setCode(e.target.value)} required />
          <button type="submit" className="btn btn-primary">Confirm and enable</button>
        </form>
      )}
    </div>
  );
}
