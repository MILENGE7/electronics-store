const prisma = require("../config/db");

// Whitelists and lightly validates the fields an admin may set on a product.
// Used by both createProduct (partial: false — all required fields must be
// present) and updateProduct (partial: true — only touch what's provided).
// Forwarding req.body straight to Prisma would let any unexpected field
// through and let malformed price/stock values surface as an opaque 500
// instead of a 400.
function sanitizeProductInput(body, { partial = false } = {}) {
  const data = {};

  for (const field of ["name", "description", "brand", "categoryId"]) {
    if (body[field] !== undefined) data[field] = body[field];
  }

  if (body.price !== undefined) {
    const price = Number(body.price);
    if (Number.isNaN(price) || price < 0) {
      throw Object.assign(new Error("price must be a non-negative number"), { status: 400 });
    }
    data.price = price;
  }

  if (body.stock !== undefined) {
    const stock = Number(body.stock);
    if (!Number.isInteger(stock) || stock < 0) {
      throw Object.assign(new Error("stock must be a non-negative integer"), { status: 400 });
    }
    data.stock = stock;
  }

  if (body.images !== undefined) {
    data.images = Array.isArray(body.images) ? body.images : [];
  }

  if (body.isActive !== undefined) {
    data.isActive = Boolean(body.isActive);
  }

  if (!partial) {
    for (const required of ["name", "description", "price", "stock", "categoryId"]) {
      if (data[required] === undefined) {
        throw Object.assign(new Error(`${required} is required`), { status: 400 });
      }
    }
  }

  return data;
}

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
    const data = sanitizeProductInput(req.body);
    if (data.images === undefined) data.images = [];
    const product = await prisma.product.create({ data });
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
}

// Admin: update product
async function updateProduct(req, res, next) {
  try {
    const data = sanitizeProductInput(req.body, { partial: true });
    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: "Nothing to update" });
    }
    const product = await prisma.product.update({ where: { id: req.params.id }, data });
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
