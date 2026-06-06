// Home page — featured products from API

function initNewArrivalsHero() {
  const img = document.getElementById("newArrivalsHero");
  if (!img) return;
  const path = "/assets/images/new-arrivals-hero.jpg?v=5";
  if (typeof assetUrl === "function") {
    img.src = assetUrl(path);
  } else {
    img.src = "../assets/images/new-arrivals-hero.jpg?v=5";
  }
}

async function loadFeatured() {
  const row = document.getElementById("featuredProducts");
  if (!row) return;

  row.innerHTML = '<div class="col-12 text-center text-muted py-4">Loading…</div>';

  try {
    const data = await window.publicGet("/products");
    const products =
      data.products ||
      data.data ||
      data.items ||
      (Array.isArray(data) ? data : []);

    console.log("[home products]", products);

    if (!products || !products.length) {
      row.innerHTML = '<div class="col-12 text-center text-muted py-4">No products available right now.</div>';
      return;
    }

    const items = products.slice(0, 4);
    row.innerHTML = "";

    items.forEach(function (p) {
      registerShopProduct(p);
      const pid = p._id || p.id || "";
      const name = p.name || p.title || "Product";
      const price = p.salePrice || p.price || 0;
      const imageUrl = p.imageUrl || "";
      const out = p.stock <= 0;

      const col = document.createElement("div");
      col.className = "col-md-6 col-lg-3";

      const card = document.createElement("div");
      card.className = "card card-product h-100";

      const ratio = document.createElement("div");
      ratio.className = "ratio ratio-1x1";
      attachProductImage(ratio, imageUrl, name, p.sku);
      card.appendChild(ratio);

      const body = document.createElement("div");
      body.className = "card-body";

      const meta = document.createElement("div");
      meta.className = "small text-muted mb-1";
      meta.textContent = (p.brand || "") + " · " + (p.category || "");
      body.appendChild(meta);

      const title = document.createElement("h3");
      title.className = "h6 fw-semibold mb-1";
      title.textContent = name;
      body.appendChild(title);

      if (p.color) {
        const colorEl = document.createElement("div");
        colorEl.className = "small text-muted mb-1";
        colorEl.textContent = p.color;
        body.appendChild(colorEl);
      }

      const foot = document.createElement("div");
      foot.className = "d-flex justify-content-between align-items-center";

      appendProductPriceBlock(foot, p);

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn btn-sm btn-accent btn-feat-add";
      btn.textContent = "Add";
      btn.setAttribute("data-product-id", pid);
      if (out) btn.disabled = true;
      btn.addEventListener("click", function () {
        addToCart(p, 1);
      });
      foot.appendChild(btn);

      body.appendChild(foot);
      card.appendChild(body);
      col.appendChild(card);
      row.appendChild(col);
    });
  } catch (e) {
    console.error("Home products load error:", e);
    row.innerHTML =
      '<div class="col-12 text-center text-muted py-4">Products could not be loaded. Please refresh the page.</div>';
  }
}

document.addEventListener("DOMContentLoaded", function () {
  initNewArrivalsHero();
  loadFeatured();
});
