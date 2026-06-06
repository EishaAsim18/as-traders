// Customer orders — full admin workflow (MongoDB)

const STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"];
let currentOrder = null;
let modalPaymentPicker = null;

function applyPaymentMethodAutoNote(method) {
  const noteEl = document.getElementById("modalPaymentNote");
  const opt =
    typeof getPaymentOption === "function" ? getPaymentOption(method) : null;

  if (opt && noteEl && !noteEl.value.trim()) {
    noteEl.value = opt.adminNote;
  }

  const proofSection = document.getElementById("modalPaymentProofSection");
  if (proofSection) {
    proofSection.classList.toggle("d-none", method === "cod");
  }
}

function proofCheckBadge(passed, label) {
  const cls = passed
    ? "bg-success-subtle text-success-emphasis"
    : "bg-danger-subtle text-danger-emphasis";
  const icon = passed ? "✓" : "!";
  return (
    '<span class="badge rounded-pill ' +
    cls +
    ' me-1 mb-1">' +
    icon +
    " " +
    label +
    "</span>"
  );
}

function renderPaymentProofChecks(order) {
  const box = document.getElementById("modalPaymentProofChecks");
  if (!box) return;

  if (!order.paymentProofUrl) {
    box.classList.add("d-none");
    box.innerHTML = "";
    return;
  }

  const checks = order.paymentProofChecks || {};
  const hasMeta = !!(order.paymentProofTxnId || order.paymentProofAmount);
  const lines = [];

  if (order.paymentProofTxnId) {
    lines.push(
      '<div class="mb-1"><span class="text-muted">Transaction ID:</span> <code class="user-select-all">' +
        order.paymentProofTxnId +
        "</code></div>"
    );
  }
  if (order.paymentProofAmount != null) {
    lines.push(
      '<div class="mb-1"><span class="text-muted">Customer declared:</span> <strong>' +
        formatMoney(order.paymentProofAmount) +
        "</strong>" +
        (order.amount != null
          ? ' <span class="text-muted">· order total ' + formatMoney(order.amount) + "</span>"
          : "") +
        "</div>"
    );
  }
  if (order.paymentProofSender) {
    lines.push(
      '<div class="mb-1"><span class="text-muted">Sender note:</span> ' +
        order.paymentProofSender +
        "</div>"
    );
  }

  if (hasMeta || checks.txnIdValid != null) {
    lines.push('<div class="mt-2 mb-1 fw-semibold">Auto verification</div>');
    lines.push(
      '<div class="d-flex flex-wrap gap-1">' +
        proofCheckBadge(!!checks.amountMatch, "Amount matches order") +
        proofCheckBadge(!!checks.txnIdValid, "Transaction ID format OK") +
        proofCheckBadge(!!checks.imageValid, "Screenshot looks valid") +
        "</div>"
    );

    if (checks.autoChecksPassed) {
      lines.push(
        '<p class="small text-success mb-0 mt-2">Checks passed — compare the TID and amount on the screenshot, then confirm payment.</p>'
      );
    } else {
      lines.push(
        '<p class="small text-warning mb-0 mt-2">Review carefully — one or more checks failed or this is an older upload without details.</p>'
      );
    }

    if (checks.warnings && checks.warnings.length) {
      lines.push(
        '<ul class="small text-muted mb-0 mt-2 ps-3">' +
          checks.warnings
            .map(function (w) {
              return "<li>" + w + "</li>";
            })
            .join("") +
          "</ul>"
      );
    }
  } else {
    lines.push(
      '<p class="small text-muted mb-0">Older upload — no transaction details. Verify manually from the screenshot.</p>'
    );
  }

  box.innerHTML = lines.join("");
  box.classList.remove("d-none");
}

