import { useEffect, useState } from "react";
import api from "../../api/client";

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  function loadCategories() {
    api.get("/categories").then((res) => setCategories(res.data));
  }

  useEffect(loadCategories, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    try {
      await api.post("/categories", { name });
      setName("");
      loadCategories();
    } catch (err) {
      setError(err.response?.data?.error || "Could not create category");
    }
  }

  async function handleDelete(id) {
    setError("");
    try {
      await api.delete(`/categories/${id}`);
      loadCategories();
    } catch (err) {
      setError(err.response?.data?.error || "Could not delete category");
    }
  }

  return (
    <div className="page-main">
      <h1>Manage Categories</h1>
      <p style={{ color: "var(--silver)", maxWidth: "50ch" }}>
        Products must belong to a category. Create at least one here before adding products.
      </p>

      <form onSubmit={handleCreate} className="auth-form" style={{ maxWidth: "360px", margin: "1.5rem 0" }}>
        {error && <p className="form-error">{error}</p>}
        <input placeholder="Category name (e.g. Headphones)" value={name} onChange={(e) => setName(e.target.value)} required />
        <button type="submit" className="btn btn-primary">Add category</button>
      </form>

      <table>
        <thead><tr><th>Name</th><th></th></tr></thead>
        <tbody>
          {categories.map((c) => (
            <tr key={c.id}>
              <td>{c.name}</td>
              <td><button onClick={() => handleDelete(c.id)} className="btn btn-outline">Delete</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
