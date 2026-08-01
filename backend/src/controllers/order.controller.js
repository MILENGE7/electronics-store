const prisma = require("../config/db");
const { orderConfirmationEmail, orderStatusEmail } = require("../utils/mailer");

const PAYSTACK_BASE = "https://api.paystack.co";

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
      const created = await tx.order.create({
        data: {
          userId: req.user.id,
          total,
          shippingAddress,
          items: { create: orderItemsData },
        },
        include: { items: true, user: true },
      });

      for (const item of orderItemsData) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      return created;
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
    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { status },
      include: { user: true },
    });
    orderStatusEmail(order); // fire-and-forget
    res.json(order);
  } catch (err) {
    next(err);
  }
}

module.exports = { createOrder, verifyPayment, getMyOrders, getAllOrders, updateOrderStatus };
