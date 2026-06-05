require("dotenv").config();

const connectDB = require("./db");
const Product = require("./models/Product");
const { getSalePrice } = require("./utils/productPrice");
const { getSalePrice } = require("./utils/productPrice");
const Order = require("./models/Order");

const DELIVERY_FEE = 1200;

function lineItem(product, qty) {
  const unitPrice = getSalePrice(product);
  const lineTotal = unitPrice * qty;
  return {
    productId: product._id,
    sku: product.sku,
    name: product.name,
    quantity: qty,
    unitPrice,
    lineTotal,
  };
}

function orderTotals(items) {
  const subtotal = items.reduce(function (sum, item) {
    return sum + item.lineTotal;
  }, 0);
  return { subtotal, deliveryFee: DELIVERY_FEE, amount: subtotal + DELIVERY_FEE };
}

const DEMO_ORDERS = {
  "CR-2026-10492": [
    ["WC-RH-01", 1],
    ["MS-CH-12", 1],
    ["MX-BS-05", 1],
  ],
  "CR-2026-10488": [
    ["CC-FR-02", 2],
    ["WC-RH-01", 2],
    ["MX-BS-05", 1],
  ],
  "CR-2026-10481": [
    ["MS-CH-12", 2],
    ["PP-25-4", 4],
  ],
};

async function run() {
  await connectDB();

  const products = await Product.find();
  const bySku = {};
  products.forEach(function (p) {
    bySku[p.sku] = p;
  });

  for (const [orderNumber, lines] of Object.entries(DEMO_ORDERS)) {
    const items = lines.map(function ([sku, qty]) {
      const product = bySku[sku];
      if (!product) throw new Error("Missing product: " + sku);
      return lineItem(product, qty);
    });
    const totals = orderTotals(items);

    const result = await Order.updateOne(
      { orderNumber },
      {
        $set: {
          items,
          subtotal: totals.subtotal,
          deliveryFee: totals.deliveryFee,
          amount: totals.amount,
        },
      }
    );

    console.log(orderNumber + ":", result.matchedCount ? "updated" : "not found");
  }

  process.exit(0);
}

run().catch(function (err) {
  console.error(err);
  process.exit(1);
});
