"use client";

import Link from "next/link";
import { ArrowLeft, Home } from "lucide-react";

export default function NotFound() {
  return (
    <main style={{
      minHeight: "100vh", backgroundColor: "#FFF8F3",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "40px 28px",
    }}>
      <div style={{ textAlign: "center", maxWidth: 440 }}>
        <div style={{
          fontSize: 100, fontWeight: 900, color: "rgba(233,152,122,0.15)",
          fontFamily: "var(--font-playfair), serif", lineHeight: 1, marginBottom: -10,
        }}>
          404
        </div>
        <h1 style={{
          fontFamily: "var(--font-playfair), serif", fontSize: 32, fontWeight: 700,
          color: "#1F2937", margin: "0 0 12px",
        }}>
          Page Not Found
        </h1>
        <p style={{
          fontSize: 14, color: "#6B7280", lineHeight: 1.7, margin: "0 0 32px",
          fontFamily: "var(--font-poppins), sans-serif",
        }}>
          The page you're looking for doesn't exist or has been moved. Let's get you back on track.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/" style={{
            display: "inline-flex", alignItems: "center", gap: 6, padding: "13px 24px",
            backgroundColor: "#E9987A", color: "#fff", fontSize: 14, fontWeight: 600,
            borderRadius: 14, textDecoration: "none", fontFamily: "var(--font-poppins), sans-serif",
            boxShadow: "0 6px 20px rgba(233,152,122,0.3)",
          }}>
            <Home size={15} /> Go Home
          </Link>
          <Link href="/shop" style={{
            display: "inline-flex", alignItems: "center", gap: 6, padding: "13px 24px",
            backgroundColor: "#fff", color: "#1F2937", fontSize: 14, fontWeight: 600,
            borderRadius: 14, border: "1.5px solid rgba(241,229,220,0.7)",
            textDecoration: "none", fontFamily: "var(--font-poppins), sans-serif",
          }}>
            Browse Shop
          </Link>
        </div>
      </div>
    </main>
  );
}
