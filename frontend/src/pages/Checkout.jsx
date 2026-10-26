import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { formatRWF } from "../utils/currency";
import "./Checkout.css";

const STEPS = ["Customer Information", "Delivery", "Payment", "Confirmation"];

function CheckCircleIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="12" cy="12" r="10" />
      <path d="M8 12.5l2.5 2.5L16 9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+\s()-]{7,20}$/;

const EMPTY_ADDRESS = { line1: "", line2: "", city: "", state: "", postalCode: "", country: "Rwanda" };

function toDeliveryInfo(address) {
  return {
    line1: address.line1 || "",
    line2: address.line2 || "",
    city: address.city || "",
    state: address.state || "",
    postalCode: address.postalCode || "",
    country: address.country || "Rwanda",
  };
}

const PROCESSING_STATES = new Set(["creating-order", "awaiting-payment", "verifying"]);

// Online payment is only offered once a real Paystack public key is
// configured (not empty, not the .env.example placeholder).
const PAYSTACK_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || "";
const ONLINE_PAYMENT_ENABLED = PAYSTACK_KEY.startsWith("pk_") && !PAYSTACK_KEY.includes("xxx");

const PAYMENT_OPTIONS = [
  ...(ONLINE_PAYMENT_ENABLED
    ? [{ value: "PAYSTACK", title: "Pay online", detail: "Card or mobile money, paid now via Paystack." }]
    : []),
  { value: "CASH_ON_DELIVERY", title: "Cash on delivery", detail: "Pay in cash when your order arrives." },
];

