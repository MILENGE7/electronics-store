import { useEffect, useState } from "react";
import api from "../api/client";
import "../styles/dashboard.css";

export const EMPTY_PRODUCT = { name: "", description: "", price: "", stock: "", categoryId: "", brand: "", images: [], specs: [] };

// Turns a product from the API into form state.
export function productToForm(p) {
  return {
    name: p.name,
    description: p.description,
    price: String(Math.round(Number(p.price))),
    stock: String(p.stock),
    categoryId: p.categoryId,
    brand: p.brand || "",
    images: p.images || [],
    specs: Array.isArray(p.specs) ? p.specs : [],
  };
}

// Add/edit product form shared by the admin and seller dashboards.
// `onSubmit(payload)` should throw (e.g. a rejected axios call) on failure.
// `initial` is read once — give the form a new `key` to reset or reload it.
export default function ProductForm({ initial = EMPTY_PRODUCT, title, submitLabel, onSubmit, onCancel }) {
  const [form, setForm] = useState(initial);
  const [categories, setCategories] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/categories")
      .then((res) => setCategories(res.data))
      .catch(() => setError("Unable to load categories."));
  }, []);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  async function handleImageSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("image", file);
      const { data } = await api.post("/uploads", formData);
      setForm((f) => ({ ...f, images: [...f.images, data.url] }));
    } catch (err) {
      setError(err.response?.data?.error || "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function setSpec(index, field, value) {
    setForm((f) => ({ ...f, specs: f.specs.map((s, i) => (i === index ? { ...s, [field]: value } : s)) }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await onSubmit({
        ...form,
        price: Number(form.price),
        stock: Number(form.stock),
        specs: form.specs.filter((s) => s.name.trim() && s.value.trim()),
      });
    } catch (err) {
      setError(err.response?.data?.error || "Could not save product");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="dash-form" style={{ marginBottom: "2rem" }}>
      {title && <h2 style={{ margin: 0, fontSize: "1.1rem" }}>{title}</h2>}
      {error && <p className="form-error">{error}</p>}

      <label>
        Name
        <input value={form.name} onChange={set("name")} required />
      </label>
      <label>
        Description
        <textarea value={form.description} onChange={set("description")} required />
      </label>
      <div className="dash-form-row">
        <label>
          Price (RWF)
          <input type="number" min="0" step="1" value={form.price} onChange={set("price")} required />
        </label>
        <label>
          Stock
          <input type="number" min="0" step="1" value={form.stock} onChange={set("stock")} required />
        </label>
      </div>
      <div className="dash-form-row">
        <label>
          Category
          {categories.length === 0 ? (
            <span className="form-error">No categories yet — the admin needs to create one first.</span>
          ) : (
            <select value={form.categoryId} onChange={set("categoryId")} required>
              <option value="" disabled>Select a category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
        </label>
        <label>
          Brand
          <input value={form.brand} onChange={set("brand")} />
        </label>
      </div>

      <fieldset style={{ border: "1px solid var(--hairline)", borderRadius: "12px", padding: "0.9rem", display: "grid", gap: "0.6rem" }}>
        <legend style={{ color: "var(--silver)", fontSize: "0.8rem", padding: "0 0.3rem" }}>Specifications</legend>
        {form.specs.length === 0 && <p className="dash-empty" style={{ fontSize: "0.85rem" }}>e.g. Storage: 128 GB · RAM: 6 GB · Warranty: 1 year</p>}
        {form.specs.map((s, i) => (
          <div key={i} style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <input placeholder="Name (e.g. Storage)" value={s.name} onChange={(e) => setSpec(i, "name", e.target.value)} aria-label="Specification name" style={{ flex: "1 1 120px" }} />
            <input placeholder="Value (e.g. 128 GB)" value={s.value} onChange={(e) => setSpec(i, "value", e.target.value)} aria-label="Specification value" style={{ flex: "2 1 160px" }} />
            <button type="button" className="btn btn-outline" onClick={() => setForm((f) => ({ ...f, specs: f.specs.filter((_, j) => j !== i) }))} aria-label="Remove specification">
              ×
            </button>
          </div>
        ))}
        <div>
          <button type="button" className="btn btn-outline" onClick={() => setForm((f) => ({ ...f, specs: [...f.specs, { name: "", value: "" }] }))}>
            + Add specification
          </button>
        </div>
      </fieldset>

      <label>
        Product images
        <input type="file" accept="image/*" onChange={handleImageSelect} disabled={uploading} />
      </label>
      {uploading && <p className="dash-empty">Uploading...</p>}
      {form.images.length > 0 && (
        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
          {form.images.map((url) => (
            <div key={url} style={{ position: "relative" }}>
              <img src={url} alt="" width={72} height={72} style={{ objectFit: "cover", borderRadius: "8px" }} />
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, images: f.images.filter((i) => i !== url) }))}
                className="btn btn-outline"
                aria-label="Remove image"
                style={{ position: "absolute", top: -8, right: -8, padding: "0.1rem 0.45rem", fontSize: "0.75rem" }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="dash-actions">
        <button type="submit" className="btn btn-primary" disabled={uploading || saving}>
          {saving ? "Saving..." : submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="btn btn-outline" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
