import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { formatRWF } from "../utils/currency";

export default function Checkout() {
  const { items, total, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [address, setAddress] = useState({ line1: "", city: "", state: "", postalCode: "", country: "" });
  const [creating, setCreating] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");

  function openPaystack(order, amountInSubunit, reference) {
    if (!window.PaystackPop) {
      setError("Payment provider failed to load. Check your internet connection and try again.");
      return;
    }

    const handler = window.PaystackPop.setup({
      key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
      email: user.email,
      amount: amountInSubunit,
      currency: "RWF",
      ref: reference,
      onClose: () => {
        // Order already exists (status PENDING, unpaid) — nothing to clean up here.
        // The customer can retry payment for the same order from Order history later
        // if we add a "pay now" action there; for now they'd need to check out again.
      },
      callback: (response) => {
        setVerifying(true);
        api.post(`/orders/${order.id}/verify-payment`, { reference: response.reference })
          .then(() => {
            clearCart();
            navigate("/orders");
          })
          .catch((err) => {
            setError(err.response?.data?.error || "Payment succeeded but could not be verified. Contact support with your reference: " + response.reference);
          })
          .finally(() => setVerifying(false));
      },
    });
    handler.openIframe();
  }

  async function handleCreateOrder(e) {
    e.preventDefault();
    setCreating(true);
    setError("");
    try {
      const orderItems = items.map((i) => ({ productId: i.productId, quantity: i.quantity }));
      const { data } = await api.post("/orders", { items: orderItems, shippingAddress: address });
      openPaystack(data.order, data.amountInSubunit, data.paystackRef);
    } catch (err) {
      setError(err.response?.data?.error || "Could not create order");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="page-main auth-page">
      <form onSubmit={handleCreateOrder} className="auth-form">
        <h1>Checkout</h1>
        {error && <p className="form-error">{error}</p>}
        <input placeholder="Address line 1" value={address.line1}
          onChange={(e) => setAddress({ ...address, line1: e.target.value })} required />
        <input placeholder="City" value={address.city}
          onChange={(e) => setAddress({ ...address, city: e.target.value })} required />
        <input placeholder="State / Province" value={address.state}
          onChange={(e) => setAddress({ ...address, state: e.target.value })} required />
        <input placeholder="Postal code" value={address.postalCode}
          onChange={(e) => setAddress({ ...address, postalCode: e.target.value })} required />
        <input placeholder="Country" value={address.country}
          onChange={(e) => setAddress({ ...address, country: e.target.value })} required />
        <h3 className="price">Total: {formatRWF(total)}</h3>
        <button type="submit" className="btn btn-primary" disabled={creating || verifying}>
          {creating ? "Creating order..." : verifying ? "Confirming payment..." : "Pay with Paystack"}
        </button>
      </form>
    </div>
  );
}
