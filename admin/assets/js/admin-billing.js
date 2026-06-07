// Billing page logic

let allInvoices = [];
let allProducts = [];
let selectedInvoice = null;
let cartLines = [];

function invoiceSourceBadge(source) {
  const s = source || "walk-in";
  const map = {
    online: "bg-primary-subtle text-primary-emphasis",
    "walk-in": "bg-secondary-subtle text-secondary-emphasis",
  };
  const labels = { online: "Online", "walk-in": "Walk-in" };
  return (
    '<span class="badge-status ' +
    (map[s] || "bg-light text-dark") +
    '">' +
    (labels[s] || s) +
    "</span>"
  );
}

function invoicePaymentMethodBadge(method) {
  const labels = {
    cod: "COD",
    bank_transfer: "Bank",
    jazzcash: "JazzCash",
    easypaisa: "Easypaisa",
  };
  const m = method || "cod";
  return (
    '<span class="badge rounded-pill text-bg-light border small">' +
    (labels[m] || m) +
    "</span>"
  );
}

function invoicePaymentMethodLabel(method) {
  const labels = {
    cod: "Cash on delivery (COD)",
    bank_transfer: "Bank transfer",
    jazzcash: "JazzCash",
    easypaisa: "Easypaisa",
  };
  return labels[method] || method || "—";
}

function invoiceStatusBadge(status) {
  const styles = {
    paid: "bg-success-subtle text-success-emphasis",
    pending: "bg-warning-subtle text-warning-emphasis",
    overdue: "bg-danger-subtle text-danger-emphasis",
  };
  const labels = { paid: "Paid", pending: "Unpaid", overdue: "Overdue" };
  const css = styles[status] || "bg-light text-dark";
  return (
    '<span class="badge-status ' + css + '">' + (labels[status] || status) + "</span>"
  );
}

function highlightInvoicePanels(on) {
  const detail = document.getElementById("invoiceDetailPanel");
  const pay = document.getElementById("invoicePayPanel");
  if (on) {
    detail.classList.add("panel-selected");
    pay.classList.add("panel-selected");
  } else {
    detail.classList.remove("panel-selected");
    pay.classList.remove("panel-selected");
  }
}

function showSelectedInvoice(inv) {
  selectedInvoice = inv;
  const tbody = document.getElementById("posItemsTable");
  tbody.innerHTML = "";

  inv.items.forEach(function (item) {
    tbody.innerHTML +=
      "<tr><td>" +
      item.name +
      "</td><td>" +
      item.quantity +
      "</td><td class='text-end'>" +
      item.lineTotal.toLocaleString("en-PK") +
      "</td></tr>";
  });

  tbody.innerHTML +=
    "<tr class='fw-bold'><td colspan='2'>Subtotal</td><td class='text-end'>" +
    inv.subtotal.toLocaleString("en-PK") +
    "</td></tr>";

  const deliveryFee = Number(inv.deliveryFee) || 0;
  if (deliveryFee > 0) {
    tbody.innerHTML +=
      "<tr><td colspan='2'>Delivery</td><td class='text-end'>" +
      deliveryFee.toLocaleString("en-PK") +
      "</td></tr>";
  }

  const discount = Number(inv.discount) || 0;
  if (discount > 0) {
    tbody.innerHTML +=
      "<tr><td colspan='2' class='text-muted'>Trade discount</td><td class='text-end text-success'>− " +
      discount.toLocaleString("en-PK") +
      "</td></tr>";
  }

  tbody.innerHTML +=
    "<tr><td colspan='2' class='text-muted'>Payment method</td><td class='text-end fw-semibold'>" +
    invoicePaymentMethodLabel(inv.paymentMethod) +
    "</td></tr>";

  document.getElementById("summarySubtotal").textContent = formatMoney(inv.subtotal);
  document.getElementById("summaryDelivery").textContent = formatMoney(deliveryFee);
  document.getElementById("summaryDeliveryRow").style.display = deliveryFee > 0 ? "" : "none";
  document.getElementById("summaryDiscount").textContent =
    discount > 0 ? "− " + formatMoney(discount) : "Rs. 0";
  document.getElementById("summaryDiscountRow").style.display = discount > 0 ? "" : "none";
  document.getElementById("summaryTotal").textContent = formatMoney(inv.total);
  document.getElementById("selectedInvoiceLabel").textContent =
    inv.invoiceNumber +
    " · " +
    inv.customerName +
    " · " +
    (inv.source === "online" ? "Online" : "Walk-in");
  const payMethodLine = document.getElementById("selectedInvoicePaymentMethod");
  if (payMethodLine) {
    payMethodLine.innerHTML =
      '<span class="text-muted">Payment method:</span> <strong>' +
      invoicePaymentMethodLabel(inv.paymentMethod) +
      "</strong>";
  }

  const payBtn = document.getElementById("btnRecordPayment");
  payBtn.disabled = inv.status === "paid";
  payBtn.textContent = inv.status === "paid" ? "Already paid" : "Mark as paid";

  const editWrap = document.getElementById("editDiscountWrap");
  const editInput = document.getElementById("editInvoiceDiscount");
  if (inv.status === "paid") {
    editWrap.classList.add("d-none");
  } else {
    editWrap.classList.remove("d-none");
    editInput.value = discount;
  }

  highlightInvoicePanels(true);
}

