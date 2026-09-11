// Derives notification-like entries entirely from REAL customer data — there
// is no backend notification table (confirmed by inspecting the Prisma
// schema and every controller), so nothing here is invented. Order
// notifications come from Order.status/paid/createdAt/updatedAt; wishlist
// notifications come from a product's real current stock. IDs are
// deterministic (derived from real record ids + real state), never random,
// so read-state can be matched reliably across reloads.

import { formatProductName } from "./format";

const ORDER_STATUS_COPY = {
  PENDING: { title: "Order awaiting payment", verb: "is awaiting payment", severity: "warning" },
  PROCESSING: { title: "Order processing", verb: "is being processed", severity: "info" },
  SHIPPED: { title: "Order shipped", verb: "has been shipped", severity: "info" },
  DELIVERED: { title: "Order delivered", verb: "has been delivered", severity: "success" },
  CANCELLED: { title: "Order cancelled", verb: "was cancelled", severity: "warning" },
  REFUNDED: { title: "Order refunded", verb: "was refunded", severity: "warning" },
};

// One status notification per order (its current real status) plus, for
// orders still in play, a separate payment notification driven by the real
// `paid` boolean — never a fabricated transaction id or gateway detail.
//
// KNOWN BACKEND LIMITATION (found & reported, not fixed here per product
// decision): `Order.paid` is declared in schema.prisma but was never
// migrated to the live database, so the API never actually returns it —
// `order.paid` is always undefined in practice. This branch is left intact
// (harmless, and it will start working automatically if that migration is
// ever added) but today only the "payment pending" case can ever fire.
export function getOrderNotifications(orders) {
  const notifications = [];

  orders.forEach((order) => {
    const shortId = order.id.slice(0, 8).toUpperCase();
    const timestamp = order.updatedAt || order.createdAt || null;
    const copy = ORDER_STATUS_COPY[order.status];

    notifications.push({
      id: `order-status-${order.id}-${order.status}`,
      type: "order",
      category: "orders",
      title: copy ? copy.title : "Order update",
      message: copy ? `Order #${shortId} ${copy.verb}.` : `Order #${shortId} status updated.`,
      timestamp,
      orderId: order.id,
      severity: copy ? copy.severity : "info",
    });

    const isSettled = order.status === "CANCELLED" || order.status === "REFUNDED";
    if (!isSettled) {
      if (order.paid === true) {
        notifications.push({
          id: `order-payment-${order.id}-paid`,
          type: "payment",
          category: "payments",
          title: "Payment confirmed",
          message: `Payment for order #${shortId} was confirmed.`,
          timestamp,
          orderId: order.id,
          severity: "success",
        });
      } else if (order.status === "PENDING") {
        notifications.push({
          id: `order-payment-${order.id}-pending`,
          type: "payment",
          category: "payments",
          title: "Payment pending",
          message: `Payment is still pending for order #${shortId}.`,
          timestamp,
          orderId: order.id,
          severity: "warning",
        });
      }
    }
  });

  return notifications;
}

const LOW_STOCK_THRESHOLD = 5;

// No historical stock/price log exists, so this is always a live snapshot
// (timestamp: null, never "just now") — never a claim that stock changed at
// a specific time, and never a price-drop claim (no price history exists).
export function getWishlistNotifications(products) {
  return products
    .filter((p) => p.stock <= 0 || p.stock <= LOW_STOCK_THRESHOLD)
    .map((p) => {
      const outOfStock = p.stock <= 0;
      // Matches ProductCard/Wishlist's convention: the product name alone,
      // never brand+name concatenated (a product's name commonly already
      // starts with its brand, e.g. "JBL SPEAKER" with brand "JBL" — joining
      // both produced a visibly duplicated "JBL JBL Speaker").
      const displayName = formatProductName(p.name);
      return {
        id: `wishlist-stock-${p.id}-${outOfStock ? "out" : "low"}`,
        type: "wishlist",
        category: "wishlist",
        title: outOfStock ? "Out of stock" : "Low stock",
        message: outOfStock
          ? `${displayName} in your wishlist is currently out of stock.`
          : `Only ${p.stock} left of ${displayName} in your wishlist.`,
        timestamp: null,
        productId: p.id,
        severity: outOfStock ? "warning" : "info",
      };
    });
}

// Real timestamps first (newest first); undated entries (wishlist stock
// snapshots) sort after everything that has a genuine date.
export function sortNotifications(list) {
  return [...list].sort((a, b) => {
    if (a.timestamp && b.timestamp) return new Date(b.timestamp) - new Date(a.timestamp);
    if (a.timestamp) return -1;
    if (b.timestamp) return 1;
    return 0;
  });
}

const READ_STORAGE_KEY = "fk_notification_read";

export function loadReadIds() {
  try {
    const raw = localStorage.getItem(READ_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id) => typeof id === "string" && id.trim().length > 0));
  } catch {
    return new Set();
  }
}

export function saveReadIds(idsSet) {
  try {
    localStorage.setItem(READ_STORAGE_KEY, JSON.stringify([...idsSet]));
  } catch {
    // localStorage unavailable — read state just won't persist
  }
}
