// Shared helpers for every admin page

function formatMoney(amount) {
  return "Rs. " + Number(amount).toLocaleString("en-PK");
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-PK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function setupAdminPage() {
  requireLogin();
  initAdminUI();

  document.querySelectorAll(".js-logout").forEach(function (btn) {
    btn.addEventListener("click", function (event) {
      event.preventDefault();
      logout();
    });
  });

  const greeting = document.getElementById("adminGreeting");
  if (greeting) {
    const name = localStorage.getItem("adminName") || "Asim";
    const hour = new Date().getHours();
    let part = "evening";
    if (hour < 12) part = "morning";
    else if (hour < 17) part = "afternoon";
    greeting.textContent = "Good " + part + ", " + name;
  }

  const dateEl = document.getElementById("todayDate");
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString("en-PK", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }
}
