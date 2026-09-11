import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { useNotifications } from "../context/NotificationsContext";
import { formatRWF } from "../utils/currency";
import { orderStatusLabel, orderStatusClass } from "../utils/orderStatus";
import RecentlyViewedSection from "../components/RecentlyViewedSection";
import "../components/Skeletons.css";
import "../pages/Home.css"; // RecentlyViewedSection relies on Home's .strip-* classes
import "../pages/Checkout.css"; // reuses .checkout-field/.checkout-field-error for the edit form
import "./Account.css";

const RECENT_ORDERS_LIMIT = 4;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function OrdersIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M4 5h16v11H8l-4 4z" strokeLinejoin="round" />
      <path d="M8 10h8M8 13h5" strokeLinecap="round" />
    </svg>
  );
}

function WishlistIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path
        d="M12 20.5s-7.5-4.6-10-9.3C.4 8 1.8 4.5 5.2 3.6c2-.5 4 .3 5.3 2 1.3-1.7 3.3-2.5 5.3-2 3.4.9 4.8 4.4 3.2 7.6-2.5 4.7-10 9.3-10 9.3z"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M3 4h2l2.4 12.2a2 2 0 0 0 2 1.6h8a2 2 0 0 0 2-1.6L21 8H6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="10" cy="21" r="1.3" />
      <circle cx="18" cy="21" r="1.3" />
    </svg>
  );
}

function ShopIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M3 9l1.5-5h15L21 9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 9h18v11H3z" strokeLinejoin="round" />
      <path d="M9 13a3 3 0 0 0 6 0" strokeLinecap="round" />
    </svg>
  );
}

function CompareIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M8 3v14M8 17l-3.5-3.5M8 17l3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 21V7M16 7l-3.5 3.5M16 7l3.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <path d="M4 12.5l5 5L20 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StatCardSkeleton() {
  return (
    <div className="account-stat-card skeleton-card" aria-hidden="true">
      <span className="skeleton-line skeleton-shimmer" style={{ width: "50%", height: 26 }} />
      <span className="skeleton-line skeleton-shimmer" style={{ width: "70%", height: 10, marginTop: 10 }} />
    </div>
  );
}

function RecentOrderSkeleton() {
  return (
    <div className="account-recent-order skeleton-card" aria-hidden="true">
      <span className="skeleton-line skeleton-shimmer" style={{ width: "35%", height: 12 }} />
      <span className="skeleton-line skeleton-shimmer" style={{ width: "20%", height: 10, marginTop: 8 }} />
    </div>
  );
}

