import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { 950: "#0a0a0f", 900: "#13131c", 800: "#1c1c28", 700: "#2a2a3a" },
        glow: { 50: "#fff5f1", 100: "#ffe4d8", 300: "#ffb59a", 500: "#ff7a5a", 700: "#c84a30" },
        future: { 300: "#a5b4fc", 500: "#6366f1", 700: "#4338ca" },
        care: { 300: "#86efac", 500: "#22c55e", 700: "#15803d" },
      },
      fontFamily: {
        display: ['"Fraunces"', "ui-serif", "Georgia", "serif"],
        sans: ['"Inter"', "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 20px 60px -10px rgba(255, 122, 90, 0.45)",
        soft: "0 10px 40px -10px rgba(0, 0, 0, 0.35)",
      },
      backgroundImage: {
        "gradient-aurora":
          "radial-gradient(at 50% -10%, rgba(255,122,90,0.18) 0px, transparent 55%), radial-gradient(at 100% 100%, rgba(99,102,241,0.12) 0px, transparent 55%)",
        "gradient-hero":
          "linear-gradient(135deg, #ff7a5a 0%, #ec4899 50%, #6366f1 100%)",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        shimmer: "shimmer 2s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
