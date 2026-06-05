function computeInvoiceTotal(subtotal, deliveryFee, tax, discount) {
  const sub = Number(subtotal) || 0;
  const delivery = Number(deliveryFee) || 0;
  const taxAmount = Number(tax) || 0;
  const discountAmount = Number(discount) || 0;

  if (discountAmount < 0) {
    return { ok: false, message: "Discount cannot be negative" };
  }

  const beforeDiscount = sub + delivery + taxAmount;
  if (discountAmount > beforeDiscount) {
    return { ok: false, message: "Discount cannot be more than the bill total" };
  }

  return {
    ok: true,
    total: beforeDiscount - discountAmount,
    discount: discountAmount,
  };
}

module.exports = { computeInvoiceTotal };
