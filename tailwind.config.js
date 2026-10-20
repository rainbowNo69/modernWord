/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'media',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Noto Sans SC', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#0f766e',
          light: '#14b8a6',
          dark: '#0d5f58',
        },
        accent: {
          DEFAULT: '#ea580c',
          light: '#f97316',
        },
        surface: {
          DEFAULT: '#ffffff',
          warm: '#fafaf9',
        },
      },
    },
  },
  plugins: [],
};
