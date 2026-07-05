"use client";

import { useState, useEffect, useRef } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/sections/Footer";
import {
  Search,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  Box,
  ArrowRight,
  MapPin,
  MessageCircle,
  Copy,
  Check,
} from "lucide-react";

import { api, toE164, ApiError } from "@/lib/api";
import { WHATSAPP_NUMBER } from "@/lib/utils";

/* ── tracking view model (built from GET /orders/track) ── */
interface TrackingData {
  orderId: string;
  date: string;
  items: { name: string; qty: number; color: string; size: string }[];
  total: number;
  currentStage: number;
  trackingNumber: string;
  estimatedDelivery: string;
  stages: { label: string; desc: string; time: string; done: boolean }[];
}

const STAGE_DEFS = [
  { status: "CONFIRMED", label: "Order Confirmed", desc: "Order confirmed successfully" },
  { status: "IN_PRODUCTION", label: "In Production", desc: "Your custom items are being prepared" },
  { status: "PACKED", label: "Packed", desc: "Order packed and ready for pickup" },
  { status: "SHIPPED", label: "Shipped", desc: "In transit to your address" },
  { status: "DELIVERED", label: "Delivered", desc: "Package delivered to your doorstep" },
];

interface BackendTrackedOrder {
  id: string;
  status: string;
  total: string;
  createdAt: string;
  items: { name: string; quantity: number; color: string | null; size: string | null }[];
  statusHistory: { status: string; createdAt: string }[];
}

function toTrackingData(o: BackendTrackedOrder): TrackingData {
  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  const historyByStatus = new Map(o.statusHistory.map((h) => [h.status, h.createdAt]));
  const reachedIdx = STAGE_DEFS.findIndex((s) => s.status === o.status);
  const stages = STAGE_DEFS.map((s, i) => {
    const time = historyByStatus.get(s.status);
    return {
      label: s.label,
      desc: s.desc,
      time: time ? fmtTime(time) : "",
      done: reachedIdx >= 0 ? i <= reachedIdx : false,
    };
  });
  return {
    orderId: o.id,
    date: new Date(o.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }),
    items: o.items.map((it) => ({ name: it.name, qty: it.quantity, color: it.color ?? "—", size: it.size ?? "—" })),
    total: Number(o.total),
    currentStage: Math.max(reachedIdx, 0),
    trackingNumber: o.id.slice(0, 8).toUpperCase(),
    estimatedDelivery: o.status === "DELIVERED" ? "Delivered" : "5–7 days from confirmation",
    stages,
  };
}

const stageIcons = [CheckCircle2, Box, Package, Truck, MapPin];

