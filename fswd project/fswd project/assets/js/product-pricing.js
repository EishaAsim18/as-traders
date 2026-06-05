// Per-product discount display (shop + cart) — MRP struck through, sale price, % OFF badge



function calcFinalPriceClient(price, discountPercent) {

  const p = Number(price) || 0;

  let pct = Number(discountPercent) || 0;

  if (pct < 0) pct = 0;

  if (pct > 100) pct = 100;

  if (pct === 0) return Math.round(p);

  return Math.round(p - (p * pct) / 100);

}



function productListPrice(product) {
  if (!product) return 0;
  if (product.listPrice !== undefined && product.listPrice !== null && product.listPrice !== "") {
    const list = Number(product.listPrice);
    if (!Number.isNaN(list) && list > 0) return list;
  }
  return Number(product.price) || 0;
}

function productSalePrice(product) {
  if (!product) return 0;

  const list = productListPrice(product);
  const pct = Math.round(Number(product.discountPercent) || 0);

  if (pct > 0 && list > 0) {
    return calcFinalPriceClient(list, pct);
  }

  if (product.finalPrice !== undefined && product.finalPrice !== null) {
    return Number(product.finalPrice);
  }

  return Number(product.price) || list;
}



function productHasDiscount(product) {

  if (!product) return false;

  const list = productListPrice(product);

  const sale = productSalePrice(product);

  if (list > 0 && sale < list) return true;

  return (Number(product.discountPercent) || 0) > 0;

}



function productDiscountPercent(product) {

  const list = productListPrice(product);

  const sale = productSalePrice(product);

  const fromField = Math.round(Number(product.discountPercent) || 0);

  if (fromField > 0) return fromField;

  if (list > 0 && sale < list) {

    return Math.round((1 - sale / list) * 100);

  }

  return 0;

}



function buildProductPriceHtml(productOrItem) {
  const list = productListPrice(productOrItem);
  const sale = productSalePrice(productOrItem);
  const hasOff = list > 0 && sale < list;

  const pct = productDiscountPercent(productOrItem);



  if (!hasOff) {

    return '<span class="product-price-sale">' + formatMoney(sale) + "</span>";

  }



  return (

    '<div class="product-price-inline">' +

    '<span class="product-discount-badge">' +

    pct +

    "% OFF</span>" +

    '<div class="product-price-was"><span class="product-price-label">MRP</span> ' +

    '<span class="product-price-old">' +

    formatMoney(list) +

    "</span></div>" +

    '<div class="product-price-now"><span class="product-price-label">Sale</span> ' +

    '<span class="product-price-sale">' +

    formatMoney(sale) +

    "</span></div></div>"

  );

}



function appendProductPriceBlock(parent, product) {

  const wrap = document.createElement("div");

  wrap.className = "product-price-block";

  wrap.innerHTML = buildProductPriceHtml(product);

  parent.appendChild(wrap);

  return productSalePrice(product);

}



function formatAdminPriceLabel(product) {

  const list = productListPrice(product);

  const sale = productSalePrice(product);

  const pct = productDiscountPercent(product);

  if (!productHasDiscount(product)) {

    return formatMoney(list);

  }

  return (

    formatMoney(sale) +

    ' <span class="badge text-bg-success ms-1">' +

    pct +

    "% off</span><br><span class=\"text-muted\">MRP " +

    formatMoney(list) +

    "</span>"

  );

}



function formatAdminDiscountCell(product) {

  const pct = productDiscountPercent(product);

  if (pct <= 0) return '<span class="text-muted">—</span>';

  return '<span class="badge text-bg-success">' + pct + "%</span>";

}


