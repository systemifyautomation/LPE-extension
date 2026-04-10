/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./**/*.{tsx,ts}",
    "!./node_modules"
  ],
  theme: {
    extend: {
      colors: {
        // LPE Brand Palette
        lpe: {
          navy:    "#0D2156",   // Primary — dark navy (logo background)
          blue:    "#1D4ED8",   // Secondary — medium blue
          "blue-light": "#3B82F6",
          orange:  "#E8821A",   // Accent — orange (logo frame)
          "orange-light": "#FB923C",
          white:   "#FFFFFF",
          gray:    "#F5F7FB",   // Off-white background
          "gray-dark": "#6B7280",
          border:  "#E2E8F0",
        }
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"]
      },
      boxShadow: {
        "lpe": "0 4px 24px 0 rgba(13, 33, 86, 0.12)"
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-in-out",
        "slide-up": "slideUp 0.25s ease-out"
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" }
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        }
      }
    }
  },
  plugins: []
}
