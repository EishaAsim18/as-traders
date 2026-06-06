const mongoose = require("mongoose");
const { DEFAULT_PAYMENT } = require("../utils/paymentSettings");

const paymentSettingsSchema = new mongoose.Schema(
  {
    bankName: { type: String, default: DEFAULT_PAYMENT.bankName, maxlength: 120 },
    accountTitle: { type: String, default: DEFAULT_PAYMENT.accountTitle, maxlength: 120 },
    accountNumber: { type: String, default: DEFAULT_PAYMENT.accountNumber, maxlength: 40 },
    iban: { type: String, default: DEFAULT_PAYMENT.iban, maxlength: 34 },
    jazzCash: { type: String, default: DEFAULT_PAYMENT.jazzCash, maxlength: 20 },
    easypaisa: { type: String, default: DEFAULT_PAYMENT.easypaisa, maxlength: 20 },
    walletTitle: { type: String, default: DEFAULT_PAYMENT.walletTitle, maxlength: 80 },
    transferNote: { type: String, default: DEFAULT_PAYMENT.transferNote, maxlength: 500 },
    codNote: { type: String, default: DEFAULT_PAYMENT.codNote, maxlength: 300 },
  },
  { _id: false }
);

// One admin user who can log into the dashboard
const adminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, maxlength: 120 },
    phone: { type: String, default: "", maxlength: 20 },
    password: { type: String, required: true },
    passwordResetTokenHash: { type: String },
    passwordResetExpires: { type: Date },
    paymentSettings: {
      type: paymentSettingsSchema,
      default: function () {
        return { ...DEFAULT_PAYMENT };
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Admin", adminSchema);
