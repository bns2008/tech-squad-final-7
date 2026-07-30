"use client";

import { motion } from "framer-motion";
import { Sun, Moon, Star, User } from "lucide-react";
import { useStore } from "@/lib/store";

export default function Navbar() {
  const { theme, setTheme } = useStore();

  return (
    <header
      className="fixed top-0 left-[200px] right-0 z-20 h-[57px] flex items-center
        justify-between px-6 bg-[var(--card)] border-b border-[var(--border)]"
    >
      {/* Left – page context icon */}
      <div className="flex items-center gap-2 text-[var(--text-muted)]">
        {/* decorative list icon */}
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="2" y="3" width="4" height="2" rx="1" fill="currentColor" opacity="0.4" />
          <rect x="8" y="3" width="6" height="2" rx="1" fill="currentColor" opacity="0.4" />
          <rect x="2" y="7" width="4" height="2" rx="1" fill="currentColor" opacity="0.4" />
          <rect x="8" y="7" width="6" height="2" rx="1" fill="currentColor" opacity="0.4" />
          <rect x="2" y="11" width="4" height="2" rx="1" fill="currentColor" opacity="0.4" />
          <rect x="8" y="11" width="6" height="2" rx="1" fill="currentColor" opacity="0.4" />
        </svg>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          className="w-8 h-8 rounded-lg flex items-center justify-center
            text-[var(--text-muted)] hover:bg-[var(--border)] transition-colors"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
        </motion.button>

        {/* Upgrade Pro button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border
            border-[var(--primary)] text-[var(--primary)] text-sm font-semibold
            hover:bg-[var(--primary-light)] transition-colors"
        >
          <Star size={13} fill="currentColor" />
          Upgrade Pro
        </motion.button>

        {/* Avatar */}
        <button
          className="w-8 h-8 rounded-full bg-gray-200 dark:bg-[#2A2A35]
            flex items-center justify-center text-[var(--text-muted)]
            hover:ring-2 hover:ring-primary-500/30 transition-all"
          aria-label="Profile"
        >
          <User size={14} />
        </button>
      </div>
    </header>
  );
}
