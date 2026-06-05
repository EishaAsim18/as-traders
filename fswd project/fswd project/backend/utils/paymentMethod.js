const PAYMENT_METHODS = ["cod", "bank_transfer", "jazzcash", "easypaisa"];

const PAYMENT_METHOD_LABELS = {
  cod: "Cash on delivery (COD)",
  bank_transfer: "Bank transfer",
  jazzcash: "JazzCash",
  easypaisa: "Easypaisa",
};

function normalizePaymentMethod(value, fallback) {
  const v = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  if (PAYMENT_METHODS.includes(v)) return v;
  return fallback || "bank_transfer";
}

function paymentMethodLabel(method) {
  return PAYMENT_METHOD_LABELS[normalizePaymentMethod(method)] || method;
}

function validatePaymentMethod(body, options) {
  const opts = options || {};
  const method = normalizePaymentMethod(body.paymentMethod, opts.defaultMethod || "bank_transfer");
  if (!PAYMENT_METHODS.includes(method)) {
    return {
      ok: false,
      errors: [{ field: "paymentMethod", message: "Choose a valid payment method" }],
    };
  }
  return { ok: true, paymentMethod: method };
}

module.exports = {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  normalizePaymentMethod,
  paymentMethodLabel,
  validatePaymentMethod,
};
