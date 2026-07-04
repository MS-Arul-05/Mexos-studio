"use client";

import { useEffect, useRef, useState } from "react";
import { ShoppingBag, Palette, CreditCard, Truck } from "lucide-react";

const steps = [
  {
    icon: ShoppingBag,
    title: "Choose Product",
    desc: "Select your favorite product and size from our collection.",
    gradient: "linear-gradient(135deg, #F6B49A 0%, #E9987A 100%)",
  },
  {
    icon: Palette,
    title: "Customize Design",
    desc: "Upload your design, text, logo and choose colors.",
    gradient: "linear-gradient(135deg, #E9987A 0%, #D4836A 100%)",
  },
  {
    icon: CreditCard,
    title: "Place Your Order",
    desc: "Review your creation and place your order securely.",
    gradient: "linear-gradient(135deg, #D4836A 0%, #C7725E 100%)",
  },
  {
    icon: Truck,
    title: "We Deliver",
    desc: "Fast production and delivery right to your doorstep.",
    gradient: "linear-gradient(135deg, #C7725E 0%, #B8614E 100%)",
  },
];

export default function HowItWorks() {
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section ref={sectionRef} style={{ padding: "100px 0", backgroundColor: "#fff", position: "relative", overflow: "hidden" }}>
      {/* Subtle background shapes */}
      <div
        style={{
          position: "absolute",
          top: -100,
          right: -100,
          width: 300,
          height: 300,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(246,180,154,0.04) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 28px" }}>
        {/* Header */}
        <div
          style={{
            textAlign: "center",
            marginBottom: 72,
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
            Simple Process
          </p>
          <h2
            style={{
              fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif",
              fontSize: 36,
              fontWeight: 700,
              color: "#1F2937",
              margin: "0 0 14px",
            }}
          >
            How It Works
          </h2>
          <p
            style={{
              fontSize: 15,
              color: "#9CA3AF",
              margin: 0,
              fontFamily: "var(--font-poppins), 'Poppins', sans-serif",
              maxWidth: 420,
              marginLeft: "auto",
              marginRight: "auto",
              lineHeight: 1.6,
            }}
          >
            From idea to delivery in four simple steps
          </p>
        </div>

        {/* Steps with SVG connector */}
        <div style={{ position: "relative" }}>
          {/* Animated SVG path connector — desktop only */}
          <svg
            className="hiw-svg-path"
            style={{
              position: "absolute",
              top: 48,
              left: "12%",
              width: "76%",
              height: 40,
              overflow: "visible",
              zIndex: 0,
            }}
            viewBox="0 0 800 40"
            preserveAspectRatio="none"
            fill="none"
          >
            <path
              d="M0 20 C100 20 120 5 200 5 C280 5 260 35 340 35 C420 35 400 5 480 5 C560 5 540 35 620 35 C700 35 720 20 800 20"
              stroke="url(#hiw-gradient)"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
              className="hiw-draw-line"
              style={{
                strokeDasharray: 900,
                strokeDashoffset: visible ? 0 : 900,
                transition: "stroke-dashoffset 2s cubic-bezier(0.22, 1, 0.36, 1) 0.4s",
              }}
            />
            <defs>
              <linearGradient id="hiw-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#F6B49A" stopOpacity="0.5" />
                <stop offset="50%" stopColor="#E9987A" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#D4836A" stopOpacity="0.3" />
              </linearGradient>
            </defs>
          </svg>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 28,
              position: "relative",
              zIndex: 1,
            }}
            className="howitworks-grid"
          >
            {steps.map((step, i) => (
              <div
                key={step.title}
                style={{
                  textAlign: "center",
                  opacity: visible ? 1 : 0,
                  transform: visible ? "translateY(0)" : "translateY(28px)",
                  transition: "all 0.7s cubic-bezier(0.22, 1, 0.36, 1)",
                  transitionDelay: `${0.2 + i * 0.15}s`,
                }}
                className="howitworks-step"
              >
                {/* Glassmorphism icon container */}
                <div style={{ position: "relative", display: "inline-block", marginBottom: 28 }}>
                  {/* Glow behind */}
                  <div
                    className="hiw-glow"
                    style={{
                      position: "absolute",
                      inset: -10,
                      borderRadius: 24,
                      background: step.gradient,
                      opacity: 0,
                      filter: "blur(20px)",
                      transition: "opacity 0.4s ease",
                    }}
                  />
                  {/* Outer ring */}
                  <div
                    className="hiw-ring"
                    style={{
                      position: "absolute",
                      inset: -6,
                      borderRadius: 22,
                      border: "1.5px solid transparent",
                      transition: "all 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
                    }}
                  />
                  {/* Icon box — glassmorphism */}
                  <div
                    className="howitworks-icon"
                    style={{
                      width: 88,
                      height: 88,
                      borderRadius: 22,
                      background: "rgba(255,245,235,0.6)",
                      backdropFilter: "blur(12px)",
                      WebkitBackdropFilter: "blur(12px)",
                      border: "1px solid rgba(246,180,154,0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
                      position: "relative",
                    }}
                  >
                    <step.icon size={32} color="#E9987A" strokeWidth={1.5} />
                  </div>
                  {/* Step number badge */}
                  <div
                    className="hiw-badge"
                    style={{
                      position: "absolute",
                      top: -6,
                      right: -6,
                      width: 28,
                      height: 28,
                      background: step.gradient,
                      color: "#fff",
                      borderRadius: 9,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      fontWeight: 700,
                      fontFamily: "var(--font-poppins), 'Poppins', sans-serif",
                      boxShadow: "0 3px 10px rgba(233,152,122,0.35)",
                      transition: "all 0.35s ease",
                    }}
                  >
                    {i + 1}
                  </div>
                </div>

                {/* Title */}
                <p
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: "#1F2937",
                    margin: "0 0 8px 0",
                    fontFamily: "var(--font-poppins), 'Poppins', sans-serif",
                  }}
                >
                  {step.title}
                </p>

                {/* Description */}
                <p
                  style={{
                    fontSize: 13.5,
                    color: "#9CA3AF",
                    margin: 0,
                    lineHeight: 1.65,
                    maxWidth: 220,
                    marginLeft: "auto",
                    marginRight: "auto",
                    fontFamily: "var(--font-poppins), 'Poppins', sans-serif",
                  }}
                >
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx global>{`
        .howitworks-step:hover .howitworks-icon {
          transform: translateY(-4px);
          background: rgba(255,245,235,0.85) !important;
          border-color: rgba(233,152,122,0.3) !important;
          box-shadow: 0 8px 32px rgba(233,152,122,0.12);
        }
        .howitworks-step:hover .hiw-glow {
          opacity: 0.12 !important;
        }
        .howitworks-step:hover .hiw-ring {
          border-color: rgba(233,152,122,0.12) !important;
        }
        .howitworks-step:hover .hiw-badge {
          transform: scale(1.12) rotate(4deg);
          box-shadow: 0 4px 14px rgba(233,152,122,0.45) !important;
        }

        /* SVG path hidden on mobile */
        @media (max-width: 768px) {
          .howitworks-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 40px !important;
          }
          .hiw-svg-path {
            display: none !important;
          }
        }
        @media (max-width: 480px) {
          .howitworks-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}
