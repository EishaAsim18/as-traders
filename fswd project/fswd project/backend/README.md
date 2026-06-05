# A & S Traders — Backend

Express + MongoDB API for the A & S Traders full-stack project.

**Full documentation** (features, API, flows, testing): see the main [README.md](../README.md) in the project root.

---

## Quick start

```bash
cd backend
npm install
copy .env.example .env    # Windows — use cp on macOS/Linux
npm run seed
npm start
```

| URL | Purpose |
|-----|---------|
| http://localhost:3000/customer/index.html | Customer shop |
| http://localhost:3000/admin/login.html | Admin panel |
| http://localhost:3000/api/health | API health check |

**Admin login:** `admin@astraders.pk` / `admin123` (from seed)

---

## Environment

Edit `.env`:

```env
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/as-traders
JWT_SECRET=change-this-to-a-long-random-string
ADMIN_EMAIL=admin@astraders.pk
ADMIN_PASSWORD=admin123
```

---

## What this server does

- Mounts REST routes under `/api/*`
- Serves static files: `/customer`, `/admin`, `/assets`, `/uploads`
- Connects to MongoDB via `db.js`
- Generates invoice PDFs with PDFKit

Entry point: `server.js`

---

## Useful scripts

| Command | Purpose |
|---------|---------|
| `npm start` | Production run |
| `npm run dev` | Dev with file watch |
| `npm run seed` | Demo data (clears existing demo collections) |
| `npm run update-images` | Fix product image URLs |
| `npm run migrate-pricing` | Product pricing migration |

See root README for the full script list and API reference.

---

## Optional React admin

```bash
cd react-admin
npm install
npm run dev
```

http://localhost:5173 — proxies to API on port 3000.  
The primary admin UI is the HTML panel in `/admin`.
