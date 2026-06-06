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

function normalizePaymentTxnId(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, "")
    .toUpperCase();
}

function validatePaymentProofFields(fields) {
  const txnId = normalizePaymentTxnId(fields.transactionId);
  if (!txnId) {
    return { ok: false, message: "Enter the transaction / TID from your payment app" };
  }
  if (txnId.length < 6) {
    return { ok: false, message: "Transaction ID looks too short" };
  }
  if (!/^[A-Z0-9-]+$/.test(txnId)) {
    return { ok: false, message: "Transaction ID should use only letters, numbers, and dashes" };
  }

  const paidAmount = Number(fields.paidAmount);
  const orderAmount = Number(fields.orderAmount);
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
    transactionId: txnId,
    paidAmount: paidAmount,
    senderNote: String(fields.senderNote || "").trim().slice(0, 80),
  };
}

function proofImageUrl(path) {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const origin =
    typeof API_BASE_URL !== "undefined"
      ? API_BASE_URL
      : typeof getBackendOrigin === "function"
        ? getBackendOrigin()
        : "https://as-traders-production.up.railway.app";
  return origin + path;
}