function clearSelection() {
  selectedInvoice = null;
  document.getElementById("selectedInvoiceLabel").textContent =
    "Select an invoice from the table above";
  document.getElementById("posItemsTable").innerHTML =
    '<tr><td colspan="3" class="text-muted">No invoice selected</td></tr>';
  document.getElementById("summarySubtotal").textContent = "Rs. 0";
  document.getElementById("summaryDelivery").textContent = "Rs. 0";
  document.getElementById("summaryDeliveryRow").style.display = "none";
  document.getElementById("editDiscountWrap").classList.add("d-none");
  document.getElementById("summaryDiscount").textContent = "Rs. 0";
  document.getElementById("summaryDiscountRow").style.display = "none";
  document.getElementById("summaryTotal").textContent = "Rs. 0";
  document.getElementById("btnRecordPayment").disabled = true;
  highlightInvoicePanels(false);
}

function renderInvoices(list) {
  const tbody = document.getElementById("invoicesTable");
  tbody.innerHTML = "";

  if (!list.length) {
    tbody.innerHTML =
      '<tr><td colspan="9" class="text-muted">No invoices yet — click <strong>Create invoice</strong> above.</td></tr>';
    return;
  }

  list.forEach(function (inv) {
    const row = document.createElement("tr");
    row.className = "clickable-row";
    if (selectedInvoice && selectedInvoice._id === inv._id) {
      row.classList.add("table-active");
    }

    row.innerHTML =
      "<td class='fw-semibold'>" +
      inv.invoiceNumber +
      "</td><td>" +
      invoiceSourceBadge(inv.source) +
      "</td><td>" +
      invoicePaymentMethodBadge(inv.paymentMethod) +
      "</td><td>" +
      inv.customerName +
      "</td><td class='text-muted small'>" +
      formatDate(inv.createdAt) +
      "</td><td class='text-muted small'>" +
      formatDate(inv.dueDate) +
      "</td><td class='text-end fw-semibold'>" +
      formatMoney(inv.total) +
      "</td><td>" +
      invoiceStatusBadge(inv.status) +
      "</td><td class='text-end text-nowrap'></td>";

    row.addEventListener("click", function () {
      showSelectedInvoice(inv);
      renderInvoices(list);
    });

    const actions = row.lastElementChild;

    const pdfBtn = document.createElement("button");
    pdfBtn.type = "button";
    pdfBtn.className = "btn btn-outline-secondary btn-sm me-1";
    pdfBtn.textContent = "PDF";
    pdfBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      downloadInvoicePdf(inv._id, inv.invoiceNumber + ".pdf")
        .then(function () {
          showToast("PDF downloaded", "success");
        })
        .catch(function (err) {
          showToast(err.message, "error");
        });
    });
    actions.appendChild(pdfBtn);

    if (inv.status !== "paid") {
      const payBtn = document.createElement("button");
      payBtn.type = "button";
      payBtn.className = "btn btn-admin-primary btn-sm";
      payBtn.textContent = "Pay";
      payBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        recordPayment(inv._id);
      });
      actions.appendChild(payBtn);
    }

    tbody.appendChild(row);
  });
}

