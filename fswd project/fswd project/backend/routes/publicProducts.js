const express = require("express");
const Product = require("../models/Product");
const { ensureProductPricing } = require("../utils/productPrice");

const router = express.Router();

function withLowStockFlag(product) {
  const p = ensureProductPricing(product);
  return {
    ...p,
    isLowStock: p.stock <= p.reorderLevel,
  };
}

// GET /api/public/products/categories
router.get("/categories/list", async (req, res) => {
  try {
    const categories = await Product.distinct("category");
    const brands = await Product.distinct("brand");
    res.json({
      categories: categories.filter(Boolean).sort(),
      brands: brands.filter(Boolean).sort(),
    });
  } catch (error) {
    res.status(500).json({ message: "Could not load filters" });
  }
});

// Public shop — no login needed (read only)
router.get("/", async (req, res) => {
  try {
    const filter = {};

    if (req.query.category) {
      filter.category = req.query.category;
    }
    if (req.query.brand) {
      filter.brand = req.query.brand;
    }
    if (req.query.search) {
      const search = req.query.search.trim();
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
      ];
    }

    const products = await Product.find(filter).sort({ name: 1 });
    res.json({
      count: products.length,
      products: products.map(withLowStockFlag),
    });
  } catch (error) {
    res.status(500).json({ message: "Could not load products" });
  }
});

// GET /api/public/products/:id
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json(withLowStockFlag(product));
  } catch (error) {
    res.status(500).json({ message: "Could not load product" });
  }
});

module.exports = router;
