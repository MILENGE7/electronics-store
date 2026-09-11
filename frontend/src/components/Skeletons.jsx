import "./Skeletons.css";

export function ProductCardSkeleton() {
  return (
    <div className="product-card skeleton-card" aria-hidden="true">
      <div className="product-card-image skeleton-shimmer" />
      <div className="product-card-body">
        <span className="skeleton-line skeleton-shimmer" style={{ width: "40%", height: 10 }} />
        <span className="skeleton-line skeleton-shimmer" style={{ width: "78%", height: 15, marginTop: 10 }} />
        <span className="skeleton-line skeleton-shimmer" style={{ width: "35%", height: 17, marginTop: 10 }} />
        <span className="skeleton-line skeleton-shimmer" style={{ width: "100%", height: 38, marginTop: 12, borderRadius: 8 }} />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </>
  );
}

export function CategoryTileSkeleton() {
  return (
    <div className="category-tile skeleton-card" aria-hidden="true">
      <span className="category-tile-icon skeleton-shimmer" style={{ background: "transparent" }} />
      <span className="category-tile-text">
        <span className="skeleton-line skeleton-shimmer" style={{ width: 64, height: 11 }} />
        <span className="skeleton-line skeleton-shimmer" style={{ width: 88, height: 9, marginTop: 7 }} />
      </span>
    </div>
  );
}

export function ProductDetailSkeleton() {
  return (
    <div className="product-detail-skeleton" aria-hidden="true">
      <div className="product-detail-skeleton-gallery">
        <span className="skeleton-shimmer" style={{ display: "block", width: "100%", aspectRatio: "1 / 1", borderRadius: 16 }} />
        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <span key={i} className="skeleton-shimmer" style={{ width: 64, height: 64, borderRadius: 10, flexShrink: 0 }} />
          ))}
        </div>
      </div>

      <div className="product-detail-skeleton-info">
        <span className="skeleton-line skeleton-shimmer" style={{ width: "30%", height: 11 }} />
        <span className="skeleton-line skeleton-shimmer" style={{ width: "70%", height: 26, marginTop: 14 }} />
        <span className="skeleton-line skeleton-shimmer" style={{ width: "40%", height: 14, marginTop: 12 }} />
        <span className="skeleton-line skeleton-shimmer" style={{ width: "35%", height: 30, marginTop: 18 }} />
        <span className="skeleton-line skeleton-shimmer" style={{ width: "25%", height: 16, marginTop: 14 }} />
        <div style={{ display: "flex", gap: 12, marginTop: 22 }}>
          <span className="skeleton-shimmer" style={{ flex: 1, height: 48, borderRadius: 9 }} />
          <span className="skeleton-shimmer" style={{ flex: 1, height: 48, borderRadius: 9 }} />
        </div>
        <span className="skeleton-line skeleton-shimmer" style={{ width: "100%", height: 12, marginTop: 26 }} />
        <span className="skeleton-line skeleton-shimmer" style={{ width: "92%", height: 12, marginTop: 8 }} />
        <span className="skeleton-line skeleton-shimmer" style={{ width: "80%", height: 12, marginTop: 8 }} />
      </div>
    </div>
  );
}

export function ReviewCardSkeleton() {
  return (
    <div className="review-card skeleton-card" aria-hidden="true">
      <span className="skeleton-line skeleton-shimmer" style={{ width: 96, height: 13 }} />
      <span className="skeleton-line skeleton-shimmer" style={{ width: "100%", height: 12, marginTop: 16 }} />
      <span className="skeleton-line skeleton-shimmer" style={{ width: "82%", height: 12, marginTop: 8 }} />
      <span className="skeleton-line skeleton-shimmer" style={{ width: 130, height: 10, marginTop: 18 }} />
    </div>
  );
}
