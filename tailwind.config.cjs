/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#ffffff",
        paper: "#f5f5f5",
        ash: "#e5e5e5",
        smoke: "#d4d4d4",
        pebble: "#c8c8c8",
        ink: "#0a0a0a",
        charcoal: "#171717",
        graphite: "#262626",
        slate: "#404040",
        steel: "#525252",
        fog: "#737373",
        silver: "#a3a3a3",
        accent: "#2563eb",
        sapphire: "#1e40af",
        mint: "#dcfce7",
        "mint-fg": "#16a34a",
        "blue-tint": "#dbeaff",
        tangerine: "#ea580c",
        lavender: "#7c3aed",
      },
      fontFamily: {
        satoshi: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      fontSize: {
        caption: ["11px", { lineHeight: "1.5" }],
        body: ["14px", { lineHeight: "1.43" }],
        "body-lg": ["16px", { lineHeight: "1.5" }],
        "body-xl": ["18px", { lineHeight: "1.56" }],
        subheading: ["20px", { lineHeight: "1.4" }],
        "heading-sm": ["24px", { lineHeight: "1.33" }],
        heading: ["30px", { lineHeight: "1.38" }],
        "heading-lg": ["36px", { lineHeight: "1.11" }],
        display: ["48px", { lineHeight: "1" }],
      },
      boxShadow: {
        subtle: "rgba(0, 0, 0, 0.05) 0px 1px 2px 0px",
        ring: "rgba(0, 0, 0, 0.1) 0px 0px 0px 4px",
        card: "rgba(0, 0, 0, 0.1) 0px 10px 15px -3px, rgba(0, 0, 0, 0.1) 0px 4px 6px -4px",
      },
    },
  },
  plugins: [],
}
