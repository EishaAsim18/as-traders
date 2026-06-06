// Shared code for the customer website

const PRODUCT_PLACEHOLDER = "/assets/images/product-placeholder.svg";
const PRODUCT_IMAGES_BY_SKU = {
  "WC-RH-01": "/assets/images/products/wc-rh-01.svg",
  "MS-CH-12": "/assets/images/products/ms-ch-12.svg",
  "PP-25-4": "/assets/images/products/pp-25-4.svg",
  "MX-BS-05": "/assets/images/products/mx-bs-05.svg",
  "CC-FR-02": "/assets/images/products/cc-fr-02.svg",
};
const AUTH_HERO_IMAGE = "/assets/images/auth-showroom.jpg";
const AUTH_HERO_FALLBACK = "/assets/images/auth-showroom.svg";


/** Backend origin — always from config.js (API_BASE_URL). */
function getBackendOrigin() {
  if (window.API_BASE_URL) return window.API_BASE_URL;
  return window.location.origin;
}

function getPublicApiBase() {
  if (window.PUBLIC_API_URL) return window.PUBLIC_API_URL;
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    return window.location.origin + "/api/public";
  }
  return "https://fswd-production.up.railway.app/api/public";
}

/** Page origin for static assets (/assets, /customer). */
function getAppOrigin() {
  const loc = window.location;
  if (loc.protocol === "http:" || loc.protocol === "https:") {
    return loc.origin;
  }
  return getBackendOrigin();
}

function getPublicApiUrl(path) {
  return getPublicApiBase() + path;
}

window.getPublicApiBase = getPublicApiBase;
window.getPublicApiUrl = getPublicApiUrl;

const shopProductsById = {};

function applyStoreContactFromWindow() {
  if (window.__STORE_CONTACT__ && window.__STORE_CONTACT__.phone) {
    applyStoreContact(window.__STORE_CONTACT__);
    return true;
  }
  return false;
}

function storageOk() {
  try {
    localStorage.setItem("__asTest", "1");
    localStorage.removeItem("__asTest");
    return true;
  } catch (e) {
    return false;
  }
}

function productId(product) {
  if (!product) return "";
  const id = product._id || product.id;
  return id ? String(id) : "";
}

function isDataImageUrl(url) {
  return /^data:image\//i.test(url || "");
}

function getProductImageUrl(imageUrl, sku) {
  const url = String(imageUrl || "").trim();

  // Saved file path or external URL from admin upload
  if (url && !isDataImageUrl(url)) {
    return url;
  }

  // Legacy base64 in DB — still show if present (backend migrates these on save)
  if (url && isDataImageUrl(url)) {
    return url;
  }

  if (sku && PRODUCT_IMAGES_BY_SKU[sku]) {
    return PRODUCT_IMAGES_BY_SKU[sku];
  }

  return PRODUCT_PLACEHOLDER;
}

function assetUrl(path) {
  const p = (path || "").trim();
  if (!p) return "";
  if (p.startsWith("data:") || p.startsWith("http://") || p.startsWith("https://")) {
    return p;
  }
  if (p.startsWith("/")) {
    const loc = window.location;
    const onBackend =
      (loc.protocol === "http:" || loc.protocol === "https:") &&
      (loc.port === "3000" || loc.port === "");
    return (onBackend ? getAppOrigin() : getBackendOrigin()) + p;
  }
  return p;
}

function resolveImageUrl(url, sku) {
  const resolved = assetUrl(getProductImageUrl(url, sku));
  if (
    resolved &&
    resolved.indexOf("/assets/images/products/") !== -1 &&
    !isDataImageUrl(resolved) &&
    resolved.indexOf("?") === -1
  ) {
    return resolved + "?v=2";
  }
  return resolved;
}

function attachProductImage(container, imageUrl, alt, sku) {
  const primary = getProductImageUrl(imageUrl, sku);
  const img = document.createElement("img");
  img.alt = alt || "Product";
  img.loading = "lazy";
  img.referrerPolicy = "no-referrer";
  img.className = "product-catalog-img";
  const isVector =
    primary.endsWith(".svg") || primary.indexOf(".svg") !== -1 || isDataImageUrl(primary);
  if (isVector) img.classList.add("product-catalog-img--contain");
  img.src = resolveImageUrl(imageUrl, sku);
  img.onerror = function () {
    const skuFallback = sku && PRODUCT_IMAGES_BY_SKU[sku];
    if (skuFallback && !img.dataset.skuTried) {
      img.dataset.skuTried = "1";
      img.src = assetUrl(skuFallback);
      return;
    }
    img.onerror = null;
    img.src = assetUrl(PRODUCT_PLACEHOLDER);
  };
  container.appendChild(img);
}

