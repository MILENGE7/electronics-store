import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../api/client";
import { formatRWF } from "../utils/currency";
import { formatBrandName, formatCategoryName, formatProductName } from "../utils/format";
import "../components/Skeletons.css";
import "./SearchSuggestions.css";

const RECENT_KEY = "fk_recent_searches";
const MAX_RECENT = 6;

function loadRecentSearches() {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function saveRecentSearches(list) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    // localStorage unavailable (private mode, quota) — recent searches just won't persist
  }
}

function SearchIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.3" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.3" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.3" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.3" />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12.5 3H5a2 2 0 0 0-2 2v7.5a1 1 0 0 0 .3.7l9 9a1 1 0 0 0 1.4 0l7.5-7.5a1 1 0 0 0 0-1.4l-9-9a1 1 0 0 0-.7-.3z" strokeLinejoin="round" />
      <circle cx="8" cy="8" r="1.4" />
    </svg>
  );
}

export default function SearchSuggestions({ className = "", placeholder = "Search products...", onNavigate }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorState, setErrorState] = useState(false);
  const [open, setOpen] = useState(false);
  const [searched, setSearched] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const [recentSearches, setRecentSearches] = useState(loadRecentSearches);
  const [catalogIndex, setCatalogIndex] = useState({ categories: [], products: [], loaded: false, loading: false });

  const debounceRef = useRef(null);
  const requestIdRef = useRef(0);
  const containerRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const trimmedQuery = query.trim();
  const isRecentMode = trimmedQuery.length === 0;

  function runSearch(trimmed) {
    setLoading(true);
    setErrorState(false);
    const myId = ++requestIdRef.current;
    api
      .get("/products", { params: { search: trimmed, limit: 6 } })
      .then((res) => {
        if (myId !== requestIdRef.current) return; // a newer search superseded this response
        setResults(res.data.products);
        setTotal(res.data.total ?? res.data.products.length);
      })
      .catch(() => {
        if (myId !== requestIdRef.current) return;
        setResults([]);
        setTotal(0);
        setErrorState(true);
      })
      .finally(() => {
        if (myId !== requestIdRef.current) return;
        setLoading(false);
        setSearched(true);
      });
  }

  useEffect(() => {
    clearTimeout(debounceRef.current);

    if (!trimmedQuery) {
      requestIdRef.current++; // invalidate any in-flight request
      setResults([]);
      setTotal(0);
      setLoading(false);
      setErrorState(false);
      setSearched(false);
      return undefined;
    }

    setLoading(true);
    setErrorState(false);
    debounceRef.current = setTimeout(() => runSearch(trimmedQuery), 300);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trimmedQuery]);

  useEffect(() => {
    function handleOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  function ensureCatalogIndex() {
    setCatalogIndex((prev) => {
      if (prev.loaded || prev.loading) return prev;
      Promise.all([
        api.get("/categories").catch(() => ({ data: [] })),
        api.get("/products", { params: { limit: 100 } }).catch(() => ({ data: { products: [] } })),
      ]).then(([catRes, prodRes]) => {
        setCatalogIndex({
          categories: Array.isArray(catRes.data) ? catRes.data : [],
          products: prodRes.data?.products || [],
          loaded: true,
          loading: false,
        });
      });
      return { ...prev, loading: true };
    });
  }

  const allBrands = useMemo(() => {
    const map = new Map();
    catalogIndex.products.forEach((p) => {
      if (!p.brand) return;
      const key = p.brand.trim().toLowerCase();
      if (!map.has(key)) map.set(key, { value: key, label: formatBrandName(p.brand) });
    });
    return [...map.values()];
  }, [catalogIndex.products]);

  const matchedCategories = useMemo(() => {
    if (!trimmedQuery) return [];
    const q = trimmedQuery.toLowerCase();
    return catalogIndex.categories
      .filter((c) => c.name.toLowerCase().includes(q) || formatCategoryName(c.name).toLowerCase().includes(q))
      .slice(0, 4);
  }, [catalogIndex.categories, trimmedQuery]);

  const matchedBrands = useMemo(() => {
    if (!trimmedQuery) return [];
    const q = trimmedQuery.toLowerCase();
    return allBrands.filter((b) => b.value.includes(q)).slice(0, 4);
  }, [allBrands, trimmedQuery]);

  const navItems = useMemo(() => {
    if (isRecentMode) return recentSearches.map((term) => ({ type: "recent", term }));
    if (loading || errorState) return [];
    const items = [];
    results.forEach((p) => items.push({ type: "product", data: p }));
    matchedCategories.forEach((c) => items.push({ type: "category", data: c }));
    matchedBrands.forEach((b) => items.push({ type: "brand", data: b }));
    return items;
  }, [isRecentMode, recentSearches, loading, errorState, results, matchedCategories, matchedBrands]);

  const showDropdown = open && (isRecentMode ? recentSearches.length > 0 : true);

  function addRecentSearch(term) {
    const t = term.trim();
    if (!t) return;
    setRecentSearches((prev) => {
      const next = [t, ...prev.filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, MAX_RECENT);
      saveRecentSearches(next);
      return next;
    });
  }

  function removeRecentSearch(term) {
    setRecentSearches((prev) => {
      const next = prev.filter((x) => x !== term);
      saveRecentSearches(next);
      return next;
    });
  }

  function clearRecentSearches() {
    setRecentSearches([]);
    saveRecentSearches([]);
  }

  // Only the `key` param is touched — everything else in the URL (other
  // active filters) is preserved when already on the catalog page, matching
  // how Home's own filter controls (category chips, brand chips, the inline
  // catalog search box) already behave.
  function navigateWithParam(key, value) {
    setOpen(false);
    onNavigate?.();
    const onHome = location.pathname === "/";
    const params = onHome ? new URLSearchParams(location.search) : new URLSearchParams();
    if (value) params.set(key, value);
    else params.delete(key);
    navigate(`/?${params.toString()}`);
  }

  function runFullSearch(term) {
    const trimmed = term.trim();
    if (!trimmed) return;
    addRecentSearch(trimmed);
    setQuery("");
    navigateWithParam("search", trimmed);
  }

  function goToProduct(product) {
    if (trimmedQuery) addRecentSearch(trimmedQuery);
    setOpen(false);
    setQuery("");
    onNavigate?.();
    navigate(`/products/${product.id}`);
  }

  function goToCategory(category) {
    if (trimmedQuery) addRecentSearch(trimmedQuery);
    setQuery("");
    navigateWithParam("category", category.name);
  }

  function goToBrand(brand) {
    if (trimmedQuery) addRecentSearch(trimmedQuery);
    setQuery("");
    navigateWithParam("brand", brand.value);
  }

  function activateItem(item) {
    if (item.type === "product") goToProduct(item.data);
    else if (item.type === "category") goToCategory(item.data);
    else if (item.type === "brand") goToBrand(item.data);
    else if (item.type === "recent") runFullSearch(item.term);
  }

  function clear() {
    setQuery("");
    setResults([]);
    setHighlighted(-1);
    setRecentSearches(loadRecentSearches());
  }

  function handleFocus() {
    setOpen(true);
    setHighlighted(-1);
    setRecentSearches(loadRecentSearches());
    ensureCatalogIndex();
  }

  function handleKeyDown(e) {
    if (e.key === "Escape") {
      setOpen(false);
      e.currentTarget.blur();
      return;
    }
    if (!open) return;

    if (e.key === "ArrowDown") {
      if (navItems.length === 0) return;
      e.preventDefault();
      setHighlighted((i) => (i + 1) % navItems.length);
    } else if (e.key === "ArrowUp") {
      if (navItems.length === 0) return;
      e.preventDefault();
      setHighlighted((i) => (i - 1 + navItems.length) % navItems.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlighted >= 0 && navItems[highlighted]) {
        activateItem(navItems[highlighted]);
      } else if (trimmedQuery) {
        runFullSearch(trimmedQuery);
      }
    }
  }

  const activeId = highlighted >= 0 && navItems[highlighted] ? `search-opt-${highlighted}` : undefined;
  const noMatches = !loading && !errorState && !isRecentMode && searched && results.length === 0 && matchedCategories.length === 0 && matchedBrands.length === 0;

  return (
    <div className={`search-suggest ${className}`} ref={containerRef}>
      <div className="search-suggest-box">
        <SearchIcon />
        <input
          type="text"
          value={query}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setHighlighted(-1);
          }}
          onFocus={handleFocus}
          onClick={handleFocus}
          onKeyDown={handleKeyDown}
          aria-label="Search products"
          aria-expanded={showDropdown}
          aria-autocomplete="list"
          aria-controls="search-suggest-listbox"
          aria-activedescendant={activeId}
          role="combobox"
        />
        {query && (
          <button type="button" className="search-suggest-clear" aria-label="Clear search" onClick={clear}>
            <CloseIcon />
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="search-suggest-dropdown" id="search-suggest-listbox" role="listbox">
          {isRecentMode ? (
            <div className="search-suggest-section">
              <div className="search-suggest-section-head">
                <span className="search-suggest-section-title">Recent Searches</span>
                <button type="button" className="search-suggest-clearall" onClick={clearRecentSearches}>
                  Clear all
                </button>
              </div>
              {recentSearches.map((term, i) => (
                <div
                  key={term}
                  id={`search-opt-${i}`}
                  role="option"
                  aria-selected={highlighted === i}
                  className={`search-suggest-recent-item ${highlighted === i ? "active" : ""}`}
                >
                  <button
                    type="button"
                    className="search-suggest-recent-term"
                    onClick={() => runFullSearch(term)}
                    onMouseEnter={() => setHighlighted(i)}
                  >
                    <ClockIcon />
                    <span>{term}</span>
                  </button>
                  <button
                    type="button"
                    className="search-suggest-recent-remove"
                    aria-label={`Remove "${term}" from recent searches`}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeRecentSearch(term);
                    }}
                  >
                    <CloseIcon />
                  </button>
                </div>
              ))}
            </div>
          ) : errorState ? (
            <div className="search-suggest-state search-suggest-error">
              <p>Search is temporarily unavailable.</p>
              <button type="button" className="search-suggest-retry" onClick={() => runSearch(trimmedQuery)}>
                Try again
              </button>
            </div>
          ) : loading ? (
            <div className="search-suggest-skeleton" aria-hidden="true">
              <div className="search-suggest-skeleton-row">
                <span className="skeleton-shimmer" style={{ width: 42, height: 42, borderRadius: 8, flexShrink: 0 }} />
                <span style={{ flex: 1 }}>
                  <span className="skeleton-line skeleton-shimmer" style={{ width: "70%", height: 11, display: "block" }} />
                  <span className="skeleton-line skeleton-shimmer" style={{ width: "40%", height: 10, display: "block", marginTop: 8 }} />
                </span>
              </div>
              <div className="search-suggest-skeleton-row">
                <span className="skeleton-shimmer" style={{ width: 42, height: 42, borderRadius: 8, flexShrink: 0 }} />
                <span style={{ flex: 1 }}>
                  <span className="skeleton-line skeleton-shimmer" style={{ width: "55%", height: 11, display: "block" }} />
                  <span className="skeleton-line skeleton-shimmer" style={{ width: "35%", height: 10, display: "block", marginTop: 8 }} />
                </span>
              </div>
            </div>
          ) : noMatches ? (
            <div className="search-suggest-state search-suggest-noresults">
              <p className="search-suggest-noresults-title">
                No products found for &quot;{trimmedQuery}&quot;
              </p>
              <p className="search-suggest-noresults-hint">Try searching for another product name, brand, or category.</p>
            </div>
          ) : (
            <>
              {results.length > 0 && (
                <div className="search-suggest-section">
                  <span className="search-suggest-section-title">Products</span>
                  {results.map((p, i) => (
                    <button
                      type="button"
                      key={p.id}
                      id={`search-opt-${i}`}
                      role="option"
                      aria-selected={highlighted === i}
                      className={`search-suggest-item ${highlighted === i ? "active" : ""}`}
                      onClick={() => goToProduct(p)}
                      onMouseEnter={() => setHighlighted(i)}
                    >
                      <span className="search-suggest-thumb">
                        {p.images?.[0] ? <img src={p.images[0]} alt="" /> : <span>{p.name.slice(0, 1)}</span>}
                      </span>
                      <span className="search-suggest-info">
                        <span className="search-suggest-name">{formatProductName(p.name)}</span>
                        {p.brand && <span className="search-suggest-brand">{formatBrandName(p.brand)}</span>}
                      </span>
                      <span className="search-suggest-price">{formatRWF(p.price)}</span>
                    </button>
                  ))}
                  {total > results.length && (
                    <button type="button" className="search-suggest-viewall" onClick={() => runFullSearch(trimmedQuery)}>
                      View all {total} results
                    </button>
                  )}
                </div>
              )}

              {matchedCategories.length > 0 && (
                <div className="search-suggest-section">
                  <span className="search-suggest-section-title">Categories</span>
                  {matchedCategories.map((c, i) => {
                    const idx = results.length + i;
                    return (
                      <button
                        type="button"
                        key={c.id}
                        id={`search-opt-${idx}`}
                        role="option"
                        aria-selected={highlighted === idx}
                        className={`search-suggest-tag-item ${highlighted === idx ? "active" : ""}`}
                        onClick={() => goToCategory(c)}
                        onMouseEnter={() => setHighlighted(idx)}
                      >
                        <GridIcon />
                        <span>{formatCategoryName(c.name)}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {matchedBrands.length > 0 && (
                <div className="search-suggest-section">
                  <span className="search-suggest-section-title">Brands</span>
                  {matchedBrands.map((b, i) => {
                    const idx = results.length + matchedCategories.length + i;
                    return (
                      <button
                        type="button"
                        key={b.value}
                        id={`search-opt-${idx}`}
                        role="option"
                        aria-selected={highlighted === idx}
                        className={`search-suggest-tag-item ${highlighted === idx ? "active" : ""}`}
                        onClick={() => goToBrand(b)}
                        onMouseEnter={() => setHighlighted(idx)}
                      >
                        <TagIcon />
                        <span>{b.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
