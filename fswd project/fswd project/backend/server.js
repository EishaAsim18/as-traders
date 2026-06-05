/**
 * A & S Traders backend — Express + MongoDB
 */
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const connectDB = require("./db");

const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/products");
const invoiceRoutes = require("./routes/invoices");
const orderRoutes = require("./routes/orders");
const dashboardRoutes = require("./routes/dashboard");
const publicProductRoutes = require("./routes/publicProducts");
const publicOrderRoutes = require("./routes/publicOrders");
const customerAuthRoutes = require("./routes/customerAuth");
const customerRoutes = require("./routes/customers");
const publicContactRoutes = require("./routes/publicContact");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/public/products", publicProductRoutes);
app.use("/api/public/orders", publicOrderRoutes);
app.use("/api/public", publicContactRoutes);
app.use("/api/public/customers", customerAuthRoutes);
app.use("/api/customers", customerRoutes);

app.get("/api/health", (req, res) => {
  res.json({ ok: true, message: "A & S Traders API is running", database: "mongodb" });
});

app.get("/", (req, res) => {
  res.redirect("/customer/index.html");
});

app.use("/admin", express.static(path.join(__dirname, "..", "admin")));
app.use("/customer", express.static(path.join(__dirname, "..", "customer")));
app.use("/assets", express.static(path.join(__dirname, "..", "assets")));
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));
app.use("/react-admin", express.static(path.join(__dirname, "react-admin", "dist")));

async function start() {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Admin: http://localhost:${PORT}/admin/login.html`);
    console.log(`Shop: http://localhost:${PORT}/customer/index.html`);
    console.log(`Customer API: http://localhost:${PORT}/api/public/products`);
    console.log(`API: http://localhost:${PORT}/api/health`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err.message);
  process.exit(1);
});
