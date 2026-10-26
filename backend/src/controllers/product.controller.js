const prisma = require("../config/db");

// A product is shown in the shop only if it's active and belongs either to
// FK Trading itself (no seller) or to a currently approved seller — so
// suspending a seller hides their whole catalogue at once.
const VISIBLE_PRODUCT = {
  isActive: true,
  OR: [{ sellerId: null }, { seller: { status: "APPROVED" } }],
};

// Public-safe seller fields shown as "Sold by ..." on product pages.
const SELLER_PUBLIC = { select: { id: true, businessName: true } };

// [{ name, value }] rows, trimmed, empty rows dropped, capped to keep payloads sane.
function sanitizeSpecs(specs) {
  if (!Array.isArray(specs)) {
    throw Object.assign(new Error("specs must be a list of { name, value } rows"), { status: 400 });
  }
  return specs
    .map((row) => ({ name: String(row?.name ?? "").trim().slice(0, 80), value: String(row?.value ?? "").trim().slice(0, 200) }))
    .filter((row) => row.name && row.value)
    .slice(0, 40);
}

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

  if (body.specs !== undefined) {
    data.specs = sanitizeSpecs(body.specs);
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
    const { category, search } = req.query;
    const toPrice = (v) => (v === undefined || v === "" || Number.isNaN(Number(v)) ? undefined : Number(v));
    const min = toPrice(req.query.minPrice);
    const max = toPrice(req.query.maxPrice);
    // Clamp paging input: a garbage value used to crash the query (500) and
    // an unbounded limit let one request pull the entire catalogue.
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

    // ?seller=fk → FK Trading's own products; ?seller=<id> → one seller's shop
    const sellerFilter =
      req.query.seller === "fk" ? { sellerId: null } : req.query.seller ? { sellerId: String(req.query.seller) } : {};

    const where = {
      ...VISIBLE_PRODUCT,
      ...sellerFilter,
      ...(category && { category: { name: category } }),
      ...(search && { name: { contains: search, mode: "insensitive" } }),
      ...(min !== undefined || max !== undefined ? { price: { gte: min, lte: max } } : {}),
    };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: true, seller: SELLER_PUBLIC },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.product.count({ where }),
    ]);

    res.json({ products, total, page, limit });
  } catch (err) {
    next(err);
  }
}

async function getProduct(req, res, next) {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: {
        category: true,
        seller: { select: { id: true, businessName: true, status: true } },
        reviews: { include: { user: { select: { name: true } } } },
      },
    });
    const sellerHidden = product?.seller && product.seller.status !== "APPROVED";
    if (!product || !product.isActive || sellerHidden) return res.status(404).json({ error: "Product not found" });
    if (product.seller) delete product.seller.status;
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

module.exports = { VISIBLE_PRODUCT, sanitizeProductInput, listProducts, getProduct, createProduct, updateProduct, deleteProduct };
