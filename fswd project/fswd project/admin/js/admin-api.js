// Talk to the backend — uses same port as the page when served from Express
const API_BASE =
  window.location.protocol === "http:" || window.location.protocol === "https:"
    ? window.location.origin + "/api"
    : "http://localhost:3000/api";

function saveToken(token) {
  localStorage.setItem("adminToken", token);
}

function saveAdmin(admin) {
  if (!admin) return;
  if (admin.name) localStorage.setItem("adminName", admin.name);
  if (admin.email) localStorage.setItem("adminEmail", admin.email);
  if (admin.phone !== undefined) localStorage.setItem("adminPhone", admin.phone || "");
}

function getToken() {
  return localStorage.getItem("adminToken");
}

function clearToken() {
  localStorage.removeItem("adminToken");
  localStorage.removeItem("adminName");
  localStorage.removeItem("adminEmail");
  localStorage.removeItem("adminPhone");
}

// Sign out and go back to login page
function logout() {
  clearToken();
  window.location.href = "login.html";
}

// Redirect to login if there is no token
function requireLogin() {
  if (!getToken()) {
    window.location.href = "login.html";
  }
}

async function parseApiResponse(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (error) {
    if (text.trim().startsWith("<")) {
      throw new Error(
        "Server returned HTML instead of JSON. Restart the backend (npm start in backend/) and open admin at http://localhost:3000/admin/"
      );
    }
    throw new Error(text.slice(0, 120) || "Invalid server response");
  }
}

async function login(email, password) {
  const response = await fetch(API_BASE + "/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await parseApiResponse(response);

  if (!response.ok) {
    throw new Error(data.message || "Login failed");
  }

  saveToken(data.token);
  saveAdmin(data.admin);
  return data;
}

async function apiGet(path) {
  const response = await fetch(API_BASE + path, {
    headers: {
      Authorization: "Bearer " + getToken(),
    },
  });

  const data = await parseApiResponse(response);

  if (response.status === 401) {
    clearToken();
    window.location.href = "login.html";
    return;
  }

  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}

async function apiPatch(path, body) {
  const response = await fetch(API_BASE + path, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + getToken(),
    },
    body: JSON.stringify(body || {}),
  });

  const data = await parseApiResponse(response);

  if (response.status === 401) {
    clearToken();
    window.location.href = "login.html";
    return;
  }

  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}

async function apiPut(path, body) {
  const response = await fetch(API_BASE + path, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + getToken(),
    },
    body: JSON.stringify(body),
  });

  const data = await parseApiResponse(response);

  if (response.status === 401) {
    clearToken();
    window.location.href = "login.html";
    return;
  }

  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}

function catalogImageSrc(imageUrl) {
  if (!imageUrl) return "../assets/images/product-placeholder.svg";
  if (imageUrl.startsWith("/assets/")) return ".." + imageUrl;
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) return imageUrl;
  return imageUrl;
}

function fileToDataUrl(file) {
  return new Promise(function (resolve, reject) {
    const reader = new FileReader();
    reader.onload = function () {
      resolve(reader.result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function uploadProductImage(sku, file) {
  const dataUrl = await fileToDataUrl(file);
  return apiPost("/products/upload-image", { sku: sku, dataUrl: dataUrl });
}

async function apiPost(path, body) {
  const response = await fetch(API_BASE + path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + getToken(),
    },
    body: JSON.stringify(body),
  });

  const data = await parseApiResponse(response);

  if (response.status === 401) {
    clearToken();
    window.location.href = "login.html";
    return;
  }

  if (!response.ok) {
    const err = new Error(data.message || "Request failed");
    if (data.errors) err.errors = data.errors;
    throw err;
  }

  return data;
}

async function apiDelete(path) {
  const response = await fetch(API_BASE + path, {
    method: "DELETE",
    headers: {
      Authorization: "Bearer " + getToken(),
    },
  });

  const data = await parseApiResponse(response).catch(function () {
    return {};
  });

  if (response.status === 401) {
    clearToken();
    window.location.href = "login.html";
    return;
  }

  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}

// Save payment screenshot on an order (optional mark Paid)
async function uploadOrderPaymentProof(orderId, dataUrl, options) {
  const opts = options || {};
  const data = await apiPost("/orders/" + orderId + "/payment-proof", {
    dataUrl: dataUrl,
    markPaid: !!opts.markPaid,
    note: opts.note || "",
  });
  return data;
}

// Download PDF for an order's invoice (bill + delivery address)
async function downloadOrderInvoicePdf(orderId, fileName) {
  const response = await fetch(API_BASE + "/orders/" + orderId + "/invoice/pdf", {
    headers: {
      Authorization: "Bearer " + getToken(),
    },
  });

  if (response.status === 401) {
    clearToken();
    window.location.href = "login.html";
    return;
  }

  if (!response.ok) {
    const err = await parseApiResponse(response).catch(function () {
      return { message: "Could not download PDF" };
    });
    throw new Error(err.message || "Could not download PDF");
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName || "order-invoice.pdf";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

// Download invoice PDF (needs login token)
async function downloadInvoicePdf(invoiceId, fileName) {
  const response = await fetch(API_BASE + "/invoices/" + invoiceId + "/pdf", {
    headers: {
      Authorization: "Bearer " + getToken(),
    },
  });

  if (response.status === 401) {
    clearToken();
    window.location.href = "login.html";
    return;
  }

  if (!response.ok) {
    const err = await parseApiResponse(response).catch(function () {
      return { message: "Could not download PDF" };
    });
    throw new Error(err.message || "Could not download PDF");
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName || "invoice.pdf";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
