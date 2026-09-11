import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../api/client";
import { useAuth } from "./AuthContext";
import { useWishlist } from "./WishlistContext";
import { getOrderNotifications, getWishlistNotifications, sortNotifications, loadReadIds, saveReadIds } from "../utils/notifications";

const NotificationsContext = createContext(null);

// Orders and wishlist-product data are fetched once per login (not on every
// route change, not polled) and cached here — the navbar badge and the
// /notifications page both read from this single source instead of each
// fetching their own copy.
export function NotificationsProvider({ children }) {
  const { user } = useAuth();
  const { ids: wishlistIds } = useWishlist();
  const wishlistIdsKey = [...wishlistIds].sort().join(",");

  const [orders, setOrders] = useState([]);
  const [ordersLoaded, setOrdersLoaded] = useState(false);
  const [ordersError, setOrdersError] = useState(false);
  const [ordersRetryKey, setOrdersRetryKey] = useState(0);

  const [wishlistProducts, setWishlistProducts] = useState([]);

  const [readIds, setReadIds] = useState(loadReadIds);

  useEffect(() => {
    if (!user) {
      setOrders([]);
      setOrdersLoaded(false);
      setOrdersError(false);
      return undefined;
    }
    let cancelled = false;
    setOrdersError(false);
    api
      .get("/orders/mine")
      .then((res) => {
        if (!cancelled) {
          setOrders(res.data);
          setOrdersLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) setOrdersError(true);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, ordersRetryKey]);

  useEffect(() => {
    if (!user || wishlistIds.size === 0) {
      setWishlistProducts([]);
      return undefined;
    }
    let cancelled = false;
    Promise.all(
      [...wishlistIds].map((id) =>
        api
          .get(`/products/${id}`)
          .then((res) => res.data)
          .catch(() => null)
      )
    ).then((results) => {
      if (!cancelled) setWishlistProducts(results.filter(Boolean));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, wishlistIdsKey]);

  const notifications = useMemo(
    () => sortNotifications([...getOrderNotifications(orders), ...getWishlistNotifications(wishlistProducts)]),
    [orders, wishlistProducts]
  );

  const notificationIdsKey = notifications.map((n) => n.id).join(",");

  // Read-state cleanup: an id whose underlying order/stock state has since
  // moved on (e.g. PENDING -> PROCESSING) no longer appears in the current
  // list — drop it rather than let it accumulate forever.
  useEffect(() => {
    if (!ordersLoaded) return;
    setReadIds((prev) => {
      const current = new Set(notificationIdsKey ? notificationIdsKey.split(",") : []);
      const cleaned = new Set([...prev].filter((id) => current.has(id)));
      return cleaned.size === prev.size ? prev : cleaned;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ordersLoaded, notificationIdsKey]);

  useEffect(() => {
    saveReadIds(readIds);
  }, [readIds]);

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  function markRead(id) {
    setReadIds((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
  }

  function markAllRead() {
    setReadIds(new Set(notifications.map((n) => n.id)));
  }

  function refresh() {
    setOrdersRetryKey((k) => k + 1);
  }

  return (
    <NotificationsContext.Provider
      value={{ notifications, unreadCount, readIds, markRead, markAllRead, ordersLoaded, ordersError, refresh }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationsContext);
}
