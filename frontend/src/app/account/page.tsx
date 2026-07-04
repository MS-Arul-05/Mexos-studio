"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/sections/Footer";
import {
  User,
  Package,
  Heart,
  MapPin,
  LogOut,
  ChevronRight,
  Clock,
  Truck,
  Check,
  Edit3,
  Plus,
  Eye,
  Palette,
} from "lucide-react";

import { api, auth, tokenStore, type Profile } from "@/lib/api";

/* ── backend order/design shapes ── */
interface AccountOrder {
  id: string;
  status: string;
  total: string;
  createdAt: string;
  items: { name: string; quantity: number }[];
}
interface Design {
  id: string;
  baseType: string;
  printType: string | null;
  status: string;
  quantity: number;
  createdAt: string;
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  PENDING_PAYMENT: { label: "Payment Pending", color: "#F59E0B" },
  CONFIRMED: { label: "Confirmed", color: "#10B981" },
  IN_PRODUCTION: { label: "In Production", color: "#8B5CF6" },
  PACKED: { label: "Packed", color: "#6366F1" },
  SHIPPED: { label: "Shipped", color: "#3B82F6" },
  DELIVERED: { label: "Delivered", color: "#10B981" },
  CANCELLED: { label: "Cancelled", color: "#EF4444" },
  PAYMENT_FAILED: { label: "Payment Failed", color: "#EF4444" },
};
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

type Tab = "orders" | "profile" | "addresses" | "designs";

const EMPTY_ADDR = { label: "", line1: "", line2: "", city: "", state: "", pincode: "" };

