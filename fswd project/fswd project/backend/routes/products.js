const express = require("express");
const Product = require("../models/Product");
const requireAdmin = require("../middleware/requireAdmin");
const { saveProductImage, normalizeProductImageUrl } = require("../utils/saveProductImage");
const { pickProductFields, validateProductData } = require("../utils/validateProduct");
const { applyProductPricing, ensureProductPricing } = require("../utils/productPrice");

const router = express.Router();

// All product routes need admin login
router.use(requireAdmin);

// POST /api/products/upload-image — save image file for catalog
router.post("/upload-image", async (req, res) => {
  try {
    const { sku, dataUrl } = req.body;
    if (!sku || !String(sku).trim()) {
      return res.status(400).json({ message: "SKU is required to save the image" });
    }
    if (!dataUrl) {
      return res.status(400).json({ message: "Choose an image file to upload" });
    }

    const imageUrl = saveProductImage(dataUrl, sku);
    const skuNorm = String(sku).trim().toUpperCase();
    const linked = await Product.updateOne({ sku: skuNorm }, { $set: { imageUrl } });
    res.json({
      message: linked.matchedCount
        ? "Image saved — linked to product and visible on shop"
        : "Image saved — add or save product with this SKU to show on shop",
      imageUrl,
      linked: !!linked.matchedCount,
    });
  } catch (error) {
    res.status(400).json({ message: error.message || "Could not save image" });
  }
});

// GET /api/products — list with optional filters
router.get("/", async (req, res) => {
  try {
    const filter = {};

    if (req.query.category) {
      filter.category = req.query.category;
    }

    if (req.query.brand) {
      filter.brand = req.query.brand;
    }

    if (req.query.lowStock === "true") {
      // stock <= reorderLevel (we compare in code for clarity)
      const products = await Product.find(filter).sort({ name: 1 });
      const lowStock = products.filter((p) => p.stock <= p.reorderLevel);
      return res.json({ count: lowStock.length, products: lowStock });
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
      products: products.map(ensureProductPricing),
    });
  } catch (error) {
    console.error("Get products error:", error);
    res.status(500).json({ message: "Could not load products" });
  }
});

// GET /api/products/:id
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(ensureProductPricing(product));
  } catch (error) {
    res.status(500).json({ message: "Could not load product" });
  }
});

// POST /api/products — Create
router.post("/", async (req, res) => {
  try {
    const picked = pickProductFields(req.body);
    const check = validateProductData(picked, true);
    if (!check.ok) {
      return res.status(400).json({ message: check.errors[0], errors: check.errors });
    }

    if (check.data.imageUrl) {
      check.data.imageUrl = normalizeProductImageUrl(check.data.sku, check.data.imageUrl);
    }

    const product = await Product.create(check.data);
    res.status(201).json({ message: "Product added", product: ensureProductPricing(product) });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "SKU already exists" });
    }
    res.status(400).json({ message: error.message || "Could not add product" });
  }
});

// PUT /api/products/:id — Update
router.put("/:id", async (req, res) => {
  try {
    const picked = pickProductFields(req.body);
    const check = validateProductData(picked, false);
    if (!check.ok) {
      return res.status(400).json({ message: check.errors[0], errors: check.errors });
    }

    if (check.data.sku) {
      const taken = await Product.findOne({
        sku: check.data.sku,
        _id: { $ne: req.params.id },
      });
      if (taken) {
        return res.status(400).json({ message: "SKU already exists — use a different code" });
      }
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (check.data.imageUrl !== undefined) {
      const skuForImage = check.data.sku || product.sku;
      check.data.imageUrl = normalizeProductImageUrl(skuForImage, check.data.imageUrl);
    }

    Object.assign(product, check.data);
    applyProductPricing(product);
    await product.save();

    res.json({ message: "Product updated", product: ensureProductPricing(product) });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "SKU already exists" });
    }
    res.status(400).json({ message: error.message || "Could not update product" });
  }
});

// PATCH /api/products/:id/stock — quick stock change (+ or -)
router.patch("/:id/stock", async (req, res) => {
  try {
    const { change } = req.body;

    if (typeof change !== "number") {
      return res.status(400).json({ message: "Send change as a number (e.g. -2 or +5)" });
    }

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    product.stock = product.stock + change;

    if (product.stock < 0) {
      return res.status(400).json({ message: "Stock cannot go below zero" });
    }

    await product.save();

    res.json({ message: "Stock updated", product });
  } catch (error) {
    res.status(500).json({ message: "Could not update stock" });
  }
});

// DELETE /api/products/:id — Delete
router.delete("/:id", async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({ message: "Product removed" });
  } catch (error) {
    res.status(500).json({ message: "Could not delete product" });
  }
});

module.exports = router;
