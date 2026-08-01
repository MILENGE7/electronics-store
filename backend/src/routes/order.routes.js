const express = require("express");
const {
  createOrder, verifyPayment, getMyOrders, getAllOrders, updateOrderStatus,
} = require("../controllers/order.controller");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

router.post("/", requireAuth, createOrder);
router.post("/:id/verify-payment", requireAuth, verifyPayment);
router.get("/mine", requireAuth, getMyOrders);
router.get("/", requireAuth, requireAdmin, getAllOrders);
router.patch("/:id/status", requireAuth, requireAdmin, updateOrderStatus);

module.exports = router;
