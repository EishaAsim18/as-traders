/**
 * Quick admin API smoke test — run: node scripts/test-admin-api.js
 * Requires server at http://localhost:3000 and seeded DB.
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const BASE = "http://localhost:3000/api";

async function request(method, path, body, token) {
  const opts = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (token) opts.headers.Authorization = "Bearer " + token;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(BASE + path, opts);
  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(method + " " + path + " → non-JSON (" + res.status + ")");
  }
  if (!res.ok) {
    throw new Error(method + " " + path + " → " + (data.message || res.status));
  }
  return data;
}

async function run() {
  const results = [];

  function pass(name) {
    results.push("✓ " + name);
  }

  await request("GET", "/health");
  pass("Health");

  const login = await request("POST", "/auth/login", {
    email: process.env.ADMIN_EMAIL || "admin@astraders.pk",
    password: process.env.ADMIN_PASSWORD || "admin123",
  });
  const token = login.token;
  pass("Admin login");

  const dash = await request("GET", "/dashboard/stats", null, token);
  pass("Dashboard stats");

  const products = await request("GET", "/products", null, token);
  pass("Products list (" + products.products.length + ")");

  const orders = await request("GET", "/orders?limit=5", null, token);
  pass("Orders list (" + orders.count + ")");

  const invoices = await request("GET", "/invoices", null, token);
  pass("Invoices list (" + invoices.invoices.length + ")");

  const pending = orders.orders.find((o) => o.status === "pending");
  if (pending) {
    await request("PATCH", "/orders/" + pending._id + "/accept", {}, token);
    pass("Accept order " + pending.orderNumber);
  } else {
    results.push("· Skip accept (no pending order)");
  }

  const withItems = orders.orders.find((o) => o.items && o.items.length > 0);
  if (withItems && !withItems.invoiceId) {
    const gen = await request(
      "POST",
      "/orders/" + withItems._id + "/generate-invoice",
      {},
      token
    );
    pass("Generate invoice from order");
    const df = gen.invoice && gen.invoice.deliveryFee;
    if (df === 1200 || df === withItems.deliveryFee) {
      pass("Invoice delivery fee = " + df);
    } else {
      throw new Error("Expected deliveryFee 1200, got " + df);
    }
  } else {
    results.push("· Skip generate-invoice (already invoiced or no items)");
  }

  const sample = invoices.invoices[0];
  if (sample) {
    const detail = await request("GET", "/invoices/" + sample._id, null, token);
    pass("Invoice detail " + (detail.invoiceNumber || detail.invoice?.invoiceNumber));
  }

  console.log("\nAdmin API smoke test\n");
  results.forEach(function (line) {
    console.log(line);
  });
  console.log("\nAll checks passed.\n");
}

run().catch(function (err) {
  console.error("\nFAILED:", err.message);
  console.error("Start server: cd backend && npm start\n");
  process.exit(1);
});
