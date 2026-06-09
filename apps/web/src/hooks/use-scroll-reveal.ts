import { useEffect, useRef, useState, useCallback } from "react";

/**
 * Returns a ref + isVisible flag.
 * Attach the ref to any element; when it enters the viewport,
 * isVisible becomes true (and stays true).
 */
export function useScrollReveal(options?: IntersectionObserverInit) {
  const ref = useRef<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const callback = useCallback((entries: IntersectionObserverEntry[]) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        setIsVisible(true);
      }
    }
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(callback, {
      threshold: 0.15,
      rootMargin: "0px 0px -40px 0px",
      ...options,
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [callback, options]);

  return { ref, isVisible };
}
