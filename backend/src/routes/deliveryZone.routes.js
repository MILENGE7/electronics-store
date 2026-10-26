const express = require("express");
const prisma = require("../config/db");

const router = express.Router();

// Public: delivery areas and fees offered at checkout.
router.get("/", async (req, res, next) => {
  try {
    res.json(await prisma.deliveryZone.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
