const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_RE = /^[a-zA-Z\s.'-]{2,40}$/;
const PK_PHONE_RE = /^(?:\+92|0)?3[0-9]{9}$/;
const PASSWORD_SPECIAL_RE = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/;

function trim(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePhone(phone) {
  let p = trim(phone).replace(/[\s-]/g, "");
  if (p.startsWith("+92")) p = "0" + p.slice(3);
  if (p.startsWith("92") && p.length === 12) p = "0" + p.slice(2);
  return p;
}

function validateRegister(body) {
  const errors = [];
  const data = {};

  const firstName = trim(body.firstName);
  if (!firstName) {
    errors.push({ field: "firstName", message: "First name is required" });
  } else if (!NAME_RE.test(firstName)) {
    errors.push({ field: "firstName", message: "First name must be 2–40 letters" });
  } else {
    data.firstName = firstName;
  }

  const lastName = trim(body.lastName);
  if (!lastName) {
    errors.push({ field: "lastName", message: "Last name is required" });
  } else if (!NAME_RE.test(lastName)) {
    errors.push({ field: "lastName", message: "Last name must be 2–40 letters" });
  } else {
    data.lastName = lastName;
  }

  const email = trim(body.email).toLowerCase();
  if (!email) {
    errors.push({ field: "email", message: "Email is required" });
  } else if (!EMAIL_RE.test(email) || email.length > 120) {
    errors.push({ field: "email", message: "Enter a valid email address" });
  } else {
    data.email = email;
  }

  const rawPhone = trim(body.phone);
  if (rawPhone) {
    const phone = normalizePhone(rawPhone);
    if (!PK_PHONE_RE.test(phone)) {
      errors.push({ field: "phone", message: "Use a valid Pakistan mobile (e.g. 03001234567)" });
    } else {
      data.phone = phone;
    }
  } else {
    data.phone = "";
  }

  const password = body.password || "";
  if (!password) {
    errors.push({ field: "password", message: "Password is required" });
  } else if (password.length < 8) {
    errors.push({ field: "password", message: "Password must be at least 8 characters" });
  } else if (password.length > 72) {
    errors.push({ field: "password", message: "Password is too long" });
  } else if (!PASSWORD_SPECIAL_RE.test(password)) {
    errors.push({
      field: "password",
      message: "Password must include at least one special character (!@#$…)",
    });
  } else {
    data.password = password;
  }

  const confirmPassword = body.confirmPassword || "";
  if (password !== confirmPassword) {
    errors.push({ field: "confirmPassword", message: "Passwords do not match" });
  }

  if (!body.acceptTerms) {
    errors.push({ field: "acceptTerms", message: "You must accept the terms" });
  }

  return { ok: errors.length === 0, errors, data };
}

function validateLogin(body) {
  const errors = [];
  const email = trim(body.email).toLowerCase();
  const password = body.password || "";

  if (!email) {
    errors.push({ field: "email", message: "Email is required" });
  } else if (!EMAIL_RE.test(email)) {
    errors.push({ field: "email", message: "Enter a valid email address" });
  }

  if (!password) {
    errors.push({ field: "password", message: "Password is required" });
  }

  return {
    ok: errors.length === 0,
    errors,
    data: { email, password },
  };
}

function validateForgotPassword(body) {
  const errors = [];
  const email = trim(body.email).toLowerCase();

  if (!email) {
    errors.push({ field: "email", message: "Email is required" });
  } else if (!EMAIL_RE.test(email)) {
    errors.push({ field: "email", message: "Enter a valid email address" });
  }

  return {
    ok: errors.length === 0,
    errors,
    data: { email },
  };
}

function validateResetPassword(body) {
  const errors = [];
  const token = trim(body.token);
  const password = body.password || "";
  const confirmPassword = body.confirmPassword || "";

  if (!token) {
    errors.push({ field: "token", message: "Reset link is invalid or expired" });
  }

  if (!password) {
    errors.push({ field: "password", message: "Password is required" });
  } else if (password.length < 8) {
    errors.push({ field: "password", message: "Password must be at least 8 characters" });
  } else if (password.length > 72) {
    errors.push({ field: "password", message: "Password is too long" });
  } else if (!PASSWORD_SPECIAL_RE.test(password)) {
    errors.push({
      field: "password",
      message: "Password must include at least one special character (!@#$…)",
    });
  }

  if (password !== confirmPassword) {
    errors.push({ field: "confirmPassword", message: "Passwords do not match" });
  }

  return {
    ok: errors.length === 0,
    errors,
    data: { token, password },
  };
}

module.exports = {
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  normalizePhone,
};
