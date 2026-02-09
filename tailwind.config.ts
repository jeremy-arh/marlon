import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Open Sans', 'sans-serif'],
        poppins: ['Poppins', 'sans-serif'],
        nunito: ['Nunito', 'sans-serif'],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        'marlon-green': '#00BD82',
        'marlon-primary': '#0205D3',
        'marlon-success': '#17DB4E',
        'marlon-surface': '#F9FAFB',
        'marlon-stroke': '#E5E7EA',
        'marlon-destructive': '#FF0000',
        'marlon-alert': '#FAB515',
        'marlon-text': '#1A1A1A',
        'marlon-text-secondary': '#525252',
      },
    },
  },
  plugins: [],
};
export default config;
