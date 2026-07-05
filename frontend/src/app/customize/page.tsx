"use client";

import { useState, useEffect, useRef } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/sections/Footer";
import {
  Upload,
  X,
  MessageCircle,
  ShoppingBag,
  Palette,
  Shirt,
  Ruler,
  Layers,
  Sparkles,
  ArrowRight,
  Check,
  FileImage,
  Info,
} from "lucide-react";
import { WHATSAPP_NUMBER } from "@/lib/utils";

const shirtTypes = [
  { id: "round-neck", label: "Round Neck Tee", price: 499, icon: "👕" },
  { id: "oversized", label: "Oversized Tee", price: 699, icon: "👔" },
  { id: "hoodie", label: "Pullover Hoodie", price: 1299, icon: "🧥" },
  { id: "polo", label: "Polo Shirt", price: 799, icon: "👚" },
  { id: "jersey", label: "Sports Jersey", price: 899, icon: "🎽" },
];

const sizes = ["S", "M", "L", "XL", "XXL", "3XL"];
const colors = [
  { name: "Black", hex: "#1F2937" },
  { name: "White", hex: "#FFFFFF" },
  { name: "Peach", hex: "#E9987A" },
  { name: "Navy", hex: "#1E3A5F" },
  { name: "Grey", hex: "#9CA3AF" },
  { name: "Olive", hex: "#3B5249" },
  { name: "Maroon", hex: "#7C2D12" },
  { name: "Custom", hex: "linear-gradient(135deg, #E9987A, #F6B49A, #FBBF24, #10B981)" },
];

const printTypes = [
  { id: "dtg", label: "DTG Print", desc: "Photo-quality digital prints" },
  { id: "screen", label: "Screen Print", desc: "Best for bulk orders" },
  { id: "embroidery", label: "Embroidery", desc: "Premium stitched logos" },
  { id: "sublimation", label: "Sublimation", desc: "Full-coverage all-over prints" },
];

const placements = [
  { id: "front-center", label: "Front Center" },
  { id: "front-left", label: "Front Left Chest" },
  { id: "back", label: "Full Back" },
  { id: "sleeve", label: "Sleeve" },
  { id: "all-over", label: "All Over" },
];

