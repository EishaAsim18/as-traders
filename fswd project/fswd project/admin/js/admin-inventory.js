// Inventory page logic

let allProducts = [];
let newImageFile = null;
let editImageFile = null;
let editingProduct = null;

function updateStats() {
  let lowCount = 0;
  let stockValue = 0;

  allProducts.forEach(function (p) {
    if (p.stock <= p.reorderLevel) lowCount++;
    stockValue += productSalePrice(p) * p.stock;
  });

  document.getElementById("statTotalSkus").textContent = allProducts.length;
  document.getElementById("statLowStock").textContent = lowCount;

  if (stockValue >= 1000000) {
    document.getElementById("statStockValue").textContent =
      "Rs. " + (stockValue / 1000000).toFixed(1) + "M";
  } else {
    document.getElementById("statStockValue").textContent = formatMoney(stockValue);
  }

  document.getElementById("productCountLabel").textContent =
    "Showing " + allProducts.length + " products";
}

function productThumbHtml(p) {
  const src = catalogImageSrc(p.imageUrl);
  return (
    '<div class="rounded-2 border bg-light overflow-hidden" style="width:44px;height:44px">' +
    '<img src="' +
    src +
    '" alt="" class="w-100 h-100" style="object-fit:contain" onerror="this.src=\'../assets/images/product-placeholder.svg\'" />' +
    "</div>"
  );
}

function renderProducts(products) {
  const tbody = document.getElementById("productsTable");
  tbody.innerHTML = "";

  if (!products.length) {
    tbody.innerHTML =
      '<tr><td colspan="12" class="text-muted">No products — click <strong>Add SKU</strong> to start.</td></tr>';
    return;
  }

  products.forEach(function (p) {
    const low = p.stock <= p.reorderLevel;
    const row = document.createElement("tr");
    if (low) row.className = "table-warning bg-opacity-25";

    row.innerHTML =
      "<td>" +
      productThumbHtml(p) +
      "</td><td class='fw-semibold font-monospace small'>" +
      p.sku +
      "</td><td>" +
      p.name +
      "</td><td class='small'>" +
      (p.color || "—") +
      "</td><td><span class='badge rounded-pill text-bg-light border small'>" +
      (p.brand || "—") +
      "</span></td><td><span class='badge rounded-pill text-bg-light border small'>" +
      p.category +
      "</span></td><td class='text-end small'>" +
      formatAdminPriceLabel(p) +
      "</td><td class='text-end'>" +
      formatAdminDiscountCell(p) +
      "</td><td class='text-end " +
      (low ? "fw-bold text-warning" : "") +
      "'>" +
      p.stock +
      "</td><td class='text-end text-muted'>" +
      p.reorderLevel +
      "</td><td class='small text-muted'>" +
      (p.location || "—") +
      "</td><td class='text-end'></td>";

    const actions = row.lastElementChild;

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "btn btn-sm btn-outline-primary me-1";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", function () {
      openEditModal(p);
    });
    actions.appendChild(editBtn);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-sm " + (low ? "btn-warning" : "btn-outline-secondary");
    btn.textContent = low ? "Fix stock" : "Adjust";
    btn.addEventListener("click", function () {
      openAdjustModal(p);
    });
    actions.appendChild(btn);

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "btn btn-sm btn-outline-danger ms-1";
    delBtn.textContent = "Delete";
    delBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      deleteProduct(p);
    });
    actions.appendChild(delBtn);

    tbody.appendChild(row);
  });
}

async function loadProducts() {
  const search = document.getElementById("searchProducts").value.trim();
  const category = document.getElementById("filterCategory").value;
  const brand = document.getElementById("filterBrand").value;
  const stockFilter = document.getElementById("filterStock").value;

  let path = "/products?";
  if (search) path += "search=" + encodeURIComponent(search) + "&";
  if (brand) path += "brand=" + encodeURIComponent(brand) + "&";
  if (category) path += "category=" + encodeURIComponent(category) + "&";
  if (stockFilter === "low") path += "lowStock=true&";

  const data = await apiGet(path.replace(/&$/, "").replace(/\?$/, ""));
  allProducts = data.products;

  if (stockFilter === "out") {
    allProducts = allProducts.filter(function (p) {
      return p.stock === 0;
    });
  }

  renderProducts(allProducts);
  updateStats();
}

function previewFile(file, imgEl) {
  if (!file) return;
  fileToDataUrl(file).then(function (url) {
    imgEl.src = url;
  });
}

function resetNewImagePreview() {
  newImageFile = null;
  document.getElementById("newImagePreview").src = "../assets/images/product-placeholder.svg";
  document.getElementById("newImageFile").value = "";
  document.getElementById("newImageUrl").value = "";
}

