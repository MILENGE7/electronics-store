import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../api/client";
import { formatRWF } from "../utils/currency";
import { formatBrandName, formatCategoryName, formatProductName } from "../utils/format";
import Hero from "../components/Hero";
import CategoryCarousel from "../components/CategoryCarousel";
import ProductFilters from "../components/ProductFilters";
import ProductCard from "../components/ProductCard";
import RecentlyViewedSection from "../components/RecentlyViewedSection";
import { ProductGridSkeleton, ReviewCardSkeleton } from "../components/Skeletons";
import "./Home.css";

function ChevronRightIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SearchMiniIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M4 6h16M7 12h10M10 18h4" strokeLinecap="round" />
    </svg>
  );
}

function StarIcon({ filled }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.4" className={filled ? "" : "dim"}>
      <path d="M12 2.8l2.9 6.3 6.9.7-5.2 4.7 1.5 6.8L12 17.9l-6.1 3.4 1.5-6.8-5.2-4.7 6.9-.7L12 2.8z" strokeLinejoin="round" />
    </svg>
  );
}

function ShieldCheckIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 3l8 3v5c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6z" />
      <path d="M8.5 12l2.2 2.2 4.8-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

function TruckWhyIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M3 6h11v11H3z" />
      <path d="M14 10h4l3 3v4h-7z" />
      <circle cx="7" cy="19" r="2" />
      <circle cx="18" cy="19" r="2" />
    </svg>
  );
}

function WarrantyIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 2l7 3v6c0 5-3 8.5-7 11-4-2.5-7-6-7-11V5z" />
      <path d="M12 8v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HeadsetIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 13v-1a8 8 0 0 1 16 0v1" strokeLinecap="round" />
      <rect x="2.5" y="13" width="5" height="7" rx="1.6" />
      <rect x="16.5" y="13" width="5" height="7" rx="1.6" />
      <path d="M19.5 20a3 3 0 0 1-3 3h-2" strokeLinecap="round" />
    </svg>
  );
}

// Compact "RWF 100K" style label for filter chips.
function formatPriceShort(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return String(n);
  if (num >= 1000000) return (num % 1000000 === 0 ? num / 1000000 : (num / 1000000).toFixed(1)) + "M";
  if (num >= 1000) return Math.round(num / 1000) + "K";
  return String(num);
}

function sortProducts(list, sortBy) {
  if (!sortBy || sortBy === "recommended") return list;
  const arr = [...list];
  switch (sortBy) {
    case "newest":
      return arr.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    case "price-asc":
      return arr.sort((a, b) => Number(a.price) - Number(b.price));
    case "price-desc":
      return arr.sort((a, b) => Number(b.price) - Number(a.price));
    case "name-asc":
      return arr.sort((a, b) => a.name.localeCompare(b.name));
    case "name-desc":
      return arr.sort((a, b) => b.name.localeCompare(a.name));
    default:
      return list;
  }
}

