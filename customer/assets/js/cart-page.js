// Cart page — cart in localStorage, checkout saves order to MongoDB

function formatCartUnitPrice(item) {
  return buildProductPriceHtml(item);
}

function renderCart() {
  const cart = getCart();
  const tbody = document.getElementById("cartTableBody");
  const mobile = document.getElementById("cartMobile");
  const empty = document.getElementById("cartEmpty");
  const content = document.getElementById("cartContent");

  if (!cart.length) {
    empty.classList.remove("d-none");
    content.classList.add("d-none");
    document.getElementById("cartSubtotal").textContent = formatMoney(0);
    document.getElementById("cartTotal").textContent = formatMoney(0);
    return;
  }

  empty.classList.add("d-none");
  content.classList.remove("d-none");

  tbody.innerHTML = "";
  mobile.innerHTML = "";
  let subtotal = 0;
  let subtotalAtMrp = 0;

  cart.forEach(function (item, index) {
    const list = productListPrice(item);
    const sale = productSalePrice(item);
    const line = sale * item.qty;
    const unitLabel = formatCartUnitPrice(item);
    subtotal += line;
    subtotalAtMrp += list * item.qty;

    const imgWrap = document.createElement("div");
    imgWrap.className = "cart-thumb-wrap";
    attachProductImage(imgWrap, item.imageUrl, item.name, item.sku);
    const img = imgWrap.outerHTML;

    tbody.innerHTML +=
      "<tr><td><div class='d-flex align-items-center gap-3'>" +
      img +
      "<div><div class='fw-semibold'>" +
      item.name +
      "</div><div class='small text-muted'>" +
      (item.brand || "") +
      " · " +
      item.sku +
      "</div></div></div></td>" +
      "<td class='text-muted'>" +
      unitLabel +
      "</td>" +
      "<td><div class='input-group input-group-sm' style='max-width:120px'>" +
      "<button type='button' class='btn btn-outline-secondary btn-qty' data-i='" +
      index +
      "' data-d='-1'>−</button>" +
      "<input class='form-control text-center' value='" +
      item.qty +
      "' readonly />" +
      "<button type='button' class='btn btn-outline-secondary btn-qty' data-i='" +
      index +
      "' data-d='1'>+</button></div></td>" +
      "<td class='text-end fw-semibold'>" +
      formatMoney(line) +
      "</td>" +
      "<td class='text-end'><button type='button' class='btn btn-link btn-sm text-danger btn-remove' data-i='" +
      index +
      "'>Remove</button></td></tr>";

    mobile.innerHTML +=
      '<div class="p-3 border-bottom"><div class="fw-semibold">' +
      item.name +
      '</div><div class="small text-muted mb-2">' +
      unitLabel +
      " × " +
      item.qty +
      '</div><div class="d-flex justify-content-between align-items-center">' +
      '<div class="input-group input-group-sm" style="max-width:130px">' +
      '<button type="button" class="btn btn-outline-secondary btn-qty" data-i="' +
      index +
      '" data-d="-1">−</button>' +
      '<span class="form-control text-center bg-white">' +
      item.qty +
      "</span>" +
      '<button type="button" class="btn btn-outline-secondary btn-qty" data-i="' +
      index +
      '" data-d="1">+</button></div>' +
      '<span class="fw-semibold">' +
      formatMoney(line) +
      '</span></div><button type="button" class="btn btn-link btn-sm text-danger p-0 mt-2 btn-remove" data-i="' +
      index +
      '">Remove</button></div>';
  });

  document.querySelectorAll(".btn-qty").forEach(function (btn) {
    btn.addEventListener("click", function () {
      const cart = getCart();
      const i = Number(btn.dataset.i);
      const d = Number(btn.dataset.d);
      cart[i].qty += d;
      if (cart[i].qty < 1) cart[i].qty = 1;
      saveCart(cart);
      renderCart();
    });
  });

  document.querySelectorAll(".btn-remove").forEach(function (btn) {
    btn.addEventListener("click", function () {
      const cart = getCart();
      cart.splice(Number(btn.dataset.i), 1);
      saveCart(cart);
      renderCart();
      showToast("Item removed", "info");
    });
  });

  const delivery = 1200;
  const savings = Math.max(0, subtotalAtMrp - subtotal);
  const savingsRow = document.getElementById("cartSavingsRow");
  const savingsEl = document.getElementById("cartSavings");

  document.getElementById("cartSubtotal").textContent = formatMoney(subtotal);
  document.getElementById("cartTotal").textContent = formatMoney(subtotal + delivery);

  if (savingsRow && savingsEl) {
    if (savings > 0) {
      savingsRow.classList.remove("d-none");
      savingsEl.textContent = "− " + formatMoney(savings);
    } else {
      savingsRow.classList.add("d-none");
    }
  }
}

