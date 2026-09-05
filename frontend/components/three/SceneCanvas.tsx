"use client";

import { Canvas } from "@react-three/fiber";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type Quality = "high" | "medium" | "low" | "static";

export function useQuality(): Quality {
  const [quality, setQuality] = useState<Quality>("medium");
  useEffect(() => {
    const cores = navigator.hardwareConcurrency ?? 4;
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
    const mobile = window.innerWidth < 768;
    if (cores <= 2 || memory <= 2) setQuality("static");
    else if (mobile || cores <= 4) setQuality("low");
    else if (cores >= 8 && memory >= 8) setQuality("high");
    else setQuality("medium");
  }, []);
  return quality;
}

export function useReducedMotionPref() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

interface SceneCanvasProps {
  children: ReactNode;
  className?: string;
  camera?: { position: [number, number, number]; fov?: number };
  fallback?: ReactNode;
  label: string;
}

// Shared WebGL wrapper: adaptive DPR, pauses render loop offscreen,
// static fallback for weak devices / reduced motion / no WebGL.
export function SceneCanvas({
  children,
  className = "",
  camera = { position: [0, 1.6, 10], fov: 42 },
  fallback,
  label,
}: SceneCanvasProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [supported, setSupported] = useState(true);
  const quality = useQuality();
  const reduced = useReducedMotionPref();

  useEffect(() => {
    try {
      const c = document.createElement("canvas");
      if (!c.getContext("webgl2") && !c.getContext("webgl")) setSupported(false);
    } catch {
      setSupported(false);
    }
  }, []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: "80px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const staticMode = quality === "static" || reduced || !supported;

  return (
    <div ref={wrapRef} className={className} role="img" aria-label={label}>
      {staticMode ? (
        fallback ?? (
          <div className="h-full w-full bg-[radial-gradient(ellipse_at_50%_35%,#181818_0%,#050505_65%)]" />
        )
      ) : (
        <Canvas
          frameloop={visible ? "always" : "never"}
          dpr={quality === "high" ? [1, 2] : [1, 1.5]}
          camera={camera}
          gl={{
            antialias: quality === "high",
            alpha: true,
            powerPreference: "high-performance",
          }}
        >
          {children}
        </Canvas>
      )}
    </div>
  );
}
