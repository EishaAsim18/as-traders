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

var PK_SENDER_BANKS = [
  "Habib Bank Limited (HBL)",
  "United Bank Limited (UBL)",
  "MCB Bank",
  "Meezan Bank",
  "Allied Bank",
  "Bank Alfalah",
  "Faysal Bank",
  "JS Bank",
  "Askari Bank",
  "Soneri Bank",
  "Summit Bank",
  "Silk Bank",
  "Bank of Punjab (BOP)",
  "National Bank of Pakistan (NBP)",
  "Standard Chartered",
  "Other",
];

function fillProofBankSelect(selectEl) {
  if (!selectEl || selectEl.options.length > 1) return;
  selectEl.innerHTML = '<option value="">Select bank…</option>';
  PK_SENDER_BANKS.forEach(function (name) {
    var opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    selectEl.appendChild(opt);
  });
}

function initProofPaymentControls(options) {
  var opts = options || {};
  var prefix = opts.prefix || "proof";
  var pickerId = prefix + "PaymentPicker";
  var hiddenId = prefix + "PaymentMethod";
  var bankWrapId = prefix + "BankWrap";
  var bankSelectId = prefix + "Bank";
  var bankOtherWrapId = prefix + "BankOtherWrap";
  var bankOtherId = prefix + "BankOther";
  var getTxnInputId = opts.txnInputId || prefix + "Txn";

  var bankWrap = document.getElementById(bankWrapId);
  var bankSelect = document.getElementById(bankSelectId);
  var bankOtherWrap = document.getElementById(bankOtherWrapId);
  var bankOther = document.getElementById(bankOtherId);

  if (bankSelect) fillProofBankSelect(bankSelect);

  function syncBankVisibility(method) {
    var isBank = normalizePaymentMethod(method) === "bank_transfer";
    if (bankWrap) bankWrap.classList.toggle("d-none", !isBank);
    if (!isBank && bankSelect) bankSelect.value = "";
    if (!isBank && bankOther) bankOther.value = "";
    if (bankOtherWrap) bankOtherWrap.classList.add("d-none");
  }

  function syncBankOtherVisibility() {
    if (!bankSelect || !bankOtherWrap) return;
    bankOtherWrap.classList.toggle("d-none", bankSelect.value !== "Other");
    if (bankSelect.value !== "Other" && bankOther) bankOther.value = "";
  }

  if (bankSelect) {
    bankSelect.addEventListener("change", syncBankOtherVisibility);
  }

  var picker = null;
  if (typeof initPaymentMethodPicker === "function") {
    picker = initPaymentMethodPicker(pickerId, {
      hiddenInputId: hiddenId,
      defaultMethod: opts.defaultMethod || "bank_transfer",
      methods: ["bank_transfer", "jazzcash", "easypaisa"],
      onChange: function (method) {
        syncBankVisibility(method);
        if (typeof wireTransactionIdValidation === "function") {
          wireTransactionIdValidation(getTxnInputId, function () {
            return getProofPaymentMethod(prefix);
          });
        }
      },
    });
    syncBankVisibility(picker.getValue());
  }

  return {
    prefix: prefix,
    getPaymentMethod: function () {
      return getProofPaymentMethod(prefix);
    },
    getBankName: function () {
      return getProofBankName(prefix);
    },
    setPaymentMethod: function (method) {
      if (picker) picker.setValue(method);
      syncBankVisibility(method);
    },
  };
}

function getProofPaymentMethod(prefix) {
  var hidden = document.getElementById(prefix + "PaymentMethod");
  if (hidden && hidden.value) return hidden.value;
  return "bank_transfer";
}

function getProofBankName(prefix) {
  var method = normalizePaymentMethod(getProofPaymentMethod(prefix));
  if (method !== "bank_transfer") return "";

  var select = document.getElementById(prefix + "Bank");
  if (!select || !select.value) return "";

  if (select.value === "Other") {
    var other = document.getElementById(prefix + "BankOther");
    return other ? String(other.value || "").trim() : "";
  }
  return select.value;
}

function validateProofPaymentChannel(fields) {
  var method = normalizePaymentMethod(fields.paymentMethod);
  if (!method || method === "cod") {
    return { ok: false, message: "Select how you paid — JazzCash, Easypaisa, or Bank" };
  }
  if (method === "bank_transfer") {
    var bank = String(fields.bankName || "").trim();
    if (!bank) {
      return { ok: false, message: "Select which bank you paid from" };
    }
    if (bank.length < 2) {
      return { ok: false, message: "Enter your bank name" };
    }
    if (bank.length > 120) {
      return { ok: false, message: "Bank name is too long" };
    }
  }
  return { ok: true, paymentMethod: method, bankName: method === "bank_transfer" ? String(fields.bankName || "").trim() : "" };
}

function validatePaymentProofFields(fields) {
  var channelCheck = validateProofPaymentChannel(fields);
  if (!channelCheck.ok) {
    return channelCheck;
  }

  var txnCheck = validateTransactionId(fields.transactionId, channelCheck.paymentMethod);
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
    paymentMethod: channelCheck.paymentMethod,
    bankName: channelCheck.bankName,
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
