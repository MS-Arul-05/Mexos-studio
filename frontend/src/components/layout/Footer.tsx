"use client";

import Link from "next/link";
import { ArrowRight, Globe, MessageCircle, Send } from "lucide-react";

const footerLinks = {
  Shop: [
    { name: "All Products", href: "/shop" },
    { name: "T-Shirts", href: "/shop/tshirts" },
    { name: "Hoodies", href: "/shop/hoodies" },
    { name: "Polo Shirts", href: "/shop/polo" },
    { name: "Jerseys", href: "/shop/jerseys" },
    { name: "Accessories", href: "/shop/accessories" },
  ],
  Company: [
    { name: "About Us", href: "/about" },
    { name: "How It Works", href: "/how-it-works" },
    { name: "Bulk Orders", href: "/bulk-orders" },
    { name: "FAQs", href: "/faq" },
    { name: "Reviews", href: "/reviews" },
    { name: "Contact Us", href: "/contact" },
  ],
  Help: [
    { name: "Shipping Policy", href: "/shipping" },
    { name: "Returns & Refunds", href: "/returns" },
    { name: "Size Guide", href: "/size-guide" },
    { name: "Payment Methods", href: "/payment" },
    { name: "Track Order", href: "/track" },
    { name: "Privacy Policy", href: "/privacy" },
  ],
};

export default function Footer() {
  return (
    <footer className="bg-white border-t border-[#F1E5DC]/60 pt-12 lg:pt-16 pb-8">
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-6 mb-10">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-2">
            <Link href="/" className="inline-block mb-3">
              <span
                className="font-display text-[24px] font-bold text-[#1F2937] italic"
                style={{ fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif" }}
              >
                Mexos Studio
              </span>
            </Link>
            <p className="text-[#9CA3AF] text-[13px] leading-relaxed max-w-[280px] mb-5">
              Premium custom apparel for every style, team and occasion.
            </p>
            <div className="flex gap-2.5">
              {[Globe, MessageCircle, Send].map((Icon, i) => (
                <button
                  key={i}
                  className="w-9 h-9 rounded-full border border-[#F1E5DC] flex items-center justify-center text-[#9CA3AF] hover:text-[#E9987A] hover:border-[#E9987A]/40 transition-all duration-300"
                >
                  <Icon size={15} />
                </button>
              ))}
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="text-[13px] font-semibold text-[#1F2937] mb-3">{title}</h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-[12.5px] text-[#9CA3AF] hover:text-[#E9987A] transition-colors duration-300"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Newsletter */}
        <div className="bg-[#FFF8F3] rounded-[16px] p-5 sm:p-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-[15px] font-semibold text-[#1F2937]">Newsletter</h3>
              <p className="text-[12px] text-[#9CA3AF] mt-0.5">
                Subscribe to get special offers and latest updates.
              </p>
            </div>
            <div className="flex gap-2 max-w-[380px] w-full sm:w-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-3.5 py-2.5 bg-white border border-[#F1E5DC] rounded-[10px] text-[13px] text-[#1F2937] placeholder:text-[#D1D5DB] focus:outline-none focus:border-[#E9987A]/40 transition-colors"
              />
              <button className="group px-4 py-2.5 bg-[#E9987A] hover:bg-[#d8876a] text-white text-[13px] font-semibold rounded-[10px] transition-all duration-300 flex items-center gap-1 shrink-0">
                Subscribe
                <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-[#F1E5DC]/60">
          <p className="text-[11px] text-[#D1D5DB]">&copy; 2026 Mexos Studio. All Rights Reserved.</p>
          <div className="flex items-center gap-3">
            {["VISA", "MC", "PayPal", "AMEX"].map((p) => (
              <span key={p} className="text-[10px] text-[#D1D5DB] font-semibold tracking-wider uppercase px-2 py-1 border border-[#F1E5DC]/60 rounded">
                {p}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
