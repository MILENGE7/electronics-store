import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import { formatRWF } from "../utils/currency";
import { orderStatusLabel, orderStatusClass } from "../utils/orderStatus";
import "../components/Skeletons.css";
import "./Orders.css";

function OrderCardSkeleton() {
  return (
    <div className="order-card skeleton-card" aria-hidden="true">
      <span className="skeleton-line skeleton-shimmer" style={{ width: "40%", height: 12 }} />
      <span className="skeleton-line skeleton-shimmer" style={{ width: "25%", height: 10, marginTop: 10 }} />
      <span className="skeleton-line skeleton-shimmer" style={{ width: "30%", height: 18, marginTop: 14 }} />
    </div>
  );
}

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError(false);
    api
      .get("/orders/mine")
      .then((res) => setOrders(res.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [retryKey]);

  return (
    <div className="page-main orders-page">
      <h1 className="orders-title">My Orders</h1>

      {error ? (
        <div className="state-error">
          <p>Unable to load your orders right now.</p>
          <button type="button" className="btn btn-outline" onClick={() => setRetryKey((k) => k + 1)}>
            Try Again
          </button>
        </div>
      ) : loading ? (
        <div className="orders-list">
          <OrderCardSkeleton />
          <OrderCardSkeleton />
          <OrderCardSkeleton />
        </div>
      ) : orders.length === 0 ? (
        <div className="orders-empty">
          <h2>No orders yet</h2>
          <p>When you place an order, it will show up here.</p>
          <Link to="/" className="btn btn-primary">
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map((o) => {
            const itemCount = o.items.reduce((sum, i) => sum + i.quantity, 0);
            return (
              <Link to={`/orders/${o.id}`} className="order-card" key={o.id}>
                <div className="order-card-head">
                  <span className="order-card-id">#{o.id.slice(0, 8).toUpperCase()}</span>
                  <span className={`order-status-badge order-status-${orderStatusClass(o.status)}`}>
                    {orderStatusLabel(o.status)}
                  </span>
                </div>

                <p className="order-card-date">
                  {o.createdAt ? new Date(o.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) : ""}
                </p>

                <p className="order-card-items">
                  {itemCount} item{itemCount === 1 ? "" : "s"}
                </p>

                <div className="order-card-foot">
                  <span className="price order-card-total">{formatRWF(o.total)}</span>
                  <span className="order-card-view">View Details →</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