// Keeps a URL query param and a local input buffer in sync, debouncing writes
// back to the URL so typing doesn't fire a request per keystroke, while still
// picking up external changes (browser back/forward, direct URL edits).
function useDebouncedParam(searchParams, updateParams, key, delay = 300) {
  const urlValue = searchParams.get(key) || "";
  const [value, setValue] = useState(urlValue);
  const committedRef = useRef(urlValue);

  useEffect(() => {
    if (urlValue !== committedRef.current) {
      setValue(urlValue);
      committedRef.current = urlValue;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlValue]);

  useEffect(() => {
    if (value === committedRef.current) return undefined;
    const t = setTimeout(() => {
      committedRef.current = value;
      updateParams({ [key]: value || undefined });
    }, delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return [value, setValue];
}

// Same idea as useDebouncedParam, but for two params that should always
// commit together (min/max price) — a single shared timer means there's
// only ever one write to the URL for the pair, so there's no window where
// two independent debounced commits could race and clobber each other.
function useDebouncedParamPair(searchParams, updateParams, keyA, keyB, delay = 350) {
  const urlA = searchParams.get(keyA) || "";
  const urlB = searchParams.get(keyB) || "";
  const [valueA, setValueA] = useState(urlA);
  const [valueB, setValueB] = useState(urlB);
  const committedRef = useRef({ a: urlA, b: urlB });

  useEffect(() => {
    if (urlA !== committedRef.current.a || urlB !== committedRef.current.b) {
      setValueA(urlA);
      setValueB(urlB);
      committedRef.current = { a: urlA, b: urlB };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlA, urlB]);

  useEffect(() => {
    if (valueA === committedRef.current.a && valueB === committedRef.current.b) return undefined;
    const t = setTimeout(() => {
      committedRef.current = { a: valueA, b: valueB };
      updateParams({ [keyA]: valueA || undefined, [keyB]: valueB || undefined });
    }, delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueA, valueB]);

  return [valueA, setValueA, valueB, setValueB];
}

export default function Home() {
  const [allProducts, setAllProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [reviews, setReviews] = useState([]);

  const [products, setProducts] = useState([]);

  const [drawerOpen, setDrawerOpen] = useState(false);

  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState(false);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState(false);
  const [curatedLoading, setCuratedLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [retryKey, setRetryKey] = useState(0);

  const [searchParams, setSearchParams] = useSearchParams();

  // react-router's setSearchParams closes over `searchParams` and gets a new
  // identity on every URL change. Two independently-debounced fields (e.g.
  // min/max price) can each schedule a setTimeout that captures whichever
  // setSearchParams existed at the time — if one fires before the other's
  // update has re-rendered the component, it patches from a stale `prev` and
  // clobbers the first change. Routing every call through a ref that's
  // reassigned on every render keeps updateParams itself stable while always
  // invoking the freshest setSearchParams, so sequential debounced commits
  // always compose instead of racing.
  const setSearchParamsRef = useRef(setSearchParams);
  setSearchParamsRef.current = setSearchParams;

  const updateParams = useCallback((patch) => {
    setSearchParamsRef.current((prev) => {
      const next = new URLSearchParams(prev);
      Object.entries(patch).forEach(([k, v]) => {
        if (v === undefined || v === null || v === "") next.delete(k);
        else next.set(k, String(v));
      });
      return next;
    });
  }, []);

  const activeCategory = searchParams.get("category") || "";
  const activeBrand = searchParams.get("brand") || "";
  const activeInStock = searchParams.get("inStock") === "1";
  const activeSort = searchParams.get("sort") || "recommended";
  const isFiltered = Boolean(activeCategory) && activeCategory !== "all";

  const [searchInput, setSearchInput] = useDebouncedParam(searchParams, updateParams, "search", 300);
  const [minPriceInput, setMinPriceInput, maxPriceInput, setMaxPriceInput] = useDebouncedParamPair(
    searchParams,
    updateParams,
    "minPrice",
    "maxPrice",
    350
  );

  const activeSearch = searchParams.get("search") || "";
  const activeMinPrice = searchParams.get("minPrice") || "";
  const activeMaxPrice = searchParams.get("maxPrice") || "";

  useEffect(() => {
    setCategoriesLoading(true);
    setCategoriesError(false);
    api
      .get("/categories")
      .then((res) => setCategories(res.data))
      .catch(() => setCategoriesError(true))
      .finally(() => setCategoriesLoading(false));
  }, [retryKey]);

  useEffect(() => {
    setCuratedLoading(true);
    api
      .get("/products", { params: { limit: 24 } })
      .then((res) => setAllProducts(res.data.products))
      .catch(() => setAllProducts([]))
      .finally(() => setCuratedLoading(false));
  }, [retryKey]);

  // Category, search and price are filtered server-side (the existing API
  // already supports them). Brand, stock and sort are applied client-side
  // below since every returned product already carries those fields.
  useEffect(() => {
    setProductsLoading(true);
    setProductsError(false);
    api
      .get("/products", {
        params: {
          search: activeSearch || undefined,
          category: isFiltered ? activeCategory : undefined,
          minPrice: activeMinPrice || undefined,
          maxPrice: activeMaxPrice || undefined,
          limit: 100,
        },
      })
      .then((res) => setProducts(res.data.products))
      .catch(() => setProductsError(true))
      .finally(() => setProductsLoading(false));
  }, [activeSearch, activeCategory, isFiltered, activeMinPrice, activeMaxPrice, retryKey]);

  useEffect(() => {
    if (allProducts.length === 0) {
      setReviewsLoading(false);
      return;
    }
    setReviewsLoading(true);
    const sample = allProducts.slice(0, 4);
    Promise.all(
      sample.map((p) =>
        api
          .get(`/products/${p.id}/reviews`, { params: { limit: 3 } })
          .then((res) => res.data.reviews.map((r) => ({ ...r, productName: p.name })))
          .catch(() => [])
      )
    )
      .then((lists) => {
        const flat = lists.flat().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setReviews(flat.slice(0, 3));
      })
      .finally(() => setReviewsLoading(false));
  }, [allProducts]);

  // Lock body scroll + close on Escape while the mobile filter drawer is open.
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape") setDrawerOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const trending = useMemo(() => allProducts.slice(0, 8), [allProducts]);

  const bestSellers = useMemo(
    () => [...allProducts].sort((a, b) => a.stock - b.stock).slice(0, 6),
    [allProducts]
  );

  const dealProduct = allProducts[0];

  const brands = useMemo(() => {
    const map = new Map();
    allProducts.forEach((p) => {
      if (!p.brand) return;
      const key = p.brand.trim().toLowerCase();
      if (!map.has(key)) map.set(key, { value: key, label: formatBrandName(p.brand) });
    });
    return [...map.values()];
  }, [allProducts]);

  // Server already applied search/category/price. Brand, in-stock and sort
  // are layered on client-side against that already-narrowed set.
  const finalProducts = useMemo(() => {
    let list = products;
    if (activeBrand) list = list.filter((p) => p.brand?.trim().toLowerCase() === activeBrand);
    if (activeInStock) list = list.filter((p) => p.stock > 0);
    return sortProducts(list, activeSort);
  }, [products, activeBrand, activeInStock, activeSort]);

  const catalogHeadingParts = [activeBrand ? formatBrandName(activeBrand) : "", isFiltered ? activeCategory : ""].filter(Boolean);
  const catalogHeading = catalogHeadingParts.length > 0 ? catalogHeadingParts.join(" · ") : "All Products";

  const hasActiveFilters = Boolean(
    isFiltered || activeBrand || activeMinPrice || activeMaxPrice || activeInStock || activeSort !== "recommended"
  );

  const activeFilterCount = [isFiltered, Boolean(activeBrand), Boolean(activeMinPrice), Boolean(activeMaxPrice), activeInStock].filter(
    Boolean
  ).length;

  const selectCategory = useCallback(
    (name) => {
      updateParams({ category: name === activeCategory ? undefined : name || undefined });
    },
    [updateParams, activeCategory]
  );

  const selectBrand = useCallback(
    (value) => {
      updateParams({ brand: value === activeBrand ? undefined : value || undefined });
    },
    [updateParams, activeBrand]
  );

  function selectBrandFromHomepage(value) {
    selectBrand(value);
    document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" });
  }

  function toggleInStock(checked) {
    updateParams({ inStock: checked ? "1" : undefined });
  }

  function setSort(value) {
    updateParams({ sort: value === "recommended" ? undefined : value });
  }

  function clearPrice() {
    updateParams({ minPrice: undefined, maxPrice: undefined });
    setMinPriceInput("");
    setMaxPriceInput("");
  }

  function clearSearchOnly() {
    updateParams({ search: undefined });
    setSearchInput("");
  }

  // "Clear Filters" resets filters (category/brand/price/stock/sort) but
  // intentionally leaves an active search term in place.
  function clearFiltersOnly() {
    updateParams({ category: undefined, brand: undefined, minPrice: undefined, maxPrice: undefined, inStock: undefined, sort: undefined });
    setMinPriceInput("");
    setMaxPriceInput("");
  }

  // Used by the empty-results state, where leaving a stale search term in
  // place would just re-produce zero results — clearing everything is what
  // actually gets the shopper back to seeing products.
  function clearAll() {
    updateParams({
      category: undefined,
      brand: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      inStock: undefined,
      sort: undefined,
      search: undefined,
    });
    setSearchInput("");
    setMinPriceInput("");
    setMaxPriceInput("");
  }

  function viewAllProducts() {
    clearAll();
  }

  const chips = useMemo(() => {
    const list = [];
    if (activeSearch) list.push({ key: "search", label: `Search: ${activeSearch}`, onRemove: clearSearchOnly });
    if (isFiltered) list.push({ key: "category", label: `Category: ${formatCategoryName(activeCategory)}`, onRemove: () => selectCategory("") });
    if (activeBrand) list.push({ key: "brand", label: `Brand: ${formatBrandName(activeBrand)}`, onRemove: () => selectBrand("") });
    if (activeMinPrice || activeMaxPrice) {
      const label =
        activeMinPrice && activeMaxPrice
          ? `Price: RWF ${formatPriceShort(activeMinPrice)}–${formatPriceShort(activeMaxPrice)}`
          : activeMinPrice
          ? `Price: RWF ${formatPriceShort(activeMinPrice)}+`
          : `Price: Under RWF ${formatPriceShort(activeMaxPrice)}`;
      list.push({ key: "price", label, onRemove: clearPrice });
    }
    if (activeInStock) list.push({ key: "stock", label: "In Stock", onRemove: () => toggleInStock(false) });
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSearch, isFiltered, activeCategory, activeBrand, activeMinPrice, activeMaxPrice, activeInStock]);

  function retry() {
    setRetryKey((k) => k + 1);
  }

  function renderCard(p, rank) {
    return <ProductCard key={p.id} product={p} rank={rank} />;
  }

  const filtersProps = {
    categories,
    activeCategory,
    onSelectCategory: selectCategory,
    brands,
    activeBrand,
    onSelectBrand: selectBrand,
    minPriceInput,
    maxPriceInput,
    onMinPriceChange: setMinPriceInput,
    onMaxPriceChange: setMaxPriceInput,
    inStockOnly: activeInStock,
    onToggleInStock: toggleInStock,
    onClearFilters: clearFiltersOnly,
    hasActiveFilters,
  };

  return (
    <div>
      <Hero />

      <CategoryCarousel
        categories={categories}
        activeCategory={activeCategory}
        onSelect={selectCategory}
        loading={categoriesLoading}
        error={categoriesError}
      />

      {(curatedLoading || trending.length > 0) && (
        <section className="strip-section">
          <div className="strip-inner">
            <div className="strip-header">
              <div>
                <h2 className="section-title">Trending Now</h2>
                <p className="section-sub">Fresh arrivals our customers are loving</p>
              </div>
            </div>

            <div className="strip-track">
              {curatedLoading ? <ProductGridSkeleton count={4} /> : trending.map((p) => renderCard(p))}
            </div>
          </div>
        </section>
      )}

      {(curatedLoading || bestSellers.length > 0) && (
        <section className="strip-section strip-section-alt">
          <div className="strip-inner">
            <div className="strip-header">
              <div>
                <h2 className="section-title">Best Sellers</h2>
                <p className="section-sub">Popular picks, moving fast</p>
              </div>
            </div>

            <div className="strip-track">
              {curatedLoading ? <ProductGridSkeleton count={4} /> : bestSellers.map((p, i) => renderCard(p, i + 1))}
            </div>
          </div>
        </section>
      )}

      {dealProduct && (
        <section className="deal-section">
          <div className="deal-inner">
            <div className="deal-image">
              {dealProduct.images?.[0] ? (
                <img src={dealProduct.images[0]} alt={formatProductName(dealProduct.name)} />
              ) : (
                <span className="product-card-placeholder">{dealProduct.name.slice(0, 1)}</span>
              )}
            </div>

            <div className="deal-copy">
              <p className="deal-eyebrow">Deal of the Week</p>
              <h2 className="deal-title">{formatProductName(dealProduct.name)}</h2>

              {dealProduct.description && <p className="deal-desc">{dealProduct.description}</p>}

              <p className="price deal-price">{formatRWF(dealProduct.price)}</p>

              <Link to={`/products/${dealProduct.id}`} className="hero-btn hero-btn-primary">
                Shop Now
                <span>→</span>
              </Link>
            </div>
          </div>
        </section>
      )}

      <section className="why-section">
        <div className="why-inner">
          <h2 className="section-title section-title-center">Why FK Trading?</h2>

          <div className="why-grid">
            <div className="why-card">
              <ShieldCheckIcon />
              <h3>Authentic Products</h3>
              <p>100% genuine electronics, sourced responsibly.</p>
            </div>

            <div className="why-card">
              <LockIcon />
              <h3>Secure Payments</h3>
              <p>Your transactions are encrypted and protected.</p>
            </div>

            <div className="why-card">
              <TruckWhyIcon />
              <h3>Fast Rwanda Delivery</h3>
              <p>Reliable delivery to every corner of the country.</p>
            </div>

            <div className="why-card">
              <WarrantyIcon />
              <h3>1-Year Warranty</h3>
              <p>Every product is backed by our warranty.</p>
            </div>

            <div className="why-card">
              <HeadsetIcon />
              <h3>Customer Support</h3>
              <p>Our team is here whenever you need help.</p>
            </div>
          </div>
        </div>
      </section>

      {brands.length > 0 && (
        <section className="brand-section">
          <div className="brand-inner">
            <h2 className="section-title">Shop by Brand</h2>

            <div className="brand-row">
              {brands.map((b) => (
                <button
                  type="button"
                  key={b.value}
                  className={`brand-chip ${activeBrand === b.value ? "active" : ""}`}
                  onClick={() => selectBrandFromHomepage(b.value)}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      <RecentlyViewedSection />

      <section className="reviews-section">
        <div className="reviews-inner">
          <h2 className="section-title section-title-center">What Our Customers Say</h2>

          {reviewsLoading ? (
            <div className="reviews-grid">
              <ReviewCardSkeleton />
              <ReviewCardSkeleton />
              <ReviewCardSkeleton />
            </div>
          ) : reviews.length === 0 ? (
            <p className="catalog-empty reviews-empty">
              No reviews yet — be the first to share your experience once your order is delivered.
            </p>
          ) : (
            <div className="reviews-grid">
              {reviews.map((r) => (
                <div key={r.id} className="review-card">
                  <div className="review-stars">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <StarIcon key={n} filled={n <= r.rating} />
                    ))}
                  </div>

                  {r.comment && <p className="review-comment">"{r.comment}"</p>}

                  <p className="review-meta">
                    <strong>{r.user?.name || "Verified buyer"}</strong> · {formatProductName(r.productName)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section id="catalog" className="page-main">
        <div className="catalog-header">
          <h2 className="catalog-title-text">{catalogHeading}</h2>

          <div className="catalog-controls">
            <div className="catalog-search-wrap">
              <input
                className="catalog-search"
                placeholder="Search products..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                aria-label="Search products in catalog"
              />
              <SearchMiniIcon />
            </div>

            <button type="button" className="catalog-view-all" onClick={viewAllProducts}>
              View all
              <ChevronRightIcon />
            </button>
          </div>
        </div>

        <div className="catalog-toolbar">
          <button type="button" className="catalog-filters-btn" onClick={() => setDrawerOpen(true)}>
            <FilterIcon />
            Filters
            {activeFilterCount > 0 && <span className="catalog-filters-badge">{activeFilterCount}</span>}
          </button>

          <p className="catalog-result-count" aria-live="polite">
            {productsLoading ? "Loading products…" : `${finalProducts.length} product${finalProducts.length === 1 ? "" : "s"}`}
          </p>

          <label className="catalog-sort">
            <span>Sort by</span>
            <select value={activeSort} onChange={(e) => setSort(e.target.value)} aria-label="Sort products">
              <option value="recommended">Recommended</option>
              <option value="newest">Newest</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="name-asc">Name: A to Z</option>
              <option value="name-desc">Name: Z to A</option>
            </select>
          </label>
        </div>

        {chips.length > 0 && (
          <div className="filter-chips-row">
            {chips.map((c) => (
              <button type="button" key={c.key} className="filter-chip" onClick={c.onRemove}>
                {c.label}
                <span aria-hidden="true">×</span>
              </button>
            ))}
            <button type="button" className="filter-chip filter-chip-clearall" onClick={clearAll}>
              Clear all
            </button>
          </div>
        )}

        <div className="catalog-layout">
          <aside className="catalog-sidebar">
            <ProductFilters {...filtersProps} variant="sidebar" />
          </aside>

          <div className="catalog-results">
            {productsError ? (
              <div className="state-error">
                <p>Unable to load products right now.</p>
                <button type="button" className="btn btn-outline" onClick={retry}>
                  Try Again
                </button>
              </div>
            ) : productsLoading ? (
              <div className="product-grid">
                <ProductGridSkeleton count={8} />
              </div>
            ) : finalProducts.length === 0 ? (
              <div className="catalog-empty-state">
                <p className="catalog-empty-title">No products found</p>
                <p className="catalog-empty-sub">Try adjusting your search or filters.</p>
                <button type="button" className="btn btn-outline" onClick={clearAll}>
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="product-grid">{finalProducts.map((p) => renderCard(p))}</div>
            )}
          </div>
        </div>
      </section>

      {drawerOpen && (
        <>
          <div className="filter-drawer-backdrop" onClick={() => setDrawerOpen(false)} />
          <div className="filter-drawer" role="dialog" aria-modal="true" aria-label="Filter products">
            <ProductFilters {...filtersProps} variant="drawer" onClose={() => setDrawerOpen(false)} />
          </div>
        </>
      )}
    </div>
  );
}