async function deleteProduct(product) {
  const msg =
    "Delete “" +
    product.name +
    "” (SKU " +
    product.sku +
    ")? This removes it from inventory and the customer shop.";
  if (!confirmAction(msg)) return;

  await apiDelete("/products/" + product._id);
  const modal = bootstrap.Modal.getInstance(document.getElementById("editProductModal"));
  if (modal) modal.hide();
  editingProduct = null;
  await loadProducts();
  showToast("Product deleted", "success");
}

function openEditModal(product) {
  editingProduct = product;
  editImageFile = null;

  document.getElementById("editProductId").value = product._id;
  document.getElementById("editSystemId").textContent = product._id;
  document.getElementById("editSku").value = product.sku || "";
  document.getElementById("editName").value = product.name || "";
  document.getElementById("editColor").value = product.color || "";
  document.getElementById("editDescription").value = product.description || "";
  document.getElementById("editBrand").value = product.brand || "Faisal";
  document.getElementById("editCategory").value = product.category || "Commodes";
  document.getElementById("editPrice").value = product.price;
  document.getElementById("editDiscount").value = product.discountPercent || 0;
  updateEditFinalPricePreview();
  document.getElementById("editStock").value = product.stock;
  document.getElementById("editReorder").value = product.reorderLevel ?? 10;
  document.getElementById("editLocation").value = product.location || "";
  document.getElementById("editImagePreview").src = catalogImageSrc(product.imageUrl);
  document.getElementById("editImageUrl").value = product.imageUrl || "";
  document.getElementById("editImageFile").value = "";

  new bootstrap.Modal(document.getElementById("editProductModal")).show();
}

function openAdjustModal(product) {
  document.getElementById("adjustProductId").value = product._id;
  document.getElementById("adjustProductName").textContent = product.name;
  document.getElementById("adjustCurrentStock").textContent = product.stock;
  document.getElementById("adjustChange").value = "";
  new bootstrap.Modal(document.getElementById("adjustStockModal")).show();
}

function applyQuickStock(amount) {
  const input = document.getElementById("adjustChange");
  const current = Number(input.value) || 0;
  input.value = current + amount;
}

async function resolveImageUrlForProduct(sku, file, urlInput) {
  if (file) {
    const uploaded = await uploadProductImage(sku, file);
    return uploaded.imageUrl;
  }
  const url = (urlInput || "").trim();
  if (/^data:image\//i.test(url)) {
    const uploaded = await apiPost("/products/upload-image", { sku: sku, dataUrl: url });
    return uploaded.imageUrl;
  }
  return url;
}

async function saveAdjustStock() {
  const id = document.getElementById("adjustProductId").value;
  const change = Number(document.getElementById("adjustChange").value);

  if (!change || change === 0) {
    showToast("Tap +1 / −1 or type how many to add or remove", "error");
    return;
  }

  await apiPatch("/products/" + id + "/stock", { change });
  bootstrap.Modal.getInstance(document.getElementById("adjustStockModal")).hide();
  await loadProducts();
  showToast("Stock updated", "success");
}

async function saveNewProduct() {
  const sku = document.getElementById("newSku").value.trim();
  if (!sku) {
    showToast("SKU is required", "error");
    return;
  }

  let imageUrl = "";
  try {
    imageUrl = await resolveImageUrlForProduct(
      sku,
      newImageFile,
      document.getElementById("newImageUrl").value
    );
  } catch (err) {
    showToast(err.message, "error");
    return;
  }

  const body = {
    sku: sku.toUpperCase(),
    name: document.getElementById("newName").value.trim(),
    brand: document.getElementById("newBrand").value,
    color: document.getElementById("newColor").value.trim(),
    description: document.getElementById("newDescription").value.trim(),
    category: document.getElementById("newCategory").value,
    price: Number(document.getElementById("newPrice").value),
    discountPercent: Number(document.getElementById("newDiscount").value) || 0,
    stock: Number(document.getElementById("newStock").value),
    reorderLevel: Number(document.getElementById("newReorder").value),
    location: document.getElementById("newLocation").value.trim(),
    imageUrl: imageUrl,
  };

  await apiPost("/products", body);
  bootstrap.Modal.getInstance(document.getElementById("addProductModal")).hide();
  document.getElementById("addProductForm").reset();
  resetNewImagePreview();
  await loadProducts();
  showToast("Product added — visible on customer shop", "success");
}

