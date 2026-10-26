const prisma = require("../config/db");
const { getSettings } = require("../services/settings");
const { getSellerEarnings } = require("../services/sellerEarnings");
const { VISIBLE_PRODUCT } = require("./product.controller");

const DAY_MS = 24 * 60 * 60 * 1000;
// Rwanda is UTC+2 all year (no daylight saving), so "today" is bucketed in Kigali time.
const KIGALI_OFFSET_MS = 2 * 60 * 60 * 1000;
const kigaliDay = (date) => new Date(date.getTime() + KIGALI_OFFSET_MS).toISOString().slice(0, 10);
const startOfKigaliDay = (date) => new Date(Date.parse(kigaliDay(date)) - KIGALI_OFFSET_MS);

// Orders that count as real sales (not cancelled/refunded).
const LIVE_ORDER = { status: { notIn: ["CANCELLED", "REFUNDED"] } };

function badRequest(message) {
  return Object.assign(new Error(message), { status: 400 });
}

// ---------- Dashboard ----------

async function getStats(req, res, next) {
  try {
    const now = new Date();
    const todayStart = startOfKigaliDay(now);
    const days30Start = new Date(todayStart.getTime() - 29 * DAY_MS);
    const days7Start = new Date(todayStart.getTime() - 6 * DAY_MS);
    const settings = await getSettings();

    const [recentOrders, statusCounts, topRaw, lowStock, pendingSellers, customers, commissionItems] = await Promise.all([
      prisma.order.findMany({
        where: { createdAt: { gte: days30Start }, ...LIVE_ORDER },
        select: { createdAt: true, total: true, deliveryFee: true, paid: true },
      }),
      prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.orderItem.groupBy({
        by: ["productId"],
        where: { order: { createdAt: { gte: days30Start }, ...LIVE_ORDER } },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 5,
      }),
      prisma.product.findMany({
        where: { ...VISIBLE_PRODUCT, stock: { lte: settings.lowStockThreshold } },
        select: { id: true, name: true, stock: true, images: true, seller: { select: { businessName: true } } },
        orderBy: { stock: "asc" },
        take: 20,
      }),
      prisma.seller.count({ where: { status: "PENDING" } }),
      prisma.user.count({ where: { role: { not: "ADMIN" } } }),
      prisma.orderItem.findMany({
        where: { sellerId: { not: null }, order: { status: "DELIVERED", paid: true } },
        select: { price: true, quantity: true, commissionPercent: true },
      }),
    ]);

    // Daily series for the chart: sales value of orders placed each day.
    const series = [];
    for (let i = 0; i < 30; i++) {
      const day = kigaliDay(new Date(days30Start.getTime() + i * DAY_MS));
      series.push({ date: day, orders: 0, sales: 0 });
    }
    const byDay = Object.fromEntries(series.map((d) => [d.date, d]));
    const period = { today: { orders: 0, sales: 0, collected: 0 }, week: { orders: 0, sales: 0, collected: 0 }, month: { orders: 0, sales: 0, collected: 0 } };

    for (const o of recentOrders) {
      const total = Number(o.total);
      const bucket = byDay[kigaliDay(o.createdAt)];
      if (bucket) {
        bucket.orders += 1;
        bucket.sales += total;
      }
      const periods = ["month"];
      if (o.createdAt >= days7Start) periods.push("week");
      if (o.createdAt >= todayStart) periods.push("today");
      for (const p of periods) {
        period[p].orders += 1;
        period[p].sales += total; // value of orders placed
        if (o.paid) period[p].collected += total; // money actually received
      }
    }

    const products = await prisma.product.findMany({
      where: { id: { in: topRaw.map((t) => t.productId) } },
      select: { id: true, name: true, images: true, price: true },
    });
    const topProducts = topRaw.map((t) => ({
      ...products.find((p) => p.id === t.productId),
      unitsSold: t._sum.quantity,
    }));

    const counts = Object.fromEntries(statusCounts.map((s) => [s.status, s._count._all]));
    const commissionEarned = commissionItems.reduce(
      (sum, i) => sum + Math.round((Number(i.price) * i.quantity * Number(i.commissionPercent)) / 100),
      0
    );

    res.json({
      period,
      series,
      topProducts,
      lowStock,
      lowStockThreshold: settings.lowStockThreshold,
      orderCounts: counts,
      // Both PENDING (awaiting online payment) and PROCESSING (incl. every new
      // cash on delivery order) need the admin's attention.
      needsAction: (counts.PENDING || 0) + (counts.PROCESSING || 0),
      pendingSellerApplications: pendingSellers,
      customers,
      commissionEarned,
    });
  } catch (err) {
    next(err);
  }
}

// ---------- Settings ----------

async function getStoreSettings(req, res, next) {
  try {
    res.json(await getSettings());
  } catch (err) {
    next(err);
  }
}

async function updateStoreSettings(req, res, next) {
  try {
    const data = {};
    if (req.body.commissionPercent !== undefined) {
      const v = Number(req.body.commissionPercent);
      if (Number.isNaN(v) || v < 0 || v > 50) throw badRequest("Commission must be between 0 and 50%");
      data.commissionPercent = v;
    }
    if (req.body.lowStockThreshold !== undefined) {
      const v = Number(req.body.lowStockThreshold);
      if (!Number.isInteger(v) || v < 0 || v > 1000) throw badRequest("Low-stock level must be a whole number from 0 to 1000");
      data.lowStockThreshold = v;
    }
    await getSettings(); // make sure the row exists
    res.json(await prisma.storeSettings.update({ where: { id: 1 }, data }));
  } catch (err) {
    next(err);
  }
}

