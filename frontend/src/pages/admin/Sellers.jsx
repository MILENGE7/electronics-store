import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../../api/client";
import { formatRWF } from "../../utils/currency";
import "../../styles/dashboard.css";

const FILTERS = [
  { value: "", label: "All" },
  { value: "PENDING", label: "Applications" },
  { value: "APPROVED", label: "Approved" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "REJECTED", label: "Rejected" },
];

const STATUS_BADGE = {
  PENDING: "badge-amber",
  APPROVED: "badge-green",
  SUSPENDED: "badge-red",
  REJECTED: "badge-grey",
};

function PayoutForm({ seller, onDone }) {
  const [form, setForm] = useState({ amount: String(seller.earnings.balance), method: "MTN MoMo", reference: "", note: "" });
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    try {
      await api.post(`/admin/sellers/${seller.id}/payouts`, { ...form, amount: Number(form.amount) });
      onDone();
    } catch (err) {
      setError(err.response?.data?.error || "Could not record payout");
    }
  }

  return (
    <form className="dash-form" onSubmit={submit} style={{ marginTop: "0.8rem" }}>
      {error && <p className="form-error">{error}</p>}
      <div className="dash-form-row">
        <label>
          Amount (RWF)
          <input type="number" min="1" max={seller.earnings.balance} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
        </label>
        <label>
          Paid by
          <input value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })} required />
        </label>
        <label>
          Reference (optional)
          <input placeholder="e.g. MoMo transaction ID" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
        </label>
      </div>
      <div className="dash-actions">
        <button type="submit" className="btn btn-primary">Record payout</button>
        <button type="button" className="btn btn-outline" onClick={() => onDone(true)}>Cancel</button>
      </div>
    </form>
  );
}

function SellerCard({ seller, onChanged }) {
  const [open, setOpen] = useState(false);
  const [payingOut, setPayingOut] = useState(false);
  const [error, setError] = useState("");
  const e = seller.earnings;

  async function setStatus(status) {
    let adminNote;
    if (status === "REJECTED" || status === "SUSPENDED") {
      adminNote = window.prompt(status === "REJECTED" ? "Reason for rejecting (shown to the applicant):" : "Reason for suspending:");
      if (adminNote === null) return;
    }
    setError("");
    try {
      await api.patch(`/admin/sellers/${seller.id}/status`, { status, adminNote });
      onChanged();
    } catch (err) {
      setError(err.response?.data?.error || "Could not update seller");
    }
  }

  return (
    <li style={{ display: "block", padding: "1rem 0" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.8rem", alignItems: "center" }}>
        <span className="dash-list-main" style={{ flex: "1 1 220px" }}>
          <strong>{seller.businessName}</strong>
          <span>
            {seller.user.name} · {seller.user.email} · {seller.phone}
          </span>
        </span>
        <span className={`badge ${STATUS_BADGE[seller.status]}`}>{seller.status.toLowerCase()}</span>
        {seller.status === "APPROVED" && <span>Owed: <strong>{formatRWF(e.balance)}</strong></span>}
        <button type="button" className="btn btn-outline" onClick={() => setOpen(!open)}>
          {open ? "Hide" : "Details"}
        </button>
      </div>

      {error && <p className="form-error">{error}</p>}

      {open && (
        <div style={{ marginTop: "0.8rem", display: "grid", gap: "0.6rem" }}>
          {seller.description && <p style={{ margin: 0 }}>{seller.description}</p>}
          <p style={{ margin: 0, color: "var(--silver)", fontSize: "0.88rem" }}>
            TIN / ID: {seller.taxId || "—"} · Address: {seller.address || "—"} · Applied {new Date(seller.createdAt).toLocaleDateString()} ·{" "}
            {seller._count.products} product(s)
          </p>
          {seller.adminNote && <p style={{ margin: 0, color: "var(--silver)", fontSize: "0.88rem" }}>Note: {seller.adminNote}</p>}

          <div className="dash-stats" style={{ marginBottom: 0 }}>
            <div className="dash-stat"><span className="dash-stat-label">Sales (delivered)</span><span className="dash-stat-value">{formatRWF(e.gross)}</span></div>
            <div className="dash-stat"><span className="dash-stat-label">Commission</span><span className="dash-stat-value">{formatRWF(e.commission)}</span></div>
            <div className="dash-stat"><span className="dash-stat-label">Paid out</span><span className="dash-stat-value">{formatRWF(e.paidOut)}</span></div>
            <div className="dash-stat"><span className="dash-stat-label">Balance owed</span><span className="dash-stat-value">{formatRWF(e.balance)}</span></div>
            <div className="dash-stat"><span className="dash-stat-label">On the way</span><span className="dash-stat-value">{formatRWF(e.pending)}</span><span className="dash-stat-note">not delivered yet</span></div>
          </div>

          <div className="dash-actions">
            {seller.status !== "APPROVED" && (
              <button type="button" className="btn btn-primary" onClick={() => setStatus("APPROVED")}>
                {seller.status === "SUSPENDED" ? "Reinstate" : "Approve"}
              </button>
            )}
            {seller.status === "PENDING" && (
              <button type="button" className="btn btn-outline" onClick={() => setStatus("REJECTED")}>Reject</button>
            )}
            {seller.status === "APPROVED" && (
              <>
                <button type="button" className="btn btn-outline" disabled={e.balance <= 0} onClick={() => setPayingOut(true)}>
                  Record payout
                </button>
                <button type="button" className="btn btn-outline" onClick={() => setStatus("SUSPENDED")}>Suspend</button>
              </>
            )}
          </div>

          {payingOut && (
            <PayoutForm
              seller={seller}
              onDone={(cancelled) => {
                setPayingOut(false);
                if (!cancelled) onChanged();
              }}
            />
          )}
        </div>
      )}
    </li>
  );
}

export default function AdminSellers() {
  const [params, setParams] = useSearchParams();
  const status = params.get("status") || "";
  const [sellers, setSellers] = useState([]);
  const [error, setError] = useState("");

  function load() {
    setError("");
    api
      .get("/admin/sellers", { params: { status: status || undefined } })
      .then((res) => setSellers(res.data))
      .catch(() => setError("Unable to load sellers."));
  }

  useEffect(load, [status]);

  return (
    <div className="page-main dash-page">
      <h1>Sellers</h1>
      <p className="dash-sub">
        Approve applications, see what each seller is owed after commission, and record payouts once you&apos;ve paid them.
      </p>

      <div className="dash-actions" style={{ marginBottom: "1.2rem" }}>
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            className={`btn ${status === f.value ? "btn-primary" : "btn-outline"}`}
            onClick={() => setParams(f.value ? { status: f.value } : {})}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <p className="form-error">{error}</p>}

      <section className="dash-section">
        {sellers.length === 0 ? (
          <p className="dash-empty">No sellers here yet. Customers can apply from the &quot;Sell on FK Trading&quot; page.</p>
        ) : (
          <ul className="dash-list">
            {sellers.map((s) => (
              <SellerCard key={s.id} seller={s} onChanged={load} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
