// Shop page — loads products from API, add-to-cart via delegation

// Home page category tiles use ?cat=slug — maps to inventory category names
const CATEGORY_BY_SLUG = {
  bath: "Bath sets",
  wc: "Commodes",
  shattaf: "Muslim showers",
  pipes: "Pipes",
  taps: "Taps",
  accessories: "Accessories",
};

function shopUrlParams() {
  return new URLSearchParams(window.location.search);
}

function shouldShowAllProducts() {
  const params = shopUrlParams();
  if (params.get("all") === "1") return true;
  const slug = (params.get("cat") || "").trim();
  const category = (params.get("category") || "").trim();
  const search = (params.get("search") || "").trim();
  const brand = (params.get("brand") || "").trim();
  return !slug && !category && !search && !brand;
}

function resetShopFilters() {
  const search = document.getElementById("shopSearch");
  const brand = document.getElementById("brandFilter");
  const category = document.getElementById("categoryFilter");
  if (search) search.value = "";
  if (brand) brand.value = "";
  if (category) category.value = "";
  updateCategoryBanner("");
}

function resolveCategoryFromUrl() {
  const params = shopUrlParams();
  const slug = (params.get("cat") || "").toLowerCase().trim();
  if (slug && CATEGORY_BY_SLUG[slug]) {
    return CATEGORY_BY_SLUG[slug];
  }
  const direct = (params.get("category") || "").trim();
  return direct || "";
}

function ensureCategoryOption(categoryName) {
  const select = document.getElementById("categoryFilter");
  if (!select || !categoryName) return;

  const exists = Array.from(select.options).some(function (opt) {
    return opt.value === categoryName;
  });
  if (!exists) {
    const opt = document.createElement("option");
    opt.value = categoryName;
    opt.textContent = categoryName;
    select.appendChild(opt);
  }
  select.value = categoryName;
}

function updateCategoryBanner(categoryName) {
  const wrap = document.getElementById("shopCategoryActive");
  const label = document.getElementById("shopCategoryLabel");
  if (!wrap || !label) return;

  if (categoryName) {
    label.textContent = categoryName;
    wrap.classList.remove("d-none");
  } else {
    wrap.classList.add("d-none");
    label.textContent = "";
  }
}

function applyFiltersFromUrl() {
  if (shouldShowAllProducts()) {
    resetShopFilters();
    return;
  }

  const params = shopUrlParams();
  const search = document.getElementById("shopSearch");
  const brand = document.getElementById("brandFilter");

  if (search) {
    search.value = (params.get("search") || "").trim();
  }
  if (brand) {
    brand.value = (params.get("brand") || "").trim();
  }

  const categoryName = resolveCategoryFromUrl();
  if (!categoryName) {
    const category = document.getElementById("categoryFilter");
    if (category) category.value = "";
    updateCategoryBanner("");
    return;
  }
  ensureCategoryOption(categoryName);
  updateCategoryBanner(categoryName);
}

async function loadShopProducts() {
  const grid = document.getElementById("shopGrid");
  const search = document.getElementById("shopSearch");
  const brand = document.getElementById("brandFilter");
  const category = document.getElementById("categoryFilter");

  if (!grid) return;

  grid.innerHTML =
    '<div class="col-12 text-center py-5 text-muted">Loading products…</div>';

  let url = PUBLIC_API + "/products?";
  if (search && search.value.trim()) {
    url += "search=" + encodeURIComponent(search.value.trim()) + "&";
  }
  if (brand && brand.value) {
    url += "brand=" + encodeURIComponent(brand.value) + "&";
  }
  if (category && category.value) {
    url += "category=" + encodeURIComponent(category.value) + "&";
  }

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Could not load shop");
    }

    renderShopGrid(data.products);
    const countEl = document.getElementById("shopCount");
    if (countEl) countEl.textContent = data.count;
  } catch (err) {
    console.error("Shop load error:", err);
    grid.innerHTML =
      '<div class="col-12"><div class="alert alert-warning">' +
      "<strong>Products could not load.</strong> " +
      "Start backend: <code>npm start</code> in the <code>backend</code> folder. " +
      'Then open <a href="/customer/shop.html">the shop from this server</a> ' +
      "(not Live Server / not double-clicking HTML)." +
      "</div></div>";
  }
}

