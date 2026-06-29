import type { Config } from "tailwindcss";

const withVar = (v: string) => `rgb(var(${v}) / <alpha-value>)`;

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: withVar("--bg"),
        panel: withVar("--panel"),
        panel2: withVar("--panel2"),
        line: withVar("--line"),
        ink: withVar("--ink"),
        mut: withVar("--mut"),
        brass: withVar("--brass"),
        brass2: withVar("--brass2"),
        up: withVar("--up"),
        down: withVar("--down"),
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ['"Space Grotesk"', "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      letterSpacing: {
        eyebrow: ".12em",
      },
    },
  },
  plugins: [],
};

export default config;
