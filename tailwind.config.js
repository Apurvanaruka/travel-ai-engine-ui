/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        night: "rgb(var(--night) / <alpha-value>)",
        panel: "rgb(var(--panel) / <alpha-value>)",
        card: "rgb(var(--card) / <alpha-value>)",
        card2: "rgb(var(--card2) / <alpha-value>)",
        edge: "rgb(var(--edge) / <alpha-value>)",
        edge2: "rgb(var(--edge2) / <alpha-value>)",
        txt: "rgb(var(--txt) / <alpha-value>)",
        mut: "rgb(var(--mut) / <alpha-value>)",
        dim: "rgb(var(--dim) / <alpha-value>)",
        acc: "rgb(var(--acc) / <alpha-value>)",
        acc2: "rgb(var(--acc2) / <alpha-value>)",
        sec: "rgb(var(--sec) / <alpha-value>)",
        grn: "rgb(var(--grn) / <alpha-value>)",
        orn: "rgb(var(--orn) / <alpha-value>)",
        red: "rgb(var(--red) / <alpha-value>)",
        vio: "#7c5cf0",
      },
      boxShadow: {
        glow: "var(--shadow-glow)",
        card: "var(--shadow-card)",
      },
      backgroundImage: {
        "acc-grad": "linear-gradient(90deg,#3979E7 0%,#2C65CC 100%)",
        "hero-grad": "linear-gradient(90deg,#3979E7 0%,#8bb4f0 100%)",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        ping2: {
          "0%": { transform: "scale(1)", opacity: "0.9" },
          "75%,100%": { transform: "scale(2.2)", opacity: "0" },
        },
      },
      animation: {
        fadeUp: "fadeUp .25s ease-out both",
        ping2: "ping2 1.6s cubic-bezier(0,0,.2,1) infinite",
      },
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SF Mono",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};
