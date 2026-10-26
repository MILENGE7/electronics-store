const { OrderStatus, PaymentMethod } = require("@prisma/client");
const prisma = require("../config/db");
const { orderConfirmationEmail, orderStatusEmail } = require("../utils/mailer");
const { fetchTransaction, checkTransaction, markOrderPaid, isOnlinePaymentEnabled } = require("../services/payments");
const { getSettings } = require("../services/settings");
const { VISIBLE_PRODUCT } = require("./product.controller");

// Everything an order detail page needs, for the customer and the admin.
const ORDER_DETAIL_INCLUDE = {
  items: { include: { product: true, seller: { select: { id: true, businessName: true } } } },
  deliveryZone: true,
  user: { select: { name: true, email: true } },
};

// Puts an order's items back into stock (cancel/refund).
async function restoreStock(tx, items) {
  for (const item of items) {
    await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
  }
}

// Statuses that mean "these items are back in inventory". Used by
// updateOrderStatus to restore stock exactly once when an order is
// cancelled/refunded, regardless of which status it's transitioning from.
const STOCK_RESTORING_STATUSES = new Set([OrderStatus.CANCELLED, OrderStatus.REFUNDED]);

// Customer: create an order from the submitted cart. Stock is validated and
// decremented immediately. Paystack orders are confirmed in a separate step
// once the customer completes the popup (see verifyPayment below); cash on
// delivery orders go straight to PROCESSING and are marked paid on delivery.
async function createOrder(req, res, next) {
  try {
    const { items, shippingAddress } = req.body; // items: [{ productId, quantity }]
    const paymentMethod = req.body.paymentMethod ?? PaymentMethod.PAYSTACK;
    if (!Object.values(PaymentMethod).includes(paymentMethod)) {
      return res.status(400).json({ error: "Invalid payment method" });
    }
    if (paymentMethod === PaymentMethod.PAYSTACK && !isOnlinePaymentEnabled()) {
      return res.status(400).json({ error: "Online payment isn't available yet — please choose cash on delivery" });
    }
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: "Cart is empty" });
    if (!shippingAddress || typeof shippingAddress !== "object") {
      return res.status(400).json({ error: "shippingAddress is required" });
    }

    // Quantities must be positive integers: a negative quantity would both
    // subtract from the order total (letting a customer underpay for the
    // other items) and *increase* stock via the decrement below.
    const seen = new Set();
    for (const item of items) {
      if (typeof item?.productId !== "string" || !Number.isInteger(item.quantity) || item.quantity < 1) {
        return res.status(400).json({ error: "Each item needs a productId and a quantity of at least 1" });
      }
      if (seen.has(item.productId)) {
        return res.status(400).json({ error: "Duplicate product in cart" });
      }
      seen.add(item.productId);
    }

    // Delivery: once the admin has set up delivery zones, the customer must
    // pick one and its fee is added. With no zones configured, delivery is free.
    const activeZones = await prisma.deliveryZone.count({ where: { isActive: true } });
    let deliveryZone = null;
    if (activeZones > 0) {
      deliveryZone = req.body.deliveryZoneId
        ? await prisma.deliveryZone.findFirst({ where: { id: String(req.body.deliveryZoneId), isActive: true } })
        : null;
      if (!deliveryZone) return res.status(400).json({ error: "Please choose a delivery area" });
    }
    const deliveryFee = deliveryZone ? Number(deliveryZone.fee) : 0;

    const productIds = items.map((i) => i.productId);
    // Soft-deleted products, and products of a seller who has since been
    // suspended, may still sit in a customer's localStorage cart — they must
    // not be orderable.
    const products = await prisma.product.findMany({ where: { id: { in: productIds }, ...VISIBLE_PRODUCT } });
    const { commissionPercent } = await getSettings();

    let total = 0;
    const orderItemsData = items.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) throw Object.assign(new Error("A product in your cart is no longer available"), { status: 404 });
      if (product.stock < item.quantity) {
        throw Object.assign(new Error(`Insufficient stock for ${product.name}`), { status: 400 });
      }
      total += Number(product.price) * item.quantity;
      return {
        productId: product.id,
        quantity: item.quantity,
        price: product.price,
        sellerId: product.sellerId,
        // FK Trading's own products owe no commission to anyone
        commissionPercent: product.sellerId ? commissionPercent : 0,
      };
    });
    total += deliveryFee;

    const order = await prisma.$transaction(async (tx) => {
      // Decrement conditionally on the stock still being sufficient at write
      // time — the plain findMany check above only protects against a cart
      // that was already too big; without this, two concurrent checkouts for
      // the last unit of a product can both pass that check and both
      // decrement, driving stock negative.
      for (const item of orderItemsData) {
        const result = await tx.product.updateMany({
          where: { id: item.productId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (result.count === 0) {
          const product = products.find((p) => p.id === item.productId);
          throw Object.assign(
            new Error(`Insufficient stock for ${product?.name ?? item.productId}`),
            { status: 409 }
          );
        }
      }

      return tx.order.create({
        data: {
          userId: req.user.id,
          total,
          deliveryFee,
          deliveryZoneId: deliveryZone?.id ?? null,
          shippingAddress,
          paymentMethod,
          status: paymentMethod === PaymentMethod.CASH_ON_DELIVERY ? OrderStatus.PROCESSING : OrderStatus.PENDING,
          items: { create: orderItemsData },
        },
        include: { items: true, user: { select: { name: true, email: true } } },
      });
    });

    orderConfirmationEmail(order); // fire-and-forget

    // The order's own id doubles as the Paystack transaction reference —
    // simple, unique, and lets us look the order straight back up on verify.
    res.status(201).json({ order, paystackRef: order.id, amountInSubunit: Math.round(total * 100) });
  } catch (err) {
    next(err);
  }
}

// Customer: after the Paystack popup completes, confirm the payment server-side
// (never trust the client's "it succeeded" claim alone) before marking it paid.
async function verifyPayment(req, res, next) {
  try {
    const { reference } = req.body;
    if (!reference) return res.status(400).json({ error: "reference is required" });

    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.userId !== req.user.id && req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Not authorized to verify this order" });
    }

    // Already confirmed — return as-is instead of re-verifying/re-writing.
    if (order.paid) return res.json(order);
    if (order.paymentMethod !== PaymentMethod.PAYSTACK) {
      return res.status(400).json({ error: "This order is paid on delivery" });
    }

    // The reference we handed out for this order at creation time IS order.id
    // (see createOrder). Rejecting anything else stops a reference that
    // successfully paid for one order from being replayed against a
    // different order (possible whenever two orders share the same total).
    if (reference !== order.id) {
      return res.status(400).json({ error: "Payment reference does not match this order" });
    }

    const lookup = await fetchTransaction(reference);
    const problem = lookup.found ? checkTransaction(order, lookup.data) : "Payment could not be verified";
    if (problem) return res.status(400).json({ error: problem });

    res.json(await markOrderPaid(order.id, reference));
  } catch (err) {
    next(err);
  }
}

