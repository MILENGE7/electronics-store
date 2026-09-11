import { formatBrandName, formatCategoryName } from "../utils/format";
import "./ProductFilters.css";

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}

export default function ProductFilters({
  categories,
  activeCategory,
  onSelectCategory,
  brands,
  activeBrand,
  onSelectBrand,
  minPriceInput,
  maxPriceInput,
  onMinPriceChange,
  onMaxPriceChange,
  inStockOnly,
  onToggleInStock,
  onClearFilters,
  hasActiveFilters,
  variant = "sidebar",
  onClose,
}) {
  const isDrawer = variant === "drawer";

  return (
    <div className={`product-filters ${isDrawer ? "product-filters-drawer" : "product-filters-sidebar"}`}>
      <div className="product-filters-head">
        <h3>Filters</h3>

        <div className="product-filters-head-actions">
          {hasActiveFilters && (
            <button type="button" className="product-filters-clear-link" onClick={onClearFilters}>
              Clear Filters
            </button>
          )}

          {isDrawer && (
            <button type="button" className="product-filters-close" onClick={onClose} aria-label="Close filters">
              <CloseIcon />
            </button>
          )}
        </div>
      </div>

      <div className="product-filters-body">
        {/* CATEGORY */}
        <fieldset className="filter-group">
          <legend>Category</legend>
          <div className="filter-option-list" role="radiogroup" aria-label="Filter by category">
            <button
              type="button"
              role="radio"
              aria-checked={!activeCategory}
              className={`filter-option ${!activeCategory ? "active" : ""}`}
              onClick={() => onSelectCategory("")}
            >
              <span className="filter-option-dot" aria-hidden="true" />
              All Categories
            </button>

            {categories.map((c) => (
              <button
                type="button"
                key={c.id}
                role="radio"
                aria-checked={activeCategory === c.name}
                className={`filter-option ${activeCategory === c.name ? "active" : ""}`}
                onClick={() => onSelectCategory(c.name)}
              >
                <span className="filter-option-dot" aria-hidden="true" />
                {formatCategoryName(c.name)}
              </button>
            ))}
          </div>
        </fieldset>

        {/* BRAND */}
        {brands.length > 0 && (
          <fieldset className="filter-group">
            <legend>Brand</legend>
            <div className="filter-option-list" role="radiogroup" aria-label="Filter by brand">
              <button
                type="button"
                role="radio"
                aria-checked={!activeBrand}
                className={`filter-option ${!activeBrand ? "active" : ""}`}
                onClick={() => onSelectBrand("")}
              >
                <span className="filter-option-dot" aria-hidden="true" />
                All Brands
              </button>

              {brands.map((b) => (
                <button
                  type="button"
                  key={b.value}
                  role="radio"
                  aria-checked={activeBrand === b.value}
                  className={`filter-option ${activeBrand === b.value ? "active" : ""}`}
                  onClick={() => onSelectBrand(b.value)}
                >
                  <span className="filter-option-dot" aria-hidden="true" />
                  {b.label}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        {/* PRICE */}
        <fieldset className="filter-group">
          <legend>Price (RWF)</legend>
          <div className="filter-price-row">
            <div className="filter-price-field">
              <label htmlFor="filter-min-price">Min</label>
              <input
                id="filter-min-price"
                type="number"
                inputMode="numeric"
                min="0"
                placeholder="0"
                value={minPriceInput}
                onChange={(e) => onMinPriceChange(e.target.value)}
              />
            </div>

            <span className="filter-price-sep" aria-hidden="true">
              –
            </span>

            <div className="filter-price-field">
              <label htmlFor="filter-max-price">Max</label>
              <input
                id="filter-max-price"
                type="number"
                inputMode="numeric"
                min="0"
                placeholder="Any"
                value={maxPriceInput}
                onChange={(e) => onMaxPriceChange(e.target.value)}
              />
            </div>
          </div>
        </fieldset>

        {/* STOCK */}
        <fieldset className="filter-group">
          <legend>Availability</legend>
          <label className="filter-checkbox">
            <input type="checkbox" checked={inStockOnly} onChange={(e) => onToggleInStock(e.target.checked)} />
            <span className="filter-checkbox-box" aria-hidden="true" />
            In stock only
          </label>
        </fieldset>
      </div>

      {isDrawer && (
        <div className="product-filters-footer">
          <button type="button" className="btn btn-outline" onClick={onClearFilters}>
            Clear Filters
          </button>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Apply Filters
          </button>
        </div>
      )}
    </div>
  );
}