async function publicGet(path, queryParams) {
  const headers = {};
  const customerToken = getCustomerToken();
  if (customerToken) {
    headers.Authorization = "Bearer " + customerToken;
  }

  let url = getPublicApiUrl(path);
  if (queryParams && typeof queryParams === "object") {
    const qs = new URLSearchParams();
    Object.keys(queryParams).forEach(function (key) {
      const val = queryParams[key];
      if (val !== undefined && val !== null && String(val).trim() !== "") {
        qs.set(key, String(val).trim());
      }
    });
    const query = qs.toString();
    if (query) {
      url += (path.indexOf("?") >= 0 ? "&" : "?") + query;
    }
  }

  const response = await fetch(url, { headers: headers });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }
  return data;
}

async function customerGet(path) {
  const token = getCustomerToken();
  if (!token) {
    throw new Error("Please sign in to continue");
  }
  const response = await fetch(getPublicApiUrl(path), {
    headers: { Authorization: "Bearer " + token },
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }
  return data;
}

async function publicPost(path, body) {
  const headers = { "Content-Type": "application/json" };
  const customerToken = getCustomerToken();
  if (customerToken) {
    headers.Authorization = "Bearer " + customerToken;
  }
  const response = await fetch(getPublicApiUrl(path), {
    method: "POST",
    headers: headers,
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) {
    const err = new Error(data.message || "Request failed");
    err.errors = data.errors || [];
    throw err;
  }
  return data;
}

function saveLastOrderNumber(orderNumber) {
  localStorage.setItem("asLastOrder", orderNumber);
}

function getLastOrderNumber() {
  return localStorage.getItem("asLastOrder") || "";
}

function formatMoney(amount) {
  return "Rs. " + Number(amount).toLocaleString("en-PK");
}

function setActiveNav() {
  const page = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll("[data-nav]").forEach(function (link) {
    if (link.getAttribute("data-nav") === page) {
      link.classList.add("active");
    }
  });
}

function initCustomerUI() {
  if (!document.getElementById("customerToastWrap")) {
    const wrap = document.createElement("div");
    wrap.id = "customerToastWrap";
    wrap.className = "customer-toast-wrap";
    document.body.appendChild(wrap);
  }
  setActiveNav();
  updateCartBadge();
  updateCustomerAccountNav();
}

function getCustomerToken() {
  return sessionStorage.getItem("asCustomerToken") || "";
}

function getCustomerUser() {
  const token = getCustomerToken();
  if (!token) return null;
  const raw = sessionStorage.getItem("asCustomerUser") || "";
  try {
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function saveCustomerSession(token, customer) {
  sessionStorage.removeItem("asCustomerToken");
  sessionStorage.removeItem("asCustomerUser");
  localStorage.removeItem("asCustomerToken");
  localStorage.removeItem("asCustomerUser");
  localStorage.removeItem("asCustomerRemember");

  const userJson = JSON.stringify(customer);
  sessionStorage.setItem("asCustomerToken", token);
  sessionStorage.setItem("asCustomerUser", userJson);
  updateCustomerAccountNav();
}

function clearCustomerSession() {
  sessionStorage.removeItem("asCustomerToken");
  sessionStorage.removeItem("asCustomerUser");
  localStorage.removeItem("asCustomerToken");
  localStorage.removeItem("asCustomerUser");
  localStorage.removeItem("asCustomerRemember");
  localStorage.removeItem("asLastOrder");
  updateCustomerAccountNav();
}

function getAccountNavVisibilityClasses(el) {
  return (
    Array.from(el.classList)
      .filter(function (c) {
        return c.startsWith("d-");
      })
      .join(" ") || "d-none d-md-inline"
  );
}

function bindCustomerSignOutButton(root) {
  const btn = root.querySelector("[data-customer-signout]");
  if (!btn || btn.dataset.bound === "1") return;
  btn.dataset.bound = "1";
  btn.addEventListener("click", function (e) {
    e.preventDefault();
    logoutCustomer();
  });
}

function mountAccountDropdown(anchor, user) {
  const visible = getAccountNavVisibilityClasses(anchor);
  const wrap = document.createElement("div");
  wrap.className = "dropdown " + visible;
  wrap.setAttribute("data-account-dropdown", "");

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "btn btn-accent btn-sm dropdown-toggle";
  toggle.setAttribute("data-bs-toggle", "dropdown");
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("title", "Signed in as " + user.email);
  toggle.textContent = user.firstName;

  const menu = document.createElement("ul");
  menu.className = "dropdown-menu dropdown-menu-end";

  const ordersItem = document.createElement("li");
  const ordersLink = document.createElement("a");
  ordersLink.className = "dropdown-item";
  ordersLink.href = "my-orders.html";
  ordersLink.textContent = "My orders";
  ordersItem.appendChild(ordersLink);

  const dividerItem = document.createElement("li");
  dividerItem.innerHTML = '<hr class="dropdown-divider" />';

  const signOutItem = document.createElement("li");
  const signOutBtn = document.createElement("button");
  signOutBtn.type = "button";
  signOutBtn.className = "dropdown-item text-danger";
  signOutBtn.setAttribute("data-customer-signout", "");
  signOutBtn.textContent = "Sign out";
  signOutItem.appendChild(signOutBtn);

  menu.appendChild(ordersItem);
  menu.appendChild(dividerItem);
  menu.appendChild(signOutItem);
  wrap.appendChild(toggle);
  wrap.appendChild(menu);
  anchor.replaceWith(wrap);
  bindCustomerSignOutButton(wrap);
}

function mountAccountLink(dropdown) {
  const visible = getAccountNavVisibilityClasses(dropdown);
  const link = document.createElement("a");
  link.href = "login.html";
  link.className = "btn btn-outline-secondary btn-sm " + visible;
  link.setAttribute("data-account-nav", "");
  link.textContent = "Account";
  dropdown.replaceWith(link);
}

function updateCustomerAccountNav() {
  const user = getCustomerUser();

  document.querySelectorAll("[data-account-dropdown]").forEach(function (drop) {
    if (!user || !user.firstName) {
      mountAccountLink(drop);
      return;
    }
    const toggle = drop.querySelector(".dropdown-toggle");
    if (toggle) {
      toggle.textContent = user.firstName;
      toggle.setAttribute("title", "Signed in as " + user.email);
    }
    bindCustomerSignOutButton(drop);
  });

  document.querySelectorAll("[data-account-nav]").forEach(function (el) {
    if (user && user.firstName) {
      mountAccountDropdown(el, user);
    }
  });
}

function logoutCustomer() {
  clearCustomerSession();
  showToast("Signed out", "info");
  if (window.location.pathname.includes("login.html")) return;
  window.location.href = "login.html";
}

function showToast(message, type) {
  initCustomerUI();
  const wrap = document.getElementById("customerToastWrap");
  const t = document.createElement("div");
  t.className = "customer-toast customer-toast-" + (type || "success");
  t.textContent = message;
  wrap.appendChild(t);
  setTimeout(function () {
    t.remove();
  }, 3500);
}

function getCart() {
  try {
    return JSON.parse(localStorage.getItem("asCart") || "[]");
  } catch (e) {
    return [];
  }
}

function saveCart(cart) {
  if (!storageOk()) {
    alert(
      "Cart cannot save here. Open the shop from:\n" +
      getAppOrigin() +
      "/customer/shop.html\n\n(Run: npm start in the backend folder)"
    );
    return false;
  }
  localStorage.setItem("asCart", JSON.stringify(cart));
  updateCartBadge();
  return true;
}

function updateCartBadge() {
  const cart = getCart();
  let count = 0;
  cart.forEach(function (item) {
    count += item.qty;
  });
  document.querySelectorAll("[data-cart-count]").forEach(function (el) {
    el.textContent = count;
    el.style.display = count > 0 ? "inline-block" : "none";
  });
}

function addToCart(product, qty) {
  if (!product || !productId(product)) {
    showToast("Could not add this product. Refresh the page.", "info");
    return false;
  }

  if (product.stock !== undefined && product.stock <= 0) {
    showToast("This item is out of stock", "info");
    return false;
  }

  const cart = getCart();
  const amount = qty || 1;
  const pid = productId(product);
  const existing = cart.find(function (item) {
    return String(item.id) === pid;
  });

  if (existing) {
    existing.qty += amount;
  } else {
    cart.push({
      id: pid,
      sku: product.sku,
      name: product.name,
      brand: product.brand || "",
      price: productSalePrice(product),
      listPrice: productListPrice(product),
      discountPercent: productDiscountPercent(product),
      imageUrl: (product.imageUrl || "").trim(),
      qty: amount,
    });
  }

  if (saveCart(cart)) {
    showToast("Added to cart — " + product.name, "success");
    return true;
  }
  return false;
}

function registerShopProduct(product) {
  const pid = productId(product);
  if (pid) {
    shopProductsById[pid] = product;
  }
}

/** Refresh cart line prices from live catalog (after admin discount changes). */
async function syncCartPricesFromServer() {
  const cart = getCart();
  if (!cart.length) return cart;

  try {
    const data = await publicGet("/products");
    const byId = {};
    (data.products || []).forEach(function (p) {
      const id = productId(p);
      if (id) {
        byId[id] = p;
        registerShopProduct(p);
      }
    });

    let changed = false;
    cart.forEach(function (item) {
      const p = byId[String(item.id)];
      if (!p) return;
      const sale = productSalePrice(p);
      const list = productListPrice(p);
      const pct = productDiscountPercent(p);
      if (item.price !== sale || item.listPrice !== list || item.discountPercent !== pct) {
        item.price = sale;
        item.listPrice = list;
        item.discountPercent = pct;
        changed = true;
      }
    });

    if (changed) saveCart(cart);
  } catch (e) {
    console.warn("Cart price sync:", e.message);
  }

  return getCart();
}

const DEFAULT_STORE_CONTACT = {
  name: "A & S Traders",
  email: "hello@astraders.pk",
  phone: "+923001234567",
};

function formatPhoneDisplay(phone) {
  const raw = String(phone || "").trim();
  if (!raw) return "";
  if (raw.startsWith("+92") && raw.length >= 12) {
    return "+92 " + raw.slice(3, 6) + " " + raw.slice(6);
  }
  return raw;
}

function applyStoreContact(contact) {
  const c = contact || DEFAULT_STORE_CONTACT;
  const phone = (c.phone || DEFAULT_STORE_CONTACT.phone).replace(/\s/g, "");
  const email = c.email || DEFAULT_STORE_CONTACT.email;
  const phoneDisplay = formatPhoneDisplay(phone);

  document.querySelectorAll("[data-store-phone]").forEach(function (el) {
    el.textContent = phoneDisplay;
    if (el.tagName === "A") {
      el.href = "tel:" + phone;
    }
  });

  document.querySelectorAll("[data-store-email]").forEach(function (el) {
    el.textContent = email;
    if (el.tagName === "A") {
      el.href = "mailto:" + email;
    }
  });

  document.querySelectorAll("[data-store-contact-block]").forEach(function (el) {
    el.innerHTML =
      '<a href="mailto:' +
      email +
      '">' +
      email +
      "</a><br />" +
      '<a href="tel:' +
      phone +
      '">' +
      phoneDisplay +
      "</a>";
  });
}

async function loadStoreContact() {
  try {
    const response = await fetch(
      getPublicApiBase() + "/contact",
      { cache: "no-store" }
    );
    const data = await response.json();
    if (response.ok && data.contact) {
      applyStoreContact(data.contact);
      return;
    }
    console.warn("Store contact: API returned", response.status);
  } catch (err) {
    console.warn("Store contact:", err.message, "— use npm start and http://localhost:3000");
  }
}

function startCustomerPage() {
  applyStoreContactFromWindow();
  loadStoreContact();
  initCustomerUI();

  const grid = document.getElementById("shopGrid");
  if (grid) {
    grid.addEventListener("click", handleShopGridClick);
  }

  if (window.location.protocol === "file:") {
    showToast("Open the shop from http://localhost:3000 (run npm start in backend)", "info");
  }

  const params = new URLSearchParams(window.location.search);
  if (params.get("welcome") === "1" && getCustomerUser()) {
    showToast("Welcome back, " + getCustomerUser().firstName + "!", "success");
    window.history.replaceState({}, "", window.location.pathname);
  }
}

function handleShopGridClick(event) {
  const btn = event.target.closest(".btn-add-cart");
  if (!btn || btn.disabled) return;

  const pid = btn.getAttribute("data-product-id");
  const product = shopProductsById[pid];
  if (!product) {
    showToast("Product data missing. Refresh the page.", "info");
    return;
  }

  addToCart(product, 1);
}

window.addEventListener("as-store-contact-ready", function () {
  if (applyStoreContactFromWindow()) return;
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startCustomerPage);
} else {
  startCustomerPage();
}

window.getCustomerUser = getCustomerUser;
window.getCustomerToken = getCustomerToken;
window.saveCustomerSession = saveCustomerSession;
window.clearCustomerSession = clearCustomerSession;
window.publicGet = publicGet;
window.publicPost = publicPost;

if (typeof customerGet === "function") {
  window.customerGet = customerGet;
}

if (typeof customerPost === "function") {
  window.customerPost = customerPost;
}