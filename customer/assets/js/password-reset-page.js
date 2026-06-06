(function () {
  const PASSWORD_SPECIAL_RE = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/;

  function showAlert(id, message, type) {
    const el = document.getElementById(id);
    if (!el) return;
    el.className = "alert alert-" + (type || "danger") + " small";
    el.textContent = message;
    el.classList.remove("d-none");
  }

  function validateResetPasswords(password, confirm) {
    if (!password || password.length < 8) {
      return "Password must be at least 8 characters";
    }
    if (password.length > 72) {
      return "Password is too long";
    }
    if (!PASSWORD_SPECIAL_RE.test(password)) {
      return "Include at least one special character (!@#$…)";
    }
    if (password !== confirm) {
      return "Passwords do not match";
    }
    return "";
  }

  function showResetLink(containerId, url) {
    const box = document.getElementById(containerId);
    if (!box || !url) return;
    box.className = "border rounded-3 p-3 bg-light mb-3";
    box.innerHTML =
      '<p class="small fw-semibold mb-2">Reset link</p>' +
      '<a href="' +
      url +
      '" class="btn btn-accent btn-sm">Open reset password page</a>' +
      '<p class="small text-muted mt-2 mb-0">Link expires in 1 hour. You can bookmark it until you finish.</p>';
    box.classList.remove("d-none");
  }

  document.addEventListener("DOMContentLoaded", function () {
    const forgotForm = document.getElementById("forgotForm");
    if (forgotForm) {
      forgotForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        const btn = document.getElementById("forgotBtn");
        const email = document.getElementById("forgotEmail").value.trim().toLowerCase();
        if (!email) {
          showAlert("forgotAlert", "Enter your email address", "danger");
          return;
        }

        btn.disabled = true;
        btn.textContent = "Sending…";

        try {
          const data = await publicPost("/customers/forgot-password", { email: email });
          showAlert("forgotAlert", data.message || "Check your email for the reset link.", "success");
          if (data.resetUrl) {
            showResetLink("forgotResetLink", data.resetUrl);
          } else if (data.emailConfigured === false) {
            showAlert(
              "forgotAlert",
              (data.message || "") +
                " If you have an account, contact A & S Traders — email sending is not set up yet.",
              "warning"
            );
          }
          forgotForm.classList.add("d-none");
        } catch (err) {
          showAlert("forgotAlert", err.message || "Could not send reset link", "danger");
        } finally {
          btn.disabled = false;
          btn.textContent = "Send reset link";
        }
      });
    }

    const resetForm = document.getElementById("resetForm");
    if (resetForm) {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token") || "";
      document.getElementById("resetToken").value = token;

      if (!token) {
        showAlert(
          "resetAlert",
          "Reset link is missing or invalid. Request a new link from the forgot password page.",
          "danger"
        );
        resetForm.classList.add("d-none");
      }

      resetForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        const btn = document.getElementById("resetBtn");
        const password = document.getElementById("resetPassword").value;
        const confirm = document.getElementById("resetPassword2").value;
        const resetToken = document.getElementById("resetToken").value;

        const errMsg = validateResetPasswords(password, confirm);
        if (errMsg) {
          showAlert("resetAlert", errMsg, "danger");
          return;
        }

        btn.disabled = true;
        btn.textContent = "Updating…";

        try {
          const data = await publicPost("/customers/reset-password", {
            token: resetToken,
            password: password,
            confirmPassword: confirm,
          });
          showAlert("resetAlert", data.message || "Password updated.", "success");
          resetForm.classList.add("d-none");
          setTimeout(function () {
            window.location.href = "login.html";
          }, 1200);
        } catch (err) {
          showAlert("resetAlert", err.message || "Could not reset password", "danger");
        } finally {
          btn.disabled = false;
          btn.textContent = "Update password";
        }
      });
    }
  });
})();
