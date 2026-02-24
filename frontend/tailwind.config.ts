import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        base: "#0A0A0F",
        card: "#111118",
        border: "#1E1B4B",
        primary: {
          DEFAULT: "#7C3AED",
          glow: "#A78BFA",
        },
        accent: {
          DEFAULT: "#06B6D4",
          glow: "#67E8F9",
        },
        success: "#10B981",
        warning: "#F59E0B",
        danger: "#EF4444",
        txt: "#F1F5F9",
        muted: "#94A3B8",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      backgroundImage: {
        "glow-primary": "radial-gradient(ellipse at top, rgba(124,58,237,0.15) 0%, transparent 60%)",
        "glow-accent": "radial-gradient(ellipse at bottom right, rgba(6,182,212,0.12) 0%, transparent 60%)",
        "card-gradient": "linear-gradient(135deg, #111118 0%, #0f0f1a 100%)",
      },
      boxShadow: {
        "glow-primary": "0 0 20px rgba(124,58,237,0.4)",
        "glow-accent": "0 0 20px rgba(6,182,212,0.4)",
        card: "0 4px 24px rgba(0,0,0,0.4)",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
        slideUp: { from: { opacity: "0", transform: "translateY(16px)" }, to: { opacity: "1", transform: "translateY(0)" } },
      },
    },
  },
  plugins: [],
};

export default config;
