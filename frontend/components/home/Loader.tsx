"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

const BOOT_LINES = ["INITIALIZING CITY", "LOADING ENVIRONMENT"];

export function Loader() {
  const [show, setShow] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (sessionStorage.getItem("lc-init")) return;
    setShow(true);
    const start = performance.now();
    const duration = 1500;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min((t - start) / duration, 1);
      setProgress(Math.round(p * 100));
      if (p < 1) raf = requestAnimationFrame(tick);
      else {
        sessionStorage.setItem("lc-init", "1");
        setTimeout(() => setShow(false), 250);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const skip = () => {
    sessionStorage.setItem("lc-init", "1");
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          data-testid="initialization-loader"
          exit={{ clipPath: "inset(0 0 100% 0)" }}
          transition={{ duration: 0.7, ease: [0.65, 0, 0.35, 1] }}
          className="fixed inset-0 z-[105] flex flex-col justify-between bg-bg px-4 py-6 sm:px-8"
          role="status"
          aria-label="Loading Lock City"
        >
          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.3em] text-steel">
            <span>Lock City®</span>
          </div>

          <div className="flex flex-col gap-2">
            {BOOT_LINES.map((line, i) => (
              <motion.p
                key={line}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15 + i * 0.25 }}
                className="text-[11px] uppercase tracking-[0.3em] text-steel"
              >
                {line}
                <span className="ml-3 text-bone">
                  {progress > (i + 1) * 30 ? "OK" : "…"}
                </span>
              </motion.p>
            ))}
          </div>

          <div className="flex items-end justify-between">
            <p className="font-display text-7xl leading-none text-bone tabular-nums sm:text-8xl">
              {progress}
              <span className="text-steel">%</span>
            </p>
            <button
              type="button"
              data-testid="loader-skip-button"
              onClick={skip}
              className="border border-graphite px-6 py-3 text-[10px] uppercase tracking-[0.3em] text-steel transition-colors hover:border-bone hover:text-bone"
            >
              Skip
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
