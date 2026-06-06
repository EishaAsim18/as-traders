require("dotenv").config();

const bcrypt = require("bcryptjs");
const connectDB = require("./db");
const Admin = require("./models/Admin");
const Customer = require("./models/Customer");
const Product = require("./models/Product");
const Invoice = require("./models/Invoice");
const Order = require("./models/Order");
const { calcFinalPrice, getSalePrice } = require("./utils/productPrice");
const { DEFAULT_PAYMENT } = require("./utils/paymentSettings");

// Run once: npm run seed

async function seed() {
  await connectDB();

  console.log("Clearing old demo data...");
  await Promise.all([
    Admin.deleteMany({}),
    Customer.deleteMany({}),
    Product.deleteMany({}),
    Invoice.deleteMany({}),
    Order.deleteMany({}),
  ]);

  const email = (process.env.ADMIN_EMAIL || "admin@astraders.pk").toLowerCase();
  const plainPassword = process.env.ADMIN_PASSWORD || "admin123";
  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  const admin = await Admin.create({
    name: process.env.ADMIN_NAME || "Asim",
    email,
    phone: process.env.ADMIN_PHONE || "03001234567",
    password: hashedPassword,
    paymentSettings: { ...DEFAULT_PAYMENT },
  });

  console.log("Admin created:", admin.email, "| password:", plainPassword);

  const customerPassword = "customer123";
  const demoCustomer = await Customer.create({
    firstName: "Demo",
    lastName: "Customer",
    email: "customer@test.com",
    phone: "03001234567",
    city: "Multan",
    streetAddress: "Shop 14, Bosan Road",
    password: await bcrypt.hash(customerPassword, 10),
  });
  console.log("Demo customer:", demoCustomer.email, "| password:", customerPassword);

  const productRows = [
    {
      sku: "WC-RH-01",
      name: "Rimless wall-hung WC suite",
      category: "Commodes",
      brand: "Faisal",
      color: "White",
      description: "Rimless wall-hung WC with soft-close seat. Suitable for modern bathrooms.",
      price: 42500,
      discountPercent: 0,
      stock: 14,
      reorderLevel: 5,
      location: "Aisle B · Rack 3",
      imageUrl: "/assets/images/products/wc-rh-01.svg",
    },
    {
      sku: "MS-CH-12",
      name: "Chrome Muslim shower kit",
      category: "Muslim showers",
      brand: "Sonex",
      price: 8900,
      stock: 40,
      reorderLevel: 10,
      location: "Aisle C · Bin 1",
      imageUrl: "/assets/images/products/ms-ch-12.svg",
    },
    {
      sku: "PP-25-4",
      name: "PPR pipe 25mm × 4m",
      category: "Pipes",
      brand: "Faisal",
      price: 1890,
      stock: 6,
      reorderLevel: 20,
      location: "Yard · Bay 2",
      imageUrl: "/assets/images/products/pp-25-4.svg",
    },
    {
      sku: "MX-BS-05",
      name: "Basin mixer single lever",
      category: "Taps",
      brand: "Porta",
      price: 12900,
      discountPercent: 20,
      stock: 22,
      reorderLevel: 8,
      location: "Aisle A · Rack 5",
      imageUrl: "/assets/images/products/mx-bs-05.svg",
    },
    {
      sku: "CC-FR-02",
      name: "Concealed cistern frame 3/6L",
      category: "Commodes",
      brand: "Faisal",
      price: 52000,
      stock: 9,
      reorderLevel: 4,
      location: "Aisle B · Rack 1",
      imageUrl: "/assets/images/products/cc-fr-02.svg",
    },
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
      imageUrl: "/assets/images/products/acc-tr-01.jpg",
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
      imageUrl: "/assets/images/products/acc-sd-02.jpg",
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
      imageUrl: "/assets/images/products/bs-5p-01.jpg",
    },
  ];

  const products = await Product.insertMany(
    productRows.map(function (row) {
      const discountPercent = row.discountPercent || 0;
      return {
        ...row,
        discountPercent,
        finalPrice: calcFinalPrice(row.price, discountPercent),
      };
    })
  );

  console.log("Products added:", products.length);

  const DELIVERY_FEE = 1200;

  function productBySku(sku) {
    return products.find(function (p) {
      return p.sku === sku;
    });
  }

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

  const order10492Items = [
    lineItem(productBySku("WC-RH-01"), 1),
    lineItem(productBySku("MS-CH-12"), 1),
    lineItem(productBySku("MX-BS-05"), 1),
  ];
  const t10492 = orderTotals(order10492Items);

  const order10488Items = [
    lineItem(productBySku("CC-FR-02"), 2),
    lineItem(productBySku("WC-RH-01"), 2),
    lineItem(productBySku("MX-BS-05"), 1),
  ];
  const t10488 = orderTotals(order10488Items);

  const order10481Items = [
    lineItem(productBySku("MS-CH-12"), 2),
    lineItem(productBySku("PP-25-4"), 4),
  ];
  const t10481 = orderTotals(order10481Items);

  await Invoice.insertMany([
    {
      invoiceNumber: "INV-240512",
      customerName: "Hassan Traders",
      items: [
        {
          name: "Rimless wall-hung WC suite",
          quantity: 1,
          unitPrice: 42500,
          lineTotal: 42500,
        },
      ],
      subtotal: 42500,
      deliveryFee: 0,
      source: "walk-in",
      tax: 0,
      discount: 0,
      total: 42500,
      status: "pending",
    },
    {
      invoiceNumber: "INV-240508",
      customerName: "Apex Builders",
      items: [
        {
          name: "Concealed cistern frame",
          quantity: 2,
          unitPrice: 52000,
          lineTotal: 104000,
        },
      ],
      subtotal: 248000,
      deliveryFee: 0,
      source: "walk-in",
      tax: 0,
      discount: 0,
      total: 248000,
      status: "paid",
      paidAt: new Date(),
    },
  ]);

  await Order.insertMany([
    {
      orderNumber: "CR-2026-10492",
      source: "online",
      customerName: "Hassan Traders",
      customerPhone: "03001234567",
      customerEmail: "hassan@example.com",
      city: "Multan",
      streetAddress: "Shop 14, Bosan Road",
      deliveryAddress: "Shop 14, Bosan Road, Multan",
      deliveryNotes: "Call before delivery",
      items: order10492Items,
      subtotal: t10492.subtotal,
      deliveryFee: t10492.deliveryFee,
      amount: t10492.amount,
      status: "shipped",
      paymentStatus: "paid",
      paidAmount: t10492.amount,
      paidAt: new Date(),
    },
    {
      orderNumber: "CR-2026-10488",
      source: "online",
      customerName: "Apex Builders",
      customerPhone: "03009876543",
      customerEmail: "apex@builders.pk",
      city: "Multan",
      streetAddress: "Cantt commercial area",
      deliveryAddress: "Cantt commercial area, Multan",
      deliveryNotes: "",
      items: order10488Items,
      subtotal: t10488.subtotal,
      deliveryFee: t10488.deliveryFee,
      amount: t10488.amount,
      status: "delivered",
      paymentStatus: "paid",
      paidAmount: t10488.amount,
      paidAt: new Date(),
    },
    {
      orderNumber: "CR-2026-10481",
      source: "online",
      customerName: "Sara Ahmed",
      customerPhone: "03001112233",
      customerEmail: "sara@example.com",
      city: "Multan",
      streetAddress: "Gulgasht Colony",
      deliveryAddress: "Gulgasht Colony, Multan",
      deliveryNotes: "Evening delivery preferred",
      items: order10481Items,
      subtotal: t10481.subtotal,
      deliveryFee: t10481.deliveryFee,
      amount: t10481.amount,
      status: "pending",
      paymentStatus: "unpaid",
    },
  ]);

  await Order.updateOne(
    { orderNumber: "CR-2026-10481" },
    { $set: { customerId: demoCustomer._id, customerEmail: demoCustomer.email } }
  );

  console.log("Done! Log in with the admin email and password from .env");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
