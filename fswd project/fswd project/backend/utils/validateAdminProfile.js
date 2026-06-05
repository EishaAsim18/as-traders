const NAME_RE = /^[a-zA-Z\s.'-]{2,80}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PK_RE = /^\+923[0-9]{9}$/;

function normalizePhone(phone) {
  const raw = String(phone || "").trim().replace(/\s/g, "");
  if (!raw) return "";
  if (raw.startsWith("+92")) return raw;
  if (raw.startsWith("0")) return "+92" + raw.slice(1);
  if (raw.startsWith("3")) return "+92" + raw;
  return raw;
}

function validateProfile(body) {
  const errors = [];
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const phone = normalizePhone(body.phone);

  if (!name) {
    errors.push({ field: "name", message: "Name is required" });
  } else if (!NAME_RE.test(name)) {
    errors.push({ field: "name", message: "Enter a valid name (2–80 characters)" });
  }

  if (!email) {
    errors.push({ field: "email", message: "Email is required" });
  } else if (!EMAIL_RE.test(email) || email.length > 120) {
    errors.push({ field: "email", message: "Enter a valid email address" });
  }

  if (phone && !PHONE_PK_RE.test(phone)) {
    errors.push({ field: "phone", message: "Use a valid Pakistan mobile (e.g. 03001234567)" });
  }

  if (errors.length) {
    return { ok: false, errors };
  }

  return { ok: true, data: { name, email, phone } };
}

function validatePasswordChange(body) {
  const errors = [];
  const currentPassword = String(body.currentPassword || "");
  const newPassword = String(body.newPassword || "");
  const confirmPassword = String(body.confirmPassword || "");

  if (!currentPassword) {
    errors.push({ field: "currentPassword", message: "Current password is required" });
  }
  if (!newPassword || newPassword.length < 6) {
    errors.push({ field: "newPassword", message: "New password must be at least 6 characters" });
  }
  if (newPassword !== confirmPassword) {
    errors.push({ field: "confirmPassword", message: "Passwords do not match" });
  }

  if (errors.length) {
    return { ok: false, errors };
  }

  return { ok: true, data: { currentPassword, newPassword } };
}

const { paymentPublicFields } = require("./paymentSettings");

function adminPublicFields(admin) {
  return {
    id: admin._id,
    name: admin.name,
    email: admin.email,
    phone: admin.phone || "",
    paymentSettings: paymentPublicFields(admin.paymentSettings),
    createdAt: admin.createdAt,
    updatedAt: admin.updatedAt,
  };
}

module.exports = {
  validateProfile,
  validatePasswordChange,
  adminPublicFields,
  normalizePhone,
};
