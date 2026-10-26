const express = require("express");
const admin = require("../controllers/admin.controller");
const { requireAuth, requireAdmin } = require("../middleware/auth");

// Everything here is admin-only.
const router = express.Router();
router.use(requireAuth, requireAdmin);

router.get("/stats", admin.getStats);

router.get("/settings", admin.getStoreSettings);
router.patch("/settings", admin.updateStoreSettings);

router.get("/delivery-zones", admin.listZones);
router.post("/delivery-zones", admin.createZone);
router.patch("/delivery-zones/:id", admin.updateZone);
router.delete("/delivery-zones/:id", admin.deleteZone);

router.get("/sellers", admin.listSellers);
router.get("/sellers/:id", admin.getSeller);
router.patch("/sellers/:id/status", admin.setSellerStatus);
router.post("/sellers/:id/payouts", admin.createPayout);

module.exports = router;
