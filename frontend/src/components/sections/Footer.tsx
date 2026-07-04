"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUp, Mail, Heart, Phone, MapPin } from "lucide-react";

const shopLinks = ["T-Shirts", "Hoodies", "Polo Shirts", "Sweatshirts", "Jerseys"];
const companyLinks = ["About Us", "Our Story", "Careers", "Contact"];
const helpLinks = ["FAQs", "Shipping Info", "Returns", "Size Guide", "Support"];

function FooterColumn({ title, links }: { title: string; links: string[] }) {
  return (
    <div>
      <h4
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "rgba(255,255,255,0.7)",
          textTransform: "uppercase",
          letterSpacing: 1.5,
          margin: "0 0 22px 0",
          fontFamily: "var(--font-poppins), 'Poppins', sans-serif",
        }}
      >
        {title}
      </h4>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {links.map((link) => (
          <li key={link} style={{ marginBottom: 14 }}>
            <Link
              href="#"
              style={{
                fontSize: 13.5,
                color: "rgba(255,255,255,0.4)",
                textDecoration: "none",
                fontFamily: "var(--font-poppins), 'Poppins', sans-serif",
                transition: "all 0.3s ease",
                display: "inline-block",
              }}
              className="footer-link"
            >
              {link}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

// SVG icons for social platforms
function InstagramIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

export default function Footer() {
  const newsletterRef = useRef<HTMLDivElement>(null);
  const [nlVisible, setNlVisible] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const el = newsletterRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setNlVisible(true); obs.disconnect(); } },
      { threshold: 0.2 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const handler = () => setShowBackToTop(window.scrollY > 600);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <footer style={{ backgroundColor: "#1F2937", position: "relative", overflow: "hidden" }}>
      {/* Subtle background glows */}
      <div
        style={{
          position: "absolute",
          top: -100,
          right: -100,
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(233,152,122,0.04) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -60,
          left: -60,
          width: 250,
          height: 250,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(233,152,122,0.03) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Newsletter Bar */}
      <div
        ref={newsletterRef}
        style={{
          background: "linear-gradient(135deg, #E9987A 0%, #F6B49A 100%)",
          padding: "40px 28px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative circles */}
        <div
          style={{
            position: "absolute",
            top: -40,
            right: -40,
            width: 160,
            height: 160,
            borderRadius: "50%",
            border: "1px solid rgba(255,255,255,0.12)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -30,
            left: 80,
            width: 100,
            height: 100,
            borderRadius: "50%",
            border: "1px solid rgba(255,255,255,0.08)",
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 32,
            position: "relative",
            zIndex: 1,
            opacity: nlVisible ? 1 : 0,
            transform: nlVisible ? "translateY(0)" : "translateY(16px)",
            transition: "all 0.7s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
          className="newsletter-bar"
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <Mail size={18} color="#fff" strokeWidth={1.5} />
              <h3
                style={{
                  fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif",
                  fontSize: 26,
                  fontWeight: 700,
                  color: "#fff",
                  margin: 0,
                }}
              >
                Subscribe to Our Newsletter
              </h3>
            </div>
            <p
              style={{
                fontSize: 13.5,
                color: "rgba(255,255,255,0.7)",
                margin: 0,
                fontFamily: "var(--font-poppins), 'Poppins', sans-serif",
              }}
            >
              Get updates on new products, exclusive offers and more.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexShrink: 0,
            }}
            className="newsletter-form"
          >
            <div style={{ position: "relative" }}>
              <input
                type="email"
                placeholder="Enter your email"
                style={{
                  padding: "14px 20px",
                  borderRadius: 12,
                  border: "2px solid transparent",
                  fontSize: 13.5,
                  width: 290,
                  outline: "none",
                  backgroundColor: "rgba(255,255,255,0.95)",
                  color: "#1F2937",
                  fontFamily: "var(--font-poppins), 'Poppins', sans-serif",
                  transition: "border-color 0.3s ease",
                }}
                className="newsletter-input"
              />
            </div>
            <button
              style={{
                padding: "14px 26px",
                borderRadius: 12,
                border: "2px solid #fff",
                backgroundColor: "transparent",
                color: "#fff",
                fontSize: 13.5,
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontFamily: "var(--font-poppins), 'Poppins', sans-serif",
                transition: "all 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
                whiteSpace: "nowrap",
              }}
              className="subscribe-btn"
            >
              Subscribe <ArrowRight size={14} className="subscribe-arrow" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "64px 28px 36px", position: "relative" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.6fr 1fr 1fr 1fr",
            gap: 52,
          }}
          className="footer-grid"
        >
          {/* Brand Column */}
          <div>
            {/* Logo mark + brand name */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 9,
                  background: "linear-gradient(135deg, #F6B49A, #E9987A)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 3px 12px rgba(233,152,122,0.3)",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif",
                    fontSize: 16,
                    fontWeight: 800,
                    color: "#fff",
                    lineHeight: 1,
                  }}
                >
                  M
                </span>
              </div>
              <h2
                style={{
                  fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif",
                  fontSize: 24,
                  fontWeight: 700,
                  color: "#fff",
                  fontStyle: "italic",
                  margin: 0,
                }}
              >
                Mexos Studio
              </h2>
            </div>

            <p
              style={{
                fontSize: 13.5,
                color: "rgba(255,255,255,0.4)",
                lineHeight: 1.75,
                margin: "0 0 24px 0",
                maxWidth: 270,
                fontFamily: "var(--font-poppins), 'Poppins', sans-serif",
              }}
            >
              Premium custom apparel printing in Chennai. Your design, our quality — bringing your creative vision to life.
            </p>

            {/* Contact info */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Phone size={13} color="#E9987A" strokeWidth={1.5} />
                <span
                  style={{
                    fontSize: 12.5,
                    color: "rgba(255,255,255,0.4)",
                    fontFamily: "var(--font-poppins), 'Poppins', sans-serif",
                  }}
                >
                  +91 98765 43210
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <MapPin size={13} color="#E9987A" strokeWidth={1.5} />
                <span
                  style={{
                    fontSize: 12.5,
                    color: "rgba(255,255,255,0.4)",
                    fontFamily: "var(--font-poppins), 'Poppins', sans-serif",
                  }}
                >
                  Thazhambur, Chennai 600130
                </span>
              </div>
            </div>

            {/* Social Icons — Instagram, WhatsApp, YouTube */}
            <div style={{ display: "flex", gap: 10 }}>
              {[
                { Icon: InstagramIcon, href: "https://instagram.com/mexosstudio", label: "Instagram" },
                { Icon: WhatsAppIcon, href: "https://wa.me/919876543210", label: "WhatsApp" },
                { Icon: YouTubeIcon, href: "https://youtube.com/@mexosstudio", label: "YouTube" },
              ].map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.1)",
                    backgroundColor: "rgba(255,255,255,0.03)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "rgba(255,255,255,0.4)",
                    transition: "all 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
                  }}
                  className="social-icon"
                >
                  <Icon />
                </a>
              ))}
            </div>
          </div>

          <FooterColumn title="Shop" links={shopLinks} />
          <FooterColumn title="Company" links={companyLinks} />
          <FooterColumn title="Help" links={helpLinks} />
        </div>

        {/* Bottom Bar */}
        <div
          style={{
            marginTop: 48,
            paddingTop: 24,
            borderTop: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
          className="footer-bottom"
        >
          <p
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.25)",
              margin: 0,
              fontFamily: "var(--font-poppins), 'Poppins', sans-serif",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            &copy; 2026 Mexos Studio. Made with
            <Heart size={10} color="#E9987A" fill="#E9987A" />
            in Chennai
          </p>

          {/* Payment Icons */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {["Visa", "Mastercard", "UPI", "GPay", "RuPay"].map((name) => (
              <div
                key={name}
                className="payment-badge"
                style={{
                  padding: "5px 12px",
                  borderRadius: 6,
                  backgroundColor: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  fontSize: 10,
                  color: "rgba(255,255,255,0.35)",
                  fontWeight: 600,
                  fontFamily: "var(--font-poppins), 'Poppins', sans-serif",
                  letterSpacing: 0.5,
                  transition: "all 0.3s ease",
                }}
              >
                {name}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Back to Top button */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="back-to-top"
        style={{
          position: "fixed",
          bottom: 28,
          right: 28,
          width: 44,
          height: 44,
          borderRadius: 14,
          border: "none",
          backgroundColor: "#E9987A",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0 6px 24px rgba(233,152,122,0.35)",
          zIndex: 40,
          opacity: showBackToTop ? 1 : 0,
          transform: showBackToTop ? "translateY(0)" : "translateY(16px)",
          pointerEvents: showBackToTop ? "auto" : "none",
          transition: "all 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <ArrowUp size={18} strokeWidth={2} />
      </button>

      <style jsx global>{`
        .subscribe-btn:hover {
          background-color: #fff !important;
          color: #E9987A !important;
          transform: translateY(-1px);
        }
        .subscribe-btn:hover .subscribe-arrow {
          transform: translateX(3px);
          transition: transform 0.3s ease;
        }
        .newsletter-input:focus {
          border-color: rgba(255,255,255,0.5) !important;
        }
        .social-icon:hover {
          border-color: #E9987A !important;
          color: #E9987A !important;
          background-color: rgba(233,152,122,0.1) !important;
          transform: translateY(-2px);
        }
        .footer-link:hover {
          color: #E9987A !important;
          transform: translateX(4px);
        }
        .payment-badge:hover {
          border-color: rgba(255,255,255,0.15) !important;
          color: rgba(255,255,255,0.55) !important;
        }
        .back-to-top:hover {
          transform: translateY(-3px) !important;
          box-shadow: 0 8px 28px rgba(233,152,122,0.45) !important;
        }
        @media (max-width: 1024px) {
          .footer-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 36px !important;
          }
          .newsletter-bar {
            flex-direction: column !important;
            text-align: center;
          }
          .newsletter-form {
            width: 100% !important;
            justify-content: center !important;
          }
        }
        @media (max-width: 640px) {
          .footer-grid {
            grid-template-columns: 1fr !important;
          }
          .footer-bottom {
            flex-direction: column !important;
            gap: 16px !important;
            text-align: center;
          }
          .newsletter-form {
            flex-direction: column !important;
          }
          .newsletter-form input {
            width: 100% !important;
          }
        }
      `}</style>
    </footer>
  );
}
