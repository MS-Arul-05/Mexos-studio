"use client";

import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { Check, ShoppingBag, Heart, X, AlertCircle } from "lucide-react";

type ToastType = "cart" | "wishlist" | "success" | "error";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  show: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType>({ show: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((message: string, type: ToastType = "success") => {
    const id = ++nextId;
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
  }, []);

  const icons: Record<ToastType, React.ReactNode> = {
    cart: <ShoppingBag size={15} />,
    wishlist: <Heart size={15} />,
    success: <Check size={15} />,
    error: <AlertCircle size={15} />,
  };

  const colors: Record<ToastType, { bg: string; border: string; icon: string }> = {
    cart: { bg: "rgba(233,152,122,0.06)", border: "rgba(233,152,122,0.3)", icon: "#E9987A" },
    wishlist: { bg: "rgba(233,152,122,0.06)", border: "rgba(233,152,122,0.3)", icon: "#E9987A" },
    success: { bg: "rgba(16,185,129,0.06)", border: "rgba(16,185,129,0.3)", icon: "#10B981" },
    error: { bg: "rgba(239,68,68,0.06)", border: "rgba(239,68,68,0.3)", icon: "#EF4444" },
  };

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div style={{
        position: "fixed", bottom: 28, right: 28, zIndex: 100,
        display: "flex", flexDirection: "column", gap: 8,
        pointerEvents: "none",
      }}>
        {toasts.map((toast) => {
          const c = colors[toast.type];
          return (
            <div key={toast.id} className="toast-enter" style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "12px 18px", backgroundColor: "#fff",
              borderRadius: 14, border: `1.5px solid ${c.border}`,
              boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
              fontFamily: "var(--font-poppins), sans-serif",
              fontSize: 13, fontWeight: 500, color: "#1F2937",
              pointerEvents: "auto",
              animation: "toastSlide 0.4s cubic-bezier(0.22,1,0.36,1)",
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: 8,
                backgroundColor: c.bg, display: "flex",
                alignItems: "center", justifyContent: "center",
                color: c.icon, flexShrink: 0,
              }}>
                {icons[toast.type]}
              </div>
              {toast.message}
            </div>
          );
        })}
      </div>
      <style jsx global>{`
        @keyframes toastSlide {
          from { opacity: 0; transform: translateY(12px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}
