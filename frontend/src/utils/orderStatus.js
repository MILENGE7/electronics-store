// Maps the real backend OrderStatus enum (see backend/prisma/schema.prisma)
// to display labels and badge styling. Payment success/failure is tracked
// separately via Order.paid — it is not part of this enum — and is always
// read from that real field wherever it's shown, never inferred.

const STATUS_LABELS = {
  PENDING: "Pending",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

export function orderStatusLabel(status) {
  return STATUS_LABELS[status] || status;
}

// A lowercase token for CSS class hooks — falls back to a generic class for
// any status value not in the known enum, so an unrecognized value still
// renders (just unstyled/neutral) instead of breaking.
export function orderStatusClass(status) {
  return STATUS_LABELS[status] ? status.toLowerCase() : "unknown";
}

const FORWARD_STAGES = ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED"];
const INTERRUPTED_STATUSES = new Set(["CANCELLED", "REFUNDED"]);

// Builds the ordered timeline for a single order from its real status + paid
// fields only. Cancelled/refunded orders get their own short, honest
// timeline rather than being force-fit into the delivery chain — there's no
// stored history of which stage they reached before being cancelled, so we
// never claim Processing/Shipped/Delivered happened for them.
export function getOrderTimeline(order) {
  if (INTERRUPTED_STATUSES.has(order.status)) {
    return {
      interrupted: true,
      stages: [
        { key: "PLACED", label: "Order Placed", done: true },
        { key: "PAYMENT", label: "Payment", done: order.paid === true },
        { key: "END", label: orderStatusLabel(order.status), done: true },
      ],
    };
  }

  const currentIndex = FORWARD_STAGES.indexOf(order.status);
  const reached = (stage) => currentIndex >= FORWARD_STAGES.indexOf(stage);

  return {
    interrupted: false,
    stages: [
      { key: "PLACED", label: "Order Placed", done: true },
      { key: "PAYMENT", label: "Payment", done: order.paid === true },
      { key: "PROCESSING", label: "Processing", done: reached("PROCESSING") },
      { key: "SHIPPED", label: "Shipped", done: reached("SHIPPED") },
      { key: "DELIVERED", label: "Delivered", done: reached("DELIVERED") },
    ],
  };
}
