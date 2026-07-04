"use client";

import { useState, useEffect, useRef } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/sections/Footer";
import {
  Heart,
  Sparkles,
  Users,
  Palette,
  Shield,
  Truck,
  ArrowRight,
  Star,
  Zap,
  Award,
} from "lucide-react";
import Link from "next/link";

const values = [
  { icon: Heart, title: "Quality First", desc: "Every garment is made with premium fabrics — 180–330 GSM cotton that holds up wash after wash." },
  { icon: Palette, title: "Creative Freedom", desc: "Your design, your rules. We bring any idea to life with precision printing and embroidery." },
  { icon: Users, title: "Customer Obsession", desc: "From solo orders to bulk runs — we treat every customer like our first." },
  { icon: Shield, title: "No Compromises", desc: "Strict QC at every stage. If it doesn't meet our standard, it doesn't leave our workshop." },
];

const stats = [
  { value: "50K+", label: "Happy Customers" },
  { value: "200+", label: "Corporate Clients" },
  { value: "1M+", label: "Garments Delivered" },
  { value: "4.8", label: "Average Rating", icon: Star },
];

const timeline = [
  { year: "2019", title: "The Beginning", desc: "Started as a small screen-printing workshop with a single press and a vision for premium custom apparel." },
  { year: "2020", title: "Going Digital", desc: "Invested in DTG & sublimation technology. Launched our first online store during the pandemic." },
  { year: "2021", title: "Scaling Up", desc: "Partnered with 50+ corporate clients. Expanded to a full production facility with embroidery capabilities." },
  { year: "2023", title: "Mexos Studio", desc: "Rebranded as Mexos Studio. Launched custom design tools and a premium product line for the modern creator." },
];

