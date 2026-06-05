// Admin — customer list, search, purchase history, block/unblock

let currentCustomer = null;
let searchTimer = null;

function customerStatusBadge(isBlocked) {
  if (isBlocked) {
    return '<span class="badge-status bg-danger-subtle text-danger-emphasis">Blocked</span>';
  }
  return '<span class="badge-status bg-success-subtle text-success-emphasis">Active</span>';
}

function orderStatusLabel(status) {
  const labels = {
    pending: "Pending",
    confirmed: "Confirmed",
    shipped: "Shipped",
    delivered: "Delivered",
    cancelled: "Cancelled",
  };
  return labels[status] || status;
}

function showError(err) {
  showToast(err.message || "Something went wrong", "error");
}

function renderCustomersTable(customers) {
  const tbody = document.getElementById("customersTableBody");
  const empty = document.getElementById("customersEmpty");
  const countEl = document.getElementById("customersCount");

  countEl.textContent = customers.length;

  if (!customers.length) {
    tbody.innerHTML = "";
    empty.classList.remove("d-none");
    return;
  }

  empty.classList.add("d-none");
  tbody.innerHTML = "";

  customers.forEach(function (c) {
    const tr = document.createElement("tr");
    tr.innerHTML =
      "<td class='fw-semibold'>" +
      c.name +
      "</td>" +
      "<td class='small'>" +
      (c.phone || "—") +
      "</td>" +
      "<td class='small'>" +
      c.email +
      "</td>" +
      "<td class='small text-muted'>" +
      (c.address || "—") +
      "</td>" +
      "<td class='text-center fw-semibold'>" +
      c.orderCount +
      "</td>" +
      "<td>" +
      customerStatusBadge(c.isBlocked) +
      "</td>" +
      "<td class='text-end'>" +
      '<button type="button" class="btn btn-sm btn-outline-primary btn-view-customer" data-id="' +
      c.id +
      '">View</button></td>';

    tr.querySelector(".btn-view-customer").addEventListener("click", function () {
      openCustomerModal(c.id);
    });

    tbody.appendChild(tr);
  });
}

function renderPurchaseHistory(orders) {
  const tbody = document.getElementById("modalOrdersBody");

  if (!orders.length) {
    tbody.innerHTML =
      '<tr><td colspan="5" class="text-muted small">No orders yet for this customer.</td></tr>';
    return;
  }

  tbody.innerHTML = "";
  orders.forEach(function (o) {
    tbody.innerHTML +=
      "<tr><td class='fw-semibold'>" +
      o.orderNumber +
      "</td><td class='small'>" +
      formatDate(o.createdAt) +
      "</td><td class='small'>" +
      orderStatusLabel(o.status) +
      "</td><td class='small'>" +
      (o.paymentStatus || "unpaid") +
      "</td><td class='text-end fw-semibold'>" +
      formatMoney(o.amount) +
      "</td></tr>";
  });
}

function updateBlockButtons(customer) {
  const blockBtn = document.getElementById("btnBlockCustomer");
  const unblockBtn = document.getElementById("btnUnblockCustomer");

  if (customer.isBlocked) {
    blockBtn.classList.add("d-none");
    unblockBtn.classList.remove("d-none");
  } else {
    blockBtn.classList.remove("d-none");
    unblockBtn.classList.add("d-none");
  }
}

function renderCustomerModal(customer) {
  currentCustomer = customer;

  document.getElementById("modalCustomerName").textContent = customer.name;
  document.getElementById("modalCustomerEmail").textContent = customer.email;
  document.getElementById("modalCustomerStatus").innerHTML = customerStatusBadge(customer.isBlocked);
  document.getElementById("modalCustomerPhone").textContent = customer.phone || "—";
  document.getElementById("modalCustomerAddress").textContent = customer.address || "—";
  document.getElementById("modalCustomerSince").textContent = formatDate(customer.createdAt);
  document.getElementById("modalCustomerOrderCount").textContent = String(customer.orderCount);

  renderPurchaseHistory(customer.orders || []);
  updateBlockButtons(customer);
}

async function openCustomerModal(customerId) {
  const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById("customerDetailModal"));
  document.getElementById("modalOrdersBody").innerHTML =
    '<tr><td colspan="5" class="text-muted small">Loading…</td></tr>';
  modal.show();

  try {
    const data = await apiGet("/customers/" + customerId);
    renderCustomerModal(data.customer);
  } catch (err) {
    showToast(err.message || "Could not load customer", "error");
  }
}

async function setCustomerBlocked(blocked) {
  if (!currentCustomer) return;
  const customerId = currentCustomer.id || currentCustomer._id;

  const action = blocked ? "block" : "unblock";
  if (!confirmAction("Are you sure you want to " + action + " " + currentCustomer.name + "?")) {
    return;
  }

  const data = await apiPatch("/customers/" + customerId + "/block", { blocked: blocked });
  if (!data) return;

  showToast(data.message, "success");
  await openCustomerModal(customerId);
  await loadCustomers();
}

async function loadCustomers() {
  const q = document.getElementById("searchCustomers").value.trim();
  const blocked = document.getElementById("filterBlocked").value;

  let path = "/customers?limit=200";
  if (q) path += "&q=" + encodeURIComponent(q);
  if (blocked) path += "&blocked=" + encodeURIComponent(blocked);

  const data = await apiGet(path);
  renderCustomersTable(data.customers || []);
}

document.addEventListener("DOMContentLoaded", function () {
  setupAdminPage();

  document.getElementById("searchCustomers").addEventListener("input", function () {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function () {
      loadCustomers().catch(showError);
    }, 300);
  });

  document.getElementById("filterBlocked").addEventListener("change", function () {
    loadCustomers().catch(showError);
  });

  document.getElementById("btnBlockCustomer").addEventListener("click", function () {
    setCustomerBlocked(true).catch(showError);
  });

  document.getElementById("btnUnblockCustomer").addEventListener("click", function () {
    setCustomerBlocked(false).catch(showError);
  });

  loadCustomers().catch(function (err) {
    document.getElementById("customersTableBody").innerHTML =
      '<tr><td colspan="7" class="text-danger">' + err.message + "</td></tr>";
  });
});
