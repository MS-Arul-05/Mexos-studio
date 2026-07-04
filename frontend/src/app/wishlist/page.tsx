"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/sections/Footer";
import { useWishlistStore } from "@/store/wishlist";
import { useCartStore } from "@/store/cart";
import { useToast } from "@/components/ui/Toast";
import { useProducts } from "@/lib/catalog";
import { Heart, ShoppingBag, Trash2, ArrowRight, Star } from "lucide-react";

export default function WishlistPage() {
  const { ids, toggle } = useWishlistStore();
  const addItem = useCartStore((s) => s.addItem);
  const toast = useToast();
  const mainRef = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); } },
      { threshold: 0.05 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const { products } = useProducts();
  const wishlistProducts = products.filter((p) => ids.includes(p.id));

  return (
    <>
      <Navbar />
      <main style={{ backgroundColor: "#FFF8F3", paddingTop: 72, minHeight: "100vh" }}>
        <div ref={mainRef} style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 28px 100px" }}>
          <div style={{
            marginBottom: 36,
            opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(18px)",
            transition: "all 0.7s cubic-bezier(0.22,1,0.36,1)",
          }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "#E9987A", textTransform: "uppercase", letterSpacing: 2, margin: "0 0 8px", fontFamily: "var(--font-poppins), sans-serif" }}>
              Saved Items
            </p>
            <h1 style={{ fontFamily: "var(--font-playfair), serif", fontSize: 40, fontWeight: 700, color: "#1F2937", margin: 0 }}>
              Your Wishlist
            </h1>
          </div>

          {wishlistProducts.length === 0 ? (
            <div style={{
              textAlign: "center", padding: "80px 0",
              opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(18px)",
              transition: "all 0.7s cubic-bezier(0.22,1,0.36,1) 0.15s",
            }}>
              <Heart size={48} color="#D1D5DB" strokeWidth={1.2} style={{ margin: "0 auto 20px", display: "block" }} />
              <p style={{ fontSize: 18, fontWeight: 600, color: "#1F2937", margin: "0 0 8px", fontFamily: "var(--font-poppins), sans-serif" }}>
                Your wishlist is empty
              </p>
              <p style={{ fontSize: 14, color: "#9CA3AF", margin: "0 0 28px", fontFamily: "var(--font-poppins), sans-serif" }}>
                Browse products and tap the heart to save them here.
              </p>
              <Link href="/shop" style={{
                display: "inline-flex", alignItems: "center", gap: 6, padding: "14px 28px",
                backgroundColor: "#E9987A", color: "#fff", fontSize: 14, fontWeight: 600,
                borderRadius: 14, textDecoration: "none", fontFamily: "var(--font-poppins), sans-serif",
                boxShadow: "0 6px 20px rgba(233,152,122,0.3)",
              }}>
                Browse Products <ArrowRight size={14} />
              </Link>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 22 }} className="wishlist-grid">
              {wishlistProducts.map((product, i) => (
                <div
                  key={product.id}
                  className="wishlist-card"
                  style={{
                    backgroundColor: "#fff", borderRadius: 22, overflow: "hidden",
                    border: "1px solid rgba(241,229,220,0.5)",
                    opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(24px)",
                    transition: `all 0.6s cubic-bezier(0.22,1,0.36,1) ${0.05 + i * 0.06}s`,
                  }}
                >
                  <Link href={`/shop/${product.id}`} style={{ textDecoration: "none" }}>
                    <div style={{ position: "relative", aspectRatio: "1/1", backgroundColor: "rgba(255,245,235,0.3)", overflow: "hidden" }}>
                      <Image src={product.image} alt={product.name} fill style={{ objectFit: "contain", padding: 20 }} />
                    </div>
                  </Link>
                  <div style={{ padding: "14px 16px 16px", borderTop: "1px solid rgba(241,229,220,0.3)" }}>
                    <p style={{ fontSize: 13.5, fontWeight: 600, color: "#1F2937", margin: "0 0 6px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontFamily: "var(--font-poppins), sans-serif" }}>
                      {product.name}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                      <span style={{ fontSize: 16, fontWeight: 700, color: "#1F2937", fontFamily: "var(--font-poppins), sans-serif" }}>
                        ₹{product.price}
                      </span>
                      <span style={{ fontSize: 12, color: "#9CA3AF", textDecoration: "line-through", fontFamily: "var(--font-poppins), sans-serif" }}>
                        ₹{product.originalPrice}
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: 2, marginLeft: "auto" }}>
                        <Star size={11} fill="#FBBF24" color="#FBBF24" />
                        <span style={{ fontSize: 11, fontWeight: 600, color: "#1F2937", fontFamily: "var(--font-poppins), sans-serif" }}>{product.rating}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => {
                          addItem(product, product.colors[0]?.name || "", "M", 1);
                          toast.show(`${product.name} added to cart`, "cart");
                        }}
                        className="wl-add-cart"
                        style={{
                          flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                          padding: "10px 14px", backgroundColor: "#E9987A", color: "#fff",
                          fontSize: 12, fontWeight: 600, borderRadius: 10, border: "none",
                          cursor: "pointer", fontFamily: "var(--font-poppins), sans-serif",
                          transition: "all 0.3s ease",
                        }}
                      >
                        <ShoppingBag size={13} /> Add to Cart
                      </button>
                      <button
                        onClick={() => {
                          toggle(product.id);
                          toast.show("Removed from wishlist", "wishlist");
                        }}
                        className="wl-remove"
                        style={{
                          width: 40, height: 40, borderRadius: 10,
                          border: "1.5px solid rgba(241,229,220,0.7)",
                          backgroundColor: "#fff", cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: "#9CA3AF", transition: "all 0.2s ease",
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />

      <style jsx global>{`
        .wishlist-card:hover {
          border-color: rgba(233,152,122,0.35) !important;
          box-shadow: 0 12px 40px rgba(233,152,122,0.1);
          transform: translateY(-4px) !important;
        }
        .wl-add-cart:hover { opacity: 0.9; }
        .wl-remove:hover { color: #EF4444 !important; border-color: rgba(239,68,68,0.3) !important; }
        @media (max-width: 1024px) { .wishlist-grid { grid-template-columns: repeat(3, 1fr) !important; } }
        @media (max-width: 768px) { .wishlist-grid { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 480px) { .wishlist-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </>
  );
}
