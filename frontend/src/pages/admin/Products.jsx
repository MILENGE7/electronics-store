import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../../api/client";
import { formatRWF } from "../../utils/currency";
import ProductForm, { productToForm } from "../../components/ProductForm";
import "../../styles/dashboard.css";

// Inline stock editor so restocking doesn't mean opening the whole form.
function StockCell({ product, lowStockThreshold, onSaved }) {
  const [value, setValue] = useState(String(product.stock));
  const [error, setError] = useState("");
  const changed = value !== String(product.stock);

  async function save() {
    setError("");
    try {
      await api.put(`/products/${product.id}`, { stock: Number(value) });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || "Not saved");
    }
  }

  return (
    <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
      <input
        type="number"
        min="0"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && changed && save()}
        aria-label={`Stock for ${product.name}`}
        style={{ width: "80px", padding: "0.45rem 0.6rem" }}
      />
      {changed && (
        <button type="button" className="btn btn-primary" onClick={save} style={{ padding: "0.4rem 0.7rem" }}>
          Save
        </button>
      )}
      {!changed && product.stock <= lowStockThreshold && (
        <span className={`badge ${product.stock === 0 ? "badge-red" : "badge-amber"}`}>{product.stock === 0 ? "Out" : "Low"}</span>
      )}
      {error && <span className="form-error">{error}</span>}
    </div>
  );
}

export default function AdminProducts() {
  const [params, setParams] = useSearchParams();
  const lowStockOnly = params.get("filter") === "low-stock";
  const [products, setProducts] = useState([]);
  const [lowStockThreshold, setLowStockThreshold] = useState(5);
  const [editing, setEditing] = useState(null); // product being edited, or null for "add new"
  const [formKey, setFormKey] = useState(0); // bump to reset the form
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");

  function loadProducts() {
    setLoadError("");
    return api
      .get("/products", { params: { limit: 100 } })
      .then((res) => setProducts(res.data.products))
      .catch(() => setLoadError("Unable to load products."));
  }

  useEffect(() => {
    loadProducts();
    api
      .get("/admin/settings")
      .then((res) => setLowStockThreshold(res.data.lowStockThreshold))
      .catch(() => {});
  }, []);

  async function handleSubmit(payload) {
    if (editing) await api.put(`/products/${editing.id}`, payload);
    else await api.post("/products", payload);
    setEditing(null);
    setFormKey((k) => k + 1);
    loadProducts();
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

  async function handleDelete(id, name) {
    if (!window.confirm(`Delete "${name}"? It will be hidden from the shop.`)) return;
    setError("");
    try {
      await api.delete(`/products/${id}`);
      loadProducts();
    } catch (err) {
      setError(err.response?.data?.error || "Could not delete product");
    }
  }

  const term = search.trim().toLowerCase();
  const visible = products
    .filter((p) => !lowStockOnly || p.stock <= lowStockThreshold)
    .filter((p) => !term || p.name.toLowerCase().includes(term) || (p.brand || "").toLowerCase().includes(term))
    .sort((a, b) => (lowStockOnly ? a.stock - b.stock : 0));

  return (
    <div className="page-main dash-page">
      <h1>Products</h1>
      <p className="dash-sub">Your products and every approved seller&apos;s. Edit stock straight from the list.</p>

      {loadError && (
        <p className="form-error">
          {loadError}{" "}
          <button type="button" className="btn btn-outline" onClick={loadProducts} style={{ marginLeft: "0.5rem" }}>
            Try Again
          </button>
        </p>
      )}

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

      <div className="dash-filters">
        <input type="search" placeholder="Search products" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search products" />
        <button
          type="button"
          className={`btn ${lowStockOnly ? "btn-primary" : "btn-outline"}`}
          onClick={() => setParams(lowStockOnly ? {} : { filter: "low-stock" })}
        >
          Low stock only (≤ {lowStockThreshold})
        </button>
      </div>

      {error && <p className="form-error">{error}</p>}
      {visible.length === 0 && !loadError && <p className="dash-empty">No products here.</p>}

      {visible.length > 0 && (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Image</th>
                <th>Name</th>
                <th>Seller</th>
                <th>Price</th>
                <th>Stock</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => (
                <tr key={p.id}>
                  <td>{p.images?.[0] && <img src={p.images[0]} alt="" width={40} height={40} style={{ objectFit: "cover", borderRadius: "6px" }} />}</td>
                  <td>{p.name}</td>
                  <td>{p.seller ? p.seller.businessName : "FK Trading"}</td>
                  <td className="price">{formatRWF(p.price)}</td>
                  <td>
                    <StockCell key={p.stock} product={p} lowStockThreshold={lowStockThreshold} onSaved={loadProducts} />
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <button onClick={() => startEdit(p)} className="btn btn-outline" style={{ marginRight: "0.4rem" }}>Edit</button>
                    <button onClick={() => handleDelete(p.id, p.name)} className="btn btn-outline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
