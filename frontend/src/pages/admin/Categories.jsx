import { useEffect, useState } from "react";
import api from "../../api/client";

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");

  function loadCategories() {
    setLoadError("");
    return api
      .get("/categories")
      .then((res) => setCategories(res.data))
      .catch(() => setLoadError("Unable to load categories."));
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

  async function handleDelete(id, categoryName) {
    if (!window.confirm(`Delete "${categoryName}"? Products in this category will need to be reassigned.`)) return;
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

      {loadError && (
        <p className="form-error">
          {loadError}{" "}
          <button type="button" className="btn btn-outline" onClick={loadCategories} style={{ marginLeft: "0.5rem" }}>
            Try Again
          </button>
        </p>
      )}

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
              <td><button onClick={() => handleDelete(c.id, c.name)} className="btn btn-outline">Delete</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
