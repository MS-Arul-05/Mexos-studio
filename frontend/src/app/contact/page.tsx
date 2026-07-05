"use client";

import { useState, useEffect, useRef } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/sections/Footer";
import { api } from "@/lib/api";
import { WHATSAPP_NUMBER } from "@/lib/utils";
import {
  MessageCircle,
  Mail,
  Phone,
  MapPin,
  Clock,
  Send,
  ArrowRight,
  CheckCircle,
  Globe,
} from "lucide-react";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const sectionRef = useRef<HTMLElement>(null);
  const [vis, setVis] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); } },
      { threshold: 0.05 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !message.trim()) return;
    void (async () => {
      try {
        await api.post("/contact", {
          name: name.trim(),
          ...(email.trim() ? { email: email.trim() } : {}),
          message: subject.trim() ? `[${subject.trim()}] ${message.trim()}` : message.trim(),
        });
        setSent(true);
        setName(""); setEmail(""); setSubject(""); setMessage("");
        setTimeout(() => setSent(false), 4000);
      } catch {
        setSent(false);
        alert("Could not send your message. Please try again.");
      }
    })();
  };

  const contactInfo = [
    {
      icon: Phone,
      label: "Phone",
      value: "+91 99887 76655",
      href: "tel:+919988776655",
    },
    {
      icon: Mail,
      label: "Email",
      value: "hello@mexosstudio.com",
      href: "mailto:hello@mexosstudio.com",
    },
    {
      icon: MapPin,
      label: "Studio",
      value: "Anna Nagar, Chennai 600040",
      href: "#",
    },
    {
      icon: Clock,
      label: "Hours",
      value: "Mon–Sat, 10 AM – 7 PM",
      href: "#",
    },
  ];

  return (
    <>
      <Navbar />
      <main ref={sectionRef} style={{ backgroundColor: "#FFF8F3", paddingTop: 72, minHeight: "100vh" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 28px 100px" }}>
          {/* Header */}
          <div
            style={{
              textAlign: "center", marginBottom: 52,
              opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(18px)",
              transition: "all 0.7s cubic-bezier(0.22,1,0.36,1)",
            }}
          >
            <p style={{ fontSize: 12, fontWeight: 600, color: "#E9987A", textTransform: "uppercase", letterSpacing: 2, margin: "0 0 8px", fontFamily: "var(--font-poppins), sans-serif" }}>
              Get in Touch
            </p>
            <h1 className="contact-hero-heading" style={{ fontFamily: "var(--font-playfair), 'Playfair Display', serif", fontSize: 40, fontWeight: 700, color: "#1F2937", margin: "0 0 12px" }}>
              Contact Us
            </h1>
            <p style={{ fontSize: 15, color: "#6B7280", maxWidth: 520, margin: "0 auto", fontFamily: "var(--font-poppins), sans-serif" }}>
              Have a question about custom orders, bulk pricing, or anything else? We&apos;d love to hear from you.
            </p>
          </div>

          {/* WhatsApp CTA bar */}
          <div
            style={{
              background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)",
              borderRadius: 22, padding: "28px 32px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: 36, position: "relative", overflow: "hidden",
              opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(14px)",
              transition: "all 0.7s cubic-bezier(0.22,1,0.36,1) 0.1s",
            }}
            className="contact-whatsapp-bar"
          >
            {/* Decorative circle */}
            <div style={{ position: "absolute", top: -20, right: -20, width: 120, height: 120, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.12)", pointerEvents: "none" }} />

            <div style={{ display: "flex", alignItems: "center", gap: 14, position: "relative", zIndex: 1 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14,
                backgroundColor: "rgba(255,255,255,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <MessageCircle size={22} color="#fff" strokeWidth={1.8} />
              </div>
              <div>
                <h3 style={{ fontFamily: "var(--font-playfair), serif", fontSize: 20, fontWeight: 700, color: "#fff", margin: "0 0 2px" }}>
                  Prefer WhatsApp?
                </h3>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", margin: 0, fontFamily: "var(--font-poppins), sans-serif" }}>
                  Get instant replies — we&apos;re usually online within minutes.
                </p>
              </div>
            </div>

            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=Hi!%20I%20have%20a%20question%20about%20Mexos%20Studio.`}
              target="_blank"
              rel="noopener noreferrer"
              className="wa-bar-btn"
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "13px 28px", backgroundColor: "#fff", color: "#25D366",
                fontSize: 14, fontWeight: 700, borderRadius: 12, textDecoration: "none",
                fontFamily: "var(--font-poppins), sans-serif",
                boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
                transition: "all 0.35s cubic-bezier(0.22,1,0.36,1)",
                whiteSpace: "nowrap", position: "relative", zIndex: 1,
              }}
            >
              Chat Now <ArrowRight size={15} />
            </a>
          </div>

          {/* Main grid: Form + Info */}
          <div
            style={{
              display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 32, alignItems: "start",
              opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(14px)",
              transition: "all 0.7s cubic-bezier(0.22,1,0.36,1) 0.2s",
            }}
            className="contact-grid"
          >
            {/* ── Contact Form ── */}
            <div className="contact-form-card" style={{
              backgroundColor: "#fff", borderRadius: 22, border: "1px solid rgba(241,229,220,0.5)",
              padding: "36px 32px",
            }}>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: "#1F2937", margin: "0 0 6px", fontFamily: "var(--font-playfair), serif" }}>
                Send a Message
              </h2>
              <p style={{ fontSize: 13.5, color: "#6B7280", margin: "0 0 28px", fontFamily: "var(--font-poppins), sans-serif" }}>
                Fill in the form and we&apos;ll get back to you within 24 hours.
              </p>

              {sent ? (
                <div style={{ textAlign: "center", padding: "48px 0" }}>
                  <div style={{
                    width: 64, height: 64, borderRadius: "50%",
                    backgroundColor: "rgba(16,185,129,0.08)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    margin: "0 auto 16px",
                  }}>
                    <CheckCircle size={28} color="#10B981" strokeWidth={1.5} />
                  </div>
                  <h3 style={{ fontSize: 20, fontWeight: 700, color: "#1F2937", margin: "0 0 8px", fontFamily: "var(--font-playfair), serif" }}>
                    Message Sent!
                  </h3>
                  <p style={{ fontSize: 14, color: "#6B7280", fontFamily: "var(--font-poppins), sans-serif" }}>
                    We&apos;ll respond within 24 hours. Check your email or WhatsApp.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }} className="form-row">
                    <div>
                      <label style={labelStyle}>Name</label>
                      <input
                        type="text" value={name} onChange={(e) => setName(e.target.value)}
                        placeholder="Your name" required
                        style={{ ...fieldStyle }} className="contact-input"
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Email</label>
                      <input
                        type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@email.com" required
                        style={{ ...fieldStyle }} className="contact-input"
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <label style={labelStyle}>Subject</label>
                    <input
                      type="text" value={subject} onChange={(e) => setSubject(e.target.value)}
                      placeholder="What's this about?"
                      style={{ ...fieldStyle }} className="contact-input"
                    />
                  </div>

                  <div style={{ marginBottom: 24 }}>
                    <label style={labelStyle}>Message</label>
                    <textarea
                      value={message} onChange={(e) => setMessage(e.target.value)}
                      placeholder="Tell us more about your inquiry..."
                      rows={5} required
                      style={{ ...fieldStyle, resize: "vertical" }} className="contact-input"
                    />
                  </div>

                  <button
                    type="submit"
                    className="contact-submit"
                    style={{
                      width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      padding: "15px", borderRadius: 14,
                      backgroundColor: "#E9987A", color: "#fff",
                      fontSize: 15, fontWeight: 700, border: "none", cursor: "pointer",
                      fontFamily: "var(--font-poppins), sans-serif",
                      boxShadow: "0 8px 28px rgba(233,152,122,0.35)",
                      transition: "all 0.35s cubic-bezier(0.22,1,0.36,1)",
                    }}
                  >
                    <Send size={15} /> Send Message
                  </button>
                </form>
              )}
            </div>

            {/* ── Info Column ── */}
            <div>
              {/* Contact details */}
              <div style={{
                backgroundColor: "#fff", borderRadius: 22, border: "1px solid rgba(241,229,220,0.5)",
                padding: "28px 28px", marginBottom: 20,
              }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1F2937", margin: "0 0 20px", fontFamily: "var(--font-playfair), serif" }}>
                  Contact Info
                </h3>
                {contactInfo.map((info, i) => (
                  <a
                    key={i}
                    href={info.href}
                    className="contact-info-row"
                    style={{
                      display: "flex", alignItems: "center", gap: 14,
                      padding: "14px 0",
                      borderBottom: i < contactInfo.length - 1 ? "1px solid rgba(241,229,220,0.4)" : "none",
                      textDecoration: "none",
                      transition: "all 0.25s ease",
                    }}
                  >
                    <div style={{
                      width: 42, height: 42, borderRadius: 12,
                      backgroundColor: "rgba(246,180,154,0.08)",
                      border: "1px solid rgba(246,180,154,0.1)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0, transition: "all 0.3s ease",
                    }}>
                      <info.icon size={18} color="#E9987A" strokeWidth={1.5} />
                    </div>
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 1, margin: "0 0 2px", fontFamily: "var(--font-poppins), sans-serif" }}>
                        {info.label}
                      </p>
                      <p style={{ fontSize: 13.5, fontWeight: 500, color: "#1F2937", margin: 0, fontFamily: "var(--font-poppins), sans-serif" }}>
                        {info.value}
                      </p>
                    </div>
                  </a>
                ))}
              </div>

              {/* Social */}
              <div style={{
                backgroundColor: "#fff", borderRadius: 22, border: "1px solid rgba(241,229,220,0.5)",
                padding: "24px 28px", marginBottom: 20,
              }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1F2937", margin: "0 0 16px", fontFamily: "var(--font-playfair), serif" }}>
                  Follow Us
                </h3>
                <div style={{ display: "flex", gap: 10 }}>
                  {[
                    { icon: Globe, label: "Instagram" },
                    { icon: Globe, label: "Website" },
                    { icon: MessageCircle, label: "WhatsApp" },
                  ].map((s) => (
                    <a
                      key={s.label}
                      href="#"
                      className="contact-social"
                      style={{
                        width: 44, height: 44, borderRadius: 12,
                        border: "1px solid rgba(241,229,220,0.5)",
                        backgroundColor: "rgba(255,245,235,0.3)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#6B7280", transition: "all 0.3s ease",
                      }}
                    >
                      <s.icon size={18} strokeWidth={1.5} />
                    </a>
                  ))}
                </div>
              </div>

              {/* Map placeholder */}
              <div style={{
                borderRadius: 22, overflow: "hidden", height: 200,
                border: "1px solid rgba(241,229,220,0.5)",
                background: "linear-gradient(135deg, rgba(246,180,154,0.08) 0%, rgba(255,245,235,0.3) 100%)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <div style={{ textAlign: "center" }}>
                  <MapPin size={28} color="#E9987A" strokeWidth={1.2} style={{ marginBottom: 8 }} />
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#1F2937", margin: "0 0 2px", fontFamily: "var(--font-poppins), sans-serif" }}>
                    Anna Nagar, Chennai
                  </p>
                  <p style={{ fontSize: 11.5, color: "#9CA3AF", margin: 0, fontFamily: "var(--font-poppins), sans-serif" }}>
                    Visit our studio by appointment
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />

      <style jsx global>{`
        .contact-input:focus { border-color: #E9987A !important; }
        .contact-submit:hover { transform: translateY(-2px); box-shadow: 0 12px 36px rgba(233,152,122,0.4) !important; }
        .wa-bar-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.15) !important; }
        .contact-info-row:hover div:first-child {
          background-color: rgba(246,180,154,0.15) !important;
          transform: scale(1.06);
        }
        .contact-social:hover {
          border-color: #E9987A !important;
          color: #E9987A !important;
          background-color: rgba(233,152,122,0.06) !important;
          transform: translateY(-2px);
        }
        @media (max-width: 768px) {
          .contact-grid { grid-template-columns: 1fr !important; }
          .contact-whatsapp-bar { flex-direction: column !important; gap: 16px !important; text-align: center; }
          .form-row { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 640px) {
          .contact-grid { gap: 24px !important; }
          .contact-form-card { padding: 24px 20px !important; }
          .contact-hero-heading { font-size: 28px !important; }
        }
        @media (max-width: 480px) {
          .contact-hero-heading { font-size: 24px !important; }
        }
      `}</style>
    </>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 13, fontWeight: 600, color: "#1F2937",
  display: "block", margin: "0 0 8px",
  fontFamily: "var(--font-poppins), sans-serif",
};

const fieldStyle: React.CSSProperties = {
  width: "100%", padding: "13px 16px", borderRadius: 14,
  border: "1.5px solid rgba(241,229,220,0.7)", backgroundColor: "#FFF8F3",
  fontSize: 13.5, color: "#1F2937", fontFamily: "var(--font-poppins), sans-serif",
  outline: "none", transition: "border-color 0.3s",
};