async function getMyOrders(req, res, next) {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user.id },
      include: { items: { include: { product: true } }, deliveryZone: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(orders);
  } catch (err) {
    next(err);
  }
}

// Single-order detail. Ownership is enforced the same way verifyPayment
// already does — a customer may only view their own order (an admin may
// view any) — never by an ID being "hard to guess" alone.
async function getOrderById(req, res, next) {
  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.id }, include: ORDER_DETAIL_INCLUDE });
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.userId !== req.user.id && req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Not authorized to view this order" });
    }
    res.json(order);
  } catch (err) {
    next(err);
  }
}

// Admin: order list with filters and paging.
//   ?status=PROCESSING  ?q=<order number, customer name or email>
//   ?from=2026-10-01&to=2026-10-31  ?page=1&limit=20
async function getAllOrders(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const where = {};

    if (req.query.status) {
      if (!Object.values(OrderStatus).includes(req.query.status)) {
        return res.status(400).json({ error: "Invalid order status" });
      }
      where.status = req.query.status;
    }

    const q = String(req.query.q || "").trim();
    if (q) {
      // Order numbers are shown as "#FK-1A2B3C4D" — the first 8 chars of the id.
      const idPart = q.replace(/^#/, "").replace(/^fk-/i, "").toLowerCase();
      where.OR = [
        { id: { startsWith: idPart } },
        { user: { name: { contains: q, mode: "insensitive" } } },
        { user: { email: { contains: q, mode: "insensitive" } } },
      ];
    }

    const from = req.query.from ? new Date(req.query.from) : null;
    const to = req.query.to ? new Date(req.query.to) : null;
    if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime()))) {
      return res.status(400).json({ error: "Invalid date" });
    }
    if (from || to) {
      // "to" includes that whole day
      where.createdAt = { ...(from && { gte: from }), ...(to && { lt: new Date(to.getTime() + 24 * 60 * 60 * 1000) }) };
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: { items: { select: { quantity: true } }, user: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);
    res.json({ orders, total, page, limit });
  } catch (err) {
    next(err);
  }
}

