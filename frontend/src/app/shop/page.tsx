"use client";

import { Suspense, useState, useEffect, useRef, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/sections/Footer";
import {
  Search,
  SlidersHorizontal,
  ArrowRight,
  Star,
  Heart,
  ShoppingBag,
  X,
  ChevronDown,
  Grid3X3,
  LayoutList,
} from "lucide-react";

import { categories, categorySlugMap } from "@/data/products";
import { useProducts } from "@/lib/catalog";
import { useWishlistStore } from "@/store/wishlist";
import { useCartStore } from "@/store/cart";
import { useToast } from "@/components/ui/Toast";

const sortOptions = [
  { key: "popular", label: "Most Popular" },
  { key: "price-low", label: "Price: Low to High" },
  { key: "price-high", label: "Price: High to Low" },
  { key: "rating", label: "Highest Rated" },
  { key: "newest", label: "Newest" },
];

export default function ShopPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", backgroundColor: "#FFF8F3" }} />}>
      <ShopPageContent />
    </Suspense>
  );
}

function ShopPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlCategory = searchParams.get("category");
  const urlQuery = searchParams.get("q");
  const wishlist = useWishlistStore();
  const addItem = useCartStore((s) => s.addItem);
  const toast = useToast();
  const { products: allProducts, loading, error: catalogError } = useProducts();

  const [search, setSearch] = useState(urlQuery || "");
  const [activeCategory, setActiveCategory] = useState(() => {
    if (urlCategory) return categorySlugMap[urlCategory] || urlCategory;
    return "all";
  });
  const [sortBy, setSortBy] = useState("popular");
  const [showSort, setShowSort] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [headerVis, setHeaderVis] = useState(false);
  const [gridVis, setGridVis] = useState(false);

  useEffect(() => {
    const obs = (el: HTMLElement | null, cb: (v: boolean) => void, t = 0.1) => {
      if (!el) return;
      const o = new IntersectionObserver(
        ([e]) => { if (e.isIntersecting) { cb(true); o.disconnect(); } },
        { threshold: t }
      );
      o.observe(el);
      return () => o.disconnect();
    };
    obs(headerRef.current, setHeaderVis);
    obs(gridRef.current, setGridVis, 0.05);
  }, []);

  const filtered = useMemo(() => {
    let list = allProducts;
    if (activeCategory !== "all") list = list.filter((p) => p.category === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || p.category.includes(q));
    }
    switch (sortBy) {
      case "price-low": list = [...list].sort((a, b) => a.price - b.price); break;
      case "price-high": list = [...list].sort((a, b) => b.price - a.price); break;
      case "rating": list = [...list].sort((a, b) => b.rating - a.rating); break;
      case "newest": list = [...list].sort((a, b) => (b.tag === "New" ? 1 : 0) - (a.tag === "New" ? 1 : 0)); break;
    }
    return list;
  }, [allProducts, activeCategory, search, sortBy]);

  return (
    <>
      <Navbar />
      <main style={{ backgroundColor: "#FFF8F3", paddingTop: 72, minHeight: "100vh" }}>
        {/* ── Header ── */}
        <div
          ref={headerRef}
          style={{
            padding: "48px 28px 0",
            maxWidth: 1200,
            margin: "0 auto",
          }}
        >
          <div
            style={{
              marginBottom: 36,
              opacity: headerVis ? 1 : 0,
              transform: headerVis ? "translateY(0)" : "translateY(18px)",
              transition: "all 0.7s cubic-bezier(0.22,1,0.36,1)",
            }}
          >
            <p style={{ fontSize: 12, fontWeight: 600, color: "#E9987A", textTransform: "uppercase", letterSpacing: 2, margin: "0 0 8px", fontFamily: "var(--font-poppins), sans-serif" }}>
              Our Collection
            </p>
            <h1 className="shop-heading" style={{ fontFamily: "var(--font-playfair), 'Playfair Display', serif", fontSize: 40, fontWeight: 700, color: "#1F2937", margin: 0 }}>
              Product Showcase
            </h1>
          </div>

          {/* Search + Sort bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              marginBottom: 24,
              opacity: headerVis ? 1 : 0,
              transform: headerVis ? "translateY(0)" : "translateY(14px)",
              transition: "all 0.7s cubic-bezier(0.22,1,0.36,1) 0.15s",
            }}
            className="shop-toolbar"
          >
            {/* Search */}
            <div
              style={{
                flex: 1,
                position: "relative",
                maxWidth: 420,
              }}
            >
              <Search
                size={16}
                color="#9CA3AF"
                style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)" }}
              />
              <input
                type="text"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: "100%",
                  padding: "13px 16px 13px 44px",
                  borderRadius: 14,
                  border: "1.5px solid rgba(241,229,220,0.7)",
                  backgroundColor: "#fff",
                  fontSize: 13.5,
                  color: "#1F2937",
                  fontFamily: "var(--font-poppins), sans-serif",
                  outline: "none",
                  transition: "border-color 0.3s ease",
                }}
                className="shop-search"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#9CA3AF",
                    display: "flex",
                    padding: 4,
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Sort dropdown */}
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setShowSort(!showSort)}
                aria-haspopup="listbox"
                aria-expanded={showSort}
                aria-label="Sort products"
                className="sort-btn"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "13px 18px",
                  borderRadius: 14,
                  border: "1.5px solid rgba(241,229,220,0.7)",
                  backgroundColor: "#fff",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "#4B5563",
                  fontFamily: "var(--font-poppins), sans-serif",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  whiteSpace: "nowrap",
                }}
              >
                <SlidersHorizontal size={14} />
                {sortOptions.find((s) => s.key === sortBy)?.label}
                <ChevronDown size={13} style={{ transition: "transform 0.3s", transform: showSort ? "rotate(180deg)" : "none" }} />
              </button>
              {showSort && (
                <div
                  role="listbox"
                  aria-label="Sort options"
                  style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    right: 0,
                    backgroundColor: "#fff",
                    borderRadius: 14,
                    border: "1px solid rgba(241,229,220,0.6)",
                    boxShadow: "0 12px 40px rgba(0,0,0,0.08)",
                    padding: 6,
                    zIndex: 20,
                    minWidth: 200,
                  }}
                >
                  {sortOptions.map((s) => (
                    <button
                      key={s.key}
                      role="option"
                      aria-selected={sortBy === s.key}
                      onClick={() => { setSortBy(s.key); setShowSort(false); }}
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "left",
                        padding: "10px 14px",
                        borderRadius: 10,
                        border: "none",
                        background: sortBy === s.key ? "rgba(233,152,122,0.08)" : "transparent",
                        fontSize: 13,
                        fontWeight: sortBy === s.key ? 600 : 400,
                        color: sortBy === s.key ? "#E9987A" : "#4B5563",
                        fontFamily: "var(--font-poppins), sans-serif",
                        cursor: "pointer",
                        transition: "background 0.2s ease",
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <span style={{ fontSize: 12.5, color: "#9CA3AF", fontFamily: "var(--font-poppins), sans-serif", whiteSpace: "nowrap" }}>
              {filtered.length} products
            </span>
          </div>

          {/* Category pills */}
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              marginBottom: 36,
              opacity: headerVis ? 1 : 0,
              transform: headerVis ? "translateY(0)" : "translateY(14px)",
              transition: "all 0.7s cubic-bezier(0.22,1,0.36,1) 0.25s",
            }}
          >
            {categories.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className="cat-pill"
                style={{
                  padding: "9px 20px",
                  borderRadius: 50,
                  border: activeCategory === cat.key ? "1.5px solid #E9987A" : "1.5px solid rgba(241,229,220,0.7)",
                  backgroundColor: activeCategory === cat.key ? "rgba(233,152,122,0.08)" : "#fff",
                  fontSize: 13,
                  fontWeight: activeCategory === cat.key ? 600 : 500,
                  color: activeCategory === cat.key ? "#E9987A" : "#4B5563",
                  fontFamily: "var(--font-poppins), sans-serif",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Product Grid ── */}
        <div
          ref={gridRef}
          style={{ padding: "0 28px 100px", maxWidth: 1200, margin: "0 auto" }}
        >
          {catalogError ? (
            <div style={{ textAlign: "center", padding: "80px 0" }}>
              <p style={{ fontSize: 16, color: "#E9987A", fontFamily: "var(--font-poppins), sans-serif" }}>
                Unable to load products. Please try again later.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "80px 0" }}>
              <p style={{ fontSize: 16, color: "#9CA3AF", fontFamily: "var(--font-poppins), sans-serif" }}>
                No products found. Try a different search or category.
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 22 }} className="shop-grid">
              {filtered.map((product, i) => (
                <Link
                  key={product.id}
                  href={`/shop/${product.id}`}
                  style={{
                    display: "block",
                    textDecoration: "none",
                    opacity: gridVis ? 1 : 0,
                    transform: gridVis ? "translateY(0)" : "translateY(28px)",
                    transition: `all 0.6s cubic-bezier(0.22,1,0.36,1) ${Math.min(0.05 + i * 0.06, 0.8)}s`,
                  }}
                  className="shop-product-card"
                >
                  <div
                    className="shop-card-inner"
                    style={{
                      backgroundColor: "#fff",
                      borderRadius: 22,
                      overflow: "hidden",
                      border: "1px solid rgba(241,229,220,0.5)",
                      transition: "all 0.4s cubic-bezier(0.22,1,0.36,1)",
                    }}
                  >
                    {/* Image */}
                    <div style={{ position: "relative", aspectRatio: "1/1", backgroundColor: "rgba(255,245,235,0.3)", overflow: "hidden" }}>
                      {product.tag && (
                        <span style={{
                          position: "absolute", top: 10, left: 10, zIndex: 3,
                          fontSize: 10, fontWeight: 700, color: "#fff",
                          backgroundColor: product.tag === "Bestseller" ? "#E9987A" : "#1F2937",
                          padding: "3px 10px", borderRadius: 20,
                          fontFamily: "var(--font-poppins), sans-serif",
                        }}>
                          {product.tag}
                        </span>
                      )}
                      <button
                        className="shop-wishlist"
                        style={{
                          position: "absolute", top: 10, right: 10, zIndex: 3,
                          width: 32, height: 32, borderRadius: "50%", border: "none",
                          backgroundColor: "rgba(255,255,255,0.85)", backdropFilter: "blur(4px)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          cursor: "pointer", color: wishlist.has(product.id) ? "#E9987A" : "#9CA3AF",
                          opacity: wishlist.has(product.id) ? 1 : 0,
                          transform: wishlist.has(product.id) ? "translateY(0)" : "translateY(-4px)",
                          transition: "all 0.3s ease",
                        }}
                        onClick={(e) => {
                          e.preventDefault();
                          const wasInWishlist = wishlist.has(product.id);
                          wishlist.toggle(product.id);
                          toast.show(
                            wasInWishlist ? "Removed from wishlist" : "Added to wishlist",
                            "wishlist"
                          );
                        }}
                      >
                        <Heart size={14} strokeWidth={1.8} fill={wishlist.has(product.id) ? "#E9987A" : "none"} />
                      </button>
                      <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        style={{ objectFit: "contain", padding: 20, transition: "transform 0.5s cubic-bezier(0.22,1,0.36,1)" }}
                        className="shop-prod-img"
                      />
                      <div className="shop-cart-overlay" style={{
                        position: "absolute", bottom: 0, left: 0, right: 0,
                        padding: 10, display: "flex", justifyContent: "center", zIndex: 3,
                        opacity: 0, transform: "translateY(8px)", transition: "all 0.35s ease",
                      }}>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            if (product.sizes.length > 1 || product.colors.length > 1) {
                              // Redirect to product page to choose size/color
                              router.push(`/shop/${product.id}`);
                              return;
                            }
                            addItem(product, product.colors[0]?.name || "", product.sizes[0] || "M", 1);
                            toast.show(`${product.name} added to cart`, "cart");
                          }}
                          style={{
                            display: "inline-flex", alignItems: "center", gap: 6,
                            padding: "8px 18px", backgroundColor: "#1F2937", color: "#fff",
                            fontSize: 11, fontWeight: 600, borderRadius: 10,
                            fontFamily: "var(--font-poppins), sans-serif",
                            border: "none", cursor: "pointer",
                            transition: "background 0.2s ease",
                          }}
                          className="quick-add-btn"
                        >
                          <ShoppingBag size={12} /> Quick Add
                        </button>
                      </div>
                    </div>

                    {/* Info */}
                    <div style={{ padding: "14px 16px 16px", borderTop: "1px solid rgba(241,229,220,0.3)" }}>
                      <p style={{ fontSize: 13.5, fontWeight: 600, color: "#1F2937", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontFamily: "var(--font-poppins), sans-serif" }}>
                        {product.name}
                      </p>
                      {/* Color dots */}
                      <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
                        {product.colors.slice(0, 4).map((c, ci) => (
                          c.hex === "custom" ? (
                            <span key={ci} style={{ fontSize: 10, color: "#9CA3AF", fontFamily: "var(--font-poppins), sans-serif" }}>Custom</span>
                          ) : (
                            <div key={ci} style={{ width: 14, height: 14, borderRadius: 5, backgroundColor: c.hex, border: c.hex === "#FFFFFF" ? "1px solid #E5E7EB" : "1px solid transparent" }} />
                          )
                        ))}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                          <span style={{ fontSize: 16, fontWeight: 700, color: "#1F2937", fontFamily: "var(--font-poppins), sans-serif" }}>
                            ₹{product.price}
                          </span>
                          <span style={{ fontSize: 12, color: "#9CA3AF", textDecoration: "line-through", fontFamily: "var(--font-poppins), sans-serif" }}>
                            ₹{product.originalPrice}
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                          <Star size={11} color="#FBBF24" fill="#FBBF24" />
                          <span style={{ fontSize: 11.5, fontWeight: 600, color: "#1F2937", fontFamily: "var(--font-poppins), sans-serif" }}>
                            {product.rating}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />

      <style jsx global>{`
        .shop-search:focus {
          border-color: #E9987A !important;
        }
        .sort-btn:hover, .cat-pill:hover {
          border-color: rgba(233,152,122,0.5) !important;
        }
        .shop-card-inner:hover {
          border-color: rgba(233,152,122,0.35) !important;
          box-shadow: 0 14px 44px rgba(233,152,122,0.12);
          transform: translateY(-6px);
        }
        .shop-product-card:hover .shop-prod-img {
          transform: scale(1.08) !important;
        }
        .shop-product-card:hover .shop-wishlist {
          opacity: 1 !important;
          transform: translateY(0) !important;
        }
        .shop-wishlist:hover {
          color: #E9987A !important;
        }
        .shop-product-card:hover .shop-cart-overlay {
          opacity: 1 !important;
          transform: translateY(0) !important;
        }
        @media (max-width: 1024px) {
          .shop-grid { grid-template-columns: repeat(3, 1fr) !important; }
        }
        @media (max-width: 768px) {
          .shop-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .shop-toolbar { flex-wrap: wrap; }
          .shop-heading { font-size: 30px !important; }
        }
        @media (max-width: 480px) {
          .shop-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 12px !important; }
          .shop-heading { font-size: 26px !important; }
        }
      `}</style>
    </>
  );
}
