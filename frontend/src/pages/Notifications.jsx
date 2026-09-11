import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useNotifications } from "../context/NotificationsContext";
import "../components/Skeletons.css";
import "./Notifications.css";

function BellIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" strokeLinecap="round" />
    </svg>
  );
}

function OrderIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M4 5h16v11H8l-4 4z" strokeLinejoin="round" />
      <path d="M8 10h8M8 13h5" strokeLinecap="round" />
    </svg>
  );
}

function PaymentIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18" />
    </svg>
  );
}

function WishlistIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path
        d="M12 20.5s-7.5-4.6-10-9.3C.4 8 1.8 4.5 5.2 3.6c2-.5 4 .3 5.3 2 1.3-1.7 3.3-2.5 5.3-2 3.4.9 4.8 4.4 3.2 7.6-2.5 4.7-10 9.3-10 9.3z"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const TYPE_ICON = { order: OrderIcon, payment: PaymentIcon, wishlist: WishlistIcon };

const FILTERS = [
  { key: "all", label: "All" },
  { key: "orders", label: "Orders" },
  { key: "payments", label: "Payments" },
  { key: "wishlist", label: "Wishlist" },
];

function NotificationSkeleton() {
  return (
    <li className="notification-card skeleton-card" aria-hidden="true">
      <span className="skeleton-shimmer" style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <span className="skeleton-line skeleton-shimmer" style={{ width: "40%", height: 12, display: "block" }} />
        <span className="skeleton-line skeleton-shimmer" style={{ width: "70%", height: 10, display: "block", marginTop: 8 }} />
      </div>
    </li>
  );
}

function formatTimestamp(ts) {
  if (!ts) return null;
  return new Date(ts).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function Notifications() {
  const { notifications, unreadCount, readIds, markRead, markAllRead, ordersLoaded, ordersError, refresh } = useNotifications();
  const [activeFilter, setActiveFilter] = useState("all");

  const availableCategories = useMemo(() => new Set(notifications.map((n) => n.category)), [notifications]);
  const visibleFilters = FILTERS.filter((f) => f.key === "all" || availableCategories.has(f.key));

  const filtered = activeFilter === "all" ? notifications : notifications.filter((n) => n.category === activeFilter);

  return (
    <div className="page-main notifications-page">
      <div className="notifications-header">
        <div>
          <h1>Notifications</h1>
          {ordersLoaded && !ordersError && (
            <p className="notifications-subtitle" role="status" aria-live="polite">
              {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <button type="button" className="btn btn-outline" onClick={markAllRead}>
            Mark all as read
          </button>
        )}
      </div>

      {ordersError ? (
        <div className="state-error">
          <p>Unable to load your notifications.</p>
          <button type="button" className="btn btn-outline" onClick={refresh}>
            Try Again
          </button>
        </div>
      ) : !ordersLoaded ? (
        <ul className="notifications-list">
          <NotificationSkeleton />
          <NotificationSkeleton />
          <NotificationSkeleton />
        </ul>
      ) : notifications.length === 0 ? (
        <div className="notifications-empty">
          <span className="notifications-empty-icon" aria-hidden="true">
            <BellIcon />
          </span>
          <h2>You're all caught up.</h2>
          <p>Important account and order updates will appear here.</p>
        </div>
      ) : (
        <>
          {visibleFilters.length > 2 && (
            <div className="notifications-filters" role="tablist" aria-label="Filter notifications">
              {visibleFilters.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  role="tab"
                  aria-selected={activeFilter === f.key}
                  className={`notifications-filter-btn ${activeFilter === f.key ? "active" : ""}`}
                  onClick={() => setActiveFilter(f.key)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}

          <ul className="notifications-list">
            {filtered.map((n) => {
              const Icon = TYPE_ICON[n.type] || OrderIcon;
              const isRead = readIds.has(n.id);
              const ts = formatTimestamp(n.timestamp);
              return (
                <li key={n.id} className={`notification-card severity-${n.severity} ${isRead ? "read" : "unread"}`}>
                  <span className={`notification-icon icon-${n.severity}`} aria-hidden="true">
                    <Icon />
                  </span>
                  <div className="notification-body">
                    <div className="notification-title-row">
                      <h3>{n.title}</h3>
                      {!isRead && (
                        <span className="notification-dot" aria-label="Unread" title="Unread" />
                      )}
                    </div>
                    <p className="notification-message">{n.message}</p>
                    <div className="notification-meta">
                      {ts && <span className="notification-timestamp">{ts}</span>}

                      {n.orderId && (
                        <Link to={`/orders/${n.orderId}`} className="notification-action" onClick={() => markRead(n.id)}>
                          View Order
                        </Link>
                      )}

                      {n.productId && (
                        <Link to={`/products/${n.productId}`} className="notification-action" onClick={() => markRead(n.id)}>
                          View Product
                        </Link>
                      )}

                      {!isRead && (
                        <button type="button" className="notification-mark-read" onClick={() => markRead(n.id)}>
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
