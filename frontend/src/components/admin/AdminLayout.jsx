import { NavLink, useLocation, useNavigate } from "react-router-dom";
import "./AdminLayout.css";

function BackIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M19 12H5M11 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const ADMIN_TABS = [
  { to: "/admin", label: "Dashboard", end: true },
  { to: "/admin/products", label: "Products" },
  { to: "/admin/categories", label: "Categories" },
  { to: "/admin/orders", label: "Orders" },
  { to: "/admin/security", label: "Security" },
];

// Shared sub-navigation for every admin page: a Back button that always
// returns to the dashboard hub, plus tabs for every other admin section so
// the admin never has to detour back through the hub just to jump from one
// feature to another.
export default function AdminLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const onDashboard = location.pathname === "/admin";

  return (
    <>
      <div className="admin-subnav">
        <div className="admin-subnav-inner">
          {!onDashboard && (
            <button
              type="button"
              className="admin-back-btn"
              onClick={() => navigate("/admin")}
              aria-label="Back to Admin Dashboard"
            >
              <BackIcon />
              Back
            </button>
          )}

          <nav className="admin-tabs" aria-label="Admin sections">
            {ADMIN_TABS.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.end}
                className={({ isActive }) => `admin-tab${isActive ? " active" : ""}`}
              >
                {tab.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>

      {children}
    </>
  );
}
