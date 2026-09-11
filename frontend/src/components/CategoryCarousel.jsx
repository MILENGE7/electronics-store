import { useEffect, useRef, useState } from "react";
import { formatCategoryName } from "../utils/format";
import { CategoryTileSkeleton } from "./Skeletons";
import "./CategoryCarousel.css";

function GridIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.2" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.2" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.2" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.2" />
    </svg>
  );
}

function PhoneTileIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="7" y="2" width="10" height="20" rx="2" />
      <path d="M11 18h2" strokeLinecap="round" />
    </svg>
  );
}

function LaptopTileIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="4" y="4" width="16" height="11" rx="1.2" />
      <path d="M2 19h20l-1.6-3H3.6L2 19z" strokeLinejoin="round" />
    </svg>
  );
}

function HeadphoneTileIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 13v-1a8 8 0 0 1 16 0v1" strokeLinecap="round" />
      <rect x="2.5" y="13" width="5" height="7" rx="1.6" />
      <rect x="16.5" y="13" width="5" height="7" rx="1.6" />
    </svg>
  );
}

function GamepadIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="2.5" y="8" width="19" height="10" rx="5" />
      <path d="M7 11v4M5 13h4" strokeLinecap="round" />
      <circle cx="15.5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="18.5" cy="14.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function WatchTileIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="7" y="7" width="10" height="10" rx="2.4" />
      <path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3M9 17v3a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-3" />
    </svg>
  );
}

function CableIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M6 3v6a4 4 0 0 0 4 4h4a4 4 0 0 1 4 4v4" strokeLinecap="round" />
      <circle cx="6" cy="3" r="2" />
      <circle cx="18" cy="21" r="2" />
    </svg>
  );
}

function TagTileIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M20 12.5L12.5 20a1.5 1.5 0 0 1-2.1 0l-6.4-6.4a1.5 1.5 0 0 1 0-2.1L11.5 4H19a1 1 0 0 1 1 1v7.5z" strokeLinejoin="round" />
      <circle cx="15.5" cy="8.5" r="1.5" />
    </svg>
  );
}

function ChevronIcon({ direction }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d={direction === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const CATEGORY_META = [
  { match: "phone", icon: PhoneTileIcon, subtitle: "Smartphones" },
  { match: "laptop", icon: LaptopTileIcon, subtitle: "All Brands" },
  { match: "computer", icon: LaptopTileIcon, subtitle: "All Brands" },
  { match: "audio", icon: HeadphoneTileIcon, subtitle: "Headphones & Speakers" },
  { match: "headphone", icon: HeadphoneTileIcon, subtitle: "Headphones & Speakers" },
  { match: "speaker", icon: HeadphoneTileIcon, subtitle: "Headphones & Speakers" },
  { match: "gaming", icon: GamepadIcon, subtitle: "Consoles & Accessories" },
  { match: "game", icon: GamepadIcon, subtitle: "Consoles & Accessories" },
  { match: "watch", icon: WatchTileIcon, subtitle: "Wearable Devices" },
  { match: "wearable", icon: WatchTileIcon, subtitle: "Wearable Devices" },
  { match: "accessor", icon: CableIcon, subtitle: "Cables & More" },
  { match: "case", icon: CableIcon, subtitle: "Cables & More" },
  { match: "camera", icon: TagTileIcon, subtitle: "Photo & Video" },
  { match: "tv", icon: TagTileIcon, subtitle: "Home Entertainment" },
  { match: "bulb", icon: TagTileIcon, subtitle: "Smart Home" },
];

function categoryMeta(name = "") {
  const key = name.toLowerCase();
  return CATEGORY_META.find((c) => key.includes(c.match)) || { icon: TagTileIcon, subtitle: "Shop now" };
}

export default function CategoryCarousel({ categories, activeCategory, onSelect, loading, error }) {
  const trackRef = useRef(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  function updateEdges() {
    const el = trackRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 2);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 2);
  }

  useEffect(() => {
    updateEdges();
  }, [categories]);

  function scroll(direction) {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: direction === "left" ? -280 : 280, behavior: "smooth" });
  }

  const isFiltered = Boolean(activeCategory) && activeCategory !== "all";

  return (
    <section className="category-section">
      <div className="category-inner">
        <p className="section-eyebrow">Shop by Category</p>

        {error ? (
          <p className="catalog-empty" style={{ textAlign: "center" }}>
            Categories are temporarily unavailable.
          </p>
        ) : (
          <div className="category-row">
            <button
              type="button"
              className="category-nav category-nav-left"
              onClick={() => scroll("left")}
              aria-label="Scroll categories left"
              disabled={atStart}
            >
              <ChevronIcon direction="left" />
            </button>

            <div className="category-track" ref={trackRef} onScroll={updateEdges}>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => <CategoryTileSkeleton key={i} />)
              ) : (
                <>
                  <button
                    type="button"
                    className={`category-tile ${!isFiltered ? "active" : ""}`}
                    onClick={() => onSelect("")}
                  >
                    <span className="category-tile-icon">
                      <GridIcon />
                    </span>
                    <span className="category-tile-text">
                      <strong>All</strong>
                      <span>Everything</span>
                    </span>
                  </button>

                  {categories.map((c) => {
                    const meta = categoryMeta(c.name);
                    const Icon = meta.icon;
                    return (
                      <button
                        type="button"
                        key={c.id}
                        className={`category-tile ${activeCategory === c.name ? "active" : ""}`}
                        onClick={() => onSelect(c.name)}
                      >
                        <span className="category-tile-icon">
                          <Icon />
                        </span>
                        <span className="category-tile-text">
                          <strong>{formatCategoryName(c.name)}</strong>
                          <span>{meta.subtitle}</span>
                        </span>
                      </button>
                    );
                  })}
                </>
              )}
            </div>

            <button
              type="button"
              className="category-nav category-nav-right"
              onClick={() => scroll("right")}
              aria-label="Scroll categories right"
              disabled={atEnd}
            >
              <ChevronIcon direction="right" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
