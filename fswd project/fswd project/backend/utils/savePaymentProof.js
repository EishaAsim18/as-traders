const fs = require("fs");
const path = require("path");

const ALLOWED = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const PROOFS_DIR = path.join(__dirname, "..", "..", "uploads", "payment-proofs");

function safeOrderRef(orderNumber) {
  return String(orderNumber || "order")
    .trim()
    .replace(/[^a-zA-Z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

function savePaymentProof(dataUrl, orderNumber) {
  const match = String(dataUrl || "").match(/^data:(image\/[\w+.-]+);base64,(.+)$/);
  if (!match) {
    throw new Error("Invalid image. Choose a JPG, PNG, or WebP screenshot.");
  }

  const mime = match[1].toLowerCase();
  const ext = ALLOWED[mime];
  if (!ext) {
    throw new Error("Only JPG, PNG, and WebP images are allowed");
  }

  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length > 5 * 1024 * 1024) {
    throw new Error("Image must be 5 MB or smaller");
  }

  fs.mkdirSync(PROOFS_DIR, { recursive: true });

  const stamp = Date.now();
  const fileName = safeOrderRef(orderNumber) + "-" + stamp + ext;
  const filePath = path.join(PROOFS_DIR, fileName);
  fs.writeFileSync(filePath, buffer);

  return {
    url: "/uploads/payment-proofs/" + fileName,
    fileName: fileName,
  };
}

module.exports = { savePaymentProof };