async function loadInvoices() {
  const status = document.getElementById("filterStatus").value;
  const source = document.getElementById("filterInvoiceSource").value;
  let path = "/invoices";
  const params = [];
  if (status) params.push("status=" + encodeURIComponent(status));
  if (source) params.push("source=" + encodeURIComponent(source));
  if (params.length) path += "?" + params.join("&");

  const data = await apiGet(path);
  allInvoices = data.invoices;

  renderInvoices(filterInvoicesClient());
}

async function recordPayment(invoiceId) {
  if (!confirmAction("Mark this invoice as paid?")) return;

  await apiPatch("/invoices/" + invoiceId + "/pay");
  await loadInvoices();

  if (selectedInvoice && selectedInvoice._id === invoiceId) {
    const updated = allInvoices.find(function (i) {
      return i._id === invoiceId;
    });
    if (updated) showSelectedInvoice(updated);
  }

  showToast("Payment recorded successfully.", "success");
}

function fillProductSelect() {
  const select = document.getElementById("cartProductSelect");
  select.innerHTML = '<option value="">— Choose product —</option>';
  allProducts.forEach(function (p) {
    const opt = document.createElement("option");
    opt.value = p._id;
    const sale = productSalePrice(p);
    opt.textContent = p.name + " — " + formatMoney(sale) + " (stock: " + p.stock + ")";
    opt.dataset.price = sale;
    opt.dataset.name = p.name;
    opt.dataset.stock = p.stock;
    select.appendChild(opt);
  });
}

function getCartBillTotals() {
  let subtotal = 0;
  cartLines.forEach(function (line) {
    subtotal += line.lineTotal;
  });
  const deliveryFee = document.getElementById("includeDeliveryFee").checked ? DELIVERY_FEE : 0;
  const discount = Math.max(0, Number(document.getElementById("newInvoiceDiscount").value) || 0);
  const total = Math.max(0, subtotal + deliveryFee - discount);
  return { subtotal, deliveryFee, discount, total };
}

function renderCart() {
  const tbody = document.getElementById("cartLinesTable");
  tbody.innerHTML = "";

  if (!cartLines.length) {
    tbody.innerHTML =
      '<tr><td colspan="4" class="text-muted small">No items yet — pick a product and click Add line</td></tr>';
  }

  cartLines.forEach(function (line, index) {
    tbody.innerHTML +=
      "<tr><td>" +
      line.name +
      "</td><td>" +
      line.quantity +
      "</td><td class='text-end'>" +
      line.lineTotal.toLocaleString("en-PK") +
      '</td><td class="text-end"><button type="button" class="btn btn-link btn-sm p-0 text-danger" data-index="' +
      index +
      '">Remove</button></td></tr>';
  });

  tbody.querySelectorAll("button[data-index]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      cartLines.splice(Number(btn.dataset.index), 1);
      renderCart();
    });
  });

  const bill = getCartBillTotals();
  document.getElementById("cartSubtotal").textContent = formatMoney(bill.subtotal);
  document.getElementById("cartDeliveryPreview").textContent = formatMoney(bill.deliveryFee);
  document.getElementById("cartDeliveryRow").style.display = bill.deliveryFee > 0 ? "" : "none";
  document.getElementById("cartGrandTotal").textContent = formatMoney(bill.total);
}

