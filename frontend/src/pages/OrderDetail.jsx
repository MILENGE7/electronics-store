import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api/client";
import { useCart } from "../context/CartContext";
import { formatRWF } from "../utils/currency";
import { formatBrandName, formatProductName } from "../utils/format";
import { orderStatusLabel, orderStatusClass } from "../utils/orderStatus";
import OrderStatusTimeline from "../components/OrderStatusTimeline";
import "./OrderDetail.css";

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6">
      <path d="M4 12.5l5 5L20 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// The shippingAddress JSON is whatever Checkout stored (line1/line2/city/
// state/postalCode/country/phone/fullName) — displayed field-by-field when
// that shape is present, or as a raw string if it's ever just a string.
function ShippingAddress({ address }) {
  if (!address) return <p className="catalog-empty">No shipping address on file for this order.</p>;

  if (typeof address === "string") {
    return <p className="order-address-text">{address}</p>;
  }

  const { fullName, line1, line2, city, state, postalCode, country, phone } = address;
  const hasStructured = line1 || city || state || country;

  if (!hasStructured) {
    return <p className="catalog-empty">No shipping address on file for this order.</p>;
  }

  return (
    <address className="order-address-text">
      {fullName && <span className="order-address-name">{fullName}</span>}
      {line1 && <span>{line1}</span>}
      {line2 && <span>{line2}</span>}
      {(city || state || postalCode) && (
        <span>
          {[city, state].filter(Boolean).join(", ")} {postalCode || ""}
        </span>
      )}
      {country && <span>{country}</span>}
      {phone && <span>Phone: {phone}</span>}
    </address>
  );
}

export default function OrderDetail() {
  const { id } = useParams();
  const { addItem } = useCart();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [reordered, setReordered] = useState(false);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    setForbidden(false);
    setLoadError(false);
    setReordered(false);
    api
      .get(`/orders/${id}`)
      .then((res) => setOrder(res.data))
      .catch((err) => {
        if (err.response?.status === 404) setNotFound(true);
        else if (err.response?.status === 403) setForbidden(true);
        else setLoadError(true);
      })
      .finally(() => setLoading(false));
  }, [id, retryKey]);

  const reorderInfo = useMemo(() => {
    if (!order) return { eligible: [], ineligible: [] };
    const eligible = [];
    const ineligible = [];
    order.items.forEach((item) => {
      const product = item.product;
      if (!product || !product.isActive) {
        ineligible.push({ item, reason: "No longer available" });
      } else if (product.stock <= 0) {
        ineligible.push({ item, reason: "Out of stock" });
      } else {
        eligible.push({ item, quantity: Math.min(item.quantity, product.stock) });
      }
    });
    return { eligible, ineligible };
  }, [order]);

  function handleBuyAgain() {
    reorderInfo.eligible.forEach(({ item, quantity }) => {
      addItem(item.product, quantity);
    });
    setReordered(true);
    setTimeout(() => setReordered(false), 2500);
  }

  function retry() {
    setRetryKey((k) => k + 1);
  }

  if (loading) {
    return (
      <div className="page-main order-detail-page">
        <p className="catalog-empty">Loading order…</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="page-main order-detail-page pd-state-page">
        <h1>Order not found</h1>
        <p className="catalog-empty">We couldn't find this order.</p>
        <Link to="/orders" className="btn btn-outline">
          Back to My Orders
        </Link>
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="page-main order-detail-page pd-state-page">
        <h1>Order not found</h1>
        <p className="catalog-empty">We couldn't find this order.</p>
        <Link to="/orders" className="btn btn-outline">
          Back to My Orders
        </Link>
      </div>
    );
  }

  if (loadError || !order) {
    return (
      <div className="page-main order-detail-page pd-state-page">
        <p className="catalog-empty">Unable to load this order right now.</p>
        <button type="button" className="btn btn-outline" onClick={retry}>
          Try Again
        </button>
      </div>
    );
  }

  const itemCount = order.items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="page-main order-detail-page">
      <nav className="order-detail-breadcrumb" aria-label="Breadcrumb">
        <Link to="/orders">My Orders</Link>
        <span aria-hidden="true">›</span>
        <span aria-current="page">#{order.id.slice(0, 8).toUpperCase()}</span>
      </nav>

      <div className="order-detail-header">
        <div>
          <h1>Order #{order.id.slice(0, 8).toUpperCase()}</h1>
          <p className="order-detail-date">
            {order.createdAt
              ? `Placed on ${new Date(order.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}`
              : ""}
          </p>
        </div>
        <span className={`order-status-badge order-status-${orderStatusClass(order.status)}`}>{orderStatusLabel(order.status)}</span>
      </div>

      <section className="order-detail-section">
        <h2>Order Progress</h2>
        <OrderStatusTimeline order={order} />
      </section>

      <div className="order-detail-grid">
        <section className="order-detail-section">
          <h2>Items ({itemCount})</h2>
          <div className="order-items-list">
            {order.items.map((item) => {
              const product = item.product;
              const displayName = product ? formatProductName(product.name) : "Product";
              const ineligible = reorderInfo.ineligible.find((x) => x.item.id === item.id);
              return (
                <div className="order-item-row" key={item.id}>
                  <Link to={product ? `/products/${product.id}` : "#"} className="order-item-image">
                    {product?.images?.[0] ? (
                      <img src={product.images[0]} alt={displayName} />
                    ) : (
                      <span className="product-card-placeholder">{displayName.slice(0, 1)}</span>
                    )}
                  </Link>
                  <div className="order-item-info">
                    {product ? (
                      <Link to={`/products/${product.id}`} className="order-item-name">
                        {displayName}
                      </Link>
                    ) : (
                      <span className="order-item-name">{displayName}</span>
                    )}
                    {product?.brand && <p className="order-item-brand">{formatBrandName(product.brand)}</p>}
                    <p className="order-item-qty">Qty: {item.quantity}</p>
                    {ineligible && <p className="order-item-unavailable">{ineligible.reason} — not eligible for Buy Again</p>}
                  </div>
                  <div className="order-item-price">
                    <span className="price">{formatRWF(item.price)}</span>
                    <span className="order-item-price-note">price at time of order</span>
                  </div>
                </div>
              );
            })}
          </div>

          {reorderInfo.eligible.length > 0 && (
            <div className="order-buy-again">
              <button type="button" className={`btn btn-primary ${reordered ? "added" : ""}`} onClick={handleBuyAgain}>
                {reordered ? (
                  <>
                    <CheckIcon /> Added to Cart
                  </>
                ) : (
                  `Buy Again (${reorderInfo.eligible.length} item${reorderInfo.eligible.length === 1 ? "" : "s"})`
                )}
              </button>
              <p className="order-buy-again-note">Adds current price and available stock — the price you originally paid is unaffected.</p>
            </div>
          )}
        </section>

        <aside className="order-detail-side">
          <section className="order-detail-section">
            <h2>Summary</h2>
            <div className="order-summary-row">
              <span>Payment</span>
              <span className={order.paid ? "order-payment-paid" : "order-payment-pending"}>
                {order.paid ? "Payment Successful" : "Payment Pending"}
              </span>
            </div>
            <div className="order-summary-row order-summary-total">
              <span>Total</span>
              <span className="price">{formatRWF(order.total)}</span>
            </div>
          </section>

          <section className="order-detail-section">
            <h2>Shipping Address</h2>
            <ShippingAddress address={order.shippingAddress} />
          </section>
        </aside>
      </div>
    </div>
  );
}
