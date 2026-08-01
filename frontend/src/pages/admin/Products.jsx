import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/client";
import { formatRWF } from "../../utils/currency";

const emptyForm = { name: "", description: "", price: "", stock: "", categoryId: "", brand: "", images: [] };

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  function loadProducts() {
    api.get("/products", { params: { limit: 100 } }).then((res) => setProducts(res.data.products));
  }
  function loadCategories() {
    api.get("/categories").then((res) => setCategories(res.data));
  }

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

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

  function removeImage(url) {
    setForm((f) => ({ ...f, images: f.images.filter((i) => i !== url) }));
  }

  async function handleCreate(e) {
    e.preventDefault();
    await api.post("/products", { ...form, price: Number(form.price), stock: Number(form.stock) });
    setForm(emptyForm);
    loadProducts();
  }

  async function handleDelete(id) {
    await api.delete(`/products/${id}`);
    loadProducts();
  }

  return (
    <div className="page-main">
      <h1>Manage Products</h1>

      <form onSubmit={handleCreate} className="auth-form" style={{ maxWidth: "480px", marginBottom: "2.5rem" }}>
        {error && <p className="form-error">{error}</p>}
        <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
        <input placeholder="Price (RWF)" type="number" step="1" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
        <input placeholder="Stock" type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} required />

        {categories.length === 0 ? (
          <p className="form-error">
            No categories yet — <Link to="/admin/categories">create one first</Link>.
          </p>
        ) : (
          <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} required>
            <option value="" disabled>Select a category</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}

        <input placeholder="Brand" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />

        <label style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", textTransform: "uppercase", color: "var(--silver)" }}>
          Product images
        </label>
        <input type="file" accept="image/*" onChange={handleImageSelect} disabled={uploading} />
        {uploading && <p className="catalog-empty">Uploading...</p>}
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {form.images.map((url) => (
            <div key={url} style={{ position: "relative" }}>
              <img src={url} alt="" width={72} height={72} style={{ objectFit: "cover", borderRadius: "8px" }} />
              <button type="button" onClick={() => removeImage(url)} className="btn btn-outline" style={{ position: "absolute", top: -8, right: -8, padding: "0.1rem 0.4rem", fontSize: "0.7rem" }}>x</button>
            </div>
          ))}
        </div>

        <button type="submit" className="btn btn-primary">Add product</button>
      </form>

      <table>
        <thead>
          <tr><th>Image</th><th>Name</th><th>Price</th><th>Stock</th><th></th></tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id}>
              <td>{p.images?.[0] && <img src={p.images[0]} alt="" width={40} height={40} style={{ objectFit: "cover", borderRadius: "6px" }} />}</td>
              <td>{p.name}</td>
              <td className="price">{formatRWF(p.price)}</td>
              <td>{p.stock}</td>
              <td><button onClick={() => handleDelete(p.id)} className="btn btn-outline">Delete</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