export default function Checkout() {
  const { items, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  // The cart context's `item.price` is captured at add-to-cart time and can
  // drift from the current price by checkout. Cart.jsx already revalidates
  // against live product data for its subtotal/stock checks; this mirrors
  // that here so the total shown during checkout matches what's actually
  // charged (the backend independently prices the order from current data
  // regardless — this is about the customer not seeing two different totals).
  const [liveProductsById, setLiveProductsById] = useState({});
  const [liveProductsLoaded, setLiveProductsLoaded] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({ name: user?.name || "", email: user?.email || "", phone: "" });
  const [deliveryInfo, setDeliveryInfo] = useState(EMPTY_ADDRESS);
  const [errors, setErrors] = useState({});

  // Delivery areas set up by the admin. With none configured, delivery is
  // free and no area is asked for (the backend applies the same rule).
  const [zones, setZones] = useState([]);
  const [zoneId, setZoneId] = useState("");
  // Saved addresses: picking one fills the form; "new" means typed by hand.
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [addressChoice, setAddressChoice] = useState("new");
  const [saveAddress, setSaveAddress] = useState(false);

  const [order, setOrder] = useState(null);
  const [confirmedOrder, setConfirmedOrder] = useState(null);
  const [amountInSubunit, setAmountInSubunit] = useState(0);
  const [paystackRef, setPaystackRef] = useState("");
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_OPTIONS[0].value);
  const [paymentState, setPaymentState] = useState("idle");
  const [paymentMessage, setPaymentMessage] = useState("");

  const isProcessing = PROCESSING_STATES.has(paymentState);

  // Don't strand a shopper with an empty cart on this page — except once
  // they've actually completed an order, since clearCart() empties the cart
  // right before we show the confirmation step.
  useEffect(() => {
    if (items.length === 0 && step !== 3) {
      navigate("/cart", { replace: true });
    }
  }, [items.length, step, navigate]);

  useEffect(() => {
    api
      .get("/delivery-zones")
      .then((res) => setZones(res.data))
      .catch(() => setZones([]));
    api
      .get("/addresses")
      .then((res) => {
        setSavedAddresses(res.data);
        const preferred = res.data.find((a) => a.isDefault) || res.data[0];
        if (preferred) {
          setAddressChoice(preferred.id);
          setDeliveryInfo(toDeliveryInfo(preferred));
        }
      })
      .catch(() => setSavedAddresses([]));
  }, []);

  const productIdsKey = items.map((i) => i.productId).join(",");

  useEffect(() => {
    if (items.length === 0) {
      setLiveProductsById({});
      setLiveProductsLoaded(true);
      return;
    }
    setLiveProductsLoaded(false);
    Promise.all(
      items.map((i) =>
        api
          .get(`/products/${i.productId}`)
          .then((res) => [i.productId, { ...res.data, unavailable: false }])
          .catch(() => [i.productId, { id: i.productId, unavailable: true }])
      )
    )
      .then((pairs) => setLiveProductsById(Object.fromEntries(pairs)))
      .finally(() => setLiveProductsLoaded(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productIdsKey]);

  const subtotal = items.reduce((sum, item) => {
    const product = liveProductsById[item.productId];
    const unitPrice = product && !product.unavailable ? Number(product.price) : Number(item.price);
    return sum + unitPrice * item.quantity;
  }, 0);
  const selectedZone = zones.find((z) => z.id === zoneId) || null;
  const deliveryFee = selectedZone ? Number(selectedZone.fee) : 0;
  const total = subtotal + deliveryFee;

  // Same shape of check as Cart.jsx's blockingIssues — anything that would
  // make order creation fail server-side, surfaced here too so a shopper who
  // navigates straight to /checkout (skipping Cart) isn't let through to the
  // payment step first.
  const hasBlockingIssue =
    liveProductsLoaded &&
    items.some((item) => {
      const product = liveProductsById[item.productId];
      if (!product || product.unavailable) return true;
      if (product.stock <= 0) return true;
      if (item.quantity > product.stock) return true;
      return false;
    });

  function updateCustomer(field, value) {
    setCustomerInfo((prev) => ({ ...prev, [field]: value }));
  }

  function updateDelivery(field, value) {
    setDeliveryInfo((prev) => ({ ...prev, [field]: value }));
  }

  function chooseAddress(choice) {
    setAddressChoice(choice);
    setErrors({});
    if (choice === "new") {
      setDeliveryInfo(EMPTY_ADDRESS);
    } else {
      const address = savedAddresses.find((a) => a.id === choice);
      if (address) setDeliveryInfo(toDeliveryInfo(address));
    }
  }

  function validateInfo() {
    const e = {};
    if (!customerInfo.name.trim()) e.name = "Full name is required.";
    if (!customerInfo.email.trim()) e.email = "Email is required.";
    else if (!EMAIL_RE.test(customerInfo.email)) e.email = "Please enter a valid email address.";
    if (!customerInfo.phone.trim()) e.phone = "Phone number is required.";
    else if (!PHONE_RE.test(customerInfo.phone)) e.phone = "Please enter a valid phone number.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateDelivery() {
    const e = {};
    if (!deliveryInfo.line1.trim()) e.line1 = "Address is required.";
    if (!deliveryInfo.city.trim()) e.city = "City is required.";
    if (!deliveryInfo.state.trim()) e.state = "Province / State is required.";
    if (!deliveryInfo.country.trim()) e.country = "Country is required.";
    if (zones.length > 0 && !selectedZone) e.zone = "Please choose a delivery area.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function goNext() {
    if (step === 0 && !validateInfo()) return;
    if (step === 1 && !validateDelivery()) return;
    setErrors({});
    setStep((s) => Math.min(s + 1, 2));
  }

  function goBack() {
    if (isProcessing) return;
    setErrors({});
    setStep((s) => Math.max(0, s - 1));
  }

  function goToStep(target) {
    if (isProcessing || target > step) return;
    setStep(target);
  }

  function openPaystackPopup(orderObj, amount, ref) {
    if (!window.PaystackPop) {
      setPaymentState("failed");
      setPaymentMessage("Payment provider failed to load. Check your connection and try again.");
      return;
    }

    setPaymentState("awaiting-payment");
    setPaymentMessage("Complete your payment in the Paystack window.");

    const handler = window.PaystackPop.setup({
      key: PAYSTACK_KEY,
      email: customerInfo.email,
      amount,
      currency: "RWF",
      ref,
      onClose: () => {
        // Paystack also calls onClose after a completed payment in some
        // flows — only treat it as a cancellation if we're not already
        // past that point.
        setPaymentState((s) => {
          if (s === "verifying" || s === "success") return s;
          setPaymentMessage("Payment cancelled.");
          return "cancelled";
        });
      },
      callback: (response) => {
        setPaymentState("verifying");
        setPaymentMessage("Processing payment...");
        api
          .post(`/orders/${orderObj.id}/verify-payment`, { reference: response.reference })
          .then((res) => {
            setConfirmedOrder(res.data);
            setPaymentState("success");
            setPaymentMessage("");
            clearCart();
            setStep(3);
          })
          .catch((err) => {
            setPaymentState("failed");
            setPaymentMessage(err.response?.data?.error || "Payment could not be completed. Please try again.");
          });
      },
    });

    handler.openIframe();
  }

  async function handlePlaceOrder() {
    if (isProcessing || hasBlockingIssue) return;

    // Retry after a cancelled/failed attempt reuses the order that was
    // already created server-side (which already decremented stock) —
    // creating a second order here would double-count that stock.
    if (order) {
      openPaystackPopup(order, amountInSubunit, paystackRef);
      return;
    }

    setPaymentState("creating-order");
    setPaymentMessage("Creating your order...");
    try {
      const shippingAddress = { ...deliveryInfo, phone: customerInfo.phone, fullName: customerInfo.name };
      const orderItems = items.map((i) => ({ productId: i.productId, quantity: i.quantity }));
      const { data } = await api.post("/orders", {
        items: orderItems,
        shippingAddress,
        paymentMethod,
        deliveryZoneId: selectedZone?.id,
      });

      // Saving the address is a convenience — never let it fail the order.
      if (addressChoice === "new" && saveAddress) {
        api.post("/addresses", deliveryInfo).catch(() => {});
      }

      if (paymentMethod === "CASH_ON_DELIVERY") {
        setConfirmedOrder(data.order);
        setPaymentState("success");
        setPaymentMessage("");
        clearCart();
        setStep(3);
        return;
      }

      setOrder(data.order);
      setAmountInSubunit(data.amountInSubunit);
      setPaystackRef(data.paystackRef);
      openPaystackPopup(data.order, data.amountInSubunit, data.paystackRef);
    } catch (err) {
      setPaymentState("failed");
      setPaymentMessage(err.response?.data?.error || "Unable to continue with checkout. Please try again.");
    }
  }

  const isCashOnDelivery = paymentMethod === "CASH_ON_DELIVERY";
  const payButtonLabel =
    paymentState === "creating-order"
      ? isCashOnDelivery
        ? "Placing Order..."
        : "Creating Order..."
      : paymentState === "awaiting-payment"
      ? "Awaiting Payment..."
      : paymentState === "verifying"
      ? "Verifying Payment..."
      : order
      ? "Try Again"
      : isCashOnDelivery
      ? "Place Order"
      : "Place Order & Pay";

  return (
    <div className="page-main checkout-page">
      {step < 3 && (
        <>
          <h1 className="checkout-title">Checkout</h1>

          <ol className="checkout-stepper">
            {STEPS.map((label, i) => (
              <li
                key={label}
                className={`checkout-step-dot ${i === step ? "active" : ""} ${i < step ? "done" : ""}`}
              >
                <button type="button" onClick={() => goToStep(i)} disabled={i > step} tabIndex={i > step ? -1 : 0}>
                  <span className="checkout-step-num">{i < step ? "✓" : i + 1}</span>
                  <span className="checkout-step-label">{label}</span>
                </button>
              </li>
            ))}
          </ol>

          <div className="checkout-layout">
            <div className="checkout-form">
              {step === 0 && (
                <section className="checkout-step-panel">
                  <h2>Customer Information</h2>

                  <div className="checkout-field">
                    <label htmlFor="co-name">Full name</label>
                    <input
                      id="co-name"
                      value={customerInfo.name}
                      onChange={(e) => updateCustomer("name", e.target.value)}
                      aria-invalid={!!errors.name}
                      aria-describedby={errors.name ? "co-name-error" : undefined}
                    />
                    {errors.name && (
                      <p className="checkout-field-error" id="co-name-error">
                        {errors.name}
                      </p>
                    )}
                  </div>

                  <div className="checkout-field">
                    <label htmlFor="co-email">Email</label>
                    <input
                      id="co-email"
                      type="email"
                      value={customerInfo.email}
                      onChange={(e) => updateCustomer("email", e.target.value)}
                      aria-invalid={!!errors.email}
                      aria-describedby={errors.email ? "co-email-error" : undefined}
                    />
                    {errors.email && (
                      <p className="checkout-field-error" id="co-email-error">
                        {errors.email}
                      </p>
                    )}
                  </div>

                  <div className="checkout-field">
                    <label htmlFor="co-phone">Phone number</label>
                    <input
                      id="co-phone"
                      type="tel"
                      placeholder="e.g. 078 123 4567"
                      value={customerInfo.phone}
                      onChange={(e) => updateCustomer("phone", e.target.value)}
                      aria-invalid={!!errors.phone}
                      aria-describedby={errors.phone ? "co-phone-error" : undefined}
                    />
                    {errors.phone && (
                      <p className="checkout-field-error" id="co-phone-error">
                        {errors.phone}
                      </p>
                    )}
                  </div>

                  <div className="checkout-step-actions">
                    <button type="button" className="btn btn-primary" onClick={goNext}>
                      Continue to Delivery
                    </button>
                  </div>
                </section>
              )}

              {step === 1 && (
                <section className="checkout-step-panel">
                  <h2>Delivery</h2>

                  {zones.length > 0 && (
                    <div className="checkout-field">
                      <label htmlFor="co-zone">Delivery area</label>
                      <select
                        id="co-zone"
                        value={zoneId}
                        onChange={(e) => setZoneId(e.target.value)}
                        aria-invalid={!!errors.zone}
                        aria-describedby={errors.zone ? "co-zone-error" : undefined}
                      >
                        <option value="">Choose your area…</option>
                        {zones.map((z) => (
                          <option key={z.id} value={z.id}>
                            {z.name} — {Number(z.fee) > 0 ? formatRWF(z.fee) : "Free"}
                          </option>
                        ))}
                      </select>
                      {errors.zone && (
                        <p className="checkout-field-error" id="co-zone-error">
                          {errors.zone}
                        </p>
                      )}
                    </div>
                  )}

                  {savedAddresses.length > 0 && (
                    <fieldset className="checkout-payment-options checkout-saved-addresses">
                      <legend>Deliver to</legend>
                      {savedAddresses.map((a) => (
                        <label key={a.id} className={`checkout-payment-option ${addressChoice === a.id ? "selected" : ""}`}>
                          <input
                            type="radio"
                            name="saved-address"
                            checked={addressChoice === a.id}
                            onChange={() => chooseAddress(a.id)}
                          />
                          <span>
                            <strong>
                              {a.line1}
                              {a.isDefault ? " (default)" : ""}
                            </strong>
                            <small>{[a.line2, a.city, a.state, a.country].filter(Boolean).join(", ")}</small>
                          </span>
                        </label>
                      ))}
                      <label className={`checkout-payment-option ${addressChoice === "new" ? "selected" : ""}`}>
                        <input
                          type="radio"
                          name="saved-address"
                          checked={addressChoice === "new"}
                          onChange={() => chooseAddress("new")}
                        />
                        <span>
                          <strong>A different address</strong>
                          <small>Enter a new delivery address below.</small>
                        </span>
                      </label>
                    </fieldset>
                  )}

                  <div className="checkout-field">
                    <label htmlFor="co-line1">Address</label>
                    <input
                      id="co-line1"
                      value={deliveryInfo.line1}
                      onChange={(e) => updateDelivery("line1", e.target.value)}
                      aria-invalid={!!errors.line1}
                      aria-describedby={errors.line1 ? "co-line1-error" : undefined}
                    />
                    {errors.line1 && (
                      <p className="checkout-field-error" id="co-line1-error">
                        {errors.line1}
                      </p>
                    )}
                  </div>

                  <div className="checkout-field">
                    <label htmlFor="co-line2">Apartment, suite, etc. (optional)</label>
                    <input id="co-line2" value={deliveryInfo.line2} onChange={(e) => updateDelivery("line2", e.target.value)} />
                  </div>

                  <div className="checkout-field-row">
                    <div className="checkout-field">
                      <label htmlFor="co-city">City / District</label>
                      <input
                        id="co-city"
                        value={deliveryInfo.city}
                        onChange={(e) => updateDelivery("city", e.target.value)}
                        aria-invalid={!!errors.city}
                        aria-describedby={errors.city ? "co-city-error" : undefined}
                      />
                      {errors.city && (
                        <p className="checkout-field-error" id="co-city-error">
                          {errors.city}
                        </p>
                      )}
                    </div>

                    <div className="checkout-field">
                      <label htmlFor="co-state">Province</label>
                      <input
                        id="co-state"
                        value={deliveryInfo.state}
                        onChange={(e) => updateDelivery("state", e.target.value)}
                        aria-invalid={!!errors.state}
                        aria-describedby={errors.state ? "co-state-error" : undefined}
                      />
                      {errors.state && (
                        <p className="checkout-field-error" id="co-state-error">
                          {errors.state}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="checkout-field-row">
                    <div className="checkout-field">
                      <label htmlFor="co-postal">Postal code (optional)</label>
                      <input id="co-postal" value={deliveryInfo.postalCode} onChange={(e) => updateDelivery("postalCode", e.target.value)} />
                    </div>

                    <div className="checkout-field">
                      <label htmlFor="co-country">Country</label>
                      <input
                        id="co-country"
                        value={deliveryInfo.country}
                        onChange={(e) => updateDelivery("country", e.target.value)}
                        aria-invalid={!!errors.country}
                        aria-describedby={errors.country ? "co-country-error" : undefined}
                      />
                      {errors.country && (
                        <p className="checkout-field-error" id="co-country-error">
                          {errors.country}
                        </p>
                      )}
                    </div>
                  </div>

                  {addressChoice === "new" && (
                    <label className="checkout-save-address">
                      <input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} />
                      Save this address for next time
                    </label>
                  )}

                  <div className="checkout-step-actions">
                    <button type="button" className="btn btn-outline" onClick={goBack}>
                      Back
                    </button>
                    <button type="button" className="btn btn-primary" onClick={goNext}>
                      Continue to Payment
                    </button>
                  </div>
                </section>
              )}

              {step === 2 && (
                <section className="checkout-step-panel">
                  <h2>Payment</h2>

                  <div className="checkout-review">
                    <div className="checkout-review-block">
                      <h3>Customer</h3>
                      <p>{customerInfo.name}</p>
                      <p>{customerInfo.email}</p>
                      <p>{customerInfo.phone}</p>
                    </div>
                    <div className="checkout-review-block">
                      <h3>Delivery</h3>
                      <p>
                        {deliveryInfo.line1}
                        {deliveryInfo.line2 ? `, ${deliveryInfo.line2}` : ""}
                      </p>
                      <p>
                        {deliveryInfo.city}, {deliveryInfo.state} {deliveryInfo.postalCode}
                      </p>
                      <p>{deliveryInfo.country}</p>
                      {selectedZone && <p>Area: {selectedZone.name}</p>}
                    </div>
                  </div>

                  <fieldset className="checkout-payment-options">
                    <legend>Payment method</legend>
                    {PAYMENT_OPTIONS.map((opt) => (
                      <label
                        key={opt.value}
                        className={`checkout-payment-option ${paymentMethod === opt.value ? "selected" : ""}`}
                      >
                        <input
                          type="radio"
                          name="payment-method"
                          value={opt.value}
                          checked={paymentMethod === opt.value}
                          onChange={() => setPaymentMethod(opt.value)}
                          // Once a Paystack order exists, retries must reuse it
                          disabled={isProcessing || !!order}
                        />
                        <span>
                          <strong>{opt.title}</strong>
                          <small>{opt.detail}</small>
                        </span>
                      </label>
                    ))}
                  </fieldset>

                  {hasBlockingIssue && (
                    <p className="checkout-payment-message error" role="status" aria-live="polite">
                      Some items in your cart are no longer available in the requested quantity. Please
                      return to your cart to update it before paying.
                    </p>
                  )}

                  <button
                    type="button"
                    className="btn btn-primary checkout-pay-btn"
                    disabled={isProcessing || hasBlockingIssue}
                    onClick={handlePlaceOrder}
                  >
                    {payButtonLabel}
                  </button>

                  {(paymentState === "cancelled" || paymentState === "failed" || hasBlockingIssue) && (
                    <button type="button" className="btn btn-outline checkout-return-btn" onClick={() => navigate("/cart")}>
                      Return to Cart
                    </button>
                  )}

                  {paymentMessage && (
                    <p
                      className={`checkout-payment-message ${
                        paymentState === "failed" || paymentState === "cancelled" ? "error" : ""
                      }`}
                      role="status"
                      aria-live="polite"
                    >
                      {paymentMessage}
                    </p>
                  )}

                  <div className="checkout-step-actions">
                    <button type="button" className="btn btn-outline" onClick={goBack} disabled={isProcessing}>
                      Back
                    </button>
                  </div>
                </section>
              )}
            </div>

            <aside className="checkout-summary">
              <h2>Order Summary</h2>
              <ul className="checkout-summary-items">
                {items.map((i) => {
                  const product = liveProductsById[i.productId];
                  const unitPrice = product && !product.unavailable ? Number(product.price) : Number(i.price);
                  return (
                    <li key={i.productId}>
                      <span>
                        {i.name} <em>×{i.quantity}</em>
                      </span>
                      <span>{formatRWF(unitPrice * i.quantity)}</span>
                    </li>
                  );
                })}
              </ul>
              <div className="checkout-summary-row">
                <span>Subtotal</span>
                <span>{formatRWF(subtotal)}</span>
              </div>
              <div className="checkout-summary-row checkout-summary-delivery">
                <span>Delivery</span>
                <span>
                  {zones.length === 0
                    ? "Free"
                    : !selectedZone
                    ? "Choose an area"
                    : deliveryFee > 0
                    ? formatRWF(deliveryFee)
                    : "Free"}
                </span>
              </div>
              <div className="checkout-summary-row checkout-summary-total">
                <span>Total</span>
                <span className="price">{formatRWF(total)}</span>
              </div>
            </aside>
          </div>
        </>
      )}

      {step === 3 && confirmedOrder && (
        <div className="checkout-confirmation">
          <span className="checkout-confirmation-icon">
            <CheckCircleIcon />
          </span>
          <h1>Order Confirmed</h1>
          <p>Thank you for shopping with FK Trading.</p>

          <div className="confirmation-details">
            <div>
              <span>Order</span>
              <strong>#FK-{confirmedOrder.id.slice(0, 8).toUpperCase()}</strong>
            </div>
            <div>
              <span>Total</span>
              <strong className="price">{formatRWF(confirmedOrder.total)}</strong>
            </div>
            <div>
              <span>Payment</span>
              <strong>
                {confirmedOrder.paid
                  ? "Paid"
                  : confirmedOrder.paymentMethod === "CASH_ON_DELIVERY"
                  ? "Cash on delivery"
                  : "Pending"}
              </strong>
            </div>
            <div>
              <span>Status</span>
              <strong>{confirmedOrder.status}</strong>
            </div>
          </div>

          <div className="confirmation-delivery">
            <h3>Delivery to</h3>
            <p>
              {deliveryInfo.line1}
              {deliveryInfo.line2 ? `, ${deliveryInfo.line2}` : ""}
              <br />
              {deliveryInfo.city}, {deliveryInfo.state} {deliveryInfo.postalCode}
              <br />
              {deliveryInfo.country}
            </p>
          </div>

          <div className="confirmation-actions">
            <Link to="/orders" className="btn btn-primary">
              View Orders
            </Link>
            <Link to="/" className="btn btn-outline">
              Continue Shopping
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