function renderShopGrid(products) {
  const grid = document.getElementById("shopGrid");
  grid.innerHTML = "";

  Object.keys(shopProductsById).forEach(function (k) {
    delete shopProductsById[k];
  });

  if (!products.length) {
    grid.innerHTML =
      '<div class="col-12 text-muted text-center py-4">No products match your filters.</div>';
    return;
  }

  products.forEach(function (p) {
    registerShopProduct(p);
    const pid = productId(p);
    const out = p.stock <= 0;
    const low = !out && p.stock <= (p.reorderLevel || 10);

    const col = document.createElement("div");
    col.className = "col";

    const card = document.createElement("div");
    card.className = "card card-product h-100";

    const ratio = document.createElement("div");
    ratio.className = "ratio ratio-1x1";
    attachProductImage(ratio, p.imageUrl, p.name, p.sku);
    card.appendChild(ratio);

    const body = document.createElement("div");
    body.className = "card-body d-flex flex-column";

    const meta = document.createElement("span");
    meta.className = "small text-muted";
    meta.textContent = (p.brand || "—") + " · " + p.category;
    body.appendChild(meta);

    const title = document.createElement("h3");
    title.className = "h6 fw-semibold mt-1 mb-1";
    title.textContent = p.name;
    body.appendChild(title);

    if (p.color) {
      const colorEl = document.createElement("div");
      colorEl.className = "small text-muted mb-1";
      colorEl.textContent = "Color: " + p.color;
      body.appendChild(colorEl);
    }

    if (p.description) {
      const desc = document.createElement("p");
      desc.className = "small text-muted mb-2";
      desc.style.lineHeight = "1.4";
      desc.textContent =
        p.description.length > 100 ? p.description.slice(0, 100) + "…" : p.description;
      body.appendChild(desc);
    }

    const stock = document.createElement("div");
    stock.className = "small mb-2 " + (out ? "text-danger" : low ? "text-warning" : "text-success");
    if (out) stock.textContent = "Out of stock";
    else if (low) stock.textContent = "Only " + p.stock + " left — order soon";
    else stock.textContent = "In stock · " + p.stock + " left";
    body.appendChild(stock);

    const foot = document.createElement("div");
    foot.className = "mt-auto d-flex justify-content-between align-items-center gap-2";

    const priceCol = document.createElement("div");
    appendProductPriceBlock(priceCol, p);
    foot.appendChild(priceCol);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-sm btn-accent btn-add-cart";
    btn.textContent = "Add to cart";
    btn.setAttribute("data-product-id", pid);
    if (out) btn.disabled = true;
    foot.appendChild(btn);

    body.appendChild(foot);
    card.appendChild(body);
    col.appendChild(card);
    grid.appendChild(col);
  });
}

const shopSearch = document.getElementById("shopSearch");
const brandFilter = document.getElementById("brandFilter");
const categoryFilter = document.getElementById("categoryFilter");
const applyFilters = document.getElementById("applyFilters");

if (shopSearch) {
  shopSearch.addEventListener("input", function () {
    loadShopProducts();
  });
}
if (brandFilter) brandFilter.addEventListener("change", loadShopProducts);
if (categoryFilter) {
  categoryFilter.addEventListener("change", function () {
    updateCategoryBanner(categoryFilter.value);
    loadShopProducts();
  });
}
if (applyFilters) {
  applyFilters.addEventListener("click", function () {
    updateCategoryBanner(categoryFilter ? categoryFilter.value : "");
    loadShopProducts();
  });
}

async function syncCategoryFilterOptions() {
  const select = document.getElementById("categoryFilter");
  if (!select) return;

  try {
    const response = await fetch(PUBLIC_API + "/products/categories/list");
    const data = await response.json();
    if (!response.ok || !data.categories) return;

    const current = select.value;
    const keep = new Set([""]);
    data.categories.forEach(function (c) {
      if (c) keep.add(c);
    });
    Object.keys(CATEGORY_BY_SLUG).forEach(function (slug) {
      keep.add(CATEGORY_BY_SLUG[slug]);
    });

    Array.from(select.options).forEach(function (opt) {
      if (opt.value && !keep.has(opt.value)) {
        opt.remove();
      }
    });

    data.categories.forEach(function (name) {
      ensureCategoryOption(name);
    });

    if (current) {
      ensureCategoryOption(current);
      select.value = current;
    }
  } catch (err) {
    console.warn("Category list:", err.message);
  }
}

function initShopPage() {
  applyFiltersFromUrl();
  syncCategoryFilterOptions().finally(function () {
    applyFiltersFromUrl();
    loadShopProducts();
  });
}

document.addEventListener("DOMContentLoaded", initShopPage);

// Back/forward cache: re-apply URL filters so "View collection" always shows full catalog
window.addEventListener("pageshow", function (event) {
  if (event.persisted) {
    initShopPage();
  }
});
