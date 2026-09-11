import { memo, useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { useComparison } from "../context/ComparisonContext";
import { formatRWF } from "../utils/currency";
import { formatBrandName, formatProductName } from "../utils/format";
import QuickViewModal from "./QuickViewModal";
import "./ProductCard.css";

function HeartIcon({ filled }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8">
      <path
        d="M12 20.5s-7.5-4.6-10-9.3C.4 8 1.8 4.5 5.2 3.6c2-.5 4 .3 5.3 2 1.3-1.7 3.3-2.5 5.3-2 3.4.9 4.8 4.4 3.2 7.6-2.5 4.7-10 9.3-10 9.3z"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6">
      <path d="M4 12.5l5 5L20 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12z" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function CompareIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M8 3v14M8 17l-3.5-3.5M8 17l3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 21V7M16 7l-3.5 3.5M16 7l3.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function stockStatus(stock) {
  if (stock <= 0) return { label: "Out of stock", cls: "out" };
  if (stock <= 5) return { label: `Only ${stock} left`, cls: "low" };
  return { label: "In stock", cls: "in" };
}

function ProductCard({ product: p, rank }) {
  const { addItem } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const { isComparing, toggleCompare, maxCompare } = useComparison();
  const [isAdded, setIsAdded] = useState(false);
  const [isPopping, setIsPopping] = useState(false);
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [compareLimitMsg, setCompareLimitMsg] = useState(false);

  const status = stockStatus(p.stock);
  const isFavorite = isWishlisted(p.id);
  const isComparingThis = isComparing(p.id);
  const displayName = formatProductName(p.name);
  const displayBrand = [formatBrandName(p.brand), p.category?.name].filter(Boolean).join(" · ");

  function handleToggleWishlist(e) {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(p.id);
    setIsPopping(true);
    setTimeout(() => setIsPopping(false), 320);
  }

  function handleAddToCart(e) {
    e.preventDefault();
    e.stopPropagation();
    if (p.stock <= 0 || isAdded) return;
    addItem(p);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 1800);
  }

  function handleQuickView(e) {
    e.preventDefault();
    e.stopPropagation();
    setQuickViewOpen(true);
  }

  function handleToggleCompare(e) {
    e.preventDefault();
    e.stopPropagation();
    const result = toggleCompare(p.id);
    if (result === "limit") {
      setCompareLimitMsg(true);
      setTimeout(() => setCompareLimitMsg(false), 2500);
    }
  }

  return (
    <>
      <Link to={`/products/${p.id}`} className="product-card">
        <div className="product-card-image">
          {rank && <span className="rank-badge">{String(rank).padStart(2, "0")}</span>}

          <button
            type="button"
            className={`wishlist-btn ${isFavorite ? "active" : ""} ${isPopping ? "wishlist-pop" : ""}`}
            onClick={handleToggleWishlist}
            aria-label={isFavorite ? `Remove ${displayName} from wishlist` : `Add ${displayName} to wishlist`}
            aria-pressed={isFavorite}
          >
            <HeartIcon filled={isFavorite} />
          </button>

          {p.images?.[0] ? (
            <img src={p.images[0]} alt={[displayBrand, displayName].filter(Boolean).join(" — ")} loading="lazy" />
          ) : (
            <span className="product-card-placeholder">{p.name.slice(0, 1)}</span>
          )}

          <span className={`stock-pill stock-${status.cls}`}>{status.label}</span>

          <div className="product-card-corner-actions">
            <button type="button" className="corner-action-btn" onClick={handleQuickView} aria-label={`Quick view ${displayName}`}>
              <EyeIcon />
            </button>

            <button
              type="button"
              className={`corner-action-btn ${isComparingThis ? "active" : ""}`}
              onClick={handleToggleCompare}
              aria-label={isComparingThis ? `Remove ${displayName} from comparison` : `Add ${displayName} to comparison`}
              aria-pressed={isComparingThis}
            >
              <CompareIcon />
            </button>
          </div>

          {compareLimitMsg && <span className="compare-limit-toast">Compare up to {maxCompare} products.</span>}
        </div>

        <div className="product-card-body">
          <p className="product-card-brand">{displayBrand}</p>
          <h3 className="product-card-name">{displayName}</h3>
          <p className="price product-card-price">{formatRWF(p.price)}</p>

          <button
            type="button"
            className={`product-card-add ${isAdded ? "added" : ""}`}
            disabled={p.stock <= 0 || isAdded}
            onClick={handleAddToCart}
            aria-label={p.stock <= 0 ? `${displayName} is out of stock` : isAdded ? `${displayName} added to cart` : `Add ${displayName} to cart`}
          >
            {p.stock <= 0 ? (
              "Out of Stock"
            ) : isAdded ? (
              <>
                <CheckIcon /> Added to Cart
              </>
            ) : (
              "Add to Cart"
            )}
          </button>
        </div>
      </Link>

      {quickViewOpen && <QuickViewModal initialProduct={p} onClose={() => setQuickViewOpen(false)} />}
    </>
  );
}

export default memo(ProductCard);
