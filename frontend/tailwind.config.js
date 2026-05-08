/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        wiki: {
          bg: "#0f0f13",
          surface: "#1a1a2e",
          border: "#1e293b",
          accent: "#6366f1",
          "accent-hover": "#5558e8",
          muted: "#64748b",
          text: "#e2e8f0",
          "text-dim": "#94a3b8",
        },
      },
    },
  },
  plugins: [],
};
