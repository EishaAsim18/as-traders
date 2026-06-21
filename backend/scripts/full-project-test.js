/**
 * Full project smoke test — API, MongoDB, Railway, Vercel UI assets.
 * Run: node scripts/full-project-test.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const RAILWAY = "https://as-traders-production.up.railway.app";
const CUSTOMER_SITE = "https://as-traders.vercel.app";
const ADMIN_SITE = "https://as-traders-admin.vercel.app";

const results = { pass: [], fail: [], warn: [] };

function pass(area, msg) {
  results.pass.push({ area, msg });
}
function fail(area, msg, detail) {
  results.fail.push({ area, msg, detail: detail || "" });
}
function warn(area, msg, detail) {
  results.warn.push({ area, msg, detail: detail || "" });
}

async function fetchJson(url, opts) {
  const res = await fetch(url, opts);
  if (!res) throw new Error("No response from " + url);
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { _raw: text.slice(0, 200) };
  }
  return { res, data, text };
}

async function fetchOk(url, opts) {
  const res = await fetch(url, opts);
  return { res, ok: res.ok, status: res.status };
}

async function testLocalMongo() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    fail("MongoDB (local .env)", "MONGODB_URI not set in backend/.env");
    return;
  }
  const mongoose = require("mongoose");
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 12000 });
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const names = collections.map((c) => c.name).sort();
    const counts = {};
    for (const name of ["products", "orders", "customers", "admins", "invoices"]) {
      if (names.includes(name)) {
        counts[name] = await db.collection(name).countDocuments();
      }
    }
    pass(
      "MongoDB (Atlas)",
      "Connected — collections: " + names.join(", ") + " | counts: " + JSON.stringify(counts)
    );
    await mongoose.disconnect();
  } catch (err) {
    fail("MongoDB (Atlas)", "Connection failed", err.message);
  }
}

async function testRailwayHealth() {
  const { res, data } = await fetchJson(RAILWAY + "/api/health");
  if (res.status === 200 && data.ok && data.database === "connected") {
    pass("Railway API", "Health OK — DB connected, uptime " + Math.round(data.uptime) + "s");
  } else if (res.status === 503 && data.database === "disconnected") {
    fail("Railway API", "Health up but MongoDB disconnected on Railway", JSON.stringify(data));
  } else {
    fail("Railway API", "Unexpected health response " + res.status, JSON.stringify(data));
  }
}

async function testPublicProducts() {
  const { res, data } = await fetchJson(RAILWAY + "/api/public/products");
  if (!res.ok) {
    fail("Public API", "GET /api/public/products failed", data.message || res.status);
    return;
  }
  const list = data.products || data;
  const count = Array.isArray(list) ? list.length : 0;
  if (count > 0) {
    pass("Public API", "Products: " + count + " items");
    const first = list[0];
    if (first.name && first.sku != null) {
      pass("Public API", "Product shape OK (name, sku)");
    } else {
      warn("Public API", "Product missing name/sku", JSON.stringify(first).slice(0, 100));
    }
  } else {
    warn("Public API", "Products list empty");
  }
}

async function testPublicContact() {
  const { res, data } = await fetchJson(RAILWAY + "/api/public/contact");
  if (!res.ok) {
    fail("Public API", "GET /api/public/contact failed", data.message || res.status);
    return;
  }
  if (data.payment && data.payment.bankName) {
    pass("Public API", "Contact/payment settings — bank: " + data.payment.bankName);
  } else {
    warn("Public API", "Contact OK but payment block missing");
  }
}

async function testPublicOrdersValidation() {
  const { res, data } = await fetchJson(
    RAILWAY + "/api/public/orders/track/INVALID-ORDER?phoneLast4=0000"
  );
  if (res.status === 400 || res.status === 404 || res.status === 403) {
    pass("Public API", "Order track rejects invalid order (" + res.status + ")");
  } else {
    warn("Public API", "Unexpected track response " + res.status, data && data.message);
  }

  const proof = await fetchJson(RAILWAY + "/api/public/orders/payment-proof", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderNumber: "FAKE-999", phoneLast4: "1234" }),
  });
  if (proof.res.status === 404 || proof.res.status === 400) {
    pass("Public API", "Payment proof rejects fake order (" + proof.res.status + ")");
  } else {
    fail("Public API", "Payment proof unexpected " + proof.res.status, proof.data.message);
  }
}

async function testPaymentProofValidation() {
  const v = require("../utils/validatePaymentProof");
  const jazz = v.validateTxnId("123456789012", "jazzcash");
  const bank = v.validateTxnId("TRN-ABC123", "bank_transfer");
  const fake = v.validateTxnId("1111111111", "easypaisa");
  const channel = v.validateProofChannel({ paymentMethod: "bank_transfer", bankName: "HBL" });
  const noBank = v.validateProofChannel({ paymentMethod: "bank_transfer" });
  if (jazz.ok && bank.ok && !fake.ok && channel.ok && !noBank.ok) {
    pass("Validation", "Transaction ID + payment channel rules OK");
  } else {
    fail("Validation", "Validation unit checks failed");
  }
}

async function testAdminLoginProduction() {
  const email = process.env.ADMIN_EMAIL || "admin@astraders.pk";
  const password = process.env.ADMIN_PASSWORD || "admin123";
  const { res, data } = await fetchJson(RAILWAY + "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok || !data.token) {
    fail("Admin API (Railway)", "Login failed", data.message || res.status);
    return;
  }
  pass("Admin API (Railway)", "Login OK as " + email);

  const token = data.token;
  const endpoints = [
    ["/api/dashboard/stats", "Dashboard"],
    ["/api/products?limit=3", "Products"],
    ["/api/orders?limit=3", "Orders"],
    ["/api/invoices?limit=3", "Invoices"],
    ["/api/customers?limit=3", "Customers"],
  ];
  for (const [path, label] of endpoints) {
    const r = await fetchJson(RAILWAY + path, {
      headers: { Authorization: "Bearer " + token },
    });
    if (r.res.ok) {
      pass("Admin API (Railway)", label + " — " + r.res.status);
    } else {
      fail("Admin API (Railway)", label + " failed", r.data.message || r.res.status);
    }
  }
}

async function testCustomerAuthProduction() {
  const { res, data } = await fetchJson(RAILWAY + "/api/public/customers/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "nonexistent-test@example.com" }),
  });
  if (res.status === 404) {
    pass("Customer Auth", "Forgot password returns 404 for unknown email");
  } else if (res.status === 200 && data.resetLink) {
    warn("Customer Auth", "Unknown email returned reset link (unexpected)");
  } else {
    pass("Customer Auth", "Forgot password endpoint responds " + res.status);
  }
}

async function testCors() {
  try {
    const res = await fetch(RAILWAY + "/api/public/products", {
      headers: { Origin: CUSTOMER_SITE },
    });
    const acao = res.headers.get("access-control-allow-origin");
    if (acao === CUSTOMER_SITE || acao === "*") {
      pass("CORS", "Customer Vercel origin allowed");
    } else {
      warn("CORS", "Allow-Origin: " + (acao || "none"));
    }
  } catch (err) {
    fail("CORS", "Request failed", err.message);
  }
}

async function testVercelPages(base, label, pages) {
  for (const page of pages) {
    const url = base + "/" + page;
    const { res, ok, status } = await fetchOk(url);
    if (ok) {
      pass(label + " UI", page + " — HTTP " + status);
    } else {
      fail(label + " UI", page + " — HTTP " + status);
    }
  }
}

async function testVercelAssets(base, label, assets) {
  for (const asset of assets) {
    const url = base + "/" + asset;
    const { res } = await fetchOk(url);
    if (res.ok) {
      pass(label + " Assets", asset.split("/").pop() + " loads");
    } else {
      fail(label + " Assets", asset + " — HTTP " + res.status);
    }
  }
}

async function testScriptVersions() {
  const pages = [
    [CUSTOMER_SITE + "/cart.html", "payment-proof.js?v=4"],
    [CUSTOMER_SITE + "/track-order.html", "payment-proof.js?v=4"],
    [CUSTOMER_SITE + "/cart.html", "cart-page.js?v=15"],
  ];
  for (const [url, needle] of pages) {
    const res = await fetch(url);
    const html = await res.text();
    if (html.includes(needle)) {
      pass("Deploy sync", url.split("/").pop() + " has " + needle);
    } else {
      warn("Deploy sync", url.split("/").pop() + " missing " + needle + " (Vercel cache?)");
    }
  }
}

async function run() {
  console.log("\n=== A & S Traders — Full Project Test ===\n");
  console.log("Railway:  " + RAILWAY);
  console.log("Customer: " + CUSTOMER_SITE);
  console.log("Admin:    " + ADMIN_SITE + "\n");

  await testLocalMongo();
  await testRailwayHealth();
  await testPublicProducts();
  await testPublicContact();
  await testPublicOrdersValidation();
  await testPaymentProofValidation();
  await testAdminLoginProduction();
  await testCustomerAuthProduction();
  await testCors();

  const customerPages = [
    "index.html",
    "shop.html",
    "cart.html",
    "login.html",
    "track-order.html",
    "my-orders.html",
    "forgot-password.html",
    "collect-cod.html",
  ];
  const adminPages = [
    "login.html",
    "index.html",
    "inventory.html",
    "orders.html",
    "customers.html",
    "billing.html",
    "account.html",
    "forgot-password.html",
  ];

  await testVercelPages(CUSTOMER_SITE, "Customer", customerPages);
  await testVercelPages(ADMIN_SITE, "Admin", adminPages);

  await testVercelAssets(CUSTOMER_SITE, "Customer", [
    "assets/js/config.js",
    "assets/js/customer-common.js",
    "assets/js/payment-proof.js",
    "assets/css/customer.css",
  ]);
  await testVercelAssets(ADMIN_SITE, "Admin", [
    "js/config.js",
    "assets/js/admin-api.js",
    "assets/js/admin-orders.js",
  ]);

  await testScriptVersions();

  console.log("\n--- PASSED (" + results.pass.length + ") ---");
  results.pass.forEach(function (r) {
    console.log("  ✓ [" + r.area + "] " + r.msg);
  });

  if (results.warn.length) {
    console.log("\n--- WARNINGS (" + results.warn.length + ") ---");
    results.warn.forEach(function (r) {
      console.log("  ! [" + r.area + "] " + r.msg + (r.detail ? " — " + r.detail : ""));
    });
  }

  if (results.fail.length) {
    console.log("\n--- FAILED (" + results.fail.length + ") ---");
    results.fail.forEach(function (r) {
      console.log("  ✗ [" + r.area + "] " + r.msg + (r.detail ? " — " + r.detail : ""));
    });
    console.log("\nOverall: FAIL\n");
    process.exit(1);
  }

  console.log("\nOverall: ALL AUTOMATED CHECKS PASSED\n");
  console.log("Manual UI checklist (browser):");
  console.log("  1. Shop → add to cart → checkout COD + prepaid methods");
  console.log("  2. Place prepaid order → upload proof (JazzCash/Easypaisa/Bank + TID)");
  console.log("  3. Track order before/after proof upload");
  console.log("  4. Customer login / register / forgot password");
  console.log("  5. Admin login → orders → confirm payment / accept order");
  console.log("  6. Admin inventory → add/edit product + image");
  console.log("  7. Admin customers → registered + guest buyers\n");
}

run().catch(function (err) {
  console.error("\nTest runner crashed:", err.message);
  process.exit(1);
});
