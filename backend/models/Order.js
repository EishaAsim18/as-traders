const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  sku: { type: String, default: "" },
  name: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true },
  lineTotal: { type: Number, required: true },
});

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    source: {
      type: String,
      enum: ["online", "walk-in"],
      default: "online",
    },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
    customerName: { type: String, required: true, maxlength: 80 },
    customerPhone: { type: String, required: true, maxlength: 20 },
    customerEmail: { type: String, default: "", maxlength: 120 },
    city: { type: String, required: true, maxlength: 60 },
    streetAddress: { type: String, required: true, maxlength: 300 },
    deliveryAddress: { type: String, required: true, maxlength: 400 },
    deliveryNotes: { type: String, default: "", maxlength: 200 },
    items: [orderItemSchema],
    subtotal: { type: Number, default: 0 },
    deliveryFee: { type: Number, default: 1200 },
    amount: { type: Number, required: true },
    paymentMethod: {
      type: String,
      enum: ["cod", "bank_transfer", "jazzcash", "easypaisa"],
      default: "bank_transfer",
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid", "partial"],
      default: "unpaid",
    },
    paidAmount: { type: Number, default: 0 },
    paidAt: { type: Date },
    paymentNote: { type: String, default: "", maxlength: 200 },
    paymentProofUrl: { type: String, default: "" },
    paymentProofUploadedAt: { type: Date },
    paymentProofTxnId: { type: String, default: "", maxlength: 40 },
    paymentProofAmount: { type: Number },
    paymentProofSender: { type: String, default: "", maxlength: 80 },
    paymentProofChecks: {
      txnIdValid: { type: Boolean, default: false },
      amountMatch: { type: Boolean, default: false },
      imageValid: { type: Boolean, default: false },
      autoChecksPassed: { type: Boolean, default: false },
      declaredAmount: { type: Number },
      expectedAmount: { type: Number },
      warnings: [{ type: String, maxlength: 200 }],
    },
    /** Delivery staff reported COD cash collected — admin must confirm Paid */
    codCashReportedAt: { type: Date },
    codCashReportedNote: { type: String, default: "", maxlength: 300 },
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice" },
    invoiceNumber: { type: String, default: "" },
    rejectReason: { type: String, default: "", maxlength: 300 },
    confirmedAt: { type: Date },
    shippedAt: { type: Date },
    deliveredAt: { type: Date },
    cancelledAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
