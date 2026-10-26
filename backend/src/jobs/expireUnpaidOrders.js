const prisma = require("../config/db");
const { fetchTransaction, checkTransaction, markOrderPaid } = require("../services/payments");

// Orders reserve stock as soon as they're created. If the customer never
// pays, that stock would stay locked forever — so unpaid orders older than
// this are cancelled and their stock released.
const EXPIRE_AFTER_MINUTES = 60;
const RUN_EVERY_MINUTES = 5;

// Paystack statuses that mean "still in progress, don't cancel yet".
const IN_PROGRESS = new Set(["ongoing", "pending", "processing", "queued"]);

async function expireOne(order) {
  // Ask Paystack before cancelling: the customer may have paid and the
  // browser/webhook confirmation just never arrived.
  let lookup;
  try {
    lookup = await fetchTransaction(order.id);
  } catch (err) {
    console.warn(`Skipping expiry of order ${order.id}, Paystack unreachable: ${err.message}`);
    return;
  }

  if (lookup.found && !checkTransaction(order, lookup.data)) {
    await markOrderPaid(order.id, order.id);
    return;
  }
  if (lookup.found && IN_PROGRESS.has(lookup.data?.status)) return;

  await prisma.$transaction(async (tx) => {
    // Conditional on still being unpaid + PENDING, so a payment confirmed a
    // moment ago (or an admin status change) always wins.
    const cancelled = await tx.order.updateMany({
      where: { id: order.id, paid: false, status: "PENDING" },
      data: { status: "CANCELLED" },
    });
    if (cancelled.count === 0) return;

    for (const item of order.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      });
    }
  });
  console.log(`Order ${order.id} cancelled: unpaid after ${EXPIRE_AFTER_MINUTES} minutes`);
}

async function expireUnpaidOrders() {
  const cutoff = new Date(Date.now() - EXPIRE_AFTER_MINUTES * 60 * 1000);
  const stale = await prisma.order.findMany({
    // Cash on delivery orders are unpaid by design until delivery — never expire them.
    where: { paid: false, status: "PENDING", paymentMethod: "PAYSTACK", createdAt: { lt: cutoff } },
    include: { items: true },
    take: 50,
  });
  for (const order of stale) {
    try {
      await expireOne(order);
    } catch (err) {
      console.error(`Failed to expire order ${order.id}:`, err);
    }
  }
}

function startExpireUnpaidOrdersJob() {
  const run = () => expireUnpaidOrders().catch((err) => console.error("Order expiry job failed:", err));
  run();
  setInterval(run, RUN_EVERY_MINUTES * 60 * 1000).unref();
}

module.exports = { startExpireUnpaidOrdersJob, expireUnpaidOrders };
