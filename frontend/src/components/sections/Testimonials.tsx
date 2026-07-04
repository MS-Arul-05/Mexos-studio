"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Star, Shield, RotateCcw, Headphones, ChevronLeft, ChevronRight, Quote } from "lucide-react";

const testimonials = [
  {
    quote: "Amazing quality and the print is perfect! Mexos Studio made our team event extra special. Will definitely order again.",
    name: "Priya Sharma",
    initials: "PS",
    role: "Verified Buyer",
    stars: 5,
    color: "#E9987A",
  },
  {
    quote: "Ordered 50 custom hoodies for our startup team. The quality exceeded our expectations and delivery was right on time.",
    name: "Arjun Menon",
    initials: "AM",
    role: "Startup Founder",
    stars: 5,
    color: "#D4836A",
  },
  {
    quote: "The customization options are incredible. I designed my own t-shirt and it came out exactly how I imagined. Love it!",
    name: "Sneha Reddy",
    initials: "SR",
    role: "Verified Buyer",
    stars: 5,
    color: "#C7725E",
  },
];

const trustBadges = [
  { icon: Star, title: "Premium Prints", desc: "Vibrant & Long Lasting" },
  { icon: Shield, title: "Secure Payment", desc: "100% Safe & Secure" },
  { icon: RotateCcw, title: "Easy Returns", desc: "Hassle Free Returns" },
  { icon: Headphones, title: "24/7 Support", desc: "We're Here to Help" },
];

