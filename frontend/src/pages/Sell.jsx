import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import "../styles/dashboard.css";

const EMPTY = { businessName: "", phone: "", description: "", taxId: "", address: "" };

// "Become a seller": apply, see a pending/rejected/suspended application,
// or go to the seller dashboard once approved.
export default function Sell() {
  const [profile, setProfile] = useState(null); // { seller, commissionPercent }
  const [loadError, setLoadError] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function load() {
    setLoadError(false);
    api
      .get("/seller/me")
      .then((res) => {
        setProfile(res.data);
        const s = res.data.seller;
        if (s) {
          setForm({
            businessName: s.businessName || "",
            phone: s.phone || "",
            description: s.description || "",
            taxId: s.taxId || "",
            address: s.address || "",
          });
        }
      })
      .catch(() => setLoadError(true));
  }

  useEffect(load, []);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const { data } = await api.post("/seller/apply", form);
      setProfile((p) => ({ ...p, seller: data }));
    } catch (err) {
      setError(err.response?.data?.error || "Could not send your application. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadError) {
    return (
      <div className="page-main dash-page">
        <p className="form-error">Unable to load your seller status.</p>
        <button type="button" className="btn btn-outline" onClick={load}>
          Try Again
        </button>
      </div>
    );
  }
  if (!profile) return <div className="page-main dash-page"><p className="dash-empty">Loading…</p></div>;

  const { seller, commissionPercent } = profile;
  const status = seller?.status;

  return (
    <div className="page-main dash-page">
      <h1>Sell on FK Trading</h1>
      <p className="dash-sub">
        List your electronics in our shop. FK Trading handles delivery and collects payment from the customer; we keep a{" "}
        {commissionPercent}% commission and pay out the rest to you.
      </p>

      {status === "APPROVED" && (
        <section className="dash-section">
          <h2>You&apos;re an approved seller</h2>
          <p className="dash-sub">Manage your products, see what to prepare and track your earnings.</p>
          <Link to="/seller" className="btn btn-primary">
            Go to seller dashboard
          </Link>
        </section>
      )}

      {status === "PENDING" && (
        <section className="dash-section">
          <h2>
            Application received <span className="badge badge-amber">Pending review</span>
          </h2>
          <p className="dash-sub">
            We&apos;re reviewing your application for <strong>{seller.businessName}</strong>. We&apos;ll contact you at{" "}
            {seller.phone} once it&apos;s been checked.
          </p>
        </section>
      )}

      {status === "SUSPENDED" && (
        <section className="dash-section">
          <h2>
            Seller account suspended <span className="badge badge-red">Suspended</span>
          </h2>
          {seller.adminNote && <p className="dash-sub">Reason: {seller.adminNote}</p>}
          <p className="dash-sub">Your products are hidden from the shop. Please contact us to resolve this.</p>
        </section>
      )}

      {(!seller || status === "REJECTED") && (
        <section className="dash-section">
          <h2>{status === "REJECTED" ? "Apply again" : "Apply to sell"}</h2>
          {status === "REJECTED" && (
            <p className="form-error">
              Your previous application wasn&apos;t approved{seller.adminNote ? `: ${seller.adminNote}` : "."} You can update
              your details and apply again.
            </p>
          )}
          <form className="dash-form" onSubmit={submit}>
            {error && <p className="form-error">{error}</p>}
            <label>
              Business name
              <input value={form.businessName} onChange={set("businessName")} maxLength={120} required />
            </label>
            <div className="dash-form-row">
              <label>
                Phone number
                <input type="tel" placeholder="e.g. 078 123 4567" value={form.phone} onChange={set("phone")} required />
              </label>
              <label>
                TIN or national ID (optional)
                <input value={form.taxId} onChange={set("taxId")} maxLength={60} />
              </label>
            </div>
            <label>
              Business address (optional)
              <input value={form.address} onChange={set("address")} maxLength={300} />
            </label>
            <label>
              What do you sell? (optional)
              <textarea value={form.description} onChange={set("description")} maxLength={1000} />
            </label>
            <div className="dash-actions">
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? "Sending…" : "Send application"}
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
