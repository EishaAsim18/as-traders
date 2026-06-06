// Shop payment details — loaded from admin My account (bank transfer section)

var PAYMENT_METHOD_LABELS = {
  cod: "Cash on delivery (COD)",
  bank_transfer: "Bank transfer",
  jazzcash: "JazzCash",
  easypaisa: "Easypaisa",
};

function paymentMethodDisplayLabel(method) {
  return PAYMENT_METHOD_LABELS[method] || method || "—";
}

function isPrepaidPaymentMethod(method) {
  if (typeof paymentOptionIsPrepaid === "function") {
    return paymentOptionIsPrepaid(method);
  }
  return method && method !== "cod";
}
var PAYMENT_INFO = {
  codNote: "Cash on delivery is available when your order is delivered.",
  bankName: "Habib Bank Limited (HBL)",
  accountTitle: "A & S Traders",
  accountNumber: "12345678901234",
  iban: "PK36HABB0001234567890123",
  jazzCash: "03001234567",
  easypaisa: "03001234567",
  walletTitle: "A & S Traders",
  transferNote:
    "After bank or wallet transfer, upload your payment screenshot on the order confirmation screen.",
};

var paymentInfoReady = null;

function getPaymentApiUrl() {
  if (typeof PUBLIC_API_URL !== "undefined") {
    return PUBLIC_API_URL + "/contact";
  }
  if (typeof API_BASE_URL !== "undefined") {
    return API_BASE_URL + "/api/public/contact";
  }
  return "https://as-traders-production.up.railway.app/api/public/contact";
}

function applyPaymentFromServer(payment) {
  if (!payment) return;
  PAYMENT_INFO.bankName = payment.bankName || PAYMENT_INFO.bankName;
  PAYMENT_INFO.accountTitle = payment.accountTitle || PAYMENT_INFO.accountTitle;
  PAYMENT_INFO.accountNumber = payment.accountNumber || PAYMENT_INFO.accountNumber;
  PAYMENT_INFO.iban = payment.iban || PAYMENT_INFO.iban;
  PAYMENT_INFO.jazzCash = payment.jazzCash || PAYMENT_INFO.jazzCash;
  PAYMENT_INFO.easypaisa = payment.easypaisa || PAYMENT_INFO.easypaisa;
  PAYMENT_INFO.walletTitle = payment.walletTitle || PAYMENT_INFO.walletTitle;
  PAYMENT_INFO.transferNote = payment.transferNote || PAYMENT_INFO.transferNote;
  PAYMENT_INFO.codNote = payment.codNote || PAYMENT_INFO.codNote;
}

function loadPaymentInfoFromServer() {
  if (paymentInfoReady) return paymentInfoReady;

  paymentInfoReady = fetch(getPaymentApiUrl())
    .then(function (response) {
      return response.json().then(function (data) {
        if (response.ok && data.payment) {
          applyPaymentFromServer(data.payment);
        }
      });
    })
    .catch(function () {
      /* keep defaults */
    });

  return paymentInfoReady;
}

function escapePaymentHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderPaymentInfoHtml(variant) {
  var p = PAYMENT_INFO;
  var compact = variant === "compact";
  var orderHint = compact
    ? ""
    : '<p class="small text-muted mb-2 mb-md-0">' + escapePaymentHtml(p.transferNote) + "</p>";

  var rows =
    '<dl class="small mb-0' +
    (compact ? " payment-info-dl" : "") +
    '">' +
    '<dt class="text-muted">Bank</dt><dd class="fw-semibold mb-1">' +
    escapePaymentHtml(p.bankName) +
    "</dd>" +
    '<dt class="text-muted">Account title</dt><dd class="fw-semibold mb-1">' +
    escapePaymentHtml(p.accountTitle) +
    "</dd>" +
    '<dt class="text-muted">Account number</dt><dd class="fw-semibold mb-1 font-monospace">' +
    escapePaymentHtml(p.accountNumber) +
    "</dd>" +
    '<dt class="text-muted">IBAN</dt><dd class="fw-semibold mb-1 font-monospace text-break">' +
    escapePaymentHtml(p.iban) +
    "</dd>" +
    '<dt class="text-muted">JazzCash</dt><dd class="fw-semibold mb-1">' +
    escapePaymentHtml(p.jazzCash) +
    " · " +
    escapePaymentHtml(p.walletTitle) +
    "</dd>" +
    '<dt class="text-muted">Easypaisa</dt><dd class="fw-semibold mb-0">' +
    escapePaymentHtml(p.easypaisa) +
    " · " +
    escapePaymentHtml(p.walletTitle) +
    "</dd></dl>";

  if (variant === "footer") {
    return (
      '<p class="mb-1"><span class="opacity-75">' +
      escapePaymentHtml(p.bankName) +
      " ·</span> " +
      escapePaymentHtml(p.accountTitle) +
      "</p>" +
      '<p class="mb-1 font-monospace">' +
      escapePaymentHtml(p.accountNumber) +
      "</p>" +
      '<p class="mb-1 font-monospace text-break">' +
      escapePaymentHtml(p.iban) +
      "</p>" +
      '<p class="mb-0 opacity-75">JazzCash / Easypaisa: ' +
      escapePaymentHtml(p.jazzCash) +
      "</p>"
    );
  }

  if (compact) {
    return (
      '<div class="payment-info-box border rounded-3 p-3 bg-light mb-3">' +
      '<div class="small fw-semibold mb-2">Pay by bank or mobile wallet</div>' +
      '<p class="small text-muted mb-2">' +
      escapePaymentHtml(p.codNote) +
      "</p>" +
      rows +
      '<p class="small text-muted mt-2 mb-0"><strong>Important:</strong> ' +
      escapePaymentHtml(p.transferNote) +
      "</p></div>"
    );
  }

  return (
    '<div class="payment-info-box">' +
    orderHint +
    '<p class="small mb-2">' +
    escapePaymentHtml(p.codNote) +
    "</p>" +
    rows +
    "</div>"
  );
}

function mountPaymentInfo(selector, variant) {
  loadPaymentInfoFromServer().then(function () {
    var el = document.querySelector(selector);
    if (el) {
      el.innerHTML = renderPaymentInfoHtml(variant || "compact");
    }
  });
}

function renderChosenPaymentSummary(method) {
  var label = paymentMethodDisplayLabel(method);
  if (method === "cod") {
    return (
      '<div class="alert alert-success small py-2 mb-0">' +
      "<strong>Payment:</strong> " +
      escapePaymentHtml(label) +
      " — pay the driver in cash when your order arrives." +
      "</div>"
    );
  }
  return (
    '<div class="alert alert-light border small py-2 mb-2">' +
    "<strong>Payment:</strong> " +
    escapePaymentHtml(label) +
    " — use the bank / wallet details below and quote your order number." +
    "</div>"
  );
}
