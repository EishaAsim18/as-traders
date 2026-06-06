/**
 * A & S Traders backend — Express + MongoDB
 */
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");
const connectDB = require("./db");
const { isDbConnected } = require("./db");

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
const PORT = Number(process.env.PORT) || 3000;
const HOST = "0.0.0.0";

const allowedOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map(function (origin) {
    return origin.trim();
  })
  .filter(Boolean);

function getAllowedOrigins() {
  const defaults = [
    "https://fswd-iota.vercel.app",
    "https://fswd-efrx.vercel.app",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ];
  return defaults.concat(allowedOrigins);
}

function isAllowedOrigin(origin) {
  if (!origin) return true;

  if (getAllowedOrigins().includes(origin)) return true;

  if (/^https:\/\/[a-zA-Z0-9.-]+\.vercel\.app$/.test(origin)) {
    return true;
  }

  if (/^https:\/\/[a-zA-Z0-9-]+\.up\.railway\.app$/.test(origin)) {
    return true;
  }

  return false;
}

function validateEnv() {
  const missing = [];
  if (!process.env.MONGODB_URI) missing.push("MONGODB_URI");
  if (!process.env.JWT_SECRET) missing.push("JWT_SECRET");

  if (missing.length) {
    console.error("Missing required environment variables:", missing.join(", "));
    console.error("Set them in Railway → Variables before deploying.");
  }

  if (process.env.MONGODB_URI) {
    if (
      process.env.MONGODB_URI.includes("127.0.0.1") ||
      process.env.MONGODB_URI.includes("localhost")
    ) {
      console.warn(
        "WARNING: MONGODB_URI points to localhost — use MongoDB Atlas in production."
      );
    }
  }
}

app.use(express.json({ limit: "10mb" }));

const corsOptions = {
  origin: function (origin, callback) {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS: " + origin));
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(function (req, res, next) {
  if (
    req.path === "/api/public/products" ||
    req.path === "/api/public/products/" ||
    req.path === "/api/public/contact"
  ) {
    console.log(
      "[public]",
      req.method,
      req.path,
      "origin=" + (req.headers.origin || "-"),
      "db=" + mongoose.connection.readyState
    );
  }
  next();
});

function requireDb(req, res, next) {
  if (isDbConnected()) return next();
  console.error("[DB] Request blocked — MongoDB not connected:", req.method, req.path);
  return res.status(503).json({
    message: "Database temporarily unavailable. Retry in a few seconds.",
    database: "disconnected",
  });
}

app.use("/api/auth", requireDb, authRoutes);
app.use("/api/products", requireDb, productRoutes);
app.use("/api/invoices", requireDb, invoiceRoutes);
app.use("/api/orders", requireDb, orderRoutes);
app.use("/api/dashboard", requireDb, dashboardRoutes);
app.use("/api/public/products", requireDb, publicProductRoutes);
app.use("/api/public/orders", requireDb, publicOrderRoutes);
app.use("/api/public", requireDb, publicContactRoutes);
app.use("/api/public/customers", requireDb, customerAuthRoutes);
app.use("/api/customers", requireDb, customerRoutes);

app.get("/api/health", function (req, res) {
  const connected = isDbConnected();
  res.status(connected ? 200 : 503).json({
    ok: connected,
    message: connected ? "A & S Traders API is running" : "API up but database not connected",
    database: connected ? "connected" : "disconnected",
    uptime: process.uptime(),
  });
});

app.get("/", function (req, res) {
  res.redirect("/customer/index.html");
});

app.use("/admin", express.static(path.join(__dirname, "..", "admin")));
app.use("/customer", express.static(path.join(__dirname, "..", "customer")));
app.use("/assets", express.static(path.join(__dirname, "..", "assets")));
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));
app.use("/react-admin", express.static(path.join(__dirname, "react-admin", "dist")));

app.use(function (err, req, res, _next) {
  console.error("[error]", req.method, req.path, err.message);
  if (!res.headersSent) {
    res.status(500).json({ message: "Internal server error" });
  }
});

let dbRetryTimer = null;

function scheduleDbRetry() {
  if (dbRetryTimer) return;
  dbRetryTimer = setInterval(async function () {
    if (isDbConnected()) {
      clearInterval(dbRetryTimer);
      dbRetryTimer = null;
      console.log("MongoDB reconnected.");
      return;
    }
    try {
      await connectDB();
      clearInterval(dbRetryTimer);
      dbRetryTimer = null;
      console.log("MongoDB connected on retry.");
    } catch (err) {
      console.error("MongoDB retry failed:", err.message);
    }
  }, 10000);
}

async function start() {
  validateEnv();

  app.listen(PORT, HOST, function () {
    console.log("Server listening on " + HOST + ":" + PORT);
    console.log("Health: /api/health");
    console.log("CORS origins:", getAllowedOrigins().join(", "));
  });

  try {
    await connectDB();
  } catch (err) {
    console.error("Initial MongoDB connection failed — retrying every 10s");
    console.error(err.message);
    scheduleDbRetry();
  }
}

start().catch(function (err) {
  console.error("Failed to start server:", err.message);
  process.exit(1);
});
