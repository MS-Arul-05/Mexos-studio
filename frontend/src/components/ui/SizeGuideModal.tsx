"use client";

import { X } from "lucide-react";

const sizeData = [
  { size: "S", chest: "36", length: "26", shoulder: "16.5" },
  { size: "M", chest: "38", length: "27", shoulder: "17" },
  { size: "L", chest: "40", length: "28", shoulder: "17.5" },
  { size: "XL", chest: "42", length: "29", shoulder: "18" },
  { size: "XXL", chest: "44", length: "30", shoulder: "18.5" },
  { size: "3XL", chest: "46", length: "31", shoulder: "19" },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SizeGuideModal({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <>
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.25)",
        backdropFilter: "blur(6px)", zIndex: 60,
        animation: "sgFadeIn 0.2s ease",
      }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)", zIndex: 61,
        width: "90%", maxWidth: 480,
        backgroundColor: "#fff", borderRadius: 22,
        boxShadow: "0 20px 60px rgba(0,0,0,0.12)",
        padding: 28, animation: "sgPop 0.3s cubic-bezier(0.22,1,0.36,1)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1F2937", margin: 0, fontFamily: "var(--font-poppins), sans-serif" }}>
            Size Guide
          </h2>
          <button onClick={onClose} style={{
            width: 34, height: 34, borderRadius: 10,
            border: "1px solid rgba(241,229,220,0.6)", background: "transparent",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            color: "#6B7280",
          }}>
            <X size={15} />
          </button>
        </div>
        <p style={{ fontSize: 12.5, color: "#9CA3AF", margin: "0 0 16px", fontFamily: "var(--font-poppins), sans-serif" }}>
          All measurements in inches. Measured flat across.
        </p>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-poppins), sans-serif" }}>
            <thead>
              <tr>
                {["Size", "Chest", "Length", "Shoulder"].map((h) => (
                  <th key={h} style={{
                    padding: "10px 14px", fontSize: 12, fontWeight: 700, color: "#E9987A",
                    textAlign: "left", textTransform: "uppercase", letterSpacing: 0.5,
                    borderBottom: "2px solid rgba(233,152,122,0.2)",
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sizeData.map((row, i) => (
                <tr key={row.size} style={{ backgroundColor: i % 2 === 0 ? "rgba(255,248,243,0.5)" : "#fff" }}>
                  <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 700, color: "#1F2937" }}>{row.size}</td>
                  <td style={{ padding: "10px 14px", fontSize: 13, color: "#4B5563" }}>{row.chest}"</td>
                  <td style={{ padding: "10px 14px", fontSize: 13, color: "#4B5563" }}>{row.length}"</td>
                  <td style={{ padding: "10px 14px", fontSize: 13, color: "#4B5563" }}>{row.shoulder}"</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{
          marginTop: 16, padding: "12px 14px", borderRadius: 12,
          backgroundColor: "rgba(233,152,122,0.05)", border: "1px solid rgba(233,152,122,0.15)",
        }}>
          <p style={{ fontSize: 12, color: "#6B7280", margin: 0, lineHeight: 1.6, fontFamily: "var(--font-poppins), sans-serif" }}>
            <strong style={{ color: "#1F2937" }}>Tip:</strong> If you're between sizes, we recommend sizing up for a more relaxed fit.
          </p>
        </div>
      </div>
      <style jsx global>{`
        @keyframes sgFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes sgPop { from { opacity: 0; transform: translate(-50%,-50%) scale(0.95); } to { opacity: 1; transform: translate(-50%,-50%) scale(1); } }
      `}</style>
    </>
  );
}
