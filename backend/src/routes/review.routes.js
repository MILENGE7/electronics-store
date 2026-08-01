const express = require("express");
const { upsertReview, listReviews, deleteReview } = require("../controllers/review.controller");
const { requireAuth } = require("../middleware/auth");

// mergeParams so :productId from the parent mount path is available here
const router = express.Router({ mergeParams: true });

router.get("/", listReviews);
router.post("/", requireAuth, upsertReview);
router.delete("/:reviewId", requireAuth, deleteReview);

module.exports = router;
