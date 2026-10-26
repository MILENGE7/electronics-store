const prisma = require("../config/db");
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

// Must run after requireAuth. Checks the database rather than the JWT's
// role claim, so approving/suspending a seller takes effect immediately
// instead of whenever their 7-day token happens to be reissued.
async function requireSeller(req, res, next) {
  try {
    const seller = await prisma.seller.findUnique({ where: { userId: req.user.id } });
    if (!seller || seller.status !== "APPROVED") {
      return res.status(403).json({ error: "An approved seller account is required" });
    }
    req.seller = seller;
    next();
  } catch (err) {
    next(err);
  }
}

// Product image uploads: the admin, or an approved seller.
async function requireAdminOrSeller(req, res, next) {
  if (req.user?.role === "ADMIN") return next();
  return requireSeller(req, res, next);
}

module.exports = { requireAuth, requireAdmin, requireSeller, requireAdminOrSeller };
