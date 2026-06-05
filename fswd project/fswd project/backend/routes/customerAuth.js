const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Customer = require("../models/Customer");
const { validateRegister, validateLogin } = require("../utils/validateCustomerAuth");
const requireCustomer = require("../middleware/requireCustomer");
const { fetchOrdersForCustomer } = require("../utils/customerAdmin");
const { statusLabel, normalizeStatus } = require("../utils/orderStatus");
const { paymentMethodLabel } = require("../utils/paymentMethod");

const router = express.Router();

function validationError(res, errors) {
  return res.status(400).json({
    message: errors[0]?.message || "Please check your details",
    errors,
  });
}

function signCustomerToken(customerId) {
  return jwt.sign({ id: customerId, role: "customer" }, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });
}

function customerPayload(customer) {
  const parts = [];
  if (customer.streetAddress) parts.push(customer.streetAddress);
  if (customer.city) parts.push(customer.city);
  return {
    id: customer._id,
    firstName: customer.firstName,
    lastName: customer.lastName,
    fullName: customer.firstName + " " + customer.lastName,
    email: customer.email,
    phone: customer.phone || "",
    city: customer.city || "",
    streetAddress: customer.streetAddress || "",
    address: parts.join(", "),
  };
}

function blockedResponse(res) {
  return res.status(403).json({
    message: "This account has been blocked. Contact the shop for help.",
    errors: [{ field: "email", message: "Account blocked" }],
  });
}

// POST /api/public/customers/register
router.post("/register", async (req, res) => {
  try {
    const check = validateRegister(req.body);
    if (!check.ok) return validationError(res, check.errors);

    const exists = await Customer.findOne({ email: check.data.email });
    if (exists) {
      return res.status(409).json({
        message: "An account with this email already exists",
        errors: [{ field: "email", message: "Email is already registered" }],
      });
    }

    const hashed = await bcrypt.hash(check.data.password, 10);
    const customer = await Customer.create({
      firstName: check.data.firstName,
      lastName: check.data.lastName,
      email: check.data.email,
      phone: check.data.phone,
      password: hashed,
    });

    const token = signCustomerToken(customer._id);

    res.status(201).json({
      message: "Account created successfully",
      token,
      customer: customerPayload(customer),
    });
  } catch (error) {
    console.error("Customer register error:", error);
    res.status(500).json({ message: "Could not create account" });
  }
});

// POST /api/public/customers/login
router.post("/login", async (req, res) => {
  try {
    const check = validateLogin(req.body);
    if (!check.ok) return validationError(res, check.errors);

    const customer = await Customer.findOne({ email: check.data.email });
    if (!customer) {
      return res.status(401).json({
        message: "Wrong email or password",
        errors: [{ field: "email", message: "Wrong email or password" }],
      });
    }

    if (customer.isBlocked) {
      return blockedResponse(res);
    }

    const match = await bcrypt.compare(check.data.password, customer.password);
    if (!match) {
      return res.status(401).json({
        message: "Wrong email or password",
        errors: [{ field: "password", message: "Wrong email or password" }],
      });
    }

    const token = signCustomerToken(customer._id);

    res.json({
      message: "Login successful",
      token,
      customer: customerPayload(customer),
    });
  } catch (error) {
    console.error("Customer login error:", error);
    res.status(500).json({ message: "Could not sign in" });
  }
});

// GET /api/public/customers/me
router.get("/me", async (req, res) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (!token) return res.status(401).json({ message: "Not signed in" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "customer") {
      return res.status(401).json({ message: "Invalid session" });
    }

    const customer = await Customer.findById(decoded.id);
    if (!customer) return res.status(401).json({ message: "Account not found" });
    if (customer.isBlocked) return blockedResponse(res);

    res.json({ customer: customerPayload(customer) });
  } catch (error) {
    res.status(401).json({ message: "Session expired. Please sign in again." });
  }
});

// GET /api/public/customers/me/orders — purchase history for signed-in customer
router.get("/me/orders", requireCustomer, async (req, res) => {
  try {
    const customer = await Customer.findById(req.customerId);
    if (!customer) {
      return res.status(401).json({ message: "Account not found" });
    }
    if (customer.isBlocked) {
      return blockedResponse(res);
    }

    const orders = await fetchOrdersForCustomer(customer, 100);

    res.json({
      orders: orders.map(function (order) {
        const status = normalizeStatus(order.status);
        return {
          orderNumber: order.orderNumber,
          amount: order.amount,
          subtotal: order.subtotal,
          deliveryFee: order.deliveryFee,
          status: status,
          statusLabel: statusLabel(status, true),
          paymentStatus: order.paymentStatus || "unpaid",
          paymentMethod: order.paymentMethod,
          paymentMethodLabel: paymentMethodLabel(order.paymentMethod),
          createdAt: order.createdAt,
          itemCount: (order.items || []).length,
          items: (order.items || []).map(function (item) {
            return {
              name: item.name,
              sku: item.sku,
              quantity: item.quantity,
              lineTotal: item.lineTotal,
            };
          }),
        };
      }),
    });
  } catch (error) {
    console.error("Customer orders list error:", error);
    res.status(500).json({ message: "Could not load your orders" });
  }
});

module.exports = router;
