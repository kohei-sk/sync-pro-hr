import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '"Noto Sans JP"',
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          "sans-serif",
        ],
      },
      colors: {
        primary: {
          50: "#e8f4fd",
          100: "#c5e2f9",
          200: "#9dcef5",
          300: "#6db8ef",
          400: "#42a5e8",
          500: "#0071c1",
          600: "#0065ad",
          700: "#005494",
          800: "#00437a",
          900: "#003260",
          950: "#001e3d",
        },
        accent: {
          50: "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
          900: "#14532d",
        },
        brandPrimary: {
          50: "#e8f4fb",
          100: "#c8e7f7",
          200: "#9cd3f1",
          300: "#65bbea",
          400: "#3aa5e0",
          500: "#1e8cd6",
          600: "#1878ba",
          700: "#12629a",
          800: "#0d4d7c",
          900: "#083860",
          950: "#051f38",
        },
        brandSecondary: {
          50: "#e8f8f6",
          100: "#c8edea",
          200: "#9edfd9",
          300: "#68cec5",
          400: "#44bdaf",
          500: "#31b5a2",
          600: "#289789",
          700: "#1f7a6f",
          800: "#185e57",
          900: "#104540",
          950: "#082a28",
        },
        brandNavy: {
          DEFAULT: "#1A2744",
          light: "#243357",
          dark: "#111c31",
        },
        brandGray: {
          DEFAULT: "#808a91",
        },
      },
      borderRadius: {
        DEFAULT: "6px",
        sm: "4px",
        md: "6px",
        lg: "8px",
        xl: "12px",
        "2xl": "16px",
        "3xl": "24px",
      },
      boxShadow: {
        card: "0 1px 3px 0 rgba(0, 0, 0, 0.06), 0 1px 2px -1px rgba(0, 0, 0, 0.06)",
        "card-hover":
          "0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05)",
      },
    },
  },
  plugins: [],
};
export default config;