function renderPaymentProofBlock(order) {
  const empty = document.getElementById("modalPaymentProofEmpty");
  const link = document.getElementById("modalPaymentProofLink");
  const img = document.getElementById("modalPaymentProofImg");
  const confirmBtn = document.getElementById("btnConfirmPaymentProof");
  const paidNote = document.getElementById("modalPaymentProofPaid");

  if (!empty || !link || !img) return;

  const isPaid = order.paymentStatus === "paid";

  if (order.paymentProofUrl) {
    const url =
      typeof proofImageUrl === "function"
        ? proofImageUrl(order.paymentProofUrl)
        : order.paymentProofUrl;
    empty.classList.add("d-none");
    img.src = url;
    link.href = url;
    link.classList.remove("d-none");
    img.classList.remove("d-none");
    renderPaymentProofChecks(order);
    if (confirmBtn) {
      confirmBtn.classList.toggle("d-none", isPaid);
    }
    if (paidNote) {
      paidNote.classList.toggle("d-none", !isPaid);
    }
  } else {
    empty.classList.remove("d-none");
    renderPaymentProofChecks(order);
    link.classList.add("d-none");
    img.classList.add("d-none");
    img.removeAttribute("src");
    link.href = "#";
    if (confirmBtn) confirmBtn.classList.add("d-none");
    if (paidNote) paidNote.classList.add("d-none");
  }
}

function orderStatusBadge(status) {
  const map = {
    pending: "bg-primary-subtle text-primary-emphasis",
    confirmed: "bg-info-subtle text-info-emphasis",
    shipped: "bg-warning-subtle text-warning-emphasis",
    delivered: "bg-success-subtle text-success-emphasis",
    cancelled: "bg-danger-subtle text-danger-emphasis",
  };
  const labels = {
    pending: "Pending",
    confirmed: "Confirmed",
    shipped: "Shipped",
    delivered: "Delivered",
    cancelled: "Cancelled",
  };
  const s = status || "pending";
  return (
    '<span class="badge-status ' +
    (map[s] || "bg-light text-dark") +
    '">' +
    (labels[s] || s) +
    "</span>"
  );
}

