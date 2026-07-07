"use client";

import { useState, useRef } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/sections/Footer";
import {
  Upload, X, MessageCircle, ShoppingBag, Sparkles, Wand2, Type as TypeIcon,
  Shirt, Palette, Eye, Check, ArrowRight, ArrowLeft, RotateCw,
} from "lucide-react";
import { WHATSAPP_NUMBER } from "@/lib/utils";

// ── Catalogue (mirrors the on-shirt builder design) ──────────────────────────
const STYLES = [
  { id: "oversized", label: "Oversized Tee", fabric: "240 GSM combed cotton", price: 400, shape: "tee" as const, boxy: true },
  { id: "regular", label: "Regular Tee", fabric: "190 GSM bio-washed cotton", price: 300, shape: "tee" as const, boxy: false },
  { id: "hoodie", label: "Hoodie", fabric: "380 GSM brushed fleece", price: 500, shape: "hoodie" as const, boxy: true },
  { id: "polo", label: "Polo", fabric: "220 GSM piqué", price: 350, shape: "polo" as const, boxy: false },
];

const COLOURS = [
  { name: "White", hex: "#FFFFFF" },
  { name: "Black", hex: "#1A1A1A" },
  { name: "Beige", hex: "#E7DAC4" },
  { name: "Blue", hex: "#2B4C8C" },
  { name: "Green", hex: "#2E5E3A" },
  { name: "Red", hex: "#9E2B2B" },
];

const TEMPLATES = ["🔥", "💀", "⭐", "⚡", "❤️", "👑", "🐦", "🚀"];

const FONTS = [
  { id: "display", label: "Display", css: "'Arial Black', Impact, sans-serif", weight: 900 },
  { id: "clean", label: "Clean", css: "var(--font-poppins), sans-serif", weight: 700 },
  { id: "mono", label: "Mono", css: "'Courier New', monospace", weight: 700 },
  { id: "serif", label: "Serif", css: "Georgia, 'Times New Roman', serif", weight: 700 },
];

const TEXT_COLOURS = ["#FFFFFF", "#111111", "#E9987A", "#FBBF24", "#2B4C8C", "#9E2B2B", "#5B3A29"];
const SIZES = ["S", "M", "L", "XL", "XXL", "3XL"];
const STEP_LABELS = ["Style", "Colour", "Design", "Text", "Preview", "Order"];

// ── Helpers ──────────────────────────────────────────────────────────────────
function isLight(hex: string): boolean {
  const h = hex.replace("#", "");
  if (h.length < 6) return true;
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b > 150;
}
function isHex(v: string): boolean {
  return /^#?[0-9a-fA-F]{6}$/.test(v.trim());
}
function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

type ArtKind = "upload" | "template" | "ai";
interface Art { kind: ArtKind; url?: string; label: string }
type Side = "front" | "back";
type View = "front" | "back" | "360";

// ── Garment SVG (recolours; tee / hoodie / polo, front & back) ────────────────
const TEE_FRONT =
  "M106,44 C120,64 180,64 194,44 L232,58 C286,86 292,120 286,132 L300,158 C276,176 250,168 236,152 L236,306 C236,318 228,322 218,322 L82,322 C72,322 64,318 64,306 L64,152 C50,168 24,176 0,158 L14,132 C8,120 14,86 68,58 Z";
const TEE_BACK =
  "M106,44 C120,54 180,54 194,44 L232,58 C286,86 292,120 286,132 L300,158 C276,176 250,168 236,152 L236,306 C236,318 228,322 218,322 L82,322 C72,322 64,318 64,306 L64,152 C50,168 24,176 0,158 L14,132 C8,120 14,86 68,58 Z";
const COLLAR_FRONT = "M106,44 C120,64 180,64 194,44";
const COLLAR_BACK = "M106,44 C120,54 180,54 194,44";
const HEM = "M66,308 C120,300 180,300 234,308";

function GarmentSVG({ shape, side, color, boxy }: { shape: string; side: Side; color: string; boxy: boolean }) {
  const light = isLight(color);
  const outline = light ? "rgba(0,0,0,0.24)" : "rgba(0,0,0,0.42)";
  const seam = light ? "rgba(0,0,0,0.14)" : "rgba(0,0,0,0.30)";
  const body = side === "back" ? TEE_BACK : TEE_FRONT;
  const collar = side === "back" ? COLLAR_BACK : COLLAR_FRONT;
  // Oversized/boxy widens the garment slightly.
  const sx = boxy ? 1.06 : 1;
  return (
    <svg viewBox="0 0 300 340" width="100%" height="100%" style={{ display: "block" }} aria-hidden="true">
      <defs>
        <linearGradient id="mx-sheen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity={light ? 0 : 0.1} />
          <stop offset="0.55" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.12" />
        </linearGradient>
      </defs>
      <g transform={`translate(${150 - 150 * sx},0) scale(${sx},1)`}>
        {shape === "hoodie" && side !== "back" && (
          <path d="M104,46 C108,8 192,8 196,46 C176,40 124,40 104,46 Z" fill={color} stroke={outline} strokeWidth={3} strokeLinejoin="round" />
        )}
        <path d={body} fill={color} stroke={outline} strokeWidth={3} strokeLinejoin="round" />
        <path d={body} fill="url(#mx-sheen)" stroke="none" />
        <path d={collar} fill="none" stroke={seam} strokeWidth={2.6} />
        {side !== "back" && <path d={collar.replace("44", "50")} fill="none" stroke={seam} strokeWidth={1.6} opacity={0.7} />}
        <path d={HEM} fill="none" stroke={seam} strokeWidth={1.6} />
        {shape === "hoodie" && side !== "back" && (
          <>
            <path d="M98,232 L202,232 L212,296 L88,296 Z" fill="none" stroke={seam} strokeWidth={2} strokeLinejoin="round" />
            <line x1="140" y1="52" x2="136" y2="120" stroke={seam} strokeWidth={3} strokeLinecap="round" />
            <line x1="160" y1="52" x2="164" y2="120" stroke={seam} strokeWidth={3} strokeLinecap="round" />
          </>
        )}
        {shape === "polo" && side !== "back" && (
          <>
            <path d="M150,48 L122,54 L140,78 Z" fill={color} stroke={outline} strokeWidth={2.4} strokeLinejoin="round" />
            <path d="M150,48 L178,54 L160,78 Z" fill={color} stroke={outline} strokeWidth={2.4} strokeLinejoin="round" />
            <rect x="143" y="52" width="14" height="60" rx="3" fill="none" stroke={seam} strokeWidth={2} />
            <circle cx="150" cy="70" r="2.4" fill={seam} />
            <circle cx="150" cy="92" r="2.4" fill={seam} />
          </>
        )}
      </g>
    </svg>
  );
}

