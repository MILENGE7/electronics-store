import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../api/client";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useWishlist } from "../context/WishlistContext";
import { useRecentlyViewed } from "../context/RecentlyViewedContext";
import { formatRWF } from "../utils/currency";
import { formatBrandName, formatCategoryName, formatProductName } from "../utils/format";
import { getRelatedProducts } from "../utils/recommendations";
import ProductCard, { stockStatus } from "../components/ProductCard";
import { ProductDetailSkeleton } from "../components/Skeletons";
import ReviewForm from "../components/ReviewForm";
import QuantityStepper from "../components/QuantityStepper";
import "./ProductDetail.css";

function StarIcon({ filled }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.4" className={filled ? "" : "dim"}>
      <path d="M12 2.8l2.9 6.3 6.9.7-5.2 4.7 1.5 6.8L12 17.9l-6.1 3.4 1.5-6.8-5.2-4.7 6.9-.7L12 2.8z" strokeLinejoin="round" />
    </svg>
  );
}

function HeartIcon({ filled }) {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8">
      <path
        d="M12 20.5s-7.5-4.6-10-9.3C.4 8 1.8 4.5 5.2 3.6c2-.5 4 .3 5.3 2 1.3-1.7 3.3-2.5 5.3-2 3.4.9 4.8 4.4 3.2 7.6-2.5 4.7-10 9.3-10 9.3z"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6">
      <path d="M4 12.5l5 5L20 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ShieldCheckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M12 3l8 3v5c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6z" />
      <path d="M8.5 12l2.2 2.2 4.8-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

function TruckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M3 6h11v11H3z" />
      <path d="M14 10h4l3 3v4h-7z" />
      <circle cx="7" cy="19" r="2" />
      <circle cx="18" cy="19" r="2" />
    </svg>
  );
}

function HeadsetIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M4 13v-1a8 8 0 0 1 16 0v1" strokeLinecap="round" />
      <rect x="2.5" y="13" width="5" height="7" rx="1.6" />
      <rect x="16.5" y="13" width="5" height="7" rx="1.6" />
      <path d="M19.5 20a3 3 0 0 1-3 3h-2" strokeLinecap="round" />
    </svg>
  );
}

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { user } = useAuth();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const { ids: recentlyViewedIds, recordView } = useRecentlyViewed();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [brokenImages, setBrokenImages] = useState({});
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [wishPop, setWishPop] = useState(false);

  const [candidatePool, setCandidatePool] = useState([]);

  function loadProduct() {
    setLoading(true);
    setNotFound(false);
    setLoadError(false);
    api
      .get(`/products/${id}`)
      .then((res) => {
        setProduct(res.data);
        // Only a real, successfully-loaded product is recorded — never on 404/error.
        recordView(res.data.id);
      })
      .catch((err) => {
        if (err.response?.status === 404) setNotFound(true);
        else setLoadError(true);
      })
      .finally(() => setLoading(false));
  }

  useEffect(loadProduct, [id, retryKey]);

  useEffect(() => {
    setActiveImageIdx(0);
    setBrokenImages({});
    setQuantity(1);
    setAdded(false);
  }, [id]);

  // Fetches a broad candidate pool once per product; the actual ranking
  // (category/brand/price/stock/recently-viewed) is a cheap client-side
  // recompute in the `related` memo below, so it doesn't refetch every time
  // recently-viewed history changes (e.g. right after this same view is recorded).
  useEffect(() => {
    if (!product) {
      setCandidatePool([]);
      return undefined;
    }
    let cancelled = false;

    api
      .get("/products", { params: { limit: 60 } })
      .then((res) => {
        if (!cancelled) setCandidatePool(res.data.products);
      })
      .catch(() => {
        if (!cancelled) setCandidatePool([]);
      });

    return () => {
      cancelled = true;
    };
  }, [product?.id]);

  const related = useMemo(() => {
    if (!product || candidatePool.length === 0) return [];
    return getRelatedProducts(candidatePool, product, recentlyViewedIds, 4);
  }, [candidatePool, product, recentlyViewedIds]);

  function retry() {
    setRetryKey((k) => k + 1);
  }

  if (loading) {
    return (
      <div className="page-main">
        <ProductDetailSkeleton />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="page-main pd-state-page">
        <h1>Product not found</h1>
        <p className="catalog-empty">We couldn't find the product you're looking for. It may have been removed.</p>
        <Link to="/" className="btn btn-outline">
          Back to Shop
        </Link>
      </div>
    );
  }

  if (loadError || !product) {
    return (
      <div className="page-main pd-state-page">
        <p className="catalog-empty">Unable to load this product right now.</p>
        <button type="button" className="btn btn-outline" onClick={retry}>
          Try Again
        </button>
      </div>
    );
  }

  const displayName = formatProductName(product.name);
  const displayBrand = formatBrandName(product.brand);
  const displayCategory = product.category?.name ? formatCategoryName(product.category.name) : "";
  const status = stockStatus(product.stock);
  const description = product.description?.trim() ? product.description : "No description available.";

  const reviews = product.reviews || [];
  const reviewCount = reviews.length;
  const avgRating = reviewCount > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount : 0;
  const ratingDistribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));

  const images = product.images?.length > 0 ? product.images : [];
  const mainImageBroken = brokenImages[activeImageIdx];

  const isFavorite = isWishlisted(product.id);
  const outOfStock = product.stock <= 0;

  function markImageBroken(idx) {
    setBrokenImages((m) => ({ ...m, [idx]: true }));
  }

  function handleAddToCart() {
    if (outOfStock || added) return;
    addItem(product, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  }

  function handleBuyNow() {
    if (outOfStock) return;
    addItem(product, quantity);
    navigate("/checkout");
  }

  function handleToggleWishlist() {
    toggleWishlist(product.id);
    setWishPop(true);
    setTimeout(() => setWishPop(false), 320);
  }

  return (
    <div className="page-main pd-page">
      <nav className="pd-breadcrumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        {displayCategory && (
          <>
            <span aria-hidden="true">›</span>
            <Link to={`/?category=${encodeURIComponent(product.category.name)}`}>{displayCategory}</Link>
          </>
        )}
        <span aria-hidden="true">›</span>
        <span aria-current="page">{displayName}</span>
      </nav>

      <div className="pd-layout">
        <div className="pd-gallery">
          <div className="pd-gallery-main">
            {images.length > 0 && !mainImageBroken ? (
              <img
                src={images[activeImageIdx]}
                alt={[displayBrand, displayName].filter(Boolean).join(" — ")}
                onError={() => markImageBroken(activeImageIdx)}
              />
            ) : (
              <span className="pd-gallery-placeholder">{product.name.slice(0, 1)}</span>
            )}
          </div>

          {images.length > 1 && (
            <div className="pd-gallery-thumbs" role="tablist" aria-label="Product images">
              {images.map((img, i) => (
                <button
                  type="button"
                  key={i}
                  role="tab"
                  aria-selected={i === activeImageIdx}
                  aria-label={`View image ${i + 1} of ${images.length}`}
                  className={`pd-thumb ${i === activeImageIdx ? "active" : ""}`}
                  onClick={() => setActiveImageIdx(i)}
                >
                  {!brokenImages[i] ? (
                    <img src={img} alt="" onError={() => markImageBroken(i)} />
                  ) : (
                    <span className="pd-thumb-placeholder">{product.name.slice(0, 1)}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="pd-info">
          <p className="pd-brand-category">{[displayBrand, displayCategory].filter(Boolean).join(" · ")}</p>
          <h1 className="pd-title">{displayName}</h1>

          <div className="pd-rating-row">
            {reviewCount > 0 ? (
              <>
                <span className="pd-stars">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <StarIcon key={n} filled={n <= Math.round(avgRating)} />
                  ))}
                </span>
                <span className="pd-rating-value">{avgRating.toFixed(1)}</span>
                <a href="#pd-reviews" className="pd-review-count-link">
                  {reviewCount} review{reviewCount === 1 ? "" : "s"}
                </a>
              </>
            ) : (
              <a href="#pd-reviews" className="pd-review-count-link">
                No reviews yet — be the first
              </a>
            )}
          </div>

          <p className="price pd-price">{formatRWF(product.price)}</p>

          <p className={`pd-stock-status pd-stock-${status.cls}`}>
            {!outOfStock && <CheckIcon />}
            {outOfStock ? "Out of Stock" : status.cls === "low" ? `Only ${product.stock} left` : "In Stock"}
          </p>

          <div className="pd-qty-row">
            <span className="pd-qty-label">Quantity</span>
            <QuantityStepper value={quantity} max={product.stock} onChange={setQuantity} disabled={outOfStock} />
          </div>

          <div className="pd-actions">
            <button
              type="button"
              className={`btn btn-primary pd-add-btn ${added ? "added" : ""}`}
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

            <button type="button" className="btn btn-outline pd-buy-btn" disabled={outOfStock} onClick={handleBuyNow}>
              Buy Now
            </button>

            <button
              type="button"
              className={`pd-wishlist-btn ${isFavorite ? "active" : ""} ${wishPop ? "wishlist-pop" : ""}`}
              onClick={handleToggleWishlist}
              aria-pressed={isFavorite}
              aria-label={isFavorite ? `Remove ${displayName} from wishlist` : `Add ${displayName} to wishlist`}
            >
              <HeartIcon filled={isFavorite} />
              {isFavorite ? "Added to Wishlist" : "Add to Wishlist"}
            </button>
          </div>

          <div className="pd-trust-row">
            <div>
              <ShieldCheckIcon />
              Authentic Products
            </div>
            <div>
              <LockIcon />
              Secure Payment
            </div>
            <div>
              <TruckIcon />
              Rwanda Delivery
            </div>
            <div>
              <HeadsetIcon />
              Customer Support
            </div>
          </div>

          <div className="pd-delivery">
            <TruckIcon />
            <div>
              <strong>Delivery available in Rwanda</strong>
              <span>Delivery details are confirmed with you after checkout.</span>
            </div>
          </div>
        </div>
      </div>

      <section className="pd-section">
        <h2>Description</h2>
        <p className="pd-description">{description}</p>
      </section>

      <section className="pd-section">
        <h2>Specifications</h2>
        <p className="catalog-empty">No additional specifications available for this product.</p>
      </section>

      <section className="pd-section" id="pd-reviews">
        <h2>Reviews</h2>

        {reviewCount > 0 && (
          <div className="pd-rating-summary">
            <div className="pd-rating-big">
              <span className="pd-rating-big-num">{avgRating.toFixed(1)}</span>
              <span className="pd-stars">
                {[1, 2, 3, 4, 5].map((n) => (
                  <StarIcon key={n} filled={n <= Math.round(avgRating)} />
                ))}
              </span>
              <span className="pd-rating-big-count">
                {reviewCount} review{reviewCount === 1 ? "" : "s"}
              </span>
            </div>

            <div className="pd-rating-bars">
              {ratingDistribution.map(({ star, count }) => (
                <div className="pd-rating-bar-row" key={star}>
                  <span className="pd-rating-bar-label">{star}★</span>
                  <div className="pd-rating-bar-track">
                    <div className="pd-rating-bar-fill" style={{ width: `${reviewCount ? (count / reviewCount) * 100 : 0}%` }} />
                  </div>
                  <span className="pd-rating-bar-count">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {reviewCount === 0 ? (
          <p className="catalog-empty">No reviews yet.</p>
        ) : (
          <div className="pd-review-list">
            {reviews.map((r) => (
              <div key={r.id} className="pd-review-row">
                <div className="pd-review-head">
                  <strong>{r.user.name}</strong>
                  <span className="pd-stars pd-stars-small">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <StarIcon key={n} filled={n <= r.rating} />
                    ))}
                  </span>
                  {r.createdAt && <span className="pd-review-date">{new Date(r.createdAt).toLocaleDateString()}</span>}
                </div>
                {r.comment && <p className="pd-review-comment">{r.comment}</p>}
              </div>
            ))}
          </div>
        )}

        {user ? (
          <div className="pd-review-form-wrap">
            <h3>Leave a review</h3>
            <ReviewForm productId={id} onSubmitted={loadProduct} />
          </div>
        ) : (
          <p className="catalog-empty pd-login-prompt">
            <Link to="/login">Log in</Link> to leave a review (available after your order is delivered).
          </p>
        )}
      </section>

      {related.length > 0 && (
        <section className="pd-section">
          <h2>Related Products</h2>
          <div className="related-grid">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
