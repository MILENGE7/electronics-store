const { rateLimit, ipKeyGenerator } = require("express-rate-limit");

const WINDOW_MS = 15 * 60 * 1000;
const message = { error: "Too many attempts, please wait a few minutes and try again" };

// Login/register: keyed by IP + email rather than IP alone. Mobile carriers
// put many customers behind one shared IP, so an IP-only limit would lock
// out unrelated shoppers; this still stops password guessing on an account.
const loginLimiter = rateLimit({
  windowMs: WINDOW_MS,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message,
  keyGenerator: (req) => `${ipKeyGenerator(req.ip)}:${String(req.body?.email || "").trim().toLowerCase()}`,
});

// 2FA codes are only 6 digits, so guesses must be tightly capped.
const twoFactorLimiter = rateLimit({
  windowMs: WINDOW_MS,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message,
});

module.exports = { loginLimiter, twoFactorLimiter };
