"use client";

import { useState, useEffect, useRef } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/sections/Footer";
import {
  Package,
  Users,
  Palette,
  Truck,
  MessageCircle,
  ArrowRight,
  Check,
  Phone,
  Mail,
  Building2,
  ShoppingBag,
  Star,
  Zap,
} from "lucide-react";

const tiers = [
  { range: "10–49 pcs", discount: "15% off", color: "#E9987A" },
  { range: "50–199 pcs", discount: "25% off", color: "#D4836A" },
  { range: "200–499 pcs", discount: "35% off", color: "#C06E56" },
  { range: "500+ pcs", discount: "Custom Quote", color: "#1F2937" },
];

const benefits = [
  { icon: Palette, title: "Full Customization", desc: "Screen print, DTG, sublimation, or embroidery — your choice." },
  { icon: Package, title: "Bulk Pricing", desc: "Deeper discounts the more you order. No hidden charges." },
  { icon: Users, title: "Dedicated Manager", desc: "A single point of contact from design approval to delivery." },
  { icon: Truck, title: "Pan-India Delivery", desc: "Fast shipping with tracking for bulk orders across India." },
];

const useCases = [
  "Corporate Events & Team Uniforms",
  "College Fests & Club Merch",
  "Sports Teams & Tournament Kits",
  "Brand Merchandise & Gifting",
  "Startups & Community Swag",
  "Reunion & Family Gatherings",
];

