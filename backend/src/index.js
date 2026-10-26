require("dotenv").config();
require("./config/checkEnv")();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const authRoutes = require("./routes/auth.routes");
const productRoutes = require("./routes/product.routes");
const orderRoutes = require("./routes/order.routes");
const reviewRoutes = require("./routes/review.routes");
const uploadRoutes = require("./routes/upload.routes");
const categoryRoutes = require("./routes/category.routes");
const adminRoutes = require("./routes/admin.routes");
const sellerRoutes = require("./routes/seller.routes");
const addressRoutes = require("./routes/address.routes");
const deliveryZoneRoutes = require("./routes/deliveryZone.routes");
const errorHandler = require("./middleware/errorHandler");

const app = express();

// Render (and most hosts) sit behind one proxy — needed so rate limiting
// sees the customer's real IP instead of the proxy's.
app.set("trust proxy", 1);

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json());

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/products/:productId/reviews", reviewRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/seller", sellerRoutes);
app.use("/api/addresses", addressRoutes);
app.use("/api/delivery-zones", deliveryZoneRoutes);

// Not wired up yet — waiting on a payment provider account. When ready:
//   1. mount routes/paystack.routes.js at "/api/paystack" ABOVE express.json()
//      (the webhook signature is checked against the raw body), and
//   2. call startExpireUnpaidOrdersJob() from jobs/expireUnpaidOrders.js in
//      app.listen below. Don't enable (2) without working payments, or every
//      order gets auto-cancelled after an hour.

app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