async function updateOrderStatus(req, res, next) {
  try {
    const { status } = req.body;
    if (!Object.values(OrderStatus).includes(status)) {
      return res.status(400).json({ error: "Invalid order status" });
    }

    const order = await prisma.$transaction(async (tx) => {
      const existing = await tx.order.findUnique({ where: { id: req.params.id }, include: { items: true } });
      if (!existing) throw Object.assign(new Error("Order not found"), { status: 404 });

      // Restore inventory the first time an order lands in a
      // cancelled/refunded state — not on every subsequent status write
      // (e.g. CANCELLED -> REFUNDED shouldn't restore stock twice).
      const restoringStock =
        STOCK_RESTORING_STATUSES.has(status) && !STOCK_RESTORING_STATUSES.has(existing.status);
      if (restoringStock) await restoreStock(tx, existing.items);

      // Cash on delivery: the money is collected when the order is handed
      // over, so marking it DELIVERED also marks it paid.
      const collectCash =
        existing.paymentMethod === PaymentMethod.CASH_ON_DELIVERY && status === OrderStatus.DELIVERED && !existing.paid;

      return tx.order.update({
        where: { id: req.params.id },
        data: { status, ...(collectCash && { paid: true }) },
        include: { user: { select: { name: true, email: true } } },
      });
    });

    orderStatusEmail(order); // fire-and-forget
    res.json(order);
  } catch (err) {
    next(err);
  }
}

// Customer: cancel their own order before it ships. Orders already paid
// online need a refund, so those go through the store instead.
async function cancelMyOrder(req, res, next) {
  try {
    const order = await prisma.$transaction(async (tx) => {
      const existing = await tx.order.findUnique({ where: { id: req.params.id }, include: { items: true } });
      if (!existing || existing.userId !== req.user.id) {
        throw Object.assign(new Error("Order not found"), { status: 404 });
      }
      if (!["PENDING", "PROCESSING"].includes(existing.status)) {
        throw Object.assign(new Error("This order can no longer be cancelled — it has already shipped or been closed"), {
          status: 400,
        });
      }
      if (existing.paid) {
        throw Object.assign(new Error("This order is already paid — please contact us to cancel and get a refund"), {
          status: 400,
        });
      }

      // Conditional on the status not having moved since we read it (e.g. the
      // admin marking it shipped at the same moment).
      const updated = await tx.order.updateMany({
        where: { id: existing.id, status: existing.status },
        data: { status: OrderStatus.CANCELLED, cancelledByCustomer: true },
      });
      if (updated.count === 0) throw Object.assign(new Error("Order status just changed, please refresh"), { status: 409 });

      await restoreStock(tx, existing.items);
      return tx.order.findUnique({ where: { id: existing.id }, include: ORDER_DETAIL_INCLUDE });
    });

    orderStatusEmail(order); // fire-and-forget
    res.json(order);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createOrder, verifyPayment, getMyOrders, getOrderById, getAllOrders, updateOrderStatus, cancelMyOrder,
};
