function readImageFileAsDataUrl(file) {
  return new Promise(function (resolve, reject) {
    if (!file || !file.type.startsWith("image/")) {
      reject(new Error("Choose a JPG, PNG, or WebP image"));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      reject(new Error("Image must be 5 MB or smaller"));
      return;
    }
    if (file.size < 10 * 1024) {
      reject(new Error("Screenshot is too small — upload a clear full payment screenshot"));
      return;
    }
    const reader = new FileReader();
    reader.onload = function () {
      resolve(reader.result);
    };
    reader.onerror = function () {
      reject(new Error("Could not read file"));
    };
    reader.readAsDataURL(file);
  });
}

var TXN_RULES = {
  jazzcash: {
    min: 10,
    max: 12,
    pattern: /^\d{10,12}$/,
    hint: "JazzCash TID is 10–12 digits (numbers only)",
    example: "123456789012",
  },
  easypaisa: {
    min: 10,
    max: 12,
    pattern: /^\d{10,12}$/,
    hint: "Easypaisa TID is 10–12 digits (numbers only)",
    example: "987654321098",
  },
  bank_transfer: {
    min: 6,
    max: 30,
    pattern: /^[A-Z0-9-]+$/,
    hint: "Bank reference: 6–30 letters, numbers, or dashes",
    example: "TRN-ABC123456",
  },
};

var FAKE_TXN_PATTERNS = [
  /^(.)\1{5,}$/,
  /^123456789?$/,
  /^987654321?$/,
  /^TEST/i,
  /^XXXX/i,
  /^SAMPLE/i,
  /^N\/A$/,
  /^NA$/,
  /^000000/,
];

function normalizePaymentMethod(method) {
  var v = String(method || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  if (TXN_RULES[v]) return v;
  return "bank_transfer";
}

function normalizePaymentTxnId(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, "")
    .toUpperCase();
}

function looksLikeFakeTxnId(txnId) {
  return FAKE_TXN_PATTERNS.some(function (pattern) {
    return pattern.test(txnId);
  });
}

function getTransactionIdHint(paymentMethod) {
  var rule = TXN_RULES[normalizePaymentMethod(paymentMethod)] || TXN_RULES.bank_transfer;
  return rule.hint + " · e.g. " + rule.example;
}

function validateTransactionId(value, paymentMethod) {
  var txnId = normalizePaymentTxnId(value);
  var method = normalizePaymentMethod(paymentMethod);
  var rule = TXN_RULES[method] || TXN_RULES.bank_transfer;

  if (!txnId) {
    return { ok: false, message: "Enter the transaction / TID from your payment app" };
  }
  if (txnId.length < rule.min) {
    return { ok: false, message: rule.hint + " — too short" };
  }
  if (txnId.length > rule.max) {
    return { ok: false, message: rule.hint + " — too long" };
  }
  if (!rule.pattern.test(txnId)) {
    return { ok: false, message: rule.hint };
  }
  if (looksLikeFakeTxnId(txnId)) {
    return { ok: false, message: "Enter the real transaction ID from your payment receipt" };
  }

  return { ok: true, transactionId: txnId };
}

function setTxnInputState(input, message, isValid) {
  if (!input) return;
  var fb = input.parentElement.querySelector(".invalid-feedback");
  if (!fb) {
    fb = document.createElement("div");
    fb.className = "invalid-feedback";
    input.parentElement.appendChild(fb);
  }
  if (isValid) {
    input.classList.remove("is-invalid");
    input.classList.add("is-valid");
    fb.textContent = "";
  } else {
    input.classList.remove("is-valid");
    input.classList.add("is-invalid");
    fb.textContent = message || "Invalid transaction ID";
  }
}

function wireTransactionIdValidation(inputId, getPaymentMethod) {
  var input = document.getElementById(inputId);
  if (!input) return;

  function refreshHint() {
    var hintEl = input.parentElement.querySelector(".txn-hint");
    if (!hintEl) {
      hintEl = document.createElement("div");
      hintEl.className = "form-text small txn-hint";
      input.parentElement.appendChild(hintEl);
    }
    var method = typeof getPaymentMethod === "function" ? getPaymentMethod() : "bank_transfer";
    hintEl.textContent = getTransactionIdHint(method);
    var rule = TXN_RULES[normalizePaymentMethod(method)] || TXN_RULES.bank_transfer;
    input.placeholder = "e.g. " + rule.example;
    input.maxLength = rule.max;
  }

  function validateLive() {
    var method = typeof getPaymentMethod === "function" ? getPaymentMethod() : "bank_transfer";
    var result = validateTransactionId(input.value, method);
    if (!input.value.trim()) {
      input.classList.remove("is-valid", "is-invalid");
      return true;
    }
    setTxnInputState(input, result.message, result.ok);
    return result.ok;
  }

  refreshHint();
  input.addEventListener("input", validateLive);
  input.addEventListener("blur", validateLive);
}

function validatePaymentProofFields(fields) {
  var txnCheck = validateTransactionId(fields.transactionId, fields.paymentMethod);
  if (!txnCheck.ok) {
    return txnCheck;
  }

  var paidAmount = Number(fields.paidAmount);
  var orderAmount = Number(fields.orderAmount);
  if (!Number.isFinite(paidAmount) || paidAmount <= 0) {
    return { ok: false, message: "Enter the amount you paid" };
  }
  if (Number.isFinite(orderAmount) && orderAmount > 0 && Math.abs(paidAmount - orderAmount) >= 0.01) {
    return {
      ok: false,
      message: "Paid amount must match your order total (" + orderAmount + " PKR)",
    };
  }

  if (!fields.file) {
    return { ok: false, message: "Choose a screenshot image first" };
  }

  return {
    ok: true,
    transactionId: txnCheck.transactionId,
    paidAmount: paidAmount,
    senderNote: String(fields.senderNote || "").trim().slice(0, 80),
  };
}

function proofImageUrl(path) {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  var origin =
    typeof API_BASE_URL !== "undefined"
      ? API_BASE_URL
      : typeof getBackendOrigin === "function"
        ? getBackendOrigin()
        : "https://as-traders-production.up.railway.app";
  return origin + path;
}
