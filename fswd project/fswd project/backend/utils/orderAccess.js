/** Logged-in customer may view a guest checkout order (no customerId on order) */
function customerOwnsGuestOrder(order, accountEmail) {
  const orderEmail = (order.customerEmail || "").trim().toLowerCase();
  const acctEmail = (accountEmail || "").trim().toLowerCase();
  return !!(orderEmail && acctEmail && orderEmail === acctEmail);
}

/**
 * Decide if this request may see full order details.
 * Orders linked to an account (customerId) require that same account's JWT.
 */
function resolveOrderTrackAccess(order, req, accountEmail) {
  if (!order) {
    return { ok: false, status: 404, message: "No order found with that reference" };
  }

  const linkedId = order.customerId ? String(order.customerId) : "";

  if (linkedId) {
    if (!req.customerId) {
      return {
        ok: false,
        status: 401,
        message: "Sign in with the account that placed this order to track it.",
      };
    }
    if (String(req.customerId) !== linkedId) {
      return {
        ok: false,
        status: 403,
        message: "This order is not on your account.",
      };
    }
    return { ok: true };
  }

  if (req.customerId) {
    if (customerOwnsGuestOrder(order, accountEmail)) {
      return { ok: true };
    }
    return {
      ok: false,
      status: 403,
      message: "This order is not on your account.",
    };
  }

  const email = (req.query.email || "").trim().toLowerCase();
  if (!email) {
    return {
      ok: false,
      status: 401,
      message: "Sign in to your account, or enter the email you used at checkout.",
    };
  }

  const orderEmail = (order.customerEmail || "").trim().toLowerCase();
  if (!orderEmail || orderEmail !== email) {
    return {
      ok: false,
      status: 403,
      message: "Order ID and email do not match our records.",
    };
  }

  return { ok: true };
}

module.exports = {
  customerOwnsGuestOrder,
  resolveOrderTrackAccess,
};
