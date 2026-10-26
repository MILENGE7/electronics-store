import { useEffect, useState } from "react";
import api from "../../api/client";
import { formatRWF } from "../../utils/currency";
import "../../styles/dashboard.css";

const errorOf = (err, fallback) => err.response?.data?.error || fallback;

function StoreSettingsForm() {
  const [form, setForm] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/admin/settings")
      .then((res) => setForm({ commissionPercent: String(Number(res.data.commissionPercent)), lowStockThreshold: String(res.data.lowStockThreshold) }))
      .catch(() => setError("Unable to load settings."));
  }, []);

  async function save(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      await api.patch("/admin/settings", {
        commissionPercent: Number(form.commissionPercent),
        lowStockThreshold: Number(form.lowStockThreshold),
      });
      setMessage("Settings saved.");
    } catch (err) {
      setError(errorOf(err, "Could not save settings"));
    }
  }

  return (
    <section className="dash-section">
      <h2>Store settings</h2>
      {error && <p className="form-error">{error}</p>}
      {form && (
        <form className="dash-form" onSubmit={save}>
          <div className="dash-form-row">
            <label>
              Commission on seller sales (%)
              <input type="number" min="0" max="50" step="0.5" value={form.commissionPercent} onChange={(e) => setForm({ ...form, commissionPercent: e.target.value })} required />
            </label>
            <label>
              Low-stock alert at (units)
              <input type="number" min="0" max="1000" step="1" value={form.lowStockThreshold} onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })} required />
            </label>
          </div>
          <p className="dash-empty" style={{ fontSize: "0.82rem" }}>
            A new commission rate only applies to orders placed from now on — past sales keep the rate they were sold at.
          </p>
          <div className="dash-actions">
            <button type="submit" className="btn btn-primary">Save settings</button>
          </div>
          {message && <p className="dash-success">{message}</p>}
        </form>
      )}
    </section>
  );
}

function DeliveryZones() {
  const [zones, setZones] = useState([]);
  const [newZone, setNewZone] = useState({ name: "", fee: "" });
  const [editing, setEditing] = useState(null); // { id, name, fee }
  const [error, setError] = useState("");

  function load() {
    return api
      .get("/admin/delivery-zones")
      .then((res) => setZones(res.data))
      .catch(() => setError("Unable to load delivery zones."));
  }

  useEffect(() => {
    load();
  }, []);

  async function run(action, fallback) {
    setError("");
    try {
      await action();
      await load();
      return true;
    } catch (err) {
      setError(errorOf(err, fallback));
      return false;
    }
  }

  async function addZone(e) {
    e.preventDefault();
    const ok = await run(() => api.post("/admin/delivery-zones", { name: newZone.name, fee: Number(newZone.fee) }), "Could not add zone");
    if (ok) setNewZone({ name: "", fee: "" });
  }

  async function saveEdit(e) {
    e.preventDefault();
    const ok = await run(
      () => api.patch(`/admin/delivery-zones/${editing.id}`, { name: editing.name, fee: Number(editing.fee) }),
      "Could not save zone"
    );
    if (ok) setEditing(null);
  }

  return (
    <section className="dash-section">
      <h2>Delivery areas &amp; fees</h2>
      <p className="dash-empty" style={{ marginBottom: "1rem" }}>
        Customers pick one of these at checkout and its fee is added to the order. With no areas set up, delivery is free.
      </p>
      {error && <p className="form-error">{error}</p>}

      {zones.length > 0 && (
        <ul className="dash-list" style={{ marginBottom: "1.2rem" }}>
          {zones.map((z) =>
            editing?.id === z.id ? (
              <li key={z.id}>
                <form onSubmit={saveEdit} className="dash-actions" style={{ flex: 1 }}>
                  <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} aria-label="Area name" required />
                  <input type="number" min="0" value={editing.fee} onChange={(e) => setEditing({ ...editing, fee: e.target.value })} aria-label="Fee (RWF)" required style={{ width: "120px" }} />
                  <button type="submit" className="btn btn-primary">Save</button>
                  <button type="button" className="btn btn-outline" onClick={() => setEditing(null)}>Cancel</button>
                </form>
              </li>
            ) : (
              <li key={z.id}>
                <span className="dash-list-main">
                  <strong>{z.name}</strong>
                  <span>{formatRWF(z.fee)}</span>
                </span>
                {!z.isActive && <span className="badge badge-grey">Off</span>}
                <button type="button" className="btn btn-outline" onClick={() => setEditing({ id: z.id, name: z.name, fee: String(Math.round(Number(z.fee))) })}>
                  Edit
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => run(() => api.patch(`/admin/delivery-zones/${z.id}`, { isActive: !z.isActive }), "Could not update zone")}
                >
                  {z.isActive ? "Turn off" : "Turn on"}
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    if (window.confirm(`Remove "${z.name}"?`)) run(() => api.delete(`/admin/delivery-zones/${z.id}`), "Could not remove zone");
                  }}
                >
                  Remove
                </button>
              </li>
            )
          )}
        </ul>
      )}

      <form className="dash-form" onSubmit={addZone}>
        <div className="dash-form-row">
          <label>
            Area name
            <input placeholder="e.g. Kigali" value={newZone.name} onChange={(e) => setNewZone({ ...newZone, name: e.target.value })} required />
          </label>
          <label>
            Delivery fee (RWF)
            <input type="number" min="0" step="1" placeholder="e.g. 2000" value={newZone.fee} onChange={(e) => setNewZone({ ...newZone, fee: e.target.value })} required />
          </label>
        </div>
        <div className="dash-actions">
          <button type="submit" className="btn btn-primary">Add area</button>
        </div>
      </form>
    </section>
  );
}

export default function AdminSettings() {
  return (
    <div className="page-main dash-page">
      <h1>Settings</h1>
      <p className="dash-sub">Commission, stock alerts and delivery fees.</p>
      <StoreSettingsForm />
      <DeliveryZones />
    </div>
  );
}
