import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#F8FAFC",
        surface: "#FFFFFF",
        card: {
          DEFAULT: "#FFFFFF",
          border: "#E2E8F0",
        },
        primary: {
          DEFAULT: "#0F172A",
          text: "#0F172A",
        },
        secondary: {
          DEFAULT: "#475569",
          text: "#475569",
        },
        brand: {
          navy: "#1E3A8A",      // AITM Navy
          amber: "#D97706",     // Amber
          crimson: "#DC2626",   // Live Crimson
          emerald: "#059669",   // Win Emerald
        },
        border: "#E2E8F0",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
