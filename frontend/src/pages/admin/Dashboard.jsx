import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import SalesChart from "../../components/SalesChart";
import { formatRWF } from "../../utils/currency";
import "../../styles/dashboard.css";
import "./Dashboard.css";

function ProductsIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M3 9l1.5-5h15L21 9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 9h18v11H3z" strokeLinejoin="round" />
      <path d="M9 13a3 3 0 0 0 6 0" strokeLinecap="round" />
    </svg>
  );
}

function CategoriesIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="8" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
      <rect x="13" y="13" width="8" height="8" rx="1.5" />
    </svg>
  );
}

function OrdersIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M4 5h16v11H8l-4 4z" strokeLinejoin="round" />
      <path d="M8 10h8M8 13h5" strokeLinecap="round" />
    </svg>
  );
}

function SellersIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" strokeLinecap="round" />
      <path d="M16 4.5a3.2 3.2 0 0 1 0 6.4M18 14.4c1.8.8 3 2.7 3 4.8" strokeLinecap="round" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" strokeLinecap="round" />
      <circle cx="16" cy="6" r="2" />
      <circle cx="10" cy="12" r="2" />
      <circle cx="18" cy="18" r="2" />
    </svg>
  );
}

function SecurityIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M12 3l8 3v5c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6z" />
      <path d="M8.5 12l2.2 2.2 4.8-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M12 9v4M12 17h.01" strokeLinecap="round" />
      <path d="M10.3 3.9L2.4 18a1.6 1.6 0 0 0 1.4 2.4h16.4a1.6 1.6 0 0 0 1.4-2.4L13.7 3.9a1.6 1.6 0 0 0-2.8 0z" strokeLinejoin="round" />
    </svg>
  );
}

const CARDS = [
  { to: "/admin/products", label: "Products", desc: "Add, edit, and restock your catalog.", Icon: ProductsIcon, tone: "blue" },
  { to: "/admin/categories", label: "Categories", desc: "Organize products into categories.", Icon: CategoriesIcon, tone: "violet" },
  { to: "/admin/orders", label: "Orders", desc: "Find, process and print customer orders.", Icon: OrdersIcon, tone: "gold" },
  { to: "/admin/sellers", label: "Sellers", desc: "Approve sellers and record their payouts.", Icon: SellersIcon, tone: "violet" },
  { to: "/admin/settings", label: "Settings", desc: "Commission, stock alerts and delivery fees.", Icon: SettingsIcon, tone: "blue" },
  { to: "/admin/security", label: "Security", desc: "Manage two-factor authentication.", Icon: SecurityIcon, tone: "green" },
];

