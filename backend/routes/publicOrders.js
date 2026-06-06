const express = require("express");
const Order = require("../models/Order");
const Product = require("../models/Product");
const Customer = require("../models/Customer");
const {
  validateDeliveryDetails,
  validateCartItems,
  validateOrderNumber,
} = require("../utils/validateDelivery");
const { statusLabel, normalizeStatus } = require("../utils/orderStatus");
const optionalCustomer = require("../middleware/optionalCustomer");
const trackOrderAuth = require("../middleware/trackOrderAuth");
const { DELIVERY_FEE_ONLINE } = require("../utils/customerSource");
const { getSalePrice } = require("../utils/productPrice");
const { paymentMethodLabel } = require("../utils/paymentMethod");
const { resolveOrderTrackAccess, resolvePaymentProofForTrack } = require("../utils/orderAccess");
const { phoneLast4Matches } = require("../utils/phoneMatch");
const { savePaymentProof } = require("../utils/savePaymentProof");
const { normalizePaymentMethod } = require("../utils/paymentMethod");

const router = express.Router();

function makeOrderNumber() {
  const year = new Date().getFullYear();
  const random = Math.floor(10000 + Math.random() * 90000);
  return `CR-${year}-${random}`;
}

function statusLabelForOrder(status) {
  return statusLabel(normalizeStatus(status), true);
}

function validationError(res, errors) {
  return res.status(400).json({
    message: errors[0]?.message || "Please check your details",
    errors,
  });
}

