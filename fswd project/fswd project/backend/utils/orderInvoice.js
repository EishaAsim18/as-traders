const Invoice = require("../models/Invoice");
const { computeInvoiceTotal } = require("./invoiceTotals");

function makeInvoiceNumber() {
  const now = new Date();
  const y = String(now.getFullYear()).slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const random = Math.floor(Math.random() * 900) + 100;
  return `INV-${y}${m}${d}-${random}`;
}

async function createInvoiceFromOrder(order, options) {
  const opts = options || {};
  const lineItems = (order.items || []).map(function (item) {
    return {
      productId: item.productId,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
    };
  });

  const subtotal = order.subtotal || lineItems.reduce((s, i) => s + i.lineTotal, 0);
  const isOnline = (order.source || "online") === "online";
  const deliveryFee = isOnline ? order.deliveryFee ?? 1200 : 0;
  const discount = Number(opts.discount) || 0;
  const totals = computeInvoiceTotal(subtotal, deliveryFee, 0, discount);
  if (!totals.ok) {
    throw new Error(totals.message);
  }

  const paymentReceived = order.paymentStatus === "paid";

  const invoice = await Invoice.create({
    invoiceNumber: makeInvoiceNumber(),
    source: isOnline ? "online" : "walk-in",
    orderId: order._id,
    orderNumber: order.orderNumber || "",
    city: order.city || "",
    deliveryAddress: order.deliveryAddress || "",
    deliveryNotes: order.deliveryNotes || "",
    customerName: order.customerName,
    customerPhone: order.customerPhone || "",
    items: lineItems,
    subtotal,
    deliveryFee,
    tax: 0,
    discount: totals.discount,
    total: totals.total,
    paymentMethod: order.paymentMethod || "bank_transfer",
    status: paymentReceived ? "paid" : "pending",
    paidAt: paymentReceived ? order.paidAt || new Date() : undefined,
  });

  return invoice;
}

module.exports = { createInvoiceFromOrder, makeInvoiceNumber };
