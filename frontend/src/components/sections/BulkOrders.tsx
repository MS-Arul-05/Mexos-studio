"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowRight, Users, CheckCircle, Shield, Award, Zap } from "lucide-react";

const stats = [
  { value: "500+", label: "Teams Served", icon: Users },
  { value: "50K+", label: "Units Printed", icon: Award },
  { value: "24h", label: "Quick Turnaround", icon: Zap },
];

export default function BulkOrders() {
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
    <section ref={sectionRef} style={{ padding: "100px 0", backgroundColor: "#FFF8F3" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 28px" }}>
        <div
          style={{
            position: "relative",
            borderRadius: 28,
            overflow: "hidden",
            backgroundColor: "#1F2937",
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(24px)",
            transition: "all 0.8s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          {/* Decorative corner accent */}
          <div
            style={{
              position: "absolute",
              top: -60,
              left: -60,
              width: 180,
              height: 180,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(233,152,122,0.12) 0%, transparent 70%)",
              pointerEvents: "none",
              zIndex: 1,
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: -40,
              right: "45%",
              width: 120,
              height: 120,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(233,152,122,0.06) 0%, transparent 70%)",
              pointerEvents: "none",
              zIndex: 1,
            }}
          />

          {/* Gradient overlay on image side */}
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              width: "55%",
              background: "linear-gradient(90deg, #1F2937 0%, transparent 40%)",
              zIndex: 2,
              pointerEvents: "none",
            }}
            className="bulk-overlay"
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
            }}
            className="bulk-grid"
          >
            {/* Left Content */}
            <div
              style={{
                padding: "56px 56px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                position: "relative",
                zIndex: 3,
              }}
              className="bulk-left"
            >
              {/* Label */}
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 16,
                  opacity: visible ? 1 : 0,
                  transform: visible ? "translateY(0)" : "translateY(12px)",
                  transition: "all 0.6s ease 0.2s",
                }}
              >
                <Users size={14} color="#E9987A" strokeWidth={2} />
                <span
                  style={{
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: "#E9987A",
                    textTransform: "uppercase",
                    letterSpacing: 2,
                    fontFamily: "var(--font-poppins), 'Poppins', sans-serif",
                  }}
                >
                  Team Orders
                </span>
              </div>

              <h2
                style={{
                  fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif",
                  fontSize: 40,
                  fontWeight: 700,
                  color: "#fff",
                  lineHeight: 1.15,
                  margin: "0 0 18px 0",
                  opacity: visible ? 1 : 0,
                  transform: visible ? "translateY(0)" : "translateY(16px)",
                  transition: "all 0.7s ease 0.3s",
                }}
                className="bulk-heading"
              >
                Bulk Orders for Teams
                <br />
                and Businesses
              </h2>
              <p
                style={{
                  color: "rgba(255,255,255,0.5)",
                  fontSize: 15,
                  lineHeight: 1.7,
                  maxWidth: 400,
                  margin: "0 0 24px 0",
                  fontFamily: "var(--font-poppins), 'Poppins', sans-serif",
                  opacity: visible ? 1 : 0,
                  transform: visible ? "translateY(0)" : "translateY(16px)",
                  transition: "all 0.7s ease 0.4s",
                }}
              >
                Get special discounts on bulk orders for events, organizations and companies. Matching designs, custom prints.
              </p>

              {/* Feature checklist */}
              <div
                style={{
                  display: "flex",
                  gap: 20,
                  marginBottom: 32,
                  flexWrap: "wrap",
                  opacity: visible ? 1 : 0,
                  transform: visible ? "translateY(0)" : "translateY(16px)",
                  transition: "all 0.7s ease 0.5s",
                }}
              >
                {["Custom Logos", "10+ Units", "Free Design"].map((item) => (
                  <div key={item} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <CheckCircle size={13} color="#E9987A" strokeWidth={2} />
                    <span
                      style={{
                        fontSize: 12,
                        color: "rgba(255,255,255,0.55)",
                        fontFamily: "var(--font-poppins), 'Poppins', sans-serif",
                        fontWeight: 500,
                      }}
                    >
                      {item}
                    </span>
                  </div>
                ))}
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  marginBottom: 36,
                  opacity: visible ? 1 : 0,
                  transform: visible ? "translateY(0)" : "translateY(16px)",
                  transition: "all 0.7s ease 0.55s",
                }}
              >
                <button
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "15px 30px",
                    backgroundColor: "#E9987A",
                    color: "#fff",
                    fontSize: 14,
                    fontWeight: 600,
                    borderRadius: 14,
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "var(--font-poppins), 'Poppins', sans-serif",
                    width: "fit-content",
                    boxShadow: "0 8px 24px rgba(233,152,122,0.3)",
                    transition: "all 0.35s cubic-bezier(0.22, 1, 0.36, 1)",
                  }}
                  className="bulk-btn"
                >
                  Get a Quote <ArrowRight size={14} className="bulk-btn-arrow" />
                </button>

                {/* Trust shield */}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Shield size={14} color="rgba(255,255,255,0.3)" strokeWidth={1.5} />
                  <span
                    style={{
                      fontSize: 11,
                      color: "rgba(255,255,255,0.3)",
                      fontFamily: "var(--font-poppins), 'Poppins', sans-serif",
                      fontWeight: 500,
                    }}
                  >
                    Quality Guaranteed
                  </span>
                </div>
              </div>

              {/* Stat counters row */}
              <div
                style={{
                  display: "flex",
                  gap: 0,
                  opacity: visible ? 1 : 0,
                  transform: visible ? "translateY(0)" : "translateY(16px)",
                  transition: "all 0.7s ease 0.65s",
                }}
                className="bulk-stats"
              >
                {stats.map((stat, i) => (
                  <div
                    key={stat.label}
                    className="bulk-stat-item"
                    style={{
                      flex: 1,
                      padding: "16px 0",
                      borderLeft: i > 0 ? "1px solid rgba(255,255,255,0.08)" : "none",
                      paddingLeft: i > 0 ? 20 : 0,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <stat.icon size={13} color="#E9987A" strokeWidth={2} />
                      <span
                        style={{
                          fontSize: 22,
                          fontWeight: 700,
                          color: "#fff",
                          fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif",
                        }}
                      >
                        {stat.value}
                      </span>
                    </div>
                    <p
                      style={{
                        fontSize: 11,
                        color: "rgba(255,255,255,0.35)",
                        margin: 0,
                        fontFamily: "var(--font-poppins), 'Poppins', sans-serif",
                        fontWeight: 500,
                      }}
                    >
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right - Real Team Photo */}
            <div
              style={{
                position: "relative",
                overflow: "hidden",
                minHeight: 480,
              }}
              className="bulk-right"
            >
              <Image
                src="/images/misc/team-hoodies.jpeg"
                alt="Team wearing matching peach TEAM 07 hoodies"
                fill
                style={{
                  objectFit: "cover",
                  objectPosition: "center center",
                  opacity: visible ? 1 : 0,
                  transition: "opacity 1s ease 0.4s, transform 8s ease",
                  transform: visible ? "scale(1.05)" : "scale(1)",
                }}
                className="bulk-photo"
              />
              {/* Peach tint overlay */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "linear-gradient(135deg, rgba(31,41,55,0.15) 0%, rgba(233,152,122,0.08) 100%)",
                  zIndex: 1,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .bulk-btn:hover {
          transform: translateY(-2px) !important;
          box-shadow: 0 12px 32px rgba(233,152,122,0.4) !important;
        }
        .bulk-btn:hover .bulk-btn-arrow {
          transform: translateX(3px);
          transition: transform 0.3s ease;
        }
        .bulk-stat-item:hover span:last-of-type {
          color: #E9987A;
          transition: color 0.3s ease;
        }
        @media (max-width: 1024px) {
          .bulk-grid {
            grid-template-columns: 1fr !important;
          }
          .bulk-right {
            min-height: 280px !important;
            order: -1;
          }
          .bulk-overlay {
            display: none !important;
          }
          .bulk-left {
            padding: 36px 32px !important;
          }
          .bulk-heading {
            font-size: 28px !important;
          }
        }
        @media (max-width: 640px) {
          .bulk-right {
            min-height: 200px !important;
          }
          .bulk-stats {
            flex-direction: column !important;
            gap: 0 !important;
          }
          .bulk-stat-item {
            border-left: none !important;
            padding-left: 0 !important;
            border-top: 1px solid rgba(255,255,255,0.08);
            padding: 12px 0 !important;
          }
          .bulk-stat-item:first-child {
            border-top: none;
          }
        }
      `}</style>
    </section>
  );
}
