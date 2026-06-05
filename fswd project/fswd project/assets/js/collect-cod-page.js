document.getElementById("codReportForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const errEl = document.getElementById("codError");
  const okEl = document.getElementById("codSuccess");
  const btn = document.getElementById("codSubmitBtn");

  errEl.classList.add("d-none");
  okEl.classList.add("d-none");

  const orderNumber = document.getElementById("codOrderId").value.trim();
  const phoneLast4 = document.getElementById("codPhone4").value.trim();
  const note = document.getElementById("codNote").value.trim();

  if (!/^CR-\d{4}-\d{4,6}$/i.test(orderNumber)) {
    errEl.textContent = "Use order format CR-2026-10492";
    errEl.classList.remove("d-none");
    return;
  }

  if (!/^\d{4}$/.test(phoneLast4)) {
    errEl.textContent = "Enter exactly 4 digits from customer mobile";
    errEl.classList.remove("d-none");
    return;
  }

  btn.disabled = true;
  btn.textContent = "Sending…";

  try {
    const data = await publicPost("/orders/cod-cash-collected", {
      orderNumber: orderNumber,
      phoneLast4: phoneLast4,
      note: note,
    });

    okEl.textContent = data.message || "Shop notified. Thank you.";
    okEl.classList.remove("d-none");
    if (!data.alreadyReported && !data.alreadyPaid) {
      document.getElementById("codReportForm").reset();
    }
  } catch (err) {
    errEl.textContent = err.message || "Could not send report";
    errEl.classList.remove("d-none");
  } finally {
    btn.disabled = false;
    btn.textContent = "Cash collected — notify shop";
  }
});

const params = new URLSearchParams(window.location.search);
const presetOrder = params.get("order");
if (presetOrder) {
  document.getElementById("codOrderId").value = presetOrder;
}
