const crypto = require("crypto");
const bcrypt = require("bcrypt");
const speakeasy = require("speakeasy");
const qrcode = require("qrcode");
const prisma = require("../config/db");
const { signToken, signPendingToken, verifyToken } = require("../utils/jwt");
const { passwordResetEmail } = require("../utils/mailer");

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

// Emails are stored lowercase so "John@x.com" and "john@x.com" are the same
// account. Lookups are case-insensitive too, for accounts created before
// this normalisation existed.
function normalizeEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

function findUserByEmail(email) {
  return prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
}

async function register(req, res, next) {
  try {
    const { password, name } = req.body;
    const email = normalizeEmail(req.body.email);
    if (!email || !password || !name) {
      return res.status(400).json({ error: "email, password, and name are required" });
    }
    if (String(password).length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    const existing = await findUserByEmail(email);
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
    const { password } = req.body;
    const email = normalizeEmail(req.body.email);
    if (!email || !password) return res.status(401).json({ error: "Invalid credentials" });
    const user = await findUserByEmail(email);
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
// Requires the current password so a stolen/leaked session JWT alone can't be
// used to silently rotate the secret (which also immediately flips
// twoFactorEnabled to false, weakening an already-enrolled account).
async function setup2FA(req, res, next) {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: "Current password is required" });

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: "Incorrect password" });

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

// Requires both the current password and a valid TOTP code — proof of both
// factors being removed, not just possession of a (possibly stolen) session JWT.
async function disable2FA(req, res, next) {
  try {
    const { password, token } = req.body;
    if (!password) return res.status(400).json({ error: "Current password is required" });
    if (!token) return res.status(400).json({ error: "Authentication code is required" });

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: "Incorrect password" });

    const valid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: "base32",
      token,
      window: 1,
    });
    if (!valid) return res.status(401).json({ error: "Invalid authentication code" });

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
      select: { id: true, email: true, name: true, role: true, twoFactorEnabled: true, addresses: true, createdAt: true, seller: { select: { id: true, status: true, businessName: true } } },
    });
    res.json(user);
  } catch (err) {
    next(err);
  }
}

// Customer self-service profile update — name and/or email only (both
// already exist on User; nothing new is being invented here). Always scoped
// to req.user.id, so a customer can only ever update their own record.
async function updateProfile(req, res, next) {
  try {
    const { name, email } = req.body;
    const data = {};

    if (name !== undefined) {
      const trimmed = String(name).trim();
      if (!trimmed) return res.status(400).json({ error: "Name cannot be empty" });
      data.name = trimmed;
    }

    if (email !== undefined) {
      const trimmedEmail = String(email).trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        return res.status(400).json({ error: "Please enter a valid email address" });
      }

      const current = await prisma.user.findUnique({ where: { id: req.user.id }, select: { email: true } });
      if (trimmedEmail !== current.email) {
        const existing = await prisma.user.findUnique({ where: { email: trimmedEmail } });
        if (existing) return res.status(409).json({ error: "Email already in use" });
      }
      data.email = trimmedEmail;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: "Nothing to update" });
    }

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data,
      select: { id: true, email: true, name: true, role: true, twoFactorEnabled: true, addresses: true, createdAt: true, seller: { select: { id: true, status: true, businessName: true } } },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// Step 1 of password reset: email a one-time link. Always answers the same
// way whether or not the email exists, so this can't be used to find out
// who has an account.
async function forgotPassword(req, res, next) {
  try {
    const email = normalizeEmail(req.body.email);
    const user = email ? await findUserByEmail(email) : null;

    if (user) {
      const token = crypto.randomBytes(32).toString("hex");
      await prisma.passwordResetToken.create({
        data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS) },
      });
      const link = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
      passwordResetEmail(user, link); // fire-and-forget

      // Local development without a mail server: print the link instead.
      if (process.env.NODE_ENV !== "production" && !process.env.SMTP_HOST) {
        console.log(`[dev] Password reset link for ${user.email}: ${link}`);
      }
    }

    res.json({ message: "If an account exists for that email, a reset link has been sent." });
  } catch (err) {
    next(err);
  }
}

// Step 2: set a new password with the token from the email. Tokens are
// single-use and expire after an hour; only their hash is stored.
async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body;
    if (typeof token !== "string" || !token) return res.status(400).json({ error: "Reset link is invalid" });
    if (typeof password !== "string" || password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      return res.status(400).json({ error: "This reset link is invalid or has expired. Please request a new one." });
    }

    const hashed = await bcrypt.hash(password, 10);
    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { password: hashed } }),
      // Burn this token and any other outstanding ones for the account.
      prisma.passwordResetToken.updateMany({ where: { userId: record.userId, usedAt: null }, data: { usedAt: new Date() } }),
    ]);
    res.json({ message: "Your password has been reset. You can now sign in." });
  } catch (err) {
    next(err);
  }
}

module.exports = { forgotPassword, resetPassword, register, login, verifyLogin2FA, setup2FA, confirm2FA, disable2FA, me, updateProfile };
