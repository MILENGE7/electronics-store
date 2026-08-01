import { useState } from "react";
import { PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";

// Renders once an order + PaymentIntent already exist (see Checkout.jsx).
// Confirms the card payment against the clientSecret passed in via the
// parent <Elements> provider.
export default function PaymentForm({ onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!stripe || !elements) return; // Stripe.js hasn't loaded yet

    setProcessing(true);
    setError("");

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required", // stay on this page instead of bouncing to a return_url
    });

    if (confirmError) {
      setError(confirmError.message || "Payment failed. Please try again.");
      setProcessing(false);
      return;
    }

    if (paymentIntent?.status === "succeeded") {
      onSuccess();
    } else {
      setError("Payment did not complete. Please try again.");
      setProcessing(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: "1rem" }}>
      <PaymentElement />
      {error && <p className="form-error">{error}</p>}
      <button type="submit" className="btn btn-primary" disabled={!stripe || processing}>
        {processing ? "Processing..." : "Pay now"}
      </button>
    </form>
  );
}
