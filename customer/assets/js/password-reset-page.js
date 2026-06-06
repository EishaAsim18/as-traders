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
          let msg = data.message || "Check your email for the reset link.";
          if (data.emailConfigured === false) {
            msg +=
              " Email is not configured on the server yet — contact A & S Traders if you do not receive a message.";
          }
          showAlert("forgotAlert", msg, "success");
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
