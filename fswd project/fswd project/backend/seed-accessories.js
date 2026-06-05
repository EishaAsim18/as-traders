/**
 * Add Accessories / Bath sets demo products without wiping the database.
 * Run: npm run seed-accessories
 */
require("dotenv").config();

const connectDB = require("./db");
const Product = require("./models/Product");
const { calcFinalPrice } = require("./utils/productPrice");

const extras = [
  {
    sku: "ACC-TR-01",
    name: "Chrome towel ring",
    category: "Accessories",
    brand: "Dadex",
    color: "Chrome",
    description: "Wall-mounted towel ring for bath and powder rooms.",
    price: 3200,
    discountPercent: 0,
    stock: 35,
    reorderLevel: 12,
    location: "Aisle D · Rack 2",
    imageUrl: "/assets/images/product-placeholder.svg",
  },
  {
    sku: "ACC-SD-02",
    name: "Soap dish wall mount",
    category: "Accessories",
    brand: "Master",
    color: "Chrome",
    description: "Stainless soap holder — fits standard bathroom tiles.",
    price: 1850,
    stock: 48,
    reorderLevel: 15,
    location: "Aisle D · Rack 2",
    imageUrl: "/assets/images/product-placeholder.svg",
  },
  {
    sku: "BS-5P-01",
    name: "5-piece bath accessory set",
    category: "Bath sets",
    brand: "Sonex",
    color: "Chrome",
    description: "Tumbler, soap dish, towel ring, robe hook, and toilet brush holder.",
    price: 14500,
    discountPercent: 10,
    stock: 18,
    reorderLevel: 6,
    location: "Aisle A · Rack 2",
    imageUrl: "/assets/images/product-placeholder.svg",
  },
];

async function run() {
  await connectDB();
  let added = 0;

  for (const row of extras) {
    const exists = await Product.findOne({ sku: row.sku });
    if (exists) {
      console.log("Skip (exists):", row.sku);
      continue;
    }
    const discountPercent = row.discountPercent || 0;
    await Product.create({
      ...row,
      discountPercent,
      finalPrice: calcFinalPrice(row.price, discountPercent),
    });
    console.log("Added:", row.sku, "—", row.category);
    added += 1;
  }

  console.log(added ? "Done. Added " + added + " product(s)." : "All accessory SKUs already in database.");
  process.exit(0);
}

run().catch(function (err) {
  console.error(err);
  process.exit(1);
});
