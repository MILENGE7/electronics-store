import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { useNotifications } from "../context/NotificationsContext";
import SearchSuggestions from "./SearchSuggestions";
import "./Navbar.css";

function CartIcon() {
  return (
    <svg
      width="25"
      height="25"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <path
        d="M3 4h2l2.4 12.2a2 2 0 0 0 2 1.6h8a2 2 0 0 0 2-1.6L21 8H6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="21" r="1.3" />
      <circle cx="18" cy="21" r="1.3" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path
        d="M12 20.5s-7.5-4.6-10-9.3C.4 8 1.8 4.5 5.2 3.6c2-.5 4 .3 5.3 2 1.3-1.7 3.3-2.5 5.3-2 3.4.9 4.8 4.4 3.2 7.6-2.5 4.7-10 9.3-10 9.3z"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <circle cx="12" cy="7" r="4" />
      <path
        d="M4 21c.8-4 3.5-6 8-6s7.2 2 8 6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TruckIcon() {
  return (
    <svg
      width="25"
      height="25"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <path d="M3 6h11v11H3z" />
      <path d="M14 10h4l3 3v4h-7z" />
      <circle cx="7" cy="19" r="2" />
      <circle cx="18" cy="19" r="2" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      width="25"
      height="25"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <path d="M12 3l8 3v5c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6z" />
      <path
        d="M8.5 12l2.2 2.2 4.8-5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SupportIcon() {
  return (
    <svg
      width="25"
      height="25"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <path
        d="M4 5h16v11H8l-4 4z"
        strokeLinejoin="round"
      />
      <path
        d="M8 10h.01M12 10h.01M16 10h.01"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" strokeLinecap="round" />
    </svg>
  );
}

function MenuIcon({ open }) {
  return (
    <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
    </svg>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const { items } = useCart();
  const { ids: wishlistIds } = useWishlist();
  const notificationsCtx = useNotifications();
  const unreadCount = notificationsCtx?.unreadCount || 0;
  const isAdmin = user?.role === "ADMIN";
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const itemCount = items.reduce(
    (n, item) => n + item.quantity,
    0
  );

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 24);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <header className={`nav ${scrolled ? "nav-scrolled" : ""}`}>

      {/* TOP SERVICE BAR */}
      <div className="nav-service-bar">
        <div className="nav-service-inner">

          <div className="service-item">
            <TruckIcon />
            <div>
              <strong>Fast Delivery</strong>
              <span>Across Rwanda</span>
            </div>
          </div>

          <div className="service-item">
            <ShieldIcon />
            <div>
              <strong>1 Year Warranty</strong>
              <span>On all products</span>
            </div>
          </div>

          <div className="service-item">
            <SupportIcon />
            <div>
              <strong>24/7 Support</strong>
              <span>We're here to help</span>
            </div>
          </div>

        </div>
      </div>

      {/* MAIN NAVIGATION */}
      <div className="nav-main">
        <div className="nav-inner">

          {/* MOBILE MENU TOGGLE */}
          <button
            type="button"
            className="nav-menu-btn"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
          >
            <MenuIcon open={menuOpen} />
          </button>

          {/* LOGO */}
          <Link to={isAdmin ? "/admin" : "/"} className="nav-logo">
            <img
              src="/logo.webp?v=fktrading1"
              alt="FK Trading"
              className="nav-logo-img"
            />
          </Link>

          {/* LINKS */}
          <nav className="nav-links">
            {isAdmin ? (
              <Link to="/admin">Admin Dashboard</Link>
            ) : (
              <>
                <Link to="/">Shop</Link>

                <Link to="/?category=all">
                  Categories
                  <span className="category-arrow">⌄</span>
                </Link>

                {user && (
                  <Link to="/orders">
                    Orders
                  </Link>
                )}

                <a href="#about">
                  About Us
                </a>

                <a href="#contact">
                  Contact
                </a>
              </>
            )}
          </nav>

          {/* ACTIONS — shopping actions (search/wishlist/notifications/cart)
              are a customer concern; an admin is redirected away from every
              page they'd lead to (see CustomerRoute), so they're hidden here
              too rather than left as dead-end icons. */}
          <div className="nav-actions">

            {!isAdmin && <SearchSuggestions className="nav-search-desktop" />}

            {!isAdmin && (
              <Link
                to="/wishlist"
                className="nav-icon-btn nav-wishlist"
                aria-label={`Wishlist${wishlistIds.size > 0 ? `, ${wishlistIds.size} item${wishlistIds.size === 1 ? "" : "s"}` : ""}`}
              >
                <HeartIcon />

                {wishlistIds.size > 0 && (
                  <span className="nav-wishlist-badge">
                    {wishlistIds.size}
                  </span>
                )}
              </Link>
            )}

            {user && !isAdmin && (
              <Link
                to="/notifications"
                className="nav-icon-btn nav-notifications"
                aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
              >
                <BellIcon />

                {unreadCount > 0 && (
                  <span className="nav-notification-badge">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
            )}

            {!isAdmin && (
              <Link
                to="/cart"
                className="nav-icon-btn nav-cart"
                aria-label={`Shopping cart${itemCount > 0 ? `, ${itemCount} item${itemCount === 1 ? "" : "s"}` : ""}`}
              >
                <CartIcon />

                {itemCount > 0 && (
                  <span className="nav-cart-badge">
                    {itemCount}
                  </span>
                )}
              </Link>
            )}

            {user ? (
              <>
                <Link
                  to="/account"
                  className="nav-user"
                  aria-label="Account"
                >
                  <UserIcon />
                </Link>

                <button
                  className="nav-signin"
                  onClick={logout}
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="nav-user"
                  aria-label="Sign in"
                >
                  <UserIcon />
                </Link>

                <Link
                  to="/login"
                  className="nav-signin"
                >
                  Sign in
                </Link>
              </>
            )}

          </div>

        </div>
      </div>

      {/* MOBILE MENU */}
      {menuOpen && (
        <>
          <div className="nav-mobile-backdrop" onClick={closeMenu} />
          <div className="nav-mobile-panel">
            {!isAdmin && (
              <div className="nav-mobile-search">
                <SearchSuggestions onNavigate={closeMenu} />
              </div>
            )}

            <nav className="nav-mobile-links">
              {isAdmin ? (
                <Link to="/admin" onClick={closeMenu}>Admin Dashboard</Link>
              ) : (
                <>
                  <Link to="/" onClick={closeMenu}>Shop</Link>
                  <Link to="/?category=all" onClick={closeMenu}>Categories</Link>
                  {user && <Link to="/orders" onClick={closeMenu}>Orders</Link>}
                  <a href="#about" onClick={closeMenu}>About Us</a>
                  <a href="#contact" onClick={closeMenu}>Contact</a>
                </>
              )}

              <div className="nav-mobile-divider" />

              {user ? (
                <>
                  <Link to="/account" onClick={closeMenu}>My Account</Link>
                  <button type="button" onClick={() => { logout(); closeMenu(); }}>
                    Sign out
                  </button>
                </>
              ) : (
                <Link to="/login" onClick={closeMenu}>Sign in</Link>
              )}
            </nav>
          </div>
        </>
      )}

    </header>
  );
}
