/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Neo-Brutalism UI Library Primary Palette
        violet: {
          200: "#A8A6FF",
          300: "#918efa",
          400: "#807dfa"
        },
        pink: {
          200: "#FFA6F6",
          300: "#fa8cef",
          400: "#fa7fee"
        },
        red: {
          200: "#FF9F9F",
          300: "#fa7a7a",
          400: "#f76363"
        },
        orange: {
          200: "#FFC29F",
          300: "#FF965B",
          400: "#fa8543"
        },
        yellow: {
          200: "#FFF59F",
          300: "#FFF066",
          400: "#FFE500"
        },
        lime: {
          200: "#B8FF9F",
          300: "#9dfc7c",
          400: "#7df752"
        },
        cyan: {
          200: "#A6FAFF",
          300: "#79F7FF",
          400: "#53f2fc"
        },
      },
      fontFamily: {
        sans: ['Space Grotesk', 'Pretendard', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'neo': '2px 2px 0px rgba(0, 0, 0, 1)',
        'neo-lg': '4px 4px 0px rgba(0, 0, 0, 1)',
        'neo-xl': '8px 8px 0px rgba(0, 0, 0, 1)',
      },
    },
  },
  plugins: [],
}
