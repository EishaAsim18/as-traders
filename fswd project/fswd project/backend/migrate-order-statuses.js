require("dotenv").config();

const connectDB = require("./db");
const Order = require("./models/Order");

async function run() {
  await connectDB();

  const r1 = await Order.updateMany({ status: "shipping" }, { $set: { status: "shipped" } });
  console.log("shipping → shipped:", r1.modifiedCount);

  const paidOrders = await Order.find({ status: "paid" });
  for (const o of paidOrders) {
    o.status = "delivered";
    if (!o.paymentStatus || o.paymentStatus === "unpaid") {
      o.paymentStatus = "paid";
      o.paidAmount = o.amount;
      o.paidAt = o.paidAt || new Date();
    }
    await o.save();
  }
  console.log("paid → delivered (+ payment):", paidOrders.length);

  console.log("Done");
  process.exit(0);
}

run().catch(function (err) {
  console.error(err);
  process.exit(1);
});