document.getElementById("clearCartBtn").addEventListener("click", function () {
  if (confirm("Remove all items from cart?")) {
    saveCart([]);
    renderCart();
    showToast("Cart cleared", "info");
  }
});

const checkoutModal = new bootstrap.Modal(document.getElementById("checkoutModal"));
const orderSuccessModal = new bootstrap.Modal(document.getElementById("orderSuccessModal"));

const API_FIELD_TO_INPUT = {
  customerName: "checkoutName",
  customerPhone: "checkoutPhone",
  customerEmail: "checkoutEmail",
  city: "checkoutCity",
  streetAddress: "checkoutAddress",
  deliveryNotes: "checkoutNotes",
};

function mapApiErrors(apiErrors) {
  return (apiErrors || []).map(function (e) {
    return {
      field: API_FIELD_TO_INPUT[e.field] || e.field,
      message: e.message,
    };
  });
}

function updateCheckoutPaymentPanel() {
  const method = typeof getSelectedPaymentMethod === "function" ? getSelectedPaymentMethod() : "cod";
  const box = document.getElementById("checkoutPaymentInfo");
  if (!box) return;
  if (typeof isPrepaidPaymentMethod === "function" && isPrepaidPaymentMethod(method)) {
    box.classList.remove("d-none");
    mountPaymentInfo("#checkoutPaymentInfo", "compact");
  } else {
    box.classList.add("d-none");
    box.innerHTML = "";
  }
}

function openCheckout() {
  const cart = getCart();
  if (!cart.length) {
    showToast("Your cart is empty", "info");
    return;
  }
  document.getElementById("checkoutError").classList.add("d-none");
  clearCheckoutFieldErrors();
  updateCheckoutPaymentPanel();

  const user = getCustomerUser();
  if (user) {
    const nameEl = document.getElementById("checkoutName");
    const phoneEl = document.getElementById("checkoutPhone");
    const emailEl = document.getElementById("checkoutEmail");
    if (nameEl && !nameEl.value.trim()) {
      nameEl.value = user.fullName || (user.firstName + " " + (user.lastName || "")).trim();
    }
    if (phoneEl && !phoneEl.value.trim() && user.phone) {
      phoneEl.value = user.phone;
    }
    if (emailEl && !emailEl.value.trim() && user.email) {
      emailEl.value = user.email;
    }
  }

  checkoutModal.show();
}

document.getElementById("checkoutBtn").addEventListener("click", openCheckout);
document.getElementById("checkoutBtnMobile").addEventListener("click", openCheckout);

let checkoutPaymentPicker = null;
let lastPlacedOrder = null;

if (document.getElementById("checkoutPaymentPicker")) {
  checkoutPaymentPicker = initPaymentMethodPicker("checkoutPaymentPicker", {
    hiddenInputId: "checkoutPaymentMethod",
    defaultMethod: "cod",
    onChange: function () {
      updateCheckoutPaymentPanel();
    },
  });
}

function updateSuccessTrackLink(hasProof) {
  const link = document.getElementById("trackOrderLink");
  if (!link || !lastPlacedOrder) return;

  const isPrepaid =
    typeof isPrepaidPaymentMethod === "function" &&
    isPrepaidPaymentMethod(lastPlacedOrder.paymentMethod);

  if (isPrepaid && !hasProof) {
    link.classList.add("disabled", "opacity-50");
    link.setAttribute("aria-disabled", "true");
    link.href = "#";
    link.textContent = "Upload screenshot to track order";
    link.onclick = function (e) {
      e.preventDefault();
    };
    return;
  }

  link.classList.remove("disabled", "opacity-50");
  link.removeAttribute("aria-disabled");
  link.href =
    "track-order.html?order=" + encodeURIComponent(lastPlacedOrder.orderNumber);
  link.textContent = "Track this order";
  link.onclick = null;
}

