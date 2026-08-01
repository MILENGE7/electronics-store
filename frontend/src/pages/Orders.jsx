import { useEffect, useState } from "react";
import api from "../api/client";
import { formatRWF } from "../utils/currency";

export default function Orders() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    api.get("/orders/mine").then((res) => setOrders(res.data));
  }, []);

  return (
    <div className="page-main">
      <h1>My Orders</h1>
      {orders.length === 0 && <p className="catalog-empty">No orders yet.</p>}
      <div className="cart-list">
        {orders.map((o) => (
          <div key={o.id} className="cart-row" style={{ flexDirection: "column", alignItems: "flex-start", gap: "0.4rem" }}>
            <p style={{ margin: 0 }}>
              <strong style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem" }}>#{o.id.slice(0, 8)}</strong>
              {" — "}{o.status}
            </p>
            <p className="price" style={{ margin: 0 }}>{formatRWF(o.total)}</p>
            <ul style={{ margin: 0, paddingLeft: "1.1rem", color: "var(--silver)", fontSize: "0.9rem" }}>
              {o.items.map((i) => (
                <li key={i.id}>{i.product.name} x{i.quantity}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
