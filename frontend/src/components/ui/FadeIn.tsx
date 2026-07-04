"use client";

import { useEffect, useRef, useState } from "react";
import { type ReactNode } from "react";

interface FadeInProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export default function FadeIn({ children, className = "", delay = 0 }: FadeInProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [hasAnimated, setHasAnimated] = useState(false);
  const [jsReady, setJsReady] = useState(false);

  useEffect(() => {
    // Mark JS as ready after a tick so we can set up animations
    setJsReady(true);

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Small delay to ensure the "hidden" state is painted first
          requestAnimationFrame(() => {
            setHasAnimated(true);
          });
          observer.unobserve(el);
        }
      },
      { threshold: 0.05 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // SSR & no-JS: content is fully visible (no opacity:0)
  // After JS loads: we hide, then animate in via IntersectionObserver
  const style: React.CSSProperties = !jsReady
    ? {} // SSR: no inline styles, content is visible
    : {
        opacity: hasAnimated ? 1 : 0,
        transform: hasAnimated ? "translateY(0)" : "translateY(16px)",
        transition: `opacity 0.6s ease, transform 0.6s ease`,
        transitionDelay: `${delay}ms`,
      };

  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
}
