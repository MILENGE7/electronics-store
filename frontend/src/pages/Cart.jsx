import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { formatRWF } from "../utils/currency";

export default function Cart() {
  const { items, removeItem, updateQuantity, total } = useCart();

  if (!items.length) {
    return (
      <div className="page-main">
        <h1>Cart</h1>
        <p className="catalog-empty">Your cart is empty.</p>
        <Link to="/" className="btn btn-outline">Browse the catalog</Link>
      </div>
    );
  }

  return (
    <div className="page-main">
      <h1>Cart</h1>
      <div className="cart-list">
        {items.map((i) => (
          <div key={i.productId} className="cart-row">
            <span className="cart-row-name">{i.name}</span>
            <input
              type="number"
              min={1}
              value={i.quantity}
              onChange={(e) => updateQuantity(i.productId, Number(e.target.value))}
              className="cart-qty"
            />
            <span className="price">{formatRWF(i.price * i.quantity)}</span>
            <button className="btn btn-outline" onClick={() => removeItem(i.productId)}>Remove</button>
          </div>
        ))}
      </div>
      <div className="cart-total-row">
        <h3>Total: <span className="price">{formatRWF(total)}</span></h3>
        <Link to="/checkout" className="btn btn-primary">Proceed to checkout</Link>
      </div>
    </div>
  );
}
