import { Link } from "react-router-dom";

export default function Dashboard() {
  return (
    <div className="page-main">
      <h1>Admin Dashboard</h1>
      <nav style={{ display: "flex", gap: "1rem", marginTop: "1.2rem" }}>
        <Link to="/admin/products" className="btn btn-outline">Manage Products</Link>
        <Link to="/admin/categories" className="btn btn-outline">Manage Categories</Link>
        <Link to="/admin/orders" className="btn btn-outline">Manage Orders</Link>
        <Link to="/admin/security" className="btn btn-outline">Security</Link>
      </nav>
    </div>
  );
}
