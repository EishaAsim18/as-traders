const fs = require("fs");
const path = require("path");

const ALLOWED = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
};

const PRODUCTS_DIR = path.join(__dirname, "..", "..", "assets", "images", "products");

function safeSku(sku) {
  return String(sku || "product")
    .trim()
    .replace(/[^a-zA-Z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

function saveProductImage(dataUrl, sku) {
  const match = String(dataUrl || "").match(/^data:(image\/[\w+.-]+);base64,(.+)$/);
  if (!match) {
    throw new Error("Invalid image. Choose a JPG, PNG, WebP, or SVG file.");
  }

  const mime = match[1].toLowerCase();
  const ext = ALLOWED[mime];
  if (!ext) {
    throw new Error("Only JPG, PNG, WebP, and SVG images are allowed");
  }

  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length > 5 * 1024 * 1024) {
    throw new Error("Image must be 5 MB or smaller");
  }

  fs.mkdirSync(PRODUCTS_DIR, { recursive: true });

  const fileName = safeSku(sku) + ext;
  const filePath = path.join(PRODUCTS_DIR, fileName);
  fs.writeFileSync(filePath, buffer);

  return `/assets/images/products/${fileName}`;
}

function isDataImageUrl(url) {
  return /^data:image\//i.test(String(url || "").trim());
}

/** Turn pasted/uploaded base64 into a real file path; leave normal URLs unchanged. */
function normalizeProductImageUrl(sku, imageUrl) {
  const url = String(imageUrl || "").trim();
  if (!url || !isDataImageUrl(url)) return url;
  if (!sku || !String(sku).trim()) {
    throw new Error("SKU is required to save a product image");
  }
  return saveProductImage(url, sku);
}

module.exports = { saveProductImage, safeSku, normalizeProductImageUrl, isDataImageUrl };
