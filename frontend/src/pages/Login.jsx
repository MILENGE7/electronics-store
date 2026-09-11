import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login, verify2FA } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [pendingToken, setPendingToken] = useState(null);
  const [totpCode, setTotpCode] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      const result = await login(form.email, form.password);
      if (result?.requires2FA) {
        setPendingToken(result.pendingToken);
        return;
      }
      navigate(result?.user?.role === "ADMIN" ? "/admin" : "/");
    } catch (err) {
      setError(err.response?.data?.error || "Login failed");
    }
  }

  async function handleVerify2FA(e) {
    e.preventDefault();
    setError("");
    try {
      await verify2FA(pendingToken, totpCode);
      navigate("/admin");
    } catch (err) {
      setError(err.response?.data?.error || "Invalid code");
    }
  }

  if (pendingToken) {
    return (
      <div className="auth-bg">
        <img src="/logo.webp?v=fktrading1" alt="" aria-hidden="true" className="auth-watermark" />
        <div className="page-main auth-page">
          <form onSubmit={handleVerify2FA} className="auth-form">
            <h1>Two-factor verification</h1>
            <p className="auth-sub">Enter the 6-digit code from your authenticator app.</p>
            {error && <p className="form-error">{error}</p>}
            <input placeholder="123456" value={totpCode} onChange={(e) => setTotpCode(e.target.value)} required />
            <button type="submit" className="btn btn-primary">Verify</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-bg">
      <img src="/logo.webp?v=fktrading1" alt="" aria-hidden="true" className="auth-watermark" />
      <div className="page-main auth-page">
        <form onSubmit={handleSubmit} className="auth-form">
          <h1>Sign in</h1>
          {error && <p className="form-error">{error}</p>}
          <input placeholder="Email" type="email" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <input placeholder="Password" type="password" value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          <button type="submit" className="btn btn-primary">Sign in</button>
        </form>
      </div>
    </div>
  );
}
