"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Star, Heart, ShoppingBag, Eye } from "lucide-react";

import { useProducts } from "@/lib/catalog";

const filters = ["All", "T-Shirts", "Hoodies", "Polo", "Jerseys"];

export default function FeaturedProducts() {
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");
  const { products: apiProducts } = useProducts();

  // Featured picks from the live catalog, filterable by category chip.
  const products = apiProducts
    .filter((p) => activeFilter === "All" || p.category === activeFilter.toLowerCase())
    .sort((a, b) => (b.tag ? 1 : 0) - (a.tag ? 1 : 0))
    .slice(0, 4)
    .map((p) => ({
      slug: p.id,
      name: p.name,
      price: p.price,
      oldPrice: p.originalPrice > p.price ? p.originalPrice : null,
      rating: p.rating,
      reviews: p.reviews,
      image: p.image,
      tag: p.tag,
      category: p.category,
    }));

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section ref={sectionRef} style={{ padding: "100px 0", backgroundColor: "#fff" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 28px" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            marginBottom: 20,
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(20px)",
            transition: "all 0.7s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
          className="fp-header"
        >
          <div>
            <p
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "#E9987A",
                textTransform: "uppercase",
                letterSpacing: 2,
                margin: "0 0 8px 0",
                fontFamily: "var(--font-poppins), 'Poppins', sans-serif",
              }}
            >
              Our Collection
            </p>
            <h2
              style={{
                fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif",
                fontSize: 36,
                fontWeight: 700,
                color: "#1F2937",
                margin: 0,
              }}
            >
              Featured Products
            </h2>
          </div>
          <Link
            href="/shop"
            className="fp-view-all"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 14,
              fontWeight: 600,
              color: "#E9987A",
              textDecoration: "none",
              fontFamily: "var(--font-poppins), 'Poppins', sans-serif",
              padding: "8px 16px",
              borderRadius: 10,
              border: "1px solid rgba(233,152,122,0.2)",
              transition: "all 0.3s ease",
            }}
          >
            View All <ArrowRight size={14} />
          </Link>
        </div>

        {/* Filter Pills */}
        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 40,
            flexWrap: "wrap",
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(16px)",
            transition: "all 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.1s",
          }}
        >
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              style={{
                padding: "7px 18px",
                fontSize: 12.5,
                fontWeight: activeFilter === f ? 600 : 500,
                color: activeFilter === f ? "#fff" : "#6B7280",
                backgroundColor: activeFilter === f ? "#E9987A" : "transparent",
                border: activeFilter === f ? "1px solid #E9987A" : "1px solid rgba(241,229,220,0.6)",
                borderRadius: 50,
                cursor: "pointer",
                fontFamily: "var(--font-poppins), 'Poppins', sans-serif",
                transition: "all 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
                boxShadow: activeFilter === f ? "0 4px 14px rgba(233,152,122,0.25)" : "none",
              }}
              className="fp-filter-pill"
            >
              {f}
            </button>
          ))}
        </div>

        {/* Products Grid — 4 columns */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 24,
          }}
          className="products-grid"
        >
          {products.map((product, i) => (
            <div
              key={product.name}
              className="product-card"
              style={{
                cursor: "pointer",
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(28px)",
                transition: "all 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
                transitionDelay: `${0.15 + i * 0.1}s`,
              }}
            >
              <div
                style={{
                  backgroundColor: "#fff",
                  borderRadius: 22,
                  overflow: "hidden",
                  border: "1px solid rgba(241,229,220,0.5)",
                  transition: "all 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
                }}
                className="product-card-inner"
              >
                {/* Image */}
                <div
                  style={{
                    position: "relative",
                    aspectRatio: "4/5",
                    backgroundColor: "rgba(255,245,235,0.3)",
                    overflow: "hidden",
                  }}
                >
                  {/* Tag badge */}
                  {product.tag && (
                    <span
                      style={{
                        position: "absolute",
                        top: 12,
                        left: 12,
                        zIndex: 3,
                        fontSize: 10,
                        fontWeight: 700,
                        color: "#fff",
                        backgroundColor: product.tag === "Bestseller" ? "#E9987A" : product.tag === "New" ? "#6BC5A0" : "#1F2937",
                        padding: "4px 12px",
                        borderRadius: 8,
                        fontFamily: "var(--font-poppins), 'Poppins', sans-serif",
                        letterSpacing: 0.3,
                        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                      }}
                    >
                      {product.tag}
                    </span>
                  )}

                  {/* Wishlist button */}
                  <button
                    className="product-wishlist"
                    style={{
                      position: "absolute",
                      top: 12,
                      right: 12,
                      zIndex: 3,
                      width: 36,
                      height: 36,
                      borderRadius: 11,
                      border: "none",
                      backgroundColor: "rgba(255,255,255,0.9)",
                      backdropFilter: "blur(4px)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      color: "#9CA3AF",
                      opacity: 0,
                      transform: "translateY(-6px)",
                      transition: "all 0.3s ease",
                    }}
                  >
                    <Heart size={15} strokeWidth={1.8} />
                  </button>

                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    style={{
                      objectFit: "contain",
                      padding: 28,
                      transition: "transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)",
                    }}
                    className="product-img"
                  />

                  {/* Action buttons overlay */}
                  <div
                    className="product-actions-overlay"
                    style={{
                      position: "absolute",
                      bottom: 14,
                      left: 14,
                      right: 14,
                      display: "flex",
                      gap: 8,
                      zIndex: 3,
                      opacity: 0,
                      transform: "translateY(10px)",
                      transition: "all 0.35s cubic-bezier(0.22, 1, 0.36, 1)",
                    }}
                  >
                    <button
                      style={{
                        flex: 1,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        padding: "10px 16px",
                        backgroundColor: "#1F2937",
                        color: "#fff",
                        fontSize: 12,
                        fontWeight: 600,
                        borderRadius: 11,
                        border: "none",
                        cursor: "pointer",
                        fontFamily: "var(--font-poppins), 'Poppins', sans-serif",
                        transition: "background-color 0.25s ease",
                      }}
                      className="add-cart-btn"
                    >
                      <ShoppingBag size={13} /> Add to Cart
                    </button>
                    <button
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 11,
                        border: "none",
                        backgroundColor: "rgba(255,255,255,0.9)",
                        backdropFilter: "blur(4px)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        color: "#4B5563",
                        transition: "all 0.25s ease",
                        flexShrink: 0,
                      }}
                      className="quick-view-btn"
                    >
                      <Eye size={15} />
                    </button>
                  </div>
                </div>

                {/* Info */}
                <div
                  style={{
                    padding: "16px 18px 18px",
                    borderTop: "1px solid rgba(241,229,220,0.3)",
                  }}
                >
                  {/* Rating */}
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 6 }}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        size={11}
                        fill={s <= Math.round(product.rating) ? "#FBBF24" : "none"}
                        color={s <= Math.round(product.rating) ? "#FBBF24" : "#D1D5DB"}
                        strokeWidth={1.5}
                      />
                    ))}
                    <span
                      style={{
                        fontSize: 11,
                        color: "#9CA3AF",
                        fontFamily: "var(--font-poppins), 'Poppins', sans-serif",
                        marginLeft: 2,
                      }}
                    >
                      ({product.reviews})
                    </span>
                  </div>

                  <p
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "#1F2937",
                      margin: "0 0 8px",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      fontFamily: "var(--font-poppins), 'Poppins', sans-serif",
                    }}
                  >
                    {product.name}
                  </p>

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        fontSize: 17,
                        fontWeight: 700,
                        color: "#1F2937",
                        fontFamily: "var(--font-poppins), 'Poppins', sans-serif",
                      }}
                    >
                      ₹{product.price}
                    </span>
                    {product.oldPrice && (
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: "#D1D5DB",
                          fontFamily: "var(--font-poppins), 'Poppins', sans-serif",
                          textDecoration: "line-through",
                        }}
                      >
                        ₹{product.oldPrice}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx global>{`
        .product-card-inner:hover {
          border-color: rgba(233,152,122,0.3) !important;
          box-shadow: 0 16px 48px rgba(233,152,122,0.1);
          transform: translateY(-6px);
        }
        .product-card:hover .product-img {
          transform: scale(1.06);
        }
        .product-card:hover .product-wishlist {
          opacity: 1 !important;
          transform: translateY(0) !important;
        }
        .product-wishlist:hover {
          color: #E9987A !important;
          background-color: #fff !important;
          transform: scale(1.08) !important;
        }
        .product-card:hover .product-actions-overlay {
          opacity: 1 !important;
          transform: translateY(0) !important;
        }
        .add-cart-btn:hover {
          background-color: #E9987A !important;
        }
        .quick-view-btn:hover {
          background-color: #fff !important;
          color: #E9987A !important;
        }
        .fp-view-all:hover {
          background-color: rgba(233,152,122,0.06) !important;
          border-color: rgba(233,152,122,0.4) !important;
          gap: 8px !important;
        }
        .fp-filter-pill:hover {
          border-color: rgba(233,152,122,0.4) !important;
          color: #E9987A !important;
        }
        @media (max-width: 1024px) {
          .products-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 640px) {
          .products-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 14px !important;
          }
          .fp-header {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 16px;
          }
        }
      `}</style>
    </section>
  );
}
