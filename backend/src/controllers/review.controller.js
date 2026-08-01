const prisma = require("../config/db");

// Create or update the current user's review for a product.
// Restricted to "verified purchase": the user must have a DELIVERED order
// containing this product. Remove that check if you want open reviews instead.
async function upsertReview(req, res, next) {
  try {
    const { productId } = req.params;
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "rating must be an integer between 1 and 5" });
    }

    const purchase = await prisma.orderItem.findFirst({
      where: {
        productId,
        order: { userId: req.user.id, status: "DELIVERED" },
      },
    });
    if (!purchase) {
      return res.status(403).json({ error: "You can only review products you've purchased and received" });
    }

    const review = await prisma.review.upsert({
      where: { productId_userId: { productId, userId: req.user.id } },
      update: { rating, comment },
      create: { productId, userId: req.user.id, rating, comment },
    });

    res.status(201).json(review);
  } catch (err) {
    next(err);
  }
}

// List reviews for a product (paginated) — useful if you don't want to load
// all reviews inline with the product detail response.
async function listReviews(req, res, next) {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { productId },
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.review.count({ where: { productId } }),
    ]);

    res.json({ reviews, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
}

// Delete the current user's own review (or an admin can moderate/remove any review)
async function deleteReview(req, res, next) {
  try {
    const review = await prisma.review.findUnique({ where: { id: req.params.reviewId } });
    if (!review) return res.status(404).json({ error: "Review not found" });

    if (review.userId !== req.user.id && req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Not authorized to delete this review" });
    }

    await prisma.review.delete({ where: { id: req.params.reviewId } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { upsertReview, listReviews, deleteReview };
