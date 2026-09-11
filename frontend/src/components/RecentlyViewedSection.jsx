import { useEffect, useState } from "react";
import api from "../api/client";
import { useRecentlyViewed } from "../context/RecentlyViewedContext";
import ProductCard from "./ProductCard";
import { ProductGridSkeleton } from "./Skeletons";

const DISPLAY_LIMIT = 6;

// Home's "Continue Shopping" strip. Reuses the exact recently-viewed history
// that ProductDetail records — a separate "Recently Viewed" grid would just
// be the same data shown twice on one page.
export default function RecentlyViewedSection() {
  const { ids, removeId } = useRecentlyViewed();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const displayIds = ids.slice(0, DISPLAY_LIMIT);
  const idsKey = displayIds.join(",");

  useEffect(() => {
    if (displayIds.length === 0) {
      setProducts([]);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);

    Promise.all(
      displayIds.map((id) =>
        api
          .get(`/products/${id}`)
          .then((res) => res.data)
          .catch(() => null)
      )
    ).then((results) => {
      if (cancelled) return;
      const found = [];
      results.forEach((product, i) => {
        if (product) found.push(product);
        else removeId(displayIds[i]); // stored ID whose product no longer exists — drop it silently
      });
      setProducts(found);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  // No history yet (new visitor), and nothing left after validation — stay invisible.
  if (!loading && products.length === 0) return null;

  return (
    <section className="strip-section">
      <div className="strip-inner">
        <div className="strip-header">
          <div>
            <h2 className="section-title">Continue Shopping</h2>
            <p className="section-sub">Pick up where you left off</p>
          </div>
        </div>

        <div className="strip-track">
          {loading ? (
            <ProductGridSkeleton count={Math.min(displayIds.length, 4) || 4} />
          ) : (
            products.map((p) => <ProductCard key={p.id} product={p} />)
          )}
        </div>
      </div>
    </section>
  );
}
