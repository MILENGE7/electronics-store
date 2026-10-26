const express = require("express");
const {
  register, login, forgotPassword, resetPassword, verifyLogin2FA, setup2FA, confirm2FA, disable2FA, me, updateProfile,
} = require("../controllers/auth.controller");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { loginLimiter, twoFactorLimiter } = require("../middleware/rateLimit");

const router = express.Router();

router.post("/register", loginLimiter, register);
router.post("/login", loginLimiter, login);
router.post("/2fa/login-verify", twoFactorLimiter, verifyLogin2FA);
router.post("/forgot-password", loginLimiter, forgotPassword);
router.post("/reset-password", twoFactorLimiter, resetPassword);

router.get("/me", requireAuth, me);
router.patch("/me", requireAuth, updateProfile);

// Admin-only 2FA enrollment management
router.post("/2fa/setup", requireAuth, requireAdmin, setup2FA);
router.post("/2fa/confirm", twoFactorLimiter, requireAuth, requireAdmin, confirm2FA);
router.post("/2fa/disable", twoFactorLimiter, requireAuth, requireAdmin, disable2FA);

module.exports = router;
