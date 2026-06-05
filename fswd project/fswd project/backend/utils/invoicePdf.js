const PDFDocument = require("pdfkit");
const { paymentMethodLabel } = require("./paymentMethod");

const PAGE_LEFT = 50;
const PAGE_RIGHT = 545;
const LABEL_W = 95;
const VALUE_X = PAGE_LEFT + LABEL_W + 8;
const VALUE_W = PAGE_RIGHT - VALUE_X;

const COL_ITEM = PAGE_LEFT;
const COL_ITEM_W = 250;
const COL_QTY = 310;
const COL_QTY_W = 40;
const COL_PRICE = 360;
const COL_PRICE_W = 75;
const COL_TOTAL = 445;
const COL_TOTAL_W = 75;

function formatRs(amount) {
  return "Rs. " + Number(amount).toLocaleString("en-PK");
}

function drawPaidBadge(doc) {
  const x = 430;
  const y = 48;
  doc.save();
  doc.roundedRect(x, y, 105, 28, 4).fillAndStroke("#dcfce7", "#16a34a");
  doc.fillColor("#166534").font("Helvetica-Bold").fontSize(14);
  doc.text("PAID", x, y + 7, { width: 105, align: "center" });
  doc.restore();
  doc.fillColor("#000000").font("Helvetica");
}

function drawUnpaidBadge(doc) {
  const x = 420;
  const y = 48;
  doc.save();
  doc.roundedRect(x, y, 115, 28, 4).fillAndStroke("#fef3c7", "#ca8a04");
  doc.fillColor("#854d0e").font("Helvetica-Bold").fontSize(14);
  doc.text("UNPAID", x, y + 7, { width: 115, align: "center" });
  doc.restore();
  doc.fillColor("#000000").font("Helvetica");
}

function drawLabelValueRow(doc, y, label, value, options) {
  const opts = options || {};
  doc.font(opts.bold ? "Helvetica-Bold" : "Helvetica").fontSize(opts.size || 10);
  doc.fillColor(opts.labelColor || "#555555");
  doc.text(label, PAGE_LEFT, y, { width: LABEL_W, align: "left" });
  doc.fillColor(opts.valueColor || "#000000");
  const valueHeight = doc.heightOfString(value || "—", { width: VALUE_W, fontSize: opts.size || 10 });
  doc.text(value || "—", VALUE_X, y, { width: VALUE_W, align: "left" });
  return y + Math.max(16, valueHeight + 4);
}

function drawSectionHeading(doc, y, title) {
  doc.font("Helvetica-Bold").fontSize(11).fillColor("#000000");
  doc.text(title, PAGE_LEFT, y);
  return y + 18;
}

function writeDeliveryBlock(doc, invoice, startY) {
  let y = startY;
  const hasDelivery =
    invoice.source === "online" || invoice.deliveryAddress || invoice.city || invoice.deliveryNotes;

  if (!hasDelivery) return y;

  y = drawSectionHeading(doc, y, "Deliver to");

  if (invoice.orderNumber) {
    y = drawLabelValueRow(doc, y, "Order ref", invoice.orderNumber);
  }

  if (invoice.deliveryAddress) {
    y = drawLabelValueRow(doc, y, "Address", invoice.deliveryAddress);
  } else if (invoice.city) {
    y = drawLabelValueRow(doc, y, "City", invoice.city);
  }

  if (invoice.deliveryNotes) {
    y = drawLabelValueRow(doc, y, "Notes", invoice.deliveryNotes, { valueColor: "#444444" });
  }

  return y + 8;
}

function drawItemsTable(doc, invoice, startY) {
  let y = startY;

  doc.font("Helvetica-Bold").fontSize(10).fillColor("#000000");
  doc.text("Item", COL_ITEM, y, { width: COL_ITEM_W, align: "left" });
  doc.text("Qty", COL_QTY, y, { width: COL_QTY_W, align: "center" });
  doc.text("Price", COL_PRICE, y, { width: COL_PRICE_W, align: "right" });
  doc.text("Total", COL_TOTAL, y, { width: COL_TOTAL_W, align: "right" });

  y += 14;
  doc.moveTo(PAGE_LEFT, y).lineTo(PAGE_RIGHT, y).stroke();
  y += 10;

  doc.font("Helvetica").fontSize(10);
  (invoice.items || []).forEach(function (item) {
    const nameHeight = doc.heightOfString(item.name, { width: COL_ITEM_W, fontSize: 10 });
    const rowHeight = Math.max(18, nameHeight + 2);

    doc.text(item.name, COL_ITEM, y, { width: COL_ITEM_W, align: "left" });
    doc.text(String(item.quantity), COL_QTY, y, { width: COL_QTY_W, align: "center" });
    doc.text(formatRs(item.unitPrice), COL_PRICE, y, { width: COL_PRICE_W, align: "right" });
    doc.text(formatRs(item.lineTotal), COL_TOTAL, y, { width: COL_TOTAL_W, align: "right" });
    y += rowHeight;
  });

  y += 6;
  doc.moveTo(PAGE_LEFT, y).lineTo(PAGE_RIGHT, y).stroke();
  return y + 12;
}

