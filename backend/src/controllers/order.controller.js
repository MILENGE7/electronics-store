const { OrderStatus } = require("@prisma/client");
const prisma = require("../config/db");
const { orderConfirmationEmail, orderStatusEmail } = require("../utils/mailer");

const PAYSTACK_BASE = "https://api.paystack.co";

// Statuses that mean "these items are back in inventory". Used by
// updateOrderStatus to restore stock exactly once when an order is
// cancelled/refunded, regardless of which status it's transitioning from.
const STOCK_RESTORING_STATUSES = new Set([OrderStatus.CANCELLED, OrderStatus.REFUNDED]);

// Customer: create an order from the submitted cart. Stock is validated and
// decremented immediately; payment is confirmed in a separate step once the
// customer completes the Paystack popup (see verifyPayment below).
async function createOrder(req, res, next) {
  try {
    const { items, shippingAddress } = req.body; // items: [{ productId, quantity }]
    if (!items?.length) return res.status(400).json({ error: "Cart is empty" });

    const productIds = items.map((i) => i.productId);
    const products = await prisma.product.findMany({ where: { id: { in: productIds } } });

    let total = 0;
    const orderItemsData = items.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) throw Object.assign(new Error(`Product ${item.productId} not found`), { status: 404 });
      if (product.stock < item.quantity) {
        throw Object.assign(new Error(`Insufficient stock for ${product.name}`), { status: 400 });
      }
      total += Number(product.price) * item.quantity;
      return { productId: product.id, quantity: item.quantity, price: product.price };
    });

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
          shippingAddress,
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

    // The reference we handed out for this order at creation time IS order.id
    // (see createOrder). Rejecting anything else stops a reference that
    // successfully paid for one order from being replayed against a
    // different order (possible whenever two orders share the same total).
    if (reference !== order.id) {
      return res.status(400).json({ error: "Payment reference does not match this order" });
    }

    const verifyRes = await fetch(`${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
    });
    const verifyData = await verifyRes.json();

    if (!verifyRes.ok || verifyData.data?.status !== "success") {
      return res.status(400).json({ error: "Payment could not be verified" });
    }

    const expectedAmount = Math.round(Number(order.total) * 100);
    if (verifyData.data.amount !== expectedAmount) {
      return res.status(400).json({ error: "Paid amount does not match order total" });
    }

    // Belt-and-braces: even though `reference` is pinned to this order's own
    // id above, a DB-level unique constraint on paymentReference means this
    // write would still fail loudly (a 500, logged server-side) instead of
    // silently double-applying a reference if that pinning ever stops holding.
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        paid: true,
        paymentReference: reference,
        status: order.status === "PENDING" ? "PROCESSING" : order.status,
      },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

async function getMyOrders(req, res, next) {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user.id },
      include: { items: { include: { product: true } } },
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
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { items: { include: { product: true } } },
    });
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.userId !== req.user.id && req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Not authorized to view this order" });
    }
    res.json(order);
  } catch (err) {
    next(err);
  }
}

async function getAllOrders(req, res, next) {
  try {
    const orders = await prisma.order.findMany({
      include: { items: { include: { product: true } }, user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(orders);
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
      if (restoringStock) {
        for (const item of existing.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }

      return tx.order.update({
        where: { id: req.params.id },
        data: { status },
        include: { user: { select: { name: true, email: true } } },
      });
    });

    orderStatusEmail(order); // fire-and-forget
    res.json(order);
  } catch (err) {
    next(err);
  }
}

module.exports = { createOrder, verifyPayment, getMyOrders, getOrderById, getAllOrders, updateOrderStatus };
