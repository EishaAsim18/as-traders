const crypto = require("crypto");

const RESET_TTL_MS = 60 * 60 * 1000;

function createPasswordResetToken() {
  const token = crypto.randomBytes(32).toString("hex");
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  return {
    token: token,
    hash: hash,
    expiresAt: new Date(Date.now() + RESET_TTL_MS),
  };
}

function hashPasswordResetToken(token) {
  return crypto.createHash("sha256").update(String(token || "")).digest("hex");
}

function passwordResetTokenValid(user, token) {
  if (!user || !token || !user.passwordResetTokenHash || !user.passwordResetExpires) {
    return false;
  }
  if (user.passwordResetExpires.getTime() < Date.now()) {
    return false;
  }
  return hashPasswordResetToken(token) === user.passwordResetTokenHash;
}

function clearPasswordResetFields(user) {
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpires = undefined;
}

module.exports = {
  RESET_TTL_MS,
  createPasswordResetToken,
  hashPasswordResetToken,
  passwordResetTokenValid,
  clearPasswordResetFields,
};
