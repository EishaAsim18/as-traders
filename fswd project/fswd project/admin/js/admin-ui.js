// Simple UI helpers — toasts and confirmations (no extra libraries)

function initAdminUI() {
  if (document.getElementById("adminToastWrap")) return;

  const wrap = document.createElement("div");
  wrap.id = "adminToastWrap";
  wrap.className = "admin-toast-wrap";
  wrap.setAttribute("aria-live", "polite");
  document.body.appendChild(wrap);
}

function showToast(message, type) {
  initAdminUI();
  const wrap = document.getElementById("adminToastWrap");
  const toast = document.createElement("div");
  toast.className = "admin-toast admin-toast-" + (type || "success");
  toast.textContent = message;
  wrap.appendChild(toast);

  setTimeout(function () {
    toast.classList.add("hide");
    setTimeout(function () {
      toast.remove();
    }, 300);
  }, 3200);
}

function confirmAction(message) {
  return window.confirm(message);
}

function setButtonLoading(button, isLoading, loadingText) {
  if (!button) return;
  if (isLoading) {
    button.dataset.oldText = button.textContent;
    button.disabled = true;
    button.textContent = loadingText || "Please wait…";
  } else {
    button.disabled = false;
    button.textContent = button.dataset.oldText || button.textContent;
  }
}