function drawTotalRow(doc, y, label, value, options) {
  const opts = options || {};
  return drawLabelValueRow(doc, y, label, value, {
    bold: !!opts.bold,
    size: opts.bold ? 13 : 10,
    labelColor: "#000000",
    valueColor: "#000000",
  });
}

// Write invoice PDF to the HTTP response (bill + delivery slip for online orders)
function sendInvoicePdf(invoice, res) {
  const fileName = invoice.invoiceNumber + ".pdf";

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", 'attachment; filename="' + fileName + '"');

  const doc = new PDFDocument({ margin: PAGE_LEFT, size: "A4" });
  doc.pipe(res);

  const isPaid = invoice.status === "paid";
  const isCod = invoice.paymentMethod === "cod";
  const created = new Date(invoice.createdAt).toLocaleDateString("en-PK");

  doc.font("Helvetica-Bold").fontSize(22).fillColor("#000000");
  doc.text("A & S Traders", PAGE_LEFT, 50);
  doc.font("Helvetica").fontSize(10).fillColor("#555555");
  doc.text("Sanitary ware & fittings · Branch: Multan", PAGE_LEFT, 78);

  if (isPaid) {
    drawPaidBadge(doc);
  } else {
    drawUnpaidBadge(doc);
  }

  let y = 108;
  doc.font("Helvetica-Bold").fontSize(16).fillColor("#000000");
  doc.text("INVOICE / DELIVERY BILL", PAGE_LEFT, y, { underline: true });
  y += 30;

  y = drawLabelValueRow(doc, y, "Invoice #", invoice.invoiceNumber);
  if (invoice.orderNumber) {
    y = drawLabelValueRow(doc, y, "Order #", invoice.orderNumber);
  }
  y = drawLabelValueRow(doc, y, "Customer", invoice.customerName);
  if (invoice.customerPhone) {
    y = drawLabelValueRow(doc, y, "Phone", invoice.customerPhone);
  }
  y = drawLabelValueRow(doc, y, "Date", created);
  y = drawLabelValueRow(
    doc,
    y,
    "Payment",
    paymentMethodLabel(invoice.paymentMethod) + (isPaid ? " — RECEIVED" : " — UNPAID")
  );
  y = drawLabelValueRow(
    doc,
    y,
    "Type",
    invoice.source === "walk-in" ? "Walk-in customer" : "Online order"
  );

  y += 6;
  y = writeDeliveryBlock(doc, invoice, y);

  if (!isPaid && isCod) {
    doc.font("Helvetica-Bold").fillColor("#b45309").fontSize(11);
    doc.text("COD — Collect cash from customer: " + formatRs(invoice.total), PAGE_LEFT, y, {
      width: PAGE_RIGHT - PAGE_LEFT,
    });
    y += 18;
    doc.font("Helvetica").fontSize(9).fillColor("#555555");
    doc.text(
      "After collection, report at: /customer/collect-cod.html (order ID + customer phone last 4 digits)",
      PAGE_LEFT,
      y,
      { width: PAGE_RIGHT - PAGE_LEFT }
    );
    y += 22;
    doc.fillColor("#000000");
  }

  y = drawItemsTable(doc, invoice, y);

  y = drawTotalRow(doc, y, "Subtotal:", formatRs(invoice.subtotal));

  const deliveryFee = Number(invoice.deliveryFee) || 0;
  if (deliveryFee > 0) {
    y = drawTotalRow(doc, y, "Delivery:", formatRs(deliveryFee));
  }

  if (Number(invoice.discount) > 0) {
    y = drawTotalRow(doc, y, "Trade discount:", "− " + formatRs(invoice.discount));
  }

  y = drawTotalRow(doc, y, "Grand total:", formatRs(invoice.total), { bold: true });

  doc.font("Helvetica").fontSize(9).fillColor("#666666");
  doc.text(
    isPaid
      ? "Payment received — attach to parcel for delivery · A & S Traders"
      : isCod
        ? "UNPAID — delivery staff: collect cash, then report online · A & S Traders"
        : "Payment pending — A & S Traders",
    PAGE_LEFT,
    y + 24,
    { width: PAGE_RIGHT - PAGE_LEFT, align: "left" }
  );

  doc.end();
}

module.exports = sendInvoicePdf;
