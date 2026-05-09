import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Palette "archive éditoriale" — cohérente, sobre, pas générique
        cream: "#F7F4EC",
        ink: "#1A1814",
        slate: {
          DEFAULT: "#5C5853",
          soft: "#8A857E",
        },
        accent: "#A04A2A", // terracotta brûlée
        border: "#E5DFD2",
        danger: "#9B2C2C",
      },
      fontFamily: {
        serif: ['"Fraunces"', '"EB Garamond"', "Georgia", "serif"],
        sans: ['"Inter"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', '"Menlo"', "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
