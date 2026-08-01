const jwt = require("jsonwebtoken");

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

// Short-lived token issued after password check succeeds but before the
// TOTP code is verified. Only usable against POST /api/auth/2fa/login-verify.
function signPendingToken(user) {
  return jwt.sign(
    { id: user.id, purpose: "2fa-pending" },
    process.env.JWT_SECRET,
    { expiresIn: "5m" }
  );
}

function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

module.exports = { signToken, signPendingToken, verifyToken };
