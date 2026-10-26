const prisma = require("../config/db");
const { getSellerEarnings } = require("../services/sellerEarnings");
const { getSettings } = require("../services/settings");
const { sanitizeProductInput } = require("./product.controller");

function clean(value, max) {
  const v = typeof value === "string" ? value.trim() : "";
  return v ? v.slice(0, max) : null;
}

// ---------- Application (any signed-in customer) ----------

// The current user's seller profile, if any — drives the "Become a seller"
// page (apply / pending / rejected / go to dashboard).
async function getMySellerProfile(req, res, next) {
  try {
    const seller = await prisma.seller.findUnique({ where: { userId: req.user.id } });
    const { commissionPercent } = await getSettings();
    res.json({ seller, commissionPercent: Number(commissionPercent) });
  } catch (err) {
    next(err);
  }
}

// Apply to sell. A rejected applicant may re-apply (their application goes
// back to PENDING); approved/suspended/pending sellers can't re-apply.
async function applyAsSeller(req, res, next) {
  try {
    if (req.user.role === "ADMIN") return res.status(400).json({ error: "Admins can't apply as sellers" });

    const businessName = clean(req.body.businessName, 120);
    const phone = clean(req.body.phone, 30);
    if (!businessName) return res.status(400).json({ error: "Business name is required" });
    if (!phone || !/^[0-9+\s()-]{7,30}$/.test(phone)) return res.status(400).json({ error: "A valid phone number is required" });

    const data = {
      businessName,
      phone,
      description: clean(req.body.description, 1000),
      taxId: clean(req.body.taxId, 60),
      address: clean(req.body.address, 300),
      status: "PENDING",
      adminNote: null,
      reviewedAt: null,
    };

    const existing = await prisma.seller.findUnique({ where: { userId: req.user.id } });
    if (existing && existing.status !== "REJECTED") {
      return res.status(409).json({ error: `You already have a seller account (${existing.status.toLowerCase()})` });
    }
    const seller = existing
      ? await prisma.seller.update({ where: { id: existing.id }, data })
      : await prisma.seller.create({ data: { ...data, userId: req.user.id } });
    res.status(201).json(seller);
  } catch (err) {
    next(err);
  }
}

// ---------- Seller dashboard (approved sellers only, see requireSeller) ----------

async function getOverview(req, res, next) {
  try {
    const [earnings, productCount, lowStock, openItems, payouts, settings] = await Promise.all([
      getSellerEarnings(req.seller.id),
      prisma.product.count({ where: { sellerId: req.seller.id, isActive: true } }),
      getSettings().then((s) =>
        prisma.product.findMany({
          where: { sellerId: req.seller.id, isActive: true, stock: { lte: s.lowStockThreshold } },
          select: { id: true, name: true, stock: true },
          orderBy: { stock: "asc" },
          take: 10,
        })
      ),
      prisma.orderItem.count({
        where: { sellerId: req.seller.id, readyAt: null, order: { status: { in: ["PENDING", "PROCESSING"] } } },
      }),
      prisma.payout.findMany({ where: { sellerId: req.seller.id }, orderBy: { createdAt: "desc" }, take: 10 }),
      getSettings(),
    ]);
    res.json({
      seller: req.seller,
      earnings,
      productCount,
      lowStock,
      itemsToPrepare: openItems,
      payouts,
      commissionPercent: Number(settings.commissionPercent),
    });
  } catch (err) {
    next(err);
  }
}

async function listMyProducts(req, res, next) {
  try {
    const products = await prisma.product.findMany({
      where: { sellerId: req.seller.id, isActive: true },
      include: { category: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(products);
  } catch (err) {
    next(err);
  }
}

// Loads a product only if it belongs to this seller — a seller can never
// touch another seller's (or FK Trading's) products.
async function ownProduct(req) {
  const product = await prisma.product.findFirst({ where: { id: req.params.id, sellerId: req.seller.id, isActive: true } });
  if (!product) throw Object.assign(new Error("Product not found"), { status: 404 });
  return product;
}

async function createMyProduct(req, res, next) {
  try {
    const data = sanitizeProductInput(req.body);
    delete data.isActive;
    if (data.images === undefined) data.images = [];
    const product = await prisma.product.create({ data: { ...data, sellerId: req.seller.id } });
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
}

async function updateMyProduct(req, res, next) {
  try {
    await ownProduct(req);
    const data = sanitizeProductInput(req.body, { partial: true });
    delete data.isActive;
    if (Object.keys(data).length === 0) return res.status(400).json({ error: "Nothing to update" });
    res.json(await prisma.product.update({ where: { id: req.params.id }, data }));
  } catch (err) {
    next(err);
  }
}

async function deleteMyProduct(req, res, next) {
  try {
    await ownProduct(req);
    await prisma.product.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// The seller's sold items. FK Trading handles delivery, so sellers see what
// to prepare and hand over — not the customer's address or phone.
async function listMyOrderItems(req, res, next) {
  try {
    const items = await prisma.orderItem.findMany({
      where: { sellerId: req.seller.id },
      include: {
        product: { select: { id: true, name: true, images: true } },
        order: { select: { id: true, status: true, paid: true, createdAt: true } },
      },
      orderBy: { order: { createdAt: "desc" } },
      take: 200,
    });
    res.json(
      items.map((i) => ({
        ...i,
        net: Math.round(Number(i.price) * i.quantity) - Math.round((Number(i.price) * i.quantity * Number(i.commissionPercent)) / 100),
      }))
    );
  } catch (err) {
    next(err);
  }
}

// Seller tells FK Trading an item is packed and ready to collect.
async function markItemReady(req, res, next) {
  try {
    const item = await prisma.orderItem.findFirst({
      where: { id: req.params.itemId, sellerId: req.seller.id },
      include: { order: { select: { status: true } } },
    });
    if (!item) return res.status(404).json({ error: "Item not found" });
    if (!["PENDING", "PROCESSING"].includes(item.order.status)) {
      return res.status(400).json({ error: "This order is no longer being prepared" });
    }
    const updated = await prisma.orderItem.update({
      where: { id: item.id },
      data: { readyAt: item.readyAt ? null : new Date() }, // toggles, in case it was clicked by mistake
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getMySellerProfile,
  applyAsSeller,
  getOverview,
  listMyProducts,
  createMyProduct,
  updateMyProduct,
  deleteMyProduct,
  listMyOrderItems,
  markItemReady,
};
