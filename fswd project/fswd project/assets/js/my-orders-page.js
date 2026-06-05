function statusBadgeClass(status) {
  if (status === "delivered") return "text-bg-success";
  if (status === "shipped") return "text-bg-warning";
  if (status === "confirmed") return "text-bg-info";
  if (status === "cancelled") return "text-bg-danger";
  return "text-bg-secondary";
}

function formatOrderDate(iso) {
  return new Date(iso).toLocaleDateString("en-PK", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function renderOrders(orders) {
  const loading = document.getElementById("ordersLoading");
  const empty = document.getElementById("ordersEmpty");
  const list = document.getElementById("ordersList");
  const countEl = document.getElementById("ordersCount");

  if (loading) loading.classList.add("d-none");

  if (!orders.length) {
    if (empty) empty.classList.remove("d-none");
    if (list) list.innerHTML = "";
    if (countEl) countEl.textContent = "0 orders";
    return;
  }

  if (empty) empty.classList.add("d-none");
  if (countEl) {
    countEl.textContent = orders.length + (orders.length === 1 ? " order" : " orders");
  }

  list.innerHTML = orders
    .map(function (order) {
      const trackUrl =
        "track-order.html?order=" + encodeURIComponent(order.orderNumber);
      const itemsPreview = (order.items || [])
        .slice(0, 2)
        .map(function (item) {
          return (
            (item.name || "Item") +
            " × " +
            (item.quantity || 1)
          );
        })
        .join(" · ");
      const more =
        order.itemCount > 2
          ? " +" + (order.itemCount - 2) + " more"
          : "";

      return (
        '<article class="my-order-card border rounded-4 p-4 bg-white mb-3">' +
        '<div class="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">' +
        '<div><div class="small text-muted">Order</div>' +
        '<div class="fw-bold fs-5">' +
        order.orderNumber +
        "</div></div>" +
        '<span class="badge rounded-pill ' +
        statusBadgeClass(order.status) +
        '">' +
        order.statusLabel +
        "</span></div>" +
        '<div class="small text-muted mb-2">' +
        formatOrderDate(order.createdAt) +
        "</div>" +
        (itemsPreview
          ? '<p class="small mb-2 mb-md-3">' + itemsPreview + more + "</p>"
          : "") +
        '<div class="d-flex flex-wrap justify-content-between align-items-center gap-2">' +
        '<div><span class="small text-muted d-block">Total</span>' +
        '<span class="fw-bold">' +
        formatMoney(order.amount) +
        "</span>" +
        (order.paymentMethodLabel
          ? '<span class="small text-muted ms-2">· ' +
            order.paymentMethodLabel +
            "</span>"
          : "") +
        "</div>" +
        '<a href="' +
        trackUrl +
        '" class="btn btn-accent btn-sm">View &amp; track</a>' +
        "</div></article>"
      );
    })
    .join("");
}

async function loadMyOrders() {
  const errEl = document.getElementById("ordersError");
  const loading = document.getElementById("ordersLoading");

  if (errEl) errEl.classList.add("d-none");
  if (loading) loading.classList.remove("d-none");

  try {
    const data = await customerGet("/customers/me/orders");
    renderOrders(data.orders || []);
  } catch (err) {
    if (loading) loading.classList.add("d-none");
    if (errEl) {
      errEl.textContent = err.message || "Could not load orders";
      errEl.classList.remove("d-none");
    }
  }
}

document.addEventListener("DOMContentLoaded", function () {
  if (!getCustomerToken()) {
    window.location.href = "login.html?next=my-orders.html";
    return;
  }

  const user = getCustomerUser();
  const greet = document.getElementById("ordersGreeting");
  if (greet && user && user.firstName) {
    greet.textContent = "Hi " + user.firstName + " — here are your orders with A & S Traders.";
  }

  loadMyOrders();
});
