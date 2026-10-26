import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../../api/client";
import { formatRWF } from "../../utils/currency";
import { orderStatusLabel } from "../../utils/orderStatus";
import "../../styles/dashboard.css";

const STATUSES = ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"];
const PAGE_SIZE = 20;

export function PaymentBadge({ order }) {
  // Paid but cancelled means money was taken for an order that won't ship.
  const needsRefund = order.paid && order.status === "CANCELLED";
  const isCod = order.paymentMethod === "CASH_ON_DELIVERY";
  if (needsRefund) return <span className="badge badge-red">Paid · refund needed</span>;
  if (order.paid) return <span className="badge badge-green">{isCod ? "Paid (cash)" : "Paid"}</span>;
  if (isCod) return <span className="badge badge-blue">Cash on delivery</span>;
  return <span className="badge badge-amber">Unpaid</span>;
}

export const orderNumber = (id) => `#FK-${id.slice(0, 8).toUpperCase()}`;

export default function AdminOrders() {
  // Filters live in the URL, so a filtered view can be bookmarked and the
  // dashboard can link straight to e.g. ?status=PROCESSING.
  const [params, setParams] = useSearchParams();
  const status = params.get("status") || "";
  const q = params.get("q") || "";
  const from = params.get("from") || "";
  const to = params.get("to") || "";
  const page = Math.max(1, Number(params.get("page")) || 1);

  const [search, setSearch] = useState(q);
  const [data, setData] = useState({ orders: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [statusError, setStatusError] = useState("");

  function setFilter(key, value) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    setParams(next);
  }

  function load() {
    setLoading(true);
    setLoadError("");
    return api
      .get("/orders", { params: { status: status || undefined, q: q || undefined, from: from || undefined, to: to || undefined, page, limit: PAGE_SIZE } })
      .then((res) => setData(res.data))
      .catch(() => setLoadError("Unable to load orders."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, q, from, to, page]);

  async function updateStatus(id, newStatus) {
    setStatusError("");
    try {
      await api.patch(`/orders/${id}/status`, { status: newStatus });
    } catch (err) {
      setStatusError(err.response?.data?.error || "Could not update order status");
    }
    // Re-fetch either way so the dropdown always shows the real server status.
    load();
  }

  const pages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
  const hasFilters = status || q || from || to;

  return (
    <div className="page-main dash-page">
      <h1>Orders</h1>
      <p className="dash-sub">{data.total} order{data.total === 1 ? "" : "s"}{hasFilters ? " match these filters" : ""}</p>

      <div className="dash-filters">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setFilter("q", search.trim());
          }}
          style={{ display: "flex", gap: "0.5rem", flex: "2 1 260px" }}
        >
          <input
            type="search"
            placeholder="Order number, customer name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search orders"
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn btn-outline">Search</button>
        </form>
        <label>
          Status
          <select value={status} onChange={(e) => setFilter("status", e.target.value)}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{orderStatusLabel(s)}</option>
            ))}
          </select>
        </label>
        <label>
          From
          <input type="date" value={from} onChange={(e) => setFilter("from", e.target.value)} />
        </label>
        <label>
          To
          <input type="date" value={to} onChange={(e) => setFilter("to", e.target.value)} />
        </label>
        {hasFilters && (
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => {
              setSearch("");
              setParams(new URLSearchParams());
            }}
          >
            Clear
          </button>
        )}
      </div>

      {loadError && (
        <p className="form-error">
          {loadError}{" "}
          <button type="button" className="btn btn-outline" onClick={load} style={{ marginLeft: "0.5rem" }}>
            Try Again
          </button>
        </p>
      )}
      {statusError && <p className="form-error">{statusError}</p>}

      {!loading && data.orders.length === 0 && !loadError && <p className="dash-empty">No orders found.</p>}

      <div className="cart-list">
        {data.orders.map((o) => (
          <div key={o.id} className="cart-row" style={{ flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 220px", minWidth: 0 }}>
              <Link to={`/admin/orders/${o.id}`} style={{ fontFamily: "var(--font-mono)", fontSize: "0.9rem", color: "var(--signal-bright)" }}>
                {orderNumber(o.id)}
              </Link>
              <p style={{ margin: "0.2rem 0 0", color: "var(--silver)", fontSize: "0.9rem" }}>
                {o.user.name} ({o.user.email})
              </p>
              <p style={{ margin: "0.2rem 0 0", color: "var(--silver)", fontSize: "0.8rem" }}>
                {new Date(o.createdAt).toLocaleString()} · {o.items.reduce((n, i) => n + i.quantity, 0)} item(s)
              </p>
            </div>
            <PaymentBadge order={o} />
            <span className="price">{formatRWF(o.total)}</span>
            <select value={o.status} onChange={(e) => updateStatus(o.id, e.target.value)} aria-label={`Status of order ${orderNumber(o.id)}`}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{orderStatusLabel(s)}</option>
              ))}
            </select>
            <Link to={`/admin/orders/${o.id}`} className="btn btn-outline">Details</Link>
          </div>
        ))}
      </div>

      {pages > 1 && (
        <div className="pager">
          <button type="button" className="btn btn-outline" disabled={page <= 1} onClick={() => setFilter("page", String(page - 1))}>
            ← Previous
          </button>
          <span>Page {page} of {pages}</span>
          <button type="button" className="btn btn-outline" disabled={page >= pages} onClick={() => setFilter("page", String(page + 1))}>
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
