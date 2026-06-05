// Simple per-product discount: finalPrice = price - (price * discountPercent / 100)

function calcFinalPrice(price, discountPercent) {
  const p = Number(price) || 0;
  let pct = Number(discountPercent) || 0;
  if (pct < 0) pct = 0;
  if (pct > 100) pct = 100;
  if (pct === 0) return Math.round(p);
  const finalPrice = p - (p * pct) / 100;
  return Math.round(finalPrice);
}

function normalizeDiscountPercent(value) {
  if (value === undefined || value === null || value === "") return 0;
  const pct = Number(value);
  if (Number.isNaN(pct) || pct < 0) return 0;
  if (pct > 100) return 100;
  return pct;
}

function applyProductPricing(data) {
  const price = Number(data.price);
  const discountPercent = normalizeDiscountPercent(data.discountPercent);
  data.discountPercent = discountPercent;
  data.finalPrice = calcFinalPrice(price, discountPercent);
  return data;
}

function getSalePrice(product) {
  if (!product) return 0;
  const pct = normalizeDiscountPercent(product.discountPercent);
  if (pct > 0) {
    return calcFinalPrice(product.price, pct);
  }
  if (product.finalPrice !== undefined && product.finalPrice !== null) {
    return Number(product.finalPrice);
  }
  return calcFinalPrice(product.price, 0);
}

function ensureProductPricing(product) {
  const p = product.toObject ? product.toObject() : { ...product };
  p.discountPercent = normalizeDiscountPercent(p.discountPercent);
  p.finalPrice = calcFinalPrice(p.price, p.discountPercent);
  return p;
}

module.exports = {
  calcFinalPrice,
  normalizeDiscountPercent,
  applyProductPricing,
  getSalePrice,
  ensureProductPricing,
};
