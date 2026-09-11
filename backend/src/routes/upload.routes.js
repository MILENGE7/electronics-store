const express = require("express");
const upload = require("../middleware/upload");
const cloudinary = require("../config/cloudinary");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

function uploadBufferToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "electronics-store/products", resource_type: "image" },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });
}

// Admin only: upload a product image, returns the URL to store in Product.images
router.post("/", requireAuth, requireAdmin, upload.single("image"), async (req, res, next) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  try {
    const result = await uploadBufferToCloudinary(req.file.buffer);
    res.status(201).json({ url: result.secure_url });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
