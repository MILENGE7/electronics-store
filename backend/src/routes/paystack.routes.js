const express = require("express");
const prisma = require("../config/db");
const { checkTransaction, markOrderPaid, isValidWebhookSignature } = require("../services/payments");

const router = express.Router();

// Paystack calls this server-to-server when a payment completes, so an order
// still gets marked paid if the customer closes the tab or loses signal
// before the browser's own verify-payment call runs.
// Set the URL in Paystack: Settings -> API Keys & Webhooks ->
//   https://<your-api-host>/api/paystack/webhook
//
// Needs the raw body (the signature is an HMAC of the exact bytes sent), so
// it's mounted in index.js before express.json().
router.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  if (!isValidWebhookSignature(req.body, req.headers["x-paystack-signature"])) {
    return res.sendStatus(401);
  }

  let event;
  try {
    event = JSON.parse(req.body.toString("utf8"));
  } catch {
    return res.sendStatus(400);
  }

  if (event.event !== "charge.success") return res.sendStatus(200);

  try {
    const tx = event.data;
    const order = await prisma.order.findUnique({ where: { id: String(tx?.reference) } });
    if (!order) return res.sendStatus(200); // not one of ours

    const problem = checkTransaction(order, tx);
    if (problem) {
      console.warn(`Paystack webhook rejected for order ${order.id}: ${problem}`);
      return res.sendStatus(200);
    }

    await markOrderPaid(order.id, tx.reference);
    res.sendStatus(200);
  } catch (err) {
    // A non-2xx makes Paystack retry later, which is what we want for a DB hiccup.
    console.error("Paystack webhook error:", err);
    res.sendStatus(500);
  }
});

module.exports = router;
