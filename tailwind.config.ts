import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fef2f2",
          100: "#fee2e2",
          200: "#fdcbcb",
          300: "#fba4a5",
          400: "#f56b6d",
          500: "#eb3a3d",
          600: "#e51b23",
          700: "#c41920",
          800: "#a2171c",
          900: "#86191d",
        },
        accent: {
          50: "#effefa",
          100: "#c8fff4",
          200: "#92ffe9",
          300: "#53f5db",
          400: "#1be5dd",
          500: "#04c8c2",
          600: "#00a19f",
          700: "#058080",
          800: "#0a6566",
          900: "#0d5354",
        },
      },
    },
  },
  plugins: [],
};
export default config;
