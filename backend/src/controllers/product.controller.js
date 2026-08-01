const prisma = require("../config/db");

// Public: list products with optional filters (category, search, price range) + pagination
async function listProducts(req, res, next) {
  try {
    const { category, search, minPrice, maxPrice, page = 1, limit = 20 } = req.query;

    const where = {
      isActive: true,
      ...(category && { category: { name: category } }),
      ...(search && { name: { contains: search, mode: "insensitive" } }),
      ...(minPrice || maxPrice
        ? { price: { gte: minPrice ? Number(minPrice) : undefined, lte: maxPrice ? Number(maxPrice) : undefined } }
        : {}),
    };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: true },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { createdAt: "desc" },
      }),
      prisma.product.count({ where }),
    ]);

    res.json({ products, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
}

async function getProduct(req, res, next) {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { category: true, reviews: { include: { user: { select: { name: true } } } } },
    });
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  } catch (err) {
    next(err);
  }
}

// Admin: create product
async function createProduct(req, res, next) {
  try {
    const { name, description, price, stock, images, brand, categoryId } = req.body;
    const product = await prisma.product.create({
      data: { name, description, price, stock, images: images || [], brand, categoryId },
    });
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
}

// Admin: update product
async function updateProduct(req, res, next) {
  try {
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(product);
  } catch (err) {
    next(err);
  }
}

// Admin: delete (soft-delete via isActive so historical orders stay intact)
async function deleteProduct(req, res, next) {
  try {
    await prisma.product.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { listProducts, getProduct, createProduct, updateProduct, deleteProduct };
