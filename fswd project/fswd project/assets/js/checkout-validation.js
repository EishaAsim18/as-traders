// Client-side validation (matches backend rules in validateDelivery.js)

const CHECKOUT_NAME_RE = /^[a-zA-Z\s.'-]{2,80}$/;
const CHECKOUT_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CHECKOUT_CITY_RE = /^[a-zA-Z\s.'-]{2,60}$/;

function validateCheckoutForm(fields) {
  const errors = [];

  const name = (fields.customerName || "").trim();
  if (!name) {
    errors.push({ field: "checkoutName", message: "Full name is required" });
  } else if (!CHECKOUT_NAME_RE.test(name)) {
    errors.push({ field: "checkoutName", message: "Use letters only (2–80 characters)" });
  }

  const phoneCheck = validatePkPhone(fields.customerPhone, true);
  if (!phoneCheck.ok) {
    errors.push({
      field: "checkoutPhone",
      message: phoneCheck.message,
    });
  }

  const email = (fields.customerEmail || "").trim();
  if (email && (!CHECKOUT_EMAIL_RE.test(email) || email.length > 120)) {
    errors.push({ field: "checkoutEmail", message: "Enter a valid email" });
  }

  const city = (fields.city || "").trim();
  if (!city) {
    errors.push({ field: "checkoutCity", message: "City is required" });
  } else if (!CHECKOUT_CITY_RE.test(city)) {
    errors.push({ field: "checkoutCity", message: "Enter a valid city name" });
  }

  const street = (fields.streetAddress || "").trim();
  if (!street) {
    errors.push({ field: "checkoutAddress", message: "Street / shop address is required" });
  } else if (street.length < 10) {
    errors.push({ field: "checkoutAddress", message: "Address must be at least 10 characters" });
  } else if (street.length > 300) {
    errors.push({ field: "checkoutAddress", message: "Address is too long" });
  }

  const notes = (fields.deliveryNotes || "").trim();
  if (notes.length > 200) {
    errors.push({ field: "checkoutNotes", message: "Notes must be under 200 characters" });
  }

  return errors;
}

function clearCheckoutFieldErrors() {
  document.querySelectorAll("#checkoutForm .is-invalid").forEach(function (el) {
    el.classList.remove("is-invalid");
  });
  document.querySelectorAll("#checkoutForm .invalid-feedback").forEach(function (el) {
    el.textContent = "";
    el.classList.remove("d-block");
  });
}

function showCheckoutFieldErrors(errors) {
  clearCheckoutFieldErrors();
  errors.forEach(function (err) {
    const input = document.getElementById(err.field);
    if (!input) return;
    input.classList.add("is-invalid");
    const feedback = input.parentElement.querySelector(".invalid-feedback");
    if (feedback) {
      feedback.textContent = err.message;
      feedback.classList.add("d-block");
    }
  });
  if (errors.length) {
    const first = document.getElementById(errors[0].field);
    if (first) first.focus();
  }
}

function getSelectedPaymentMethod() {
  const hidden = document.getElementById("checkoutPaymentMethod");
  if (hidden && hidden.value) return hidden.value;
  const picked = document.querySelector('input[name="paymentMethod"]:checked');
  return picked ? picked.value : "cod";
}

function getCheckoutFormData() {
  return {
    customerName: document.getElementById("checkoutName").value,
    customerPhone: document.getElementById("checkoutPhone").value,
    customerEmail: document.getElementById("checkoutEmail").value,
    city: document.getElementById("checkoutCity").value,
    streetAddress: document.getElementById("checkoutAddress").value,
    deliveryNotes: document.getElementById("checkoutNotes").value,
    paymentMethod: getSelectedPaymentMethod(),
  };
}
