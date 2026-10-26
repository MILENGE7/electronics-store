const express = require("express");
const seller = require("../controllers/seller.controller");
const { requireAuth, requireSeller } = require("../middleware/auth");

const router = express.Router();

// Any signed-in user: view their application / apply to sell
router.get("/me", requireAuth, seller.getMySellerProfile);
router.post("/apply", requireAuth, seller.applyAsSeller);

// Approved sellers only
router.get("/overview", requireAuth, requireSeller, seller.getOverview);
router.get("/products", requireAuth, requireSeller, seller.listMyProducts);
router.post("/products", requireAuth, requireSeller, seller.createMyProduct);
router.put("/products/:id", requireAuth, requireSeller, seller.updateMyProduct);
router.delete("/products/:id", requireAuth, requireSeller, seller.deleteMyProduct);
router.get("/order-items", requireAuth, requireSeller, seller.listMyOrderItems);
router.post("/order-items/:itemId/ready", requireAuth, requireSeller, seller.markItemReady);

module.exports = router;
