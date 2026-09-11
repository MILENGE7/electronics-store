const express = require("express");
const {
  createOrder, verifyPayment, getMyOrders, getOrderById, getAllOrders, updateOrderStatus,
} = require("../controllers/order.controller");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

router.post("/", requireAuth, createOrder);
router.post("/:id/verify-payment", requireAuth, verifyPayment);
router.get("/mine", requireAuth, getMyOrders);
router.get("/", requireAuth, requireAdmin, getAllOrders);
// Registered after the literal "/mine" path above so "/orders/mine" is never
// swallowed by this ":id" wildcard.
router.get("/:id", requireAuth, getOrderById);
router.patch("/:id/status", requireAuth, requireAdmin, updateOrderStatus);

module.exports = router;
