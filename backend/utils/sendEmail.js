const nodemailer = require("nodemailer");

let cachedTransport = null;

function isEmailConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getTransport() {
  if (!isEmailConfigured()) return null;
  if (cachedTransport) return cachedTransport;

  const port = Number(process.env.SMTP_PORT) || 587;
  cachedTransport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return cachedTransport;
}

function mailFrom() {
  return process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@astraders.pk";
}

async function sendEmail(options) {
  const transport = getTransport();
  if (!transport) {
    console.warn("[email] SMTP not configured — email not sent:", options.subject);
    if (options.resetUrl) {
      console.warn("[email] Password reset link:", options.resetUrl);
    }
    return { sent: false, reason: "smtp_not_configured" };
  }

  try {
    await transport.sendMail({
      from: mailFrom(),
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
    return { sent: true };
  } catch (error) {
    console.error("[email] Send failed:", error.message || error);
    if (options.resetUrl) {
      console.warn("[email] Password reset link:", options.resetUrl);
    }
    return {
      sent: false,
      reason: "send_failed",
      message: error.message || "Could not send email",
    };
  }
}

function buildPasswordResetEmail(params) {
  const shopName = process.env.SHOP_NAME || "A & S Traders";
  const minutes = Math.round((params.ttlMs || 3600000) / 60000);

  const text =
    "Hello" +
    (params.name ? " " + params.name : "") +
    ",\n\n" +
    "We received a request to reset your " +
    shopName +
    " password.\n\n" +
    "Open this link within " +
    minutes +
    " minutes:\n" +
    params.resetUrl +
    "\n\n" +
    "If you did not request this, you can ignore this email.\n\n" +
    shopName;

  const html =
    "<p>Hello" +
    (params.name ? " " + escapeHtml(params.name) : "") +
    ",</p>" +
    "<p>We received a request to reset your <strong>" +
    escapeHtml(shopName) +
    "</strong> password.</p>" +
    "<p><a href=\"" +
    escapeHtml(params.resetUrl) +
    "\">Reset your password</a></p>" +
    "<p>This link expires in " +
    minutes +
    " minutes.</p>" +
    "<p>If you did not request this, you can ignore this email.</p>";

  return { text: text, html: html };
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

module.exports = {
  isEmailConfigured,
  sendEmail,
  buildPasswordResetEmail,
};