const PERIODS = [
  { key: "today", label: "Today" },
  { key: "week", label: "Last 7 days" },
  { key: "month", label: "Last 30 days" },
];

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loadError, setLoadError] = useState(false);

  function load() {
    setLoadError(false);
    api
      .get("/admin/stats")
      .then((res) => setStats(res.data))
      .catch(() => setLoadError(true));
  }

  useEffect(load, []);

  const firstName = user?.name ? user.name.trim().split(/\s+/)[0] : null;

  return (
    <div className="page-main admin-dashboard">
      <img src="/logo.webp?v=fktrading1" alt="" aria-hidden="true" className="admin-dashboard-watermark" />

      <div className="admin-dashboard-hero">
        <div className="admin-dashboard-hero-glow" aria-hidden="true" />
        <p className="admin-dashboard-eyebrow">FK Trading · Admin</p>
        <h1>Welcome back{firstName ? `, ${firstName}` : ""}.</h1>
        <p className="admin-dashboard-sub">Here&apos;s how the store is doing.</p>
      </div>

      {loadError && (
        <p className="form-error" style={{ marginBottom: "1.5rem" }}>
          Couldn&apos;t load store figures.{" "}
          <button type="button" className="btn btn-outline" onClick={load}>
            Try Again
          </button>
        </p>
      )}

      {stats && (
        <>
          <div className="dash-actions" style={{ marginBottom: "1.6rem" }}>
            {stats.needsAction > 0 && (
              <Link to="/admin/orders?status=PROCESSING" className="admin-dashboard-alert" style={{ marginBottom: 0 }}>
                <AlertIcon />
                <span>
                  <strong>{stats.needsAction}</strong> {stats.needsAction === 1 ? "order needs" : "orders need"} processing
                </span>
              </Link>
            )}
            {stats.pendingSellerApplications > 0 && (
              <Link to="/admin/sellers?status=PENDING" className="admin-dashboard-alert" style={{ marginBottom: 0 }}>
                <AlertIcon />
                <span>
                  <strong>{stats.pendingSellerApplications}</strong>{" "}
                  {stats.pendingSellerApplications === 1 ? "seller application" : "seller applications"} waiting
                </span>
              </Link>
            )}
            {stats.lowStock.length > 0 && (
              <a href="#low-stock" className="admin-dashboard-alert" style={{ marginBottom: 0 }}>
                <AlertIcon />
                <span>
                  <strong>{stats.lowStock.length}</strong> {stats.lowStock.length === 1 ? "product is" : "products are"} low on
                  stock
                </span>
              </a>
            )}
          </div>

          <div className="dash-stats">
            {PERIODS.map(({ key, label }) => (
              <div className="dash-stat" key={key}>
                <span className="dash-stat-label">{label}</span>
                <span className="dash-stat-value">{formatRWF(stats.period[key].sales)}</span>
                <span className="dash-stat-note">
                  {plural(stats.period[key].orders, "order")} · {formatRWF(stats.period[key].collected)} collected
                </span>
              </div>
            ))}
            <div className="dash-stat">
              <span className="dash-stat-label">Commission earned</span>
              <span className="dash-stat-value">{formatRWF(stats.commissionEarned)}</span>
              <span className="dash-stat-note">from seller sales, all time</span>
            </div>
            <div className="dash-stat">
              <span className="dash-stat-label">Customers</span>
              <span className="dash-stat-value">{stats.customers}</span>
            </div>
          </div>

          <section className="dash-section">
            <div className="dash-section-head">
              <h2>Daily sales · last 30 days</h2>
              <Link to="/admin/orders">All orders →</Link>
            </div>
            <SalesChart data={stats.series} />
          </section>

          <div className="dash-columns">
            <section className="dash-section">
              <h2>Best sellers · last 30 days</h2>
              {stats.topProducts.length === 0 ? (
                <p className="dash-empty">No sales yet.</p>
              ) : (
                <ol className="dash-list">
                  {stats.topProducts.map((p) => (
                    <li key={p.id}>
                      {p.images?.[0] ? <img className="dash-thumb" src={p.images[0]} alt="" /> : <span className="dash-thumb" />}
                      <span className="dash-list-main">
                        <strong>{p.name}</strong>
                        <span>{formatRWF(p.price)}</span>
                      </span>
                      <span>{p.unitsSold} sold</span>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <section className="dash-section" id="low-stock">
              <div className="dash-section-head">
                <h2>Low stock (≤ {stats.lowStockThreshold})</h2>
                <Link to="/admin/products?filter=low-stock">Restock →</Link>
              </div>
              {stats.lowStock.length === 0 ? (
                <p className="dash-empty">Everything is well stocked.</p>
              ) : (
                <ul className="dash-list">
                  {stats.lowStock.map((p) => (
                    <li key={p.id}>
                      {p.images?.[0] ? <img className="dash-thumb" src={p.images[0]} alt="" /> : <span className="dash-thumb" />}
                      <span className="dash-list-main">
                        <strong>{p.name}</strong>
                        <span>{p.seller ? `Sold by ${p.seller.businessName}` : "FK Trading"}</span>
                      </span>
                      <span className={`badge ${p.stock === 0 ? "badge-red" : "badge-amber"}`}>
                        {p.stock === 0 ? "Out of stock" : `${p.stock} left`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}

      <div className="admin-dashboard-grid" style={{ marginTop: "2rem" }}>
        {CARDS.map(({ to, label, desc, Icon, tone }) => (
          <Link to={to} key={to} className={`admin-dash-card tone-${tone}`}>
            <span className="admin-dash-card-icon">
              <Icon />
            </span>

            <div className="admin-dash-card-body">
              <h2>{label}</h2>
              <p>{desc}</p>
            </div>

            <span className="admin-dash-card-arrow" aria-hidden="true">→</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
