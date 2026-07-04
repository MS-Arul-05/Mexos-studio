"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";

const categories = [
  { name: "T-Shirts", image: "/images/categories/tshirt.png", href: "/shop/tshirts", count: "120+", tag: "Most Popular" },
  { name: "Hoodies", image: "/images/categories/hoodie.png", href: "/shop/hoodies", count: "85+", tag: "Trending" },
  { name: "Polo Shirts", image: "/images/categories/polo.png", href: "/shop/polo", count: "64+", tag: null },
  { name: "Sweatshirts", image: "/images/categories/sweatshirt.png", href: "/shop/sweatshirts", count: "48+", tag: null },
  { name: "Jerseys", image: "/images/categories/jersey.png", href: "/shop/jerseys", count: "36+", tag: "New" },
];

export default function Categories() {
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section ref={sectionRef} style={{ padding: "100px 0", backgroundColor: "#FFF8F3" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 28px" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            marginBottom: 48,
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(20px)",
            transition: "all 0.7s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
          className="cat-header"
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
              Categories
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
              Shop by Category
            </h2>
          </div>
          <Link
            href="/shop"
            className="view-all-link"
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

        {/* Bento Grid — 2 large left + 3 small right */}
        <div
          className="cat-bento"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gridTemplateRows: "1fr 1fr",
            gap: 20,
          }}
        >
          {/* Large cards — left column */}
          {categories.slice(0, 2).map((cat, i) => (
            <Link
              key={cat.name}
              href={cat.href}
              className="category-card category-card-lg"
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "#fff",
                borderRadius: 22,
                overflow: "hidden",
                border: "1px solid rgba(241,229,220,0.5)",
                textDecoration: "none",
                transition: "all 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(30px)",
                transitionDelay: `${0.1 + i * 0.1}s`,
                gridColumn: "1 / 2",
                minHeight: 200,
                position: "relative",
                height: "100%",
              }}
            >
              {/* Tag badge */}
              {cat.tag && (
                <span
                  className="cat-tag"
                  style={{
                    position: "absolute",
                    top: 14,
                    left: 14,
                    zIndex: 3,
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#fff",
                    backgroundColor: "#E9987A",
                    padding: "4px 10px",
                    borderRadius: 8,
                    fontFamily: "var(--font-poppins), 'Poppins', sans-serif",
                    letterSpacing: "0.02em",
                    boxShadow: "0 4px 12px rgba(233,152,122,0.3)",
                  }}
                >
                  {cat.tag}
                </span>
              )}

              {/* Image area */}
              <div
                style={{
                  position: "relative",
                  width: "45%",
                  flexShrink: 0,
                  aspectRatio: "1/1",
                  backgroundColor: "rgba(255,245,235,0.35)",
                  overflow: "hidden",
                }}
              >
                <Image
                  src={cat.image}
                  alt={cat.name}
                  fill
                  style={{
                    objectFit: "contain",
                    padding: 24,
                    transition: "transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)",
                  }}
                  className="category-img"
                />
              </div>

              {/* Text area */}
              <div style={{ flex: 1, padding: "20px 24px" }}>
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#E9987A",
                    margin: "0 0 6px",
                    fontFamily: "var(--font-poppins), 'Poppins', sans-serif",
                  }}
                >
                  {cat.count} items
                </p>
                <h3
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: "#1F2937",
                    margin: "0 0 8px",
                    fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif",
                  }}
                >
                  {cat.name}
                </h3>
                <span
                  className="explore-text"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#E9987A",
                    fontFamily: "var(--font-poppins), 'Poppins', sans-serif",
                    transition: "gap 0.3s ease",
                  }}
                >
                  Explore <ArrowRight size={13} className="explore-arrow" />
                </span>
              </div>
            </Link>
          ))}

          {/* Small cards — right column, stacked 3 in a sub-grid */}
          <div
            className="cat-small-col"
            style={{
              gridColumn: "2 / 3",
              gridRow: "1 / 3",
              display: "flex",
              flexDirection: "column",
              gap: 20,
            }}
          >
            {categories.slice(2).map((cat, i) => (
              <Link
                key={cat.name}
                href={cat.href}
                className="category-card category-card-sm"
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "#fff",
                  borderRadius: 22,
                  overflow: "hidden",
                  border: "1px solid rgba(241,229,220,0.5)",
                  textDecoration: "none",
                  transition: "all 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
                  opacity: visible ? 1 : 0,
                  transform: visible ? "translateY(0)" : "translateY(30px)",
                  transitionDelay: `${0.3 + i * 0.1}s`,
                  position: "relative",
                  flex: 1,
                }}
              >
                {/* Tag badge */}
                {cat.tag && (
                  <span
                    className="cat-tag"
                    style={{
                      position: "absolute",
                      top: 10,
                      left: 10,
                      zIndex: 3,
                      fontSize: 9,
                      fontWeight: 700,
                      color: "#fff",
                      backgroundColor: cat.tag === "New" ? "#6BC5A0" : "#E9987A",
                      padding: "3px 8px",
                      borderRadius: 6,
                      fontFamily: "var(--font-poppins), 'Poppins', sans-serif",
                      letterSpacing: "0.02em",
                    }}
                  >
                    {cat.tag}
                  </span>
                )}

                {/* Image */}
                <div
                  style={{
                    position: "relative",
                    width: 100,
                    height: 100,
                    flexShrink: 0,
                    backgroundColor: "rgba(255,245,235,0.35)",
                    overflow: "hidden",
                    borderRadius: "22px 0 0 22px",
                  }}
                >
                  <Image
                    src={cat.image}
                    alt={cat.name}
                    fill
                    style={{
                      objectFit: "contain",
                      padding: 14,
                      transition: "transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)",
                    }}
                    className="category-img"
                  />
                </div>

                {/* Text */}
                <div style={{ flex: 1, padding: "12px 16px" }}>
                  <p
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "#1F2937",
                      margin: "0 0 2px",
                      fontFamily: "var(--font-poppins), 'Poppins', sans-serif",
                    }}
                  >
                    {cat.name}
                  </p>
                  <p
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      color: "#9CA3AF",
                      margin: 0,
                      fontFamily: "var(--font-poppins), 'Poppins', sans-serif",
                    }}
                  >
                    {cat.count} items
                  </p>
                </div>

                {/* Arrow */}
                <div
                  className="cat-sm-arrow"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    border: "1px solid rgba(241,229,220,0.5)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 14,
                    flexShrink: 0,
                    transition: "all 0.3s ease",
                    color: "#9CA3AF",
                  }}
                >
                  <ArrowUpRight size={14} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <style jsx global>{`
        .category-card:hover {
          border-color: rgba(233,152,122,0.35) !important;
          box-shadow: 0 12px 40px rgba(233,152,122,0.12);
          transform: translateY(-4px) !important;
        }
        .category-card:hover .category-img {
          transform: scale(1.1);
        }
        .category-card:hover .explore-text {
          gap: 8px !important;
        }
        .category-card:hover .explore-arrow {
          transform: translateX(3px);
          transition: transform 0.3s ease;
        }
        .category-card-sm:hover .cat-sm-arrow {
          background-color: #E9987A !important;
          border-color: #E9987A !important;
          color: #fff !important;
        }
        .view-all-link:hover {
          background-color: rgba(233,152,122,0.06) !important;
          border-color: rgba(233,152,122,0.4) !important;
          gap: 8px !important;
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .cat-bento {
            grid-template-columns: 1fr !important;
          }
          .cat-small-col {
            grid-column: 1 / -1 !important;
            grid-row: auto !important;
          }
          .category-card-lg {
            grid-column: 1 / -1 !important;
          }
        }
        @media (max-width: 640px) {
          .cat-header {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 16px;
          }
          .category-card-lg {
            flex-direction: column !important;
            min-height: auto !important;
          }
          .category-card-lg > div:first-of-type {
            width: 100% !important;
          }
        }
      `}</style>
    </section>
  );
}
