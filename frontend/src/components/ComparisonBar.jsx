import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import { useComparison } from "../context/ComparisonContext";
import { formatProductName } from "../utils/format";
import "./ComparisonBar.css";

function CloseIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}

// Rendered once, globally (alongside Navbar) so it stays visible across
// navigation — mirrors how the cart badge is always available.
export default function ComparisonBar() {
  const { ids, removeFromComparison, clearComparison } = useComparison();
  const [names, setNames] = useState({});

  const idsKey = ids.join(",");

  useEffect(() => {
    if (ids.length === 0) {
      setNames({});
      return undefined;
    }
    let cancelled = false;

    Promise.all(
      ids.map((id) =>
        api
          .get(`/products/${id}`)
          .then((res) => [id, formatProductName(res.data.name)])
          .catch(() => [id, null])
      )
    ).then((pairs) => {
      if (cancelled) return;
      const map = {};
      pairs.forEach(([id, name]) => {
        if (name) map[id] = name;
      });
      setNames(map);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  if (ids.length === 0) return null;

  return (
    <div className="comparison-bar" role="region" aria-label="Product comparison">
      <div className="comparison-bar-inner">
        <span className="comparison-bar-count">
          {ids.length} product{ids.length === 1 ? "" : "s"} selected
        </span>

        <div className="comparison-bar-chips">
          {ids.map((id) => (
            <span className="comparison-bar-chip" key={id}>
              {names[id] || "…"}
              <button
                type="button"
                aria-label={`Remove ${names[id] || "product"} from comparison`}
                onClick={() => removeFromComparison(id)}
              >
                <CloseIcon />
              </button>
            </span>
          ))}
        </div>

        <div className="comparison-bar-actions">
          <Link to="/compare" className="btn btn-primary comparison-bar-btn">
            Compare
          </Link>
          <button type="button" className="btn btn-outline comparison-bar-btn" onClick={clearComparison}>
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
