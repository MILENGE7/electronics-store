import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/client";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { formatRWF } from "../utils/currency";
import ReviewForm from "../components/ReviewForm";

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const { addItem } = useCart();
  const { user } = useAuth();

  function loadProduct() {
    api.get(`/products/${id}`).then((res) => setProduct(res.data));
  }

  useEffect(loadProduct, [id]);

  if (!product) return <div className="page-main"><p>Loading...</p></div>;

  return (
    <div className="page-main">
      <div className="product-detail">
        <div className="product-detail-image">
          {product.images?.[0] ? <img src={product.images[0]} alt={product.name} /> : <span className="product-card-placeholder">{product.name.slice(0, 1)}</span>}
        </div>
        <div>
          <p className="product-detail-brand">{product.brand || product.category?.name}</p>
          <h1>{product.name}</h1>
          <p className="product-detail-price price">{formatRWF(product.price)}</p>
          <p style={{ color: "var(--silver)" }}>{product.description}</p>
          <p className="product-detail-stock">{product.stock} in stock</p>
          <button className="btn btn-primary" onClick={() => addItem(product)}>Add to cart</button>
        </div>
      </div>

      <section style={{ marginTop: "3rem", maxWidth: "600px" }}>
        <h3>Reviews</h3>
        {product.reviews.length === 0 && <p className="catalog-empty">No reviews yet.</p>}
        {product.reviews.map((r) => (
          <div key={r.id} className="review-row">
            <strong>{r.user.name}</strong> — {r.rating}/5
            <p style={{ margin: "0.3rem 0 0", color: "var(--silver)" }}>{r.comment}</p>
          </div>
        ))}

        {user ? (
          <div style={{ marginTop: "1.5rem" }}>
            <h4>Leave a review</h4>
            <ReviewForm productId={id} onSubmitted={loadProduct} />
          </div>
        ) : (
          <p className="catalog-empty" style={{ marginTop: "1.5rem" }}>
            Log in to leave a review (available after your order is delivered).
          </p>
        )}
      </section>
    </div>
  );
}
