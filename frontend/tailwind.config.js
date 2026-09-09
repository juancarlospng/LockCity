/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#050505",
        bone: "#F1EFE9",
        graphite: "#222222",
        steel: "#a3a3a3",
        onyx: "#101010",
        card: "#0D0D0D",
      },
      fontFamily: {
        display: ["var(--font-display)", "Arial Narrow", "sans-serif"],
        mono: ["var(--font-mono)", "Courier New", "monospace"],
      },
      keyframes: {
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.25" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
      animation: {
        marquee: "marquee 40s linear infinite",
        "pulse-dot": "pulse-dot 2.4s ease-in-out infinite",
        "fade-in": "fade-in 0.6s ease-out both",
      },
    },
  },
  plugins: [],
};
