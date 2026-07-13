import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
      },
      colors: {
        accent: "oklch(var(--color-accent) / <alpha-value>)",
        "accent-contrast":
          "oklch(var(--color-accent-contrast) / <alpha-value>)",
        app: "oklch(var(--color-app) / <alpha-value>)",
        border: "oklch(var(--color-border) / <alpha-value>)",
        danger: "oklch(var(--color-danger) / <alpha-value>)",
        "danger-border": "oklch(var(--color-danger-border) / <alpha-value>)",
        "danger-soft": "oklch(var(--color-danger-soft) / <alpha-value>)",
        muted: "oklch(var(--color-muted) / <alpha-value>)",
        overlay: "oklch(var(--color-overlay) / <alpha-value>)",
        panel: "oklch(var(--color-panel) / <alpha-value>)",
        "panel-muted": "oklch(var(--color-panel-muted) / <alpha-value>)",
        text: "oklch(var(--color-text) / <alpha-value>)",
      },
      boxShadow: {
        panel: "var(--shadow-panel)",
      },
    },
  },
  plugins: [],
};

export default config;
