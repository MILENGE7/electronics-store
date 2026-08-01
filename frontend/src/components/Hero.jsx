import { Link } from "react-router-dom";
import "./Hero.css";

export default function Hero() {
  return (
    <section className="hero" style={{ backgroundImage: "url('/hero-flatlay.png')" }}>
      <div className="hero-overlay" />
      <div className="hero-inner">
        <p className="hero-eyebrow">FK Trading Limited</p>
        <h1 className="hero-headline">
          Order your favorite<br />electronic devices
        </h1>
        <p className="hero-sub">
          Our mission is to bring you the best quality electronics at prices
          that make sense — picked, priced, and shipped by a team that
          actually uses this stuff.
        </p>
        <div className="hero-cta-row">
          <a href="#catalog" className="btn btn-hero">Shop now</a>
        </div>
      </div>
    </section>
  );
}