// POST /api/public/orders — online checkout (delivery fee applied automatically)
router.post("/", optionalCustomer, async (req, res) => {
  try {
    const deliveryCheck = validateDeliveryDetails(req.body);
    const itemsCheck = validateCartItems(req.body.items);

    const allErrors = [...deliveryCheck.errors, ...itemsCheck.errors];
    if (allErrors.length > 0) {
      return validationError(res, allErrors);
    }

    const delivery = deliveryCheck.data;
    const cartItems = itemsCheck.items;

    if (req.customerId) {
      const account = await Customer.findById(req.customerId);
      if (!account) {
        return res.status(401).json({ message: "Please sign in again" });
      }
      if (account.isBlocked) {
        return res.status(403).json({
          message: "Your account is blocked. Contact A & S Traders for help.",
        });
      }
    }

    if (delivery.customerEmail) {
      const blockedByEmail = await Customer.findOne({
        email: delivery.customerEmail,
        isBlocked: true,
      });
      if (blockedByEmail) {
        return res.status(403).json({
          message: "This email cannot place orders. Contact the shop for help.",
        });
      }
    }

    let subtotal = 0;
    const lineItems = [];

    for (const item of cartItems) {
      const product = await Product.findById(item.productId);

      if (!product) {
        return res.status(400).json({
          message: "A product in your cart is no longer available",
          errors: [{ field: "items", message: "Product not found" }],
        });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({
          message: `Not enough stock for ${product.name}`,
          errors: [
            {
              field: "items",
              message: `Only ${product.stock} left for ${product.name}`,
            },
          ],
        });
      }

      const unitPrice = getSalePrice(product);
      const lineTotal = unitPrice * item.quantity;
      subtotal += lineTotal;

      lineItems.push({
        productId: product._id,
        sku: product.sku,
        name: product.name,
        quantity: item.quantity,
        unitPrice,
        lineTotal,
      });

      product.stock -= item.quantity;
      await product.save();
    }

    const amount = subtotal + DELIVERY_FEE_ONLINE;

    const order = await Order.create({
      orderNumber: makeOrderNumber(),
      source: "online",
      customerId: req.customerId || undefined,
      customerName: delivery.customerName,
      customerPhone: delivery.customerPhone,
      customerEmail: delivery.customerEmail,
      city: delivery.city,
      streetAddress: delivery.streetAddress,
      deliveryAddress: delivery.deliveryAddress,
      deliveryNotes: delivery.deliveryNotes,
      items: lineItems,
      subtotal,
      deliveryFee: DELIVERY_FEE_ONLINE,
      amount,
      paymentMethod: delivery.paymentMethod,
      status: "pending",
      paymentStatus: delivery.paymentMethod === "cod" ? "unpaid" : "unpaid",
      paymentNote:
        delivery.paymentMethod === "cod"
          ? "Customer chose cash on delivery — collect payment at delivery."
          : "",
    });

    if (req.customerId) {
      await Customer.findByIdAndUpdate(req.customerId, {
        city: delivery.city,
        streetAddress: delivery.streetAddress,
        phone: delivery.customerPhone || undefined,
      });
    }

    res.status(201).json({
      message: "Order placed successfully",
      order: {
        orderNumber: order.orderNumber,
        amount: order.amount,
        status: order.status,
        statusLabel: statusLabelForOrder(order.status),
        paymentMethod: order.paymentMethod,
        paymentMethodLabel: paymentMethodLabel(order.paymentMethod),
        delivery: {
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          city: order.city,
          streetAddress: order.streetAddress,
          deliveryAddress: order.deliveryAddress,
        },
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Please try again" });
    }
    console.error("Place order error:", error);
    res.status(500).json({ message: "Could not place order" });
  }
});

// GET /api/public/orders/track/:orderNumber
router.get("/track/:orderNumber", trackOrderAuth, async (req, res) => {
  try {
    const idCheck = validateOrderNumber(req.params.orderNumber);
    if (!idCheck.ok) {
      return res.status(400).json({ message: idCheck.message });
    }

    const order = await Order.findOne({
      orderNumber: new RegExp(
        "^" + idCheck.value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$",
        "i"
      ),
    });

    if (!order) {
      return res.status(404).json({ message: "No order found with that reference" });
    }

    let accountEmail = "";
    if (req.customerId) {
      const account = await Customer.findById(req.customerId).select("email isBlocked");
      if (!account) {
        return res.status(401).json({ message: "Please sign in again" });
      }
      if (account.isBlocked) {
        return res.status(403).json({
          message: "Your account is blocked. Contact A & S Traders for help.",
        });
      }
      accountEmail = account.email || "";
    }

    const access = resolveOrderTrackAccess(order, req, accountEmail);
    if (!access.ok) {
      return res.status(access.status).json({ message: access.message });
    }

    const proofCheck = resolvePaymentProofForTrack(
      order,
      normalizePaymentMethod,
      paymentMethodLabel
    );
    if (!proofCheck.ok) {
      return res.status(proofCheck.status).json({
        message: proofCheck.message,
        requiresPaymentProof: proofCheck.requiresPaymentProof,
        orderNumber: proofCheck.orderNumber,
        paymentMethod: proofCheck.paymentMethod,
        paymentMethodLabel: proofCheck.paymentMethodLabel,
      });
    }

    res.json({
      order: {
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        customerEmail: order.customerEmail,
        city: order.city || "",
        streetAddress: order.streetAddress || order.deliveryAddress,
        deliveryAddress: order.deliveryAddress,
        deliveryNotes: order.deliveryNotes || "",
        items: order.items || [],
        subtotal: order.subtotal,
        deliveryFee: order.deliveryFee,
        amount: order.amount,
        status: order.status,
        statusLabel: statusLabelForOrder(order.status),
        paymentMethod: order.paymentMethod,
        paymentMethodLabel: paymentMethodLabel(order.paymentMethod),
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      },
    });
  } catch (error) {
    console.error("Track order error:", error);
    res.status(500).json({ message: "Could not track order" });
  }
});

// POST /api/public/orders/payment-proof — customer uploads transfer screenshot after checkout
router.post("/payment-proof", async (req, res) => {
  try {
    const idCheck = validateOrderNumber(req.body.orderNumber);
    if (!idCheck.ok) {
      return res.status(400).json({ message: idCheck.message });
    }

    if (!req.body.dataUrl) {
      return res.status(400).json({ message: "Choose a screenshot image to upload" });
    }

    const order = await Order.findOne({
      orderNumber: new RegExp(
        "^" + idCheck.value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$",
        "i"
      ),
    });

    if (!order) {
      return res.status(404).json({ message: "No order found with that reference" });
    }

    const method = normalizePaymentMethod(order.paymentMethod);
    if (method === "cod") {
      return res.status(400).json({
        message: "COD orders do not need a payment screenshot.",
      });
    }

    const phoneLast4 = String(req.body.phoneLast4 || "").trim();
    if (!phoneLast4Matches(order.customerPhone, phoneLast4)) {
      return res.status(403).json({
        message: "Order ID and phone digits do not match.",
      });
    }

    const saved = savePaymentProof(req.body.dataUrl, order.orderNumber);
    order.paymentProofUrl = saved.url;
    order.paymentProofUploadedAt = new Date();
    if (!order.paymentNote) {
      order.paymentNote = "Customer uploaded payment screenshot — pending admin verification";
    }
    await order.save();

    res.json({
      message: "Screenshot received. We will verify and confirm your payment soon.",
      paymentProofUrl: saved.url,
    });
  } catch (error) {
    console.error("Customer payment proof error:", error);
    res.status(400).json({ message: error.message || "Could not upload screenshot" });
  }
});

// POST /api/public/orders/cod-cash-collected — delivery staff reports cash received (admin confirms later)
router.post("/cod-cash-collected", async (req, res) => {
  try {
    const idCheck = validateOrderNumber(req.body.orderNumber);
    if (!idCheck.ok) {
      return res.status(400).json({ message: idCheck.message });
    }

    const phoneLast4 = String(req.body.phoneLast4 || "").trim();
    if (!phoneLast4) {
      return res.status(400).json({ message: "Enter last 4 digits of customer mobile" });
    }

    const order = await Order.findOne({
      orderNumber: new RegExp(
        "^" + idCheck.value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$",
        "i"
      ),
    });

    if (!order) {
      return res.status(404).json({ message: "No order found with that reference" });
    }

    if (order.paymentMethod !== "cod") {
      return res.status(400).json({
        message: "This order is not cash on delivery (COD).",
      });
    }

    if (order.paymentStatus === "paid") {
      return res.json({
        message: "Payment already confirmed by the shop. Thank you.",
        alreadyPaid: true,
      });
    }

    const status = (order.status || "pending").toLowerCase();
    if (status === "cancelled" || status === "pending") {
      return res.status(400).json({
        message: "Order must be confirmed or out for delivery before reporting cash.",
      });
    }
    if (!["confirmed", "shipped", "delivered"].includes(status)) {
      return res.status(400).json({ message: "This order cannot accept a COD report yet." });
    }

    if (!phoneLast4Matches(order.customerPhone, phoneLast4)) {
      return res.status(403).json({
        message: "Order ID and phone digits do not match.",
      });
    }

    const note = String(req.body.note || "").trim().slice(0, 300);
    const now = new Date();

    if (order.codCashReportedAt) {
      return res.json({
        message:
          "Cash collection already reported. The shop will confirm payment soon.",
        reportedAt: order.codCashReportedAt,
        alreadyReported: true,
      });
    }

    order.codCashReportedAt = now;
    order.codCashReportedNote = note || "COD cash collected — reported by delivery";
    await order.save();

    res.json({
      message:
        "Thank you. The shop has been notified. Admin will mark the order as Paid after verifying cash.",
      orderNumber: order.orderNumber,
      reportedAt: now,
    });
  } catch (error) {
    console.error("COD cash report error:", error);
    res.status(500).json({ message: "Could not submit report" });
  }
});

module.exports = router;
