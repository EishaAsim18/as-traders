function statusBadgeClass(status) {
  if (status === "delivered") return "text-bg-success";
  if (status === "shipped") return "text-bg-warning";
  if (status === "confirmed") return "text-bg-info";
  if (status === "cancelled") return "text-bg-danger";
  return "text-bg-secondary";
}

function buildTimeline(status, createdAt) {
  const date = new Date(createdAt).toLocaleDateString("en-PK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const steps = [
    { key: "pending", label: "Order received", date: date },
    { key: "confirmed", label: "Order confirmed", date: "—" },
    { key: "shipped", label: "Out for delivery", date: "—" },
    { key: "delivered", label: "Delivered", date: "—" },
  ];

  if (status === "cancelled") {
    return (
      '<div class="timeline-item active"><div class="timeline-dot"></div>' +
      '<div class="small text-muted">Cancelled</div><div class="fw-semibold">This order was cancelled</div></div>'
    );
  }

  const order = ["pending", "confirmed", "shipped", "delivered"];
  const currentIndex = Math.max(order.indexOf(status), 0);

  return steps
    .map(function (step, i) {
      let cls = "timeline-item";
      if (i < currentIndex) cls += " done";
      else if (i === currentIndex) cls += " active";

      return (
        '<div class="' +
        cls +
        '"><div class="timeline-dot"></div><div class="small text-muted">' +
        (i <= currentIndex ? date : "Pending") +
        '</div><div class="fw-semibold">' +
        step.label +
        "</div></div>"
      );
    })
    .join("");
}

function showOrder(order) {
  hideProofGate();
  document.getElementById("trackResults").classList.remove("d-none");
  document.getElementById("trackOrderNumber").textContent = order.orderNumber;
  document.getElementById("trackStatusBadge").textContent = order.statusLabel;
  document.getElementById("trackStatusBadge").className =
    "badge rounded-pill " + statusBadgeClass(order.status);
  document.getElementById("trackCustomer").textContent = order.customerName;
  document.getElementById("trackPhone").textContent = order.customerPhone || "—";
  document.getElementById("trackAddress").textContent = order.deliveryAddress || "—";
  document.getElementById("trackAmount").textContent = formatMoney(order.amount);
  const payEl = document.getElementById("trackPaymentMethod");
  if (payEl) {
    payEl.textContent = order.paymentMethodLabel || order.paymentMethod || "—";
  }

  const payBox = document.getElementById("trackPaymentInfo");
  if (payBox) {
    if (order.paymentMethod === "cod") {
      payBox.innerHTML =
        '<p class="small text-muted mb-0">You chose <strong>cash on delivery</strong>. Pay the driver when your order arrives.</p>';
    } else if (typeof mountPaymentInfo === "function") {
      mountPaymentInfo("#trackPaymentInfo", "compact");
    }
  }

  document.getElementById("trackTimeline").innerHTML = buildTimeline(
    order.status,
    order.createdAt
  );

  const items = order.items || [];
  document.getElementById("trackItemsSummary").textContent =
    items.length ? items.length + " line(s)" : "No line items (legacy order)";

  const list = document.getElementById("trackItemsList");
  list.innerHTML = "";
  items.forEach(function (item) {
    const li = document.createElement("li");
    li.className = "list-group-item d-flex justify-content-between align-items-center";
    li.innerHTML =
      "<div><div class='fw-semibold'>" +
      item.name +
      "</div><div class='small text-muted'>" +
      (item.sku || "") +
      " × " +
      item.quantity +
      "</div></div><span class='fw-semibold'>" +
      formatMoney(item.lineTotal) +
      "</span>";
    list.appendChild(li);
  });
}

function hideProofGate() {
  const gate = document.getElementById("trackProofGate");
  if (gate) gate.classList.add("d-none");
}

function showProofGate(orderNumber, paymentMethodLabel) {
  document.getElementById("trackResults").classList.add("d-none");
  const gate = document.getElementById("trackProofGate");
  if (!gate) return;

  gate.classList.remove("d-none");
  document.getElementById("trackProofGateOrder").textContent = orderNumber;
  const methodEl = document.getElementById("trackProofGateMethod");
  if (methodEl) {
    methodEl.textContent = paymentMethodLabel ? " · " + paymentMethodLabel : "";
  }

  const phoneInput = document.getElementById("trackProofPhone4");
  if (phoneInput && !phoneInput.value.trim()) {
    const saved = sessionStorage.getItem("asLastCheckoutPhone");
    if (saved) phoneInput.value = saved;
  }

  const payBox = document.getElementById("trackProofPaymentInfo");
  if (payBox && typeof mountPaymentInfo === "function") {
    mountPaymentInfo("#trackProofPaymentInfo", "compact");
  }

  const msgEl = document.getElementById("trackProofMsg");
  if (msgEl) msgEl.classList.add("d-none");
}

