# A & S Traders

### A Full-Stack E-Commerce & Shop Management System for Sanitary Ware & Fittings (Multan, Pakistan)

---

## Live Demo

**Customer site:** https://as-traders.vercel.app
**Admin panel:** https://as-traders-admin.vercel.app
**Backend API:** https://as-traders-production.up.railway.app/api/health

> Demo admin/customer credentials are not published here. Request access for evaluation, or run the project locally using the setup instructions below with your own `.env` values.

**GitHub repository:** https://github.com/EishaAsim18/as-traders
---

## Project Overview

A & S Traders is a full-stack web application built for a real sanitary-ware retail shop in Multan. It solves a common problem for small Pakistani businesses: customers want to browse products online and pay via **COD**, **bank transfer**, **JazzCash**, or **Easypaisa**, but the shop still needs a simple way to **manage inventory**, **confirm payments**, **generate invoices**, and **track deliveries**.

The system has three roles:

- **Customer** — browse shop, cart, checkout, upload payment screenshot, track orders, register/login
- **Admin (shop staff)** — inventory, orders, payment verification, invoices, walk-in billing, customer management
- **Delivery staff** — report COD cash collected via a simple public page

---

## Tech Stack

- **Frontend (Customer):** HTML5, CSS3, Bootstrap 5, Vanilla JavaScript
- **Frontend (Admin):** HTML5, CSS3, Bootstrap 5, Vanilla JavaScript
- **Backend:** Node.js, Express.js
- **Database:** MongoDB Atlas
- **Others:** JWT (admin + customer), bcryptjs, PDFKit (invoice PDFs), CORS, dotenv
- **Deployment:** Vercel (customer + admin frontends), Railway (backend API)

---

## Core Features & Logic

- **Online catalog & cart:** Product listing with brands, categories, sale pricing, stock, and localStorage cart synced with live prices from the API.
- **Multi-method checkout:** Customer selects COD, bank transfer, JazzCash, or Easypaisa; online orders include a fixed Rs. 1,200 delivery fee.
- **Payment proof workflow:** For prepaid orders, customer selects payment channel (JazzCash / Easypaisa / Bank + bank name), enters transaction ID and amount, and uploads a screenshot. Order tracking is blocked until proof is uploaded. Admin reviews screenshot and confirms payment.
- **Transaction ID validation:** Server and client validate TID format by payment method (10–12 digits for wallets; alphanumeric reference for bank) and reject duplicate TIDs.
- **Order lifecycle:** `pending → confirmed → shipped → delivered` (or `cancelled`); admin accepts/rejects orders and updates delivery status.
- **COD collection flow:** Delivery staff reports cash on `/customer/collect-cod.html`; admin confirms → order marked paid.
- **Invoicing & PDF:** Generate invoice from online order or create walk-in invoice in Billing; download PDF with PAID/UNPAID badge via PDFKit.
- **Role-based access:** Separate JWT auth for admin and customer; customers can only view their own orders when logged in; guest checkout supported with email + phone verification for tracking.
- **Admin dashboard:** Stats for orders, revenue, low stock, pending payments; inventory CRUD with image upload; registered + guest customer list.

---

## Localized Optimizations

- **Currency:** All prices displayed and stored in PKR (Rs.) with consistent formatting across shop, cart, checkout, invoices, and admin.
- **Pakistan mobile validation:** Checkout and auth validate numbers in `03XXXXXXXXX`, `+92`, and `92` formats.
- **Local payment workflows:** Bank account, IBAN, JazzCash, and Easypaisa details configurable from Admin → My Account; customers upload manual payment proof (screenshot) — common for Easypaisa/JazzCash/bank apps in Pakistan.
- **Delivery context:** Default city Multan; delivery notes and Rs. 1,200 online delivery charge reflect local shop operations.
- **Guest checkout:** Customers can order without an account; tracking uses order ID + checkout email + phone last 4 digits.

---

## Security Measures

