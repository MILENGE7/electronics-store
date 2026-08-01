import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import "./Navbar.css";

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
    </svg>
  );
}
function CartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 4h2l2.4 12.2a2 2 0 0 0 2 1.6h8a2 2 0 0 0 2-1.6L21 8H6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="10" cy="21" r="1.3" />
      <circle cx="18" cy="21" r="1.3" />
    </svg>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const { items } = useCart();
  const itemCount = items.reduce((n, i) => n + i.quantity, 0);

  return (
    <header className="nav">
      <div className="nav-inner">
        <Link to="/" className="nav-logo">
          <img src="/logo.png" alt="FK Trading Limited" className="nav-logo-img" />
        </Link>

        <nav className="nav-links">
          <Link to="/">Shop</Link>
          {user?.role === "ADMIN" && <Link to="/admin">Admin</Link>}
          {user && <Link to="/account">Account</Link>}
          {user && <Link to="/orders">Orders</Link>}
        </nav>

        <div className="nav-actions">
          <Link to="/" className="nav-icon-btn" aria-label="Search">
            <SearchIcon />
          </Link>
          <Link to="/cart" className="nav-icon-btn nav-cart" aria-label="Cart">
            <CartIcon />
            {itemCount > 0 && <span className="nav-cart-badge">{itemCount}</span>}
          </Link>
          {user ? (
            <button className="btn btn-outline" onClick={logout}>Sign out</button>
          ) : (
            <>
              <Link to="/login" className="btn btn-pill">Sign in</Link>
              <Link to="/register" className="btn btn-primary">Register</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