function HeaderSkeleton() {
  return (
    <div className="account-header skeleton-card" aria-hidden="true">
      <span className="skeleton-shimmer" style={{ width: 72, height: 72, borderRadius: "50%", flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <span className="skeleton-line skeleton-shimmer" style={{ width: "35%", height: 18, display: "block" }} />
        <span className="skeleton-line skeleton-shimmer" style={{ width: "45%", height: 12, display: "block", marginTop: 10 }} />
      </div>
    </div>
  );
}

export default function Account() {
  const { user, logout, updateUser } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const { items: cartItems } = useCart();
  const { ids: wishlistIds } = useWishlist();
  const { unreadCount } = useNotifications();

  const [me, setMe] = useState(null);
  const [meError, setMeError] = useState(false);
  const [meRetryKey, setMeRetryKey] = useState(0);

  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setMeError(false);
    api
      .get("/auth/me")
      .then((res) => setMe(res.data))
      .catch(() => setMeError(true));
  }, [meRetryKey]);

  useEffect(() => {
    setOrdersLoading(true);
    setOrdersError(false);
    api
      .get("/orders/mine")
      .then((res) => setOrders(res.data))
      .catch(() => setOrdersError(true))
      .finally(() => setOrdersLoading(false));
  }, []);

  const stats = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter((o) => o.status === "PENDING").length;
    const completed = orders.filter((o) => o.status === "DELIVERED").length;
    return { total, pending, completed };
  }, [orders]);

  const recentOrders = orders.slice(0, RECENT_ORDERS_LIMIT);

  function startEdit() {
    setEditName(me.name);
    setEditEmail(me.email);
    setFieldErrors({});
    setSaveError("");
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setFieldErrors({});
    setSaveError("");
  }

  function validateEdit() {
    const errs = {};
    if (!editName.trim()) errs.name = "Full name is required.";
    if (!editEmail.trim()) errs.email = "Email is required.";
    else if (!EMAIL_RE.test(editEmail)) errs.email = "Please enter a valid email address.";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function saveEdit(e) {
    e.preventDefault();
    if (!validateEdit()) return;
    setSaving(true);
    setSaveError("");
    try {
      const { data } = await api.patch("/auth/me", { name: editName.trim(), email: editEmail.trim() });
      setMe(data);
      updateUser({ name: data.name, email: data.email });
      setEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err.response?.data?.error || "Something went wrong while saving your changes.");
    } finally {
      setSaving(false);
    }
  }

  const memberSince =
    me?.createdAt &&
    new Date(me.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "long" });

  return (
    <div className="page-main account-page">
      {meError ? (
        <div className="state-error">
          <p>Unable to load your account information.</p>
          <button type="button" className="btn btn-outline" onClick={() => setMeRetryKey((k) => k + 1)}>
            Try Again
          </button>
        </div>
      ) : !me ? (
        <HeaderSkeleton />
      ) : (
        <div className="account-header">
          <span className="account-avatar" aria-hidden="true">
            {getInitials(me.name)}
          </span>
          <div className="account-header-info">
            <h1>{me.name}</h1>
            <p className="account-header-email">{me.email}</p>
            <div className="account-header-meta">
              <span className="account-status-badge">
                <CheckIcon /> Active Account
              </span>
              {memberSince && <span className="account-member-since">Member since {memberSince}</span>}
            </div>
          </div>
        </div>
      )}

      <nav className="account-nav" aria-label="Account sections">
        {!isAdmin && <a href="#overview">Overview</a>}
        <a href="#personal-info">Personal Information</a>
        <a href="#security">Security</a>
        <a href="#addresses">Addresses</a>
      </nav>

      {/* Order/wishlist/cart stats and shopping shortcuts are a customer
          concern — an admin account has none of this activity, and every
          link here now redirects to /admin anyway (see CustomerRoute), so
          the whole block is skipped for admins rather than shown empty. */}
      {!isAdmin && (
      <>
      <section className="account-stats" aria-label="Account summary" id="overview">
        {ordersLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <Link to="/orders" className="account-stat-card account-stat-card-link">
              <span className="account-stat-value">{stats.total}</span>
              <span className="account-stat-label">Total Orders</span>
            </Link>
            <Link to="/orders" className="account-stat-card account-stat-card-link">
              <span className="account-stat-value">{stats.pending}</span>
              <span className="account-stat-label">Pending Orders</span>
            </Link>
            <Link to="/orders" className="account-stat-card account-stat-card-link">
              <span className="account-stat-value">{stats.completed}</span>
              <span className="account-stat-label">Completed Orders</span>
            </Link>
            <Link to="/wishlist" className="account-stat-card account-stat-card-link">
              <span className="account-stat-value">{wishlistIds.size}</span>
              <span className="account-stat-label">Wishlist Items</span>
            </Link>
          </>
        )}
      </section>

      <section className="account-section" aria-label="Quick actions">
        <h2>Quick Actions</h2>
        <div className="account-quickactions">
          <Link to="/orders" className="account-quickaction">
            <OrdersIcon />
            <span>My Orders</span>
          </Link>
          <Link to="/notifications" className="account-quickaction">
            <BellIcon />
            <span>Notifications{unreadCount > 0 ? ` (${unreadCount})` : ""}</span>
          </Link>
          <Link to="/wishlist" className="account-quickaction">
            <WishlistIcon />
            <span>Wishlist{wishlistIds.size > 0 ? ` (${wishlistIds.size})` : ""}</span>
          </Link>
          <Link to="/cart" className="account-quickaction">
            <CartIcon />
            <span>Shopping Cart{cartItems.length > 0 ? ` (${cartItems.reduce((n, i) => n + i.quantity, 0)})` : ""}</span>
          </Link>
          <Link to="/" className="account-quickaction">
            <ShopIcon />
            <span>Continue Shopping</span>
          </Link>
          <Link to="/compare" className="account-quickaction">
            <CompareIcon />
            <span>Compare Products</span>
          </Link>
        </div>
      </section>

      <section className="account-section">
        <div className="account-section-head">
          <h2>Recent Orders</h2>
          {orders.length > 0 && (
            <Link to="/orders" className="account-section-link">
              View all
            </Link>
          )}
        </div>

        {ordersError ? (
          <div className="state-error">
            <p>Unable to load your orders right now.</p>
          </div>
        ) : ordersLoading ? (
          <div className="account-recent-orders">
            <RecentOrderSkeleton />
            <RecentOrderSkeleton />
          </div>
        ) : orders.length === 0 ? (
          <div className="account-empty-inline">
            <p>No orders yet</p>
            <Link to="/" className="btn btn-primary">
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="account-recent-orders">
            {recentOrders.map((o) => {
              const itemCount = o.items.reduce((sum, i) => sum + i.quantity, 0);
              return (
                <Link to={`/orders/${o.id}`} className="account-recent-order" key={o.id}>
                  <div className="account-recent-order-main">
                    <span className="account-recent-order-id">#{o.id.slice(0, 8).toUpperCase()}</span>
                    <span className={`order-status-badge order-status-${orderStatusClass(o.status)}`}>
                      {orderStatusLabel(o.status)}
                    </span>
                  </div>
                  <span className="account-recent-order-meta">
                    {o.createdAt ? new Date(o.createdAt).toLocaleDateString() : ""} · {itemCount} item{itemCount === 1 ? "" : "s"}
                  </span>
                  <span className="price account-recent-order-total">{formatRWF(o.total)}</span>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <RecentlyViewedSection />
      </>
      )}

      <section className="account-section" id="personal-info">
        <div className="account-section-head">
          <h2>Personal Information</h2>
          {me && !editing && (
            <button type="button" className="account-section-link account-edit-btn" onClick={startEdit}>
              Edit Profile
            </button>
          )}
        </div>

        {meError ? (
          <div className="state-error">
            <p>Unable to load your account information.</p>
          </div>
        ) : !me ? (
          <p className="catalog-empty">Loading…</p>
        ) : editing ? (
          <form className="account-card account-edit-form" onSubmit={saveEdit} noValidate>
            <div className="checkout-field">
              <label htmlFor="acc-name">Full Name</label>
              <input
                id="acc-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                aria-invalid={!!fieldErrors.name}
                aria-describedby={fieldErrors.name ? "acc-name-error" : undefined}
                disabled={saving}
              />
              {fieldErrors.name && (
                <p className="checkout-field-error" id="acc-name-error">
                  {fieldErrors.name}
                </p>
              )}
            </div>

            <div className="checkout-field">
              <label htmlFor="acc-email">Email Address</label>
              <input
                id="acc-email"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                aria-invalid={!!fieldErrors.email}
                aria-describedby={fieldErrors.email ? "acc-email-error" : undefined}
                disabled={saving}
              />
              {fieldErrors.email && (
                <p className="checkout-field-error" id="acc-email-error">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            {saveError && (
              <p className="checkout-field-error" role="alert">
                {saveError}
              </p>
            )}

            <div className="account-edit-actions">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Saving…" : "Save Changes"}
              </button>
              <button type="button" className="btn btn-outline" onClick={cancelEdit} disabled={saving}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="account-card">
              <p className="account-label">Full Name</p>
              <p className="account-value">{me.name}</p>
              <p className="account-label">Email Address</p>
              <p className="account-value">{me.email}</p>
              <p className="account-label">Two-Factor Authentication</p>
              <p className="account-value">{me.twoFactorEnabled ? "Enabled" : "Not enabled"}</p>
            </div>
            <p className="account-save-success" role="status" aria-live="polite">
              {saveSuccess ? "Profile updated successfully." : ""}
            </p>
          </>
        )}
      </section>

      <section className="account-section" id="security">
        <h2>Security</h2>

        {me && (
          <>
            <div className="account-card">
              <p className="account-label">Two-Factor Authentication</p>
              <p className="account-value">
                <span className={`account-2fa-badge ${me.twoFactorEnabled ? "enabled" : "disabled"}`}>
                  {me.twoFactorEnabled ? "Enabled" : "Disabled"}
                </span>
              </p>
            </div>
            <p className="account-edit-note">
              Two-factor authentication settings are managed through your account security flow.
            </p>

            <h3 className="account-subheading">Password</h3>
            <p className="account-edit-note">Password changes aren't available yet.</p>

            <button type="button" className="btn btn-outline account-signout-btn" onClick={logout}>
              Sign Out
            </button>
          </>
        )}
      </section>

      <section className="account-section" id="addresses">
        <h2>Addresses</h2>

        {me && (
          <>
            {me.addresses?.length ? (
              <ul className="account-address-list">
                {me.addresses.map((a) => (
                  <li key={a.id} className="account-address-item">
                    <span>
                      {a.line1}
                      {a.line2 ? `, ${a.line2}` : ""}, {a.city}, {a.state} {a.postalCode}, {a.country}
                    </span>
                    {a.isDefault && <span className="account-address-default">Default</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="catalog-empty">No saved addresses yet — addresses you enter at checkout are used per-order.</p>
            )}
            <p className="account-edit-note">Address editing isn't available yet — this is on our roadmap.</p>
          </>
        )}
      </section>
    </div>
  );
}
