/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        parish: {
          blue: '#0f1f2d',
          'blue-light': '#1d3551',
          gold: '#d7b57a',
          'gold-light': '#f9f2e8',
          cream: '#f5f7f6',
        },
      },
      fontFamily: {
        display: ['Playfair Display', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
