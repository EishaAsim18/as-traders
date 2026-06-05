import { useState } from "react";
import { getProducts, getStats, getToken, login } from "./api.js";

export default function App() {
  const [loggedIn, setLoggedIn] = useState(!!getToken());
  const [email, setEmail] = useState("admin@astraders.pk");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [products, setProducts] = useState([]);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      setLoggedIn(true);
      await loadDashboard();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadDashboard() {
    setLoading(true);
    try {
      const [s, p] = await Promise.all([getStats(), getProducts()]);
      setStats(s);
      setProducts(p);
    } catch (err) {
      setError(err.message);
      localStorage.removeItem("adminToken");
      setLoggedIn(false);
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("adminToken");
    setLoggedIn(false);
    setStats(null);
    setProducts([]);
  }

  if (!loggedIn) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <h1 style={{ margin: 0 }}>A & S Traders</h1>
          <p style={{ color: "#666" }}>React admin (simple)</p>
          <form onSubmit={handleLogin}>
            <label style={styles.label}>Email</label>
            <input
              style={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <label style={styles.label}>Password</label>
            <input
              type="password"
              style={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && <p style={{ color: "crimson" }}>{error}</p>}
            <button style={styles.button} disabled={loading}>
              {loading ? "..." : "Log in"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={{ margin: 0 }}>Dashboard</h1>
        <button style={styles.linkBtn} onClick={logout}>
          Log out
        </button>
      </header>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: "crimson" }}>{error}</p>}

      {stats && (
        <div style={styles.grid}>
          <Stat label="Today sales" value={"Rs " + stats.todaySales.toLocaleString()} />
          <Stat label="Open invoices" value={stats.openInvoiceCount} />
          <Stat label="Low stock" value={stats.lowStockCount} />
          <Stat label="SKUs" value={stats.totalSkus} />
        </div>
      )}

      <h2>Products</h2>
      <table style={styles.table}>
        <thead>
          <tr>
            <th>SKU</th>
            <th>Name</th>
            <th>Stock</th>
            <th>Price</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p._id}>
              <td>{p.sku}</td>
              <td>{p.name}</td>
              <td style={{ color: p.isLowStock ? "crimson" : "inherit" }}>
                {p.stock}
              </td>
              <td>Rs {p.price.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div style={styles.stat}>
      <div style={{ fontSize: 12, color: "#666" }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 600 }}>{value}</div>
    </div>
  );
}

const styles = {
  page: { fontFamily: "system-ui, sans-serif", padding: 24, maxWidth: 900, margin: "0 auto" },
  card: { background: "#fff", padding: 24, borderRadius: 12, boxShadow: "0 2px 12px rgba(0,0,0,.08)" },
  label: { display: "block", marginTop: 12, fontSize: 14 },
  input: { width: "100%", padding: 10, marginTop: 4, boxSizing: "border-box", borderRadius: 8, border: "1px solid #ccc" },
  button: { marginTop: 16, width: "100%", padding: 12, borderRadius: 8, border: "none", background: "#1a5f4a", color: "#fff", cursor: "pointer" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  linkBtn: { background: "none", border: "none", color: "#1a5f4a", cursor: "pointer", textDecoration: "underline" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginBottom: 24 },
  stat: { background: "#f4f7f6", padding: 16, borderRadius: 10 },
  table: { width: "100%", borderCollapse: "collapse", background: "#fff" },
};
