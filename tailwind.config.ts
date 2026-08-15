import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Forest green from the EasyDrops logo (#28501a)
        brand: {
          50: "#eef4e9",
          100: "#d9e8c9",
          200: "#bcd7a3",
          300: "#98c073",
          400: "#74a54a",
          500: "#548330",
          600: "#3d6725",
          700: "#28501a",
          800: "#1f3d15",
          900: "#172e10",
        },
        // Bright leaf accent (#86ad3d)
        leaf: {
          400: "#9cc95a",
          500: "#86ad3d",
          600: "#6d8f30",
        },
        // Warm beige/cream from the logo background (#d5c8b3)
        sand: {
          50: "#faf7f0",
          100: "#f2ece0",
          200: "#e6dcc8",
          300: "#d5c8b3",
          400: "#c3b393",
        },
      },
    },
  },
  plugins: [],
};

export default config;