export default function AccountPage() {
  const [activeTab, setActiveTab] = useState<Tab>("orders");
  const sectionRef = useRef<HTMLElement>(null);
  const [vis, setVis] = useState(false);

  const [user, setUser] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<AccountOrder[]>([]);
  const [designs, setDesigns] = useState<Design[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [addingAddr, setAddingAddr] = useState(false);
  const [newAddr, setNewAddr] = useState(EMPTY_ADDR);

  useEffect(() => {
    if (!tokenStore.isLoggedIn) {
      window.location.href = "/login";
      return;
    }
    Promise.all([
      auth.me(),
      api.get<AccountOrder[]>("/account/orders", { auth: true }),
      api.get<Design[]>("/account/custom-orders", { auth: true }),
    ])
      .then(([me, ord, des]) => {
        setUser(me);
        setOrders(ord);
        setDesigns(des);
      })
      .catch(() => {
        tokenStore.clear();
        window.location.href = "/login";
      })
      .finally(() => setDataLoading(false));
  }, []);

  const logout = async () => {
    await auth.logout();
    window.location.href = "/";
  };

  const saveAddress = async () => {
    if (!newAddr.line1 || !newAddr.city || !newAddr.state || !newAddr.pincode) return;
    const created = await api.post<Profile["addresses"][number]>(
      "/account/addresses",
      { ...newAddr, line2: newAddr.line2 || undefined, label: newAddr.label || undefined },
      { auth: true },
    );
    setUser((u) => (u ? { ...u, addresses: [...u.addresses.map((a) => ({ ...a, isDefault: a.isDefault && !created.isDefault })), created] } : u));
    setNewAddr(EMPTY_ADDR);
    setAddingAddr(false);
  };

  const removeAddress = async (id: string) => {
    await api.del(`/account/addresses/${id}`, { auth: true });
    setUser((u) => (u ? { ...u, addresses: u.addresses.filter((a) => a.id !== id) } : u));
  };

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); } },
      { threshold: 0.05 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const tabs: { key: Tab; label: string; icon: typeof User }[] = [
    { key: "orders", label: "Order History", icon: Package },
    { key: "profile", label: "Profile", icon: User },
    { key: "addresses", label: "Addresses", icon: MapPin },
    { key: "designs", label: "Saved Designs", icon: Palette },
  ];

  if (dataLoading || !user) {
    return (
      <>
        <Navbar />
        <main style={{ backgroundColor: "#FFF8F3", paddingTop: 72, minHeight: "100vh" }}>
          <div style={{ textAlign: "center", padding: "120px 28px", color: "#9CA3AF", fontFamily: "var(--font-poppins), sans-serif" }}>
            Loading your account…
          </div>
        </main>
        <Footer />
      </>
    );
  }
  const displayName = user.name || "there";

  return (
    <>
      <Navbar />
      <main ref={sectionRef} style={{ backgroundColor: "#FFF8F3", paddingTop: 72, minHeight: "100vh" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 28px 100px" }}>
          {/* Header */}
          <div
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: 36,
              opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(18px)",
              transition: "all 0.7s cubic-bezier(0.22,1,0.36,1)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{
                width: 56, height: 56, borderRadius: 18,
                background: "linear-gradient(135deg, #F6B49A, #E9987A)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 6px 20px rgba(233,152,122,0.25)",
              }}>
                <span style={{ fontFamily: "var(--font-playfair), serif", fontSize: 24, fontWeight: 800, color: "#fff" }}>
                  {displayName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h1 style={{ fontFamily: "var(--font-playfair), 'Playfair Display', serif", fontSize: 28, fontWeight: 700, color: "#1F2937", margin: 0 }}>
                  Hi, {displayName.split(" ")[0]}
                </h1>
                <p style={{ fontSize: 13, color: "#6B7280", margin: 0, fontFamily: "var(--font-poppins), sans-serif" }}>
                  {user.mobileNumber}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void logout()}
              className="account-logout"
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "9px 18px", borderRadius: 10,
                border: "1.5px solid rgba(241,229,220,0.7)", backgroundColor: "#fff",
                fontSize: 13, fontWeight: 500, color: "#6B7280",
                fontFamily: "var(--font-poppins), sans-serif", cursor: "pointer",
                transition: "all 0.3s ease",
              }}
            >
              <LogOut size={14} /> Logout
            </button>
          </div>

          {/* Layout: sidebar + content */}
          <div
            style={{
              display: "grid", gridTemplateColumns: "220px 1fr", gap: 28, alignItems: "start",
              opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(14px)",
              transition: "all 0.7s cubic-bezier(0.22,1,0.36,1) 0.15s",
            }}
            className="account-layout"
          >
            {/* Sidebar tabs */}
            <div style={{ backgroundColor: "#fff", borderRadius: 18, border: "1px solid rgba(241,229,220,0.5)", padding: 8, position: "sticky", top: 88 }}>
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className="account-tab"
                  style={{
                    display: "flex", alignItems: "center", gap: 10, width: "100%",
                    padding: "12px 16px", borderRadius: 12, border: "none",
                    backgroundColor: activeTab === tab.key ? "rgba(233,152,122,0.06)" : "transparent",
                    fontSize: 13.5, fontWeight: activeTab === tab.key ? 600 : 500,
                    color: activeTab === tab.key ? "#E9987A" : "#4B5563",
                    fontFamily: "var(--font-poppins), sans-serif", cursor: "pointer",
                    transition: "all 0.25s ease", textAlign: "left",
                  }}
                >
                  <tab.icon size={16} strokeWidth={1.8} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div>
              {/* ── Orders ── */}
              {activeTab === "orders" && (
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1F2937", margin: "0 0 20px", fontFamily: "var(--font-playfair), serif" }}>
                    Order History
                  </h2>
                  {orders.length === 0 && (
                    <p style={{ fontSize: 14, color: "#9CA3AF", fontFamily: "var(--font-poppins), sans-serif" }}>
                      No orders yet — <Link href="/shop" style={{ color: "#E9987A" }}>start shopping</Link>.
                    </p>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {orders.map((o) => ({
                      id: o.id,
                      date: fmtDate(o.createdAt),
                      items: o.items.map((it) => `${it.name} x${it.quantity}`).join(", "),
                      total: Number(o.total),
                      status: o.status.toLowerCase(),
                      statusLabel: STATUS_META[o.status]?.label ?? o.status,
                      statusColor: STATUS_META[o.status]?.color ?? "#6B7280",
                    })).map((order) => (
                      <div
                        key={order.id}
                        className="order-card"
                        style={{
                          backgroundColor: "#fff", borderRadius: 18,
                          border: "1px solid rgba(241,229,220,0.5)",
                          padding: "20px 24px", transition: "all 0.3s ease",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                          <div>
                            <p style={{ fontSize: 14, fontWeight: 700, color: "#1F2937", margin: 0, fontFamily: "var(--font-poppins), sans-serif" }}>
                              {order.id}
                            </p>
                            <p style={{ fontSize: 12, color: "#9CA3AF", margin: "2px 0 0", fontFamily: "var(--font-poppins), sans-serif" }}>
                              {order.date}
                            </p>
                          </div>
                          <span style={{
                            fontSize: 11, fontWeight: 600, color: order.statusColor,
                            backgroundColor: `${order.statusColor}12`, padding: "4px 12px",
                            borderRadius: 20, fontFamily: "var(--font-poppins), sans-serif",
                          }}>
                            {order.statusLabel}
                          </span>
                        </div>
                        <p style={{ fontSize: 13, color: "#6B7280", margin: "0 0 12px", fontFamily: "var(--font-poppins), sans-serif" }}>
                          {order.items}
                        </p>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <span style={{ fontSize: 16, fontWeight: 700, color: "#1F2937", fontFamily: "var(--font-poppins), sans-serif" }}>
                            ₹{order.total.toLocaleString()}
                          </span>
                          <Link
                            href={`/track?id=${order.id}`}
                            className="track-link"
                            style={{
                              display: "inline-flex", alignItems: "center", gap: 4,
                              fontSize: 12.5, fontWeight: 600, color: "#E9987A",
                              textDecoration: "none", fontFamily: "var(--font-poppins), sans-serif",
                              transition: "gap 0.2s ease",
                            }}
                          >
                            {order.status === "delivered" ? <><Eye size={13} /> View Details</> : <><Truck size={13} /> Track Order</>}
                            <ChevronRight size={12} />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Profile ── */}
              {activeTab === "profile" && (
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1F2937", margin: "0 0 20px", fontFamily: "var(--font-playfair), serif" }}>
                    Profile Details
                  </h2>
                  <div style={{ backgroundColor: "#fff", borderRadius: 18, border: "1px solid rgba(241,229,220,0.5)", padding: "28px 28px" }}>
                    {[
                      { label: "Full Name", value: user.name || "—" },
                      { label: "Mobile Number", value: user.mobileNumber },
                      { label: "Member Since", value: fmtDate(user.createdAt) },
                    ].map((field) => (
                      <div key={field.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", borderBottom: "1px solid rgba(241,229,220,0.4)" }}>
                        <div>
                          <p style={{ fontSize: 12, color: "#9CA3AF", margin: "0 0 4px", fontFamily: "var(--font-poppins), sans-serif" }}>{field.label}</p>
                          <p style={{ fontSize: 14, fontWeight: 500, color: "#1F2937", margin: 0, fontFamily: "var(--font-poppins), sans-serif" }}>{field.value}</p>
                        </div>
                        <button style={{ background: "none", border: "none", cursor: "pointer", color: "#E9987A", display: "flex" }}>
                          <Edit3 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Addresses ── */}
              {activeTab === "addresses" && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1F2937", margin: 0, fontFamily: "var(--font-playfair), serif" }}>
                      Saved Addresses
                    </h2>
                    <button type="button" onClick={() => setAddingAddr((v) => !v)} className="add-address-btn" style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      padding: "9px 18px", borderRadius: 10, border: "1.5px solid #E9987A",
                      backgroundColor: "transparent", fontSize: 13, fontWeight: 600, color: "#E9987A",
                      fontFamily: "var(--font-poppins), sans-serif", cursor: "pointer", transition: "all 0.3s ease",
                    }}>
                      <Plus size={14} /> {addingAddr ? "Cancel" : "Add New"}
                    </button>
                  </div>
                  {addingAddr && (
                    <div style={{ backgroundColor: "#fff", borderRadius: 16, border: "1.5px solid rgba(233,152,122,0.4)", padding: 20, marginBottom: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }} className="address-grid">
                      {([
                        ["label", "Label (Home / Office)"], ["line1", "Address Line 1"], ["line2", "Address Line 2 (optional)"],
                        ["city", "City"], ["state", "State"], ["pincode", "PIN Code"],
                      ] as const).map(([key, ph]) => (
                        <input
                          key={key}
                          value={newAddr[key]}
                          onChange={(e) => setNewAddr({ ...newAddr, [key]: e.target.value })}
                          placeholder={ph}
                          aria-label={ph}
                          style={{ padding: "11px 14px", borderRadius: 10, border: "1.5px solid rgba(241,229,220,0.7)", backgroundColor: "#FFF8F3", fontSize: 13, fontFamily: "var(--font-poppins), sans-serif", outline: "none", gridColumn: key === "line1" || key === "line2" ? "1 / -1" : undefined }}
                        />
                      ))}
                      <button type="button" onClick={() => void saveAddress()} style={{ gridColumn: "1 / -1", padding: "12px", borderRadius: 10, border: "none", backgroundColor: "#E9987A", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-poppins), sans-serif" }}>
                        Save Address
                      </button>
                    </div>
                  )}
                  {user.addresses.length === 0 && !addingAddr && (
                    <p style={{ fontSize: 14, color: "#9CA3AF", fontFamily: "var(--font-poppins), sans-serif" }}>No saved addresses yet.</p>
                  )}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="address-grid">
                    {user.addresses.map((addr) => (
                      <div key={addr.id} className="address-card" style={{
                        backgroundColor: "#fff", borderRadius: 16, border: addr.isDefault ? "2px solid #E9987A" : "1px solid rgba(241,229,220,0.5)",
                        padding: "20px", position: "relative", transition: "all 0.3s ease",
                      }}>
                        {addr.isDefault && (
                          <span style={{ position: "absolute", top: 12, right: 12, fontSize: 10, fontWeight: 600, color: "#E9987A", backgroundColor: "rgba(233,152,122,0.08)", padding: "3px 10px", borderRadius: 20, fontFamily: "var(--font-poppins), sans-serif" }}>
                            Default
                          </span>
                        )}
                        <p style={{ fontSize: 13, fontWeight: 700, color: "#1F2937", margin: "0 0 8px", fontFamily: "var(--font-poppins), sans-serif" }}>{addr.label || "Address"}</p>
                        <p style={{ fontSize: 13, color: "#6B7280", margin: 0, lineHeight: 1.6, fontFamily: "var(--font-poppins), sans-serif" }}>
                          {addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}<br />{addr.city}, {addr.state} {addr.pincode}
                        </p>
                        <button type="button" onClick={() => void removeAddress(addr.id)} style={{ marginTop: 10, background: "none", border: "none", cursor: "pointer", color: "#EF4444", fontSize: 12, fontFamily: "var(--font-poppins), sans-serif", padding: 0 }}>
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Saved Designs ── */}
              {activeTab === "designs" && (
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1F2937", margin: "0 0 20px", fontFamily: "var(--font-playfair), serif" }}>
                    Saved Custom Designs
                  </h2>
                  {designs.length === 0 && (
                    <p style={{ fontSize: 14, color: "#9CA3AF", fontFamily: "var(--font-poppins), sans-serif" }}>
                      No custom designs yet — <Link href="/customize" style={{ color: "#E9987A" }}>create one</Link>.
                    </p>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {designs.map((cd) => ({
                      id: cd.id,
                      name: `${cd.baseType} × ${cd.quantity}`,
                      date: fmtDate(cd.createdAt),
                      type: cd.printType === "embroidery" ? "Embroidery" : "Print",
                      status: cd.status,
                    })).map((d) => (
                      <div key={d.id} className="design-card" style={{
                        backgroundColor: "#fff", borderRadius: 16, border: "1px solid rgba(241,229,220,0.5)",
                        padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between",
                        transition: "all 0.3s ease",
                      }}>
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 600, color: "#1F2937", margin: "0 0 4px", fontFamily: "var(--font-poppins), sans-serif" }}>{d.name}</p>
                          <p style={{ fontSize: 12, color: "#9CA3AF", margin: 0, fontFamily: "var(--font-poppins), sans-serif" }}>
                            {d.date} &middot; {d.type}
                          </p>
                        </div>
                        <Link
                          href="/customize"
                          style={{
                            display: "inline-flex", alignItems: "center", gap: 4,
                            fontSize: 12.5, fontWeight: 600, color: "#E9987A",
                            textDecoration: "none", fontFamily: "var(--font-poppins), sans-serif",
                          }}
                        >
                          Reorder <ChevronRight size={12} />
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />

      <style jsx global>{`
        .account-logout:hover { border-color: #EF4444 !important; color: #EF4444 !important; }
        .account-tab:hover { background-color: rgba(233,152,122,0.04) !important; }
        .order-card:hover { border-color: rgba(233,152,122,0.3) !important; box-shadow: 0 6px 24px rgba(0,0,0,0.04); }
        .track-link:hover { gap: 6px !important; }
        .address-card:hover { box-shadow: 0 6px 24px rgba(0,0,0,0.04); }
        .design-card:hover { border-color: rgba(233,152,122,0.3) !important; }
        .add-address-btn:hover { background-color: rgba(233,152,122,0.06) !important; }
        @media (max-width: 768px) {
          .account-layout { grid-template-columns: 1fr !important; }
          .address-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}
