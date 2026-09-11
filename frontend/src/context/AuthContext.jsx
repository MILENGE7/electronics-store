import { createContext, useContext, useEffect, useState } from "react";
import api, { setUnauthorizedHandler } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });
  // True until the cached `user` above (plain localStorage JSON — a user
  // can hand-edit it, e.g. to set role: "ADMIN") has been confirmed against
  // the server. ProtectedRoute waits on this before gating on user.role, so
  // a tampered cache can't render admin-only UI even briefly.
  const [loading, setLoading] = useState(true);

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  }

  // A 401 on an authenticated request (expired/invalid/rotated-secret token)
  // logs the user out everywhere instead of leaving the UI silently broken.
  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get("/auth/me")
      .then(({ data }) => {
        setUser(data);
        localStorage.setItem("user", JSON.stringify(data));
      })
      .catch(() => {
        // Invalid/expired token — the 401 interceptor above already calls
        // logout(), but clear loading regardless of how this settles.
      })
      .finally(() => setLoading(false));
  }, []);

  // Returns { requires2FA: true, pendingToken } for 2FA-enabled admins instead
  // of logging in directly — caller must then call verify2FA with a TOTP code.
  async function login(email, password) {
    const { data } = await api.post("/auth/login", { email, password });
    if (data.requires2FA) return data;

    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    setUser(data.user);
    return data;
  }

  async function verify2FA(pendingToken, token) {
    const { data } = await api.post("/auth/2fa/login-verify", { pendingToken, token });
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    setUser(data.user);
  }

  async function register(email, password, name) {
    const { data } = await api.post("/auth/register", { email, password, name });
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    setUser(data.user);
  }

  // Merges a patch (e.g. a saved profile edit) into the cached user so the
  // UI reflects it immediately — the JWT itself isn't reissued, but nothing
  // security-relevant (id, role) is derived from these display fields.
  function updateUser(patch) {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem("user", JSON.stringify(next));
      } catch {
        // localStorage unavailable — the in-memory update below still applies for this session
      }
      return next;
    });
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, verify2FA, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