async function uploadTrackPaymentProof(orderNumber) {
  const fileInput = document.getElementById("trackProofFile");
  const phoneInput = document.getElementById("trackProofPhone4");
  const msgEl = document.getElementById("trackProofMsg");
  const btn = document.getElementById("trackProofUploadBtn");

  const file = fileInput && fileInput.files[0];
  const phoneLast4 = phoneInput ? phoneInput.value.trim() : "";

  if (!/^\d{4}$/.test(phoneLast4)) {
    msgEl.textContent = "Enter the last 4 digits of your mobile number";
    msgEl.className = "small mt-2 text-danger";
    msgEl.classList.remove("d-none");
    return false;
  }

  if (!file) {
    msgEl.textContent = "Choose a screenshot image first";
    msgEl.className = "small mt-2 text-danger";
    msgEl.classList.remove("d-none");
    return false;
  }

  btn.disabled = true;
  btn.textContent = "Uploading…";
  msgEl.classList.add("d-none");

  try {
    const dataUrl = await readImageFileAsDataUrl(file);
    await publicPost("/orders/payment-proof", {
      orderNumber: orderNumber.trim(),
      phoneLast4: phoneLast4,
      dataUrl: dataUrl,
    });

    sessionStorage.setItem("asLastCheckoutPhone", phoneLast4);
    fileInput.value = "";
    msgEl.textContent = "Screenshot uploaded. Loading your order…";
    msgEl.className = "small mt-2 text-success";
    msgEl.classList.remove("d-none");
    return true;
  } catch (err) {
    msgEl.textContent = err.message || "Upload failed";
    msgEl.className = "small mt-2 text-danger";
    msgEl.classList.remove("d-none");
    return false;
  } finally {
    btn.disabled = false;
    btn.textContent = "Upload & track order";
  }
}

function validateTrackOrderId(value) {
  const id = (value || "").trim();
  if (!id) return "Order ID is required";
  if (!/^CR-\d{4}-\d{4,6}$/i.test(id)) {
    return "Use format CR-2026-10492";
  }
  return "";
}

function validateTrackEmail(value) {
  const email = (value || "").trim();
  if (!email) return "Enter the email you used at checkout";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid email address";
  return "";
}

function initTrackFormForSession() {
  const guestWrap = document.getElementById("trackGuestEmailWrap");
  const emailInput = document.getElementById("trackEmail");
  if (!guestWrap || !emailInput) return;

  const signedIn = typeof getCustomerToken === "function" && !!getCustomerToken();
  if (signedIn) {
    guestWrap.classList.add("d-none");
    emailInput.removeAttribute("required");
  } else {
    guestWrap.classList.remove("d-none");
    emailInput.setAttribute("required", "required");
    const user = typeof getCustomerUser === "function" ? getCustomerUser() : null;
    if (user && user.email) emailInput.value = user.email;
  }
}

async function trackOrder(orderNumber) {
  const errEl = document.getElementById("trackError");
  const btn = document.getElementById("trackBtn");
  const input = document.getElementById("orderId");
  const emailInput = document.getElementById("trackEmail");

  const idError = validateTrackOrderId(orderNumber);
  if (idError) {
    input.classList.add("is-invalid");
    errEl.textContent = idError;
    errEl.classList.remove("d-none");
    return;
  }
  input.classList.remove("is-invalid");

  const query = {};
  const signedIn = typeof getCustomerToken === "function" && !!getCustomerToken();
  if (!signedIn) {
    const emailError = validateTrackEmail(emailInput ? emailInput.value : "");
    if (emailError) {
      if (emailInput) emailInput.classList.add("is-invalid");
      errEl.textContent = emailError;
      errEl.classList.remove("d-none");
      return;
    }
    if (emailInput) emailInput.classList.remove("is-invalid");
    query.email = emailInput.value.trim().toLowerCase();
  }

  errEl.classList.add("d-none");
  hideProofGate();
  document.getElementById("trackResults").classList.add("d-none");
  btn.disabled = true;
  btn.textContent = "Searching…";

  try {
    const data = await publicGet(
      "/orders/track/" + encodeURIComponent(orderNumber.trim()),
      query
    );
    showOrder(data.order);
  } catch (err) {
    document.getElementById("trackResults").classList.add("d-none");
    if (err.requiresPaymentProof) {
      showProofGate(
        err.orderNumber || orderNumber.trim(),
        err.paymentMethodLabel || ""
      );
      errEl.classList.add("d-none");
      return;
    }
    errEl.textContent = err.message || "Could not load this order";
    errEl.classList.remove("d-none");
  } finally {
    btn.disabled = false;
    btn.textContent = "Track";
  }
}

initTrackFormForSession();

const trackProofBtn = document.getElementById("trackProofUploadBtn");
if (trackProofBtn) {
  trackProofBtn.addEventListener("click", async function () {
    const orderNumber = document.getElementById("orderId").value.trim();
    const ok = await uploadTrackPaymentProof(orderNumber);
    if (ok) trackOrder(orderNumber);
  });
}

document.getElementById("trackForm").addEventListener("submit", function (e) {
  e.preventDefault();
  trackOrder(document.getElementById("orderId").value);
});

const params = new URLSearchParams(window.location.search);
const fromUrl = params.get("order") || getLastOrderNumber();
if (fromUrl) {
  document.getElementById("orderId").value = fromUrl;
  trackOrder(fromUrl);
}
