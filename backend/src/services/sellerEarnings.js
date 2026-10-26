const prisma = require("../config/db");

// Money is tracked in whole RWF; round once per line so totals add up the
// same way everywhere they're shown.
const round = (n) => Math.round(n);

// A seller's money, from the order items snapshotted at sale time:
//   earned   — delivered and paid orders, after FK Trading's commission
//   pending  — orders still on their way (not yet earned)
//   paidOut  — payouts the admin has recorded
//   balance  — earned − paidOut, i.e. what FK Trading currently owes them
async function getSellerEarnings(sellerIds) {
  const ids = Array.isArray(sellerIds) ? sellerIds : [sellerIds];
  const result = Object.fromEntries(
    ids.map((id) => [id, { gross: 0, commission: 0, earned: 0, pending: 0, paidOut: 0, balance: 0, unitsSold: 0 }])
  );

  const items = await prisma.orderItem.findMany({
    where: { sellerId: { in: ids }, order: { status: { in: ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED"] } } },
    select: {
      sellerId: true,
      quantity: true,
      price: true,
      commissionPercent: true,
      order: { select: { status: true, paid: true } },
    },
  });

  for (const item of items) {
    const r = result[item.sellerId];
    const gross = Number(item.price) * item.quantity;
    const commission = round((gross * Number(item.commissionPercent)) / 100);
    const net = round(gross) - commission;

    if (item.order.status === "DELIVERED" && item.order.paid) {
      r.gross += round(gross);
      r.commission += commission;
      r.earned += net;
      r.unitsSold += item.quantity;
    } else if (item.order.status !== "DELIVERED") {
      r.pending += net;
    }
  }

  const payouts = await prisma.payout.groupBy({
    by: ["sellerId"],
    where: { sellerId: { in: ids } },
    _sum: { amount: true },
  });
  for (const p of payouts) result[p.sellerId].paidOut = round(Number(p._sum.amount || 0));

  for (const r of Object.values(result)) r.balance = r.earned - r.paidOut;

  return Array.isArray(sellerIds) ? result : result[sellerIds];
}

module.exports = { getSellerEarnings };
