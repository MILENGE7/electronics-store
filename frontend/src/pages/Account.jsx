import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";

// A dedicated hub for customers — distinct from the Admin dashboard, this is
// where a signed-in customer lands to see their profile and jump to orders.
export default function Account() {
  const [me, setMe] = useState(null);

  useEffect(() => {
    api.get("/auth/me").then((res) => setMe(res.data));
  }, []);

  if (!me) return <div className="page-main"><p>Loading...</p></div>;

  return (
    <div className="page-main">
      <h1>My Account</h1>

      <div className="account-card">
        <p className="account-label">Name</p>
        <p className="account-value">{me.name}</p>
        <p className="account-label">Email</p>
        <p className="account-value">{me.email}</p>
      </div>

      <div className="account-links">
        <Link to="/orders" className="btn btn-outline">View order history</Link>
        <Link to="/" className="btn btn-outline">Continue shopping</Link>
      </div>

      <section style={{ marginTop: "2.5rem" }}>
        <h3>Saved addresses</h3>
        {me.addresses?.length ? (
          <ul style={{ paddingLeft: "1.1rem", color: "var(--silver)" }}>
            {me.addresses.map((a) => (
              <li key={a.id}>{a.line1}, {a.city}, {a.state} {a.postalCode}, {a.country}</li>
            ))}
          </ul>
        ) : (
          <p className="catalog-empty">No saved addresses yet — addresses you enter at checkout are used per-order for now.</p>
        )}
      </section>
    </div>
  );
}
