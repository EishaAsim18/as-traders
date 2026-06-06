const MIN_IMAGE_BYTES = 10 * 1024;

function normalizeTxnId(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, "")
    .toUpperCase();
}

function validateTxnId(value) {
  const txnId = normalizeTxnId(value);
  if (!txnId) {
    return { ok: false, message: "Transaction / TID is required" };
  }
  if (txnId.length < 6) {
    return { ok: false, message: "Transaction ID looks too short (minimum 6 characters)" };
  }
  if (txnId.length > 40) {
    return { ok: false, message: "Transaction ID is too long" };
  }
  if (!/^[A-Z0-9-]+$/.test(txnId)) {
    return { ok: false, message: "Use only letters, numbers, and dashes in the transaction ID" };
  }
  if (/^(.)\1+$/.test(txnId)) {
    return { ok: false, message: "Transaction ID does not look valid" };
  }
  return { ok: true, value: txnId };
}

function validateDeclaredAmount(value, orderAmount) {
  const paid = Number(value);
  const expected = Number(orderAmount);

  if (!Number.isFinite(paid) || paid <= 0) {
    return { ok: false, message: "Enter the amount you paid" };
  }
  if (!Number.isFinite(expected) || expected <= 0) {
    return { ok: false, message: "Order amount is missing — contact the shop" };
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
    return { ok: false, message: "Screenshot file is empty", warnings: warnings };
  }

  if (!imageMagicMatches(buffer, mime)) {
    return {
      ok: false,
      message: "File is not a valid screenshot image",
      warnings: warnings,
    };
  }

  if (buffer.length < MIN_IMAGE_BYTES) {
    return {
      ok: false,
      message: "Screenshot is too small — upload a clear full payment screenshot",
      warnings: warnings,
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
  const txnCheck = validateTxnId(body.transactionId || body.txnId);
  if (!txnCheck.ok) {
    return { ok: false, message: txnCheck.message, field: "transactionId" };
  }

  const amountCheck = validateDeclaredAmount(body.paidAmount, order.amount);
  if (!amountCheck.ok) {
    return { ok: false, message: amountCheck.message, field: "paidAmount" };
  }

  const imageCheck = validateImageBuffer(imageMeta.buffer, imageMeta.mime);
  if (!imageCheck.ok) {
    return { ok: false, message: imageCheck.message, field: "dataUrl" };
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
  normalizeTxnId,
  validateTxnId,
  validateDeclaredAmount,
  validateImageBuffer,
  buildPaymentProofChecks,
  validatePaymentProofSubmission,
};
