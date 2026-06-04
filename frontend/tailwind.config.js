/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "surface-container-lowest": "#0b0e14",
        "surface-container-low": "#191c22",
        "on-error-container": "#ffdad6",
        "on-surface-variant": "#c2c6d6",
        "outline-variant": "#424754",
        "primary-container": "#4d8eff",
        "error": "#ffb4ab",
        "surface-container-high": "#272a31",
        "surface": "#10131a",
        "on-background": "#e1e2eb",
        "on-secondary": "#003824",
        "surface-tint": "#adc6ff",
        "inverse-surface": "#e1e2eb",
        "surface-container-highest": "#32353c",
        "on-tertiary": "#472a00",
        "error-container": "#93000a",
        "tertiary": "#ffb95f",
        "surface-dim": "#10131a",
        "surface-bright": "#363940",
        "secondary-container": "#00a572",
        "background": "#10131a",
        "secondary": "#4edea3",
        "primary": "#adc6ff",
        "on-surface": "#e1e2eb",
        "inverse-primary": "#005ac2",
        "on-primary-container": "#00285d",
        "on-error": "#690005",
        "on-secondary-container": "#00311f",
        "tertiary-container": "#ca8100",
        "surface-container": "#1d2026",
        "on-primary": "#002e6a",
        "surface-variant": "#32353c",
        "inverse-on-surface": "#2e3037",
        "on-tertiary-container": "#3e2400",
        "outline": "#8c909f"
      },
      spacing: {
        "gutter": "24px"
      },
      fontFamily: {
        "geist": ["Geist", "sans-serif"],
        "mono": ["JetBrains Mono", "monospace"],
      }
    },
  },
  plugins: [],
}
