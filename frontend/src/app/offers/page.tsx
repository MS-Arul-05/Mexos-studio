"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/sections/Footer";
import {
  ArrowRight,
  Zap,
  Clock,
  Tag,
  Sparkles,
  Gift,
  Percent,
  ShoppingBag,
  Copy,
  Check,
} from "lucide-react";

/* ── Isolated countdown component — only re-renders itself, not the whole page ── */
function CountdownDisplay({ targetDate }: { targetDate: Date }) {
  const [left, setLeft] = useState({ d: 0, h: 0, m: 0, s: 0 });
  useEffect(() => {
    const tick = () => {
      const diff = Math.max(0, targetDate.getTime() - Date.now());
      setLeft({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  const units = [
    { label: "Days", value: left.d },
    { label: "Hours", value: left.h },
    { label: "Mins", value: left.m },
    { label: "Secs", value: left.s },
  ];

  return (
    <div style={{ display: "flex", gap: 12 }}>
      {units.map((u) => (
        <div key={u.label} style={{ textAlign: "center" }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            backgroundColor: "rgba(233,152,122,0.08)", border: "1px solid rgba(233,152,122,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, fontWeight: 800, color: "#E9987A", fontFamily: "var(--font-poppins), sans-serif",
          }}>
            {String(u.value).padStart(2, "0")}
          </div>
          <span style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 500, fontFamily: "var(--font-poppins), sans-serif", marginTop: 4, display: "block" }}>
            {u.label}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── data ── */
const heroOffer = {
  tag: "Limited Time",
  title: "Summer Sale",
  highlight: "40% Off",
  description:
    "Get 40% off on all custom T-shirts and hoodies. Use code SUMMER40 at checkout. Valid on orders above ₹999.",
  code: "SUMMER40",
  validUntil: new Date(Date.now() + 3 * 86400000 + 7 * 3600000),
  cta: "Shop Now",
  ctaLink: "/shop",
};

const offers = [
  {
    id: 1,
    badge: "Hot Deal",
    badgeColor: "#E9987A",
    title: "Buy 2 Get 1 Free",
    subtitle: "On All Graphic Tees",
    description: "Mix and match any 3 graphic T-shirts from our collection. The lowest-priced item is free.",
    code: "B2G1FREE",
    validUntil: "15 July 2026",
    icon: Gift,
    bg: "linear-gradient(135deg, rgba(246,180,154,0.12) 0%, rgba(255,245,235,0.4) 100%)",
  },
  {
    id: 2,
    badge: "Bulk Savings",
    badgeColor: "#1F2937",
    title: "₹100 Off Per Piece",
    subtitle: "Orders of 50+ Units",
    description: "Corporate orders, event merch, or team jerseys — save ₹100 on every piece when you order 50 or more.",
    code: "BULK100",
    validUntil: "31 July 2026",
    icon: ShoppingBag,
    bg: "linear-gradient(135deg, rgba(31,41,55,0.04) 0%, rgba(246,180,154,0.08) 100%)",
  },
  {
    id: 3,
    badge: "New Customer",
    badgeColor: "#10B981",
    title: "Flat 25% Off",
    subtitle: "Your First Order",
    description: "Welcome to Mexos Studio! Enjoy 25% off your first purchase — no minimum order value required.",
    code: "WELCOME25",
    validUntil: "Ongoing",
    icon: Sparkles,
    bg: "linear-gradient(135deg, rgba(16,185,129,0.05) 0%, rgba(246,180,154,0.1) 100%)",
  },
  {
    id: 4,
    badge: "Combo",
    badgeColor: "#F59E0B",
    title: "Hoodie + Tee Combo",
    subtitle: "Save ₹500",
    description: "Bundle any hoodie with any T-shirt and save ₹500 instantly. Perfect for the complete custom look.",
    code: "COMBO500",
    validUntil: "20 July 2026",
    icon: Tag,
    bg: "linear-gradient(135deg, rgba(245,158,11,0.06) 0%, rgba(246,180,154,0.1) 100%)",
  },
];

/* ── component ── */
export default function OffersPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [heroVis, setHeroVis] = useState(false);
  const [gridVis, setGridVis] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    const obs = (
      el: HTMLElement | null,
      cb: (v: boolean) => void,
      t = 0.15
    ) => {
      if (!el) return;
      const o = new IntersectionObserver(
        ([e]) => {
          if (e.isIntersecting) {
            cb(true);
            o.disconnect();
          }
        },
        { threshold: t }
      );
      o.observe(el);
      return () => o.disconnect();
    };
    obs(heroRef.current, setHeroVis);
    obs(gridRef.current, setGridVis, 0.08);
  }, []);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <>
      <Navbar />
      <main style={{ backgroundColor: "#FFF8F3", paddingTop: 72 }}>
        {/* ════ HERO BANNER ════ */}
        <section
          ref={heroRef}
          style={{
            position: "relative",
            overflow: "hidden",
            background:
              "linear-gradient(135deg, #E9987A 0%, #F6B49A 40%, #FACBB5 100%)",
            padding: "80px 28px 88px",
          }}
        >
          {/* Decorative shapes */}
          <div
            style={{
              position: "absolute",
              top: -80,
              right: -80,
              width: 320,
              height: 320,
              borderRadius: "50%",
              border: "1px solid rgba(255,255,255,0.15)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: -60,
              left: -40,
              width: 200,
              height: 200,
              borderRadius: "50%",
              border: "1px solid rgba(255,255,255,0.1)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 60,
              left: "15%",
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: "rgba(255,255,255,0.25)",
              pointerEvents: "none",
            }}
            className="offer-dot-float"
          />

          <div
            style={{
              maxWidth: 1200,
              margin: "0 auto",
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: 48,
              alignItems: "center",
              position: "relative",
              zIndex: 1,
            }}
            className="offer-hero-grid"
          >
            {/* Left */}
            <div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 14px",
                  borderRadius: 50,
                  backgroundColor: "rgba(255,255,255,0.2)",
                  marginBottom: 20,
                  opacity: heroVis ? 1 : 0,
                  transform: heroVis ? "translateY(0)" : "translateY(14px)",
                  transition: "all 0.6s cubic-bezier(0.22,1,0.36,1) 0.1s",
                }}
              >
                <Zap size={12} color="#fff" />
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#fff",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    fontFamily: "var(--font-poppins), sans-serif",
                  }}
                >
                  {heroOffer.tag}
                </span>
              </div>

              <h1
                style={{
                  fontFamily:
                    "var(--font-playfair), 'Playfair Display', Georgia, serif",
                  fontSize: 58,
                  fontWeight: 700,
                  lineHeight: 1.08,
                  color: "#fff",
                  margin: "0 0 8px",
                  opacity: heroVis ? 1 : 0,
                  transform: heroVis ? "translateY(0)" : "translateY(18px)",
                  transition: "all 0.7s cubic-bezier(0.22,1,0.36,1) 0.2s",
                }}
                className="offer-hero-heading"
              >
                {heroOffer.title}
              </h1>

              <p
                style={{
                  fontFamily:
                    "var(--font-playfair), 'Playfair Display', Georgia, serif",
                  fontSize: 72,
                  fontWeight: 800,
                  lineHeight: 1,
                  color: "#fff",
                  margin: "0 0 20px",
                  textShadow: "0 4px 24px rgba(0,0,0,0.1)",
                  opacity: heroVis ? 1 : 0,
                  transform: heroVis
                    ? "translateY(0) scale(1)"
                    : "translateY(18px) scale(0.96)",
                  transition: "all 0.8s cubic-bezier(0.22,1,0.36,1) 0.3s",
                }}
                className="offer-hero-highlight"
              >
                {heroOffer.highlight}
              </p>

              <p
                style={{
                  fontSize: 15,
                  color: "rgba(255,255,255,0.85)",
                  lineHeight: 1.7,
                  maxWidth: 480,
                  margin: "0 0 28px",
                  fontFamily: "var(--font-poppins), sans-serif",
                  opacity: heroVis ? 1 : 0,
                  transform: heroVis ? "translateY(0)" : "translateY(14px)",
                  transition: "all 0.7s cubic-bezier(0.22,1,0.36,1) 0.4s",
                }}
              >
                {heroOffer.description}
              </p>

              {/* Coupon code chip */}
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 18px",
                  borderRadius: 12,
                  backgroundColor: "rgba(255,255,255,0.2)",
                  backdropFilter: "blur(8px)",
                  border: "1.5px dashed rgba(255,255,255,0.5)",
                  marginBottom: 28,
                  cursor: "pointer",
                  opacity: heroVis ? 1 : 0,
                  transform: heroVis ? "translateY(0)" : "translateY(14px)",
                  transition: "all 0.7s cubic-bezier(0.22,1,0.36,1) 0.5s",
                }}
                onClick={() => copyCode(heroOffer.code)}
              >
                <span
                  style={{
                    fontSize: 16,
                    fontWeight: 800,
                    color: "#fff",
                    letterSpacing: "0.15em",
                    fontFamily: "var(--font-poppins), sans-serif",
                  }}
                >
                  {heroOffer.code}
                </span>
                {copiedCode === heroOffer.code ? (
                  <Check size={14} color="#fff" />
                ) : (
                  <Copy size={14} color="rgba(255,255,255,0.7)" />
                )}
              </div>

              <div
                style={{
                  opacity: heroVis ? 1 : 0,
                  transform: heroVis ? "translateY(0)" : "translateY(14px)",
                  transition: "all 0.7s cubic-bezier(0.22,1,0.36,1) 0.55s",
                }}
              >
                <Link
                  href={heroOffer.ctaLink}
                  className="offer-hero-cta"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "16px 36px",
                    backgroundColor: "#fff",
                    color: "#E9987A",
                    fontSize: 15,
                    fontWeight: 700,
                    borderRadius: 14,
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "var(--font-poppins), sans-serif",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
                    transition: "all 0.35s cubic-bezier(0.22,1,0.36,1)",
                    textDecoration: "none",
                  }}
                >
                  {heroOffer.cta} <ArrowRight size={16} />
                </Link>
              </div>
            </div>

            {/* Right – Countdown */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 14,
                opacity: heroVis ? 1 : 0,
                transform: heroVis ? "translateY(0)" : "translateY(20px)",
                transition: "all 0.8s cubic-bezier(0.22,1,0.36,1) 0.5s",
              }}
              className="offer-countdown-wrap"
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 4,
                }}
              >
                <Clock size={14} color="rgba(255,255,255,0.8)" />
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.8)",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    fontFamily: "var(--font-poppins), sans-serif",
                  }}
                >
                  Ends In
                </span>
              </div>

              <CountdownDisplay targetDate={heroOffer.validUntil} />
            </div>
          </div>
        </section>

        {/* ════ OFFER GRID ════ */}
        <section style={{ padding: "80px 28px 100px" }}>
          <div
            style={{ maxWidth: 1200, margin: "0 auto" }}
            ref={gridRef}
          >
            <div
              style={{
                textAlign: "center",
                marginBottom: 52,
                opacity: gridVis ? 1 : 0,
                transform: gridVis ? "translateY(0)" : "translateY(18px)",
                transition: "all 0.7s cubic-bezier(0.22,1,0.36,1)",
              }}
            >
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#E9987A",
                  textTransform: "uppercase",
                  letterSpacing: 2,
                  margin: "0 0 8px",
                  fontFamily: "var(--font-poppins), sans-serif",
                }}
              >
                More Deals
              </p>
              <h2
                style={{
                  fontFamily:
                    "var(--font-playfair), 'Playfair Display', Georgia, serif",
                  fontSize: 36,
                  fontWeight: 700,
                  color: "#1F2937",
                  margin: 0,
                }}
              >
                Active Promotions
              </h2>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 22,
              }}
              className="offers-grid"
            >
              {offers.map((offer, i) => (
                <div
                  key={offer.id}
                  className="offer-card"
                  style={{
                    background: offer.bg,
                    borderRadius: 22,
                    border: "1px solid rgba(241,229,220,0.5)",
                    padding: "32px 30px",
                    position: "relative",
                    overflow: "hidden",
                    transition: "all 0.4s cubic-bezier(0.22,1,0.36,1)",
                    opacity: gridVis ? 1 : 0,
                    transform: gridVis ? "translateY(0)" : "translateY(24px)",
                    transitionDelay: `${0.1 + i * 0.1}s`,
                  }}
                >
                  {/* Badge */}
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      fontSize: 10,
                      fontWeight: 700,
                      color: "#fff",
                      backgroundColor: offer.badgeColor,
                      padding: "4px 12px",
                      borderRadius: 20,
                      fontFamily: "var(--font-poppins), sans-serif",
                      letterSpacing: 0.3,
                      marginBottom: 16,
                    }}
                  >
                    <Percent size={10} /> {offer.badge}
                  </span>

                  {/* Icon */}
                  <div
                    style={{
                      position: "absolute",
                      top: 28,
                      right: 28,
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      backgroundColor: "rgba(246,180,154,0.1)",
                      border: "1px solid rgba(246,180,154,0.12)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <offer.icon size={20} color="#E9987A" strokeWidth={1.5} />
                  </div>

                  <h3
                    style={{
                      fontFamily:
                        "var(--font-playfair), 'Playfair Display', serif",
                      fontSize: 26,
                      fontWeight: 700,
                      color: "#1F2937",
                      margin: "0 0 4px",
                      lineHeight: 1.2,
                    }}
                  >
                    {offer.title}
                  </h3>
                  <p
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "#E9987A",
                      margin: "0 0 12px",
                      fontFamily: "var(--font-poppins), sans-serif",
                    }}
                  >
                    {offer.subtitle}
                  </p>
                  <p
                    style={{
                      fontSize: 13.5,
                      color: "#6B7280",
                      lineHeight: 1.65,
                      margin: "0 0 20px",
                      maxWidth: 380,
                      fontFamily: "var(--font-poppins), sans-serif",
                    }}
                  >
                    {offer.description}
                  </p>

                  {/* Code + Valid */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                    }}
                  >
                    <div
                      className="offer-code-chip"
                      onClick={() => copyCode(offer.code)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "8px 16px",
                        borderRadius: 10,
                        border: "1.5px dashed rgba(233,152,122,0.4)",
                        backgroundColor: "rgba(255,255,255,0.7)",
                        cursor: "pointer",
                        transition: "all 0.3s ease",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: "#E9987A",
                          letterSpacing: "0.1em",
                          fontFamily: "var(--font-poppins), sans-serif",
                        }}
                      >
                        {offer.code}
                      </span>
                      {copiedCode === offer.code ? (
                        <Check size={13} color="#10B981" />
                      ) : (
                        <Copy size={13} color="#9CA3AF" />
                      )}
                    </div>
                    <span
                      style={{
                        fontSize: 11.5,
                        color: "#9CA3AF",
                        fontFamily: "var(--font-poppins), sans-serif",
                      }}
                    >
                      Valid: {offer.validUntil}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom CTA */}
            <div
              style={{
                textAlign: "center",
                marginTop: 52,
                opacity: gridVis ? 1 : 0,
                transform: gridVis ? "translateY(0)" : "translateY(14px)",
                transition: "all 0.7s cubic-bezier(0.22,1,0.36,1) 0.6s",
              }}
            >
              <Link
                href="/shop"
                className="offers-bottom-cta"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "15px 34px",
                  backgroundColor: "#E9987A",
                  color: "#fff",
                  fontSize: 14.5,
                  fontWeight: 600,
                  borderRadius: 14,
                  textDecoration: "none",
                  fontFamily: "var(--font-poppins), sans-serif",
                  boxShadow: "0 8px 28px rgba(233,152,122,0.35)",
                  transition: "all 0.35s cubic-bezier(0.22,1,0.36,1)",
                }}
              >
                Browse All Products <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />

      <style jsx global>{`
        .offer-dot-float {
          animation: floatDot 4s ease-in-out infinite;
        }
        @keyframes floatDot {
          0%,100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .offer-hero-cta:hover {
          transform: translateY(-2px) !important;
          box-shadow: 0 12px 40px rgba(0,0,0,0.15) !important;
        }
        .offer-card:hover {
          transform: translateY(-4px) !important;
          box-shadow: 0 16px 48px rgba(233,152,122,0.12);
          border-color: rgba(233,152,122,0.3) !important;
        }
        .offer-code-chip:hover {
          background-color: rgba(233,152,122,0.06) !important;
          border-color: rgba(233,152,122,0.6) !important;
        }
        .offers-bottom-cta:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 36px rgba(233,152,122,0.4) !important;
        }
        .countdown-block {
          transition: transform 0.3s ease;
        }
        .countdown-block:hover {
          transform: scale(1.06);
        }
        @media (max-width: 1024px) {
          .offer-hero-grid {
            grid-template-columns: 1fr !important;
            text-align: center;
          }
          .offer-countdown-wrap {
            margin-top: 16px;
          }
          .offer-hero-heading { font-size: 42px !important; }
          .offer-hero-highlight { font-size: 54px !important; }
        }
        @media (max-width: 768px) {
          .offers-grid {
            grid-template-columns: 1fr !important;
          }
          .offer-hero-heading { font-size: 34px !important; }
          .offer-hero-highlight { font-size: 42px !important; }
        }
        @media (max-width: 640px) {
          .offer-hero-heading { font-size: 28px !important; }
          .offer-hero-highlight { font-size: 34px !important; }
          .countdown-block { min-width: 48px !important; padding: 10px 8px !important; }
        }
        @media (max-width: 480px) {
          .offer-hero-heading { font-size: 24px !important; }
          .offer-hero-highlight { font-size: 28px !important; }
        }
      `}</style>
    </>
  );
}
