import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../../api/client";
import { formatRWF } from "../../utils/currency";
import { orderStatusLabel } from "../../utils/orderStatus";
import { PaymentBadge, orderNumber } from "./Orders";
import "../../styles/dashboard.css";

const STATUSES = ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"];

function AddressLines({ address }) {
  if (!address) return null;
  return (
    <>
      {address.fullName && <p style={{ margin: 0 }}><strong>{address.fullName}</strong></p>}
      {address.phone && (
        <p style={{ margin: 0 }}>
          <a href={`tel:${address.phone.replace(/\s/g, "")}`}>{address.phone}</a>
        </p>
      )}
      <p style={{ margin: 0 }}>
        {address.line1}
        {address.line2 ? `, ${address.line2}` : ""}
      </p>
      <p style={{ margin: 0 }}>
        {[address.city, address.state, address.postalCode].filter(Boolean).join(", ")}
      </p>
      <p style={{ margin: 0 }}>{address.country}</p>
    </>
  );
}

export default function AdminOrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function load() {
    setError("");
    api
      .get(`/orders/${id}`)
      .then((res) => setOrder(res.data))
      .catch((err) => setError(err.response?.data?.error || "Unable to load this order."));
  }

  useEffect(load, [id]);

  async function updateStatus(status) {
    setSaving(true);
    setError("");
    try {
      await api.patch(`/orders/${id}/status`, { status });
    } catch (err) {
      setError(err.response?.data?.error || "Could not update order status");
    }
    setSaving(false);
    load();
  }

  if (error && !order) {
    return (
      <div className="page-main dash-page">
        <p className="form-error">{error}</p>
        <Link to="/admin/orders">← Back to orders</Link>
      </div>
    );
  }
  if (!order) return <div className="page-main dash-page">Loading…</div>;

  const itemsTotal = order.items.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0);
  const address = order.shippingAddress || {};

  return (
    <div className="page-main dash-page">
      <div className="no-print">
        <Link to="/admin/orders">← Back to orders</Link>
        <div className="dash-section-head" style={{ marginTop: "1rem" }}>
          <div>
            <h1 style={{ marginBottom: "0.3rem" }}>Order {orderNumber(order.id)}</h1>
            <p className="dash-sub" style={{ marginBottom: 0 }}>
              Placed {new Date(order.createdAt).toLocaleString()}
              {order.cancelledByCustomer && " · cancelled by the customer"}
            </p>
          </div>
          <div className="dash-actions">
            <PaymentBadge order={order} />
            <select value={order.status} disabled={saving} onChange={(e) => updateStatus(e.target.value)} aria-label="Order status">
              {STATUSES.map((s) => (
                <option key={s} value={s}>{orderStatusLabel(s)}</option>
              ))}
            </select>
            <button type="button" className="btn btn-primary" onClick={() => window.print()}>
              Print packing slip
            </button>
          </div>
        </div>
        {error && <p className="form-error">{error}</p>}
        {order.paymentMethod === "CASH_ON_DELIVERY" && !order.paid && (
          <p className="dash-sub">
            Cash on delivery: collect <strong>{formatRWF(order.total)}</strong>. Setting the status to Delivered marks it paid.
          </p>
        )}
      </div>

      {/* Everything below also prints as the packing slip */}
      <div className="packing-slip">
        <div className="print-only" style={{ marginBottom: "1rem" }}>
          <h1 style={{ margin: 0 }}>FK Trading · Packing slip</h1>
          <p style={{ margin: "0.2rem 0 0" }}>
            Order {orderNumber(order.id)} · {new Date(order.createdAt).toLocaleDateString()}
          </p>
        </div>

        <div className="dash-columns">
          <section className="dash-section">
            <h2>Deliver to</h2>
            <AddressLines address={address} />
            {order.deliveryZone && (
              <p style={{ margin: "0.6rem 0 0", color: "var(--silver)" }}>Delivery area: {order.deliveryZone.name}</p>
            )}
          </section>
          <section className="dash-section">
            <h2>Customer</h2>
            <p style={{ margin: 0 }}>{order.user.name}</p>
            <p style={{ margin: 0 }}>{order.user.email}</p>
            <p style={{ margin: "0.6rem 0 0" }}>
              Payment: {order.paymentMethod === "CASH_ON_DELIVERY" ? "Cash on delivery" : "Online (Paystack)"} ·{" "}
              {order.paid ? "Paid" : "Not paid yet"}
            </p>
          </section>
        </div>

        <section className="dash-section">
          <h2>Items</h2>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Seller</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Total</th>
                  <th className="no-print">Ready</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((i) => (
                  <tr key={i.id}>
                    <td>{i.product?.name}</td>
                    <td>{i.seller ? i.seller.businessName : "FK Trading"}</td>
                    <td>{i.quantity}</td>
                    <td>{formatRWF(i.price)}</td>
                    <td>{formatRWF(Number(i.price) * i.quantity)}</td>
                    <td className="no-print">
                      {i.seller ? (
                        i.readyAt ? <span className="badge badge-green">Ready to collect</span> : <span className="badge badge-grey">Not ready</span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: "1rem", display: "grid", gap: "0.3rem", justifyItems: "end" }}>
            <span>Items: {formatRWF(itemsTotal)}</span>
            <span>Delivery: {formatRWF(order.deliveryFee || 0)}</span>
            <strong style={{ fontSize: "1.1rem" }}>
              Total: {formatRWF(order.total)}
              {order.paymentMethod === "CASH_ON_DELIVERY" && !order.paid ? " (to collect in cash)" : ""}
            </strong>
          </div>
        </section>
      </div>
    </div>
  );
}
