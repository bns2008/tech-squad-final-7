import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Semantic tokens — resolve from CSS variables ──────────────────────
        // These flip automatically when .dark is toggled on <html>
        background:  "var(--background)",
        surface:     "var(--surface)",
        sidebar:     "var(--surface-sidebar)",
        navbar:      "var(--surface-navbar)",
        card:        "var(--card)",
        border:      "var(--border)",
        "input-bg":  "var(--input-bg)",
        success:     "var(--success)",
        warning:     "var(--warning)",
        danger:      "var(--danger)",

        // Text
        "text-primary":   "var(--text)",
        "text-secondary": "var(--text-muted)",
        "text-muted":     "var(--text-subtle)",

        // Brand
        primary: {
          DEFAULT: "var(--primary)",
          hover:   "var(--primary-hover)",
          light:   "var(--primary-light)",
          // Fixed shade scale (same in both themes)
          300: "#A5B4FC",
          400: "#818CF8",
          500: "#6366F1",
          600: "#7C3AED",
          700: "#4338CA",
          800: "#3730A3",
          900: "#312E81",
        },
      },
      fontFamily: {
        sans: ["Manrope", "system-ui", "-apple-system", "sans-serif"],
        mono: ["'JetBrains Mono'", "Consolas", "monospace"],
      },
      boxShadow: {
        card: "0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.04)",
        "card-hover": "0 4px 12px 0 rgba(0,0,0,0.08), 0 2px 4px -1px rgba(0,0,0,0.04)",
        "card-lg": "0 12px 35px rgba(0,0,0,0.35)",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.4s cubic-bezier(0.16,1,0.3,1)",
        "scale-in": "scaleIn 0.2s ease-out",
        "spin-slow": "spin 3s linear infinite",
      },
      keyframes: {
        fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
        slideUp: {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
