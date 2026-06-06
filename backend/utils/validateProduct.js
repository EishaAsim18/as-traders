const { applyProductPricing, normalizeDiscountPercent } = require("./productPrice");

const ALLOWED_FIELDS = [
  "sku",
  "name",
  "category",
  "brand",
  "color",
  "description",
  "price",
  "discountPercent",
  "stock",
  "reorderLevel",
  "location",
  "imageUrl",
];

function pickProductFields(body) {
  const data = {};
  ALLOWED_FIELDS.forEach(function (key) {
    if (body[key] !== undefined) data[key] = body[key];
  });
  return data;
}

function validateProductData(data, isCreate) {
  const errors = [];

  if (isCreate) {
    if (!data.sku || !String(data.sku).trim()) {
      errors.push("SKU is required");
    }
    if (!data.name || !String(data.name).trim()) {
      errors.push("Product name is required");
    }
    if (!data.category || !String(data.category).trim()) {
      errors.push("Category is required");
    }
    if (data.price === undefined || data.price === null || data.price === "") {
      errors.push("Price is required");
    }
    if (data.stock === undefined || data.stock === null || data.stock === "") {
      errors.push("Stock is required");
    }
  }

  if (data.sku !== undefined) {
    data.sku = String(data.sku).trim().toUpperCase();
    if (!data.sku) errors.push("SKU cannot be empty");
  }

  if (data.name !== undefined) {
    data.name = String(data.name).trim();
    if (!data.name) errors.push("Product name cannot be empty");
  }

  if (data.color !== undefined) {
    data.color = String(data.color).trim().slice(0, 60);
  }

  if (data.description !== undefined) {
    data.description = String(data.description).trim().slice(0, 500);
  }

  if (data.location !== undefined) {
    data.location = String(data.location).trim().slice(0, 120);
  }

  if (data.price !== undefined) {
    data.price = Number(data.price);
    if (Number.isNaN(data.price) || data.price < 0) {
      errors.push("Price must be zero or greater");
    }
  }

  if (data.discountPercent !== undefined) {
    const pct = normalizeDiscountPercent(data.discountPercent);
    if (Number(data.discountPercent) > 100) {
      errors.push("Discount cannot be more than 100%");
    }
    data.discountPercent = pct;
  }

  if (data.stock !== undefined) {
    data.stock = Number(data.stock);
    if (Number.isNaN(data.stock) || data.stock < 0 || !Number.isInteger(data.stock)) {
      errors.push("Stock must be a whole number ≥ 0");
    }
  }

  if (data.reorderLevel !== undefined) {
    data.reorderLevel = Number(data.reorderLevel);
    if (Number.isNaN(data.reorderLevel) || data.reorderLevel < 0) {
      errors.push("Reorder level must be zero or greater");
    }
  }

  if (data.imageUrl !== undefined) {
    const url = String(data.imageUrl).trim();
    if (url && /^https?:\/\//i.test(url)) {
      errors.push("External image URLs are not allowed — upload a file instead");
    } else if (url && !/^data:image\//i.test(url) && !url.startsWith("/assets/")) {
      errors.push("Product image must be uploaded as a file");
    }
    data.imageUrl = url;
  }

  if (errors.length === 0) {
    if (isCreate && data.discountPercent === undefined) {
      data.discountPercent = 0;
    }
    if (data.price !== undefined || data.discountPercent !== undefined) {
      if (data.price !== undefined && data.discountPercent === undefined && isCreate) {
        data.discountPercent = 0;
      }
      if (data.price !== undefined) {
        applyProductPricing(data);
      }
    }
  }

  return { ok: errors.length === 0, errors, data };
}

module.exports = { pickProductFields, validateProductData, ALLOWED_FIELDS };
