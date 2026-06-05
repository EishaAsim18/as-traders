const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, maxlength: 40 },
    lastName: { type: String, required: true, maxlength: 40 },
    email: { type: String, required: true, unique: true, lowercase: true, maxlength: 120 },
    phone: { type: String, default: "", maxlength: 20 },
    city: { type: String, default: "", maxlength: 60 },
    streetAddress: { type: String, default: "", maxlength: 300 },
    isBlocked: { type: Boolean, default: false },
    blockedAt: { type: Date },
    password: { type: String, required: true },
  },
  { timestamps: true }
);

customerSchema.virtual("fullName").get(function () {
  return this.firstName + " " + this.lastName;
});

customerSchema.set("toJSON", {
  virtuals: true,
  transform: function (_doc, ret) {
    delete ret.password;
    return ret;
  },
});

module.exports = mongoose.model("Customer", customerSchema);