async function saveEditProduct() {
  if (!editingProduct) return;

  const sku = document.getElementById("editSku").value.trim();
  const name = document.getElementById("editName").value.trim();
  if (!sku || !name) {
    showToast("SKU and product name are required", "error");
    return;
  }

  let imageUrl = editingProduct.imageUrl || "";
  const urlInput = document.getElementById("editImageUrl").value.trim();
  try {
    if (editImageFile || urlInput) {
      imageUrl = await resolveImageUrlForProduct(sku, editImageFile, urlInput);
    }
  } catch (err) {
    showToast(err.message, "error");
    return;
  }

  const discountPercent = Number(document.getElementById("editDiscount").value) || 0;
  const price = Number(document.getElementById("editPrice").value);

  const result = await apiPut("/products/" + editingProduct._id, {
    sku: sku,
    name: name,
    brand: document.getElementById("editBrand").value,
    color: document.getElementById("editColor").value.trim(),
    description: document.getElementById("editDescription").value.trim(),
    category: document.getElementById("editCategory").value,
    price: price,
    discountPercent: discountPercent,
    stock: Number(document.getElementById("editStock").value),
    reorderLevel: Number(document.getElementById("editReorder").value),
    location: document.getElementById("editLocation").value.trim(),
    imageUrl: imageUrl,
  });

  bootstrap.Modal.getInstance(document.getElementById("editProductModal")).hide();
  editingProduct = null;
  editImageFile = null;
  await loadProducts();

  const saved = result.product || {};
  let msg = "Product updated — visible on customer shop";
  if ((saved.discountPercent || 0) > 0) {
    msg +=
      " · " +
      saved.discountPercent +
      "% off → " +
      formatMoney(saved.finalPrice || productSalePrice(saved));
  }
  showToast(msg, "success");
}

function updateNewFinalPricePreview() {
  const price = Number(document.getElementById("newPrice").value) || 0;
  const pct = Number(document.getElementById("newDiscount").value) || 0;
  const finalPrice = calcFinalPriceClient(price, pct);
  document.getElementById("newFinalPricePreview").textContent =
    "Selling price: " + formatMoney(finalPrice);
}

function updateEditFinalPricePreview() {
  const price = Number(document.getElementById("editPrice").value) || 0;
  const pct = Number(document.getElementById("editDiscount").value) || 0;
  const finalPrice = calcFinalPriceClient(price, pct);
  document.getElementById("editFinalPricePreview").textContent =
    "Selling price: " + formatMoney(finalPrice);
}

setupAdminPage();

document.getElementById("newPrice").addEventListener("input", updateNewFinalPricePreview);
document.getElementById("newDiscount").addEventListener("input", updateNewFinalPricePreview);
document.getElementById("editPrice").addEventListener("input", updateEditFinalPricePreview);
document.getElementById("editDiscount").addEventListener("input", updateEditFinalPricePreview);

document.getElementById("btnAddSku").addEventListener("click", function () {
  resetNewImagePreview();
  document.getElementById("newDiscount").value = "0";
  updateNewFinalPricePreview();
  new bootstrap.Modal(document.getElementById("addProductModal")).show();
});

document.getElementById("newImageFile").addEventListener("change", function (e) {
  newImageFile = e.target.files[0] || null;
  if (newImageFile) {
    previewFile(newImageFile, document.getElementById("newImagePreview"));
    document.getElementById("newImageUrl").value = "";
  }
});

document.getElementById("editImageFile").addEventListener("change", function (e) {
  editImageFile = e.target.files[0] || null;
  if (editImageFile) {
    previewFile(editImageFile, document.getElementById("editImagePreview"));
  }
});

document.getElementById("btnSaveProduct").addEventListener("click", function () {
  const btn = document.getElementById("btnSaveProduct");
  setButtonLoading(btn, true, "Saving…");
  saveNewProduct()
    .catch(function (err) {
      showToast(err.message, "error");
    })
    .finally(function () {
      setButtonLoading(btn, false);
    });
});

document.getElementById("btnDeleteEditProduct").addEventListener("click", function () {
  if (!editingProduct) return;
  deleteProduct(editingProduct).catch(function (err) {
    showToast(err.message, "error");
  });
});

document.getElementById("btnSaveEditProduct").addEventListener("click", function () {
  const btn = document.getElementById("btnSaveEditProduct");
  setButtonLoading(btn, true, "Saving…");
  saveEditProduct()
    .catch(function (err) {
      showToast(err.message, "error");
    })
    .finally(function () {
      setButtonLoading(btn, false);
    });
});

document.getElementById("btnSaveAdjust").addEventListener("click", function () {
  saveAdjustStock().catch(function (err) {
    showToast(err.message, "error");
  });
});

document.querySelectorAll("[data-stock]").forEach(function (btn) {
  btn.addEventListener("click", function () {
    applyQuickStock(Number(btn.dataset.stock));
  });
});

document.getElementById("searchProducts").addEventListener("input", function () {
  loadProducts().catch(showError);
});

document.getElementById("filterBrand").addEventListener("change", function () {
  loadProducts().catch(showError);
});

document.getElementById("filterCategory").addEventListener("change", function () {
  loadProducts().catch(showError);
});

document.getElementById("filterStock").addEventListener("change", function () {
  loadProducts().catch(showError);
});

function showError(err) {
  showToast(err.message || "Something went wrong", "error");
}

loadProducts().catch(showError);

if (window.location.search.indexOf("low=1") !== -1) {
  document.getElementById("filterStock").value = "low";
  loadProducts().catch(showError);
}

if (window.location.hash === "#add") {
  resetNewImagePreview();
  new bootstrap.Modal(document.getElementById("addProductModal")).show();
}
