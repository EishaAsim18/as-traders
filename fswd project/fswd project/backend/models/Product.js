const mongoose = require("mongoose");
const { applyProductPricing } = require("../utils/productPrice");

// Items in the shop / warehouse (commodes, pipes, showers, etc.)
const productSchema = new mongoose.Schema(
  {
    sku: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    category: { type: String, required: true },
    brand: { type: String, default: "Faisal" },
    color: { type: String, default: "", maxlength: 60 },
    description: { type: String, default: "", maxlength: 500 },
    price: { type: Number, required: true },
    discountPercent: { type: Number, default: 0, min: 0, max: 100 },
    finalPrice: { type: Number, required: true },
    stock: { type: Number, required: true, default: 0 },
    reorderLevel: { type: Number, default: 10 },
    location: { type: String, default: "" },
    imageUrl: { type: String, default: "" },
  },
  { timestamps: true }
);

// Helpful flag: true when stock is at or below reorder level
productSchema.virtual("isLowStock").get(function () {
  return this.stock <= this.reorderLevel;
});

productSchema.set("toJSON", { virtuals: true });

productSchema.pre("save", function (next) {
  applyProductPricing(this);
  next();
});

module.exports = mongoose.model("Product", productSchema);