function sourceBadge(source) {
  const s = source || "online";
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

function paymentMethodBadge(order) {
  const method = order.paymentMethod || "bank_transfer";
  const labels = {
    cod: "COD",
    bank_transfer: "Bank",
    jazzcash: "JazzCash",
    easypaisa: "Easypaisa",
  };
  return (
    '<span class="badge rounded-pill text-bg-light border small">' +
    (labels[method] || method) +
    "</span>"
  );
}

function paymentBadge(order) {
  const ps = order.paymentStatus || "unpaid";
  const map = {
    unpaid: "bg-warning-subtle text-warning-emphasis",
    paid: "bg-success-subtle text-success-emphasis",
    partial: "bg-secondary-subtle text-secondary-emphasis",
  };
  const labels = { unpaid: "Unpaid", paid: "Paid", partial: "Partial" };
  return (
    '<span class="badge-status ' +
    map[ps] +
    '">' +
    labels[ps] +
    "</span>"
  );
}

function formatDateTime(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("en-PK", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function itemCount(order) {
  if (!order.items || !order.items.length) return "—";
  let qty = 0;
  order.items.forEach(function (item) {
    qty += item.quantity;
  });
  return order.items.length + " line · " + qty + " pcs";
}

function orderFiltersActive() {
  return !!(
    document.getElementById("filterOrderStatus").value ||
    document.getElementById("filterOrderSource").value ||
    document.getElementById("filterPaymentStatus").value ||
    (document.getElementById("filterCodReport") &&
      document.getElementById("filterCodReport").value)
  );
}

function clearOrderFilters() {
  document.getElementById("filterOrderStatus").value = "";
  document.getElementById("filterOrderSource").value = "";
  document.getElementById("filterPaymentStatus").value = "";
  const cod = document.getElementById("filterCodReport");
  if (cod) cod.value = "";
}

function renderOrdersTable(orders) {
  const tbody = document.getElementById("ordersTableBody");
  const empty = document.getElementById("ordersEmpty");
  const emptyFiltered = document.getElementById("ordersEmptyFiltered");
  const emptyNone = document.getElementById("ordersEmptyNone");
  const countEl = document.getElementById("ordersCount");

  if (countEl) countEl.textContent = orders.length;

  if (!orders.length) {
    tbody.innerHTML = "";
    empty.classList.remove("d-none");
    const filtered = orderFiltersActive();
    if (emptyFiltered) emptyFiltered.classList.toggle("d-none", !filtered);
    if (emptyNone) emptyNone.classList.toggle("d-none", filtered);
    return;
  }

  empty.classList.add("d-none");
  tbody.innerHTML = "";

  orders.forEach(function (order) {
    const tr = document.createElement("tr");
    tr.innerHTML =
      "<td class='fw-semibold'>" +
      order.orderNumber +
      "</td>" +
      "<td class='small text-muted'>" +
      formatDateTime(order.createdAt) +
      "</td>" +
      "<td>" +
      order.customerName +
      "<div class='small text-muted'>" +
      (order.customerPhone || "—") +
      "</div></td>" +
      "<td>" +
      (order.city || "—") +
      "</td>" +
      "<td class='small'>" +
      itemCount(order) +
      "</td>" +
      "<td class='fw-semibold'>" +
      formatMoney(order.amount) +
      "</td>" +
      "<td>" +
      sourceBadge(order.source) +
      "</td>" +
      "<td>" +
      paymentMethodBadge(order) +
      "</td>" +
      "<td>" +
      orderStatusBadge(order.status) +
      "</td>" +
      "<td>" +
      paymentBadge(order) +
      (order.codAwaitingConfirm
        ? " <span class='badge rounded-pill text-bg-warning ms-1'>COD reported</span>"
        : "") +
      (order.hasPaymentProof
        ? " <span class='badge rounded-pill text-bg-info ms-1'>Screenshot</span>"
        : "") +
      "</td>" +
      "<td class='text-end'>" +
      '<button type="button" class="btn btn-sm btn-outline-primary btn-view-order" data-id="' +
      order._id +
      '">Manage</button></td>';

    tr.querySelector(".btn-view-order").addEventListener("click", function () {
      openOrderModal(order._id);
    });

    tbody.appendChild(tr);
  });
}

function fillStatusSelect(selectId, currentStatus) {
  const sel = document.getElementById(selectId);
  sel.innerHTML = "";
  STATUSES.forEach(function (s) {
    const opt = document.createElement("option");
    opt.value = s;
    opt.textContent = s.charAt(0).toUpperCase() + s.slice(1);
    if (s === currentStatus) opt.selected = true;
    sel.appendChild(opt);
  });
}

function updateActionButtons(order) {
  const st = order.status;
  const btnGen = document.getElementById("btnGenerateInvoice");
  document.getElementById("btnAcceptOrder").disabled = st !== "pending";
  document.getElementById("btnRejectOrder").disabled =
    st === "delivered" || st === "cancelled";

  const invInfo = document.getElementById("modalInvoiceInfo");
  const btnPdf = document.getElementById("btnDownloadOrderPdf");
  if (order.invoiceNumber) {
    invInfo.innerHTML =
      'Invoice: <a href="billing.html" class="fw-semibold">' +
      order.invoiceNumber +
      "</a>";
    invInfo.classList.remove("d-none");
    if (btnGen) {
      btnGen.textContent = "Invoice created";
      btnGen.disabled = true;
    }
    if (btnPdf) {
      btnPdf.classList.remove("d-none");
      btnPdf.disabled = false;
    }
  } else {
    invInfo.classList.add("d-none");
    if (btnGen) {
      btnGen.textContent = "Generate invoice";
      btnGen.disabled = st === "cancelled";
    }
    if (btnPdf) {
      btnPdf.classList.add("d-none");
      btnPdf.disabled = true;
    }
  }

  document.getElementById("modalPaymentStatus").value = order.paymentStatus || "unpaid";
  document.getElementById("modalPaidAmount").value =
    order.paidAmount !== undefined ? order.paidAmount : order.amount;
  document.getElementById("modalPaymentNote").value = order.paymentNote || "";

  const method = order.paymentMethod || "bank_transfer";
  if (document.getElementById("modalPaymentPicker")) {
    if (!modalPaymentPicker) {
      modalPaymentPicker = initPaymentMethodPicker("modalPaymentPicker", {
        hiddenInputId: "modalPaymentMethod",
        defaultMethod: method,
        onChange: applyPaymentMethodAutoNote,
      });
    } else {
      modalPaymentPicker.setValue(method);
    }
    applyPaymentMethodAutoNote(method);
  }
  renderPaymentProofBlock(order);

  const codBox = document.getElementById("modalCodReport");
  const codText = document.getElementById("modalCodReportText");
  const btnConfirmCod = document.getElementById("btnConfirmCodPayment");
  if (codBox && codText) {
    if (order.codAwaitingConfirm) {
      codBox.classList.remove("d-none");
      codText.textContent =
        "Reported " +
        formatDateTime(order.codCashReportedAt) +
        (order.codCashReportedNote ? " — " + order.codCashReportedNote : "") +
        ". Verify cash, then confirm below. Re-download PDF to show PAID.";
      if (btnConfirmCod) btnConfirmCod.disabled = false;
    } else {
      codBox.classList.add("d-none");
    }
  }
}

function renderOrderModal(order) {
  if (!order) return;
  currentOrder = order;

  document.getElementById("modalOrderNumber").textContent = order.orderNumber;
  document.getElementById("modalOrderSource").innerHTML = sourceBadge(order.source);
  document.getElementById("modalOrderStatus").innerHTML = orderStatusBadge(order.status);
  document.getElementById("modalOrderPayment").innerHTML = paymentBadge(order);
  const payMethodEl = document.getElementById("modalOrderPayMethod");
  if (payMethodEl) {
    payMethodEl.textContent =
      order.paymentMethodLabel ||
      (order.paymentMethod === "cod"
        ? "Cash on delivery (COD)"
        : order.paymentMethod || "—");
  }
  document.getElementById("modalOrderDate").textContent = formatDateTime(order.createdAt);
  document.getElementById("modalCustomerName").textContent = order.customerName;
  document.getElementById("modalCustomerPhone").textContent = order.customerPhone || "—";
  document.getElementById("modalCustomerEmail").textContent = order.customerEmail || "—";
  document.getElementById("modalCity").textContent = order.city || "—";
  document.getElementById("modalAddress").textContent =
    order.streetAddress || order.deliveryAddress || "—";
  document.getElementById("modalDeliveryNotes").textContent = order.deliveryNotes || "—";
  document.getElementById("modalSubtotal").textContent = formatMoney(order.subtotal || 0);
  const fee = order.source === "walk-in" ? 0 : order.deliveryFee || 1200;
  document.getElementById("modalDeliveryFee").textContent =
    order.source === "walk-in" ? "—" : formatMoney(fee);
  document.getElementById("modalTotal").textContent = formatMoney(order.amount);

  if (order.rejectReason) {
    document.getElementById("modalRejectReason").textContent = order.rejectReason;
    document.getElementById("modalRejectReason").classList.remove("d-none");
  } else {
    document.getElementById("modalRejectReason").classList.add("d-none");
  }

  const itemsBody = document.getElementById("modalItemsBody");
  itemsBody.innerHTML = "";

  if (!order.items || !order.items.length) {
    itemsBody.innerHTML =
      '<tr><td colspan="4" class="text-muted small">No line items</td></tr>';
  } else {
    order.items.forEach(function (item) {
      itemsBody.innerHTML +=
        "<tr><td>" +
        item.name +
        "<div class='small text-muted'>" +
        (item.sku || "") +
        "</div></td><td>" +
        item.quantity +
        "</td><td>" +
        formatMoney(item.unitPrice) +
        "</td><td class='fw-semibold'>" +
        formatMoney(item.lineTotal) +
        "</td></tr>";
    });
  }

  fillStatusSelect("modalStatusSelect", order.status);
  document.getElementById("modalInvoiceDiscount").value = "0";
  updateActionButtons(order);
}

async function openOrderModal(orderId) {
  const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById("orderDetailModal"));
  document.getElementById("modalItemsBody").innerHTML =
    '<tr><td colspan="4" class="text-muted small">Loading…</td></tr>';
  modal.show();

  try {
    const data = await apiGet("/orders/" + orderId);
    renderOrderModal(data.order);
  } catch (err) {
    showToast(err.message || "Could not load order", "error");
  }
}

async function reloadOrder(orderId) {
  const data = await apiGet("/orders/" + orderId);
  renderOrderModal(data.order);
  await loadOrders();
}

async function loadOrders() {
  const status = document.getElementById("filterOrderStatus").value;
  const payment = document.getElementById("filterPaymentStatus").value;
  const source = document.getElementById("filterOrderSource").value;
  const codReport = document.getElementById("filterCodReport")
    ? document.getElementById("filterCodReport").value
    : "";
  let path = "/orders?limit=200";
  if (status) path += "&status=" + encodeURIComponent(status);
  if (payment) path += "&paymentStatus=" + encodeURIComponent(payment);
  if (source) path += "&source=" + encodeURIComponent(source);
  if (codReport === "cod") path += "&paymentMethod=cod";
  if (codReport === "cod_reported") path += "&codAwaiting=1";

  const data = await apiGet(path);
  renderOrdersTable(data.orders || []);
}

document.addEventListener("DOMContentLoaded", function () {
  setupAdminPage();

  document.getElementById("filterOrderSource").addEventListener("change", function () {
    loadOrders().catch(showError);
  });
  document.getElementById("filterOrderStatus").addEventListener("change", function () {
    loadOrders().catch(showError);
  });
  document.getElementById("filterPaymentStatus").addEventListener("change", function () {
    loadOrders().catch(showError);
  });

  const filterCod = document.getElementById("filterCodReport");
  if (filterCod) {
    filterCod.addEventListener("change", function () {
      loadOrders().catch(showError);
    });
  }

  const btnClearFilters = document.getElementById("btnClearOrderFilters");
  if (btnClearFilters) {
    btnClearFilters.addEventListener("click", function () {
      clearOrderFilters();
      loadOrders().catch(showError);
    });
  }

  const emptyClear = document.getElementById("ordersEmptyClearFilters");
  if (emptyClear) {
    emptyClear.addEventListener("click", function () {
      clearOrderFilters();
      loadOrders().catch(showError);
    });
  }

  document.getElementById("btnConfirmCodPayment").addEventListener("click", function () {
    if (!currentOrder) return;
    if (!confirmAction("Mark this COD order as Paid? Only confirm if you received the cash.")) {
      return;
    }
    apiPatch("/orders/" + currentOrder._id + "/confirm-cod-payment", {
      note: "Admin confirmed COD cash",
    })
      .then(function (data) {
        showToast(data.message || "COD payment confirmed", "success");
        return reloadOrder(currentOrder._id);
      })
      .catch(showError);
  });

  document.getElementById("btnAcceptOrder").addEventListener("click", function () {
    if (!currentOrder) return;
    apiPatch("/orders/" + currentOrder._id + "/accept", {})
      .then(function (data) {
        showToast(data.message || "Order accepted", "success");
        return reloadOrder(currentOrder._id);
      })
      .catch(showError);
  });

  document.getElementById("btnRejectOrder").addEventListener("click", function () {
    if (!currentOrder) return;
    const reason = prompt("Reason for rejection (optional):") || "";
    apiPatch("/orders/" + currentOrder._id + "/reject", { reason: reason })
      .then(function (data) {
        showToast(data.message || "Order rejected", "success");
        return reloadOrder(currentOrder._id);
      })
      .catch(showError);
  });

  document.getElementById("btnUpdateStatus").addEventListener("click", function () {
    if (!currentOrder) return;
    const status = document.getElementById("modalStatusSelect").value;
    apiPatch("/orders/" + currentOrder._id + "/status", { status: status })
      .then(function (data) {
        showToast(data.message || "Status updated", "success");
        return reloadOrder(currentOrder._id);
      })
      .catch(showError);
  });

  document.getElementById("btnGenerateInvoice").addEventListener("click", function () {
    if (!currentOrder) return;
    const btn = document.getElementById("btnGenerateInvoice");
    const discount = Number(document.getElementById("modalInvoiceDiscount").value) || 0;
    btn.disabled = true;
    btn.textContent = "Generating…";
    apiPost("/orders/" + currentOrder._id + "/generate-invoice", { discount: discount })
      .then(function (data) {
        if (!data) return;
        showToast(data.message || "Invoice generated", "success");
        return reloadOrder(currentOrder._id);
      })
      .catch(showError)
      .finally(function () {
        if (currentOrder && !currentOrder.invoiceNumber && btn) {
          btn.disabled = currentOrder.status === "cancelled";
          btn.textContent = "Generate invoice";
        }
      });
  });

  document.getElementById("btnDownloadOrderPdf").addEventListener("click", function () {
    if (!currentOrder || !currentOrder._id) return;
    const name =
      (currentOrder.invoiceNumber || "invoice") +
      "-" +
      (currentOrder.orderNumber || "order") +
      ".pdf";
    const btn = document.getElementById("btnDownloadOrderPdf");
    const prev = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Preparing PDF…";
    downloadOrderInvoicePdf(currentOrder._id, name)
      .then(function () {
        showToast("PDF ready — print or send on WhatsApp", "success");
      })
      .catch(showError)
      .finally(function () {
        btn.disabled = false;
        btn.textContent = prev;
      });
  });

  const btnConfirmProof = document.getElementById("btnConfirmPaymentProof");
  if (btnConfirmProof) {
    btnConfirmProof.addEventListener("click", function () {
      if (!currentOrder) return;
      if (!currentOrder.paymentProofUrl) {
        showToast("No customer screenshot on this order yet", "error");
        return;
      }
      if (currentOrder.paymentStatus === "paid") {
        showToast("Payment is already marked as Paid", "info");
        return;
      }

      const methodEl = document.getElementById("modalPaymentMethod");
      const noteEl = document.getElementById("modalPaymentNote");
      const method = methodEl ? methodEl.value : currentOrder.paymentMethod;
      const note =
        (noteEl && noteEl.value.trim()) ||
        "Payment verified from customer screenshot";

      btnConfirmProof.disabled = true;
      apiPatch("/orders/" + currentOrder._id + "/payment", {
        paymentStatus: "paid",
        paidAmount: currentOrder.amount,
        paymentNote: note,
        paymentMethod: method,
      })
        .then(function (data) {
          showToast(data.message || "Payment marked as Paid", "success");
          return reloadOrder(currentOrder._id);
        })
        .catch(showError)
        .finally(function () {
          btnConfirmProof.disabled = false;
        });
    });
  }

  document.getElementById("btnSavePayment").addEventListener("click", function () {
    if (!currentOrder) return;
    const methodEl = document.getElementById("modalPaymentMethod");
    apiPatch("/orders/" + currentOrder._id + "/payment", {
      paymentStatus: document.getElementById("modalPaymentStatus").value,
      paidAmount: Number(document.getElementById("modalPaidAmount").value),
      paymentNote: document.getElementById("modalPaymentNote").value,
      paymentMethod: methodEl ? methodEl.value : currentOrder.paymentMethod,
    })
      .then(function (data) {
        showToast(data.message || "Payment saved", "success");
        return reloadOrder(currentOrder._id);
      })
      .catch(showError);
  });

  loadOrders().catch(function (err) {
    showToast("Could not load orders. Is the backend running?", "error");
  });
});

function showError(err) {
  showToast(err.message || "Something went wrong", "error");
}