const DELIVERY_FEE = 1200;
const INVOICE_NAME_RE = /^[a-zA-Z\s.'-]{2,80}$/;
const DUE_DATE_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function initDueDateSelectors() {
  const dayEl = document.getElementById("newDueDay");
  const monthEl = document.getElementById("newDueMonth");
  const yearEl = document.getElementById("newDueYear");
  if (!dayEl || !monthEl || !yearEl || dayEl.dataset.ready === "1") return;

  monthEl.innerHTML = '<option value="">Month</option>';
  DUE_DATE_MONTHS.forEach(function (name, index) {
    const opt = document.createElement("option");
    opt.value = String(index + 1);
    opt.textContent = name;
    monthEl.appendChild(opt);
  });

  const startYear = new Date().getFullYear();
  yearEl.innerHTML = '<option value="">Year</option>';
  for (let y = startYear; y <= startYear + 5; y += 1) {
    const opt = document.createElement("option");
    opt.value = String(y);
    opt.textContent = String(y);
    yearEl.appendChild(opt);
  }

  fillDueDayOptions();
  updateDueDateSelectStates();
  dayEl.dataset.ready = "1";

  yearEl.addEventListener("change", function () {
    monthEl.value = "";
    dayEl.value = "";
    updateDueDateSelectStates();
    syncDueDateFromSelectors();
  });
  monthEl.addEventListener("change", function () {
    dayEl.value = "";
    fillDueDayOptions();
    updateDueDateSelectStates();
    syncDueDateFromSelectors();
  });
  dayEl.addEventListener("change", syncDueDateFromSelectors);
}

function updateDueDateSelectStates() {
  const dayEl = document.getElementById("newDueDay");
  const monthEl = document.getElementById("newDueMonth");
  const yearEl = document.getElementById("newDueYear");
  if (!dayEl || !monthEl || !yearEl) return;

  monthEl.disabled = !yearEl.value;
  dayEl.disabled = !yearEl.value || !monthEl.value;
}

function fillDueDayOptions() {
  const dayEl = document.getElementById("newDueDay");
  const monthEl = document.getElementById("newDueMonth");
  const yearEl = document.getElementById("newDueYear");
  if (!dayEl || !monthEl || !yearEl) return;

  const previous = dayEl.value;
  dayEl.innerHTML = '<option value="">Day</option>';

  const month = Number(monthEl.value);
  const year = Number(yearEl.value) || new Date().getFullYear();
  const maxDay = month ? new Date(year, month, 0).getDate() : 31;

  for (let d = 1; d <= maxDay; d += 1) {
    const opt = document.createElement("option");
    opt.value = String(d);
    opt.textContent = String(d);
    dayEl.appendChild(opt);
  }

  if (previous && Number(previous) <= maxDay) {
    dayEl.value = previous;
  }
}

function syncDueDateFromSelectors() {
  const dayEl = document.getElementById("newDueDay");
  const monthEl = document.getElementById("newDueMonth");
  const yearEl = document.getElementById("newDueYear");
  const hidden = document.getElementById("newDueDate");
  if (!dayEl || !monthEl || !yearEl || !hidden) return;

  const day = dayEl.value;
  const month = monthEl.value;
  const year = yearEl.value;

  clearDueDateFieldErrors();

  if (!day || !month || !year) {
    hidden.value = "";
    return;
  }

  hidden.value =
    year + "-" + String(month).padStart(2, "0") + "-" + String(day).padStart(2, "0");
}

function setDueDateSelectorsToToday() {
  const dayEl = document.getElementById("newDueDay");
  const monthEl = document.getElementById("newDueMonth");
  const yearEl = document.getElementById("newDueYear");
  if (!dayEl || !monthEl || !yearEl) return;

  const today = new Date();
  yearEl.value = String(today.getFullYear());
  monthEl.disabled = false;
  monthEl.value = String(today.getMonth() + 1);
  fillDueDayOptions();
  dayEl.disabled = false;
  dayEl.value = String(today.getDate());
  syncDueDateFromSelectors();
  clearDueDateFieldErrors();
}

function resetDueDateSelectors() {
  setDueDateSelectorsToToday();
}

function clearDueDateFieldErrors() {
  ["newDueDay", "newDueMonth", "newDueYear"].forEach(function (id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove("is-invalid");
  });
}

function showDueDateFieldError(message) {
  ["newDueDay", "newDueMonth", "newDueYear"].forEach(function (id) {
    const el = document.getElementById(id);
    if (el) el.classList.add("is-invalid");
  });
  const feedback = document.getElementById("newDueDateFeedback");
  if (feedback && message) feedback.textContent = message;
}

const CREATE_INVOICE_FIELD_IDS = {
  customerName: "newCustomerName",
  customerPhone: "newCustomerPhone",
  dueDate: "newDueDate",
  discount: "newInvoiceDiscount",
};

function clearCreateInvoiceFieldErrors() {
  Object.keys(CREATE_INVOICE_FIELD_IDS).forEach(function (key) {
    if (key === "dueDate") return;
    const el = document.getElementById(CREATE_INVOICE_FIELD_IDS[key]);
    if (el) el.classList.remove("is-invalid");
  });
  clearDueDateFieldErrors();
  const alertEl = document.getElementById("createInvoiceFormAlert");
  if (alertEl) alertEl.classList.add("d-none");
}

function showCreateInvoiceFieldErrors(errors) {
  clearCreateInvoiceFieldErrors();
  const alertEl = document.getElementById("createInvoiceFormAlert");
  const list = errors || [];
  if (!list.length) return;

  list.forEach(function (err) {
    if (err.field === "dueDate") {
      showDueDateFieldError(err.message);
      return;
    }
    const id = CREATE_INVOICE_FIELD_IDS[err.field];
    if (id) {
      const el = document.getElementById(id);
      if (el) {
        el.classList.add("is-invalid");
        const feedback = el.parentElement && el.parentElement.querySelector(".invalid-feedback");
        if (feedback && err.message) feedback.textContent = err.message;
      }
    }
  });

  if (alertEl) {
    alertEl.textContent = list[0].message;
    alertEl.classList.remove("d-none");
  }
}

function validateCreateInvoiceForm() {
  syncDueDateFromSelectors();
  const errors = [];
  const customerName = document.getElementById("newCustomerName").value.trim();
  const phoneEl = document.getElementById("newCustomerPhone");
  const phoneCheck = validatePkPhone(phoneEl ? phoneEl.value : "", true);
  const customerPhone = phoneCheck.normalized;
  const dueDate = document.getElementById("newDueDate").value;
  const bill = getCartBillTotals();

  if (!customerName) {
    errors.push({ field: "customerName", message: "Customer name is required" });
  } else if (!INVOICE_NAME_RE.test(customerName)) {
    errors.push({
      field: "customerName",
      message: "Name should be 2–80 letters (no numbers)",
    });
  }

  if (!phoneCheck.ok) {
    errors.push({
      field: "customerPhone",
      message: phoneCheck.message,
    });
    if (phoneEl) setPhoneFieldState(phoneEl, phoneCheck);
  }

  if (dueDate) {
    const picked = new Date(dueDate + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (Number.isNaN(picked.getTime())) {
      errors.push({ field: "dueDate", message: "Enter a valid due date" });
    } else if (picked < today) {
      errors.push({ field: "dueDate", message: "Due date cannot be in the past" });
    }
  }

  if (!cartLines.length) {
    errors.push({ field: "items", message: "Add at least one product to the invoice" });
  }

  if (bill.discount < 0) {
    errors.push({ field: "discount", message: "Discount cannot be negative" });
  } else if (bill.discount > bill.subtotal + bill.deliveryFee) {
    errors.push({
      field: "discount",
      message: "Trade discount cannot be more than the bill total",
    });
  }

  return { ok: errors.length === 0, errors, customerName, customerPhone, dueDate, bill };
}

function addToCart() {
  const select = document.getElementById("cartProductSelect");
  const qtyInput = document.getElementById("cartQty");
  const qty = Number(qtyInput.value);

  if (!select.value) {
    showToast("Choose a product first", "error");
    return;
  }

  if (!Number.isInteger(qty) || qty < 1) {
    showToast("Quantity must be at least 1", "error");
    return;
  }
  if (qty > 99) {
    showToast("Quantity cannot exceed 99", "error");
    return;
  }

  const option = select.options[select.selectedIndex];
  const name = option.dataset.name;
  const price = Number(option.dataset.price);
  const stock = Number(option.dataset.stock);

  if (stock >= 0 && qty > stock) {
    showToast("Only " + stock + " left for " + name, "error");
    return;
  }

  const existing = cartLines.find(function (line) {
    return line.productId === select.value;
  });
  const newQty = existing ? existing.quantity + qty : qty;
  if (stock >= 0 && newQty > stock) {
    showToast("Only " + stock + " left for " + name + " (check cart qty)", "error");
    return;
  }

  if (existing) {
    existing.quantity = newQty;
    existing.lineTotal = newQty * existing.unitPrice;
  } else {
    cartLines.push({
      productId: select.value,
      name: name,
      quantity: qty,
      unitPrice: price,
      lineTotal: qty * price,
    });
  }

  renderCart();
  showToast("Item added to bill", "info");
}

async function submitNewInvoice() {
  const check = validateCreateInvoiceForm();
  if (!check.ok) {
    showCreateInvoiceFieldErrors(check.errors);
    showToast(check.errors[0].message, "error");
    return;
  }

  clearCreateInvoiceFieldErrors();
  const btn = document.getElementById("btnSubmitInvoice");
  setButtonLoading(btn, true, "Saving…");

  try {
    await apiPost("/invoices", {
      customerName: check.customerName,
      customerPhone: check.customerPhone,
      items: cartLines,
      deliveryFee: check.bill.deliveryFee,
      source: "walk-in",
      tax: 0,
      discount: check.bill.discount,
      paymentMethod: document.getElementById("newInvoicePaymentMethod").value,
      dueDate: check.dueDate || undefined,
      reduceStock: true,
    });

    bootstrap.Modal.getInstance(document.getElementById("createInvoiceModal")).hide();
    cartLines = [];
    document.getElementById("createInvoiceForm").reset();
    await loadInvoices();
    showToast("Invoice issued successfully", "success");
  } catch (err) {
    if (err.errors && err.errors.length) {
      showCreateInvoiceFieldErrors(err.errors);
    }
    showToast(err.message || "Could not create invoice", "error");
  } finally {
    setButtonLoading(btn, false);
  }
}

async function openCreateInvoiceModal() {
  clearCreateInvoiceFieldErrors();
  document.getElementById("newInvoiceDiscount").value = "0";
  resetDueDateSelectors();
  const data = await apiGet("/products");
  allProducts = data.products;
  fillProductSelect();
  cartLines = [];
  renderCart();
  new bootstrap.Modal(document.getElementById("createInvoiceModal")).show();
}

function filterInvoicesClient() {
  const search = document.getElementById("searchInvoices").value.trim().toLowerCase();
  if (!search) return allInvoices;
  return allInvoices.filter(function (inv) {
    return (
      inv.invoiceNumber.toLowerCase().includes(search) ||
      inv.customerName.toLowerCase().includes(search)
    );
  });
}

setupAdminPage();
initDueDateSelectors();

document.getElementById("btnCreateInvoice").addEventListener("click", function () {
  openCreateInvoiceModal().catch(function (err) {
    showToast(err.message, "error");
  });
});

document.getElementById("btnAddCartLine").addEventListener("click", addToCart);
document.getElementById("includeDeliveryFee").addEventListener("change", renderCart);
document.getElementById("newInvoiceDiscount").addEventListener("input", renderCart);

document.getElementById("btnSaveDiscount").addEventListener("click", function () {
  if (!selectedInvoice) {
    showToast("Select an invoice first", "error");
    return;
  }
  const discount = Number(document.getElementById("editInvoiceDiscount").value) || 0;
  apiPatch("/invoices/" + selectedInvoice._id + "/discount", { discount: discount })
    .then(function (data) {
      if (!data) return;
      showToast(data.message || "Discount updated", "success");
      loadInvoices().then(function () {
        const updated = allInvoices.find(function (i) {
          return i._id === selectedInvoice._id;
        });
        if (updated) showSelectedInvoice(updated);
      });
    })
    .catch(function (err) {
      showToast(err.message, "error");
    });
});
document.getElementById("btnSubmitInvoice").addEventListener("click", function () {
  submitNewInvoice();
});

document.getElementById("btnRecordPayment").addEventListener("click", function () {
  if (!selectedInvoice) {
    showToast("Click an invoice in the table first", "error");
    return;
  }
  recordPayment(selectedInvoice._id).catch(function (err) {
    showToast(err.message, "error");
  });
});

document.getElementById("btnPrintReceipt").addEventListener("click", function () {
  if (!selectedInvoice) {
    showToast("Click an invoice in the table first", "error");
    return;
  }
  downloadInvoicePdf(selectedInvoice._id, selectedInvoice.invoiceNumber + ".pdf")
    .then(function () {
      showToast("PDF downloaded", "success");
    })
    .catch(function (err) {
      showToast(err.message, "error");
    });
});

document.getElementById("searchInvoices").addEventListener("input", function () {
  renderInvoices(filterInvoicesClient());
});

document.getElementById("filterStatus").addEventListener("change", function () {
  loadInvoices().catch(function (err) {
    showToast(err.message, "error");
  });
});

document.getElementById("filterInvoiceSource").addEventListener("change", function () {
  loadInvoices().catch(function (err) {
    showToast(err.message, "error");
  });
});

clearSelection();
loadInvoices().catch(function (err) {
  document.getElementById("invoicesTable").innerHTML =
    '<tr><td colspan="8" class="text-danger">' + err.message + "</td></tr>";
});

if (window.location.hash === "#create") {
  openCreateInvoiceModal().catch(function (err) {
    showToast(err.message, "error");
  });
}