export default function BulkOrdersPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const [heroVis, setHeroVis] = useState(false);
  const [formVis, setFormVis] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    name: "", company: "", phone: "", email: "",
    productType: "", quantity: "", message: "",
  });

  useEffect(() => {
    const observe = (el: HTMLElement | null, cb: (v: boolean) => void, t = 0.1) => {
      if (!el) return;
      const o = new IntersectionObserver(
        ([e]) => { if (e.isIntersecting) { cb(true); o.disconnect(); } },
        { threshold: t }
      );
      o.observe(el);
      return () => o.disconnect();
    };
    observe(heroRef.current, setHeroVis);
    observe(formRef.current, setFormVis, 0.05);
  }, []);

  const handleSubmit = () => {
    // Record the inquiry on the backend, then continue to WhatsApp.
    void (async () => {
      try {
        const { api, toE164 } = await import("@/lib/api");
        await api.post("/contact", {
          name: form.name || "Bulk inquiry",
          ...(form.email ? { email: form.email } : {}),
          ...(form.phone.replace(/\D/g, "").length >= 10 ? { mobile: toE164(form.phone) } : {}),
          message:
            `[Bulk Order] Company: ${form.company || "—"}; Product: ${form.productType || "—"}; ` +
            `Quantity: ${form.quantity || "—"}; Details: ${form.message || "—"}`,
        });
      } catch { /* inquiry still reaches us via WhatsApp below */ }
    })();
    const msg = encodeURIComponent(
      `Hi! I'd like to place a bulk order:\n\nName: ${form.name}\nCompany: ${form.company}\nPhone: ${form.phone}\nEmail: ${form.email}\nProduct: ${form.productType}\nQuantity: ${form.quantity}\n\nDetails: ${form.message}`
    );
    window.open(`https://wa.me/919876543210?text=${msg}`, "_blank");
    setSubmitted(true);
  };

  return (
    <>
      <Navbar />
      <main style={{ backgroundColor: "#FFF8F3", paddingTop: 72, minHeight: "100vh" }}>

        {/* Hero */}
        <section ref={heroRef} style={{ maxWidth: 1200, margin: "0 auto", padding: "64px 28px 0" }}>
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: 56, alignItems: "center",
          }} className="bulk-hero-grid">
            <div style={{
              opacity: heroVis ? 1 : 0, transform: heroVis ? "translateY(0)" : "translateY(24px)",
              transition: "all 0.8s cubic-bezier(0.22,1,0.36,1)",
            }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 16px",
                backgroundColor: "rgba(233,152,122,0.08)", borderRadius: 50,
                fontSize: 12, fontWeight: 600, color: "#E9987A", marginBottom: 20,
                fontFamily: "var(--font-poppins), sans-serif", letterSpacing: 1, textTransform: "uppercase",
              }}>
                <Package size={13} /> Bulk Orders
              </div>
              <h1 style={{
                fontFamily: "var(--font-playfair), serif", fontSize: 46, fontWeight: 700,
                color: "#1F2937", margin: "0 0 16px", lineHeight: 1.15,
              }}>
                Custom Apparel<br />at <span style={{ color: "#E9987A" }}>Scale</span>
              </h1>
              <p style={{
                fontSize: 15, color: "#6B7280", lineHeight: 1.8, margin: "0 0 32px",
                fontFamily: "var(--font-poppins), sans-serif", maxWidth: 460,
              }}>
                From 10 pieces to 10,000 — get premium custom T-shirts, hoodies, polos, and jerseys
                with your branding. Bulk pricing, dedicated support, and fast turnaround.
              </p>

              {/* Pricing tiers */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, maxWidth: 380 }} className="bulk-tiers">
                {tiers.map((t, i) => (
                  <div key={t.range} style={{
                    padding: "14px 16px", borderRadius: 14, backgroundColor: "#fff",
                    border: "1px solid rgba(241,229,220,0.5)",
                    opacity: heroVis ? 1 : 0, transform: heroVis ? "translateY(0)" : "translateY(12px)",
                    transition: `all 0.5s cubic-bezier(0.22,1,0.36,1) ${0.3 + i * 0.06}s`,
                  }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: t.color, margin: "0 0 2px", fontFamily: "var(--font-poppins), sans-serif" }}>
                      {t.discount}
                    </p>
                    <p style={{ fontSize: 11.5, color: "#9CA3AF", margin: 0, fontFamily: "var(--font-poppins), sans-serif" }}>
                      {t.range}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Benefits cards */}
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14,
              opacity: heroVis ? 1 : 0, transform: heroVis ? "translateY(0)" : "translateY(24px)",
              transition: "all 0.8s cubic-bezier(0.22,1,0.36,1) 0.2s",
            }}>
              {benefits.map((b, i) => (
                <div key={b.title} className="bulk-benefit" style={{
                  padding: 22, backgroundColor: "#fff", borderRadius: 18,
                  border: "1px solid rgba(241,229,220,0.5)",
                  transition: "all 0.35s cubic-bezier(0.22,1,0.36,1)",
                }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 12,
                    background: "linear-gradient(135deg, rgba(246,180,154,0.12), rgba(233,152,122,0.08))",
                    display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14,
                  }}>
                    <b.icon size={20} color="#E9987A" strokeWidth={1.8} />
                  </div>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1F2937", margin: "0 0 4px", fontFamily: "var(--font-poppins), sans-serif" }}>
                    {b.title}
                  </h3>
                  <p style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.6, margin: 0, fontFamily: "var(--font-poppins), sans-serif" }}>
                    {b.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Use cases */}
        <section style={{ maxWidth: 1200, margin: "0 auto", padding: "64px 28px 0" }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "#E9987A", textTransform: "uppercase", letterSpacing: 2, margin: "0 0 8px", fontFamily: "var(--font-poppins), sans-serif" }}>
              Perfect For
            </p>
            <h2 style={{ fontFamily: "var(--font-playfair), serif", fontSize: 32, fontWeight: 700, color: "#1F2937", margin: 0 }}>
              Who Orders in Bulk?
            </h2>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", maxWidth: 700, margin: "0 auto" }}>
            {useCases.map((u) => (
              <div key={u} style={{
                display: "flex", alignItems: "center", gap: 8, padding: "12px 20px",
                backgroundColor: "#fff", borderRadius: 50,
                border: "1px solid rgba(241,229,220,0.5)",
                fontSize: 13, fontWeight: 500, color: "#4B5563",
                fontFamily: "var(--font-poppins), sans-serif",
              }}>
                <Check size={14} color="#E9987A" /> {u}
              </div>
            ))}
          </div>
        </section>

        {/* Quote form */}
        <section ref={formRef} style={{ maxWidth: 700, margin: "0 auto", padding: "72px 28px 100px" }}>
          <div style={{
            backgroundColor: "#fff", borderRadius: 28, border: "1px solid rgba(241,229,220,0.5)",
            padding: "36px 32px", boxShadow: "0 8px 40px rgba(0,0,0,0.04)",
            opacity: formVis ? 1 : 0, transform: formVis ? "translateY(0)" : "translateY(20px)",
            transition: "all 0.7s cubic-bezier(0.22,1,0.36,1)",
          }}>
            {submitted ? (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <div style={{
                  width: 64, height: 64, borderRadius: "50%", backgroundColor: "rgba(16,185,129,0.1)",
                  display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px",
                }}>
                  <Check size={28} color="#10B981" />
                </div>
                <h3 style={{ fontSize: 22, fontWeight: 700, color: "#1F2937", margin: "0 0 8px", fontFamily: "var(--font-poppins), sans-serif" }}>
                  Quote Request Sent!
                </h3>
                <p style={{ fontSize: 14, color: "#6B7280", margin: 0, fontFamily: "var(--font-poppins), sans-serif" }}>
                  We've opened WhatsApp for you. Our team will get back within 2 hours.
                </p>
              </div>
            ) : (
              <>
                <div style={{ textAlign: "center", marginBottom: 28 }}>
                  <h2 style={{ fontSize: 24, fontWeight: 700, color: "#1F2937", margin: "0 0 8px", fontFamily: "var(--font-poppins), sans-serif" }}>
                    Get a Free Quote
                  </h2>
                  <p style={{ fontSize: 13.5, color: "#9CA3AF", margin: 0, fontFamily: "var(--font-poppins), sans-serif" }}>
                    Fill in the details and we'll get back to you within 2 hours.
                  </p>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="bulk-form-grid">
                  {[
                    { key: "name", label: "Your Name", icon: Users, full: false, type: "text" },
                    { key: "company", label: "Company / Team", icon: Building2, full: false, type: "text" },
                    { key: "phone", label: "Phone Number", icon: Phone, full: false, type: "tel" },
                    { key: "email", label: "Email Address", icon: Mail, full: false, type: "email" },
                    { key: "productType", label: "Product Type (e.g. T-Shirts, Hoodies)", icon: ShoppingBag, full: true, type: "text" },
                    { key: "quantity", label: "Estimated Quantity", icon: Package, full: false, type: "text" },
                  ].map((f) => (
                    <div key={f.key} style={{ gridColumn: f.full ? "1 / -1" : undefined }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "#4B5563", marginBottom: 6, display: "block", fontFamily: "var(--font-poppins), sans-serif" }}>
                        {f.label}
                      </label>
                      <input
                        type={f.type}
                        value={form[f.key as keyof typeof form]}
                        onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                        className="bulk-input"
                        style={{
                          width: "100%", padding: "12px 16px", borderRadius: 12,
                          border: "1.5px solid rgba(241,229,220,0.7)", backgroundColor: "#FFF8F3",
                          fontSize: 13.5, color: "#1F2937", fontFamily: "var(--font-poppins), sans-serif",
                          outline: "none", transition: "border-color 0.3s ease",
                        }}
                      />
                    </div>
                  ))}
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#4B5563", marginBottom: 6, display: "block", fontFamily: "var(--font-poppins), sans-serif" }}>
                      Additional Details
                    </label>
                    <textarea
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      rows={3}
                      className="bulk-input"
                      placeholder="Colors, design ideas, deadline, etc."
                      style={{
                        width: "100%", padding: "12px 16px", borderRadius: 12,
                        border: "1.5px solid rgba(241,229,220,0.7)", backgroundColor: "#FFF8F3",
                        fontSize: 13.5, color: "#1F2937", fontFamily: "var(--font-poppins), sans-serif",
                        outline: "none", resize: "vertical", transition: "border-color 0.3s ease",
                      }}
                    />
                  </div>
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={!form.name || !form.phone || !form.quantity}
                  className="bulk-submit"
                  style={{
                    width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    padding: "16px 28px", marginTop: 20,
                    backgroundColor: "#25D366", color: "#fff",
                    fontSize: 15, fontWeight: 700, borderRadius: 14, border: "none",
                    cursor: "pointer", fontFamily: "var(--font-poppins), sans-serif",
                    boxShadow: "0 8px 28px rgba(37,211,102,0.3)",
                    transition: "all 0.35s cubic-bezier(0.22,1,0.36,1)",
                    opacity: !form.name || !form.phone || !form.quantity ? 0.5 : 1,
                  }}
                >
                  <MessageCircle size={16} /> Get Quote via WhatsApp <ArrowRight size={14} />
                </button>
              </>
            )}
          </div>
        </section>
      </main>
      <Footer />

      <style jsx global>{`
        .bulk-benefit:hover {
          border-color: rgba(233,152,122,0.3) !important;
          box-shadow: 0 8px 28px rgba(233,152,122,0.08);
          transform: translateY(-3px);
        }
        .bulk-input:focus { border-color: #E9987A !important; }
        .bulk-submit:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 12px 36px rgba(37,211,102,0.4) !important; }
        @media (max-width: 768px) {
          .bulk-hero-grid { grid-template-columns: 1fr !important; gap: 36px !important; }
          .bulk-form-grid { grid-template-columns: 1fr !important; }
          .bulk-tiers { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}
