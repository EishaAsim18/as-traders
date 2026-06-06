const express = require("express");
const Order = require("../models/Order");
const requireAdmin = require("../middleware/requireAdmin");
const sendInvoicePdf = require("../utils/invoicePdf");
const enrichInvoiceForPdf = require("../utils/enrichInvoiceForPdf");
const {
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  normalizeStatus,
  canTransition,
  statusLabel,
} = require("../utils/orderStatus");
const { createInvoiceFromOrder } = require("../utils/orderInvoice");
const { CUSTOMER_SOURCES, sourceLabel } = require("../utils/customerSource");
const { paymentMethodLabel, normalizePaymentMethod } = require("../utils/paymentMethod");
const Invoice = require("../models/Invoice");
const { savePaymentProof } = require("../utils/savePaymentProof");

const router = express.Router();

router.use(requireAdmin);

function formatOrder(order) {
  const o = order.toObject ? order.toObject() : { ...order };
  o.status = normalizeStatus(o.status);
  o.statusLabel = statusLabel(o.status);
  o.source = o.source || "online";
  o.sourceLabel = sourceLabel(o.source);
  o.paymentMethod = o.paymentMethod || "bank_transfer";
  o.paymentMethodLabel = paymentMethodLabel(o.paymentMethod);
  o.codAwaitingConfirm =
    o.paymentMethod === "cod" &&
    o.paymentStatus !== "paid" &&
    !!o.codCashReportedAt;
  o.hasPaymentProof = !!o.paymentProofUrl;
  o.paymentProofChecks = o.paymentProofChecks || null;
  o.paymentProofReadyForReview = !!(
    o.paymentProofUrl &&
    o.paymentProofChecks &&
    o.paymentProofChecks.autoChecksPassed
  );
  return o;
}

function applyStatusTimestamps(order, status) {
  const now = new Date();
  if (status === "confirmed") order.confirmedAt = now;
  if (status === "shipped") order.shippedAt = now;
  if (status === "delivered") order.deliveredAt = now;
  if (status === "cancelled") order.cancelledAt = now;
}

async function syncInvoicePaymentFromOrder(order) {
  if (!order.invoiceId) return;

  if (order.paymentStatus === "paid") {
    await Invoice.findByIdAndUpdate(order.invoiceId, {
      status: "paid",
      paidAt: order.paidAt || new Date(),
    });
  } else if (order.paymentStatus === "unpaid") {
    await Invoice.findByIdAndUpdate(order.invoiceId, {
      status: "pending",
      $unset: { paidAt: 1 },
    });
  }
}

// GET /api/orders — view all orders
router.get("/", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 200);
    const filter = {};

    if (req.query.status) {
      filter.status = normalizeStatus(req.query.status);
    }
    if (req.query.paymentStatus && PAYMENT_STATUSES.includes(req.query.paymentStatus)) {
      filter.paymentStatus = req.query.paymentStatus;
    }
    if (req.query.source && CUSTOMER_SOURCES.includes(req.query.source)) {
      filter.source = req.query.source;
    }
    const payMethods = ["cod", "bank_transfer", "jazzcash", "easypaisa"];
    if (req.query.paymentMethod && payMethods.includes(req.query.paymentMethod)) {
      filter.paymentMethod = req.query.paymentMethod;
    }
    if (req.query.codAwaiting === "1") {
      filter.paymentMethod = "cod";
      filter.codCashReportedAt = { $exists: true, $ne: null };
      if (!req.query.paymentStatus) {
        filter.paymentStatus = { $ne: "paid" };
      }
    }

    const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(limit);
    res.json({
      count: orders.length,
      orders: orders.map(formatOrder),
    });
  } catch (error) {
    res.status(500).json({ message: "Could not load orders" });
  }
});

// PATCH /api/orders/:id/accept — pending → confirmed (before GET /:id)
router.patch("/:id/accept", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const current = normalizeStatus(order.status);
    if (current !== "pending") {
      return res.status(400).json({ message: "Only pending orders can be accepted" });
    }

    order.status = "confirmed";
    applyStatusTimestamps(order, "confirmed");
    await order.save();

    res.json({ message: "Order accepted", order: formatOrder(order) });
  } catch (error) {
    res.status(400).json({ message: error.message || "Could not accept order" });
  }
});

// PATCH /api/orders/:id/reject — → cancelled
router.patch("/:id/reject", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const current = normalizeStatus(order.status);
    if (current === "delivered" || current === "cancelled") {
      return res.status(400).json({ message: "Cannot reject this order" });
    }

    order.status = "cancelled";
    order.rejectReason = String(req.body.reason || "").trim().slice(0, 300);
    applyStatusTimestamps(order, "cancelled");
    await order.save();

    res.json({ message: "Order rejected", order: formatOrder(order) });
  } catch (error) {
    res.status(400).json({ message: error.message || "Could not reject order" });
  }
});

// PATCH /api/orders/:id/status — update delivery status
router.patch("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    if (!ORDER_STATUSES.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const current = normalizeStatus(order.status);
    if (!canTransition(current, status)) {
      return res.status(400).json({
        message: `Cannot change status from ${statusLabel(current)} to ${statusLabel(status)}`,
      });
    }

    order.status = status;
    applyStatusTimestamps(order, status);
    await order.save();

    res.json({ message: "Delivery status updated", order: formatOrder(order) });
  } catch (error) {
    res.status(400).json({ message: error.message || "Could not update status" });
  }
});

