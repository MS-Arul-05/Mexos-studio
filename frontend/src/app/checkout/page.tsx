"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/sections/Footer";
import { useCartStore } from "@/store/cart";
import { api, toE164, tokenStore, ApiError } from "@/lib/api";
import { findVariantId, type ApiProduct } from "@/lib/catalog";
import {
  Minus,
  Plus,
  Trash2,
  ShoppingBag,
  ArrowLeft,
  ArrowRight,
  MapPin,
  CreditCard,
  Check,
  MessageCircle,
  Truck,
  Shield,
  Tag,
} from "lucide-react";

const steps = ["Cart", "Address", "Payment"];

export default function CheckoutPage() {
  const { items, removeItem, updateQuantity, clearCart, totalPrice } = useCartStore();
  const [step, setStep] = useState(0);
  const [vis, setVis] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);

  const [address, setAddress] = useState({ name: "", phone: "", line1: "", line2: "", city: "", state: "", pin: "" });
  const [payMethod, setPayMethod] = useState<"online" | "cod" | "whatsapp">("online");
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [coupon, setCoupon] = useState("");
  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState("");
  const [placedOrder, setPlacedOrder] = useState<{ id: string; total: string; discount: string } | null>(null);

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

  const shipping = totalPrice() >= 999 ? 0 : 79;
  const grandTotal = totalPrice() + shipping;

  const handlePlaceOrder = async () => {
    if (payMethod === "whatsapp") {
      const itemLines = items.map((i) => `${i.product.name} (${i.color}, ${i.size}) x${i.quantity} — ₹${i.product.price * i.quantity}`).join("\n");
      const msg = encodeURIComponent(
        `Hi! I'd like to place an order:\n\n${itemLines}\n\nSubtotal: ₹${totalPrice()}\nShipping: ${shipping === 0 ? "Free" : `₹${shipping}`}\nTotal: ₹${grandTotal}\n\nDelivery to:\n${address.name}\n${address.line1}${address.line2 ? ", " + address.line2 : ""}\n${address.city}, ${address.state} - ${address.pin}\nPhone: ${address.phone}`
      );
      window.open(`https://wa.me/919876543210?text=${msg}`, "_blank");
      setOrderPlaced(true);
      clearCart();
      return;
    }

    setPlacing(true);
    setPlaceError("");
    try {
      // Resolve each cart line to the backend variant id (color + size).
      const orderItems = items.map((i) => {
        const variantId = findVariantId(i.product as ApiProduct, i.color, i.size);
        if (!variantId) {
          throw new ApiError("VARIANT_NOT_FOUND", `${i.product.name} (${i.color}/${i.size}) is unavailable — please re-add it to your cart.`, 400);
        }
        return { variantId, quantity: i.quantity };
      });

      const loggedIn = tokenStore.isLoggedIn;
      const order = await api.post<{
        id: string; total: string; discount: string; status: string; guestToken?: string;
      }>(
        "/orders",
        {
          items: orderItems,
          ...(coupon.trim() ? { couponCode: coupon.trim().toUpperCase() } : {}),
          ...(loggedIn ? {} : { guestMobile: toE164(address.phone), guestName: address.name }),
          shippingAddress: {
            name: address.name,
            phone: address.phone,
            line1: address.line1,
            ...(address.line2 ? { line2: address.line2 } : {}),
            city: address.city,
            state: address.state,
            pincode: address.pin,
          },
          paymentMethod: payMethod === "cod" ? "COD" : "ONLINE",
        },
        { auth: loggedIn },
      );

      if (order.guestToken) localStorage.setItem(`mxs_guest_${order.id}`, order.guestToken);

      if (payMethod === "online") {
        const session = await api.post<{ keyId: string | null; gatewayOrderId: string; amount: number; currency: string }>(
          "/payments/checkout",
          { orderId: order.id },
          { auth: loggedIn, headers: order.guestToken ? { "X-Guest-Token": order.guestToken } : {} },
        );
        if (session.keyId) {
          // Real gateway configured — open Razorpay Checkout.
          await new Promise<void>((resolve, reject) => {
            const s = document.createElement("script");
            s.src = "https://checkout.razorpay.com/v1/checkout.js";
            s.onload = () => resolve();
            s.onerror = () => reject(new Error("Could not load payment SDK"));
            document.body.appendChild(s);
          });
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          new (window as any).Razorpay({
            key: session.keyId,
            order_id: session.gatewayOrderId,
            amount: session.amount,
            currency: session.currency,
            name: "Mexos Studio",
            // Confirmation comes from the server-side webhook; this just closes the loop in the UI.
            handler: () => { setPlacedOrder(order); setOrderPlaced(true); clearCart(); },
          }).open();
          return; // success screen shows after the Razorpay handler fires
        }
        // Stub gateway (dev): the session exists; payment confirms via webhook simulation.
      }

      setPlacedOrder(order);
      setOrderPlaced(true);
      clearCart();
    } catch (e) {
      setPlaceError(e instanceof ApiError ? e.message : "Could not place the order. Please try again.");
    } finally {
      setPlacing(false);
    }
  };

  if (orderPlaced) {
    return (
      <>
        <Navbar />
        <main style={{ backgroundColor: "#FFF8F3", paddingTop: 72, minHeight: "100vh" }}>
          <div style={{ maxWidth: 600, margin: "0 auto", padding: "100px 28px", textAlign: "center" }}>
            <div style={{
              width: 80, height: 80, borderRadius: "50%", backgroundColor: "rgba(16,185,129,0.1)",
              display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px",
            }}>
              <Check size={36} color="#10B981" strokeWidth={2.5} />
            </div>
            <h1 style={{ fontFamily: "var(--font-playfair), serif", fontSize: 34, fontWeight: 700, color: "#1F2937", margin: "0 0 12px" }}>
              Order Placed!
            </h1>
            <p style={{ fontSize: 15, color: "#6B7280", lineHeight: 1.7, margin: "0 0 12px", fontFamily: "var(--font-poppins), sans-serif" }}>
              {payMethod === "whatsapp"
                ? "We've opened WhatsApp for you. Our team will confirm your order shortly."
                : "Thank you for your order! You'll receive a confirmation on your phone soon."}
            </p>
            {placedOrder && (
              <p style={{ fontSize: 13.5, color: "#4B5563", margin: "0 0 32px", fontFamily: "var(--font-poppins), sans-serif" }}>
                Order ID: <b style={{ userSelect: "all" }}>{placedOrder.id}</b>
                {Number(placedOrder.discount) > 0 && <> · Coupon saved ₹{Number(placedOrder.discount)}</>}
                <br />Amount: <b>₹{Number(placedOrder.total)}</b> — use the Order ID with your phone number to track.
              </p>
            )}
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <Link href="/shop" style={{
                display: "inline-flex", alignItems: "center", gap: 6, padding: "14px 28px",
                backgroundColor: "#E9987A", color: "#fff", fontSize: 14, fontWeight: 600,
                borderRadius: 14, textDecoration: "none", fontFamily: "var(--font-poppins), sans-serif",
                boxShadow: "0 6px 20px rgba(233,152,122,0.3)",
              }}>
                Continue Shopping
              </Link>
              <Link href="/track" style={{
                display: "inline-flex", alignItems: "center", gap: 6, padding: "14px 28px",
                backgroundColor: "#fff", color: "#1F2937", fontSize: 14, fontWeight: 600,
                borderRadius: 14, border: "1.5px solid rgba(241,229,220,0.7)", textDecoration: "none",
                fontFamily: "var(--font-poppins), sans-serif",
              }}>
                Track Order
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main style={{ backgroundColor: "#FFF8F3", paddingTop: 72, minHeight: "100vh" }}>
        <div ref={mainRef} style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 28px 100px" }}>
          {/* Header */}
          <div style={{
            marginBottom: 36,
            opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(18px)",
            transition: "all 0.7s cubic-bezier(0.22,1,0.36,1)",
          }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "#E9987A", textTransform: "uppercase", letterSpacing: 2, margin: "0 0 8px", fontFamily: "var(--font-poppins), sans-serif" }}>
              Checkout
            </p>
            <h1 style={{ fontFamily: "var(--font-playfair), serif", fontSize: 40, fontWeight: 700, color: "#1F2937", margin: 0 }}>
              Your Cart
            </h1>
          </div>

          {/* Stepper */}
          <div style={{
            display: "flex", alignItems: "center", gap: 0, marginBottom: 44,
            opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(14px)",
            transition: "all 0.7s cubic-bezier(0.22,1,0.36,1) 0.1s",
          }}>
            {steps.map((s, i) => (
              <div key={s} style={{ display: "flex", alignItems: "center" }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 8, cursor: i <= step ? "pointer" : "default",
                }} onClick={() => { if (i < step) setStep(i); }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 10,
                    backgroundColor: i <= step ? "#E9987A" : "#fff",
                    border: i <= step ? "none" : "1.5px solid rgba(241,229,220,0.7)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, fontWeight: 700, color: i <= step ? "#fff" : "#9CA3AF",
                    fontFamily: "var(--font-poppins), sans-serif",
                    transition: "all 0.3s ease",
                  }}>
                    {i < step ? <Check size={14} /> : i + 1}
                  </div>
                  <span style={{
                    fontSize: 13, fontWeight: i === step ? 600 : 500,
                    color: i <= step ? "#1F2937" : "#9CA3AF",
                    fontFamily: "var(--font-poppins), sans-serif",
                  }}>{s}</span>
                </div>
                {i < steps.length - 1 && (
                  <div style={{
                    width: 48, height: 2, borderRadius: 2, margin: "0 12px",
                    backgroundColor: i < step ? "#E9987A" : "rgba(241,229,220,0.7)",
                    transition: "background-color 0.3s ease",
                  }} />
                )}
              </div>
            ))}
          </div>

          {items.length === 0 && step === 0 ? (
            <div style={{
              textAlign: "center", padding: "80px 0",
              opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(18px)",
              transition: "all 0.7s cubic-bezier(0.22,1,0.36,1) 0.2s",
            }}>
              <ShoppingBag size={48} color="#D1D5DB" strokeWidth={1.2} style={{ margin: "0 auto 20px", display: "block" }} />
              <p style={{ fontSize: 18, fontWeight: 600, color: "#1F2937", margin: "0 0 8px", fontFamily: "var(--font-poppins), sans-serif" }}>
                Your cart is empty
              </p>
              <p style={{ fontSize: 14, color: "#9CA3AF", margin: "0 0 28px", fontFamily: "var(--font-poppins), sans-serif" }}>
                Looks like you haven't added anything yet.
              </p>
              <Link href="/shop" style={{
                display: "inline-flex", alignItems: "center", gap: 6, padding: "14px 28px",
                backgroundColor: "#E9987A", color: "#fff", fontSize: 14, fontWeight: 600,
                borderRadius: 14, textDecoration: "none", fontFamily: "var(--font-poppins), sans-serif",
                boxShadow: "0 6px 20px rgba(233,152,122,0.3)",
              }}>
                <ArrowLeft size={14} /> Browse Products
              </Link>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 36, alignItems: "start" }} className="checkout-grid">
              {/* Left column */}
              <div style={{
                opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(18px)",
                transition: "all 0.7s cubic-bezier(0.22,1,0.36,1) 0.15s",
              }}>
                {/* Step 0: Cart items */}
                {step === 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {items.map((item) => (
                      <div key={`${item.product.id}-${item.color}-${item.size}`} style={{
                        display: "flex", gap: 16, padding: 18, backgroundColor: "#fff",
                        borderRadius: 18, border: "1px solid rgba(241,229,220,0.5)",
                      }} className="checkout-item">
                        <div style={{
                          width: 100, height: 100, borderRadius: 14, backgroundColor: "rgba(255,245,235,0.3)",
                          overflow: "hidden", position: "relative", flexShrink: 0,
                        }}>
                          <Image src={item.product.image} alt={item.product.name} fill style={{ objectFit: "contain", padding: 10 }} />
                        </div>
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                          <div>
                            <p style={{ fontSize: 14, fontWeight: 600, color: "#1F2937", margin: "0 0 4px", fontFamily: "var(--font-poppins), sans-serif" }}>
                              {item.product.name}
                            </p>
                            <p style={{ fontSize: 12, color: "#9CA3AF", margin: 0, fontFamily: "var(--font-poppins), sans-serif" }}>
                              {item.color}{item.size ? ` / ${item.size}` : ""}
                            </p>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <div style={{ display: "inline-flex", alignItems: "center", borderRadius: 10, border: "1.5px solid rgba(241,229,220,0.7)", overflow: "hidden" }}>
                              <button
                                onClick={() => updateQuantity(item.product.id, item.color, item.size, item.quantity - 1)}
                                style={{ width: 34, height: 34, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#4B5563" }}
                              >
                                <Minus size={12} />
                              </button>
                              <span style={{ width: 32, textAlign: "center", fontSize: 13, fontWeight: 600, color: "#1F2937", fontFamily: "var(--font-poppins), sans-serif" }}>
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(item.product.id, item.color, item.size, item.quantity + 1)}
                                style={{ width: 34, height: 34, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#4B5563" }}
                              >
                                <Plus size={12} />
                              </button>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                              <span style={{ fontSize: 15, fontWeight: 700, color: "#1F2937", fontFamily: "var(--font-poppins), sans-serif" }}>
                                ₹{item.product.price * item.quantity}
                              </span>
                              <button
                                onClick={() => removeItem(item.product.id, item.color, item.size)}
                                style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#9CA3AF", transition: "color 0.2s" }}
                                className="checkout-del"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Step 1: Address */}
                {step === 1 && (
                  <div style={{
                    backgroundColor: "#fff", borderRadius: 22, border: "1px solid rgba(241,229,220,0.5)",
                    padding: 28,
                  }}>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1F2937", margin: "0 0 24px", fontFamily: "var(--font-poppins), sans-serif", display: "flex", alignItems: "center", gap: 8 }}>
                      <MapPin size={18} color="#E9987A" /> Delivery Address
                    </h2>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="addr-grid">
                      {[
                        { key: "name", label: "Full Name", full: false, type: "text" },
                        { key: "phone", label: "Phone Number", full: false, type: "tel" },
                        { key: "line1", label: "Address Line 1", full: true, type: "text" },
                        { key: "line2", label: "Address Line 2 (Optional)", full: true, type: "text" },
                        { key: "city", label: "City", full: false, type: "text" },
                        { key: "state", label: "State", full: false, type: "text" },
                        { key: "pin", label: "PIN Code", full: false, type: "text" },
                      ].map((f) => (
                        <div key={f.key} style={{ gridColumn: f.full ? "1 / -1" : undefined }}>
                          <label style={{ fontSize: 12, fontWeight: 600, color: "#4B5563", marginBottom: 6, display: "block", fontFamily: "var(--font-poppins), sans-serif" }}>
                            {f.label}
                          </label>
                          <input
                            type={f.type}
                            value={address[f.key as keyof typeof address]}
                            onChange={(e) => setAddress({ ...address, [f.key]: e.target.value })}
                            style={{
                              width: "100%", padding: "12px 16px", borderRadius: 12,
                              border: "1.5px solid rgba(241,229,220,0.7)", backgroundColor: "#FFF8F3",
                              fontSize: 13.5, color: "#1F2937", fontFamily: "var(--font-poppins), sans-serif",
                              outline: "none", transition: "border-color 0.3s ease",
                            }}
                            className="addr-input"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 2: Payment */}
                {step === 2 && (
                  <div style={{
                    backgroundColor: "#fff", borderRadius: 22, border: "1px solid rgba(241,229,220,0.5)",
                    padding: 28,
                  }}>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1F2937", margin: "0 0 24px", fontFamily: "var(--font-poppins), sans-serif", display: "flex", alignItems: "center", gap: 8 }}>
                      <CreditCard size={18} color="#E9987A" /> Payment Method
                    </h2>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {[
                        { key: "online" as const, label: "Pay Online", desc: "UPI, Cards, Net Banking", icon: CreditCard },
                        { key: "cod" as const, label: "Cash on Delivery", desc: "Pay when you receive", icon: Truck },
                        { key: "whatsapp" as const, label: "Order via WhatsApp", desc: "Confirm & pay through WhatsApp", icon: MessageCircle },
                      ].map((m) => (
                        <button
                          key={m.key}
                          onClick={() => setPayMethod(m.key)}
                          style={{
                            display: "flex", alignItems: "center", gap: 16, padding: 18,
                            borderRadius: 16, cursor: "pointer", textAlign: "left",
                            border: payMethod === m.key ? "2px solid #E9987A" : "1.5px solid rgba(241,229,220,0.7)",
                            backgroundColor: payMethod === m.key ? "rgba(233,152,122,0.04)" : "#fff",
                            transition: "all 0.25s ease",
                          }}
                          className="pay-option"
                        >
                          <div style={{
                            width: 44, height: 44, borderRadius: 12,
                            backgroundColor: payMethod === m.key ? "rgba(233,152,122,0.1)" : "rgba(241,229,220,0.3)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            transition: "background-color 0.3s ease",
                          }}>
                            <m.icon size={18} color={payMethod === m.key ? "#E9987A" : "#6B7280"} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: 14, fontWeight: 600, color: "#1F2937", margin: 0, fontFamily: "var(--font-poppins), sans-serif" }}>{m.label}</p>
                            <p style={{ fontSize: 12, color: "#9CA3AF", margin: 0, fontFamily: "var(--font-poppins), sans-serif" }}>{m.desc}</p>
                          </div>
                          <div style={{
                            width: 20, height: 20, borderRadius: "50%",
                            border: payMethod === m.key ? "6px solid #E9987A" : "2px solid #D1D5DB",
                            transition: "all 0.2s ease",
                          }} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Order Summary */}
              <div style={{
                backgroundColor: "#fff", borderRadius: 22, border: "1px solid rgba(241,229,220,0.5)",
                padding: 24, position: "sticky", top: 100,
                opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(18px)",
                transition: "all 0.7s cubic-bezier(0.22,1,0.36,1) 0.25s",
              }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1F2937", margin: "0 0 20px", fontFamily: "var(--font-poppins), sans-serif" }}>
                  Order Summary
                </h3>
                {items.map((item) => (
                  <div key={`${item.product.id}-${item.color}-${item.size}`} style={{
                    display: "flex", justifyContent: "space-between", padding: "8px 0",
                    borderBottom: "1px solid rgba(241,229,220,0.3)",
                  }}>
                    <span style={{ fontSize: 13, color: "#6B7280", fontFamily: "var(--font-poppins), sans-serif" }}>
                      {item.product.name} x{item.quantity}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#1F2937", fontFamily: "var(--font-poppins), sans-serif" }}>
                      ₹{item.product.price * item.quantity}
                    </span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0 8px" }}>
                  <span style={{ fontSize: 13, color: "#6B7280", fontFamily: "var(--font-poppins), sans-serif" }}>Subtotal</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#1F2937", fontFamily: "var(--font-poppins), sans-serif" }}>₹{totalPrice()}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(241,229,220,0.3)" }}>
                  <span style={{ fontSize: 13, color: "#6B7280", fontFamily: "var(--font-poppins), sans-serif" }}>Shipping</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: shipping === 0 ? "#10B981" : "#1F2937", fontFamily: "var(--font-poppins), sans-serif" }}>
                    {shipping === 0 ? "Free" : `₹${shipping}`}
                  </span>
                </div>
                {shipping > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 0", fontSize: 11.5, color: "#E9987A", fontFamily: "var(--font-poppins), sans-serif" }}>
                    <Tag size={12} /> Add ₹{999 - totalPrice()} more for free shipping
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", padding: "16px 0 0" }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: "#1F2937", fontFamily: "var(--font-poppins), sans-serif" }}>Total</span>
                  <span style={{ fontSize: 20, fontWeight: 800, color: "#1F2937", fontFamily: "var(--font-poppins), sans-serif" }}>₹{grandTotal}</span>
                </div>

                {/* Coupon */}
                <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                  <input
                    value={coupon}
                    onChange={(e) => setCoupon(e.target.value.toUpperCase())}
                    placeholder="Coupon code (e.g. SUMMER40)"
                    aria-label="Coupon code"
                    style={{
                      flex: 1, padding: "11px 14px", borderRadius: 12,
                      border: "1.5px solid rgba(241,229,220,0.7)", backgroundColor: "#FFF8F3",
                      fontSize: 12.5, color: "#1F2937", fontFamily: "var(--font-poppins), sans-serif",
                      outline: "none", letterSpacing: 0.5,
                    }}
                    className="addr-input"
                  />
                </div>
                {coupon.trim() && (
                  <p style={{ fontSize: 11.5, color: "#10B981", margin: "8px 0 0", fontFamily: "var(--font-poppins), sans-serif" }}>
                    <Tag size={11} style={{ verticalAlign: "-1px" }} /> {coupon.trim()} will be validated and applied when you place the order.
                  </p>
                )}

                {placeError && (
                  <p style={{ fontSize: 12.5, color: "#DC2626", margin: "12px 0 0", fontFamily: "var(--font-poppins), sans-serif" }}>
                    {placeError}
                  </p>
                )}

                {/* Action buttons */}
                <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
                  {step < 2 ? (
                    <button
                      onClick={() => setStep(step + 1)}
                      disabled={step === 1 && (!address.name || !address.phone || !address.line1 || !address.city || !address.state || !address.pin)}
                      className="checkout-next"
                      style={{
                        width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                        padding: "15px 24px", backgroundColor: "#E9987A", color: "#fff",
                        fontSize: 14, fontWeight: 700, borderRadius: 14, border: "none",
                        cursor: "pointer", fontFamily: "var(--font-poppins), sans-serif",
                        boxShadow: "0 6px 20px rgba(233,152,122,0.3)",
                        transition: "all 0.35s cubic-bezier(0.22,1,0.36,1)",
                        opacity: step === 1 && (!address.name || !address.phone || !address.line1 || !address.city || !address.state || !address.pin) ? 0.5 : 1,
                      }}
                    >
                      {step === 0 ? "Proceed to Address" : "Proceed to Payment"} <ArrowRight size={14} />
                    </button>
                  ) : (
                    <button
                      onClick={() => void handlePlaceOrder()}
                      disabled={placing}
                      className="checkout-next"
                      style={{
                        width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                        padding: "15px 24px",
                        backgroundColor: payMethod === "whatsapp" ? "#25D366" : "#E9987A",
                        color: "#fff", fontSize: 14, fontWeight: 700, borderRadius: 14, border: "none",
                        cursor: "pointer", fontFamily: "var(--font-poppins), sans-serif",
                        boxShadow: payMethod === "whatsapp" ? "0 6px 20px rgba(37,211,102,0.3)" : "0 6px 20px rgba(233,152,122,0.3)",
                        transition: "all 0.35s cubic-bezier(0.22,1,0.36,1)",
                      }}
                    >
                      {placing ? (
                        "Placing order…"
                      ) : payMethod === "whatsapp" ? (
                        <><MessageCircle size={16} /> Order via WhatsApp</>
                      ) : payMethod === "cod" ? (
                        <><Truck size={16} /> Place Order (COD)</>
                      ) : (
                        <><CreditCard size={16} /> Pay ₹{grandTotal}</>
                      )}
                    </button>
                  )}
                  {step > 0 && (
                    <button
                      onClick={() => setStep(step - 1)}
                      style={{
                        width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                        padding: "12px 24px", backgroundColor: "transparent", color: "#6B7280",
                        fontSize: 13, fontWeight: 500, borderRadius: 14, border: "1.5px solid rgba(241,229,220,0.7)",
                        cursor: "pointer", fontFamily: "var(--font-poppins), sans-serif",
                        transition: "all 0.3s ease",
                      }}
                      className="checkout-back"
                    >
                      <ArrowLeft size={13} /> Back
                    </button>
                  )}
                </div>

                {/* Trust row */}
                <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 20, paddingTop: 16, borderTop: "1px solid rgba(241,229,220,0.4)" }}>
                  {[
                    { icon: Shield, text: "Secure" },
                    { icon: Truck, text: "Fast Delivery" },
                  ].map((t) => (
                    <div key={t.text} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <t.icon size={13} color="#9CA3AF" />
                      <span style={{ fontSize: 11, color: "#9CA3AF", fontFamily: "var(--font-poppins), sans-serif" }}>{t.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />

      <style jsx global>{`
        .checkout-item:hover { border-color: rgba(233,152,122,0.3) !important; }
        .checkout-del:hover { color: #EF4444 !important; }
        .checkout-next:hover { transform: translateY(-2px); }
        .checkout-back:hover { border-color: rgba(233,152,122,0.5) !important; color: #1F2937 !important; }
        .pay-option:hover { border-color: rgba(233,152,122,0.5) !important; }
        .addr-input:focus { border-color: #E9987A !important; }
        @media (max-width: 900px) {
          .checkout-grid { grid-template-columns: 1fr !important; }
          .addr-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}
