const API = import.meta.env.DEV ? "/api" : "http://localhost:3000/api";

export function getToken() {
  return localStorage.getItem("adminToken");
}

export async function login(email, password) {
  const res = await fetch(API + "/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Login failed");
  localStorage.setItem("adminToken", data.token);
  return data;
}

export async function getProducts() {
  const res = await fetch(API + "/products", {
    headers: { Authorization: "Bearer " + getToken() },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to load products");
  return data.products;
}

export async function getStats() {
  const res = await fetch(API + "/dashboard/stats", {
    headers: { Authorization: "Bearer " + getToken() },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to load stats");
  return data;
}
