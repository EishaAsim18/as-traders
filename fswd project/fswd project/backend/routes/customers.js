const express = require("express");
const Customer = require("../models/Customer");
const requireAdmin = require("../middleware/requireAdmin");
const {
  countOrdersForCustomer,
  fetchOrdersForCustomer,
  formatCustomerListItem,
  formatCustomerDetail,
} = require("../utils/customerAdmin");

const router = express.Router();

router.use(requireAdmin);

function buildSearchFilter(q) {
  if (!q || !String(q).trim()) return {};

  const term = String(q).trim();
  const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

  return {
    $or: [
      { firstName: regex },
      { lastName: regex },
      { email: regex },
      { phone: regex },
      { city: regex },
      { streetAddress: regex },
    ],
  };
}

// GET /api/customers — list + search
router.get("/", async (req, res) => {
  try {
    const filter = buildSearchFilter(req.query.q);

    if (req.query.blocked === "true") {
      filter.isBlocked = true;
    } else if (req.query.blocked === "false") {
      filter.isBlocked = { $ne: true };
    }

    const limit = Math.min(Number(req.query.limit) || 100, 200);
    const customers = await Customer.find(filter).sort({ createdAt: -1 }).limit(limit);

    const list = await Promise.all(
      customers.map(async function (customer) {
        const orderCount = await countOrdersForCustomer(customer);
        return formatCustomerListItem(customer, orderCount);
      })
    );

    res.json({ count: list.length, customers: list });
  } catch (error) {
    console.error("List customers error:", error);
    res.status(500).json({ message: "Could not load customers" });
  }
});

// GET /api/customers/:id — profile + purchase history
router.get("/:id", async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const orders = await fetchOrdersForCustomer(customer);
    const orderCount = orders.length;

    res.json({
      customer: formatCustomerDetail(customer, orders, orderCount),
    });
  } catch (error) {
    res.status(400).json({ message: "Invalid customer id" });
  }
});

// PATCH /api/customers/:id/block — block or unblock
router.patch("/:id/block", async (req, res) => {
  try {
    const { blocked } = req.body;
    if (typeof blocked !== "boolean") {
      return res.status(400).json({ message: "blocked must be true or false" });
    }

    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    customer.isBlocked = blocked;
    customer.blockedAt = blocked ? new Date() : undefined;
    await customer.save();

    const orderCount = await countOrdersForCustomer(customer);

    res.json({
      message: blocked ? "Customer blocked" : "Customer unblocked",
      customer: formatCustomerListItem(customer, orderCount),
    });
  } catch (error) {
    res.status(400).json({ message: "Could not update customer status" });
  }
});

module.exports = router;
