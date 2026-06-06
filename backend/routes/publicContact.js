const express = require("express");
const Admin = require("../models/Admin");
const { adminPublicFields } = require("../utils/validateAdminProfile");
const { paymentPublicFields } = require("../utils/paymentSettings");

const router = express.Router();

const FALLBACK = {
  name: "A & S Traders",
  email: "hello@astraders.pk",
  phone: "+923001234567",
};

async function loadShopAdmin() {
  const preferEmail = (process.env.ADMIN_EMAIL || "").toLowerCase();
  if (preferEmail) {
    const byEmail = await Admin.findOne({ email: preferEmail });
    if (byEmail) return byEmail;
  }
  return Admin.findOne().sort({ createdAt: 1 });
}

// GET /api/public/store-config.js — live contact for customer header (no cache)
router.get("/store-config.js", async (req, res) => {
  try {
    const admin = await loadShopAdmin();
    const contact = admin
      ? { phone: admin.phone || FALLBACK.phone, email: admin.email || FALLBACK.email }
      : { phone: FALLBACK.phone, email: FALLBACK.email };

    res.set("Cache-Control", "no-store");
    res.type("application/javascript");
    res.send("window.__STORE_CONTACT__=" + JSON.stringify(contact) + ";");
  } catch (error) {
    console.error("[GET /api/public/store-config.js]", error.message);
    res.type("application/javascript");
    res.send(
      "window.__STORE_CONTACT__=" + JSON.stringify({ phone: FALLBACK.phone, email: FALLBACK.email }) + ";"
    );
  }
});

// GET /api/public/contact — shop phone/email from admin My account (public, read-only)
router.get("/contact", async (req, res) => {
  const started = Date.now();
  try {
    const admin = await loadShopAdmin();

    if (!admin) {
      console.log("[GET /api/public/contact] no admin row — using fallback");
      return res.json({
        contact: FALLBACK,
        payment: paymentPublicFields(null),
      });
    }

    console.log(
      "[GET /api/public/contact]",
      "admin=" + admin.email,
      "ms=" + (Date.now() - started)
    );

    res.json({
      contact: adminPublicFields(admin),
      payment: paymentPublicFields(admin.paymentSettings),
    });
  } catch (error) {
    console.error("[GET /api/public/contact]", error.message, error.stack);
    res.status(500).json({ message: "Could not load contact details" });
  }
});

module.exports = router;
