import { useEffect, useState } from "react";
import api from "../api/client";

const EMPTY = { line1: "", line2: "", city: "", state: "", postalCode: "", country: "Rwanda" };

const FIELDS = [
  { name: "line1", label: "Address", required: true },
  { name: "line2", label: "Apartment, suite, etc. (optional)" },
  { name: "city", label: "City / District", required: true },
  { name: "state", label: "Province", required: true },
  { name: "postalCode", label: "Postal code (optional)" },
  { name: "country", label: "Country", required: true },
];

function formatAddress(a) {
  return [a.line1, a.line2, a.city, a.state, a.postalCode, a.country].filter(Boolean).join(", ");
}

// A customer's saved delivery addresses: add, edit, delete, set default.
// Every endpoint returns the full updated list, so state is just replaced.
export default function AddressBook() {
  const [addresses, setAddresses] = useState(null);
  const [loadError, setLoadError] = useState(false);
  // null = no form open, "new" = adding, otherwise the id being edited
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [fieldErrors, setFieldErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/addresses")
      .then((res) => setAddresses(res.data))
      .catch(() => setLoadError(true));
  }, []);

  function openForm(address) {
    setEditingId(address ? address.id : "new");
    setForm(address ? { ...EMPTY, ...Object.fromEntries(FIELDS.map((f) => [f.name, address[f.name] || ""])) } : EMPTY);
    setFieldErrors({});
    setError("");
  }

  function closeForm() {
    setEditingId(null);
    setFieldErrors({});
    setError("");
  }

  async function run(request) {
    setBusy(true);
    setError("");
    try {
      const { data } = await request();
      setAddresses(data);
      return true;
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong. Please try again.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function save(e) {
    e.preventDefault();
    const errs = {};
    FIELDS.forEach((f) => {
      if (f.required && !form[f.name].trim()) errs[f.name] = `${f.label} is required.`;
    });
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const ok = await run(() =>
      editingId === "new" ? api.post("/addresses", form) : api.put(`/addresses/${editingId}`, form)
    );
    if (ok) closeForm();
  }

  if (loadError) {
    return (
      <div className="state-error">
        <p>Unable to load your saved addresses.</p>
      </div>
    );
  }
  if (!addresses) return <p className="catalog-empty">Loading…</p>;

  return (
    <>
      {addresses.length > 0 ? (
        <ul className="account-address-list">
          {addresses.map((a) => (
            <li key={a.id} className="account-address-item">
              <span>{formatAddress(a)}</span>
              <span className="account-address-actions">
                {a.isDefault ? (
                  <span className="account-address-default">Default</span>
                ) : (
                  <button
                    type="button"
                    className="account-address-btn"
                    disabled={busy}
                    onClick={() => run(() => api.post(`/addresses/${a.id}/default`))}
                  >
                    Make default
                  </button>
                )}
                <button type="button" className="account-address-btn" disabled={busy} onClick={() => openForm(a)}>
                  Edit
                </button>
                <button
                  type="button"
                  className="account-address-btn danger"
                  disabled={busy}
                  onClick={() => run(() => api.delete(`/addresses/${a.id}`))}
                >
                  Delete
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        editingId === null && <p className="catalog-empty">No saved addresses yet.</p>
      )}

      {editingId === null ? (
        <button type="button" className="btn btn-outline" onClick={() => openForm(null)}>
          Add an address
        </button>
      ) : (
        <form className="account-card account-edit-form" onSubmit={save} noValidate>
          <h3 className="account-subheading">{editingId === "new" ? "New address" : "Edit address"}</h3>
          {FIELDS.map((f) => (
            <div className="checkout-field" key={f.name}>
              <label htmlFor={`addr-${f.name}`}>{f.label}</label>
              <input
                id={`addr-${f.name}`}
                value={form[f.name]}
                onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                aria-invalid={!!fieldErrors[f.name]}
                disabled={busy}
              />
              {fieldErrors[f.name] && <p className="checkout-field-error">{fieldErrors[f.name]}</p>}
            </div>
          ))}
          <div className="account-edit-actions">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? "Saving…" : "Save Address"}
            </button>
            <button type="button" className="btn btn-outline" onClick={closeForm} disabled={busy}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {error && (
        <p className="checkout-field-error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