export default function CustomizePage() {
  const [step, setStep] = useState(1);

  // Selections
  const [styleId, setStyleId] = useState("oversized");
  const [colour, setColour] = useState(COLOURS[1]); // Black default
  const [customHex, setCustomHex] = useState("");
  const [applyTo, setApplyTo] = useState<Side>("front");

  // Art per side
  const [frontArt, setFrontArt] = useState<Art | null>(null);
  const [backArt, setBackArt] = useState<Art | null>(null);
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");

  // Text
  const [text, setText] = useState("");
  const [font, setFont] = useState("display");
  const [textColour, setTextColour] = useState("#FFFFFF");
  const [align, setAlign] = useState<"left" | "center" | "right">("center");

  // Preview
  const [view, setView] = useState<View>("front");
  const [rotation, setRotation] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [artPos, setArtPos] = useState({ front: { x: 0, y: 0 }, back: { x: 0, y: 0 } });
  const [textPos, setTextPos] = useState({ x: 0, y: 0 });

  // Order
  const [sizeQty, setSizeQty] = useState<Record<string, number>>({ M: 1 });
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ type: "art" | "text" | "rotate"; sx: number; sy: number; ox: number; oy: number; base: number } | null>(null);

  const style = STYLES.find((s) => s.id === styleId)!;
  const effectiveColour = isHex(customHex) ? (customHex.startsWith("#") ? customHex : `#${customHex}`) : colour.hex;
  const colourName = isHex(customHex) ? effectiveColour.toUpperCase() : colour.name;
  const totalQty = Object.values(sizeQty).reduce((a, b) => a + b, 0);
  const estimatedTotal = style.price * (totalQty || 0);
  const rotY = view === "front" ? 0 : view === "back" ? 180 : rotation;
  const currentArt = applyTo === "front" ? frontArt : backArt;

  // ── Drag (overlays in front/back; garment rotation in 360) ──
  function overlayDown(type: "art" | "text", e: React.PointerEvent) {
    if (view === "360") return;
    e.stopPropagation();
    const cur = type === "text" ? textPos : view === "back" ? artPos.back : artPos.front;
    dragRef.current = { type, sx: e.clientX, sy: e.clientY, ox: cur.x, oy: cur.y, base: 0 };
    setDragging(true);
    stageRef.current?.setPointerCapture(e.pointerId);
  }
  function stageDown(e: React.PointerEvent) {
    if (view !== "360") return;
    dragRef.current = { type: "rotate", sx: e.clientX, sy: e.clientY, ox: 0, oy: 0, base: rotation };
    setDragging(true);
    stageRef.current?.setPointerCapture(e.pointerId);
  }
  function stageMove(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d) return;
    if (d.type === "rotate") {
      setRotation((((d.base + (e.clientX - d.sx)) % 360) + 360) % 360);
      return;
    }
    const nx = clamp(d.ox + (e.clientX - d.sx), -96, 96);
    const ny = clamp(d.oy + (e.clientY - d.sy), -84, 96);
    if (d.type === "text") setTextPos({ x: nx, y: ny });
    else if (view === "back") setArtPos((p) => ({ ...p, back: { x: nx, y: ny } }));
    else setArtPos((p) => ({ ...p, front: { x: nx, y: ny } }));
  }
  function stageUp() {
    dragRef.current = null;
    setDragging(false);
  }

  // ── File upload → dataURL preview + File for backend ──
  function onUpload(side: Side, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const art: Art = { kind: "upload", url: String(reader.result), label: file.name };
      if (side === "front") { setFrontArt(art); setFrontFile(file); } else { setBackArt(art); setBackFile(file); }
    };
    reader.readAsDataURL(file);
  }
  function pickTemplate(emoji: string) {
    const art: Art = { kind: "template", label: emoji };
    if (applyTo === "front") { setFrontArt(art); setFrontFile(null); } else { setBackArt(art); setBackFile(null); }
  }
  function generateAI() {
    if (!aiPrompt.trim()) return;
    // No image-generation backend: the preview shows a stylised placeholder of the
    // brief; the studio produces the real artwork from the prompt (also saved in
    // the order description). This keeps the preview honest, not a fake render.
    const art: Art = { kind: "ai", label: aiPrompt.trim() };
    if (applyTo === "front") { setFrontArt(art); setFrontFile(null); } else { setBackArt(art); setBackFile(null); }
  }
  function clearArt(side: Side) {
    if (side === "front") { setFrontArt(null); setFrontFile(null); } else { setBackArt(null); setBackFile(null); }
  }

  function setSize(sz: string, delta: number) {
    setSizeQty((prev) => {
      const copy = { ...prev };
      const next = (copy[sz] || 0) + delta;
      if (next <= 0) delete copy[sz]; else copy[sz] = next;
      return copy;
    });
  }

  // ── Backend: draft → (upload art) → submit → quote/WhatsApp ──
  const createCustomOrder = async (): Promise<string | null> => {
    if (!contactName.trim() || contactPhone.replace(/\D/g, "").length < 10) {
      setSubmitError("Please add your name and a valid 10-digit phone number.");
      return null;
    }
    if (totalQty < 1) {
      setSubmitError("Please choose at least one size and quantity.");
      return null;
    }
    setSubmitting(true);
    setSubmitError("");
    try {
      const { api, toE164, tokenStore } = await import("@/lib/api");
      const loggedIn = tokenStore.isLoggedIn;
      const sizeBreakdown = Object.entries(sizeQty).map(([s, q]) => `${s}:${q}`).join(", ");
      const bits: string[] = [];
      const artDesc = (a: Art | null) =>
        !a ? null : a.kind === "template" ? `template ${a.label}` : a.kind === "ai" ? `AI art — "${a.label}"` : `uploaded "${a.label}"`;
      const fa = artDesc(frontArt); if (fa) bits.push(`Front: ${fa}`);
      const ba = artDesc(backArt); if (ba) bits.push(`Back: ${ba}`);
      if (text.trim()) bits.push(`Text: "${text.trim()}" (${FONTS.find((f) => f.id === font)?.label}, ${align}, ${textColour})`);

      const created = await api.post<{ id: string; guestToken?: string }>(
        "/custom-orders",
        {
          baseType: style.label,
          size: sizeBreakdown || "M:1",
          quantity: totalQty || 1,
          color: colourName,
          printPlacement: applyTo === "back" ? "Full Back" : "Front Center",
          printType: "print",
          designDescription:
            `Custom builder — ${style.label} (${style.fabric}); colour ${colourName}. ` +
            (bits.length ? bits.join("; ") : "No art or text added"),
          contactName: contactName.trim(),
          contactMobile: toE164(contactPhone),
          pricingMode: "INSTANT",
        },
        { auth: loggedIn },
      );

      const guestHeaders: Record<string, string> = created.guestToken
        ? { "X-Guest-Custom-Order-Token": created.guestToken }
        : {};

      const fileToUpload = frontFile || backFile;
      if (fileToUpload) {
        try {
          const up = await api.post<{ uploadUrl: string; key: string }>(
            `/custom-orders/${created.id}/upload-url`,
            { fileName: fileToUpload.name, contentType: fileToUpload.type, fileSize: fileToUpload.size },
            { auth: loggedIn, headers: guestHeaders },
          );
          await fetch(up.uploadUrl, { method: "PUT", headers: { "Content-Type": fileToUpload.type }, body: fileToUpload });
          await api.patch(`/custom-orders/${created.id}/attach-file`, { uploadedFileKey: up.key }, { auth: loggedIn, headers: guestHeaders });
        } catch { /* design intent still captured in the description */ }
      }

      await api.post(`/custom-orders/${created.id}/submit`, undefined, { auth: loggedIn, headers: guestHeaders });
      setSubmittedRef(created.id);
      return created.id;
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Could not save your design. Try again.");
      return null;
    } finally {
      setSubmitting(false);
    }
  };

  const orderOnline = async () => {
    const id = await createCustomOrder();
    if (id) { setShowSuccess(true); window.scrollTo({ top: 0, behavior: "smooth" }); }
  };
  const orderViaWhatsApp = async () => {
    const id = await createCustomOrder();
    const msg =
      `Hi! I designed a custom piece in the builder:\n\n` +
      `Style: ${style.label} (${style.fabric})\n` +
      `Colour: ${colourName}\n` +
      `Sizes: ${Object.entries(sizeQty).map(([s, q]) => `${s}×${q}`).join(", ")}\n` +
      (frontArt ? `Front: ${frontArt.kind === "ai" ? `AI "${frontArt.label}"` : frontArt.label}\n` : "") +
      (backArt ? `Back: ${backArt.kind === "ai" ? `AI "${backArt.label}"` : backArt.label}\n` : "") +
      (text.trim() ? `Text: "${text.trim()}"\n` : "") +
      `Estimated: ₹${estimatedTotal.toLocaleString()}\n` +
      (id ? `\nReference: ${id.slice(0, 8).toUpperCase()}\n` : "") +
      `\nPlease confirm pricing and timeline.`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const canProceed = (s: number) => {
    if (s === 1) return !!styleId;
    return true;
  };

  // ── Overlay renderer (art + text within the print area) ──
  function renderArt(side: Side) {
    const art = side === "front" ? frontArt : backArt;
    if (!art) return null;
    const pos = side === "back" ? artPos.back : artPos.front;
    const common: React.CSSProperties = {
      position: "absolute", left: "50%", top: "42%",
      transform: `translate(-50%,-50%) translate(${pos.x}px,${pos.y}px)`,
      cursor: view === "360" ? "grab" : "move", touchAction: "none", userSelect: "none",
    };
    if (art.kind === "template") {
      return <div style={{ ...common, fontSize: "clamp(48px, 22%, 96px)", lineHeight: 1 }} onPointerDown={(e) => overlayDown("art", e)}>{art.label}</div>;
    }
    if (art.kind === "ai") {
      return (
        <div style={{ ...common, width: "44%", aspectRatio: "1", borderRadius: 16, background: "linear-gradient(135deg,#7c3aed,#ec4899,#f59e0b)", display: "flex", alignItems: "center", justifyContent: "center", padding: 10, boxShadow: "0 6px 20px rgba(0,0,0,0.25)" }} onPointerDown={(e) => overlayDown("art", e)}>
          <span style={{ color: "#fff", fontSize: 11, fontWeight: 700, textAlign: "center", fontFamily: "var(--font-poppins), sans-serif", textShadow: "0 1px 3px rgba(0,0,0,0.4)", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}>✨ {art.label}</span>
        </div>
      );
    }
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={art.url} alt="design" draggable={false} style={{ ...common, width: "44%", objectFit: "contain", filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.25))" }} onPointerDown={(e) => overlayDown("art", e)} />
    );
  }
  function renderText() {
    if (!text.trim()) return null;
    const f = FONTS.find((x) => x.id === font)!;
    return (
      <div
        onPointerDown={(e) => overlayDown("text", e)}
        style={{
          position: "absolute", left: "50%", top: "58%",
          transform: `translate(-50%,-50%) translate(${textPos.x}px,${textPos.y}px)`,
          maxWidth: "82%", textAlign: align, color: textColour, fontFamily: f.css, fontWeight: f.weight,
          fontSize: "clamp(16px, 7%, 30px)", lineHeight: 1.05, cursor: view === "360" ? "grab" : "move",
          touchAction: "none", userSelect: "none", whiteSpace: "pre-wrap", wordBreak: "break-word",
          textShadow: isLight(textColour) ? "0 1px 2px rgba(0,0,0,0.35)" : "none",
        }}
      >
        {text}
      </div>
    );
  }

  // ── Live preview panel (garment + overlays + view switch + summary) ──
  const preview = (
    <div style={{ backgroundColor: "#fff", borderRadius: 20, border: "1px solid rgba(241,229,220,0.7)", padding: 20, boxShadow: "0 8px 30px rgba(0,0,0,0.05)" }}>
      <div style={{ position: "relative", perspective: 1200 }}>
        <span style={{ position: "absolute", top: 10, left: 10, zIndex: 3, background: "#111", color: "#fff", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", padding: "4px 9px", borderRadius: 6, fontFamily: "var(--font-poppins), sans-serif" }}>
          {view === "back" ? "BACK" : view === "360" ? `${Math.round(rotY)}°` : "FRONT"}
        </span>
        <div
          ref={stageRef}
          onPointerDown={stageDown}
          onPointerMove={stageMove}
          onPointerUp={stageUp}
          onPointerCancel={stageUp}
          style={{
            position: "relative", width: "100%", aspectRatio: "1 / 1", background: "#F7F5F2",
            borderRadius: 14, touchAction: "none", cursor: view === "360" ? "ew-resize" : "default", overflow: "hidden",
          }}
        >
          <div style={{ position: "absolute", inset: 0, transformStyle: "preserve-3d", transform: `rotateY(${rotY}deg)`, transition: dragging ? "none" : "transform 0.5s cubic-bezier(0.22,1,0.36,1)" }}>
            {/* FRONT face */}
            <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", padding: "6% 8%" }}>
              <GarmentSVG shape={style.shape} side="front" color={effectiveColour} boxy={style.boxy} />
              {renderArt("front")}
              {renderText()}
            </div>
            {/* BACK face */}
            <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: "rotateY(180deg)", padding: "6% 8%" }}>
              <GarmentSVG shape={style.shape} side="back" color={effectiveColour} boxy={style.boxy} />
              {renderArt("back")}
            </div>
          </div>
        </div>
      </div>

      {/* View switch */}
      <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 14 }}>
        {([["front", "Front"], ["back", "Back"], ["360", "360°"]] as const).map(([v, lbl]) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 5, padding: "8px 14px", borderRadius: 10,
              border: view === v ? "1.5px solid #E9987A" : "1.5px solid rgba(241,229,220,0.9)",
              background: view === v ? "rgba(233,152,122,0.06)" : "#fff",
              color: view === v ? "#E9987A" : "#4B5563", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
              fontFamily: "var(--font-poppins), sans-serif", transition: "all 0.2s",
            }}
          >
            {v === "360" && <RotateCw size={13} />} {lbl}
          </button>
        ))}
      </div>

      {view === "360" && (
        <input
          type="range" min={0} max={360} value={rotation} aria-label="Rotate garment"
          onChange={(e) => setRotation(Number(e.target.value))}
          style={{ width: "100%", marginTop: 12, accentColor: "#E9987A" }}
        />
      )}

      {/* Summary */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16, paddingTop: 14, borderTop: "1px solid rgba(241,229,220,0.7)" }}>
        <div>
          <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: "#1F2937", fontFamily: "var(--font-poppins), sans-serif" }}>Custom {style.label}</p>
          <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "#9CA3AF", fontFamily: "var(--font-poppins), sans-serif" }}>{colourName} · {style.fabric}</p>
        </div>
        <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#E9987A", fontFamily: "var(--font-poppins), sans-serif" }}>₹{style.price}</p>
      </div>
    </div>
  );

  const sectionTitle = (icon: React.ReactNode, title: string) => (
    <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 18 }}>
      <span style={{ color: "#E9987A", display: "flex" }}>{icon}</span>
      <h2 style={{ fontSize: 19, fontWeight: 700, color: "#1F2937", margin: 0, fontFamily: "var(--font-playfair), serif" }}>{title}</h2>
    </div>
  );

  return (
    <>
      <Navbar />
      <main style={{ backgroundColor: "#F7F5F2", paddingTop: 72, minHeight: "100vh" }}>
        {showSuccess && (
          <div style={{ maxWidth: 1180, margin: "0 auto", padding: "36px 24px 0" }}>
            <div style={{ backgroundColor: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: 16, padding: "24px 22px", display: "flex", alignItems: "center", gap: 14 }}>
              <Check size={30} color="#10B981" />
              <div>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#065F46", fontFamily: "var(--font-playfair), serif" }}>Order submitted!</p>
                <p style={{ margin: "3px 0 0", fontSize: 13, color: "#047857", fontFamily: "var(--font-poppins), sans-serif" }}>
                  We&apos;ll confirm your quote on WhatsApp shortly.
                  {submittedRef && <> Reference <strong>{submittedRef.slice(0, 8).toUpperCase()}</strong>.</>}
                </p>
              </div>
            </div>
          </div>
        )}

        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "32px 24px 90px" }}>
          {/* Header */}
          <div style={{ marginBottom: 22 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <Sparkles size={14} color="#E9987A" />
              <span style={{ fontSize: 11, fontWeight: 700, color: "#E9987A", letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: "var(--font-poppins), sans-serif" }}>Custom Builder</span>
            </div>
            <h1 style={{ fontFamily: "var(--font-playfair), 'Playfair Display', serif", fontSize: 38, fontWeight: 800, color: "#1F2937", margin: 0 }}>Design your own fit</h1>
          </div>

          {/* Stepper */}
          <div className="mx-stepper" style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 26, overflowX: "auto", paddingBottom: 4 }}>
            {STEP_LABELS.map((label, i) => {
              const s = i + 1;
              const active = step === s;
              const done = step > s;
              return (
                <div key={label} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => (done || active) && setStep(s)}
                    disabled={!done && !active}
                    style={{ display: "inline-flex", alignItems: "center", gap: 8, border: "none", background: "transparent", cursor: done || active ? "pointer" : "default", padding: "2px 2px" }}
                  >
                    <span style={{ width: 26, height: 26, borderRadius: "50%", background: done || active ? "#E9987A" : "#E7E1DA", color: done || active ? "#fff" : "#9CA3AF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, fontFamily: "var(--font-poppins), sans-serif", flexShrink: 0 }}>
                      {done ? <Check size={14} /> : s}
                    </span>
                    <span style={{ fontSize: 13.5, fontWeight: active ? 700 : 500, color: active ? "#1F2937" : done ? "#4B5563" : "#9CA3AF", fontFamily: "var(--font-poppins), sans-serif", whiteSpace: "nowrap" }}>{label}</span>
                  </button>
                  {i < STEP_LABELS.length - 1 && <span style={{ margin: "0 12px", color: "#D6CEC5" }}>›</span>}
                </div>
              );
            })}
          </div>

          {/* Two-column: step content + sticky preview */}
          <div className="mx-grid" style={{ display: "grid", gridTemplateColumns: "1fr 440px", gap: 28, alignItems: "start" }}>
            {/* LEFT — step content */}
            <div className="mx-panel" style={{ backgroundColor: "#fff", borderRadius: 20, border: "1px solid rgba(241,229,220,0.7)", padding: "28px 26px", minHeight: 360 }}>
              {/* STEP 1 — Style */}
              {step === 1 && (
                <div>
                  {sectionTitle(<Shirt size={18} />, "Pick a style")}
                  <div className="mx-style-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                    {STYLES.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setStyleId(s.id)}
                        className="mx-card"
                        style={{
                          textAlign: "left", padding: "16px 14px", borderRadius: 14, cursor: "pointer",
                          border: styleId === s.id ? "2px solid #E9987A" : "1.5px solid rgba(241,229,220,0.9)",
                          background: styleId === s.id ? "rgba(233,152,122,0.06)" : "#fff", transition: "all 0.2s",
                        }}
                      >
                        <Shirt size={22} color={styleId === s.id ? "#E9987A" : "#9CA3AF"} style={{ marginBottom: 10 }} />
                        <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: "#1F2937", fontFamily: "var(--font-poppins), sans-serif" }}>{s.label}</p>
                        <p style={{ margin: "4px 0 8px", fontSize: 11, color: "#9CA3AF", fontFamily: "var(--font-poppins), sans-serif", lineHeight: 1.35 }}>{s.fabric}</p>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "#E9987A", fontFamily: "var(--font-poppins), sans-serif" }}>₹{s.price}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 2 — Colour */}
              {step === 2 && (
                <div>
                  {sectionTitle(<Palette size={18} />, "Choose a colour")}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 18 }}>
                    {COLOURS.map((c) => {
                      const selected = !isHex(customHex) && colour.name === c.name;
                      return (
                        <button key={c.name} type="button" onClick={() => { setColour(c); setCustomHex(""); }} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, border: "none", background: "transparent", cursor: "pointer" }}>
                          <span style={{ width: 46, height: 46, borderRadius: "50%", background: c.hex, border: c.hex === "#FFFFFF" ? "1.5px solid #E5E7EB" : "1.5px solid transparent", boxShadow: selected ? "0 0 0 3px #E9987A" : "none", transition: "box-shadow 0.2s" }} />
                          <span style={{ fontSize: 11.5, fontWeight: selected ? 700 : 500, color: selected ? "#E9987A" : "#6B7280", fontFamily: "var(--font-poppins), sans-serif" }}>{c.name}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ marginTop: 26, paddingTop: 22, borderTop: "1px solid rgba(241,229,220,0.7)" }}>
                    <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9CA3AF", margin: "0 0 10px", fontFamily: "var(--font-poppins), sans-serif" }}>Custom colour</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ width: 44, height: 44, borderRadius: 10, background: isHex(customHex) ? effectiveColour : "#E7E1DA", border: "1.5px solid #E5E7EB", flexShrink: 0 }} />
                      <input
                        aria-label="Custom hex colour" value={customHex} onChange={(e) => setCustomHex(e.target.value)} placeholder="Enter any hex, e.g. #1A1A1A"
                        style={{ ...inputStyle, maxWidth: 220 }} className="mx-input"
                      />
                      <span style={{ fontSize: 12, color: "#9CA3AF", fontFamily: "var(--font-poppins), sans-serif" }}>Enter any hex, e.g. #1A1A1A</span>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3 — Design */}
              {step === 3 && (
                <div>
                  {sectionTitle(<Upload size={18} />, "Add a design")}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 22 }} className="mx-upload-grid">
                    {(["front", "back"] as const).map((side) => {
                      const art = side === "front" ? frontArt : backArt;
                      return (
                        <div key={side}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: "#1F2937", margin: "0 0 8px", fontFamily: "var(--font-poppins), sans-serif", textTransform: "capitalize" }}>{side} Design</p>
                          {art && art.kind === "upload" ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "16px 14px", borderRadius: 12, border: "1.5px solid rgba(241,229,220,0.9)", background: "#FFF8F3" }}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={art.url} alt="" style={{ width: 34, height: 34, objectFit: "cover", borderRadius: 6 }} />
                              <span style={{ fontSize: 12, color: "#1F2937", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "var(--font-poppins), sans-serif" }}>{art.label}</span>
                              <button type="button" onClick={() => clearArt(side)} aria-label={`Remove ${side} design`} style={{ border: "none", background: "none", cursor: "pointer", color: "#9CA3AF", display: "flex" }}><X size={15} /></button>
                            </div>
                          ) : (
                            <label className="mx-drop" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "20px 14px", borderRadius: 12, border: "1.5px dashed rgba(233,152,122,0.4)", background: "rgba(255,245,235,0.35)", cursor: "pointer", color: "#6B7280", fontSize: 12.5, fontFamily: "var(--font-poppins), sans-serif" }}>
                              <Upload size={15} /> Upload {side} image
                              <input type="file" accept="image/*" onChange={(e) => onUpload(side, e)} style={{ display: "none" }} />
                            </label>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#9CA3AF", fontFamily: "var(--font-poppins), sans-serif" }}>Apply AI / template to</span>
                    <div style={{ display: "flex", gap: 6 }}>
                      {(["front", "back"] as const).map((side) => (
                        <button key={side} type="button" onClick={() => setApplyTo(side)} style={{ padding: "6px 14px", borderRadius: 9, border: applyTo === side ? "1.5px solid #E9987A" : "1.5px solid rgba(241,229,220,0.9)", background: applyTo === side ? "rgba(233,152,122,0.06)" : "#fff", color: applyTo === side ? "#E9987A" : "#4B5563", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-poppins), sans-serif", textTransform: "capitalize" }}>{side}</button>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <Wand2 size={15} color="#E9987A" />
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#1F2937", fontFamily: "var(--font-poppins), sans-serif" }}>Generate with AI</span>
                  </div>
                  <div style={{ display: "flex", gap: 10, marginBottom: 22 }} className="mx-ai-row">
                    <input value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder="e.g. a neon tiger in chrome" aria-label="AI design prompt" style={{ ...inputStyle, flex: 1 }} className="mx-input" />
                    <button type="button" onClick={generateAI} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "0 18px", borderRadius: 12, border: "none", background: "#E9987A", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-poppins), sans-serif", whiteSpace: "nowrap", boxShadow: "0 6px 18px rgba(233,152,122,0.3)" }}><Wand2 size={14} /> Generate</button>
                  </div>

                  <p style={{ fontSize: 12.5, color: "#6B7280", margin: "0 0 10px", fontFamily: "var(--font-poppins), sans-serif" }}>Or pick a template</p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 8 }} className="mx-tpl-grid">
                    {TEMPLATES.map((t) => (
                      <button key={t} type="button" onClick={() => pickTemplate(t)} aria-label={`Template ${t}`} style={{ aspectRatio: "1", borderRadius: 12, border: currentArt?.kind === "template" && currentArt.label === t ? "2px solid #E9987A" : "1.5px solid rgba(241,229,220,0.9)", background: "#fff", fontSize: 24, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{t}</button>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 4 — Text */}
              {step === 4 && (
                <div>
                  {sectionTitle(<TypeIcon size={18} />, "Add text")}
                  <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Your text…" aria-label="Custom text" style={{ ...inputStyle, marginBottom: 22 }} className="mx-input" />

                  <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#9CA3AF", margin: "0 0 10px", fontFamily: "var(--font-poppins), sans-serif" }}>Font</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 22 }}>
                    {FONTS.map((f) => (
                      <button key={f.id} type="button" onClick={() => setFont(f.id)} style={{ padding: "9px 16px", borderRadius: 10, border: font === f.id ? "1.5px solid #E9987A" : "1.5px solid rgba(241,229,220,0.9)", background: "#fff", color: font === f.id ? "#E9987A" : "#4B5563", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: f.css }}>{f.label}</button>
                    ))}
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 30 }}>
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#9CA3AF", margin: "0 0 10px", fontFamily: "var(--font-poppins), sans-serif" }}>Colour</p>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        {TEXT_COLOURS.map((c) => (
                          <button key={c} type="button" onClick={() => setTextColour(c)} aria-label={`Text colour ${c}`} style={{ width: 30, height: 30, borderRadius: "50%", background: c, border: c === "#FFFFFF" ? "1.5px solid #E5E7EB" : "1.5px solid transparent", boxShadow: textColour.toUpperCase() === c ? "0 0 0 3px #E9987A" : "none", cursor: "pointer" }} />
                        ))}
                        <input aria-label="Text colour hex" value={textColour} onChange={(e) => isHex(e.target.value) && setTextColour(e.target.value.startsWith("#") ? e.target.value : `#${e.target.value}`)} style={{ ...inputStyle, width: 96, padding: "8px 10px", fontSize: 12 }} className="mx-input" />
                      </div>
                    </div>
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#9CA3AF", margin: "0 0 10px", fontFamily: "var(--font-poppins), sans-serif" }}>Align</p>
                      <div style={{ display: "flex", gap: 6 }}>
                        {(["left", "center", "right"] as const).map((a) => (
                          <button key={a} type="button" onClick={() => setAlign(a)} style={{ padding: "9px 16px", borderRadius: 10, border: align === a ? "1.5px solid #E9987A" : "1.5px solid rgba(241,229,220,0.9)", background: "#fff", color: align === a ? "#E9987A" : "#4B5563", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-poppins), sans-serif", textTransform: "capitalize" }}>{a}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <p style={{ fontSize: 12, color: "#9CA3AF", margin: "20px 0 0", fontFamily: "var(--font-poppins), sans-serif" }}>Text prints on the front. Drag it on the preview to reposition.</p>
                </div>
              )}

              {/* STEP 5 — Preview */}
              {step === 5 && (
                <div>
                  {sectionTitle(<Eye size={18} />, "Live preview")}
                  <p style={{ fontSize: 13.5, color: "#6B7280", margin: "0 0 8px", lineHeight: 1.6, fontFamily: "var(--font-poppins), sans-serif" }}>
                    Drag the design and text on the mockup to position them. Use the <strong>Front / Back / 360°</strong> switch under the preview — in 360° mode, drag the garment left/right or use the slider to rotate it manually.
                  </p>
                  <ul style={{ margin: "16px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
                    {[["Style", `${style.label} · ${style.fabric}`], ["Colour", colourName], ["Front art", frontArt ? (frontArt.kind === "ai" ? `AI: ${frontArt.label}` : frontArt.label) : "—"], ["Back art", backArt ? (backArt.kind === "ai" ? `AI: ${backArt.label}` : backArt.label) : "—"], ["Text", text.trim() || "—"]].map(([k, v]) => (
                      <li key={k} style={{ display: "flex", justifyContent: "space-between", gap: 16, fontSize: 13, fontFamily: "var(--font-poppins), sans-serif", borderBottom: "1px solid rgba(241,229,220,0.6)", paddingBottom: 8 }}>
                        <span style={{ color: "#9CA3AF" }}>{k}</span>
                        <span style={{ color: "#1F2937", fontWeight: 600, textAlign: "right", overflow: "hidden", textOverflow: "ellipsis" }}>{v}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* STEP 6 — Order */}
              {step === 6 && (
                <div>
                  {sectionTitle(<ShoppingBag size={18} />, "Sizes & order")}
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#1F2937", margin: "0 0 12px", fontFamily: "var(--font-poppins), sans-serif" }}>Sizes &amp; quantity</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 22 }}>
                    {SIZES.map((sz) => {
                      const active = sizeQty[sz] !== undefined;
                      return (
                        <div key={sz} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <button type="button" onClick={() => setSize(sz, active ? -(sizeQty[sz]) : 1)} style={{ width: 44, height: 44, borderRadius: 11, border: active ? "2px solid #E9987A" : "1.5px solid rgba(241,229,220,0.9)", background: active ? "rgba(233,152,122,0.06)" : "#fff", color: active ? "#E9987A" : "#4B5563", fontSize: 13, fontWeight: active ? 700 : 500, cursor: "pointer", fontFamily: "var(--font-poppins), sans-serif" }}>{sz}</button>
                          {active && (
                            <div style={{ display: "flex", alignItems: "center", gap: 2, border: "1px solid rgba(241,229,220,0.9)", borderRadius: 8, overflow: "hidden" }}>
                              <button type="button" onClick={() => setSize(sz, -1)} aria-label={`Fewer ${sz}`} style={{ width: 26, height: 30, border: "none", background: "transparent", cursor: "pointer", color: "#6B7280" }}>−</button>
                              <span style={{ width: 18, textAlign: "center", fontSize: 12, fontWeight: 600, color: "#1F2937", fontFamily: "var(--font-poppins), sans-serif" }}>{sizeQty[sz]}</span>
                              <button type="button" onClick={() => setSize(sz, 1)} aria-label={`More ${sz}`} style={{ width: 26, height: 30, border: "none", background: "transparent", cursor: "pointer", color: "#6B7280" }}>+</button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18 }} className="mx-contact-grid">
                    <div>
                      <label htmlFor="mx-name" style={labelStyle}>Name</label>
                      <input id="mx-name" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Your name" style={inputStyle} className="mx-input" />
                    </div>
                    <div>
                      <label htmlFor="mx-phone" style={labelStyle}>Phone</label>
                      <input id="mx-phone" type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+91 99999 99999" style={inputStyle} className="mx-input" />
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderRadius: 12, background: "#FFF8F3", marginBottom: 16 }}>
                    <span style={{ fontSize: 13, color: "#6B7280", fontFamily: "var(--font-poppins), sans-serif" }}>Estimated total <span style={{ color: "#9CA3AF" }}>({totalQty} pcs)</span></span>
                    <span style={{ fontSize: 22, fontWeight: 800, color: "#1F2937", fontFamily: "var(--font-poppins), sans-serif" }}>₹{estimatedTotal.toLocaleString()}</span>
                  </div>
                  {submitError && <p style={{ fontSize: 13, color: "#DC2626", margin: "0 0 12px", fontFamily: "var(--font-poppins), sans-serif" }}>{submitError}</p>}
                  <div style={{ display: "flex", gap: 10 }} className="mx-order-actions">
                    <button type="button" onClick={() => void orderOnline()} disabled={submitting} className="mx-cta" style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "14px 20px", borderRadius: 13, border: "none", background: "#E9987A", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-poppins), sans-serif", boxShadow: "0 8px 24px rgba(233,152,122,0.35)", opacity: submitting ? 0.6 : 1 }}>
                      <ShoppingBag size={16} /> {submitting ? "Saving…" : "Order online"}
                    </button>
                    <button type="button" onClick={() => void orderViaWhatsApp()} disabled={submitting} className="mx-wa" style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "14px 20px", borderRadius: 13, border: "none", background: "#25D366", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-poppins), sans-serif", boxShadow: "0 8px 24px rgba(37,211,102,0.3)", opacity: submitting ? 0.6 : 1 }}>
                      <MessageCircle size={16} /> WhatsApp
                    </button>
                  </div>
                </div>
              )}

              {/* Nav buttons */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 28 }}>
                <button type="button" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "11px 20px", borderRadius: 12, border: "1.5px solid rgba(241,229,220,0.9)", background: "#fff", color: step === 1 ? "#D1D5DB" : "#4B5563", fontSize: 13.5, fontWeight: 600, cursor: step === 1 ? "not-allowed" : "pointer", fontFamily: "var(--font-poppins), sans-serif" }}>
                  <ArrowLeft size={15} /> Back
                </button>
                {step < 6 && (
                  <button type="button" onClick={() => canProceed(step) && setStep((s) => Math.min(6, s + 1))} className="mx-next" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "11px 24px", borderRadius: 12, border: "none", background: "#E9987A", color: "#fff", fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-poppins), sans-serif", boxShadow: "0 6px 18px rgba(233,152,122,0.3)" }}>
                    Next <ArrowRight size={15} />
                  </button>
                )}
              </div>
            </div>

            {/* RIGHT — sticky live preview */}
            <div className="mx-preview" style={{ position: "sticky", top: 88 }}>
              {preview}
            </div>
          </div>
        </div>
      </main>
      <Footer />

      <style jsx global>{`
        .mx-card:hover { border-color: rgba(233,152,122,0.55) !important; }
        .mx-input:focus { border-color: #E9987A !important; }
        .mx-drop:hover { border-color: rgba(233,152,122,0.65) !important; background: rgba(255,245,235,0.6) !important; }
        .mx-next:hover, .mx-cta:hover { transform: translateY(-1px); }
        @media (max-width: 900px) {
          .mx-grid { grid-template-columns: 1fr !important; }
          .mx-preview { position: static !important; order: -1; }
        }
        @media (max-width: 560px) {
          .mx-style-grid { grid-template-columns: 1fr 1fr !important; }
          .mx-upload-grid, .mx-ai-row, .mx-contact-grid { grid-template-columns: 1fr !important; }
          .mx-ai-row { display: flex !important; flex-direction: column; }
          .mx-tpl-grid { grid-template-columns: repeat(4, 1fr) !important; }
          .mx-order-actions { flex-direction: column; }
        }
      `}</style>
    </>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "12px 14px", borderRadius: 12,
  border: "1.5px solid rgba(241,229,220,0.9)", backgroundColor: "#FFF8F3",
  fontSize: 13.5, color: "#1F2937", fontFamily: "var(--font-poppins), sans-serif",
  outline: "none", transition: "border-color 0.25s",
};
const labelStyle: React.CSSProperties = {
  fontSize: 13, fontWeight: 600, color: "#1F2937", display: "block", margin: "0 0 8px", fontFamily: "var(--font-poppins), sans-serif",
};
