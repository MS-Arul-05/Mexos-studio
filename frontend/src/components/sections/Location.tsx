"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { MapPin, Clock, Phone, ArrowUpRight } from "lucide-react";

export default function Location() {
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

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

  return (
    <section ref={sectionRef} style={{ padding: "100px 0", backgroundColor: "#fff" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 28px" }}>
        <div
          style={{
            backgroundColor: "#FFF8F3",
            borderRadius: 28,
            overflow: "hidden",
            border: "1px solid rgba(241,229,220,0.5)",
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(24px)",
            transition: "all 0.8s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
            }}
            className="location-grid"
          >
            {/* Left - Map Image */}
            <div
              style={{
                position: "relative",
                minHeight: 520,
                overflow: "hidden",
              }}
              className="location-map"
            >
              <Image
                src="/images/misc/location-light.png"
                alt="Mexos Studio location map"
                fill
                style={{
                  objectFit: "cover",
                  objectPosition: "center 15%",
                  transform: "scale(1.15)",
                  transition: "transform 8s ease",
                }}
                className="location-map-img"
              />

              {/* Gradient overlay on edge */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  bottom: 0,
                  width: 80,
                  background: "linear-gradient(90deg, transparent, rgba(255,248,243,0.4))",
                  pointerEvents: "none",
                }}
              />
            </div>

            {/* Right - Location Info */}
            <div
              style={{
                padding: "64px 60px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
              className="location-info"
            >
              {/* Small label */}
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 20,
                  opacity: visible ? 1 : 0,
                  transform: visible ? "translateY(0)" : "translateY(12px)",
                  transition: "all 0.6s ease 0.2s",
                }}
              >
                <MapPin size={13} color="#E9987A" strokeWidth={2} />
                <p
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#E9987A",
                    textTransform: "uppercase",
                    letterSpacing: 2,
                    margin: 0,
                    fontFamily: "var(--font-poppins), 'Poppins', sans-serif",
                  }}
                >
                  Our Location
                </p>
              </div>

              {/* Big heading */}
              <h2
                style={{
                  fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif",
                  fontSize: 40,
                  fontWeight: 700,
                  color: "#1F2937",
                  lineHeight: 1.15,
                  margin: "0 0 28px 0",
                  opacity: visible ? 1 : 0,
                  transform: visible ? "translateY(0)" : "translateY(16px)",
                  transition: "all 0.7s ease 0.3s",
                }}
                className="location-heading"
              >
                Based in
                <br />
                Thazhambur, Chennai
              </h2>

              {/* Address card */}
              <div
                style={{
                  backgroundColor: "rgba(255,255,255,0.7)",
                  backdropFilter: "blur(6px)",
                  borderRadius: 16,
                  padding: "20px 22px",
                  border: "1px solid rgba(241,229,220,0.4)",
                  marginBottom: 20,
                  opacity: visible ? 1 : 0,
                  transform: visible ? "translateY(0)" : "translateY(16px)",
                  transition: "all 0.7s ease 0.4s",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      backgroundColor: "rgba(246,180,154,0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  >
                    <MapPin size={16} color="#E9987A" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "#1F2937",
                        margin: "0 0 4px 0",
                        fontFamily: "var(--font-poppins), 'Poppins', sans-serif",
                      }}
                    >
                      Mexos Studio
                    </p>
                    <p
                      style={{
                        fontSize: 13,
                        color: "#6B7280",
                        margin: 0,
                        lineHeight: 1.65,
                        fontFamily: "var(--font-poppins), 'Poppins', sans-serif",
                      }}
                    >
                      Shop No. 18, Thaha Center,
                      <br />
                      3/139, Thazhambur Rd,
                      <br />
                      Thazhambur, Chennai 600130
                    </p>
                  </div>
                </div>
              </div>

              {/* Info row: Hours + Phone */}
              <div
                style={{
                  display: "flex",
                  gap: 24,
                  marginBottom: 28,
                  opacity: visible ? 1 : 0,
                  transform: visible ? "translateY(0)" : "translateY(16px)",
                  transition: "all 0.7s ease 0.5s",
                }}
                className="location-info-row"
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Clock size={14} color="#E9987A" strokeWidth={1.5} />
                  <span
                    style={{
                      fontSize: 12.5,
                      color: "#6B7280",
                      fontFamily: "var(--font-poppins), 'Poppins', sans-serif",
                    }}
                  >
                    Mon–Sat, 10am–8pm
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Phone size={14} color="#E9987A" strokeWidth={1.5} />
                  <span
                    style={{
                      fontSize: 12.5,
                      color: "#6B7280",
                      fontFamily: "var(--font-poppins), 'Poppins', sans-serif",
                    }}
                  >
                    +91 98765 43210
                  </span>
                </div>
              </div>

              {/* Get Directions button — links to Google Maps */}
              <a
                href="https://maps.google.com/?q=Mexos+Studio+Thazhambur+Chennai+600130"
                target="_blank"
                rel="noopener noreferrer"
                className="location-btn"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "13px 26px",
                  backgroundColor: "#1F2937",
                  color: "#fff",
                  fontSize: 13.5,
                  fontWeight: 600,
                  borderRadius: 12,
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "var(--font-poppins), 'Poppins', sans-serif",
                  width: "fit-content",
                  textDecoration: "none",
                  transition: "all 0.35s cubic-bezier(0.22, 1, 0.36, 1)",
                  opacity: visible ? 1 : 0,
                  transform: visible ? "translateY(0)" : "translateY(16px)",
                }}
              >
                Get Directions <ArrowUpRight size={14} className="location-btn-arrow" />
              </a>

              {/* District + Country */}
              <div
                style={{
                  marginTop: 28,
                  paddingTop: 20,
                  borderTop: "1px solid rgba(241,229,220,0.5)",
                  opacity: visible ? 1 : 0,
                  transition: "opacity 0.7s ease 0.7s",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 6,
                  }}
                >
                  <MapPin size={12} color="#9CA3AF" strokeWidth={1.5} />
                  <p
                    style={{
                      fontSize: 12,
                      color: "#9CA3AF",
                      margin: 0,
                      fontFamily: "var(--font-poppins), 'Poppins', sans-serif",
                    }}
                  >
                    Chengalpattu District, Tamil Nadu
                  </p>
                </div>
                <p
                  style={{
                    fontSize: 11,
                    color: "#9CA3AF",
                    margin: 0,
                    letterSpacing: 1.5,
                    textTransform: "uppercase",
                    fontFamily: "var(--font-poppins), 'Poppins', sans-serif",
                  }}
                >
                  INDIA &bull; 600130
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .location-map:hover .location-map-img {
          transform: scale(1.2) !important;
        }
        .location-btn:hover {
          background-color: #E9987A !important;
          transform: translateY(-2px) !important;
          box-shadow: 0 8px 24px rgba(233,152,122,0.3);
        }
        .location-btn:hover .location-btn-arrow {
          transform: translate(2px, -2px);
          transition: transform 0.3s ease;
        }
        @media (max-width: 1024px) {
          .location-grid {
            grid-template-columns: 1fr !important;
          }
          .location-map {
            min-height: 320px !important;
          }
          .location-info {
            padding: 36px 32px !important;
          }
          .location-heading {
            font-size: 30px !important;
          }
          .location-info-row {
            flex-direction: column !important;
            gap: 12px !important;
          }
        }
        @media (max-width: 640px) {
          .location-map {
            min-height: 250px !important;
          }
        }
      `}</style>
    </section>
  );
}
