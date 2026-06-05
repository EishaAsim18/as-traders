const ORDER_STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"];

const PAYMENT_STATUSES = ["unpaid", "paid", "partial"];

const STATUS_LABELS = {
  pending: "Pending",
  confirmed: "Confirmed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const CUSTOMER_STATUS_LABELS = {
  pending: "Order received — awaiting confirmation",
  confirmed: "Order confirmed — preparing your items",
  shipped: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Order cancelled",
};

const PAYMENT_LABELS = {
  unpaid: "Unpaid",
  paid: "Paid",
  partial: "Partial payment",
};

/** Map old DB values to the new status set */
function normalizeStatus(status) {
  const map = {
    shipping: "shipped",
    paid: "confirmed",
  };
  const s = map[status] || status;
  return ORDER_STATUSES.includes(s) ? s : "pending";
}

const ALLOWED_TRANSITIONS = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["shipped", "cancelled"],
  shipped: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

function canTransition(from, to) {
  const current = normalizeStatus(from);
  const next = normalizeStatus(to);
  if (current === next) return true;
  return (ALLOWED_TRANSITIONS[current] || []).includes(next);
}

function statusLabel(status, forCustomer) {
  const s = normalizeStatus(status);
  const labels = forCustomer ? CUSTOMER_STATUS_LABELS : STATUS_LABELS;
  return labels[s] || s;
}

module.exports = {
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  STATUS_LABELS,
  PAYMENT_LABELS,
  normalizeStatus,
  canTransition,
  statusLabel,
};
