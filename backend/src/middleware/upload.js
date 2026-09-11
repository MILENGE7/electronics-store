const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Maps an allowed MIME type to the extension we'll actually save it with.
// The stored extension is always taken from this map (i.e. from the
// server-validated mimetype), never from the client-supplied
// `file.originalname` — otherwise an attacker could send a real image
// mimetype alongside an originalname like "x.html" and get an executable
// file served back from a same-origin static mount.
const MIME_EXTENSIONS = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${MIME_EXTENSIONS[file.mimetype] || ""}`);
  },
});

function fileFilter(req, file, cb) {
  if (!MIME_EXTENSIONS[file.mimetype]) {
    return cb(new Error("Only JPEG, PNG, WEBP, or GIF images are allowed"));
  }
  cb(null, true);
}

// NOTE: local disk storage is fine for development. For production, swap this
// out for a cloud storage backend (S3, Cloudinary, etc.) so uploads survive
// redeploys and scale across multiple server instances.
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

module.exports = upload;
