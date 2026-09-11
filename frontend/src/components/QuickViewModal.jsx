import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { formatRWF } from "../utils/currency";
import { formatBrandName, formatCategoryName, formatProductName } from "../utils/format";
import { stockStatus } from "./ProductCard";
import QuantityStepper from "./QuantityStepper";
import "./QuickViewModal.css";

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
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

function StarIcon({ filled }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.4">
      <path d="M12 2.8l2.9 6.3 6.9.7-5.2 4.7 1.5 6.8L12 17.9l-6.1 3.4 1.5-6.8-5.2-4.7 6.9-.7L12 2.8z" strokeLinejoin="round" />
    </svg>
  );
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// `initialProduct` is whatever the triggering ProductCard already has (so the
// modal renders instantly with no loading flash); a fresh GET /products/:id
// is fetched on open to avoid showing stale price/stock and to pick up
// reviews (the list endpoint that feeds ProductCard doesn't include them).
export default function QuickViewModal({ initialProduct, onClose }) {
  const { addItem } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();

  const [product, setProduct] = useState(initialProduct);
  const [imageBroken, setImageBroken] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [wishPop, setWishPop] = useState(false);

  const dialogRef = useRef(null);
  const previouslyFocusedRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get(`/products/${initialProduct.id}`)
      .then((res) => {
        if (!cancelled) setProduct(res.data);
      })
      .catch(() => {
        // Keep showing the card's already-known data rather than breaking the modal.
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialProduct.id]);

  useEffect(() => {
    previouslyFocusedRef.current = document.activeElement;
    dialogRef.current?.focus();

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(e) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === "Tab") {
        const focusable = dialogRef.current?.querySelectorAll(FOCUSABLE_SELECTOR);
        if (!focusable || focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocusedRef.current?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const displayName = formatProductName(product.name);
  const displayBrand = formatBrandName(product.brand);
  const displayCategory = product.category?.name ? formatCategoryName(product.category.name) : "";
  const status = stockStatus(product.stock);
  const outOfStock = product.stock <= 0;
  const description = product.description?.trim() ? product.description : "No description available.";
  const isFavorite = isWishlisted(product.id);

  const reviews = product.reviews || [];
  const reviewCount = reviews.length;
  const avgRating = reviewCount > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount : 0;

  function handleBackdropMouseDown(e) {
    if (e.target === e.currentTarget) onClose();
  }

  function handleAddToCart() {
    if (outOfStock || added) return;
    addItem(product, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  }

  function handleToggleWishlist() {
    toggleWishlist(product.id);
    setWishPop(true);
    setTimeout(() => setWishPop(false), 320);
  }

  // The Link itself performs the navigation — this only needs to close the modal.
  function handleViewFullDetails() {
    onClose();
  }

  return (
    <div className="quickview-backdrop" onMouseDown={handleBackdropMouseDown}>
      <div
        className="quickview-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quickview-title"
        ref={dialogRef}
        tabIndex={-1}
      >
        <button type="button" className="quickview-close" onClick={onClose} aria-label="Close quick view">
          <CloseIcon />
        </button>

        <div className="quickview-body">
          <div className="quickview-image">
            {product.images?.[0] && !imageBroken ? (
              <img
                src={product.images[0]}
                alt={[displayBrand, displayName].filter(Boolean).join(" — ")}
                onError={() => setImageBroken(true)}
              />
            ) : (
              <span className="quickview-image-placeholder">{product.name.slice(0, 1)}</span>
            )}
          </div>

          <div className="quickview-info">
            <p className="quickview-brand-category">{[displayBrand, displayCategory].filter(Boolean).join(" · ")}</p>
            <h2 id="quickview-title" className="quickview-title">
              {displayName}
            </h2>

            {reviewCount > 0 ? (
              <div className="quickview-rating">
                <span className="quickview-stars">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <StarIcon key={n} filled={n <= Math.round(avgRating)} />
                  ))}
                </span>
                <span>{avgRating.toFixed(1)}</span>
                <span className="quickview-review-count">
                  ({reviewCount} review{reviewCount === 1 ? "" : "s"})
                </span>
              </div>
            ) : (
              <p className="quickview-review-count">No reviews yet</p>
            )}

            <p className="price quickview-price">{formatRWF(product.price)}</p>

            <p className={`quickview-stock quickview-stock-${status.cls}`}>
              {!outOfStock && <CheckIcon />}
              {outOfStock ? "Out of Stock" : status.cls === "low" ? `Only ${product.stock} left` : "In Stock"}
            </p>

            <p className="quickview-description">{description}</p>

            <div className="quickview-qty-row">
              <span className="quickview-qty-label">Quantity</span>
              <QuantityStepper value={quantity} max={product.stock} onChange={setQuantity} disabled={outOfStock} />
            </div>

            <div className="quickview-actions">
              <button
                type="button"
                className={`btn btn-primary quickview-add-btn ${added ? "added" : ""}`}
                disabled={outOfStock || added}
                onClick={handleAddToCart}
              >
                {outOfStock ? (
                  "Out of Stock"
                ) : added ? (
                  <>
                    <CheckIcon /> Added to Cart
                  </>
                ) : (
                  "Add to Cart"
                )}
              </button>

              <button
                type="button"
                className={`quickview-wishlist-btn ${isFavorite ? "active" : ""} ${wishPop ? "wishlist-pop" : ""}`}
                onClick={handleToggleWishlist}
                aria-pressed={isFavorite}
                aria-label={isFavorite ? `Remove ${displayName} from wishlist` : `Add ${displayName} to wishlist`}
              >
                <HeartIcon filled={isFavorite} />
              </button>
            </div>

            <Link to={`/products/${product.id}`} className="quickview-full-details" onClick={handleViewFullDetails}>
              View Full Details →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
