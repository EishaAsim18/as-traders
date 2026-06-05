require("dotenv").config();

const connectDB = require("./db");
const Product = require("./models/Product");
const { applyProductPricing } = require("./utils/productPrice");

async function run() {
  await connectDB();
  const products = await Product.find({});
  let count = 0;

  for (const product of products) {
    applyProductPricing(product);
    await product.save();
    count += 1;
  }

  console.log("Updated pricing on", count, "products");
  process.exit(0);
}

run().catch(function (err) {
  console.error(err);
  process.exit(1);
});
