const MIN_IMAGE_BYTES = 10 * 1024;

const TXN_RULES = {
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

const FAKE_TXN_PATTERNS = [
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
  const v = String(method || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  if (TXN_RULES[v]) return v;
  return "bank_transfer";
}

function normalizeTxnId(value) {
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

function validateTxnId(value, paymentMethod) {
  const txnId = normalizeTxnId(value);
  if (!txnId) {
    return { ok: false, message: "Transaction / TID is required", field: "transactionId" };
  }

  const method = normalizePaymentMethod(paymentMethod);
  const rule = TXN_RULES[method] || TXN_RULES.bank_transfer;

  if (txnId.length < rule.min) {
    return {
      ok: false,
      message: rule.hint + " — too short",
      field: "transactionId",
    };
  }
  if (txnId.length > rule.max) {
    return {
      ok: false,
      message: rule.hint + " — too long",
      field: "transactionId",
    };
  }
  if (!rule.pattern.test(txnId)) {
    return {
      ok: false,
      message: rule.hint,
      field: "transactionId",
    };
  }
  if (looksLikeFakeTxnId(txnId)) {
    return {
      ok: false,
      message: "Enter the real transaction ID from your payment receipt",
      field: "transactionId",
    };
  }

  return { ok: true, value: txnId, paymentMethod: method };
}

function getTxnIdHint(paymentMethod) {
  const rule = TXN_RULES[normalizePaymentMethod(paymentMethod)] || TXN_RULES.bank_transfer;
  return rule.hint + " · e.g. " + rule.example;
}

function validateDeclaredAmount(value, orderAmount) {
  const paid = Number(value);
  const expected = Number(orderAmount);

  if (!Number.isFinite(paid) || paid <= 0) {
    return { ok: false, message: "Enter the amount you paid", field: "paidAmount" };
  }
  if (!Number.isFinite(expected) || expected <= 0) {
    return { ok: false, message: "Order amount is missing — contact the shop", field: "paidAmount" };
  }

  const amountMatch = Math.abs(paid - expected) < 0.01;
  return {
    ok: true,
    value: paid,
    expectedAmount: expected,
    amountMatch: amountMatch,
  };
}

function imageMagicMatches(buffer, mime) {
  if (!buffer || buffer.length < 12) return false;

  if (mime === "image/jpeg" || mime === "image/jpg") {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mime === "image/png") {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    );
  }
  if (mime === "image/webp") {
    return (
      buffer.toString("ascii", 0, 4) === "RIFF" &&
      buffer.toString("ascii", 8, 12) === "WEBP"
    );
  }
  return false;
}

function validateImageBuffer(buffer, mime) {
  const warnings = [];

  if (!buffer || !buffer.length) {
    return { ok: false, message: "Screenshot file is empty", warnings: warnings, field: "dataUrl" };
  }

  if (!imageMagicMatches(buffer, mime)) {
    return {
      ok: false,
      message: "File is not a valid screenshot image",
      warnings: warnings,
      field: "dataUrl",
    };
  }

  if (buffer.length < MIN_IMAGE_BYTES) {
    return {
      ok: false,
      message: "Screenshot is too small — upload a clear full payment screenshot",
      warnings: warnings,
      field: "dataUrl",
    };
  }

  if (buffer.length < 20 * 1024) {
    warnings.push("Screenshot is small — make sure date, amount, and TID are readable");
  }

  return { ok: true, byteSize: buffer.length, warnings: warnings };
}

function buildPaymentProofChecks(order, details) {
  const txn = details.txnCheck || { ok: false };
  const amount = details.amountCheck || { ok: false };
  const image = details.imageCheck || { ok: false };

  const checks = {
    txnIdValid: !!txn.ok,
    amountMatch: !!(amount.ok && amount.amountMatch),
    imageValid: !!image.ok,
    declaredAmount: amount.ok ? amount.value : null,
    expectedAmount: Number(order.amount),
    warnings: []
      .concat(txn.ok ? [] : [txn.message])
      .concat(amount.ok && !amount.amountMatch ? ["Declared amount does not match order total"] : [])
      .concat(image.warnings || []),
  };

  checks.autoChecksPassed =
    checks.txnIdValid && checks.amountMatch && checks.imageValid;

  return checks;
}

function validatePaymentProofSubmission(order, body, imageMeta) {
  const txnCheck = validateTxnId(
    body.transactionId || body.txnId,
    order.paymentMethod
  );
  if (!txnCheck.ok) {
    return { ok: false, message: txnCheck.message, field: txnCheck.field };
  }

  const amountCheck = validateDeclaredAmount(body.paidAmount, order.amount);
  if (!amountCheck.ok) {
    return { ok: false, message: amountCheck.message, field: amountCheck.field };
  }

  const imageCheck = validateImageBuffer(imageMeta.buffer, imageMeta.mime);
  if (!imageCheck.ok) {
    return { ok: false, message: imageCheck.message, field: imageCheck.field };
  }

  const checks = buildPaymentProofChecks(order, { txnCheck, amountCheck, imageCheck });

  return {
    ok: true,
    txnId: txnCheck.value,
    paidAmount: amountCheck.value,
    senderNote: String(body.senderNote || body.sender || "").trim().slice(0, 80),
    checks: checks,
  };
}

module.exports = {
  TXN_RULES,
  normalizePaymentMethod,
  normalizeTxnId,
  validateTxnId,
  getTxnIdHint,
  validateDeclaredAmount,
  validateImageBuffer,
  buildPaymentProofChecks,
  validatePaymentProofSubmission,
};
