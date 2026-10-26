-- Adds cash on delivery as a payment option. Existing orders were all
-- Paystack orders, so they take the default.
CREATE TYPE "PaymentMethod" AS ENUM ('PAYSTACK', 'CASH_ON_DELIVERY');

ALTER TABLE "Order" ADD COLUMN "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'PAYSTACK';
