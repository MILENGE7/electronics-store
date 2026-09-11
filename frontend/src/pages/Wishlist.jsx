import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import { useWishlist } from "../context/WishlistContext";
import { useCart } from "../context/CartContext";
import { formatRWF } from "../utils/currency";
import { formatBrandName, formatCategoryName, formatProductName } from "../utils/format";
import { stockStatus } from "../components/ProductCard";
import "../components/ProductCard.css"; // reuses .product-card-brand/.product-card-add/.stock-pill etc.
import "../components/Skeletons.css";
import "./Wishlist.css";

function HeartOutlineIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
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

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}

function WishlistEmptyState() {
  return (
    <div className="wishlist-empty">
      <span className="wishlist-empty-icon" aria-hidden="true">
        <HeartOutlineIcon />
      </span>
      <h1>Your wishlist is empty</h1>
      <p>Save products you're interested in and they'll appear here.</p>
      <Link to="/" className="btn btn-primary">
        Continue Shopping
      </Link>
    </div>
  );
}

function WishlistCardSkeleton() {
  return (
    <div className="wishlist-card skeleton-card" aria-hidden="true">
      <span className="skeleton-shimmer" style={{ display: "block", width: "100%", aspectRatio: "1 / 1", borderRadius: "12px 12px 0 0" }} />
      <div className="wishlist-card-body">
        <span className="skeleton-line skeleton-shimmer" style={{ width: "40%", height: 9, display: "block" }} />
        <span className="skeleton-line skeleton-shimmer" style={{ width: "70%", height: 13, display: "block", marginTop: 8 }} />
        <span className="skeleton-line skeleton-shimmer" style={{ width: "35%", height: 16, display: "block", marginTop: 10 }} />
      </div>
    </div>
  );
}

function WishlistCard({ product: p, onAddToCart, onMoveToCart, onRemove, added, moved }) {
  const status = stockStatus(p.stock);
  const outOfStock = p.stock <= 0;
  const unavailable = p.isActive === false;
  const canPurchase = !unavailable && !outOfStock;
  const displayName = formatProductName(p.name);
  const displayBrand = [formatBrandName(p.brand), p.category?.name ? formatCategoryName(p.category.name) : ""].filter(Boolean).join(" · ");

  return (
    <div className={`wishlist-card ${unavailable ? "unavailable" : ""}`}>
      <div className="wishlist-card-image">
        <button type="button" className="wishlist-remove-btn" onClick={onRemove} aria-label={`Remove ${displayName} from wishlist`}>
          <CloseIcon />
        </button>

        <Link to={`/products/${p.id}`}>
          {p.images?.[0] ? (
            <img src={p.images[0]} alt={displayName} loading="lazy" />
          ) : (
            <span className="product-card-placeholder">{p.name.slice(0, 1)}</span>
          )}
        </Link>

        {!unavailable && <span className={`stock-pill stock-${status.cls}`}>{status.label}</span>}
      </div>

      <div className="wishlist-card-body">
        {displayBrand && <p className="product-card-brand">{displayBrand}</p>}
        <Link to={`/products/${p.id}`} className="wishlist-card-name">
          {displayName}
        </Link>
        <p className="price wishlist-card-price">{formatRWF(p.price)}</p>

        {unavailable && <p className="wishlist-unavailable-note">This product is no longer available.</p>}

        <div className="wishlist-card-actions">
          <button type="button" className={`product-card-add ${added ? "added" : ""}`} disabled={!canPurchase || added} onClick={onAddToCart}>
            {unavailable ? "Unavailable" : outOfStock ? "Out of Stock" : added ? (
              <>
                <CheckIcon /> Added to Cart
              </>
            ) : (
              "Add to Cart"
            )}
          </button>

          {canPurchase && (
            <button type="button" className="wishlist-move-btn" disabled={moved} onClick={onMoveToCart}>
              {moved ? "Moved" : "Move to Cart"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Wishlist() {
  const { ids, removeFromWishlist } = useWishlist();
  const { addItem } = useCart();

  const [productsById, setProductsById] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [addedIds, setAddedIds] = useState({});
  const [movedIds, setMovedIds] = useState({});

  const idsArray = [...ids];
  const idsKey = idsArray.join(",");

  useEffect(() => {
    if (idsArray.length === 0) {
      setProductsById({});
      setLoading(false);
      setError(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setError(false);

    Promise.all(
      idsArray.map((id) =>
        api
          .get(`/products/${id}`)
          .then((res) => [id, res.data])
          .catch((err) => [id, err.response?.status === 404 ? null : "error"])
      )
    )
      .then((pairs) => {
        if (cancelled) return;
        const map = {};
        let anyServerError = false;
        pairs.forEach(([id, product]) => {
          if (product === "error") anyServerError = true;
          else if (product === null) removeFromWishlist(id); // no longer exists — drop silently
          else if (product) map[id] = product;
        });
        setProductsById(map);
        // Only show the error state if we ended up with nothing usable —
        // a partial failure still shows whatever products did load.
        if (anyServerError && Object.keys(map).length === 0) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, retryKey]);

  const products = idsArray.map((id) => productsById[id]).filter(Boolean);

  function handleAddToCart(product) {
    if (product.stock <= 0 || product.isActive === false || addedIds[product.id]) return;
    addItem(product, 1);
    setAddedIds((m) => ({ ...m, [product.id]: true }));
    setTimeout(() => setAddedIds((m) => ({ ...m, [product.id]: false })), 1800);
  }

  function handleMoveToCart(product) {
    if (product.stock <= 0 || product.isActive === false) return;
    addItem(product, 1);
    setMovedIds((m) => ({ ...m, [product.id]: true }));
    removeFromWishlist(product.id);
  }

  function retry() {
    setRetryKey((k) => k + 1);
  }

  // Genuinely no items saved — nothing to load, show the empty state immediately.
  if (idsArray.length === 0) {
    return (
      <div className="page-main">
        <WishlistEmptyState />
      </div>
    );
  }

  return (
    <div className="page-main wishlist-page">
      <div className="wishlist-header">
        <h1>My Wishlist</h1>
        <p>Save products you love and come back to them anytime.</p>
        {!loading && !error && (
          <p className="wishlist-count" aria-live="polite">
            {products.length} saved item{products.length === 1 ? "" : "s"}
          </p>
        )}
      </div>

      {error ? (
        <div className="state-error">
          <p>We couldn't load your wishlist right now.</p>
          <button type="button" className="btn btn-outline" onClick={retry}>
            Try Again
          </button>
        </div>
      ) : loading ? (
        <div className="wishlist-grid">
          <WishlistCardSkeleton />
          <WishlistCardSkeleton />
          <WishlistCardSkeleton />
          <WishlistCardSkeleton />
        </div>
      ) : products.length === 0 ? (
        <WishlistEmptyState />
      ) : (
        <div className="wishlist-grid">
          {products.map((p) => (
            <WishlistCard
              key={p.id}
              product={p}
              added={!!addedIds[p.id]}
              moved={!!movedIds[p.id]}
              onAddToCart={() => handleAddToCart(p)}
              onMoveToCart={() => handleMoveToCart(p)}
              onRemove={() => removeFromWishlist(p.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
