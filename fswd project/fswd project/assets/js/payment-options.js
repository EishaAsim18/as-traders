/** Payment methods — shared labels + chip UI config */
var PAYMENT_OPTIONS = [
  {
    id: "cod",
    label: "Cash on delivery",
    short: "COD",
    hint: "Pay cash when delivered",
    chipClass: "pay-chip-cod",
    prepaid: false,
    needsProof: false,
    adminNote: "COD — collect cash on delivery",
  },
  {
    id: "bank_transfer",
    label: "Bank transfer",
    short: "Bank",
    hint: "Transfer then upload screenshot",
    chipClass: "pay-chip-bank",
    prepaid: true,
    needsProof: true,
    adminNote: "Bank transfer — verify customer screenshot",
  },
  {
    id: "jazzcash",
    label: "JazzCash",
    short: "JazzCash",
    hint: "Send payment & upload screenshot",
    chipClass: "pay-chip-jazz",
    prepaid: true,
    needsProof: true,
    adminNote: "JazzCash — verify customer screenshot",
  },
  {
    id: "easypaisa",
    label: "Easypaisa",
    short: "Easypaisa",
    hint: "Send payment & upload screenshot",
    chipClass: "pay-chip-easy",
    prepaid: true,
    needsProof: true,
    adminNote: "Easypaisa — verify customer screenshot",
  },
];

function getPaymentOption(id) {
  return PAYMENT_OPTIONS.find(function (o) {
    return o.id === id;
  });
}

function paymentOptionNeedsProof(id) {
  const o = getPaymentOption(id);
  return o ? o.needsProof : false;
}

function paymentOptionIsPrepaid(id) {
  const o = getPaymentOption(id);
  return o ? o.prepaid : false;
}
