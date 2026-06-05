const mongoose = require("mongoose");
const { validatePaymentMethod } = require("./paymentMethod");

const NAME_RE = /^[a-zA-Z\s.'-]{2,80}$/;
const PK_PHONE_RE = /^(?:\+92|0)?3[0-9]{9}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CITY_RE = /^[a-zA-Z\s.'-]{2,60}$/;

function trimStr(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePhone(phone) {
  let p = trimStr(phone).replace(/[\s-]/g, "");
  if (p.startsWith("+92")) p = "0" + p.slice(3);
  if (p.startsWith("92") && p.length === 12) p = "0" + p.slice(2);
  return p;
}

function validateDeliveryDetails(body) {
  const errors = [];
  const data = {};

  const customerName = trimStr(body.customerName);
  if (!customerName) {
    errors.push({ field: "customerName", message: "Full name is required" });
  } else if (!NAME_RE.test(customerName)) {
    errors.push({
      field: "customerName",
      message: "Name should be 2–80 letters (no numbers)",
    });
  } else {
    data.customerName = customerName;
  }

  const rawPhone = trimStr(body.customerPhone);
  const customerPhone = normalizePhone(rawPhone);
  if (!rawPhone) {
    errors.push({ field: "customerPhone", message: "Phone number is required" });
  } else if (!PK_PHONE_RE.test(customerPhone)) {
    errors.push({
      field: "customerPhone",
      message: "Use a valid Pakistan mobile (e.g. 03001234567)",
    });
  } else {
    data.customerPhone = customerPhone;
  }

  const customerEmail = trimStr(body.customerEmail);
  if (customerEmail) {
    if (!EMAIL_RE.test(customerEmail) || customerEmail.length > 120) {
      errors.push({ field: "customerEmail", message: "Enter a valid email address" });
    } else {
      data.customerEmail = customerEmail.toLowerCase();
    }
  } else {
    data.customerEmail = "";
  }

  const city = trimStr(body.city);
  if (!city) {
    errors.push({ field: "city", message: "City is required" });
  } else if (!CITY_RE.test(city)) {
    errors.push({ field: "city", message: "Enter a valid city name" });
  } else {
    data.city = city;
  }

  const streetAddress = trimStr(body.streetAddress || body.deliveryAddress);
  if (!streetAddress) {
    errors.push({ field: "streetAddress", message: "Street / shop address is required" });
  } else if (streetAddress.length < 10) {
    errors.push({
      field: "streetAddress",
      message: "Address must be at least 10 characters",
    });
  } else if (streetAddress.length > 300) {
    errors.push({ field: "streetAddress", message: "Address is too long (max 300)" });
  } else {
    data.streetAddress = streetAddress;
  }

  const deliveryNotes = trimStr(body.deliveryNotes);
  if (deliveryNotes.length > 200) {
    errors.push({ field: "deliveryNotes", message: "Notes must be under 200 characters" });
  } else {
    data.deliveryNotes = deliveryNotes;
  }

  // Full line saved on order (city + street for admin & tracking)
  if (data.city && data.streetAddress) {
    data.deliveryAddress = data.streetAddress + ", " + data.city;
  }

  const payCheck = validatePaymentMethod(body, { defaultMethod: "bank_transfer" });
  if (!payCheck.ok) {
    errors.push(...payCheck.errors);
  } else {
    data.paymentMethod = payCheck.paymentMethod;
  }

  return { ok: errors.length === 0, errors, data };
}

function validateCartItems(items) {
  const errors = [];
  const cleaned = [];

  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, errors: [{ field: "items", message: "Cart is empty" }], items: [] };
  }

  if (items.length > 20) {
    return {
      ok: false,
      errors: [{ field: "items", message: "Maximum 20 items per order" }],
      items: [],
    };
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const productId = item && item.productId ? String(item.productId) : "";

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      errors.push({ field: "items", message: "Invalid product in cart (item " + (i + 1) + ")" });
      continue;
    }

    const qty = Number(item.quantity);
    if (!Number.isInteger(qty) || qty < 1 || qty > 99) {
      errors.push({
        field: "items",
        message: "Quantity must be between 1 and 99 for each item",
      });
      continue;
    }

    cleaned.push({ productId, quantity: qty });
  }

  if (cleaned.length === 0 && errors.length === 0) {
    errors.push({ field: "items", message: "No valid items in cart" });
  }

  return { ok: errors.length === 0 && cleaned.length > 0, errors, items: cleaned };
}

function validateOrderNumber(orderNumber) {
  const id = trimStr(orderNumber);
  if (!id) {
    return { ok: false, message: "Order ID is required" };
  }
  if (!/^CR-\d{4}-\d{4,6}$/i.test(id)) {
    return { ok: false, message: "Order ID format should be like CR-2026-10492" };
  }
  return { ok: true, value: id.toUpperCase() };
}

module.exports = {
  validateDeliveryDetails,
  validateCartItems,
  validateOrderNumber,
  normalizePhone,
};
