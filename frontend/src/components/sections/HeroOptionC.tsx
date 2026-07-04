"use client";

/**
 * OPTION C: Full Overlap
 * - Image breaks out of its grid column, overlapping into the left text area
 * - Creates a dynamic, editorial composition with depth layers
 * - Image sits behind text slightly for a cinematic feel
 */

import Image from "next/image";
import { ArrowRight, Sparkles, Package, Truck, ChevronDown, Star, Users } from "lucide-react";

export default function HeroOptionC() {
  return (
    <section
      style={{
        backgroundColor: "#FFF8F3",
        paddingTop: 72,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute", inset: 0,
          background: `
            radial-gradient(ellipse 80% 60% at 10% 20%, rgba(246,180,154,0.07) 0%, transparent 50%),
            radial-gradient(ellipse 60% 80% at 85% 70%, rgba(233,152,122,0.05) 0%, transparent 50%)
          `,
          pointerEvents: "none",
        }}
      />

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 28px", position: "relative" }}>
        <div
          style={{
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0,
            alignItems: "center", minHeight: "calc(100vh - 72px - 80px)",
            position: "relative",
          }}
          className="hero-grid"
        >
          {/* LEFT SIDE — higher z-index so text stays on top */}
          <div className="hero-left" style={{ position: "relative", zIndex: 3 }}>
            <div className="hero-fade hero-fade-1" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 50, backgroundColor: "rgba(246,180,154,0.08)", border: "1px solid rgba(246,180,154,0.18)", marginBottom: 24, backdropFilter: "blur(8px)" }}>
              <Sparkles size={13} color="#E9987A" strokeWidth={2} />
              <span style={{ fontSize: 11.5, fontWeight: 600, color: "#E9987A", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "var(--font-poppins), 'Poppins', sans-serif" }}>Premium Custom Apparel</span>
            </div>

            <h1 className="hero-heading hero-fade hero-fade-2" style={{ fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif", fontSize: 62, fontWeight: 700, lineHeight: 1.08, letterSpacing: "-0.02em", color: "#1F2937", marginBottom: 20 }}>
              Your Design,<br />
              <span style={{ color: "#E9987A", position: "relative", display: "inline-block" }}>
                Our Quality.
                <svg style={{ position: "absolute", bottom: -4, left: 0, width: "100%", height: 8, overflow: "visible" }} viewBox="0 0 200 8" preserveAspectRatio="none">
                  <path d="M0 6 Q50 0 100 5 Q150 10 200 4" fill="none" stroke="rgba(233,152,122,0.3)" strokeWidth="2.5" strokeLinecap="round" className="hero-underline" />
                </svg>
              </span>
            </h1>

            <p className="hero-fade hero-fade-3" style={{ color: "#6B7280", fontSize: 16, lineHeight: 1.75, maxWidth: 440, marginBottom: 36, fontFamily: "var(--font-poppins), 'Poppins', sans-serif" }}>
              Create custom T-shirts, hoodies and more with premium printing and embroidery.
            </p>

            <div className="hero-fade hero-fade-4" style={{ display: "flex", gap: 14, marginBottom: 36 }}>
              <button className="hero-btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "15px 30px", backgroundColor: "#E9987A", color: "#fff", fontSize: 14.5, fontWeight: 600, borderRadius: 14, border: "none", cursor: "pointer", fontFamily: "var(--font-poppins), 'Poppins', sans-serif", boxShadow: "0 8px 28px rgba(233,152,122,0.35)", transition: "all 0.35s cubic-bezier(0.22, 1, 0.36, 1)" }}>
                Design Now <ArrowRight size={15} className="hero-btn-arrow" />
              </button>
              <button className="hero-btn-secondary" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "15px 30px", backgroundColor: "rgba(255,255,255,0.85)", color: "#1F2937", fontSize: 14.5, fontWeight: 600, borderRadius: 14, border: "1.5px solid #F1E5DC", cursor: "pointer", fontFamily: "var(--font-poppins), 'Poppins', sans-serif", transition: "all 0.35s cubic-bezier(0.22, 1, 0.36, 1)", backdropFilter: "blur(4px)" }}>
                Shop Collection
              </button>
            </div>

            <div className="hero-fade hero-fade-45" style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "center" }}>
                {["#E9987A", "#F6B49A", "#D4836A", "#C7725E"].map((color, i) => (
                  <div key={i} style={{ width: 34, height: 34, borderRadius: "50%", background: `linear-gradient(135deg, ${color}, ${color}dd)`, border: "2.5px solid #FFF8F3", marginLeft: i > 0 ? -10 : 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 4 - i, position: "relative" }}>
                    <Users size={14} color="#fff" strokeWidth={2} />
                  </div>
                ))}
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
                  {[1, 2, 3, 4, 5].map((s) => (<Star key={s} size={12} fill="#F6B49A" color="#F6B49A" strokeWidth={0} />))}
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#E9987A", marginLeft: 4, fontFamily: "var(--font-poppins), 'Poppins', sans-serif" }}>4.9</span>
                </div>
                <p style={{ fontSize: 12.5, color: "#6B7280", margin: 0, fontFamily: "var(--font-poppins), 'Poppins', sans-serif" }}>
                  <span style={{ fontWeight: 700, color: "#1F2937" }}>500+</span> Happy Customers
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE — Option C: Overlaps into left column */}
          <div
            className="hero-fade hero-fade-img hero-right"
            style={{
              position: "absolute",
              right: 0,
              top: "50%",
              transform: "translateY(-50%)",
              width: "58%",
              zIndex: 1,
            }}
          >
            <div
              className="hero-image"
              style={{
                position: "relative",
                width: "100%",
                WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 15%, black 100%)",
                maskImage: "linear-gradient(to right, transparent 0%, black 15%, black 100%)",
              }}
            >
              <Image
                src="/images/hero/hero-hoodie-rack.png"
                alt="Premium hoodie on wooden rack with plant"
                width={1402}
                height={1122}
                priority
                style={{ width: "100%", height: "auto", display: "block" }}
              />
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="hero-scroll-indicator" style={{ position: "absolute", bottom: 28, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: "pointer", zIndex: 10 }} onClick={() => window.scrollTo({ top: window.innerHeight, behavior: "smooth" })}>
          <span style={{ fontSize: 10, fontWeight: 600, color: "#9CA3AF", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "var(--font-poppins), 'Poppins', sans-serif" }}>Scroll</span>
          <div className="hero-scroll-arrow" style={{ width: 28, height: 28, borderRadius: "50%", border: "1.5px solid rgba(233,152,122,0.3)", display: "flex", alignItems: "center", justifyContent: "center", color: "#E9987A" }}>
            <ChevronDown size={14} strokeWidth={2} />
          </div>
        </div>
      </div>

      {/* Trust strip */}
      <div className="hero-fade hero-fade-5" style={{ borderTop: "1px solid rgba(241,229,220,0.5)", backgroundColor: "rgba(255,255,255,0.5)", backdropFilter: "blur(8px)", position: "relative", zIndex: 4 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 28px", display: "flex", alignItems: "center", justifyContent: "center" }} className="hero-trust-strip">
          {[
            { icon: Sparkles, title: "Premium Quality", desc: "Soft & Durable Fabric" },
            { icon: Package, title: "No Minimum Order", desc: "Order Any Quantity" },
            { icon: Truck, title: "Fast & Reliable", desc: "Delivery On Time" },
          ].map((badge, i) => (
            <div key={badge.title} className="hero-trust-badge" style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, justifyContent: "center", padding: "0 24px", borderLeft: i > 0 ? "1px solid rgba(241,229,220,0.5)" : "none" }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(246,180,154,0.08)", border: "1px solid rgba(246,180,154,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.3s ease" }}>
                <badge.icon size={18} color="#E9987A" strokeWidth={1.5} />
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#1F2937", margin: 0, fontFamily: "var(--font-poppins), 'Poppins', sans-serif" }}>{badge.title}</p>
                <p style={{ fontSize: 11.5, color: "#9CA3AF", margin: 0, fontFamily: "var(--font-poppins), 'Poppins', sans-serif" }}>{badge.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx global>{`
        .hero-fade { opacity: 0; transform: translateY(20px); animation: heroFadeIn 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        .hero-fade-1 { animation-delay: 0.1s; } .hero-fade-2 { animation-delay: 0.2s; }
        .hero-fade-3 { animation-delay: 0.35s; } .hero-fade-4 { animation-delay: 0.5s; }
        .hero-fade-45 { animation-delay: 0.6s; } .hero-fade-5 { animation-delay: 0.75s; }
        .hero-fade-img { opacity: 0; animation: heroImgIn 1s cubic-bezier(0.22, 1, 0.36, 1) 0.3s forwards; }
        @keyframes heroFadeIn { to { opacity: 1; transform: translateY(0); } }
        @keyframes heroImgIn { to { opacity: 1; transform: translateY(-50%) scale(1); } }
        .hero-underline { stroke-dasharray: 220; stroke-dashoffset: 220; animation: drawLine 1s ease 0.8s forwards; }
        @keyframes drawLine { to { stroke-dashoffset: 0; } }
        .hero-image { animation: heroFloat 5s ease-in-out infinite; }
        @keyframes heroFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        .hero-scroll-indicator { opacity: 0; animation: heroFadeIn 0.6s ease 1.2s forwards; }
        .hero-scroll-arrow { animation: scrollBounce 2s ease-in-out infinite; }
        @keyframes scrollBounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(4px); } }
        .hero-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 36px rgba(233,152,122,0.4) !important; }
        .hero-btn-primary:hover .hero-btn-arrow { transform: translateX(3px); transition: transform 0.3s ease; }
        .hero-btn-secondary:hover { transform: translateY(-2px); border-color: #E9987A !important; color: #E9987A !important; }
        .hero-trust-badge:hover div:first-child { background-color: rgba(246,180,154,0.15) !important; transform: scale(1.08); }
        @media (max-width: 1024px) {
          .hero-grid { grid-template-columns: 1fr !important; text-align: center; gap: 24px !important; min-height: auto !important; padding: 48px 0; }
          .hero-left { display: flex; flex-direction: column; align-items: center; }
          .hero-right { position: relative !important; width: 100% !important; top: auto !important; transform: none !important; }
          .hero-right .hero-image { mask-image: none !important; -webkit-mask-image: none !important; }
          .hero-heading { font-size: 42px !important; }
          .hero-scroll-indicator { display: none !important; }
        }
        @media (max-width: 640px) {
          .hero-heading { font-size: 34px !important; }
          .hero-trust-strip { flex-direction: column !important; gap: 20px !important; }
          .hero-trust-badge { border-left: none !important; padding: 0 !important; }
        }
      `}</style>
    </section>
  );
}
