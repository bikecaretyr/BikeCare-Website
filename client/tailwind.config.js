/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        amber: { DEFAULT: '#f59e0b', dark: '#d97706', light: '#fef3c7' },
        surface: { DEFAULT: '#0f1218', 2: '#151921', 3: '#1b2030' },
        border: { DEFAULT: '#22283a' },
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        heading: ['Rajdhani', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