export default function AboutPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const valuesRef = useRef<HTMLDivElement>(null);
  const storyRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const [heroVis, setHeroVis] = useState(false);
  const [valuesVis, setValuesVis] = useState(false);
  const [storyVis, setStoryVis] = useState(false);
  const [ctaVis, setCtaVis] = useState(false);

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
    observe(valuesRef.current, setValuesVis);
    observe(storyRef.current, setStoryVis, 0.05);
    observe(ctaRef.current, setCtaVis);
  }, []);

  return (
    <>
      <Navbar />
      <main style={{ backgroundColor: "#FFF8F3", paddingTop: 72, minHeight: "100vh" }}>

        {/* ── Hero ── */}
        <section ref={heroRef} style={{ maxWidth: 1200, margin: "0 auto", padding: "72px 28px 64px", textAlign: "center" }}>
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
              <Sparkles size={13} /> Our Story
            </div>
            <h1 style={{
              fontFamily: "var(--font-playfair), serif", fontSize: 52, fontWeight: 700,
              color: "#1F2937", margin: "0 0 20px", lineHeight: 1.15,
            }}>
              We Make Apparel<br />
              <span style={{ color: "#E9987A" }}>Personal</span>
            </h1>
            <p style={{
              fontSize: 16, color: "#6B7280", lineHeight: 1.8, maxWidth: 600, margin: "0 auto 40px",
              fontFamily: "var(--font-poppins), sans-serif",
            }}>
              Mexos Studio was born from a simple belief — everyone deserves clothing that tells their story.
              We combine premium materials with cutting-edge printing to turn your ideas into wearable art.
            </p>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, maxWidth: 700, margin: "0 auto" }} className="about-stats-grid">
              {stats.map((s, i) => (
                <div key={s.label} style={{
                  padding: "24px 16px", backgroundColor: "#fff", borderRadius: 18,
                  border: "1px solid rgba(241,229,220,0.5)",
                  opacity: heroVis ? 1 : 0, transform: heroVis ? "translateY(0)" : "translateY(16px)",
                  transition: `all 0.6s cubic-bezier(0.22,1,0.36,1) ${0.3 + i * 0.08}s`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                    <span style={{ fontSize: 28, fontWeight: 800, color: "#1F2937", fontFamily: "var(--font-poppins), sans-serif" }}>
                      {s.value}
                    </span>
                    {s.icon && <s.icon size={16} fill="#FBBF24" color="#FBBF24" />}
                  </div>
                  <p style={{ fontSize: 12, color: "#9CA3AF", margin: "6px 0 0", fontFamily: "var(--font-poppins), sans-serif" }}>
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Values ── */}
        <section ref={valuesRef} style={{ maxWidth: 1200, margin: "0 auto", padding: "0 28px 80px" }}>
          <div style={{
            textAlign: "center", marginBottom: 44,
            opacity: valuesVis ? 1 : 0, transform: valuesVis ? "translateY(0)" : "translateY(18px)",
            transition: "all 0.7s cubic-bezier(0.22,1,0.36,1)",
          }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "#E9987A", textTransform: "uppercase", letterSpacing: 2, margin: "0 0 8px", fontFamily: "var(--font-poppins), sans-serif" }}>
              What Drives Us
            </p>
            <h2 style={{ fontFamily: "var(--font-playfair), serif", fontSize: 36, fontWeight: 700, color: "#1F2937", margin: 0 }}>
              Our Values
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }} className="about-values-grid">
            {values.map((v, i) => (
              <div
                key={v.title}
                className="about-value-card"
                style={{
                  padding: 28, backgroundColor: "#fff", borderRadius: 22,
                  border: "1px solid rgba(241,229,220,0.5)",
                  opacity: valuesVis ? 1 : 0, transform: valuesVis ? "translateY(0)" : "translateY(24px)",
                  transition: `all 0.6s cubic-bezier(0.22,1,0.36,1) ${0.1 + i * 0.08}s`,
                }}
              >
                <div style={{
                  width: 48, height: 48, borderRadius: 14,
                  background: "linear-gradient(135deg, rgba(246,180,154,0.15), rgba(233,152,122,0.1))",
                  display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18,
                }}>
                  <v.icon size={22} color="#E9987A" strokeWidth={1.8} />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1F2937", margin: "0 0 8px", fontFamily: "var(--font-poppins), sans-serif" }}>
                  {v.title}
                </h3>
                <p style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.7, margin: 0, fontFamily: "var(--font-poppins), sans-serif" }}>
                  {v.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Timeline ── */}
        <section ref={storyRef} style={{ maxWidth: 700, margin: "0 auto", padding: "0 28px 80px" }}>
          <div style={{
            textAlign: "center", marginBottom: 44,
            opacity: storyVis ? 1 : 0, transform: storyVis ? "translateY(0)" : "translateY(18px)",
            transition: "all 0.7s cubic-bezier(0.22,1,0.36,1)",
          }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "#E9987A", textTransform: "uppercase", letterSpacing: 2, margin: "0 0 8px", fontFamily: "var(--font-poppins), sans-serif" }}>
              Our Journey
            </p>
            <h2 style={{ fontFamily: "var(--font-playfair), serif", fontSize: 36, fontWeight: 700, color: "#1F2937", margin: 0 }}>
              The Mexos Timeline
            </h2>
          </div>
          <div style={{ position: "relative", paddingLeft: 40 }}>
            {/* Vertical line */}
            <div style={{
              position: "absolute", left: 14, top: 8, bottom: 8, width: 2,
              background: "linear-gradient(180deg, #E9987A, rgba(233,152,122,0.15))",
              borderRadius: 2,
            }} />
            {timeline.map((t, i) => (
              <div key={t.year} style={{
                position: "relative", marginBottom: i < timeline.length - 1 ? 36 : 0,
                opacity: storyVis ? 1 : 0, transform: storyVis ? "translateY(0)" : "translateY(16px)",
                transition: `all 0.6s cubic-bezier(0.22,1,0.36,1) ${0.2 + i * 0.12}s`,
              }}>
                {/* Dot */}
                <div style={{
                  position: "absolute", left: -33, top: 4,
                  width: 12, height: 12, borderRadius: "50%",
                  backgroundColor: "#E9987A", border: "3px solid #FFF8F3",
                  boxShadow: "0 0 0 2px rgba(233,152,122,0.2)",
                }} />
                <span style={{
                  fontSize: 12, fontWeight: 700, color: "#E9987A", letterSpacing: 1,
                  fontFamily: "var(--font-poppins), sans-serif",
                }}>
                  {t.year}
                </span>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: "#1F2937", margin: "4px 0 6px", fontFamily: "var(--font-poppins), sans-serif" }}>
                  {t.title}
                </h3>
                <p style={{ fontSize: 13.5, color: "#6B7280", lineHeight: 1.7, margin: 0, fontFamily: "var(--font-poppins), sans-serif" }}>
                  {t.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <section ref={ctaRef} style={{ maxWidth: 1200, margin: "0 auto", padding: "0 28px 100px" }}>
          <div style={{
            background: "linear-gradient(135deg, #1F2937 0%, #374151 100%)",
            borderRadius: 28, padding: "64px 48px", textAlign: "center",
            opacity: ctaVis ? 1 : 0, transform: ctaVis ? "translateY(0)" : "translateY(20px)",
            transition: "all 0.8s cubic-bezier(0.22,1,0.36,1)",
          }}>
            <h2 style={{
              fontFamily: "var(--font-playfair), serif", fontSize: 34, fontWeight: 700,
              color: "#fff", margin: "0 0 12px",
            }}>
              Ready to Create Something <span style={{ color: "#E9987A" }}>Amazing</span>?
            </h2>
            <p style={{
              fontSize: 15, color: "rgba(255,255,255,0.6)", lineHeight: 1.7, maxWidth: 500,
              margin: "0 auto 32px", fontFamily: "var(--font-poppins), sans-serif",
            }}>
              Whether you need one custom tee or 10,000 branded uniforms — we've got you covered.
            </p>
            <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/customize" style={{
                display: "inline-flex", alignItems: "center", gap: 8, padding: "15px 32px",
                backgroundColor: "#E9987A", color: "#fff", fontSize: 14, fontWeight: 700,
                borderRadius: 14, textDecoration: "none", fontFamily: "var(--font-poppins), sans-serif",
                boxShadow: "0 8px 28px rgba(233,152,122,0.35)",
                transition: "all 0.35s cubic-bezier(0.22,1,0.36,1)",
              }} className="about-cta-btn">
                <Palette size={16} /> Start Designing <ArrowRight size={14} />
              </Link>
              <Link href="/contact" style={{
                display: "inline-flex", alignItems: "center", gap: 8, padding: "15px 32px",
                backgroundColor: "rgba(255,255,255,0.08)", color: "#fff", fontSize: 14, fontWeight: 600,
                borderRadius: 14, textDecoration: "none", border: "1px solid rgba(255,255,255,0.15)",
                fontFamily: "var(--font-poppins), sans-serif",
                transition: "all 0.35s ease",
              }} className="about-cta-outline">
                Get in Touch
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />

      <style jsx global>{`
        .about-value-card:hover {
          border-color: rgba(233,152,122,0.35) !important;
          box-shadow: 0 12px 40px rgba(233,152,122,0.1);
          transform: translateY(-4px) !important;
        }
        .about-cta-btn:hover { transform: translateY(-2px); box-shadow: 0 12px 36px rgba(233,152,122,0.45) !important; }
        .about-cta-outline:hover { background-color: rgba(255,255,255,0.15) !important; }
        @media (max-width: 768px) {
          .about-stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .about-values-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 480px) {
          .about-stats-grid { grid-template-columns: 1fr !important; }
          .about-values-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}
