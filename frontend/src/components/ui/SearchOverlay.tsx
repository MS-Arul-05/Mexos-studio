"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, X, ArrowRight, Star } from "lucide-react";
import { useProducts } from "@/lib/catalog";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SearchOverlay({ open, onClose }: Props) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      setQuery("");
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const { products } = useProducts();
  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.category.includes(q) || p.fabric.toLowerCase().includes(q)
    ).slice(0, 6);
  }, [query, products]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.25)",
        backdropFilter: "blur(8px)", zIndex: 60,
        animation: "fadeIn 0.25s ease",
      }} />

      {/* Panel */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 61,
        padding: "24px 28px", maxWidth: 640, margin: "0 auto",
        animation: "slideDown 0.35s cubic-bezier(0.22,1,0.36,1)",
      }}>
        <div style={{
          backgroundColor: "#fff", borderRadius: 22,
          boxShadow: "0 20px 60px rgba(0,0,0,0.12)",
          overflow: "hidden",
        }}>
          {/* Search input */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "18px 20px", borderBottom: "1px solid rgba(241,229,220,0.5)" }}>
            <Search size={18} color="#9CA3AF" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search for products..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                flex: 1, border: "none", outline: "none", fontSize: 15,
                color: "#1F2937", fontFamily: "var(--font-poppins), sans-serif",
                backgroundColor: "transparent",
              }}
            />
            <button onClick={onClose} style={{
              width: 32, height: 32, borderRadius: 8, border: "none",
              backgroundColor: "rgba(241,229,220,0.3)", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#6B7280", transition: "background 0.2s",
            }}>
              <X size={14} />
            </button>
          </div>

          {/* Results */}
          {query.trim() && (
            <div style={{ maxHeight: 400, overflowY: "auto", padding: "8px" }}>
              {results.length === 0 ? (
                <div style={{ padding: "32px 16px", textAlign: "center" }}>
                  <p style={{ fontSize: 14, color: "#9CA3AF", fontFamily: "var(--font-poppins), sans-serif" }}>
                    No products found for "{query}"
                  </p>
                </div>
              ) : (
                results.map((p) => (
                  <Link
                    key={p.id}
                    href={`/shop/${p.id}`}
                    onClick={onClose}
                    className="search-result"
                    style={{
                      display: "flex", alignItems: "center", gap: 14,
                      padding: "12px 14px", borderRadius: 14, textDecoration: "none",
                      transition: "background 0.2s ease",
                    }}
                  >
                    <div style={{
                      width: 56, height: 56, borderRadius: 12,
                      backgroundColor: "rgba(255,245,235,0.3)", overflow: "hidden",
                      position: "relative", flexShrink: 0,
                    }}>
                      <Image src={p.image} alt={p.name} fill style={{ objectFit: "contain", padding: 6 }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: 13.5, fontWeight: 600, color: "#1F2937", margin: 0,
                        fontFamily: "var(--font-poppins), sans-serif",
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      }}>
                        {p.name}
                      </p>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#E9987A", fontFamily: "var(--font-poppins), sans-serif" }}>
                          ₹{p.price}
                        </span>
                        <span style={{ fontSize: 11, color: "#9CA3AF", textDecoration: "line-through", fontFamily: "var(--font-poppins), sans-serif" }}>
                          ₹{p.originalPrice}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                          <Star size={10} fill="#FBBF24" color="#FBBF24" />
                          <span style={{ fontSize: 11, color: "#6B7280", fontFamily: "var(--font-poppins), sans-serif" }}>{p.rating}</span>
                        </div>
                      </div>
                    </div>
                    <ArrowRight size={14} color="#D1D5DB" />
                  </Link>
                ))
              )}
              {results.length > 0 && (
                <Link
                  href={`/shop?q=${encodeURIComponent(query)}`}
                  onClick={onClose}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    padding: "12px", margin: "4px 0", borderRadius: 12,
                    fontSize: 13, fontWeight: 600, color: "#E9987A",
                    textDecoration: "none", fontFamily: "var(--font-poppins), sans-serif",
                    transition: "background 0.2s",
                  }}
                  className="search-all"
                >
                  View all results <ArrowRight size={13} />
                </Link>
              )}
            </div>
          )}

          {/* Quick categories when empty */}
          {!query.trim() && (
            <div style={{ padding: "16px 20px 20px" }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 1, margin: "0 0 12px", fontFamily: "var(--font-poppins), sans-serif" }}>
                Popular Searches
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {["T-Shirts", "Hoodies", "Oversized", "Polo", "Jerseys"].map((term) => (
                  <button
                    key={term}
                    onClick={() => setQuery(term.toLowerCase())}
                    className="search-chip"
                    style={{
                      padding: "8px 16px", borderRadius: 50,
                      border: "1.5px solid rgba(241,229,220,0.7)",
                      backgroundColor: "#fff", fontSize: 12.5, fontWeight: 500,
                      color: "#4B5563", cursor: "pointer",
                      fontFamily: "var(--font-poppins), sans-serif",
                      transition: "all 0.2s ease",
                    }}
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-16px); } to { opacity: 1; transform: translateY(0); } }
        .search-result:hover { background-color: rgba(255,245,235,0.5) !important; }
        .search-all:hover { background-color: rgba(233,152,122,0.06) !important; }
        .search-chip:hover { border-color: #E9987A !important; color: #E9987A !important; }
      `}</style>
    </>
  );
}