export default function Testimonials() {
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const [active, setActive] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Auto-slide
  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setActive((prev) => (prev + 1) % testimonials.length);
    }, 5000);
  }, []);

  useEffect(() => {
    if (visible) resetTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [visible, resetTimer]);

  const goTo = (index: number) => {
    setActive(index);
    resetTimer();
  };

  const t = testimonials[active];

  return (
    <section ref={sectionRef} style={{ padding: "80px 0", backgroundColor: "#FFF8F3" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 28px" }}>
        {/* Section header */}
        <div
          style={{
            textAlign: "center",
            marginBottom: 40,
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(20px)",
            transition: "all 0.7s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          <p
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "#E9987A",
              textTransform: "uppercase",
              letterSpacing: 2,
              margin: "0 0 8px 0",
              fontFamily: "var(--font-poppins), 'Poppins', sans-serif",
            }}
          >
            Testimonials
          </p>
          <h2
            style={{
              fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif",
              fontSize: 36,
              fontWeight: 700,
              color: "#1F2937",
              margin: "0 0 12px",
            }}
          >
            What Our Customers Say
          </h2>
          <p
            style={{
              fontSize: 15,
              color: "#9CA3AF",
              margin: 0,
              fontFamily: "var(--font-poppins), 'Poppins', sans-serif",
              maxWidth: 400,
              marginLeft: "auto",
              marginRight: "auto",
              lineHeight: 1.6,
            }}
          >
            Real stories from real customers
          </p>
        </div>

        {/* Testimonial Card — full width */}
        <div
          style={{
            backgroundColor: "#fff",
            borderRadius: 28,
            border: "1px solid rgba(241,229,220,0.5)",
            padding: "40px 48px",
            marginBottom: 36,
            position: "relative",
            overflow: "hidden",
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(24px)",
            transition: "all 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.15s",
          }}
          className="testimonial-card"
        >
          {/* Background decorative quote */}
          <div
            style={{
              position: "absolute",
              top: -20,
              right: 40,
              fontSize: 220,
              lineHeight: 1,
              color: "rgba(233,152,122,0.03)",
              fontFamily: "Georgia, serif",
              pointerEvents: "none",
              userSelect: "none",
            }}
          >
            &rdquo;
          </div>

          {/* Decorative line accent */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: 4,
              height: "100%",
              background: `linear-gradient(180deg, ${t.color}, ${t.color}44)`,
              borderRadius: "0 4px 4px 0",
              transition: "background 0.5s ease",
            }}
          />

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              position: "relative",
              zIndex: 1,
            }}
          >
            {/* Quote icon */}
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: `linear-gradient(135deg, ${t.color}15, ${t.color}08)`,
                border: `1px solid ${t.color}15`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 20,
                transition: "all 0.5s ease",
              }}
            >
              <Quote size={22} color={t.color} strokeWidth={1.5} />
            </div>

            {/* Stars */}
            <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
              {Array.from({ length: t.stars }).map((_, i) => (
                <Star key={i} size={16} color="#FBBF24" fill="#FBBF24" />
              ))}
            </div>

            {/* Quote text */}
            <p
              key={active}
              className="testimonial-quote-text"
              style={{
                fontSize: 18,
                color: "#4B5563",
                lineHeight: 1.75,
                fontStyle: "italic",
                margin: "0 0 24px",
                fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif",
                maxWidth: 640,
                animation: "testimonialFadeIn 0.5s ease forwards",
              }}
            >
              &ldquo;{t.quote}&rdquo;
            </p>

            {/* Author */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  background: `linear-gradient(135deg, ${t.color}cc, ${t.color})`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: "var(--font-poppins), 'Poppins', sans-serif",
                  flexShrink: 0,
                  boxShadow: `0 4px 14px ${t.color}44`,
                  transition: "all 0.5s ease",
                }}
              >
                {t.initials}
              </div>
              <div style={{ textAlign: "left" }}>
                <p
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: "#1F2937",
                    margin: 0,
                    fontFamily: "var(--font-poppins), 'Poppins', sans-serif",
                  }}
                >
                  {t.name}
                </p>
                <p
                  style={{
                    fontSize: 12,
                    color: t.color,
                    margin: "2px 0 0 0",
                    fontWeight: 500,
                    fontFamily: "var(--font-poppins), 'Poppins', sans-serif",
                    transition: "color 0.5s ease",
                  }}
                >
                  {t.role}
                </p>
              </div>
            </div>

            {/* Navigation: arrows + dots */}
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <button
                onClick={() => goTo((active - 1 + testimonials.length) % testimonials.length)}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  border: "1px solid rgba(241,229,220,0.6)",
                  background: "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "#9CA3AF",
                  transition: "all 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
                }}
                className="testimonial-nav-btn"
              >
                <ChevronLeft size={16} />
              </button>

              {/* Dots */}
              <div style={{ display: "flex", gap: 6 }}>
                {testimonials.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goTo(i)}
                    style={{
                      width: i === active ? 24 : 8,
                      height: 8,
                      borderRadius: 10,
                      backgroundColor: i === active ? t.color : "#E5DDD6",
                      border: "none",
                      cursor: "pointer",
                      transition: "all 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
                      padding: 0,
                    }}
                  />
                ))}
              </div>

              <button
                onClick={() => goTo((active + 1) % testimonials.length)}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  border: "1px solid rgba(241,229,220,0.6)",
                  background: "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "#9CA3AF",
                  transition: "all 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
                }}
                className="testimonial-nav-btn"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Trust Badges */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 18,
          }}
          className="trust-grid"
        >
          {trustBadges.map((item, i) => (
            <div
              key={item.title}
              className="trust-badge"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                backgroundColor: "#fff",
                borderRadius: 18,
                padding: "20px 22px",
                border: "1px solid rgba(241,229,220,0.5)",
                transition: "all 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(20px)",
                transitionDelay: `${0.3 + i * 0.1}s`,
              }}
            >
              <div
                className="trust-badge-icon"
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 14,
                  backgroundColor: "rgba(246,180,154,0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "all 0.35s ease",
                }}
              >
                <item.icon size={20} color="#E9987A" strokeWidth={1.5} />
              </div>
              <div>
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#1F2937",
                    margin: 0,
                    fontFamily: "var(--font-poppins), 'Poppins', sans-serif",
                  }}
                >
                  {item.title}
                </p>
                <p
                  style={{
                    fontSize: 12,
                    color: "#9CA3AF",
                    margin: "2px 0 0 0",
                    fontFamily: "var(--font-poppins), 'Poppins', sans-serif",
                  }}
                >
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx global>{`
        @keyframes testimonialFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .testimonial-nav-btn:hover {
          border-color: #E9987A !important;
          color: #E9987A !important;
          background-color: rgba(233,152,122,0.04) !important;
          transform: scale(1.06);
        }
        .trust-badge:hover {
          border-color: rgba(233,152,122,0.3) !important;
          box-shadow: 0 8px 28px rgba(233,152,122,0.08);
          transform: translateY(-3px) !important;
        }
        .trust-badge:hover .trust-badge-icon {
          background-color: rgba(246,180,154,0.14) !important;
          transform: scale(1.06);
        }
        @media (max-width: 1024px) {
          .testimonial-card {
            padding: 28px 22px !important;
          }
          .trust-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 640px) {
          .trust-grid {
            grid-template-columns: 1fr !important;
          }
          .testimonial-quote-text {
            font-size: 17px !important;
          }
        }
      `}</style>
    </section>
  );
}