const btnSuccessProof = document.getElementById("btnSuccessProofUpload");
if (btnSuccessProof) {
  btnSuccessProof.addEventListener("click", async function () {
  const fileInput = document.getElementById("successProofFile");
  const txnInput = document.getElementById("successProofTxn");
  const amountInput = document.getElementById("successProofAmount");
  const msgEl = document.getElementById("successProofMsg");
  const btn = document.getElementById("btnSuccessProofUpload");

  if (!lastPlacedOrder) return;

  const file = fileInput && fileInput.files[0];
  const fieldCheck = validatePaymentProofFields({
    transactionId: txnInput ? txnInput.value : "",
    paidAmount: amountInput ? amountInput.value : "",
    orderAmount: lastPlacedOrder.amount,
    paymentMethod: lastPlacedOrder.paymentMethod,
    file: file,
  });
  if (!fieldCheck.ok) {
    msgEl.textContent = fieldCheck.message;
    msgEl.className = "small mt-2 text-danger";
    msgEl.classList.remove("d-none");
    if (txnInput) setTxnInputState(txnInput, fieldCheck.message, false);
    return;
  }

  btn.disabled = true;
  btn.textContent = "Uploading…";
  msgEl.classList.add("d-none");

  try {
    const dataUrl = await readImageFileAsDataUrl(file);
    const phone = lastPlacedOrder.phone || "";
    const digits = phone.replace(/\D/g, "").slice(-4);

    const result = await publicPost("/orders/payment-proof", {
      orderNumber: lastPlacedOrder.orderNumber,
      phoneLast4: digits,
      transactionId: fieldCheck.transactionId,
      paidAmount: fieldCheck.paidAmount,
      senderNote: fieldCheck.senderNote,
      dataUrl: dataUrl,
    });

    msgEl.textContent = result.message || "Screenshot uploaded. We will verify and confirm payment.";
    msgEl.className = "small mt-2 text-success";
    msgEl.classList.remove("d-none");
    fileInput.value = "";
    if (txnInput) txnInput.value = "";
    updateSuccessTrackLink(true);
  } catch (err) {
    msgEl.textContent = err.message || "Upload failed";
    msgEl.className = "small mt-2 text-danger";
    msgEl.classList.remove("d-none");
  } finally {
    btn.disabled = false;
    btn.textContent = "Upload screenshot";
  }
  });
}

document.getElementById("checkoutForm").addEventListener("submit", async function (e) {
  e.preventDefault();
  const cart = getCart();
  const errEl = document.getElementById("checkoutError");
  const btn = document.getElementById("placeOrderBtn");

  errEl.classList.add("d-none");
  clearCheckoutFieldErrors();

  const formData = getCheckoutFormData();
  const clientErrors = validateCheckoutForm(formData);
  if (clientErrors.length) {
    showCheckoutFieldErrors(clientErrors);
    errEl.textContent = "Please fix the highlighted fields.";
    errEl.classList.remove("d-none");
    return;
  }

  btn.disabled = true;
  btn.textContent = "Placing order…";

  try {
    const data = await publicPost("/orders", {
      customerName: formData.customerName.trim(),
      customerPhone: normalizePkPhone(formData.customerPhone),
      customerEmail: formData.customerEmail.trim(),
      city: formData.city.trim(),
      streetAddress: formData.streetAddress.trim(),
      deliveryNotes: formData.deliveryNotes.trim(),
      paymentMethod: formData.paymentMethod,
      items: cart.map(function (item) {
        return { productId: item.id, quantity: item.qty };
      }),
    });

    saveCart([]);
    saveLastOrderNumber(data.order.orderNumber);
    renderCart();
    checkoutModal.hide();

    const method = data.order.paymentMethod || formData.paymentMethod;
    lastPlacedOrder = {
      orderNumber: data.order.orderNumber,
      phone: formData.customerPhone.trim(),
      paymentMethod: method,
      amount: data.order.amount,
    };
    sessionStorage.setItem(
      "asLastCheckoutPhone",
      formData.customerPhone.trim().replace(/\D/g, "").slice(-4)
    );

    document.getElementById("successOrderNumber").textContent = data.order.orderNumber;
    const successPay = document.getElementById("successPaymentInfo");
    const proofBox = document.getElementById("successProofUpload");
    if (successPay && typeof renderChosenPaymentSummary === "function") {
      successPay.innerHTML = renderChosenPaymentSummary(method);
      if (typeof isPrepaidPaymentMethod === "function" && isPrepaidPaymentMethod(method)) {
        const extra = document.createElement("div");
        extra.id = "successPaymentDetails";
        successPay.appendChild(extra);
        mountPaymentInfo("#successPaymentDetails", "compact");
        if (proofBox) proofBox.classList.remove("d-none");
        const amountInput = document.getElementById("successProofAmount");
        if (amountInput) amountInput.value = String(data.order.amount || "");
        const txnInput = document.getElementById("successProofTxn");
        if (txnInput) txnInput.value = "";
        if (typeof wireTransactionIdValidation === "function") {
          wireTransactionIdValidation("successProofTxn", function () {
            return lastPlacedOrder ? lastPlacedOrder.paymentMethod : "bank_transfer";
          });
        }
      } else if (proofBox) {
        proofBox.classList.add("d-none");
      }
    }
    document.getElementById("trackOrderLink").href =
      "track-order.html?order=" + encodeURIComponent(data.order.orderNumber);
    updateSuccessTrackLink(
      !(typeof isPrepaidPaymentMethod === "function" && isPrepaidPaymentMethod(method))
    );
    orderSuccessModal.show();
  } catch (err) {
    if (err.errors && err.errors.length) {
      showCheckoutFieldErrors(mapApiErrors(err.errors));
    }
    errEl.textContent = err.message;
    errEl.classList.remove("d-none");
  } finally {
    btn.disabled = false;
    btn.textContent = "Confirm order";
  }
});


syncCartPricesFromServer().then(function () {
  renderCart();
});
