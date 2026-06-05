// Pakistan mobile validation — shared by checkout, register, admin billing, profile

var PK_PHONE_RE = /^(?:\+92|0)?3[0-9]{9}$/;

function normalizePkPhone(phone) {
  let p = String(phone || "")
    .trim()
    .replace(/[\s-]/g, "");
  if (p.startsWith("+92")) p = "0" + p.slice(3);
  if (p.startsWith("92") && p.length === 12) p = "0" + p.slice(2);
  return p;
}

function sanitizePhoneInputValue(value) {
  let v = String(value || "").replace(/[^\d+\s-]/g, "");
  if (v.indexOf("+") > 0) {
    v = v.replace(/\+/g, "");
  }
  return v.slice(0, 15);
}

function validatePkPhone(value, required) {
  const raw = String(value || "").trim();
  if (!raw) {
    if (required) {
      return { ok: false, message: "Phone number is required", normalized: "" };
    }
    return { ok: true, message: "", normalized: "" };
  }

  const normalized = normalizePkPhone(raw);
  if (!PK_PHONE_RE.test(normalized)) {
    return {
      ok: false,
      message: "Use a valid Pakistan mobile (e.g. 03001234567)",
      normalized: normalized,
    };
  }

  return { ok: true, message: "", normalized: normalized };
}

function setPhoneFieldState(input, result) {
  if (!input) return;

  const fb =
    input.parentElement && input.parentElement.querySelector(".invalid-feedback");
  const required = input.required || input.hasAttribute("data-pk-phone-required");
  const hasValue = !!String(input.value || "").trim();

  input.classList.remove("is-valid", "is-invalid");

  if (!hasValue && !required) {
    if (fb) fb.textContent = "";
    return;
  }

  if (result.ok && hasValue) {
    input.classList.add("is-valid");
    if (fb) fb.textContent = "";
  } else if (!result.ok) {
    input.classList.add("is-invalid");
    if (fb) fb.textContent = result.message;
  }
}

function attachPkPhoneInput(input, options) {
  if (!input || input.dataset.pkPhoneBound === "1") return;
  input.dataset.pkPhoneBound = "1";

  const opts = options || {};
  const isRequired =
    opts.required !== undefined
      ? opts.required
      : input.required || input.hasAttribute("data-pk-phone-required");

  input.addEventListener("input", function () {
    const before = input.value;
    input.value = sanitizePhoneInputValue(input.value);
    if (
      input.classList.contains("is-invalid") ||
      input.classList.contains("is-valid") ||
      before !== input.value
    ) {
      setPhoneFieldState(input, validatePkPhone(input.value, isRequired));
    }
  });

  input.addEventListener("blur", function () {
    setPhoneFieldState(input, validatePkPhone(input.value, isRequired));
  });
}

function initPkPhoneInputs() {
  document.querySelectorAll("[data-pk-phone]").forEach(function (el) {
    attachPkPhoneInput(el, {
      required: el.hasAttribute("data-pk-phone-required") || el.required,
    });
  });
}

document.addEventListener("DOMContentLoaded", initPkPhoneInputs);
