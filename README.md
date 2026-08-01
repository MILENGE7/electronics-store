# Electronics Store — Project Skeleton

A single-seller e-commerce web app. Two roles: **Customer** and **Admin** (the Admin
is also the vendor/business owner — there is no separate third-party vendor role).

## Structure

```
electronics-store/
├── backend/          Node.js + Express API, PostgreSQL via Prisma
│   ├── prisma/schema.prisma
│   └── src/
│       ├── config/db.js
│       ├── middleware/ (auth.js, errorHandler.js, upload.js)
│       ├── controllers/ (auth, product, order, review)
│       ├── routes/ (auth, product, order, review, upload)
│       ├── utils/ (jwt.js, mailer.js)
│       ├── uploads/          uploaded product images (dev-only local storage)
│       └── index.js
└── frontend/         React (Vite) SPA
    └── src/
        ├── api/ (client.js, stripe.js)
        ├── context/ (AuthContext, CartContext)
        ├── components/ (Navbar, ProtectedRoute, PaymentForm, ReviewForm)
        └── pages/ (Home, ProductDetail, Cart, Checkout, Orders, Login, Register,
                     admin/Dashboard, admin/Products, admin/Orders, admin/Security)
```

## Getting started

### 1. Backend

```bash
cd backend
cp .env.example .env      # fill in DATABASE_URL, JWT_SECRET, STRIPE_SECRET_KEY, SMTP_*
npm install
npx prisma migrate dev --name init
npm run dev                # http://localhost:4000
```

### 2. Frontend

```bash
cd frontend
cp .env.example .env         # set VITE_STRIPE_PUBLISHABLE_KEY (from your Stripe dashboard)
npm install
npm run dev                  # http://localhost:5173
```

The Vite dev server proxies `/api` requests to `http://localhost:4000` (see `vite.config.js`).

## What's implemented

- User registration/login with hashed passwords + JWT
- Role-based route protection (Customer vs Admin)
- Product catalog: list/search/filter, detail view, admin CRUD
- Cart (client-side, React context)
- Order creation with stock validation and a Stripe PaymentIntent
- Full checkout payment flow: order/PaymentIntent creation → Stripe Elements
  card form (`PaymentForm.jsx`) → `stripe.confirmPayment` → redirect to Orders
- Admin dashboards for products and order status updates
- Product reviews: create/update/delete, restricted to verified purchases
  (a `DELIVERED` order containing the product); one review per user per product
- **Product image uploads**: admin selects a file in the Products page, it's
  uploaded to `POST /api/uploads` (local disk via multer), and the returned
  URL is attached to the product. Swap `middleware/upload.js` for S3/Cloudinary
  when moving to production — local disk storage won't survive redeploys.
- **Email notifications**: order-received email on checkout, and a status-update
  email whenever the admin changes an order's status (processing/shipped/
  delivered/cancelled/refunded). Uses standard SMTP via `nodemailer` — configure
  `SMTP_*` and `MAIL_FROM` in `backend/.env`. Failures are logged, not thrown,
  so a broken mail provider never breaks checkout.
- **Admin two-factor authentication (TOTP)**: an admin enrolls from
  `/admin/security` (scans a QR code with an authenticator app, confirms with a
  code). Once enabled, logging in as that admin is a two-step flow: password
  first returns a short-lived `pendingToken` instead of a session token, then a
  TOTP code is exchanged for the real session token at `/auth/2fa/login-verify`.
  2FA is enforced only for `ADMIN` accounts.

## Remaining polish before production

- Local disk image storage → move to S3/Cloudinary/etc.
- Styling is intentionally minimal — swap in a component library or custom CSS.
- No rate limiting on login/2FA endpoints — add before going live.
- No password reset flow yet.

## Database schema

See `backend/prisma/schema.prisma` for the full data model: User (with 2FA
fields), Address, Category, Product, Review, Order, OrderItem.
