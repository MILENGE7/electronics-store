const multer = require("multer");

// Allowed image MIME types — validated server-side before anything is
// accepted, independent of the client-supplied filename/extension.
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function fileFilter(req, file, cb) {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return cb(new Error("Only JPEG, PNG, WEBP, or GIF images are allowed"));
  }
  cb(null, true);
}

// Buffers the file in memory instead of writing to local disk — the upload
// route streams that buffer straight to Cloudinary (see upload.routes.js).
// Local disk storage doesn't survive redeploys/restarts on most hosting
// platforms and doesn't share across multiple instances.
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

module.exports = upload;
