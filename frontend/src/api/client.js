import axios from "axios";

// In local dev, Vite proxies relative "/api" requests to the backend (see
// vite.config.js). In production the frontend and backend are typically on
// different origins/hosts, so VITE_API_URL must point at the deployed
// backend's full URL, e.g. "https://your-api.onrender.com/api".
const baseURL = import.meta.env.VITE_API_URL || "/api";

const api = axios.create({ baseURL });

// Attach the JWT (if present) to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Set by AuthContext on mount. Called whenever an existing session's token
// is rejected as invalid/expired — never for a plain failed login attempt.
let onUnauthorized = null;
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

// Endpoints where a 401 means "wrong password/code" rather than "your
// session token is invalid/expired" — even on an otherwise perfectly valid,
// currently-attached session token. Covers both establishing a new session
// (login/register/2fa-login-verify) and re-proving identity on an existing
// one (2fa setup/disable, see auth.controller.js — both require the current
// password, and disable also requires a fresh TOTP code). A 401 from any of
// these must surface as an inline form error, not a global logout.
const AUTH_ENTRY_PATHS = [
  "/auth/login",
  "/auth/register",
  "/auth/2fa/login-verify",
  "/auth/2fa/setup",
  "/auth/2fa/disable",
];

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || "";
    const isAuthEntry = AUTH_ENTRY_PATHS.some((path) => url.includes(path));
    if (error.response?.status === 401 && !isAuthEntry) {
      onUnauthorized?.();
    }
    return Promise.reject(error);
  }
);

export default api;
