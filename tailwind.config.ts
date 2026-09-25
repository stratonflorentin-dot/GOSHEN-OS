import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./features/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#1B7A43",
          foreground: "#FFFFFF",
          50: "#EEF7F1",
          100: "#D6EEDD",
          200: "#ADDCC0",
          600: "#156635",
          700: "#0F4E28",
          800: "#0A381C",
        },
        earth: {
          DEFAULT: "#8C6A3F",
          50: "#F7F3ED",
          100: "#EBE0CF",
          700: "#5E4728",
        },
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        destructive: { DEFAULT: "#C0392B", foreground: "#FFFFFF" },
        success: "#1B7A43",
        warning: "#B7791F",
      },
      borderRadius: { xl: "0.75rem", "2xl": "1rem" },
      fontSize: {
        "stat-lg": ["1.875rem", { lineHeight: "2.25rem", fontWeight: "600" }],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