- **Password hashing:** bcrypt used for admin and customer passwords before storing in MongoDB.
- **Authentication:** JWT tokens — admin routes protected by `requireAdmin` middleware; customer routes use `requireCustomer` / `optionalCustomer`.
- **Validation:** Server-side validation for products, orders, invoices, checkout, payment proof (TID, amount, image type/size), and auth fields.
- **Route guards:** Admin API rejects requests without a valid admin token; blocked customers cannot log in; track-order logic prevents users from viewing other customers' orders.
- **CORS:** Production origins (Vercel customer/admin + Railway) configured via environment variables.
- **File upload safety:** Payment proofs limited to JPG/PNG/WebP, max 5 MB, magic-byte check on server; product images validated on upload.
- **Secrets:** `JWT_SECRET`, `MONGODB_URI`, and admin credentials stored in `.env` (not committed to Git, not published in this README).

---

## Database Schema

Main MongoDB collections and relationships:

| Collection | Purpose | Key fields / links |
|---|---|---|
| **products** | Shop catalog | sku, name, price, discountPercent, finalPrice, stock, imageUrl |
| **customers** | Registered buyers | email (unique), password hash, phone, address, isBlocked |
| **orders** | Online & walk-in orders | orderNumber, customerId (optional), items[], amount, paymentMethod, status, paymentProofUrl, paymentProofTxnId |
| **invoices** | Billing documents | invoiceNumber, orderId (optional), items[], total, trade discount, status |
| **admins** | Dashboard users | email, password hash, paymentSettings (bank/wallet details) |

```
erDiagram
  CUSTOMER ||--o{ ORDER : places
  ORDER ||--o| INVOICE : generates
  ORDER {
    string orderNumber
    string paymentMethod
    string status
    string paymentProofUrl
  }
  PRODUCT {
    string sku
    number finalPrice
    number stock
  }
  CUSTOMER {
    string email
    boolean isBlocked
  }
  INVOICE {
    string invoiceNumber
    number total
    string status
  }
  ADMIN {
    string email
    object paymentSettings
  }
```

---

## Installation & Setup

1. **Clone the repo:**
   ```
   git clone https://github.com/salehakhuram/as-traders.git
   cd as-traders
   ```

2. **Install backend dependencies:**
   ```
   cd backend
   npm install
   ```

3. **Configure environment:**
   ```
   copy .env.example .env
   ```
   Edit `.env` and set at minimum:
   ```
   PORT=3000
   MONGODB_URI=your_mongodb_atlas_connection_string
   JWT_SECRET=your_long_random_secret
   ADMIN_EMAIL=your_admin_email
   ADMIN_PASSWORD=your_admin_password
   ```

4. **Seed demo data (optional):**
   ```
   npm run seed
   ```

5. **Start the server:**
   ```
   npm start
   ```
   > Open the app at **http://localhost:3000** — do not use VS Code Live Server. Customer and admin pages call `/api/*` on the same origin.

6. **Open in browser:**

   | Page | URL |
   |---|---|
   | Customer home | http://localhost:3000/customer/index.html |
   | Admin login | http://localhost:3000/admin/login.html |
   | API health | http://localhost:3000/api/health |

---

## My Role

I designed and built the backend (Node.js/Express, MongoDB schema, JWT authentication for admin and customer, order/invoice/payment logic, validation, PDF invoice generation) and handled deployment of the backend (Railway) and both frontends (Vercel), including environment configuration and CORS setup for the production domains.

---

## Team (BSCS Fall 24 — Section B)

| # | Name | Role |
|---|---|---|
| 1 | Saleha Khurram | Backend & API, Deployment |
| 2 | Eisha Asim | Figma Design + Complete Frontend + Admin Backend |
| 3 | Izzat Rehman | Customer frontend |
| 4 | Sadia Noor | Database design support |
| 5 | Rasba Mazhar | QA & integration |

**Course:** CS_301L — Full Stack Web Development
**Instructor:** M. Rashaf Jamil Khan

---

**A & S Traders** · Sanitary ware & fittings · Multan branch · FSWD Project 2026
