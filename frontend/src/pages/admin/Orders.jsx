import { useEffect, useState } from "react";
import api from "../../api/client";
import { formatRWF } from "../../utils/currency";

const STATUSES = ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"];

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);

  function loadOrders() {
    api.get("/orders").then((res) => setOrders(res.data));
  }

  useEffect(loadOrders, []);

  async function updateStatus(id, status) {
    await api.patch(`/orders/${id}/status`, { status });
    loadOrders();
  }

  return (
    <div className="page-main">
      <h1>Manage Orders</h1>
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
