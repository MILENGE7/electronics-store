import { useEffect, useState } from "react";
import api from "../../api/client";

export default function AdminSecurity() {
  const [status, setStatus] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function loadStatus() {
    api.get("/auth/me").then((res) => setStatus(res.data));
  }

  useEffect(loadStatus, []);

  async function handleStartSetup() {
    setError("");
    const { data } = await api.post("/auth/2fa/setup");
    setQrDataUrl(data.qrDataUrl);
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

  async function handleDisable() {
    await api.post("/auth/2fa/disable");
    setMessage("Two-factor authentication has been disabled.");
    loadStatus();
  }

  if (!status) return <div className="page-main"><p>Loading...</p></div>;

  return (
    <div className="page-main auth-page">
      <h1>Security</h1>
      {message && <p style={{ color: "#2f8f4e", fontSize: "0.9rem" }}>{message}</p>}
      <p style={{ color: "var(--silver)" }}>
        Two-factor authentication: <strong style={{ color: "var(--graphite)" }}>{status.twoFactorEnabled ? "Enabled" : "Disabled"}</strong>
      </p>

      {status.twoFactorEnabled && (
        <button onClick={handleDisable} className="btn btn-outline">Disable 2FA</button>
      )}

      {!status.twoFactorEnabled && !qrDataUrl && (
        <button onClick={handleStartSetup} className="btn btn-primary">Set up 2FA</button>
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
