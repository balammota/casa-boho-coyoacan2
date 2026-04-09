import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        blush: "var(--blush-pink)",
        ivory: "var(--ivory)",
        dove: "var(--dove-grey)",
        gold: "var(--gold)",
        "dark-gold": "var(--dark-gold)",
        charcoal: "var(--charcoal)",
      },
      fontFamily: {
        heading: ["var(--heading-font)", "serif"],
        body: ["var(--body-font)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
