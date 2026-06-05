const DEFAULT_PAYMENT = {
  bankName: "Habib Bank Limited (HBL)",
  accountTitle: "A & S Traders",
  accountNumber: "12345678901234",
  iban: "PK36HABB0001234567890123",
  jazzCash: "03001234567",
  easypaisa: "03001234567",
  walletTitle: "A & S Traders",
  transferNote:
    "After bank or wallet transfer, upload your payment screenshot on the order confirmation screen.",
  codNote: "Cash on delivery is available when your order is delivered.",
};

function ensurePaymentSettings(raw) {
  const src = raw && typeof raw.toObject === "function" ? raw.toObject() : raw || {};
  const out = { ...DEFAULT_PAYMENT };
  Object.keys(DEFAULT_PAYMENT).forEach(function (key) {
    if (src[key] !== undefined && src[key] !== null && String(src[key]).trim() !== "") {
      out[key] = String(src[key]).trim();
    }
  });
  return out;
}

function validatePaymentSettings(body) {
  const errors = [];
  const data = {
    bankName: String(body.bankName || "").trim(),
    accountTitle: String(body.accountTitle || "").trim(),
    accountNumber: String(body.accountNumber || "").trim(),
    iban: String(body.iban || "").trim().toUpperCase(),
    jazzCash: String(body.jazzCash || "").trim(),
    easypaisa: String(body.easypaisa || "").trim(),
    walletTitle: String(body.walletTitle || "").trim(),
    transferNote: String(body.transferNote || "").trim(),
    codNote: String(body.codNote || "").trim(),
  };

  if (!data.bankName) {
    errors.push({ field: "bankName", message: "Bank name is required" });
  } else if (data.bankName.length > 120) {
    errors.push({ field: "bankName", message: "Bank name is too long" });
  }

  if (!data.accountTitle) {
    errors.push({ field: "accountTitle", message: "Account title is required" });
  } else if (data.accountTitle.length > 120) {
    errors.push({ field: "accountTitle", message: "Account title is too long" });
  }

  if (!data.accountNumber) {
    errors.push({ field: "accountNumber", message: "Account number is required" });
  } else if (data.accountNumber.length > 40) {
    errors.push({ field: "accountNumber", message: "Account number is too long" });
  }

  if (!data.iban) {
    errors.push({ field: "iban", message: "IBAN is required" });
  } else if (data.iban.length > 34) {
    errors.push({ field: "iban", message: "IBAN is too long" });
  }

  if (data.jazzCash && data.jazzCash.length > 20) {
    errors.push({ field: "jazzCash", message: "JazzCash number is too long" });
  }
  if (data.easypaisa && data.easypaisa.length > 20) {
    errors.push({ field: "easypaisa", message: "Easypaisa number is too long" });
  }
  if (data.walletTitle.length > 80) {
    errors.push({ field: "walletTitle", message: "Wallet label is too long" });
  }
  if (data.transferNote.length > 500) {
    errors.push({ field: "transferNote", message: "Transfer note is too long" });
  }
  if (data.codNote.length > 300) {
    errors.push({ field: "codNote", message: "COD note is too long" });
  }

  if (errors.length) {
    return { ok: false, errors };
  }

  return { ok: true, data };
}

function paymentPublicFields(settings) {
  return ensurePaymentSettings(settings);
}

module.exports = {
  DEFAULT_PAYMENT,
  ensurePaymentSettings,
  validatePaymentSettings,
  paymentPublicFields,
};
