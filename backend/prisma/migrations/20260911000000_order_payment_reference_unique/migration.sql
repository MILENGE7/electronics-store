-- Corrects schema drift left over from the Stripe -> Paystack migration:
-- schema.prisma was updated (paymentIntentId -> paymentReference, added
-- `paid`, total widened to Decimal(12,2)) but no migration ever captured
-- those changes, so the committed migration history still created the old
-- Stripe-era columns. Brings the table in line with the current schema.prisma
-- before adding the uniqueness constraint this migration was originally for.
ALTER TABLE "Order" RENAME COLUMN "paymentIntentId" TO "paymentReference";
ALTER TABLE "Order" ADD COLUMN "paid" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Order" ALTER COLUMN "total" TYPE DECIMAL(12,2);

-- Prevent the same Paystack payment reference from ever being applied to
-- more than one order (defense in depth alongside the application-level
-- check in order.controller.js#verifyPayment that pins reference === order.id).
CREATE UNIQUE INDEX "Order_paymentReference_key" ON "Order"("paymentReference");
