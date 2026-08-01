const express = require("express");
const upload = require("../middleware/upload");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

// Admin only: upload a product image, returns the URL to store in Product.images
router.post("/", requireAuth, requireAdmin, upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  const url = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
  res.status(201).json({ url });
});

module.exports = router;
