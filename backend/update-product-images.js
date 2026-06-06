require("dotenv").config();

const connectDB = require("./db");
const Product = require("./models/Product");

const IMAGES = {
  "WC-RH-01": "/assets/images/products/wc-rh-01.svg",
  "MS-CH-12": "/assets/images/products/ms-ch-12.svg",
  "PP-25-4": "/assets/images/products/pp-25-4.svg",
  "MX-BS-05": "/assets/images/products/mx-bs-05.svg",
  "CC-FR-02": "/assets/images/products/cc-fr-02.svg",
  "ACC-TR-01": "/assets/images/products/acc-tr-01.jpg",
  "ACC-SD-02": "/assets/images/products/acc-sd-02.jpg",
  "BS-5P-01": "/assets/images/products/bs-5p-01.jpg",
};

async function run() {
  await connectDB();

  for (const [sku, imageUrl] of Object.entries(IMAGES)) {
    const result = await Product.updateOne({ sku }, { $set: { imageUrl } });
    console.log(sku + ":", result.matchedCount ? "updated" : "not found");
  }

  const { saveProductImage } = require("./utils/saveProductImage");
  const embedded = await Product.find({ imageUrl: /^data:image\//i });
  let migrated = 0;
  for (const product of embedded) {
    try {
      const imageUrl = saveProductImage(product.imageUrl, product.sku);
      product.imageUrl = imageUrl;
      await product.save();
      console.log(product.sku + ":", "migrated to", imageUrl);
      migrated++;
    } catch (err) {
      console.warn(product.sku + ":", err.message);
    }
  }
  console.log("Migrated embedded images:", migrated);

  process.exit(0);
}

run().catch(function (err) {
  console.error(err);
  process.exit(1);
});
