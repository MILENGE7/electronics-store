const express = require("express");
const address = require("../controllers/address.controller");
const { requireAuth } = require("../middleware/auth");

// A customer's saved delivery addresses.
const router = express.Router();
router.use(requireAuth);

router.get("/", address.listAddresses);
router.post("/", address.createAddress);
router.put("/:id", address.updateAddress);
router.post("/:id/default", address.setDefaultAddress);
router.delete("/:id", address.deleteAddress);

module.exports = router;
