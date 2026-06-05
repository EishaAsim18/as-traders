const mongoose = require("mongoose");

// One line on an invoice (product + quantity)
const lineItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  name: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true },
  lineTotal: { type: Number, required: true },
});

// Bill sent to a customer (shop order or walk-in sale)
const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    source: {
      type: String,
      enum: ["online", "walk-in"],
      default: "walk-in",
    },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    orderNumber: { type: String, default: "" },
    city: { type: String, default: "" },
    deliveryAddress: { type: String, default: "" },
    deliveryNotes: { type: String, default: "" },
    customerName: { type: String, required: true },
    customerPhone: { type: String, default: "" },
    items: [lineItemSchema],
    subtotal: { type: Number, required: true },
    deliveryFee: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    paymentMethod: {
      type: String,
      enum: ["cod", "bank_transfer", "jazzcash", "easypaisa"],
      default: "cod",
    },
    status: {
      type: String,
      enum: ["pending", "paid", "overdue"],
      default: "pending",
    },
    dueDate: { type: Date },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Invoice", invoiceSchema);
