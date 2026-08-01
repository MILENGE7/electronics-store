const express = require("express");
const {
  register, login, verifyLogin2FA, setup2FA, confirm2FA, disable2FA, me,
} = require("../controllers/auth.controller");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/2fa/login-verify", verifyLogin2FA);

router.get("/me", requireAuth, me);

// Admin-only 2FA enrollment management
router.post("/2fa/setup", requireAuth, requireAdmin, setup2FA);
router.post("/2fa/confirm", requireAuth, requireAdmin, confirm2FA);
router.post("/2fa/disable", requireAuth, requireAdmin, disable2FA);

module.exports = router;
