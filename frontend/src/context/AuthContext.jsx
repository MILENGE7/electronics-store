import { createContext, useContext, useState } from "react";
import api from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });

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

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, verify2FA, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