export default function TrackPage() {
  const [orderId, setOrderId] = useState("");
  const [phone, setPhone] = useState("");
  const [tracked, setTracked] = useState(false);
  const [copied, setCopied] = useState(false);
  const [data, setData] = useState<TrackingData | null>(null);
  const [trackError, setTrackError] = useState("");
  const [trackLoading, setTrackLoading] = useState(false);

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

  const handleTrack = async () => {
    if (!orderId.trim() || !phone.trim()) {
      setTrackError("Enter both the Order ID and the mobile number used at checkout.");
      return;
    }
    setTrackLoading(true);
    setTrackError("");
    try {
      const order = await api.get<BackendTrackedOrder>(
        `/orders/track?orderId=${encodeURIComponent(orderId.trim())}&mobile=${encodeURIComponent(toE164(phone))}`,
      );
      setData(toTrackingData(order));
      setTracked(true);
    } catch (e) {
      setTrackError(
        e instanceof ApiError && e.status === 404
          ? "No order found for that ID and mobile number."
          : e instanceof ApiError
            ? e.message
            : "Could not look up the order. Try again.",
      );
    } finally {
      setTrackLoading(false);
    }
  };

  const copyTrackingNumber = () => {
    if (data) navigator.clipboard.writeText(data.orderId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <Navbar />
      <main ref={sectionRef} style={{ backgroundColor: "#FFF8F3", paddingTop: 72, minHeight: "100vh" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 28px 100px" }}>
          {/* Header */}
          <div
            style={{
              textAlign: "center", marginBottom: 40,
              opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(18px)",
              transition: "all 0.7s cubic-bezier(0.22,1,0.36,1)",
            }}
          >
            <p style={{ fontSize: 12, fontWeight: 600, color: "#E9987A", textTransform: "uppercase", letterSpacing: 2, margin: "0 0 8px", fontFamily: "var(--font-poppins), sans-serif" }}>
              Order Status
            </p>
            <h1 className="track-heading" style={{ fontFamily: "var(--font-playfair), 'Playfair Display', serif", fontSize: 36, fontWeight: 700, color: "#1F2937", margin: 0 }}>
              Track Your Order
            </h1>
          </div>

          {/* Search card */}
          {!tracked && (
            <div
              style={{
                backgroundColor: "#fff", borderRadius: 22, border: "1px solid rgba(241,229,220,0.5)",
                padding: "36px 32px", boxShadow: "0 4px 24px rgba(0,0,0,0.03)",
                opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(14px)",
                transition: "all 0.7s cubic-bezier(0.22,1,0.36,1) 0.15s",
              }}
            >
              <p style={{ fontSize: 14, color: "#6B7280", margin: "0 0 24px", fontFamily: "var(--font-poppins), sans-serif", textAlign: "center" }}>
                Enter your Order ID and mobile number to check status.
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }} className="track-inputs">
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#1F2937", display: "block", margin: "0 0 8px", fontFamily: "var(--font-poppins), sans-serif" }}>Order ID</label>
                  <input
                    type="text"
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    placeholder="Paste your Order ID"
                    style={{ ...inputStyle }}
                    className="track-input"
                  />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#1F2937", display: "block", margin: "0 0 8px", fontFamily: "var(--font-poppins), sans-serif" }}>Mobile Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 99999 99999"
                    style={{ ...inputStyle }}
                    className="track-input"
                  />
                </div>
              </div>

              {trackError && (
                <p style={{ fontSize: 13, color: "#DC2626", margin: "0 0 14px", textAlign: "center", fontFamily: "var(--font-poppins), sans-serif" }}>
                  {trackError}
                </p>
              )}
              <button
                type="button"
                onClick={() => void handleTrack()}
                disabled={!orderId.trim() || trackLoading}
                className="track-btn"
                style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  padding: "15px", borderRadius: 14,
                  backgroundColor: orderId.trim() ? "#E9987A" : "#E5E7EB",
                  color: orderId.trim() ? "#fff" : "#9CA3AF",
                  fontSize: 15, fontWeight: 700, border: "none",
                  cursor: orderId.trim() ? "pointer" : "not-allowed",
                  fontFamily: "var(--font-poppins), sans-serif",
                  boxShadow: orderId.trim() ? "0 8px 28px rgba(233,152,122,0.35)" : "none",
                  transition: "all 0.35s cubic-bezier(0.22,1,0.36,1)",
                }}
              >
                <Search size={16} /> {trackLoading ? "Looking up…" : "Track Order"}
              </button>
            </div>
          )}

          {/* Tracking Result */}
          {tracked && data && (
            <div
              style={{
                opacity: vis ? 1 : 0,
                transform: vis ? "translateY(0)" : "translateY(14px)",
                transition: "all 0.7s cubic-bezier(0.22,1,0.36,1) 0.1s",
              }}
            >
              {/* Order summary card */}
              <div style={{
                backgroundColor: "#fff", borderRadius: 22, border: "1px solid rgba(241,229,220,0.5)",
                padding: "28px 28px", marginBottom: 24,
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 1, margin: "0 0 4px", fontFamily: "var(--font-poppins), sans-serif" }}>Order ID</p>
                    <p style={{ fontSize: 18, fontWeight: 800, color: "#1F2937", margin: 0, fontFamily: "var(--font-poppins), sans-serif" }}>{data.orderId}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontSize: 11, color: "#9CA3AF", margin: "0 0 4px", fontFamily: "var(--font-poppins), sans-serif" }}>Placed on</p>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#1F2937", margin: 0, fontFamily: "var(--font-poppins), sans-serif" }}>{data.date}</p>
                  </div>
                </div>

                {/* Items */}
                <div style={{ borderTop: "1px solid rgba(241,229,220,0.4)", padding: "16px 0" }}>
                  {data.items.map((item, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                      <span style={{ fontSize: 13, color: "#6B7280", fontFamily: "var(--font-poppins), sans-serif" }}>
                        {item.name} <span style={{ color: "#9CA3AF" }}>({item.color}, {item.size})</span>
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#1F2937", fontFamily: "var(--font-poppins), sans-serif" }}>x{item.qty}</span>
                    </div>
                  ))}
                </div>

                {/* Total + Courier */}
                <div style={{ borderTop: "1px solid rgba(241,229,220,0.4)", paddingTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: "#1F2937", fontFamily: "var(--font-poppins), sans-serif" }}>₹{data.total.toLocaleString()}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12, color: "#9CA3AF", fontFamily: "var(--font-poppins), sans-serif" }}>
                      Ref: <span style={{ fontWeight: 600, color: "#1F2937" }}>{data.trackingNumber}</span>
                    </span>
                    <button type="button" onClick={copyTrackingNumber} title="Copy full Order ID" style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", display: "flex" }}>
                      {copied ? <Check size={13} color="#10B981" /> : <Copy size={13} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* ── TIMELINE ── */}
              <div style={{
                backgroundColor: "#fff", borderRadius: 22, border: "1px solid rgba(241,229,220,0.5)",
                padding: "32px 28px", marginBottom: 24,
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1F2937", margin: 0, fontFamily: "var(--font-playfair), serif" }}>Tracking Timeline</h2>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Clock size={13} color="#E9987A" />
                    <span style={{ fontSize: 12, color: "#6B7280", fontFamily: "var(--font-poppins), sans-serif" }}>
                      Est. delivery: <span style={{ fontWeight: 600, color: "#1F2937" }}>{data.estimatedDelivery}</span>
                    </span>
                  </div>
                </div>

                <div className="track-timeline" style={{ position: "relative", paddingLeft: 32 }}>
                  {/* Vertical line */}
                  <div style={{
                    position: "absolute", left: 15, top: 8, bottom: 8,
                    width: 2, backgroundColor: "rgba(241,229,220,0.5)",
                  }}>
                    {/* Filled portion */}
                    <div style={{
                      width: 2,
                      height: `${(data.currentStage / (data.stages.length - 1)) * 100}%`,
                      backgroundColor: "#E9987A",
                      borderRadius: 1,
                      transition: "height 0.8s ease",
                    }} />
                  </div>

                  {data.stages.map((stage, i) => {
                    const Icon = stageIcons[i];
                    const isCurrent = i === data.currentStage;
                    const isDone = stage.done;

                    return (
                      <div
                        key={i}
                        style={{
                          position: "relative",
                          paddingBottom: i < data.stages.length - 1 ? 32 : 0,
                          paddingLeft: 24,
                        }}
                      >
                        {/* Node */}
                        <div
                          className={isCurrent ? "track-node-pulse" : ""}
                          style={{
                            position: "absolute",
                            left: -32,
                            top: 2,
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            backgroundColor: isDone ? "#E9987A" : isCurrent ? "#E9987A" : "#fff",
                            border: isDone || isCurrent ? "none" : "2px solid rgba(241,229,220,0.5)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow: isCurrent ? "0 0 0 6px rgba(233,152,122,0.15)" : "none",
                            transition: "all 0.4s ease",
                          }}
                        >
                          <Icon
                            size={14}
                            color={isDone || isCurrent ? "#fff" : "#9CA3AF"}
                            strokeWidth={2}
                          />
                        </div>

                        {/* Content */}
                        <div>
                          <p style={{
                            fontSize: 14,
                            fontWeight: isDone || isCurrent ? 700 : 500,
                            color: isDone || isCurrent ? "#1F2937" : "#9CA3AF",
                            margin: "0 0 4px",
                            fontFamily: "var(--font-poppins), sans-serif",
                          }}>
                            {stage.label}
                          </p>
                          <p style={{ fontSize: 12.5, color: "#6B7280", margin: "0 0 2px", fontFamily: "var(--font-poppins), sans-serif" }}>
                            {stage.desc}
                          </p>
                          {stage.time && (
                            <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0, fontFamily: "var(--font-poppins), sans-serif" }}>
                              {stage.time}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 12 }} className="track-actions">
                <a
                  href={`https://wa.me/${WHATSAPP_NUMBER}?text=Hi!%20I%20need%20help%20with%20my%20order`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="track-whatsapp"
                  style={{
                    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    padding: "14px", borderRadius: 14,
                    border: "1.5px solid #25D366", backgroundColor: "#fff", color: "#25D366",
                    fontSize: 14, fontWeight: 600, fontFamily: "var(--font-poppins), sans-serif",
                    cursor: "pointer", textDecoration: "none", transition: "all 0.3s ease",
                  }}
                >
                  <MessageCircle size={16} /> Need Help?
                </a>
                <button
                  onClick={() => setTracked(false)}
                  style={{
                    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    padding: "14px", borderRadius: 14,
                    border: "1.5px solid rgba(241,229,220,0.7)", backgroundColor: "#fff", color: "#4B5563",
                    fontSize: 14, fontWeight: 600, fontFamily: "var(--font-poppins), sans-serif",
                    cursor: "pointer", transition: "all 0.3s ease",
                  }}
                  className="track-another"
                >
                  <Search size={15} /> Track Another
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />

      <style jsx global>{`
        .track-input:focus { border-color: #E9987A !important; }
        .track-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 12px 36px rgba(233,152,122,0.4) !important; }
        .track-whatsapp:hover { background-color: #25D366 !important; color: #fff !important; }
        .track-another:hover { border-color: rgba(233,152,122,0.4) !important; }
        @keyframes nodePulse {
          0%, 100% { box-shadow: 0 0 0 6px rgba(233,152,122,0.15); }
          50% { box-shadow: 0 0 0 10px rgba(233,152,122,0.08); }
        }
        .track-node-pulse { animation: nodePulse 2s ease-in-out infinite; }
        @media (max-width: 640px) {
          .track-inputs { grid-template-columns: 1fr !important; }
          .track-actions { flex-direction: column; }
          .track-heading { font-size: 28px !important; }
          .track-timeline { padding-left: 24px !important; }
        }
        @media (max-width: 480px) {
          .track-heading { font-size: 24px !important; }
          .track-timeline { padding-left: 20px !important; }
        }
      `}</style>
    </>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "13px 16px", borderRadius: 14,
  border: "1.5px solid rgba(241,229,220,0.7)", backgroundColor: "#FFF8F3",
  fontSize: 14, color: "#1F2937", fontFamily: "var(--font-poppins), sans-serif",
  outline: "none", transition: "border-color 0.3s",
};
