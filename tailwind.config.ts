import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        fairway: {
          50: "#f0f9f1",
          100: "#dbf0de",
          200: "#b9e1bf",
          300: "#8aca94",
          400: "#56ac64",
          500: "#349044",
          600: "#247334",
          700: "#1e5b2c",
          800: "#1b4926",
          900: "#173c21",
        },
      },
      fontFamily: {
        sans: ["var(--font-system)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
