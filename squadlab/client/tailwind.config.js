/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          400: '#60a5fa',
          500: '#2563eb',
          600: '#1a4a8a',
          700: '#0f3460',
          800: '#16213e',
          900: '#1a1a2e',
        },
        accent: {
          100: '#ccfbf1',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
        },
        status: {
          pending: '#f59e0b',
          approved: '#10b981',
          active: '#3b82f6',
          closed: '#8b5cf6',
          error: '#ef4444',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