export default function CustomizePage() {
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedSizes, setSelectedSizes] = useState<Record<string, number>>({});
  const [selectedColor, setSelectedColor] = useState(0);
  const [selectedPrint, setSelectedPrint] = useState<string | null>(null);
  const [selectedPlacement, setSelectedPlacement] = useState<string | null>(null);
  const [designDesc, setDesignDesc] = useState("");
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [fileObj, setFileObj] = useState<File | null>(null);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [deadline, setDeadline] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState("");

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

  const toggleSize = (size: string) => {
    setSelectedSizes((prev) => {
      const copy = { ...prev };
      if (copy[size]) { delete copy[size]; } else { copy[size] = 1; }
      return copy;
    });
  };

  const updateQty = (size: string, delta: number) => {
    setSelectedSizes((prev) => {
      const copy = { ...prev };
      const next = (copy[size] || 1) + delta;
      if (next <= 0) delete copy[size]; else copy[size] = next;
      return copy;
    });
  };

  const totalQty = Object.values(selectedSizes).reduce((a, b) => a + b, 0);
  const basePrice = shirtTypes.find((t) => t.id === selectedType)?.price || 0;
  const estimatedTotal = basePrice * totalQty;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file.name);
      setFileObj(file);
    }
  };

  /**
   * Create the custom order on the backend: draft → (optional design upload via
   * presigned URL) → submit. Returns the order id, or null on failure.
   */
  const createCustomOrder = async (): Promise<string | null> => {
    if (!contactName.trim() || contactPhone.replace(/\D/g, "").length < 10) {
      setSubmitError("Please add your name and a valid 10-digit phone number in step 4.");
      return null;
    }
    setSubmitting(true);
    setSubmitError("");
    try {
      const { api, toE164, tokenStore } = await import("@/lib/api");
      const type = shirtTypes.find((t) => t.id === selectedType)?.label || selectedType || "T-Shirt";
      const color = colors[selectedColor]?.name || "";
      const print = printTypes.find((p) => p.id === selectedPrint);
      const placement = placements.find((p) => p.id === selectedPlacement);
      const sizeBreakdown = Object.entries(selectedSizes).map(([s, q]) => `${s}:${q}`).join(", ");
      const loggedIn = tokenStore.isLoggedIn;

      const created = await api.post<{ id: string }>(
        "/custom-orders",
        {
          baseType: type,
          size: sizeBreakdown || "M:1",
          quantity: totalQty || 1,
          color,
          printPlacement: placement?.label,
          // Backend distinguishes print vs embroidery; the specific technique
          // (DTG/screen/sublimation) is captured in the description.
          printType: selectedPrint === "embroidery" ? "embroidery" : "print",
          designDescription:
            `${designDesc ? `${designDesc}\n` : ""}Print style: ${print?.label ?? "—"}; Sizes: ${sizeBreakdown}` +
            (deadline ? `; Deadline: ${deadline}` : ""),
          ...(deadline ? { deliveryDeadline: new Date(deadline).toISOString() } : {}),
          contactName: contactName.trim(),
          contactMobile: toE164(contactPhone),
          pricingMode: "INSTANT",
        },
        { auth: loggedIn },
      );

      // Best-effort design upload (works with real S3; stub storage skips silently).
      if (fileObj) {
        try {
          const up = await api.post<{ uploadUrl: string; key: string }>(
            `/custom-orders/${created.id}/upload-url`,
            { fileName: fileObj.name, contentType: fileObj.type, fileSize: fileObj.size },
            { auth: loggedIn },
          );
          await fetch(up.uploadUrl, { method: "PUT", headers: { "Content-Type": fileObj.type }, body: fileObj });
          await api.patch(`/custom-orders/${created.id}/attach-file`, { uploadedFileKey: up.key }, { auth: loggedIn });
        } catch { /* design intent is still captured in the description */ }
      }

      await api.post(`/custom-orders/${created.id}/submit`, undefined, { auth: loggedIn });
      setSubmittedRef(created.id);
      return created.id;
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Could not save your design. Try again.");
      return null;
    } finally {
      setSubmitting(false);
    }
  };

  const [showSuccess, setShowSuccess] = useState(false);

  const orderOnline = async () => {
    const id = await createCustomOrder();
    if (id) {
      setShowSuccess(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const orderViaWhatsApp = async () => {
    const id = await createCustomOrder();
    // Open WhatsApp with the full brief either way; include the reference when saved.
    const ref = id ? `\nReference: ${id.slice(0, 8).toUpperCase()}` : "";
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${buildWhatsAppMsg()}${encodeURIComponent(ref)}`, "_blank");
  };

  const buildWhatsAppMsg = () => {
    const type = shirtTypes.find((t) => t.id === selectedType)?.label || "";
    const color = colors[selectedColor]?.name || "";
    const print = printTypes.find((p) => p.id === selectedPrint)?.label || "";
    const placement = placements.find((p) => p.id === selectedPlacement)?.label || "";
    const sizeBreakdown = Object.entries(selectedSizes).map(([s, q]) => `${s}: ${q}`).join(", ");

    return encodeURIComponent(
      `Hi! I'd like to place a custom order:\n\n` +
      `Type: ${type}\n` +
      `Color: ${color}\n` +
      `Print: ${print}\n` +
      `Placement: ${placement}\n` +
      `Sizes & Qty: ${sizeBreakdown}\n` +
      `Total Qty: ${totalQty}\n` +
      (designDesc ? `Design Notes: ${designDesc}\n` : "") +
      (uploadedFile ? `Design File: ${uploadedFile}\n` : "") +
      (deadline ? `Deadline: ${deadline}\n` : "") +
      `\nName: ${contactName}\nPhone: ${contactPhone}\n` +
      `\nEstimated Total: ₹${estimatedTotal.toLocaleString()}\n` +
      `\nPlease confirm pricing and timeline.`
    );
  };

  const canProceed = (s: number) => {
    if (s === 1) return !!selectedType;
    if (s === 2) return totalQty > 0;
    if (s === 3) return !!selectedPrint && !!selectedPlacement;
    return true;
  };

  const stepLabels = ["Base", "Size & Color", "Print Style", "Design & Contact"];

  return (
    <>
      <Navbar />
      <main ref={sectionRef} style={{ backgroundColor: "#FFF8F3", paddingTop: 72, minHeight: "100vh" }}>
        {showSuccess && (
          <div style={{
            maxWidth: 860, margin: "0 auto", padding: "48px 28px 0",
            textAlign: "center",
          }}>
            <div style={{
              backgroundColor: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: 16,
              padding: "32px 24px", marginBottom: 32,
            }}>
              <Check size={40} color="#10B981" style={{ marginBottom: 12 }} />
              <h2 style={{ fontFamily: "var(--font-playfair), serif", fontSize: 24, fontWeight: 700, color: "#065F46", margin: "0 0 8px" }}>
                Order Submitted!
              </h2>
              <p style={{ fontSize: 14, color: "#047857", margin: 0, fontFamily: "var(--font-poppins), sans-serif" }}>
                Your custom design order has been received. We&apos;ll reach out via WhatsApp shortly with a quote.
                {submittedRef && <><br />Reference: <strong>{submittedRef.slice(0, 8).toUpperCase()}</strong></>}
              </p>
            </div>
          </div>
        )}
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "48px 28px 100px" }}>
          {/* Header */}
          <div style={{
            textAlign: "center", marginBottom: 44,
            opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(18px)",
            transition: "all 0.7s cubic-bezier(0.22,1,0.36,1)",
          }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 50, backgroundColor: "rgba(246,180,154,0.08)", border: "1px solid rgba(246,180,154,0.18)", marginBottom: 16 }}>
              <Palette size={12} color="#E9987A" />
              <span style={{ fontSize: 11, fontWeight: 600, color: "#E9987A", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "var(--font-poppins), sans-serif" }}>
                Custom Studio
              </span>
            </div>
            <h1 className="custom-heading" style={{ fontFamily: "var(--font-playfair), 'Playfair Display', serif", fontSize: 40, fontWeight: 700, color: "#1F2937", margin: "0 0 10px" }}>
              Design Your Own
            </h1>
            <p style={{ fontSize: 15, color: "#6B7280", fontFamily: "var(--font-poppins), sans-serif", maxWidth: 480, margin: "0 auto" }}>
              Configure your perfect custom apparel and order online or via WhatsApp.
            </p>
          </div>

          {/* Step indicator */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 0, marginBottom: 44,
            opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(14px)",
            transition: "all 0.7s cubic-bezier(0.22,1,0.36,1) 0.1s",
          }}>
            {stepLabels.map((label, i) => {
              const s = i + 1;
              const active = step === s;
              const done = step > s;
              return (
                <div key={s} style={{ display: "flex", alignItems: "center" }}>
                  <div
                    onClick={() => (done || active) && setStep(s)}
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: done || active ? "pointer" : "default",
                    }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%",
                      backgroundColor: done ? "#E9987A" : active ? "#E9987A" : "rgba(241,229,220,0.5)",
                      color: done || active ? "#fff" : "#9CA3AF",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 13, fontWeight: 700, fontFamily: "var(--font-poppins), sans-serif",
                      transition: "all 0.3s ease",
                    }}>
                      {done ? <Check size={16} /> : s}
                    </div>
                    <span style={{ fontSize: 10.5, fontWeight: active ? 600 : 400, color: active ? "#E9987A" : "#9CA3AF", fontFamily: "var(--font-poppins), sans-serif", whiteSpace: "nowrap" }}>
                      {label}
                    </span>
                  </div>
                  {i < 3 && (
                    <div style={{ width: 48, height: 2, backgroundColor: done ? "#E9987A" : "rgba(241,229,220,0.5)", margin: "0 8px", marginBottom: 20, borderRadius: 1, transition: "background 0.3s" }} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Step content card */}
          <div style={{
            backgroundColor: "#fff", borderRadius: 22, border: "1px solid rgba(241,229,220,0.5)",
            padding: "36px 32px", marginBottom: 32,
            boxShadow: "0 4px 24px rgba(0,0,0,0.03)",
            opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(14px)",
            transition: "all 0.7s cubic-bezier(0.22,1,0.36,1) 0.2s",
          }}>
            {/* STEP 1: Base type */}
            {step === 1 && (
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1F2937", margin: "0 0 6px", fontFamily: "var(--font-playfair), serif" }}>
                  Choose Your Base
                </h2>
                <p style={{ fontSize: 13.5, color: "#6B7280", margin: "0 0 24px", fontFamily: "var(--font-poppins), sans-serif" }}>
                  Select the apparel type you want to customize.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
                  {shirtTypes.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedType(t.id)}
                      className="custom-type-btn"
                      style={{
                        padding: "20px 16px", borderRadius: 16, textAlign: "center",
                        border: selectedType === t.id ? "2px solid #E9987A" : "1.5px solid rgba(241,229,220,0.6)",
                        backgroundColor: selectedType === t.id ? "rgba(233,152,122,0.04)" : "transparent",
                        cursor: "pointer", transition: "all 0.3s ease",
                      }}
                    >
                      <span style={{ fontSize: 28, display: "block", marginBottom: 8 }}>{t.icon}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#1F2937", display: "block", fontFamily: "var(--font-poppins), sans-serif" }}>{t.label}</span>
                      <span style={{ fontSize: 12, color: "#E9987A", fontWeight: 600, fontFamily: "var(--font-poppins), sans-serif" }}>from ₹{t.price}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 2: Size & Color */}
            {step === 2 && (
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1F2937", margin: "0 0 6px", fontFamily: "var(--font-playfair), serif" }}>
                  Size & Color
                </h2>
                <p style={{ fontSize: 13.5, color: "#6B7280", margin: "0 0 24px", fontFamily: "var(--font-poppins), sans-serif" }}>
                  Select sizes and quantities, then pick a base color.
                </p>

                {/* Sizes */}
                <p style={{ fontSize: 13, fontWeight: 600, color: "#1F2937", margin: "0 0 12px", fontFamily: "var(--font-poppins), sans-serif" }}>Sizes & Quantity</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 28 }}>
                  {sizes.map((s) => {
                    const active = selectedSizes[s] !== undefined;
                    return (
                      <div key={s} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <button
                          onClick={() => toggleSize(s)}
                          style={{
                            width: 46, height: 46, borderRadius: 12,
                            border: active ? "2px solid #E9987A" : "1.5px solid rgba(241,229,220,0.7)",
                            backgroundColor: active ? "rgba(233,152,122,0.06)" : "transparent",
                            fontSize: 13, fontWeight: active ? 700 : 500, color: active ? "#E9987A" : "#4B5563",
                            fontFamily: "var(--font-poppins), sans-serif", cursor: "pointer", transition: "all 0.25s ease",
                          }}
                        >
                          {s}
                        </button>
                        {active && (
                          <div style={{ display: "flex", alignItems: "center", gap: 4, borderRadius: 8, border: "1px solid rgba(241,229,220,0.5)", overflow: "hidden" }}>
                            <button onClick={() => updateQty(s, -1)} style={{ width: 28, height: 28, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#6B7280" }}>−</button>
                            <span style={{ fontSize: 12, fontWeight: 600, color: "#1F2937", width: 20, textAlign: "center", fontFamily: "var(--font-poppins), sans-serif" }}>{selectedSizes[s]}</span>
                            <button onClick={() => updateQty(s, 1)} style={{ width: 28, height: 28, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#6B7280" }}>+</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Colors */}
                <p style={{ fontSize: 13, fontWeight: 600, color: "#1F2937", margin: "0 0 12px", fontFamily: "var(--font-poppins), sans-serif" }}>
                  Base Color: <span style={{ fontWeight: 400, color: "#6B7280" }}>{colors[selectedColor]?.name}</span>
                </p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {colors.map((c, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedColor(i)}
                      style={{
                        width: 38, height: 38, borderRadius: 10,
                        background: c.name === "Custom" ? c.hex : c.hex,
                        border: selectedColor === i ? "2.5px solid #E9987A" : c.hex === "#FFFFFF" ? "1.5px solid #E5E7EB" : "1.5px solid transparent",
                        cursor: "pointer", position: "relative",
                        boxShadow: selectedColor === i ? "0 0 0 3px rgba(233,152,122,0.2)" : "none",
                        transition: "all 0.25s ease",
                      }}
                    >
                      {selectedColor === i && c.name !== "Custom" && (
                        <Check size={14} color={c.hex === "#FFFFFF" ? "#1F2937" : "#fff"} style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)" }} />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 3: Print style */}
            {step === 3 && (
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1F2937", margin: "0 0 6px", fontFamily: "var(--font-playfair), serif" }}>
                  Print Style & Placement
                </h2>
                <p style={{ fontSize: 13.5, color: "#6B7280", margin: "0 0 24px", fontFamily: "var(--font-poppins), sans-serif" }}>
                  How should your design be applied?
                </p>

                <p style={{ fontSize: 13, fontWeight: 600, color: "#1F2937", margin: "0 0 12px", fontFamily: "var(--font-poppins), sans-serif" }}>Print Type</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 28 }} className="print-grid">
                  {printTypes.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPrint(p.id)}
                      className="print-type-btn"
                      style={{
                        padding: "16px 18px", borderRadius: 14, textAlign: "left",
                        border: selectedPrint === p.id ? "2px solid #E9987A" : "1.5px solid rgba(241,229,220,0.6)",
                        backgroundColor: selectedPrint === p.id ? "rgba(233,152,122,0.04)" : "transparent",
                        cursor: "pointer", transition: "all 0.3s ease",
                      }}
                    >
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: "#1F2937", display: "block", fontFamily: "var(--font-poppins), sans-serif" }}>{p.label}</span>
                      <span style={{ fontSize: 11.5, color: "#9CA3AF", fontFamily: "var(--font-poppins), sans-serif" }}>{p.desc}</span>
                    </button>
                  ))}
                </div>

                <p style={{ fontSize: 13, fontWeight: 600, color: "#1F2937", margin: "0 0 12px", fontFamily: "var(--font-poppins), sans-serif" }}>Placement</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {placements.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPlacement(p.id)}
                      style={{
                        padding: "9px 18px", borderRadius: 50,
                        border: selectedPlacement === p.id ? "1.5px solid #E9987A" : "1.5px solid rgba(241,229,220,0.7)",
                        backgroundColor: selectedPlacement === p.id ? "rgba(233,152,122,0.08)" : "transparent",
                        fontSize: 12.5, fontWeight: selectedPlacement === p.id ? 600 : 500,
                        color: selectedPlacement === p.id ? "#E9987A" : "#4B5563",
                        fontFamily: "var(--font-poppins), sans-serif", cursor: "pointer", transition: "all 0.3s ease",
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 4: Design & Contact */}
            {step === 4 && (
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1F2937", margin: "0 0 6px", fontFamily: "var(--font-playfair), serif" }}>
                  Your Design & Details
                </h2>
                <p style={{ fontSize: 13.5, color: "#6B7280", margin: "0 0 24px", fontFamily: "var(--font-poppins), sans-serif" }}>
                  Describe your design or upload artwork, and provide contact info.
                </p>

                {/* Design description */}
                <label style={{ fontSize: 13, fontWeight: 600, color: "#1F2937", display: "block", margin: "0 0 8px", fontFamily: "var(--font-poppins), sans-serif" }}>
                  Design Description
                </label>
                <textarea
                  value={designDesc}
                  onChange={(e) => setDesignDesc(e.target.value)}
                  placeholder="Describe your design idea, text, colors, style references..."
                  rows={4}
                  style={{
                    width: "100%", padding: "14px 16px", borderRadius: 14,
                    border: "1.5px solid rgba(241,229,220,0.7)", backgroundColor: "#FFF8F3",
                    fontSize: 13.5, color: "#1F2937", fontFamily: "var(--font-poppins), sans-serif",
                    outline: "none", resize: "vertical", transition: "border-color 0.3s",
                    marginBottom: 20,
                  }}
                  className="custom-textarea"
                />

                {/* File upload */}
                <label style={{ fontSize: 13, fontWeight: 600, color: "#1F2937", display: "block", margin: "0 0 8px", fontFamily: "var(--font-poppins), sans-serif" }}>
                  Upload Design <span style={{ fontWeight: 400, color: "#9CA3AF" }}>(optional)</span>
                </label>
                <div
                  style={{
                    padding: "28px 20px", borderRadius: 14,
                    border: "2px dashed rgba(233,152,122,0.3)", backgroundColor: "rgba(255,245,235,0.3)",
                    textAlign: "center", cursor: "pointer", marginBottom: 20,
                    transition: "all 0.3s ease",
                  }}
                  className="upload-zone"
                >
                  {uploadedFile ? (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                      <FileImage size={18} color="#E9987A" />
                      <span style={{ fontSize: 13, fontWeight: 500, color: "#1F2937", fontFamily: "var(--font-poppins), sans-serif" }}>{uploadedFile}</span>
                      <button onClick={() => setUploadedFile(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", display: "flex" }}>
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <label style={{ cursor: "pointer" }}>
                      <Upload size={24} color="#E9987A" style={{ marginBottom: 8 }} />
                      <p style={{ fontSize: 13, color: "#6B7280", margin: 0, fontFamily: "var(--font-poppins), sans-serif" }}>
                        Click to upload image or PDF
                      </p>
                      <p style={{ fontSize: 11, color: "#9CA3AF", margin: "4px 0 0", fontFamily: "var(--font-poppins), sans-serif" }}>
                        PNG, JPG, SVG, PDF up to 25MB
                      </p>
                      <input type="file" accept="image/*,.pdf,.svg" onChange={handleFileChange} style={{ display: "none" }} />
                    </label>
                  )}
                </div>

                {/* Contact fields */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }} className="contact-grid">
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "#1F2937", display: "block", margin: "0 0 8px", fontFamily: "var(--font-poppins), sans-serif" }}>Name</label>
                    <input
                      type="text" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Your name"
                      style={{ ...inputStyle }} className="custom-input"
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "#1F2937", display: "block", margin: "0 0 8px", fontFamily: "var(--font-poppins), sans-serif" }}>Phone</label>
                    <input
                      type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+91 99999 99999"
                      style={{ ...inputStyle }} className="custom-input"
                    />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#1F2937", display: "block", margin: "0 0 8px", fontFamily: "var(--font-poppins), sans-serif" }}>
                    Delivery Deadline <span style={{ fontWeight: 400, color: "#9CA3AF" }}>(optional)</span>
                  </label>
                  <input
                    type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)}
                    style={{ ...inputStyle }} className="custom-input"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Price summary + nav buttons */}
          <div
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
              opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(14px)",
              transition: "all 0.7s cubic-bezier(0.22,1,0.36,1) 0.3s",
            }}
            className="custom-footer-bar"
          >
            {/* Price estimate */}
            {totalQty > 0 && basePrice > 0 && (
              <div>
                <p style={{ fontSize: 11, color: "#9CA3AF", margin: "0 0 2px", fontFamily: "var(--font-poppins), sans-serif" }}>Estimated Total</p>
                <p style={{ fontSize: 24, fontWeight: 800, color: "#1F2937", margin: 0, fontFamily: "var(--font-poppins), sans-serif" }}>
                  ₹{estimatedTotal.toLocaleString()}
                  <span style={{ fontSize: 12, fontWeight: 400, color: "#9CA3AF", marginLeft: 6 }}>({totalQty} pcs)</span>
                </p>
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginLeft: "auto" }}>
              {step > 1 && (
                <button
                  onClick={() => setStep(step - 1)}
                  style={{
                    padding: "14px 24px", borderRadius: 14,
                    border: "1.5px solid rgba(241,229,220,0.7)", backgroundColor: "#fff",
                    fontSize: 14, fontWeight: 600, color: "#4B5563",
                    fontFamily: "var(--font-poppins), sans-serif", cursor: "pointer",
                    transition: "all 0.3s ease",
                  }}
                  className="custom-back-btn"
                >
                  Back
                </button>
              )}

              {step < 4 ? (
                <button
                  onClick={() => canProceed(step) && setStep(step + 1)}
                  disabled={!canProceed(step)}
                  className="custom-next-btn"
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "14px 28px", borderRadius: 14,
                    backgroundColor: canProceed(step) ? "#E9987A" : "#E5E7EB",
                    color: canProceed(step) ? "#fff" : "#9CA3AF",
                    fontSize: 14, fontWeight: 600, border: "none", cursor: canProceed(step) ? "pointer" : "not-allowed",
                    fontFamily: "var(--font-poppins), sans-serif",
                    boxShadow: canProceed(step) ? "0 8px 28px rgba(233,152,122,0.35)" : "none",
                    transition: "all 0.35s ease",
                  }}
                >
                  Continue <ArrowRight size={15} />
                </button>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-end" }}>
                  {submittedRef && (
                    <p style={{ fontSize: 13, color: "#10B981", margin: 0, fontFamily: "var(--font-poppins), sans-serif", fontWeight: 600 }}>
                      ✓ Design saved! Reference {submittedRef.slice(0, 8).toUpperCase()} — estimated ₹{estimatedTotal.toLocaleString()}, final quote on WhatsApp. View it in your account&apos;s Saved Designs.
                    </p>
                  )}
                  {submitError && (
                    <p style={{ fontSize: 13, color: "#DC2626", margin: 0, fontFamily: "var(--font-poppins), sans-serif" }}>{submitError}</p>
                  )}
                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      type="button"
                      onClick={() => void orderOnline()}
                      disabled={submitting}
                      className="custom-checkout-btn"
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "14px 28px", backgroundColor: "#E9987A", color: "#fff",
                        fontSize: 14, fontWeight: 700, borderRadius: 14, border: "none",
                        cursor: "pointer", fontFamily: "var(--font-poppins), sans-serif",
                        boxShadow: "0 8px 28px rgba(233,152,122,0.35)",
                        transition: "all 0.35s ease", opacity: submitting ? 0.6 : 1,
                      }}
                    >
                      <ShoppingBag size={16} /> {submitting ? "Saving…" : "Save & Get Quote"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void orderViaWhatsApp()}
                      disabled={submitting}
                      className="custom-whatsapp-btn"
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "14px 24px", backgroundColor: "#25D366", color: "#fff",
                        fontSize: 14, fontWeight: 700, borderRadius: 14, border: "none",
                        cursor: "pointer", fontFamily: "var(--font-poppins), sans-serif",
                        boxShadow: "0 8px 28px rgba(37,211,102,0.3)",
                        transition: "all 0.35s ease", opacity: submitting ? 0.6 : 1,
                      }}
                    >
                      <MessageCircle size={16} /> Order via WhatsApp
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />

      <style jsx global>{`
        .custom-type-btn:hover { border-color: rgba(233,152,122,0.5) !important; }
        .custom-textarea:focus, .custom-input:focus { border-color: #E9987A !important; }
        .upload-zone:hover { border-color: rgba(233,152,122,0.5) !important; background-color: rgba(255,245,235,0.5) !important; }
        .custom-next-btn:hover:not(:disabled) { transform: translateY(-2px); }
        .custom-back-btn:hover { border-color: rgba(233,152,122,0.4) !important; }
        .custom-checkout-btn:hover { transform: translateY(-2px); box-shadow: 0 12px 36px rgba(233,152,122,0.4) !important; }
        .custom-whatsapp-btn:hover { transform: translateY(-2px); box-shadow: 0 12px 36px rgba(37,211,102,0.4) !important; }
        .print-type-btn:hover { border-color: rgba(233,152,122,0.5) !important; }
        @media (max-width: 640px) {
          .print-grid { grid-template-columns: 1fr !important; }
          .contact-grid { grid-template-columns: 1fr !important; }
          .custom-footer-bar { flex-direction: column; align-items: stretch !important; }
          .custom-step-bar { overflow-x: auto; gap: 4px !important; }
          .custom-step-bar > div { min-width: fit-content; }
        }
        @media (max-width: 480px) {
          .color-grid { grid-template-columns: repeat(5, 1fr) !important; }
          .custom-heading { font-size: 24px !important; }
        }
      `}</style>
    </>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "13px 16px", borderRadius: 14,
  border: "1.5px solid rgba(241,229,220,0.7)", backgroundColor: "#FFF8F3",
  fontSize: 13.5, color: "#1F2937", fontFamily: "var(--font-poppins), sans-serif",
  outline: "none", transition: "border-color 0.3s",
};
