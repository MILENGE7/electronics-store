import { Link } from "react-router-dom";
import "./Hero.css";

function LaptopIcon() {
  return (
    <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="4" y="4" width="16" height="11" rx="1.2" />
      <path d="M2 19h20l-1.6-3H3.6L2 19z" strokeLinejoin="round" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="7" y="2" width="10" height="20" rx="2" />
      <path d="M11 18h2" strokeLinecap="round" />
    </svg>
  );
}

function HeadphoneIcon() {
  return (
    <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 13v-1a8 8 0 0 1 16 0v1" strokeLinecap="round" />
      <rect x="2.5" y="13" width="5" height="7" rx="1.6" />
      <rect x="16.5" y="13" width="5" height="7" rx="1.6" />
    </svg>
  );
}

function WatchIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="7" y="7" width="10" height="10" rx="2.4" />
      <path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3M9 17v3a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-3" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" strokeLinejoin="round" />
      <circle cx="12" cy="13" r="3.6" />
    </svg>
  );
}

function BadgeShieldIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M12 3l8 3v5c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6z" />
      <path d="M8.5 12l2.2 2.2 4.8-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BadgeTagIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M20 12.5L12.5 20a1.5 1.5 0 0 1-2.1 0l-6.4-6.4a1.5 1.5 0 0 1 0-2.1L11.5 4H19a1 1 0 0 1 1 1v7.5z" strokeLinejoin="round" />
      <circle cx="15.5" cy="8.5" r="1.5" />
    </svg>
  );
}

function BadgeTruckIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M3 6h11v11H3z" />
      <path d="M14 10h4l3 3v4h-7z" />
      <circle cx="7" cy="19" r="2" />
      <circle cx="18" cy="19" r="2" />
    </svg>
  );
}

export default function Hero() {
  return (
    <section className="hero">
      <div className="hero-inner">
        <div className="hero-copy">
          <p className="hero-eyebrow">FK TRADING</p>

          <h1>
            YOUR TECH.
            <br />
            YOUR <span>WORLD.</span>
          </h1>

          <p className="hero-description">
            Discover premium electronics, smart devices and
            accessories carefully selected for modern life.
          </p>

          <div className="hero-buttons">
            <a href="#catalog" className="hero-btn hero-btn-primary">
              Shop Now
              <span>→</span>
            </a>

            <Link to="/" className="hero-btn hero-btn-outline">
              Explore Products
            </Link>
          </div>

          <div className="hero-features">
            <div>
              <BadgeShieldIcon />
              <div>
                <strong>100% Authentic</strong>
                <span>Genuine products</span>
              </div>
            </div>

            <div>
              <BadgeTagIcon />
              <div>
                <strong>Best Prices</strong>
                <span>Great value always</span>
              </div>
            </div>

            <div>
              <BadgeTruckIcon />
              <div>
                <strong>Fast Delivery</strong>
                <span>Across Rwanda</span>
              </div>
            </div>
          </div>
        </div>

        <div className="hero-visual" aria-hidden="true">
          <div className="hero-glow hero-glow-a" />
          <div className="hero-glow hero-glow-b" />
          <div className="hero-grid" />

          <div className="hero-chip hero-chip-laptop">
            <LaptopIcon />
            <span>Laptops</span>
          </div>

          <div className="hero-chip hero-chip-phone">
            <PhoneIcon />
            <span>Phones</span>
          </div>

          <div className="hero-chip hero-chip-headphones">
            <HeadphoneIcon />
            <span>Audio</span>
          </div>

          <div className="hero-chip hero-chip-watch">
            <WatchIcon />
            <span>Wearables</span>
          </div>

          <div className="hero-chip hero-chip-camera">
            <CameraIcon />
            <span>Cameras</span>
          </div>
        </div>
      </div>
    </section>
  );
}
