import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        discord: {
          dark: "var(--rc-dark)",
          darker: "var(--rc-darker)",
          channel: "var(--rc-channel)",
          hover: "var(--rc-hover)",
          active: "var(--rc-active)",
          sidebar: "var(--rc-sidebar)",
          chat: "var(--rc-chat)",
          input: "var(--rc-input)",
          brand: "#5865f2",
          "brand-hover": "#4752c4",
          green: "#23a559",
          yellow: "#f0b232",
          red: "#f23f43",
          "red-hover": "#d83c3e",
          muted: "var(--rc-muted)",
          header: "var(--rc-header)",
        },
        standing: {
          perfect: "#23a559",
          good: "#57d28c",
          danger: "#f0b232",
          critical: "#ed6b2b",
          suspended: "#f23f43",
        },
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-in-out",
        "slide-in": "slideIn 0.3s ease-out",
        "pulse-dot": "pulseDot 1.5s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideIn: {
          "0%": { transform: "translateX(-10px)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        pulseDot: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
