import { useEffect, useState } from "react";
import api from "../../api/client";
import { formatRWF } from "../../utils/currency";

const STATUSES = ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"];

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [statusError, setStatusError] = useState("");

  function loadOrders() {
    setLoadError("");
    return api
      .get("/orders")
      .then((res) => setOrders(res.data))
      .catch(() => setLoadError("Unable to load orders."));
  }

  useEffect(loadOrders, []);

  async function updateStatus(id, status) {
    setStatusError("");
    try {
      await api.patch(`/orders/${id}/status`, { status });
      loadOrders();
    } catch (err) {
      // Re-fetch even on failure so the <select> snaps back to the real
      // server-side status instead of showing the rejected value as if it
      // had taken effect.
      setStatusError(err.response?.data?.error || "Could not update order status");
      loadOrders();
    }
  }

  return (
    <div className="page-main">
      <h1>Manage Orders</h1>

      {loadError && (
        <p className="form-error">
          {loadError}{" "}
          <button type="button" className="btn btn-outline" onClick={loadOrders} style={{ marginLeft: "0.5rem" }}>
            Try Again
          </button>
        </p>
      )}
      {statusError && <p className="form-error">{statusError}</p>}

      <div className="cart-list">
        {orders.map((o) => (
          <div key={o.id} className="cart-row" style={{ flexWrap: "wrap" }}>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontFamily: "var(--font-mono)", fontSize: "0.85rem" }}>#{o.id.slice(0, 8)}</p>
              <p style={{ margin: "0.2rem 0 0", color: "var(--silver)", fontSize: "0.9rem" }}>{o.user.name} ({o.user.email})</p>
            </div>
            <span className="price">{formatRWF(o.total)}</span>
            <select value={o.status} onChange={(e) => updateStatus(o.id, e.target.value)}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
