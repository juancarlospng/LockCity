"use client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Component,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
export type Quality = "high" | "medium" | "low" | "static";
const QualityContext = createContext<Quality>("medium");
export function useQuality() {
  return useContext(QualityContext);
}
export function useReducedMotionPref() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}
class Boundary extends Component<
  { children: ReactNode; onFailure: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFailure();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
function Lifecycle({
  fail,
  degrade,
}: {
  fail: () => void;
  degrade: () => void;
}) {
  const gl = useThree((s) => s.gl);
  const sample = useRef({ time: 0, frames: 0, low: 0 });
  useEffect(() => {
    const canvas = gl.domElement;
    const lost = (event: Event) => {
      event.preventDefault();
      fail();
    };
    canvas.addEventListener("webglcontextlost", lost);
    return () => canvas.removeEventListener("webglcontextlost", lost);
  }, [gl, fail]);
  useFrame((_, delta) => {
    const s = sample.current;
    // Bound the first frame after idle without ignoring consistently slow frames.
    s.time += Math.min(delta, 0.25);
    s.frames++;
    if (s.time > 3) {
      if (s.frames / s.time < 28) {
        s.low++;
        degrade();
        if (s.low >= 3) fail();
      } else s.low = 0;
      s.time = 0;
      s.frames = 0;
    }
  });
  return null;
}
export function SceneCanvas({
  children,
  className = "",
  camera = { position: [0, 1.6, 10], fov: 42 },
  label,
}: {
  children: ReactNode;
  className?: string;
  camera?: { position: [number, number, number]; fov?: number };
  label: string;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [quality, setQuality] = useState<Quality>("medium");
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(false);
  const [failed, setFailed] = useState(false);
  const reduced = useReducedMotionPref();
  useEffect(() => {
    let inView = false,
      raf = 0,
      timer: ReturnType<typeof setTimeout>;
    const update = () => {
      setActive(inView && !document.hidden);
    };
    const interact = () => {
      update();
      clearTimeout(timer);
      timer = setTimeout(() => setActive(false), 6000);
    };
    const io = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      interact();
    });
    if (wrap.current) io.observe(wrap.current);
    let supported = false;
    try {
      const probe = document.createElement("canvas");
      const gl = probe.getContext("webgl2", {
        failIfMajorPerformanceCaveat: true,
      });
      supported = !!gl;
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
    } catch {}
    raf = requestAnimationFrame(() => {
      setReady(supported);
      setQuality(
        (navigator.hardwareConcurrency || 4) <= 4
          ? "low"
          : (navigator.hardwareConcurrency || 4) >= 8
            ? "high"
            : "medium",
      );
    });
    document.addEventListener("visibilitychange", interact);
    window.addEventListener("pointermove", interact, { passive: true });
    window.addEventListener("scroll", interact, { passive: true });
    window.addEventListener("keydown", interact);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      io.disconnect();
      document.removeEventListener("visibilitychange", interact);
      window.removeEventListener("pointermove", interact);
      window.removeEventListener("scroll", interact);
      window.removeEventListener("keydown", interact);
    };
  }, []);
  const fail = () => setFailed(true);
  const staticMode = !ready || failed || reduced;
  return (
    <div
      ref={wrap}
      className={className}
      aria-label={label}
      role="img"
      data-quality={staticMode ? "static" : quality}
      data-rendering={active && !staticMode ? "active" : "paused"}
    >
      {!staticMode && (
        <Boundary onFailure={fail}>
          <Canvas
            frameloop={active ? "always" : "never"}
            dpr={quality === "high" ? 1.5 : quality === "medium" ? 1.25 : 1}
            camera={camera}
            gl={{
              alpha: true,
              antialias: false,
              powerPreference: "low-power",
              failIfMajorPerformanceCaveat: true,
            }}
            fallback={null}
          >
            <QualityContext.Provider value={quality}>
              <Lifecycle
                fail={fail}
                degrade={() =>
                  setQuality((q) => (q === "high" ? "medium" : "low"))
                }
              />
              {children}
            </QualityContext.Provider>
          </Canvas>
        </Boundary>
      )}
    </div>
  );
}
