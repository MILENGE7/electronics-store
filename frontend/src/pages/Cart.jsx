import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/client";
import { useCart } from "../context/CartContext";
import { formatRWF } from "../utils/currency";
import { formatBrandName, formatProductName } from "../utils/format";
import QuantityStepper from "../components/QuantityStepper";
import "./Cart.css";

function CartIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path
        d="M3 4h2l2.4 12.2a2 2 0 0 0 2 1.6h8a2 2 0 0 0 2-1.6L21 8H6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="21" r="1.3" />
      <circle cx="18" cy="21" r="1.3" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m3 0-.8 12a2 2 0 0 1-2 1.8H8.8a2 2 0 0 1-2-1.8L6 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CartRowSkeleton() {
  return (
    <div className="cart-item skeleton-card" aria-hidden="true">
      <div className="skeleton-shimmer" style={{ width: 76, height: 76, borderRadius: 10, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <span className="skeleton-line skeleton-shimmer" style={{ width: "30%", height: 10, display: "block" }} />
        <span className="skeleton-line skeleton-shimmer" style={{ width: "55%", height: 15, display: "block", marginTop: 10 }} />
      </div>
      <span className="skeleton-shimmer" style={{ width: 96, height: 34, borderRadius: 9 }} />
      <span className="skeleton-line skeleton-shimmer" style={{ width: 70, height: 15 }} />
    </div>
  );
}

export default function Cart() {
  const { items, removeItem, updateQuantity } = useCart();
  const navigate = useNavigate();

  const [productsById, setProductsById] = useState({});
  const [loadingCart, setLoadingCart] = useState(true);
  const [cartError, setCartError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const productIdsKey = items.map((i) => i.productId).join(",");

  useEffect(() => {
    if (items.length === 0) {
      setProductsById({});
      setLoadingCart(false);
      return;
    }
    setLoadingCart(true);
    setCartError(false);

    Promise.all(
      items.map((i) =>
        api
          .get(`/products/${i.productId}`)
          .then((res) => [i.productId, { ...res.data, unavailable: false }])
          .catch(() => [i.productId, { id: i.productId, unavailable: true }])
      )
    )
      .then((pairs) => setProductsById(Object.fromEntries(pairs)))
      .catch(() => setCartError(true))
      .finally(() => setLoadingCart(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productIdsKey, retryKey]);

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => {
      const product = productsById[item.productId];
      const unitPrice = product && !product.unavailable ? Number(product.price) : Number(item.price);
      return sum + unitPrice * item.quantity;
    }, 0);
  }, [items, productsById]);

  // Anything that would make the order backend reject checkout (deleted
  // product, no stock, quantity above stock) blocks the checkout button —
  // the exact issue is also surfaced inline on the affected row.
  const blockingIssues = useMemo(() => {
    if (loadingCart) return [];
    return items.filter((item) => {
      const product = productsById[item.productId];
      if (!product || product.unavailable) return true;
      if (product.stock <= 0) return true;
      if (item.quantity > product.stock) return true;
      return false;
    });
  }, [items, productsById, loadingCart]);

  function handleQtyChange(item, product, nextQty) {
    const ceiling = product && !product.unavailable ? product.stock : item.quantity;
    updateQuantity(item.productId, Math.max(1, Math.min(nextQty, ceiling)));
  }

  if (items.length === 0) {
    return (
      <div className="page-main">
        <div className="cart-empty">
          <span className="cart-empty-icon">
            <CartIcon />
          </span>
          <h1>Your cart is empty</h1>
          <p>Find something you'll love from FK Trading.</p>
          <Link to="/" className="btn btn-primary">
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-main cart-page">
      <h1 className="cart-title">Your Cart</h1>

      {cartError ? (
        <div className="state-error">
          <p>Unable to update your cart.</p>
          <button type="button" className="btn btn-outline" onClick={() => setRetryKey((k) => k + 1)}>
            Try Again
          </button>
        </div>
      ) : (
        <div className="cart-layout">
          <div className="cart-items">
            <div className="cart-items-head">
              <span>Product</span>
              <span>Quantity</span>
              <span>Price</span>
              <span>Total</span>
              <span aria-hidden="true" />
            </div>

            {loadingCart ? (
              <>
                <CartRowSkeleton />
                <CartRowSkeleton />
              </>
            ) : (
              items.map((item) => {
                const product = productsById[item.productId];
                const unavailable = !product || product.unavailable;
                const outOfStock = !unavailable && product.stock <= 0;
                const overStock = !unavailable && !outOfStock && item.quantity > product.stock;
                const displayName = unavailable ? item.name : formatProductName(product.name);
                const unitPrice = unavailable ? Number(item.price) : Number(product.price);
                const brand = !unavailable && product.brand ? formatBrandName(product.brand) : "";

                return (
                  <div className={`cart-item ${unavailable || outOfStock ? "cart-item-issue" : ""}`} key={item.productId}>
                    <div className="cart-item-product">
                      <div className="cart-item-image">
                        {!unavailable && product.images?.[0] ? (
                          <img src={product.images[0]} alt={displayName} />
                        ) : (
                          <span className="product-card-placeholder">{displayName.slice(0, 1)}</span>
                        )}
                      </div>
                      <div className="cart-item-info">
                        {brand && <p className="cart-item-brand">{brand}</p>}
                        {unavailable ? (
                          <p className="cart-item-name">{displayName}</p>
                        ) : (
                          <Link to={`/products/${item.productId}`} className="cart-item-name">
                            {displayName}
                          </Link>
                        )}

                        {unavailable && <p className="cart-item-warning">This product is no longer available.</p>}
                        {outOfStock && <p className="cart-item-warning">This item is currently out of stock.</p>}
                        {overStock && <p className="cart-item-warning">Only {product.stock} available — please adjust the quantity.</p>}
                      </div>
                    </div>

                    <div className="cart-item-qty" data-label="Quantity">
                      <QuantityStepper
                        value={item.quantity}
                        max={unavailable ? undefined : product.stock}
                        onChange={(next) => handleQtyChange(item, product, next)}
                        disabled={unavailable || outOfStock}
                        label={`Quantity for ${displayName}`}
                      />
                    </div>

                    <div className="cart-item-price" data-label="Price">
                      {formatRWF(unitPrice)}
                    </div>

                    <div className="cart-item-total price" data-label="Total">
                      {formatRWF(unitPrice * item.quantity)}
                    </div>

                    <button
                      type="button"
                      className="cart-item-remove"
                      onClick={() => removeItem(item.productId)}
                      aria-label={`Remove ${displayName} from cart`}
                    >
                      <TrashIcon />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          <aside className="cart-summary">
            <h2>Order Summary</h2>

            <div className="cart-summary-row">
              <span>Subtotal</span>
              <span>{formatRWF(subtotal)}</span>
            </div>

            <div className="cart-summary-row cart-summary-delivery">
              <span>Delivery</span>
              <span>Calculated at checkout</span>
            </div>

            <div className="cart-summary-row cart-summary-total">
              <span>Total</span>
              <span className="price">{formatRWF(subtotal)}</span>
            </div>

            {blockingIssues.length > 0 && (
              <p className="cart-summary-warning">Some items in your cart need attention before checkout.</p>
            )}

            <button
              type="button"
              className="btn btn-primary cart-checkout-btn"
              disabled={loadingCart || blockingIssues.length > 0}
              onClick={() => navigate("/checkout")}
            >
              Proceed to Checkout
            </button>

            <Link to="/" className="cart-continue-link">
              Continue Shopping
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}
