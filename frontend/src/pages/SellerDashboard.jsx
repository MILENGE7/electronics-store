import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import api from "../api/client";
import { formatRWF } from "../utils/currency";
import { orderStatusLabel } from "../utils/orderStatus";
import ProductForm, { productToForm } from "../components/ProductForm";
import "../styles/dashboard.css";

const TABS = [
  { value: "overview", label: "Overview" },
  { value: "products", label: "Products" },
  { value: "orders", label: "Orders" },
];

const orderNumber = (id) => `#FK-${id.slice(0, 8).toUpperCase()}`;

function Overview({ data }) {
  const e = data.earnings;
  return (
    <>
      <div className="dash-stats">
        <div className="dash-stat">
          <span className="dash-stat-label">Balance owed to you</span>
          <span className="dash-stat-value">{formatRWF(e.balance)}</span>
          <span className="dash-stat-note">earned minus paid out</span>
        </div>
        <div className="dash-stat">
          <span className="dash-stat-label">Earned</span>
          <span className="dash-stat-value">{formatRWF(e.earned)}</span>
          <span className="dash-stat-note">
            {e.unitsSold} sold · {formatRWF(e.commission)} commission
          </span>
        </div>
        <div className="dash-stat">
          <span className="dash-stat-label">On the way</span>
          <span className="dash-stat-value">{formatRWF(e.pending)}</span>
          <span className="dash-stat-note">counted once delivered and paid</span>
        </div>
        <div className="dash-stat">
          <span className="dash-stat-label">Paid out</span>
          <span className="dash-stat-value">{formatRWF(e.paidOut)}</span>
        </div>
      </div>

      <div className="dash-columns">
        <section className="dash-section">
          <div className="dash-section-head">
            <h2>To prepare</h2>
          </div>
          <p className="dash-sub">
            {data.itemsToPrepare === 0
              ? "Nothing waiting — you're all caught up."
              : `${data.itemsToPrepare} item${data.itemsToPrepare === 1 ? "" : "s"} to pack and hand over to FK Trading.`}
          </p>
          <p className="dash-sub">
            {data.productCount} product{data.productCount === 1 ? "" : "s"} listed · {data.commissionPercent}% commission
          </p>
        </section>

        <section className="dash-section">
          <h2>Low stock</h2>
          {data.lowStock.length === 0 ? (
            <p className="dash-empty">Everything is well stocked.</p>
          ) : (
            <ul className="dash-list">
              {data.lowStock.map((p) => (
                <li key={p.id}>
                  <span className="dash-list-main">
                    <strong>{p.name}</strong>
                  </span>
                  <span className={`badge ${p.stock === 0 ? "badge-red" : "badge-amber"}`}>
                    {p.stock === 0 ? "Out of stock" : `${p.stock} left`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="dash-section">
        <h2>Recent payouts</h2>
        {data.payouts.length === 0 ? (
          <p className="dash-empty">No payouts yet.</p>
        ) : (
          <ul className="dash-list">
            {data.payouts.map((p) => (
              <li key={p.id}>
                <span className="dash-list-main">
                  <strong>{formatRWF(p.amount)}</strong>
                  <span>
                    {p.method}
                    {p.reference ? ` · ${p.reference}` : ""}
                  </span>
                </span>
                <span>{new Date(p.createdAt).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function Products() {
  const [products, setProducts] = useState([]);
  const [editing, setEditing] = useState(null);
  const [formKey, setFormKey] = useState(0);
  const [error, setError] = useState("");

  function load() {
    return api
      .get("/seller/products")
      .then((res) => setProducts(res.data))
      .catch(() => setError("Unable to load your products."));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(payload) {
    if (editing) await api.put(`/seller/products/${editing.id}`, payload);
    else await api.post("/seller/products", payload);
    setEditing(null);
    setFormKey((k) => k + 1);
    load();
  }

  function startEdit(p) {
    setEditing(p);
    setFormKey((k) => k + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditing(null);
    setFormKey((k) => k + 1);
  }

  async function handleDelete(p) {
    if (!window.confirm(`Remove "${p.name}" from the shop?`)) return;
    setError("");
    try {
      await api.delete(`/seller/products/${p.id}`);
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Could not remove product");
    }
  }

  return (
    <>
      <section className="dash-section">
        <ProductForm
          key={formKey}
          initial={editing ? productToForm(editing) : undefined}
          title={editing ? `Edit: ${editing.name}` : "Add a product"}
          submitLabel={editing ? "Save changes" : "Add product"}
          onSubmit={handleSubmit}
          onCancel={editing ? cancelEdit : undefined}
        />
      </section>

      {error && <p className="form-error">{error}</p>}
      {products.length === 0 ? (
        <p className="dash-empty">You haven&apos;t listed any products yet.</p>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Image</th>
                <th>Name</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>
                    {p.images?.[0] && (
                      <img src={p.images[0]} alt="" width={40} height={40} style={{ objectFit: "cover", borderRadius: "6px" }} />
                    )}
                  </td>
                  <td>
                    <Link to={`/products/${p.id}`}>{p.name}</Link>
                  </td>
                  <td>{p.category?.name}</td>
                  <td className="price">{formatRWF(p.price)}</td>
                  <td>{p.stock}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <button onClick={() => startEdit(p)} className="btn btn-outline" style={{ marginRight: "0.4rem" }}>
                      Edit
                    </button>
                    <button onClick={() => handleDelete(p)} className="btn btn-outline">
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function Orders() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");

  function load() {
    return api
      .get("/seller/order-items")
      .then((res) => setItems(res.data))
      .catch(() => setError("Unable to load your orders."));
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleReady(item) {
    setError("");
    try {
      await api.post(`/seller/order-items/${item.id}/ready`);
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Could not update item");
    }
  }

  if (!items) return error ? <p className="form-error">{error}</p> : <p className="dash-empty">Loading…</p>;

  return (
    <>
      <p className="dash-sub">
        FK Trading delivers every order. Pack each item and mark it ready — we&apos;ll collect it from you.
      </p>
      {error && <p className="form-error">{error}</p>}
      {items.length === 0 ? (
        <p className="dash-empty">No orders yet.</p>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Date</th>
                <th>Product</th>
                <th>Qty</th>
                <th>You receive</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => {
                const preparing = ["PENDING", "PROCESSING"].includes(i.order.status);
                return (
                  <tr key={i.id}>
                    <td>{orderNumber(i.order.id)}</td>
                    <td>{new Date(i.order.createdAt).toLocaleDateString()}</td>
                    <td>{i.product?.name}</td>
                    <td>{i.quantity}</td>
                    <td className="price">{formatRWF(i.net)}</td>
                    <td>{orderStatusLabel(i.order.status)}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {preparing ? (
                        <button
                          type="button"
                          className={`btn ${i.readyAt ? "btn-outline" : "btn-primary"}`}
                          onClick={() => toggleReady(i)}
                        >
                          {i.readyAt ? "Ready ✓ (undo)" : "Mark ready"}
                        </button>
                      ) : i.readyAt ? (
                        <span className="badge badge-green">Handed over</span>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export default function SellerDashboard() {
  const [tab, setTab] = useState("overview");
  const [overview, setOverview] = useState(null);
  const [notSeller, setNotSeller] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (tab !== "overview") return;
    setLoadError(false);
    api
      .get("/seller/overview")
      .then((res) => setOverview(res.data))
      .catch((err) => {
        if (err.response?.status === 403) setNotSeller(true);
        else setLoadError(true);
      });
  }, [tab]);

  // Not (or no longer) an approved seller — the apply page explains why.
  if (notSeller) return <Navigate to="/sell" replace />;

  return (
    <div className="page-main dash-page">
      <h1>{overview ? overview.seller.businessName : "Seller dashboard"}</h1>
      <p className="dash-sub">Your shop on FK Trading.</p>

      <div className="dash-filters" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={tab === t.value}
            className={`btn ${tab === t.value ? "btn-primary" : "btn-outline"}`}
            onClick={() => setTab(t.value)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" &&
        (loadError ? (
          <p className="form-error">Unable to load your dashboard.</p>
        ) : overview ? (
          <Overview data={overview} />
        ) : (
          <p className="dash-empty">Loading…</p>
        ))}
      {tab === "products" && <Products />}
      {tab === "orders" && <Orders />}
    </div>
  );
}
