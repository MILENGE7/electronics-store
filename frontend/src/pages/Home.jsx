import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import { formatRWF } from "../utils/currency";
import Hero from "../components/Hero";
import "./Home.css";

export default function Home() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.get("/products", { params: { search } }).then((res) => setProducts(res.data.products));
  }, [search]);

  return (
    <div>
      <Hero />

      <section id="catalog" className="page-main">
        <div className="catalog-header">
          <h2>Catalog</h2>
          <input
            className="catalog-search"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {products.length === 0 && (
          <p className="catalog-empty">Nothing here yet — check back soon, or add products from the Admin dashboard.</p>
        )}

        <div className="product-grid">
          {products.map((p) => (
            <Link key={p.id} to={`/products/${p.id}`} className="product-card">
              <div className="product-card-image">
                {p.images?.[0] ? <img src={p.images[0]} alt={p.name} /> : <span className="product-card-placeholder">{p.name.slice(0, 1)}</span>}
              </div>
              <div className="product-card-body">
                <p className="product-card-brand">{p.brand || p.category?.name}</p>
                <h3 className="product-card-name">{p.name}</h3>
                <p className="price product-card-price">{formatRWF(p.price)}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
