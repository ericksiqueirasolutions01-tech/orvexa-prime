import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        orvexa: {
          darkest: "#05070D",
          dark: "#080C14",
          card: "#0D1322",
          cardHover: "#131C31",
          border: "rgba(0, 210, 255, 0.15)",
          borderHover: "rgba(0, 210, 255, 0.35)",
          cyan: "#00D2FF",
          blue: "#0066FF",
          neon: "#00FF88",
          emerald: "#10B981",
          muted: "#64748B",
          text: "#E2E8F0",
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "cyber-grid": "linear-gradient(to right, rgba(0, 210, 255, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 210, 255, 0.05) 1px, transparent 1px)",
      },
      boxShadow: {
        "neon-cyan": "0 0 25px -5px rgba(0, 210, 255, 0.3)",
        "neon-green": "0 0 25px -5px rgba(0, 255, 136, 0.3)",
        "neon-glow": "0 0 35px -5px rgba(0, 210, 255, 0.2), 0 0 15px -2px rgba(0, 255, 136, 0.2)",
      },
    },
  },
  plugins: [],
};

export default config;

