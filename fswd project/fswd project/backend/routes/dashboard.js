const express = require("express");
const Invoice = require("../models/Invoice");
const Product = require("../models/Product");
const Order = require("../models/Order");
const requireAdmin = require("../middleware/requireAdmin");

const router = express.Router();

router.use(requireAdmin);

// GET /api/dashboard/stats — numbers for admin home page
router.get("/stats", async (req, res) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // Invoices paid today
    const paidToday = await Invoice.find({
      status: "paid",
      paidAt: { $gte: startOfToday },
    });

    const todaySales = paidToday.reduce((sum, inv) => sum + inv.total, 0);

    // Unpaid invoices
    const openInvoices = await Invoice.find({
      status: { $in: ["pending", "overdue"] },
    });

    const openAmount = openInvoices.reduce((sum, inv) => sum + inv.total, 0);

    // Products where stock is low
    const allProducts = await Product.find();
    const lowStockProducts = allProducts.filter((p) => p.stock <= p.reorderLevel);

    // Orders still on the road
    const activeShipments = await Order.countDocuments({
      status: { $in: ["pending", "confirmed", "shipped"] },
    });

    res.json({
      todaySales,
      openInvoiceCount: openInvoices.length,
      openInvoiceAmount: openAmount,
      lowStockCount: lowStockProducts.length,
      activeShipments,
      totalSkus: allProducts.length,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({ message: "Could not load dashboard stats" });
  }
});

module.exports = router;
