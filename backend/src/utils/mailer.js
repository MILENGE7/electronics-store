const nodemailer = require("nodemailer");

// Uses standard SMTP env vars. Works with any provider (SendGrid, Mailgun,
// Postmark, AWS SES, or Gmail SMTP for local testing).
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendMail({ to, subject, html }) {
  // Fail soft: don't let a broken mail provider break checkout/order flows.
  try {
    await transporter.sendMail({
      from: process.env.MAIL_FROM || "no-reply@electronics-store.example",
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error("Failed to send email:", err.message);
  }
}

function orderConfirmationEmail(order) {
  return sendMail({
    to: order.user.email,
    subject: `Order received — #${order.id.slice(0, 8)}`,
    html: `<p>Hi ${order.user.name},</p>
      <p>We've received your order <strong>#${order.id.slice(0, 8)}</strong>.
      Total: $${Number(order.total).toFixed(2)}.</p>
      <p>You'll get another email once payment is confirmed and your order ships.</p>`,
  });
}

function orderStatusEmail(order) {
  const statusText = {
    PROCESSING: "is being processed",
    SHIPPED: "has shipped",
    DELIVERED: "has been delivered",
    CANCELLED: "has been cancelled",
    REFUNDED: "has been refunded",
  }[order.status];

  if (!statusText) return; // no email for PENDING, etc.

  return sendMail({
    to: order.user.email,
    subject: `Order update — #${order.id.slice(0, 8)}`,
    html: `<p>Hi ${order.user.name},</p>
      <p>Your order <strong>#${order.id.slice(0, 8)}</strong> ${statusText}.</p>`,
  });
}

module.exports = { sendMail, orderConfirmationEmail, orderStatusEmail };
