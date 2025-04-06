/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc5fb',
          400: '#36a7f7',
          500: '#0c8ae9',
          600: '#006bc7',
          700: '#0055a1',
          800: '#004885',
          900: '#003d6e',
          950: '#002749',
        },
      },
    },
  },
  plugins: [],
} 