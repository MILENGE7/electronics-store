import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { useComparison } from "../context/ComparisonContext";
import { formatRWF } from "../utils/currency";
import { formatBrandName, formatCategoryName, formatProductName } from "../utils/format";
import { stockStatus } from "../components/ProductCard";
import "./Compare.css";

function CloseIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}

function HeartIcon({ filled }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8">
      <path
        d="M12 20.5s-7.5-4.6-10-9.3C.4 8 1.8 4.5 5.2 3.6c2-.5 4 .3 5.3 2 1.3-1.7 3.3-2.5 5.3-2 3.4.9 4.8 4.4 3.2 7.6-2.5 4.7-10 9.3-10 9.3z"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Compare() {
  const { ids, removeFromComparison, clearComparison } = useComparison();
  const { addItem } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();

  const [productsById, setProductsById] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [addedIds, setAddedIds] = useState({});
  const [wishPopId, setWishPopId] = useState(null);

  const idsKey = ids.join(",");

  useEffect(() => {
    if (ids.length === 0) {
      setProductsById({});
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setLoadError(false);

    Promise.all(
      ids.map((id) =>
        api
          .get(`/products/${id}`)
          .then((res) => [id, res.data])
          .catch(() => [id, null])
      )
    )
      .then((pairs) => {
        if (cancelled) return;
        const map = {};
        pairs.forEach(([id, product]) => {
          if (product) map[id] = product;
          else removeFromComparison(id); // stored ID whose product no longer exists — drop it silently
        });
        setProductsById(map);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  const products = useMemo(() => ids.map((id) => productsById[id]).filter(Boolean), [ids, productsById]);

  // Only meaningful (and only shown) once there's something to compare against.
  const lowestPrice = useMemo(() => {
    if (products.length < 2) return null;
    return Math.min(...products.map((p) => Number(p.price)));
  }, [products]);

  function handleAddToCart(product) {
    if (product.stock <= 0 || addedIds[product.id]) return;
    addItem(product);
    setAddedIds((m) => ({ ...m, [product.id]: true }));
    setTimeout(() => setAddedIds((m) => ({ ...m, [product.id]: false })), 1800);
  }

  function handleToggleWishlist(product) {
    toggleWishlist(product.id);
    setWishPopId(product.id);
    setTimeout(() => setWishPopId(null), 320);
  }

  if (ids.length === 0) {
    return (
      <div className="page-main">
        <div className="compare-empty">
          <h1>No products selected for comparison</h1>
          <p>Browse the catalog and tap Compare on any product to add it here.</p>
          <Link to="/" className="btn btn-primary">
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-main compare-page">
      <div className="compare-header">
        <h1>Compare Products</h1>
        <button type="button" className="btn btn-outline" onClick={clearComparison}>
          Clear All
        </button>
      </div>

      {loading ? (
        <p className="catalog-empty">Loading comparison…</p>
      ) : loadError ? (
        <div className="state-error">
          <p>Unable to load comparison right now.</p>
        </div>
      ) : products.length === 0 ? (
        <div className="compare-empty">
          <h1>No products selected for comparison</h1>
          <p>The products you selected are no longer available.</p>
          <Link to="/" className="btn btn-primary">
            Continue Shopping
          </Link>
        </div>
      ) : (
        <div className="compare-table-wrap">
          <table className="compare-table">
            <caption className="compare-sr-only">
              Comparing {products.map((p) => formatProductName(p.name)).join(", ")}
            </caption>
            <thead>
              <tr>
                <th scope="col" className="compare-row-label">
                  <span className="compare-sr-only">Attribute</span>
                </th>
                {products.map((p) => {
                  const outOfStock = p.stock <= 0;
                  const isFavorite = isWishlisted(p.id);
                  const displayName = formatProductName(p.name);
                  return (
                    <th scope="col" key={p.id} className="compare-product-col">
                      <button
                        type="button"
                        className="compare-remove-btn"
                        onClick={() => removeFromComparison(p.id)}
                        aria-label={`Remove ${displayName} from comparison`}
                      >
                        <CloseIcon />
                      </button>

                      <Link to={`/products/${p.id}`} className="compare-product-image">
                        {p.images?.[0] ? (
                          <img src={p.images[0]} alt={displayName} />
                        ) : (
                          <span className="product-card-placeholder">{p.name.slice(0, 1)}</span>
                        )}
                      </Link>

                      <Link to={`/products/${p.id}`} className="compare-product-name">
                        {displayName}
                      </Link>

                      <div className="compare-col-actions">
                        <button
                          type="button"
                          className={`btn btn-primary compare-add-btn ${addedIds[p.id] ? "added" : ""}`}
                          disabled={outOfStock || addedIds[p.id]}
                          onClick={() => handleAddToCart(p)}
                        >
                          {outOfStock ? "Out of Stock" : addedIds[p.id] ? "Added" : "Add to Cart"}
                        </button>

                        <button
                          type="button"
                          className={`compare-wishlist-btn ${isFavorite ? "active" : ""} ${wishPopId === p.id ? "wishlist-pop" : ""}`}
                          onClick={() => handleToggleWishlist(p)}
                          aria-pressed={isFavorite}
                          aria-label={isFavorite ? `Remove ${displayName} from wishlist` : `Add ${displayName} to wishlist`}
                        >
                          <HeartIcon filled={isFavorite} />
                        </button>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              <tr>
                <th scope="row">Price</th>
                {products.map((p) => {
                  const isLowest = lowestPrice !== null && Number(p.price) === lowestPrice;
                  return (
                    <td key={p.id} className={isLowest ? "compare-lowest-price" : ""}>
                      {formatRWF(p.price)}
                      {isLowest && <span className="compare-lowest-badge">Lowest price</span>}
                    </td>
                  );
                })}
              </tr>

              <tr>
                <th scope="row">Brand</th>
                {products.map((p) => (
                  <td key={p.id}>{p.brand ? formatBrandName(p.brand) : "—"}</td>
                ))}
              </tr>

              <tr>
                <th scope="row">Category</th>
                {products.map((p) => (
                  <td key={p.id}>{p.category?.name ? formatCategoryName(p.category.name) : "—"}</td>
                ))}
              </tr>

              <tr>
                <th scope="row">Stock</th>
                {products.map((p) => {
                  const status = stockStatus(p.stock);
                  return (
                    <td key={p.id}>
                      <span className={`compare-stock compare-stock-${status.cls}`}>
                        {p.stock <= 0 ? "Out of Stock" : status.cls === "low" ? `Only ${p.stock} left` : "In Stock"}
                      </span>
                    </td>
                  );
                })}
              </tr>

              <tr>
                <th scope="row">Rating</th>
                {products.map((p) => {
                  const reviews = p.reviews || [];
                  const count = reviews.length;
                  const avg = count > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / count : 0;
                  return (
                    <td key={p.id}>{count > 0 ? `${avg.toFixed(1)} ★ (${count} review${count === 1 ? "" : "s"})` : "No reviews yet"}</td>
                  );
                })}
              </tr>

              <tr>
                <th scope="row">Description</th>
                {products.map((p) => (
                  <td key={p.id} className="compare-description">
                    {p.description?.trim() ? p.description : "No description available."}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
