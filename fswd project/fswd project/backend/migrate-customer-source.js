require("dotenv").config();

const connectDB = require("./db");
const Order = require("./models/Order");
const Invoice = require("./models/Invoice");

async function run() {
  await connectDB();

  const orders = await Order.updateMany(
    { $or: [{ source: { $exists: false } }, { source: null }, { source: "" }] },
    { $set: { source: "online" } }
  );
  console.log("Orders set to online:", orders.modifiedCount);

  const invWalkIn = await Invoice.updateMany(
    {
      $or: [{ source: { $exists: false } }, { source: null }, { source: "" }],
      orderId: { $exists: false },
    },
    { $set: { source: "walk-in", deliveryFee: 0 } }
  );
  console.log("Walk-in invoices (no order link):", invWalkIn.modifiedCount);

  const linked = await Invoice.find({ orderId: { $exists: true, $ne: null } });
  for (const inv of linked) {
    const order = await Order.findById(inv.orderId);
    if (!order) continue;
    inv.source = order.source || "online";
    inv.deliveryFee = inv.source === "online" ? order.deliveryFee ?? 1200 : 0;
    await inv.save();
  }
  console.log("Linked invoices synced from orders:", linked.length);

  process.exit(0);
}

run().catch(function (err) {
  console.error(err);
  process.exit(1);
});
