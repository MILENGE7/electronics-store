const crypto = require("crypto");
const prisma = require("../config/db");

const PAYSTACK_BASE = "https://api.paystack.co";
const STORE_CURRENCY = "RWF";

// Online payment is offered only once a real Paystack secret key is set
// (not empty, not the .env.example placeholder).
function isOnlinePaymentEnabled() {
  const key = process.env.PAYSTACK_SECRET_KEY || "";
  return key.startsWith("sk_") && !key.includes("xxx");
}

// Looks a transaction up on Paystack by reference.
// Returns { found: true, data } / { found: false } for a definite answer, and
// throws for anything inconclusive (network error, Paystack outage, bad key)
// so callers never treat "couldn't ask" as "wasn't paid".
async function fetchTransaction(reference) {
  const res = await fetch(`${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
  });
  if (res.status === 400 || res.status === 404) return { found: false };
  if (!res.ok) throw new Error(`Paystack verify failed with HTTP ${res.status}`);
  const body = await res.json();
  return { found: true, data: body.data };
}

// Checks a Paystack transaction against the order it claims to pay for.
// Returns an error message, or null when it's a valid, complete payment.
function checkTransaction(order, tx) {
  if (tx?.status !== "success") return "Payment could not be verified";
  // The reference handed out for an order IS order.id (see createOrder), so a
  // payment for one order can never be replayed against another.
  if (tx.reference !== order.id) return "Payment reference does not match this order";
  // Currency matters as much as amount: the popup is configured client-side,
  // so a tampered page could pay "5000" in a cheaper currency.
  if (tx.currency !== STORE_CURRENCY) return "Payment currency does not match";
  if (tx.amount !== Math.round(Number(order.total) * 100)) return "Paid amount does not match order total";
  return null;
}

// Marks an order paid. Safe to call more than once and from several places
// at the same time (customer verify, webhook, expiry job): only the first
// call that flips `paid` does anything.
//
// If the order had already been auto-cancelled for non-payment (and its stock
// released), the stock is reserved again and the order revived. If that stock
// has since been sold, the order stays CANCELLED but paid — the admin orders
// page flags that combination as needing a refund.
async function markOrderPaid(orderId, reference) {
  try {
    return await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
      const flipped = await tx.order.updateMany({
        where: { id: orderId, paid: false },
        data: { paid: true, paymentReference: reference },
      });
      if (flipped.count === 0) return tx.order.findUnique({ where: { id: orderId } });

      if (order.status === "CANCELLED") {
        for (const item of order.items) {
          const reserved = await tx.product.updateMany({
            where: { id: item.productId, stock: { gte: item.quantity } },
            data: { stock: { decrement: item.quantity } },
          });
          if (reserved.count === 0) throw Object.assign(new Error("restock failed"), { restockFailed: true });
        }
      }

      const nextStatus = order.status === "PENDING" || order.status === "CANCELLED" ? "PROCESSING" : order.status;
      return tx.order.update({ where: { id: orderId }, data: { status: nextStatus } });
    });
  } catch (err) {
    if (!err.restockFailed) throw err;
    console.warn(`Order ${orderId} was paid after auto-cancellation but stock is gone — needs a refund`);
    return prisma.order.update({ where: { id: orderId }, data: { paid: true, paymentReference: reference } });
  }
}

// Validates the x-paystack-signature header against the raw request body.
function isValidWebhookSignature(rawBody, signature) {
  if (!signature || !process.env.PAYSTACK_SECRET_KEY) return false;
  const expected = crypto.createHmac("sha512", process.env.PAYSTACK_SECRET_KEY).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = { isOnlinePaymentEnabled, fetchTransaction, checkTransaction, markOrderPaid, isValidWebhookSignature, STORE_CURRENCY };
