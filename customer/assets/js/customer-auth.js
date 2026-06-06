(function () {
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const NAME_RE = /^[a-zA-Z\s.'-]{2,40}$/;
  const PASSWORD_SPECIAL_RE = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/;

  function validatePasswordRules(password, input) {
    if (!password) {
      setFieldError(input, "Password is required");
      return false;
    }
    if (password.length < 8) {
      setFieldError(input, "At least 8 characters");
      return false;
    }
    if (password.length > 72) {
      setFieldError(input, "Password is too long");
      return false;
    }
    if (!PASSWORD_SPECIAL_RE.test(password)) {
      setFieldError(input, "Include at least one special character (!@#$…)");
      return false;
    }
    return true;
  }

  function trim(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function setFieldError(input, message) {
    if (!input) return;
    input.classList.add("is-invalid");
    input.classList.remove("is-valid");
    let fb = input.parentElement.querySelector(".invalid-feedback");
    if (!fb) {
      fb = document.createElement("div");
      fb.className = "invalid-feedback";
      input.parentElement.appendChild(fb);
    }
    fb.textContent = message;
  }

  function setFieldValid(input) {
    if (!input) return;
    input.classList.remove("is-invalid");
    input.classList.add("is-valid");
    const fb = input.parentElement.querySelector(".invalid-feedback");
    if (fb) fb.textContent = "";
  }

  function clearFieldError(input) {
    if (!input) return;
    input.classList.remove("is-invalid", "is-valid");
    const fb = input.parentElement.querySelector(".invalid-feedback");
    if (fb) fb.textContent = "";
  }

  function clearFormErrors(form) {
    form.querySelectorAll(".is-invalid, .is-valid").forEach(function (el) {
      el.classList.remove("is-invalid", "is-valid");
    });
    form.querySelectorAll(".invalid-feedback").forEach(function (el) {
      el.textContent = "";
    });
    const alert = document.getElementById("authFormAlert");
    if (alert) {
      alert.classList.add("d-none");
      alert.textContent = "";
    }
  }

  function showFormAlert(message, type) {
    const alert = document.getElementById("authFormAlert");
    if (!alert) return;
    alert.className = "alert alert-" + (type || "danger") + " small";
    alert.textContent = message;
    alert.classList.remove("d-none");
  }

  function applyServerErrors(errors) {
    (errors || []).forEach(function (err) {
      const map = {
        firstName: "firstName",
        lastName: "lastName",
        email: "emailReg",
        phone: "phone",
        password: "passReg",
        confirmPassword: "passReg2",
        acceptTerms: "terms",
      };
      if (err.field === "email" && document.getElementById("emailIn")) {
        setFieldError(document.getElementById("emailIn"), err.message);
        setFieldError(document.getElementById("emailReg"), err.message);
      } else if (err.field === "password" && document.getElementById("passIn")) {
        setFieldError(document.getElementById("passIn"), err.message);
      } else {
        const id = map[err.field];
        if (id) setFieldError(document.getElementById(id), err.message);
      }
    });
  }

  function validateLoginEmail(input, showValid) {
    const email = trim(input.value).toLowerCase();
    if (!email) {
      setFieldError(input, "Email is required");
      return false;
    }
    if (!EMAIL_RE.test(email) || email.length > 120) {
      setFieldError(input, "Enter a valid email address");
      return false;
    }
    if (showValid) setFieldValid(input);
    else clearFieldError(input);
    return true;
  }

  function validateLoginPassword(input, showValid) {
    const password = input.value;
    if (!password) {
      setFieldError(input, "Password is required");
      return false;
    }
    if (password.length > 72) {
      setFieldError(input, "Password is too long");
      return false;
    }
    if (showValid) setFieldValid(input);
    else clearFieldError(input);
    return true;
  }

  function validateLoginForm() {
    const emailEl = document.getElementById("emailIn");
    const passEl = document.getElementById("passIn");
    const okEmail = validateLoginEmail(emailEl, true);
    const okPass = validateLoginPassword(passEl, true);
    return okEmail && okPass;
  }

  function validateRegisterField(input) {
    if (!input || !input.id) return true;

    switch (input.id) {
      case "firstName": {
        const v = trim(input.value);
        if (!v) {
          setFieldError(input, "First name is required");
          return false;
        }
        if (!NAME_RE.test(v)) {
          setFieldError(input, "Use 2–40 letters only");
          return false;
        }
        setFieldValid(input);
        return true;
      }
      case "lastName": {
        const v = trim(input.value);
        if (!v) {
          setFieldError(input, "Last name is required");
          return false;
        }
        if (!NAME_RE.test(v)) {
          setFieldError(input, "Use 2–40 letters only");
          return false;
        }
        setFieldValid(input);
        return true;
      }
      case "emailReg": {
        const email = trim(input.value).toLowerCase();
        if (!email) {
          setFieldError(input, "Email is required");
          return false;
        }
        if (!EMAIL_RE.test(email) || email.length > 120) {
          setFieldError(input, "Enter a valid email address");
          return false;
        }
        setFieldValid(input);
        return true;
      }
      case "phone": {
        const check = validatePkPhone(input.value, false);
        if (!trim(input.value)) {
          clearFieldError(input);
          return true;
        }
        if (!check.ok) {
          setFieldError(input, check.message);
          return false;
        }
        setFieldValid(input);
        return true;
      }
      case "passReg": {
        const password = input.value;
        if (!validatePasswordRules(password, input)) {
          return false;
        }
        setFieldValid(input);
        const confirm = document.getElementById("passReg2");
        if (confirm && confirm.value) validateRegisterField(confirm);
        return true;
      }
      case "passReg2": {
        const pass = document.getElementById("passReg");
        if (input.value !== (pass ? pass.value : "")) {
          setFieldError(input, "Passwords do not match");
          return false;
        }
        if (!input.value) {
          setFieldError(input, "Confirm your password");
          return false;
        }
        setFieldValid(input);
        return true;
      }
      case "terms": {
        if (!input.checked) {
          setFieldError(input, "You must accept the terms");
          return false;
        }
        clearFieldError(input);
        return true;
      }
      default:
        return true;
    }
  }

  function validateRegisterForm() {
    const ids = ["firstName", "lastName", "emailReg", "phone", "passReg", "passReg2", "terms"];
    let ok = true;
    ids.forEach(function (id) {
      const el = document.getElementById(id);
      if (el && !validateRegisterField(el)) ok = false;
    });
    return ok;
  }

  function wireLiveValidation(form, fieldValidators) {
    if (!form) return;
    Object.keys(fieldValidators).forEach(function (id) {
      const input = document.getElementById(id);
      if (!input) return;
      const validate = fieldValidators[id];
      input.addEventListener("blur", function () {
        if (trim(input.value) || input.required || input.type === "checkbox") {
          validate(input, true);
        }
      });
      input.addEventListener("input", function () {
        if (input.classList.contains("is-invalid")) {
          validate(input, true);
        }
      });
    });
  }

  function setSubmitLoading(btn, loading) {
    if (!btn) return;
    btn.disabled = loading;
    btn.dataset.originalText = btn.dataset.originalText || btn.textContent;
    btn.textContent = loading ? "Please wait…" : btn.dataset.originalText;
  }

  function redirectAfterLogin() {
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next");
    if (next) {
      let target = next;
      if (target.startsWith("/customer/")) {
        target = target.replace(/^\/customer\//, "");
      }
      target = target.replace(/^\/+/, "").replace(/\.\./g, "");
      if (target && !target.includes("://")) {
        window.location.href = target;
        return;
      }
    }
    window.location.href = "index.html?welcome=1";
  }

  function switchToLoginTab(email) {
    const loginTabBtn = document.getElementById("login-tab");
    if (loginTabBtn && typeof bootstrap !== "undefined") {
      bootstrap.Tab.getOrCreateInstance(loginTabBtn).show();
    }
    const emailIn = document.getElementById("emailIn");
    if (emailIn && email) {
      emailIn.value = email;
      validateLoginEmail(emailIn, true);
    }
    const passIn = document.getElementById("passIn");
    if (passIn) passIn.focus();
  }

  function showLoggedInPanel(user) {
    const panel = document.getElementById("loggedInPanel");
    const formsWrap = document.getElementById("authFormsWrap");
    const tabs = document.getElementById("authTabs");
    if (!panel || !formsWrap) return;

    document.getElementById("loggedInName").textContent = user.fullName || user.firstName;
    document.getElementById("loggedInEmail").textContent = user.email;
    formsWrap.classList.add("d-none");
    if (tabs) tabs.classList.add("d-none");
    panel.classList.remove("d-none");
  }

  async function handleLogin(event) {
    event.preventDefault();
    const form = event.target;
    clearFormErrors(form);
    if (!validateLoginForm()) return;

    if (typeof window.publicPost !== "function") {
      if (typeof showCustomerAlert === "function") {
        showCustomerAlert("Registration system is not ready. Please refresh the page.", "danger");
      } else if (typeof showFormAlert === "function") {
        showFormAlert("Registration system is not ready. Please refresh the page.", "danger");
      } else if (typeof showToast === "function") {
        showToast("Registration system is not ready. Please refresh the page.", "danger");
      } else {
        alert("Registration system is not ready. Please refresh the page.");
      }
      console.error("window.publicPost missing. Check customer-common.js loading.");
      return;
    }

    const btn = form.querySelector('button[type="submit"]');
    setSubmitLoading(btn, true);

    try {
      const data = await window.publicPost("/customers/login", {
        email: trim(document.getElementById("emailIn").value).toLowerCase(),
        password: document.getElementById("passIn").value,
      });

      saveCustomerSession(data.token, data.customer);
      showToast(data.message || "Login successful", "success");
      setTimeout(redirectAfterLogin, 600);
    } catch (err) {
      showFormAlert(err.message || "Could not sign in");
      applyServerErrors(err.errors);
    } finally {
      setSubmitLoading(btn, false);
    }
  }

  async function handleRegister(event) {
    event.preventDefault();
    const form = event.target;
    clearFormErrors(form);
    if (!validateRegisterForm()) return;

    if (typeof window.publicPost !== "function") {
      if (typeof showCustomerAlert === "function") {
        showCustomerAlert("Registration system is not ready. Please refresh the page.", "danger");
      } else if (typeof showFormAlert === "function") {
        showFormAlert("Registration system is not ready. Please refresh the page.", "danger");
      } else if (typeof showToast === "function") {
        showToast("Registration system is not ready. Please refresh the page.", "danger");
      } else {
        alert("Registration system is not ready. Please refresh the page.");
      }
      console.error("window.publicPost missing. Check customer-common.js loading.");
      return;
    }

    const btn = form.querySelector('button[type="submit"]');
    setSubmitLoading(btn, true);

    try {
      const registeredEmail = trim(document.getElementById("emailReg").value).toLowerCase();

      await window.publicPost("/customers/register", {
        firstName: trim(document.getElementById("firstName").value),
        lastName: trim(document.getElementById("lastName").value),
        email: registeredEmail,
        phone: normalizePkPhone(trim(document.getElementById("phone").value)),
        password: document.getElementById("passReg").value,
        confirmPassword: document.getElementById("passReg2").value,
        acceptTerms: document.getElementById("terms").checked,
      });

      registerForm.reset();
      clearFormErrors(registerForm);
      showFormAlert("Account created. Please sign in with your email and password.", "success");
      showToast("Account created — sign in to continue", "success");
      switchToLoginTab(registeredEmail);
    } catch (err) {
      showFormAlert(err.message || "Could not create account");
      applyServerErrors(err.errors);
    } finally {
      setSubmitLoading(btn, false);
    }
  }

  function initAuthHeroImage() {
    const img = document.getElementById("authHeroImage");
    if (!img) return;

    const photoPath = "/assets/images/auth-showroom.jpg";
    const fallbackPath = "/assets/images/auth-showroom.svg";
    const resolved =
      typeof assetUrl === "function"
        ? assetUrl(photoPath) + "?v=1"
        : "../assets/images/auth-showroom.jpg?v=1";

    img.src = resolved;

    img.onerror = function () {
      if (img.dataset.fallback) {
        img.classList.add("d-none");
        return;
      }
      img.dataset.fallback = "1";
      const backend =
        typeof getBackendOrigin === "function"
          ? getBackendOrigin()
          : typeof API_BASE_URL !== "undefined"
            ? API_BASE_URL
            : "https://fswd-production.up.railway.app";
      const fallback =
        typeof assetUrl === "function"
          ? assetUrl(fallbackPath)
          : backend + fallbackPath;
      img.src = fallback;
    };
  }

  document.addEventListener("DOMContentLoaded", function () {
    initAuthHeroImage();

    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");
    if (loginForm) loginForm.addEventListener("submit", handleLogin);
    if (registerForm) registerForm.addEventListener("submit", handleRegister);

    wireLiveValidation(loginForm, {
      emailIn: validateLoginEmail,
      passIn: validateLoginPassword,
    });

    wireLiveValidation(registerForm, {
      firstName: validateRegisterField,
      lastName: validateRegisterField,
      emailReg: validateRegisterField,
      phone: validateRegisterField,
      passReg: validateRegisterField,
      passReg2: validateRegisterField,
      terms: validateRegisterField,
    });

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", function (e) {
        e.preventDefault();
        logoutCustomer();
      });
    }

    const user = getCustomerUser();
    if (user) {
      showLoggedInPanel(user);
    }

  });
})();
