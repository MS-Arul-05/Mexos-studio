"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Heart, ShoppingBag, User, Menu, X, ArrowRight, Palette } from "lucide-react";
import { useCartStore } from "@/store/cart";
import { useWishlistStore } from "@/store/wishlist";
import { tokenStore } from "@/lib/api";
import SearchOverlay from "@/components/ui/SearchOverlay";

const navLinks = [
  { name: "Home", href: "/" },
  { name: "Shop", href: "/shop" },
  { name: "Customize", href: "/customize" },
  { name: "About Us", href: "/about" },
  { name: "Bulk Orders", href: "/bulk-orders" },
  { name: "Contact", href: "/contact" },
];

export default function Navbar() {
  const pathname = usePathname();
  const totalItems = useCartStore((s) => s.totalItems());
  const wishlistCount = useWishlistStore((s) => s.ids.length);
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  // Account icon points at /account when a session exists (hydrated client-side
  // to avoid an SSR/client markup mismatch).
  useEffect(() => {
    const sync = () => setLoggedIn(tokenStore.isLoggedIn);
    sync();
    window.addEventListener("mxs-auth-changed", sync);
    return () => window.removeEventListener("mxs-auth-changed", sync);
  }, []);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <>
      <header
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          backgroundColor: scrolled ? "rgba(255,255,255,0.92)" : "#ffffff",
          backdropFilter: scrolled ? "blur(16px)" : "none",
          WebkitBackdropFilter: scrolled ? "blur(16px)" : "none",
          boxShadow: scrolled ? "0 1px 24px rgba(0,0,0,0.05)" : "none",
          transition: "all 0.5s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 28px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              height: 72,
            }}
          >
            {/* Logo with mark */}
            <Link href="/" style={{ textDecoration: "none", flexShrink: 0, display: "flex", alignItems: "center", gap: 10 }}>
              {/* Logo mark — peach square with "M" */}
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  background: "linear-gradient(135deg, #F6B49A, #E9987A)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 3px 12px rgba(233,152,122,0.3)",
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif",
                    fontSize: 18,
                    fontWeight: 800,
                    color: "#fff",
                    lineHeight: 1,
                  }}
                >
                  M
                </span>
              </div>
              <span
                style={{
                  fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif",
                  fontSize: 24,
                  fontWeight: 700,
                  fontStyle: "italic",
                  color: "#1F2937",
                  letterSpacing: "-0.02em",
                }}
              >
                Mexos Studio
              </span>
            </Link>

            {/* Center Navigation - Desktop */}
            <nav
              style={{
                display: "flex",
                alignItems: "center",
                gap: 2,
              }}
              className="hidden lg:flex"
            >
              {navLinks.map((link) => {
                const active = isActive(link.href);
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    style={{
                      position: "relative",
                      padding: "8px 16px",
                      fontSize: 13.5,
                      fontWeight: active ? 600 : 500,
                      color: active ? "#E9987A" : "#4B5563",
                      textDecoration: "none",
                      transition: "color 0.3s ease",
                      fontFamily: "var(--font-poppins), 'Poppins', sans-serif",
                    }}
                    className="nav-link"
                    onMouseEnter={(e) => {
                      if (!active) e.currentTarget.style.color = "#1F2937";
                    }}
                    onMouseLeave={(e) => {
                      if (!active) e.currentTarget.style.color = "#4B5563";
                    }}
                  >
                    {link.name}
                    {active && (
                      <span
                        style={{
                          position: "absolute",
                          bottom: 0,
                          left: "50%",
                          transform: "translateX(-50%)",
                          width: 20,
                          height: 2,
                          borderRadius: 2,
                          backgroundColor: "#E9987A",
                        }}
                      />
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Right: Icons + CTA */}
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {/* Icon buttons */}
              {[
                { icon: Search, hideOnMobile: false, href: undefined, onClick: () => setSearchOpen(true), badge: 0 },
                { icon: User, hideOnMobile: true, href: loggedIn ? "/account" : "/login", onClick: undefined, badge: 0 },
                { icon: Heart, hideOnMobile: true, href: "/wishlist", onClick: undefined, badge: wishlistCount },
              ].map(({ icon: Icon, hideOnMobile, href, onClick, badge }, i) => {
                const btn = (
                  <button
                    key={i}
                    onClick={onClick}
                    className={hideOnMobile ? "hidden sm:flex" : "flex"}
                    style={{
                      position: "relative",
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      border: "none",
                      background: "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      color: "#4B5563",
                      transition: "all 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#FFF5EB";
                      e.currentTarget.style.color = "#E9987A";
                      e.currentTarget.style.transform = "translateY(-1px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                      e.currentTarget.style.color = "#4B5563";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    <Icon size={18} strokeWidth={1.5} />
                    {badge > 0 && (
                      <span style={{
                        position: "absolute", top: 3, right: 1, width: 15, height: 15,
                        backgroundColor: "#E9987A", color: "#fff", fontSize: 8, fontWeight: 700,
                        borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                        fontFamily: "var(--font-poppins), sans-serif",
                      }}>
                        {badge > 9 ? "9+" : badge}
                      </span>
                    )}
                  </button>
                );
                if (href) {
                  return (
                    <Link key={i} href={href} style={{ textDecoration: "none" }}>
                      {btn}
                    </Link>
                  );
                }
                return btn;
              })}

              {/* Cart with badge */}
              <Link href="/checkout" style={{ textDecoration: "none" }}>
                <button
                  style={{
                    position: "relative",
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    border: "none",
                    background: "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    color: "#4B5563",
                    transition: "all 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#FFF5EB";
                    e.currentTarget.style.color = "#E9987A";
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.color = "#4B5563";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  <ShoppingBag size={18} strokeWidth={1.5} />
                  {totalItems > 0 && (
                    <span
                      className="cart-badge"
                      style={{
                        position: "absolute",
                        top: 3,
                        right: 1,
                        width: 17,
                        height: 17,
                        backgroundColor: "#E9987A",
                        color: "#fff",
                        fontSize: 9,
                        fontWeight: 700,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: "var(--font-poppins), 'Poppins', sans-serif",
                        boxShadow: "0 2px 8px rgba(233,152,122,0.4)",
                      }}
                    >
                      {totalItems > 9 ? "9+" : totalItems}
                    </span>
                  )}
                </button>
              </Link>

              {/* Divider - desktop only */}
              <div
                className="hidden lg:block"
                style={{
                  width: 1,
                  height: 24,
                  backgroundColor: "rgba(241,229,220,0.6)",
                  margin: "0 8px",
                }}
              />

              {/* Design Now CTA - desktop */}
              <Link href="/customize" style={{ textDecoration: "none" }}>
                <button
                  className="nav-cta hidden lg:flex"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "9px 20px",
                    backgroundColor: "#E9987A",
                    color: "#fff",
                    fontSize: 13,
                    fontWeight: 600,
                    borderRadius: 10,
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "var(--font-poppins), 'Poppins', sans-serif",
                    boxShadow: "0 4px 16px rgba(233,152,122,0.3)",
                    transition: "all 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
                    whiteSpace: "nowrap",
                  }}
                >
                  <Palette size={14} strokeWidth={2} />
                  Design Now
                </button>
              </Link>

              {/* Mobile hamburger */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="lg:hidden"
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  border: "none",
                  background: "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "#1F2937",
                  marginLeft: 2,
                  transition: "transform 0.3s ease",
                }}
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* Bottom border - gradient */}
        <div
          style={{
            height: 1,
            background: scrolled
              ? "linear-gradient(90deg, transparent, rgba(233,152,122,0.2) 30%, rgba(233,152,122,0.3) 50%, rgba(233,152,122,0.2) 70%, transparent)"
              : "linear-gradient(90deg, transparent, rgba(241,229,220,0.6) 20%, rgba(241,229,220,0.6) 80%, transparent)",
            transition: "all 0.5s ease",
          }}
        />
      </header>

      {/* Mobile Menu Overlay */}
      <div
        onClick={() => setMobileOpen(false)}
        className="lg:hidden"
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: mobileOpen ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0)",
          backdropFilter: mobileOpen ? "blur(6px)" : "blur(0px)",
          zIndex: 40,
          pointerEvents: mobileOpen ? "auto" : "none",
          transition: "all 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      />
      <div
        className="lg:hidden"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: 300,
          backgroundColor: "#fff",
          zIndex: 50,
          boxShadow: mobileOpen ? "-12px 0 40px rgba(0,0,0,0.1)" : "none",
          padding: "88px 24px 24px",
          transform: mobileOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.45s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.45s ease",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Mobile close button */}
        <button
          onClick={() => setMobileOpen(false)}
          style={{
            position: "absolute",
            top: 20,
            right: 20,
            width: 40,
            height: 40,
            borderRadius: 12,
            border: "1px solid rgba(241,229,220,0.6)",
            background: "transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "#4B5563",
          }}
        >
          <X size={18} />
        </button>

        {/* Mobile logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 28, position: "absolute", top: 22, left: 24 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: "linear-gradient(135deg, #F6B49A, #E9987A)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ fontFamily: "var(--font-playfair), serif", fontSize: 14, fontWeight: 800, color: "#fff" }}>M</span>
          </div>
          <span
            style={{
              fontFamily: "var(--font-playfair), serif",
              fontSize: 18,
              fontWeight: 700,
              fontStyle: "italic",
              color: "#1F2937",
            }}
          >
            Mexos Studio
          </span>
        </div>

        <div style={{ flex: 1 }}>
          {navLinks.map((link, i) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 16px",
                  fontSize: 15,
                  fontWeight: active ? 600 : 500,
                  color: active ? "#E9987A" : "#1F2937",
                  textDecoration: "none",
                  borderRadius: 14,
                  transition: "background-color 0.2s ease",
                  fontFamily: "var(--font-poppins), 'Poppins', sans-serif",
                  borderBottom: i < navLinks.length - 1 ? "1px solid rgba(241,229,220,0.4)" : "none",
                }}
              >
                {link.name}
                {active && (
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      backgroundColor: "#E9987A",
                    }}
                  />
                )}
              </Link>
            );
          })}
        </div>

        {/* Mobile CTA */}
        <Link href="/customize" onClick={() => setMobileOpen(false)} style={{ textDecoration: "none" }}>
          <button
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              width: "100%",
              padding: "14px 24px",
              backgroundColor: "#E9987A",
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              borderRadius: 14,
              border: "none",
              cursor: "pointer",
              fontFamily: "var(--font-poppins), 'Poppins', sans-serif",
              boxShadow: "0 6px 20px rgba(233,152,122,0.3)",
              marginTop: 16,
            }}
          >
            <Palette size={16} strokeWidth={2} />
            Design Now
            <ArrowRight size={14} />
          </button>
        </Link>
      </div>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />

      <style jsx global>{`
        .nav-link::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%) scaleX(0);
          width: 20px;
          height: 2px;
          border-radius: 2px;
          background-color: #E9987A;
          transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .nav-link:hover::after {
          transform: translateX(-50%) scaleX(1);
        }
        @keyframes badge-pulse {
          0%, 100% { box-shadow: 0 2px 8px rgba(233,152,122,0.4); }
          50% { box-shadow: 0 2px 14px rgba(233,152,122,0.6); }
        }
        .cart-badge {
          animation: badge-pulse 2.5s ease-in-out infinite;
        }
        .nav-cta:hover {
          background-color: #d4836a !important;
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(233,152,122,0.4) !important;
        }
      `}</style>
    </>
  );
}
