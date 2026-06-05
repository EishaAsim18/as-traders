// Admin account — profile, payment details, and password

function displayPhone(phone) {
  if (!phone) return "";
  if (phone.startsWith("+92")) return "0" + phone.slice(3);
  return phone;
}

function fillProfileForm(admin) {
  document.getElementById("profileName").value = admin.name || "";
  document.getElementById("profileEmail").value = admin.email || "";
  document.getElementById("profilePhone").value = displayPhone(admin.phone);
  document.getElementById("accountSince").textContent = formatDate(admin.createdAt);
  document.getElementById("accountUpdated").textContent = formatDate(admin.updatedAt);
}

function fillPaymentForm(settings) {
  const p = settings || {};
  document.getElementById("payBankName").value = p.bankName || "";
  document.getElementById("payAccountTitle").value = p.accountTitle || "";
  document.getElementById("payAccountNumber").value = p.accountNumber || "";
  document.getElementById("payIban").value = p.iban || "";
  document.getElementById("payJazzCash").value = p.jazzCash || "";
  document.getElementById("payEasypaisa").value = p.easypaisa || "";
  document.getElementById("payWalletTitle").value = p.walletTitle || "";
  document.getElementById("payTransferNote").value = p.transferNote || "";
  document.getElementById("payCodNote").value = p.codNote || "";
}

async function loadAccount() {
  const data = await apiGet("/auth/me");
  fillProfileForm(data.admin);
  fillPaymentForm(data.admin.paymentSettings);
  return data.admin;
}

document.getElementById("profileForm").addEventListener("submit", async function (e) {
  e.preventDefault();
  const errEl = document.getElementById("profileError");
  const btn = document.getElementById("btnSaveProfile");
  const phoneEl = document.getElementById("profilePhone");
  const phoneCheck = validatePkPhone(phoneEl ? phoneEl.value : "", false);

  errEl.classList.add("d-none");

  if (!phoneCheck.ok) {
    setPhoneFieldState(phoneEl, phoneCheck);
    errEl.textContent = phoneCheck.message;
    errEl.classList.remove("d-none");
    return;
  }

  setButtonLoading(btn, true, "Saving…");

  try {
    const data = await apiPatch("/auth/profile", {
      name: document.getElementById("profileName").value.trim(),
      email: document.getElementById("profileEmail").value.trim(),
      phone: phoneCheck.normalized,
    });
    saveAdmin(data.admin);
    fillProfileForm(data.admin);
    const greeting = document.getElementById("adminGreeting");
    if (greeting && data.admin.name) {
      const hour = new Date().getHours();
      let part = "evening";
      if (hour < 12) part = "morning";
      else if (hour < 17) part = "afternoon";
      greeting.textContent = "Good " + part + ", " + data.admin.name;
    }
    showToast(data.message || "Profile saved", "success");
  } catch (err) {
    errEl.textContent = err.message || "Could not save profile";
    errEl.classList.remove("d-none");
  } finally {
    setButtonLoading(btn, false);
  }
});

document.getElementById("paymentForm").addEventListener("submit", async function (e) {
  e.preventDefault();
  const errEl = document.getElementById("paymentError");
  const btn = document.getElementById("btnSavePayment");
  errEl.classList.add("d-none");
  setButtonLoading(btn, true, "Saving…");

  try {
    const data = await apiPatch("/auth/payment-settings", {
      bankName: document.getElementById("payBankName").value.trim(),
      accountTitle: document.getElementById("payAccountTitle").value.trim(),
      accountNumber: document.getElementById("payAccountNumber").value.trim(),
      iban: document.getElementById("payIban").value.trim(),
      jazzCash: document.getElementById("payJazzCash").value.trim(),
      easypaisa: document.getElementById("payEasypaisa").value.trim(),
      walletTitle: document.getElementById("payWalletTitle").value.trim(),
      transferNote: document.getElementById("payTransferNote").value.trim(),
      codNote: document.getElementById("payCodNote").value.trim(),
    });
    saveAdmin(data.admin);
    fillPaymentForm(data.admin.paymentSettings);
    showToast(data.message || "Payment details saved", "success");
  } catch (err) {
    errEl.textContent = err.message || "Could not save payment details";
    errEl.classList.remove("d-none");
  } finally {
    setButtonLoading(btn, false);
  }
});

document.getElementById("passwordForm").addEventListener("submit", async function (e) {
  e.preventDefault();
  const errEl = document.getElementById("passwordError");
  const btn = document.getElementById("btnSavePassword");
  errEl.classList.add("d-none");
  setButtonLoading(btn, true, "Updating…");

  try {
    const data = await apiPatch("/auth/password", {
      currentPassword: document.getElementById("currentPassword").value,
      newPassword: document.getElementById("newPassword").value,
      confirmPassword: document.getElementById("confirmPassword").value,
    });
    document.getElementById("passwordForm").reset();
    showToast(data.message || "Password updated", "success");
  } catch (err) {
    errEl.textContent = err.message || "Could not change password";
    errEl.classList.remove("d-none");
  } finally {
    setButtonLoading(btn, false);
  }
});

setupAdminPage();
loadAccount().catch(function (err) {
  showToast(err.message || "Could not load account", "error");
});
