"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

const STEPS = [
  "Analyzing Diagram...",
  "Reading Entities...",
  "Finding Relationships...",
  "Generating SQL...",
];

interface ProcessingOverlayProps {
  visible: boolean;
}

export default function ProcessingOverlay({ visible }: ProcessingOverlayProps) {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (!visible) { setStepIndex(0); return; }
    const id = setInterval(() => {
      setStepIndex((i) => (i < STEPS.length - 1 ? i + 1 : i));
    }, 1800);
    return () => clearInterval(id);
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-10 flex flex-col items-center justify-center
            bg-[var(--card)]/90 backdrop-blur-sm rounded-2xl gap-5"
        >
          <div className="relative w-12 h-12">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-full border-2 border-[var(--primary)]
                border-t-transparent"
            />
            <div className="absolute inset-2 rounded-full bg-[var(--primary-light)]
              flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-[var(--primary)]" />
            </div>
          </div>

          {/* Step text */}
          <AnimatePresence mode="wait">
            <motion.p
              key={stepIndex}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="text-base font-semibold text-[var(--text)]"
            >
              {STEPS[stepIndex]}
            </motion.p>
          </AnimatePresence>

          {/* Loading dots */}
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="loading-dot" style={{ animationDelay: `${i * 0.2}s` }} />
            ))}
          </div>

          {/* Progress bar */}
          <div className="w-48 h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-[var(--primary)] rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
