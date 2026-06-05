const Order = require("../models/Order");

/** Fill delivery / order fields from linked order when missing on older invoices */
async function enrichInvoiceForPdf(invoice) {
  const inv = invoice.toObject ? invoice.toObject() : { ...invoice };

  if (inv.orderId) {
    const order = await Order.findById(inv.orderId).lean();
    if (order) {
      inv.orderNumber = inv.orderNumber || order.orderNumber;
      inv.deliveryAddress = inv.deliveryAddress || order.deliveryAddress;
      inv.deliveryNotes = inv.deliveryNotes || order.deliveryNotes || "";
      inv.city = inv.city || order.city;
    }
  }

  return inv;
}

module.exports = enrichInvoiceForPdf;