// ---------- Delivery zones ----------

function zoneInput(body, { partial }) {
  const data = {};
  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) throw badRequest("Zone name is required");
    data.name = name.slice(0, 80);
  }
  if (body.fee !== undefined) {
    const fee = Number(body.fee);
    if (Number.isNaN(fee) || fee < 0) throw badRequest("Delivery fee must be 0 or more");
    data.fee = fee;
  }
  if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);
  if (!partial && (data.name === undefined || data.fee === undefined)) throw badRequest("Name and fee are required");
  return data;
}

async function listZones(req, res, next) {
  try {
    res.json(await prisma.deliveryZone.findMany({ orderBy: { name: "asc" } }));
  } catch (err) {
    next(err);
  }
}

async function createZone(req, res, next) {
  try {
    const data = zoneInput(req.body, { partial: false });
    if (await prisma.deliveryZone.findUnique({ where: { name: data.name } })) {
      return res.status(409).json({ error: "A zone with that name already exists" });
    }
    res.status(201).json(await prisma.deliveryZone.create({ data }));
  } catch (err) {
    next(err);
  }
}

async function updateZone(req, res, next) {
  try {
    const data = zoneInput(req.body, { partial: true });
    res.json(await prisma.deliveryZone.update({ where: { id: req.params.id }, data }));
  } catch (err) {
    next(err);
  }
}

// Zones already used by orders are switched off instead of deleted, so old
// orders keep showing where they were delivered.
async function deleteZone(req, res, next) {
  try {
    const used = await prisma.order.count({ where: { deliveryZoneId: req.params.id } });
    if (used > 0) {
      await prisma.deliveryZone.update({ where: { id: req.params.id }, data: { isActive: false } });
      return res.json({ deactivated: true });
    }
    await prisma.deliveryZone.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// ---------- Sellers ----------

const SELLER_STATUSES = ["PENDING", "APPROVED", "REJECTED", "SUSPENDED"];

async function listSellers(req, res, next) {
  try {
    const where = SELLER_STATUSES.includes(req.query.status) ? { status: req.query.status } : {};
    const sellers = await prisma.seller.findMany({
      where,
      include: { user: { select: { name: true, email: true } }, _count: { select: { products: true } } },
      orderBy: { createdAt: "desc" },
    });
    const earnings = sellers.length ? await getSellerEarnings(sellers.map((s) => s.id)) : {};
    res.json(sellers.map((s) => ({ ...s, earnings: earnings[s.id] })));
  } catch (err) {
    next(err);
  }
}

async function getSeller(req, res, next) {
  try {
    const seller = await prisma.seller.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { name: true, email: true, createdAt: true } },
        payouts: { orderBy: { createdAt: "desc" } },
        _count: { select: { products: true } },
      },
    });
    if (!seller) return res.status(404).json({ error: "Seller not found" });
    res.json({ ...seller, earnings: await getSellerEarnings(seller.id) });
  } catch (err) {
    next(err);
  }
}

// Approve / reject / suspend / reinstate. The account's role follows: an
// approved seller becomes SELLER; anything else drops back to CUSTOMER so
// they can still shop.
async function setSellerStatus(req, res, next) {
  try {
    const { status } = req.body;
    if (!["APPROVED", "REJECTED", "SUSPENDED"].includes(status)) throw badRequest("Invalid seller status");
    const adminNote = req.body.adminNote ? String(req.body.adminNote).trim().slice(0, 500) : null;

    const seller = await prisma.$transaction(async (tx) => {
      const existing = await tx.seller.findUnique({ where: { id: req.params.id }, include: { user: true } });
      if (!existing) throw Object.assign(new Error("Seller not found"), { status: 404 });

      if (existing.user.role !== "ADMIN") {
        await tx.user.update({
          where: { id: existing.userId },
          data: { role: status === "APPROVED" ? "SELLER" : "CUSTOMER" },
        });
      }
      return tx.seller.update({
        where: { id: existing.id },
        data: { status, adminNote, reviewedAt: new Date() },
      });
    });
    res.json(seller);
  } catch (err) {
    next(err);
  }
}

async function createPayout(req, res, next) {
  try {
    const amount = Math.round(Number(req.body.amount));
    const method = String(req.body.method || "").trim();
    if (!amount || amount <= 0) throw badRequest("Amount must be more than 0");
    if (!method) throw badRequest("Payment method is required (e.g. MTN MoMo)");

    const seller = await prisma.seller.findUnique({ where: { id: req.params.id } });
    if (!seller) return res.status(404).json({ error: "Seller not found" });

    // Never pay out more than the seller has actually earned.
    const { balance } = await getSellerEarnings(seller.id);
    if (amount > balance) throw badRequest(`Amount is more than this seller's balance (RWF ${balance.toLocaleString("en-US")})`);

    const payout = await prisma.payout.create({
      data: {
        sellerId: seller.id,
        amount,
        method: method.slice(0, 60),
        reference: req.body.reference ? String(req.body.reference).trim().slice(0, 120) : null,
        note: req.body.note ? String(req.body.note).trim().slice(0, 500) : null,
      },
    });
    res.status(201).json(payout);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getStats,
  getStoreSettings,
  updateStoreSettings,
  listZones,
  createZone,
  updateZone,
  deleteZone,
  listSellers,
  getSeller,
  setSellerStatus,
  createPayout,
};