// POST /api/orders/:id/generate-invoice
router.post("/:id/generate-invoice", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (normalizeStatus(order.status) === "cancelled") {
      return res.status(400).json({ message: "Cannot invoice a cancelled order" });
    }

    if (order.invoiceId) {
      return res.json({
        message: "Invoice already exists for this order",
        order: formatOrder(order),
        invoiceNumber: order.invoiceNumber,
      });
    }

    const invoice = await createInvoiceFromOrder(order, {
      discount: req.body.discount,
    });
    order.invoiceId = invoice._id;
    order.invoiceNumber = invoice.invoiceNumber;
    await order.save();

    res.json({
      message: "Invoice generated",
      order: formatOrder(order),
      invoice: {
        id: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        total: invoice.total,
      },
    });
  } catch (error) {
    console.error("Generate invoice error:", error);
    res.status(400).json({
      message: error.message || "Could not generate invoice",
    });
  }
});

// PATCH /api/orders/:id/payment — track payment
router.patch("/:id/payment", async (req, res) => {
  try {
    const { paymentStatus, paidAmount, paymentNote, paymentMethod } = req.body;

    if (!PAYMENT_STATUSES.includes(paymentStatus)) {
      return res.status(400).json({ message: "Invalid payment status" });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (paymentMethod) {
      order.paymentMethod = normalizePaymentMethod(paymentMethod, order.paymentMethod);
      if (order.invoiceId) {
        await Invoice.findByIdAndUpdate(order.invoiceId, {
          paymentMethod: order.paymentMethod,
        });
      }
    }

    const amount = paidAmount !== undefined ? Number(paidAmount) : order.amount;

    if (Number.isNaN(amount) || amount < 0) {
      return res.status(400).json({ message: "Invalid paid amount" });
    }

    order.paymentStatus = paymentStatus;
    order.paidAmount = amount;
    order.paymentNote = String(paymentNote || "").trim().slice(0, 200);

    if (paymentStatus === "paid") {
      order.paidAmount = order.amount;
      order.paidAt = new Date();
    } else if (paymentStatus === "unpaid") {
      order.paidAmount = 0;
      order.paidAt = undefined;
    } else {
      order.paidAt = amount > 0 ? new Date() : undefined;
    }

    await order.save();
    await syncInvoicePaymentFromOrder(order);

    res.json({ message: "Payment updated", order: formatOrder(order) });
  } catch (error) {
    res.status(400).json({ message: error.message || "Could not update payment" });
  }
});

// POST /api/orders/:id/payment-proof — admin saves WhatsApp / transfer screenshot
router.post("/:id/payment-proof", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const saved = savePaymentProof(req.body.dataUrl, order.orderNumber);
    order.paymentProofUrl = saved.url;
    order.paymentProofUploadedAt = new Date();

    const note = String(req.body.note || "").trim().slice(0, 200);
    if (note) {
      order.paymentNote = note;
    } else if (!order.paymentNote) {
      order.paymentNote =
        paymentMethodLabel(order.paymentMethod) + " — screenshot saved " + new Date().toLocaleDateString("en-PK");
    }

    if (req.body.markPaid === true && order.paymentStatus !== "paid") {
      order.paymentStatus = "paid";
      order.paidAmount = order.amount;
      order.paidAt = new Date();
    }

    await order.save();
    await syncInvoicePaymentFromOrder(order);

    res.json({
      message: req.body.markPaid
        ? "Screenshot saved and payment marked Paid"
        : "Payment screenshot saved for your records",
      order: formatOrder(order),
      paymentProofUrl: saved.url,
    });
  } catch (error) {
    console.error("Admin payment proof error:", error);
    res.status(400).json({ message: error.message || "Could not save screenshot" });
  }
});

// PATCH /api/orders/:id/confirm-cod-payment — admin confirms cash after delivery report
router.patch("/:id/confirm-cod-payment", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.paymentMethod !== "cod") {
      return res.status(400).json({ message: "This order is not COD" });
    }

    if (order.paymentStatus === "paid") {
      return res.json({ message: "Payment already marked as paid", order: formatOrder(order) });
    }

    const adminNote = String(req.body.note || "").trim().slice(0, 200);
    const reportNote = order.codCashReportedNote
      ? "Delivery report: " + order.codCashReportedNote
      : "";

    order.paymentStatus = "paid";
    order.paidAmount = order.amount;
    order.paidAt = new Date();
    order.paymentNote = [reportNote, adminNote, "COD confirmed by admin"]
      .filter(Boolean)
      .join(" · ")
      .slice(0, 200);

    await order.save();
    await syncInvoicePaymentFromOrder(order);

    res.json({
      message: "COD payment confirmed — invoice will show PAID on next PDF",
      order: formatOrder(order),
    });
  } catch (error) {
    console.error("Confirm COD error:", error);
    res.status(500).json({ message: "Could not confirm COD payment" });
  }
});

// GET /api/orders/:id/invoice/pdf — bill + delivery slip for WhatsApp / print
router.get("/:id/invoice/pdf", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    if (!order.invoiceId) {
      return res.status(400).json({
        message: "Generate an invoice for this order first (Invoice section in order details).",
      });
    }

    const invoice = await Invoice.findById(order.invoiceId);
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    const enriched = await enrichInvoiceForPdf(invoice);
    sendInvoicePdf(enriched, res);
  } catch (error) {
    console.error("Order invoice PDF error:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: "Could not create PDF" });
    }
  }
});

// GET /api/orders/:id (after specific /:id/* routes)
router.get("/:id", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    res.json({ order: formatOrder(order) });
  } catch (error) {
    res.status(400).json({ message: "Invalid order id" });
  }
});

module.exports = router;
