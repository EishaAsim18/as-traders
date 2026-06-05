const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const requireAdmin = require("../middleware/requireAdmin");
const {
  validateProfile,
  validatePasswordChange,
  adminPublicFields,
} = require("../utils/validateAdminProfile");
const { validatePaymentSettings } = require("../utils/paymentSettings");

const router = express.Router();

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const admin = await Admin.findOne({ email: email.toLowerCase() });

    if (!admin) {
      return res.status(401).json({ message: "Wrong email or password" });
    }

    const passwordMatches = await bcrypt.compare(password, admin.password);

    if (!passwordMatches) {
      return res.status(401).json({ message: "Wrong email or password" });
    }

    const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      message: "Login successful",
      token,
      admin: adminPublicFields(admin),
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

// GET /api/auth/me — current admin profile
router.get("/me", requireAdmin, async (req, res) => {
  try {
    const admin = await Admin.findById(req.adminId);
    if (!admin) {
      return res.status(404).json({ message: "Account not found" });
    }
    res.json({ admin: adminPublicFields(admin) });
  } catch (error) {
    res.status(500).json({ message: "Could not load account" });
  }
});

// PATCH /api/auth/profile — update name, email, phone
router.patch("/profile", requireAdmin, async (req, res) => {
  try {
    const check = validateProfile(req.body);
    if (!check.ok) {
      return res.status(400).json({
        message: check.errors[0].message,
        errors: check.errors,
      });
    }

    const admin = await Admin.findById(req.adminId);
    if (!admin) {
      return res.status(404).json({ message: "Account not found" });
    }

    const taken = await Admin.findOne({
      email: check.data.email,
      _id: { $ne: admin._id },
    });
    if (taken) {
      return res.status(400).json({ message: "That email is already in use" });
    }

    admin.name = check.data.name;
    admin.email = check.data.email;
    admin.phone = check.data.phone;
    await admin.save();

    res.json({
      message: "Profile updated",
      admin: adminPublicFields(admin),
    });
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({ message: "Could not update profile" });
  }
});

// PATCH /api/auth/payment-settings — bank / wallet details shown on customer shop
router.patch("/payment-settings", requireAdmin, async (req, res) => {
  try {
    const check = validatePaymentSettings(req.body);
    if (!check.ok) {
      return res.status(400).json({
        message: check.errors[0].message,
        errors: check.errors,
      });
    }

    const admin = await Admin.findById(req.adminId);
    if (!admin) {
      return res.status(404).json({ message: "Account not found" });
    }

    admin.paymentSettings = check.data;
    await admin.save();

    res.json({
      message: "Payment details updated — visible on customer checkout and footer",
      admin: adminPublicFields(admin),
    });
  } catch (error) {
    console.error("Payment settings error:", error);
    res.status(500).json({ message: "Could not update payment details" });
  }
});

// PATCH /api/auth/password — change password
router.patch("/password", requireAdmin, async (req, res) => {
  try {
    const check = validatePasswordChange(req.body);
    if (!check.ok) {
      return res.status(400).json({
        message: check.errors[0].message,
        errors: check.errors,
      });
    }

    const admin = await Admin.findById(req.adminId);
    if (!admin) {
      return res.status(404).json({ message: "Account not found" });
    }

    const matches = await bcrypt.compare(check.data.currentPassword, admin.password);
    if (!matches) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    admin.password = await bcrypt.hash(check.data.newPassword, 10);
    await admin.save();

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Password change error:", error);
    res.status(500).json({ message: "Could not change password" });
  }
});

module.exports = router;
