const bcrypt = require("bcrypt");
const speakeasy = require("speakeasy");
const qrcode = require("qrcode");
const prisma = require("../config/db");
const { signToken, signPendingToken, verifyToken } = require("../utils/jwt");

async function register(req, res, next) {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: "email, password, and name are required" });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: "Email already registered" });

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashed, name, role: "CUSTOMER" },
    });

    const token = signToken(user);
    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (err) {
    next(err);
  }
}

// Step 1 of login. If the account is an admin with 2FA enabled, this does NOT
// return a usable session token — it returns a short-lived pendingToken that
// must be exchanged via /auth/2fa/login-verify along with a TOTP code.
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: "Invalid credentials" });

    if (user.role === "ADMIN" && user.twoFactorEnabled) {
      return res.json({ requires2FA: true, pendingToken: signPendingToken(user) });
    }

    const token = signToken(user);
    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (err) {
    next(err);
  }
}

// Step 2 of login for 2FA accounts: exchange pendingToken + TOTP code for a real session token.
async function verifyLogin2FA(req, res, next) {
  try {
    const { pendingToken, token: totpToken } = req.body;

    let decoded;
    try {
      decoded = verifyToken(pendingToken);
    } catch {
      return res.status(401).json({ error: "Login session expired, please log in again" });
    }
    if (decoded.purpose !== "2fa-pending") {
      return res.status(401).json({ error: "Invalid token" });
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user || !user.twoFactorEnabled) return res.status(401).json({ error: "2FA not enabled" });

    const valid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: "base32",
      token: totpToken,
      window: 1, // allows the previous/next 30s window for clock drift
    });
    if (!valid) return res.status(401).json({ error: "Invalid authentication code" });

    const sessionToken = signToken(user);
    res.json({
      token: sessionToken,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (err) {
    next(err);
  }
}

// Begins 2FA enrollment: generates a secret (not yet active) and a QR code
// the admin scans in an authenticator app (Google Authenticator, Authy, etc.).
async function setup2FA(req, res, next) {
  try {
    const secret = speakeasy.generateSecret({
      name: `Electronics Store (${req.user.email})`,
    });

    await prisma.user.update({
      where: { id: req.user.id },
      data: { twoFactorSecret: secret.base32, twoFactorEnabled: false },
    });

    const qrDataUrl = await qrcode.toDataURL(secret.otpauth_url);
    res.json({ qrDataUrl, secret: secret.base32 });
  } catch (err) {
    next(err);
  }
}

// Confirms enrollment: admin enters a code from their authenticator app to prove it's working.
async function confirm2FA(req, res, next) {
  try {
    const { token } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user.twoFactorSecret) return res.status(400).json({ error: "Run 2FA setup first" });

    const valid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: "base32",
      token,
      window: 1,
    });
    if (!valid) return res.status(400).json({ error: "Invalid code, please try again" });

    await prisma.user.update({ where: { id: req.user.id }, data: { twoFactorEnabled: true } });
    res.json({ enabled: true });
  } catch (err) {
    next(err);
  }
}

async function disable2FA(req, res, next) {
  try {
    await prisma.user.update({
      where: { id: req.user.id },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
    });
    res.json({ enabled: false });
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, name: true, role: true, twoFactorEnabled: true, addresses: true },
    });
    res.json(user);
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, verifyLogin2FA, setup2FA, confirm2FA, disable2FA, me };
