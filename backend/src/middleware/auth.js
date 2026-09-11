const { verifyToken } = require("../utils/jwt");

// Verifies the JWT and attaches the decoded user to req.user
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }
  try {
    const token = header.split(" ")[1];
    const decoded = verifyToken(token);
    // Pending 2FA tokens (issued after password check, before TOTP) are only
    // valid against /auth/2fa/login-verify — never as a general session token.
    if (decoded.purpose === "2fa-pending") {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// Must run after requireAuth
function requireAdmin(req, res, next) {
  if (req.user?.role !== "ADMIN") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
