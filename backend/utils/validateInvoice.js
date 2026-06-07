const mongoose = require("mongoose");
const Product = require("../models/Product");
const { validatePaymentMethod } = require("./paymentMethod");
const { computeInvoiceTotal } = require("./invoiceTotals");
const { getSalePrice } = require("./productPrice");
const { normalizePhone } = require("./validateDelivery");

const NAME_RE = /^[a-zA-Z\s.'-]{2,80}$/;
const PK_PHONE_RE = /^(?:\+92|0)?3[0-9]{9}$/;

function trimStr(value) {
  return typeof value === "string" ? value.trim() : "";
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function validateDueDate(dueDate) {
  if (!dueDate) {
    return { ok: true, value: startOfToday() };
  }
  const parsed = new Date(dueDate);
  if (Number.isNaN(parsed.getTime())) {
    return { ok: false, field: "dueDate", message: "Enter a valid due date" };
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (parsed < today) {
    return { ok: false, field: "dueDate", message: "Due date cannot be in the past" };
  }
  return { ok: true, value: parsed };
}

async function validateAndBuildInvoiceItems(items, reduceStock) {
  const errors = [];
  const lineItems = [];
  let subtotal = 0;

  if (!Array.isArray(items) || items.length === 0) {
    return {
      ok: false,
      errors: [{ field: "items", message: "Add at least one product to the invoice" }],
      lineItems: [],
      subtotal: 0,
    };
  }

  if (items.length > 30) {
    return {
      ok: false,
      errors: [{ field: "items", message: "Maximum 30 items per invoice" }],
      lineItems: [],
      subtotal: 0,
    };
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i] || {};
    const lineNo = i + 1;
    const productId = trimStr(item.productId);

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      errors.push({ field: "items", message: "Invalid product on line " + lineNo });
      continue;
    }

    const qty = Number(item.quantity);
    if (!Number.isInteger(qty) || qty < 1) {
      errors.push({
        field: "items",
        message: "Quantity must be at least 1 on line " + lineNo,
      });
      continue;
    }
    if (qty > 99) {
      errors.push({
        field: "items",
        message: "Quantity cannot exceed 99 on line " + lineNo,
      });
      continue;
    }

    const product = await Product.findById(productId);
    if (!product) {
      errors.push({ field: "items", message: "Product not found on line " + lineNo });
      continue;
    }

    if (reduceStock && product.stock < qty) {
      errors.push({
        field: "items",
        message:
          "Only " + product.stock + " left in stock for " + product.name,
      });
      continue;
    }

    const unitPrice = getSalePrice(product);
    const lineTotal = unitPrice * qty;
    subtotal += lineTotal;

    lineItems.push({
      productId: product._id,
      name: product.name,
      quantity: qty,
      unitPrice,
      lineTotal,
    });
  }

  if (!lineItems.length && !errors.length) {
    errors.push({ field: "items", message: "No valid items on this invoice" });
  }

  return {
    ok: errors.length === 0 && lineItems.length > 0,
    errors,
    lineItems,
    subtotal,
  };
}

async function validateCreateInvoice(body) {
  const errors = [];
  const data = {};

  const customerName = trimStr(body.customerName);
  if (!customerName) {
    errors.push({ field: "customerName", message: "Customer name is required" });
  } else if (!NAME_RE.test(customerName)) {
    errors.push({
      field: "customerName",
      message: "Name should be 2–80 letters (no numbers)",
    });
  } else {
    data.customerName = customerName;
  }

  const rawPhone = trimStr(body.customerPhone);
  if (!rawPhone) {
    errors.push({ field: "customerPhone", message: "Phone number is required" });
  } else {
    const customerPhone = normalizePhone(rawPhone);
    if (!PK_PHONE_RE.test(customerPhone)) {
      errors.push({
        field: "customerPhone",
        message: "Use a valid Pakistan mobile (e.g. 03001234567)",
      });
    } else {
      data.customerPhone = customerPhone;
    }
  }

  const payCheck = validatePaymentMethod(body, { defaultMethod: "cod" });
  if (!payCheck.ok) {
    errors.push(...payCheck.errors);
  } else {
    data.paymentMethod = payCheck.paymentMethod;
  }

  const dueCheck = validateDueDate(body.dueDate);
  if (!dueCheck.ok) {
    errors.push({ field: dueCheck.field, message: dueCheck.message });
  } else {
    data.dueDate = dueCheck.value;
  }

  const reduceStock = body.reduceStock !== false;
  data.reduceStock = reduceStock;

  const itemsResult = await validateAndBuildInvoiceItems(body.items, reduceStock);
  if (!itemsResult.ok) {
    errors.push(...itemsResult.errors);
  } else {
    data.lineItems = itemsResult.lineItems;
    data.subtotal = itemsResult.subtotal;
  }

  const taxAmount = Number(body.tax) || 0;
  if (Number.isNaN(taxAmount) || taxAmount < 0) {
    errors.push({ field: "tax", message: "Tax cannot be negative" });
  } else {
    data.tax = taxAmount;
  }

  const deliveryAmount =
    body.deliveryFee !== undefined && body.deliveryFee !== null
      ? Number(body.deliveryFee)
      : 0;
  if (Number.isNaN(deliveryAmount) || deliveryAmount < 0) {
    errors.push({ field: "deliveryFee", message: "Delivery fee cannot be negative" });
  } else {
    data.deliveryFee = deliveryAmount;
  }

  const discountAmount = Number(body.discount) || 0;
  if (Number.isNaN(discountAmount) || discountAmount < 0) {
    errors.push({ field: "discount", message: "Discount cannot be negative" });
  } else if (data.subtotal !== undefined) {
    const totals = computeInvoiceTotal(
      data.subtotal,
      data.deliveryFee,
      data.tax,
      discountAmount
    );
    if (!totals.ok) {
      errors.push({ field: "discount", message: totals.message });
    } else {
      data.discount = totals.discount;
      data.total = totals.total;
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    data,
  };
}

module.exports = {
  validateCreateInvoice,
  validateAndBuildInvoiceItems,
  validateDueDate,
};
