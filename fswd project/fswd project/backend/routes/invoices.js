const express = require("express");
const Invoice = require("../models/Invoice");
const Product = require("../models/Product");
const requireAdmin = require("../middleware/requireAdmin");
const sendInvoicePdf = require("../utils/invoicePdf");
const enrichInvoiceForPdf = require("../utils/enrichInvoiceForPdf");
const { CUSTOMER_SOURCES } = require("../utils/customerSource");
const { computeInvoiceTotal } = require("../utils/invoiceTotals");
const { validateCreateInvoice } = require("../utils/validateInvoice");

const router = express.Router();

router.use(requireAdmin);

// Build invoice number like INV-240512 (simple date-based)
function makeInvoiceNumber() {
  const now = new Date();
  const y = String(now.getFullYear()).slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const random = Math.floor(Math.random() * 900) + 100;
  return `INV-${y}${m}${d}-${random}`;
}

// GET /api/invoices
router.get("/", async (req, res) => {
  try {
    const filter = {};

    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.source && CUSTOMER_SOURCES.includes(req.query.source)) {
      filter.source = req.query.source;
    }

    const invoices = await Invoice.find(filter).sort({ createdAt: -1 });
    res.json({ count: invoices.length, invoices });
  } catch (error) {
    res.status(500).json({ message: "Could not load invoices" });
  }
});

// GET /api/invoices/:id/pdf — download PDF (must be before /:id)
router.get("/:id/pdf", async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    const enriched = await enrichInvoiceForPdf(invoice);
    sendInvoicePdf(enriched, res);
  } catch (error) {
    console.error("PDF error:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: "Could not create PDF" });
    }
  }
});

// GET /api/invoices/:id
router.get("/:id", async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    res.json(invoice);
  } catch (error) {
    res.status(500).json({ message: "Could not load invoice" });
  }
});

// POST /api/invoices — create walk-in bill (validated; optional stock reduction)
router.post("/", async (req, res) => {
  try {
    const check = await validateCreateInvoice(req.body);
    if (!check.ok) {
      return res.status(400).json({
        message: check.errors[0].message,
        errors: check.errors,
      });
    }

    const data = check.data;

    if (data.reduceStock) {
      for (const item of data.lineItems) {
        const product = await Product.findById(item.productId);
        if (!product) {
          return res.status(400).json({ message: "Product no longer available" });
        }
        if (product.stock < item.quantity) {
          return res.status(400).json({
            message: "Only " + product.stock + " left for " + product.name,
          });
        }
        product.stock -= item.quantity;
        await product.save();
      }
    }

    const invoice = await Invoice.create({
      invoiceNumber: makeInvoiceNumber(),
      source: "walk-in",
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      items: data.lineItems,
      subtotal: data.subtotal,
      deliveryFee: data.deliveryFee,
      tax: data.tax,
      discount: data.discount,
      total: data.total,
      paymentMethod: data.paymentMethod,
      dueDate: data.dueDate,
      status: "pending",
    });

    res.status(201).json({ message: "Invoice created", invoice });
  } catch (error) {
    console.error("Create invoice error:", error);
    res.status(500).json({ message: "Could not create invoice" });
  }
});

// PATCH /api/invoices/:id/discount — receptionist manual discount
router.patch("/:id/discount", async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }
    if (invoice.status === "paid") {
      return res.status(400).json({ message: "Cannot change discount on a paid invoice" });
    }

    const totals = computeInvoiceTotal(
      invoice.subtotal,
      invoice.deliveryFee,
      invoice.tax,
      req.body.discount
    );
    if (!totals.ok) {
      return res.status(400).json({ message: totals.message });
    }

    invoice.discount = totals.discount;
    invoice.total = totals.total;
    await invoice.save();

    res.json({ message: "Discount updated", invoice });
  } catch (error) {
    res.status(500).json({ message: "Could not update discount" });
  }
});

// PATCH /api/invoices/:id/pay — mark as paid
router.patch("/:id/pay", async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    invoice.status = "paid";
    invoice.paidAt = new Date();
    await invoice.save();

    res.json({ message: "Payment recorded", invoice });
  } catch (error) {
    res.status(500).json({ message: "Could not update invoice" });
  }
});

module.exports = router;
