import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/client";
import { useAuth } from "../../context/AuthContext";
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
  { to: "/admin/products", label: "Products", desc: "Add, edit, and manage your catalog.", Icon: ProductsIcon, statKey: "products", tone: "blue" },
  { to: "/admin/categories", label: "Categories", desc: "Organize products into categories.", Icon: CategoriesIcon, statKey: "categories", tone: "violet" },
  { to: "/admin/orders", label: "Orders", desc: "Track and update customer orders.", Icon: OrdersIcon, statKey: "orders", tone: "gold" },
  { to: "/admin/security", label: "Security", desc: "Manage two-factor authentication.", Icon: SecurityIcon, statKey: null, tone: "green" },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ products: null, categories: null, orders: null, pendingOrders: null });

  useEffect(() => {
    let cancelled = false;

    api
      .get("/products", { params: { limit: 1 } })
      .then((res) => { if (!cancelled) setStats((s) => ({ ...s, products: res.data.total })); })
      .catch(() => {});

    api
      .get("/categories")
      .then((res) => { if (!cancelled) setStats((s) => ({ ...s, categories: res.data.length })); })
      .catch(() => {});

    api
      .get("/orders")
      .then((res) => {
        if (cancelled) return;
        const orders = res.data;
        const pending = orders.filter((o) => o.status === "PENDING").length;
        setStats((s) => ({ ...s, orders: orders.length, pendingOrders: pending }));
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, []);

  const firstName = user?.name ? user.name.trim().split(/\s+/)[0] : null;

  return (
    <div className="page-main admin-dashboard">
      <img src="/logo.webp?v=fktrading1" alt="" aria-hidden="true" className="admin-dashboard-watermark" />

      <div className="admin-dashboard-hero">
        <div className="admin-dashboard-hero-glow" aria-hidden="true" />
        <p className="admin-dashboard-eyebrow">FK Trading · Admin</p>
        <h1>Welcome back{firstName ? `, ${firstName}` : ""}.</h1>
        <p className="admin-dashboard-sub">Here's a quick look at your store. Pick a section below to get to work.</p>
      </div>

      {stats.pendingOrders !== null && stats.pendingOrders > 0 && (
        <Link to="/admin/orders" className="admin-dashboard-alert">
          <AlertIcon />
          <span>
            <strong>{stats.pendingOrders}</strong> order{stats.pendingOrders === 1 ? " is" : "s are"} awaiting processing
          </span>
        </Link>
      )}

      <div className="admin-dashboard-grid">
        {CARDS.map(({ to, label, desc, Icon, statKey, tone }) => (
          <Link to={to} key={to} className={`admin-dash-card tone-${tone}`}>
            <span className="admin-dash-card-icon">
              <Icon />
            </span>

            <div className="admin-dash-card-body">
              <h2>{label}</h2>
              <p>{desc}</p>
            </div>

            {statKey && stats[statKey] !== null && (
              <span className="admin-dash-card-stat">{stats[statKey]}</span>
            )}

            <span className="admin-dash-card-arrow" aria-hidden="true">→</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
