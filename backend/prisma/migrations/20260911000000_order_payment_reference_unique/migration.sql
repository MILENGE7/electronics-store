-- Prevent the same Paystack payment reference from ever being applied to
-- more than one order (defense in depth alongside the application-level
-- check in order.controller.js#verifyPayment that pins reference === order.id).
CREATE UNIQUE INDEX "Order_paymentReference_key" ON "Order"("paymentReference");
