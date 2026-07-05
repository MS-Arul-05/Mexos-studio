"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/sections/Footer";
import {
  ArrowLeft,
  Star,
  Heart,
  ShoppingBag,
  Minus,
  Plus,
  Truck,
  Shield,
  RotateCcw,
  ChevronRight,
  Share2,
  Check,
  MessageCircle,
} from "lucide-react";
import { categorySlugMap } from "@/data/products";
import { useProduct } from "@/lib/catalog";
import { useCartStore } from "@/store/cart";
import { useWishlistStore } from "@/store/wishlist";
import { useToast } from "@/components/ui/Toast";
import { WHATSAPP_NUMBER } from "@/lib/utils";
import SizeGuideModal from "@/components/ui/SizeGuideModal";

export default function ProductDetailClient() {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : "";

  // If slug is a category name (from home page links), redirect to shop with filter
  const categoryKey = categorySlugMap[slug];
  const { product, loading } = useProduct(categoryKey ? null : slug);
  const addItem = useCartStore((s) => s.addItem);
  const wishlist = useWishlistStore();
  const toast = useToast();

  const [selectedColor, setSelectedColor] = useState(0);
  const [selectedSize, setSelectedSize] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  const [addedToCart, setAddedToCart] = useState(false);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);

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

  // Guards AFTER all hooks (rules of hooks). Category slugs redirect to the shop.
  if (categoryKey) {
    if (typeof window !== "undefined") window.location.replace(`/shop?category=${slug}`);
    return null;
  }
  if (loading || !product) {
    return (
      <>
        <Navbar />
        <main style={{ backgroundColor: "#FFF8F3", paddingTop: 72, minHeight: "100vh" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "80px 28px", textAlign: "center", color: "#9CA3AF", fontFamily: "var(--font-poppins), sans-serif" }}>
            {loading ? "Loading product…" : "Product not found."}
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const discount = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);

  const handleAddToCart = () => {
    const colorName = product.colors[selectedColor]?.name || "";
    const sizeName = selectedSize !== null ? product.sizes[selectedSize] : "";
    addItem(product, colorName, sizeName, quantity);
    setAddedToCart(true);
    toast.show(`${product.name} added to cart`, "cart");
    setTimeout(() => setAddedToCart(false), 2500);
  };

  const whatsappMsg = encodeURIComponent(
    `Hi! I'd like to order:\n\nProduct: ${product.name}\nColor: ${product.colors[selectedColor]?.name}\nSize: ${selectedSize !== null ? product.sizes[selectedSize] : "Not selected"}\nQuantity: ${quantity}\n\nPlease confirm availability and total.`
  );

  return (
    <>
      <Navbar />
      <main style={{ backgroundColor: "#FFF8F3", paddingTop: 72, minHeight: "100vh" }}>
        {/* Breadcrumb */}
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 28px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "#9CA3AF", fontFamily: "var(--font-poppins), sans-serif" }}>
            <Link href="/shop" style={{ color: "#9CA3AF", textDecoration: "none", display: "flex", alignItems: "center", gap: 4, transition: "color 0.2s" }} className="breadcrumb-link">
              <ArrowLeft size={13} /> Shop
            </Link>
            <ChevronRight size={12} />
            <span style={{ color: "#6B7280" }}>{product.category}</span>
            <ChevronRight size={12} />
            <span style={{ color: "#1F2937", fontWeight: 500 }}>{product.name}</span>
          </div>
        </div>

        {/* Main product section */}
        <div
          ref={mainRef}
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "32px 28px 80px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 56,
            alignItems: "start",
          }}
          className="pdp-grid"
        >
          {/* ── LEFT: Image Gallery ── */}
          <div
            style={{
              opacity: vis ? 1 : 0,
              transform: vis ? "translateY(0)" : "translateY(20px)",
              transition: "all 0.7s cubic-bezier(0.22,1,0.36,1)",
            }}
          >
            {/* Main image */}
            <div
              style={{
                position: "relative",
                aspectRatio: "1/1",
                backgroundColor: "#fff",
                borderRadius: 22,
                border: "1px solid rgba(241,229,220,0.5)",
                overflow: "hidden",
                marginBottom: 14,
              }}
              className="pdp-main-image"
            >
              <Image
                src={product.images[activeImg]}
                alt={product.name}
                fill
                style={{ objectFit: "contain", padding: 40, transition: "transform 0.4s ease" }}
                className="pdp-img-zoom"
              />
              {/* Discount badge */}
              <span style={{
                position: "absolute", top: 16, left: 16,
                fontSize: 11, fontWeight: 700, color: "#fff",
                backgroundColor: "#E9987A", padding: "5px 12px",
                borderRadius: 20, fontFamily: "var(--font-poppins), sans-serif",
              }}>
                {discount}% OFF
              </span>
              {/* Share + wishlist */}
              <div style={{ position: "absolute", top: 16, right: 16, display: "flex", gap: 8 }}>
                <button className="pdp-icon-btn" style={iconBtnStyle} onClick={() => {
                  const wasInWishlist = wishlist.has(product.id);
                  wishlist.toggle(product.id);
                  toast.show(
                    wasInWishlist ? "Removed from wishlist" : "Added to wishlist",
                    "wishlist"
                  );
                }}>
                  <Heart size={16} strokeWidth={1.8} fill={wishlist.has(product.id) ? "#E9987A" : "none"} color={wishlist.has(product.id) ? "#E9987A" : "#6B7280"} />
                </button>
                <button className="pdp-icon-btn" style={iconBtnStyle}>
                  <Share2 size={16} strokeWidth={1.8} color="#6B7280" />
                </button>
              </div>
            </div>

            {/* Thumbnails */}
            <div style={{ display: "flex", gap: 10 }}>
              {product.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  style={{
                    width: 80, height: 80, borderRadius: 14,
                    border: activeImg === i ? "2px solid #E9987A" : "1.5px solid rgba(241,229,220,0.5)",
                    backgroundColor: "#fff", overflow: "hidden", cursor: "pointer",
                    padding: 8, position: "relative",
                    transition: "border-color 0.3s ease",
                  }}
                  className="pdp-thumb"
                >
                  <Image src={img} alt="" fill style={{ objectFit: "contain", padding: 8 }} />
                </button>
              ))}
            </div>
          </div>

          {/* ── RIGHT: Product Info ── */}
          <div
            style={{
              opacity: vis ? 1 : 0,
              transform: vis ? "translateY(0)" : "translateY(20px)",
              transition: "all 0.7s cubic-bezier(0.22,1,0.36,1) 0.15s",
            }}
          >
            <p style={{ fontSize: 12, fontWeight: 600, color: "#E9987A", textTransform: "uppercase", letterSpacing: 1.5, margin: "0 0 8px", fontFamily: "var(--font-poppins), sans-serif" }}>
              {product.category}
            </p>
            <h1 className="pdp-name" style={{ fontFamily: "var(--font-playfair), 'Playfair Display', serif", fontSize: 34, fontWeight: 700, color: "#1F2937", margin: "0 0 12px", lineHeight: 1.15 }}>
              {product.name}
            </h1>

            {/* Rating */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
              <div style={{ display: "flex", gap: 2 }}>
                {[1,2,3,4,5].map((s) => (
                  <Star key={s} size={14} fill={s <= Math.round(product.rating) ? "#FBBF24" : "#E5E7EB"} color={s <= Math.round(product.rating) ? "#FBBF24" : "#E5E7EB"} />
                ))}
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#1F2937", fontFamily: "var(--font-poppins), sans-serif" }}>{product.rating}</span>
              <span style={{ fontSize: 12.5, color: "#9CA3AF", fontFamily: "var(--font-poppins), sans-serif" }}>({product.reviews} reviews)</span>
            </div>

            {/* Price */}
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 24 }}>
              <span style={{ fontSize: 32, fontWeight: 800, color: "#1F2937", fontFamily: "var(--font-poppins), sans-serif" }}>₹{product.price}</span>
              <span style={{ fontSize: 18, color: "#9CA3AF", textDecoration: "line-through", fontFamily: "var(--font-poppins), sans-serif" }}>₹{product.originalPrice}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#10B981", fontFamily: "var(--font-poppins), sans-serif" }}>Save ₹{product.originalPrice - product.price}</span>
            </div>

            <p style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.7, margin: "0 0 28px", fontFamily: "var(--font-poppins), sans-serif" }}>
              {product.description}
            </p>

            {/* Divider */}
            <div style={{ height: 1, backgroundColor: "rgba(241,229,220,0.6)", margin: "0 0 24px" }} />

            {/* Color picker */}
            <div style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#1F2937", margin: "0 0 12px", fontFamily: "var(--font-poppins), sans-serif" }}>
                Color: <span style={{ fontWeight: 400, color: "#6B7280" }}>{product.colors[selectedColor]?.name}</span>
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                {product.colors.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedColor(i)}
                    style={{
                      width: 36, height: 36, borderRadius: 10,
                      backgroundColor: c.hex,
                      border: selectedColor === i ? "2.5px solid #E9987A" : c.hex === "#FFFFFF" || c.hex === "#FAF5F0" ? "1.5px solid #E5E7EB" : "1.5px solid transparent",
                      cursor: "pointer", position: "relative",
                      boxShadow: selectedColor === i ? "0 0 0 3px rgba(233,152,122,0.2)" : "none",
                      transition: "all 0.25s ease",
                    }}
                  >
                    {selectedColor === i && (
                      <Check size={14} color={c.hex === "#FFFFFF" || c.hex === "#FAF5F0" ? "#1F2937" : "#fff"} style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)" }} />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Size picker */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#1F2937", margin: 0, fontFamily: "var(--font-poppins), sans-serif" }}>Size</p>
                <button onClick={() => setSizeGuideOpen(true)} style={{ fontSize: 12, color: "#E9987A", fontWeight: 500, background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-poppins), sans-serif", textDecoration: "underline" }}>
                  Size Guide
                </button>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {product.sizes.map((s, i) => (
                  <button
                    key={s}
                    onClick={() => setSelectedSize(i)}
                    className="size-btn"
                    style={{
                      width: 48, height: 48, borderRadius: 12,
                      border: selectedSize === i ? "2px solid #E9987A" : "1.5px solid rgba(241,229,220,0.7)",
                      backgroundColor: selectedSize === i ? "rgba(233,152,122,0.06)" : "#fff",
                      fontSize: 13, fontWeight: selectedSize === i ? 700 : 500,
                      color: selectedSize === i ? "#E9987A" : "#4B5563",
                      fontFamily: "var(--font-poppins), sans-serif",
                      cursor: "pointer", transition: "all 0.25s ease",
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div style={{ marginBottom: 28 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#1F2937", margin: "0 0 12px", fontFamily: "var(--font-poppins), sans-serif" }}>Quantity</p>
              <div style={{ display: "inline-flex", alignItems: "center", borderRadius: 12, border: "1.5px solid rgba(241,229,220,0.7)", overflow: "hidden" }}>
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} style={{ ...qtyBtnStyle }}>
                  <Minus size={14} />
                </button>
                <span style={{ width: 48, textAlign: "center", fontSize: 14, fontWeight: 600, color: "#1F2937", fontFamily: "var(--font-poppins), sans-serif" }}>
                  {quantity}
                </span>
                <button onClick={() => setQuantity(quantity + 1)} style={{ ...qtyBtnStyle }}>
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 12, marginBottom: 28 }} className="pdp-actions">
              <button
                onClick={handleAddToCart}
                className="pdp-add-cart"
                style={{
                  flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  padding: "16px 28px", backgroundColor: "#E9987A", color: "#fff",
                  fontSize: 15, fontWeight: 700, borderRadius: 14, border: "none",
                  cursor: "pointer", fontFamily: "var(--font-poppins), sans-serif",
                  boxShadow: "0 8px 28px rgba(233,152,122,0.35)",
                  transition: "all 0.35s cubic-bezier(0.22,1,0.36,1)",
                }}
              >
                {addedToCart ? <><Check size={16} /> Added!</> : <><ShoppingBag size={16} /> Add to Cart</>}
              </button>
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappMsg}`}
                target="_blank"
                rel="noopener noreferrer"
                className="pdp-whatsapp"
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  padding: "16px 24px", backgroundColor: "#fff", color: "#25D366",
                  fontSize: 14, fontWeight: 600, borderRadius: 14,
                  border: "1.5px solid #25D366", cursor: "pointer",
                  fontFamily: "var(--font-poppins), sans-serif",
                  transition: "all 0.35s ease", textDecoration: "none",
                }}
              >
                <MessageCircle size={16} /> WhatsApp
              </a>
            </div>

            {/* Trust badges */}
            <div style={{ display: "flex", gap: 20 }}>
              {[
                { icon: Truck, text: "Free shipping over ₹999" },
                { icon: Shield, text: "100% quality guarantee" },
                { icon: RotateCcw, text: "Easy 7-day returns" },
              ].map((b) => (
                <div key={b.text} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <b.icon size={15} color="#9CA3AF" strokeWidth={1.5} />
                  <span style={{ fontSize: 11.5, color: "#9CA3AF", fontFamily: "var(--font-poppins), sans-serif" }}>{b.text}</span>
                </div>
              ))}
            </div>

            {/* Specs */}
            <div style={{ marginTop: 32, padding: "20px 0", borderTop: "1px solid rgba(241,229,220,0.6)" }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#1F2937", margin: "0 0 14px", fontFamily: "var(--font-poppins), sans-serif" }}>Details</h3>
              {[
                { label: "Fabric", value: product.fabric },
                { label: "Weight", value: product.gsm },
                { label: "Care", value: product.care },
              ].map((d) => (
                <div key={d.label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(241,229,220,0.3)" }}>
                  <span style={{ fontSize: 13, color: "#6B7280", fontFamily: "var(--font-poppins), sans-serif" }}>{d.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "#1F2937", fontFamily: "var(--font-poppins), sans-serif" }}>{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />

      <SizeGuideModal open={sizeGuideOpen} onClose={() => setSizeGuideOpen(false)} />

      <style jsx global>{`
        .breadcrumb-link:hover { color: #E9987A !important; }
        .pdp-main-image:hover .pdp-img-zoom { transform: scale(1.06); }
        .pdp-icon-btn:hover { background-color: rgba(233,152,122,0.08) !important; border-color: rgba(233,152,122,0.3) !important; }
        .pdp-thumb:hover { border-color: rgba(233,152,122,0.5) !important; }
        .size-btn:hover { border-color: rgba(233,152,122,0.5) !important; }
        .pdp-add-cart:hover { transform: translateY(-2px); box-shadow: 0 12px 36px rgba(233,152,122,0.4) !important; }
        .pdp-whatsapp:hover { background-color: #25D366 !important; color: #fff !important; }
        @media (max-width: 1024px) {
          .pdp-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
        }
        @media (max-width: 640px) {
          .pdp-actions { flex-direction: column; }
          .pdp-name { font-size: 24px !important; }
          .pdp-price { font-size: 22px !important; }
        }
        @media (max-width: 480px) {
          .pdp-name { font-size: 20px !important; }
        }
      `}</style>
    </>
  );
}

const iconBtnStyle: React.CSSProperties = {
  width: 40, height: 40, borderRadius: 12,
  border: "1px solid rgba(241,229,220,0.5)",
  backgroundColor: "rgba(255,255,255,0.9)", backdropFilter: "blur(4px)",
  display: "flex", alignItems: "center", justifyContent: "center",
  cursor: "pointer", transition: "all 0.3s ease",
};

const qtyBtnStyle: React.CSSProperties = {
  width: 44, height: 44, border: "none", background: "transparent",
  display: "flex", alignItems: "center", justifyContent: "center",
  cursor: "pointer", color: "#4B5563", transition: "background 0.2s ease",
};
