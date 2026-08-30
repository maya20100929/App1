/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        canvas: {
          light: '#FAF9FF',
          dark: '#171426',
        },
        surface: {
          light: '#FFFFFF',
          dark: '#211D35',
        },
        ink: {
          light: '#211B37',
          muted: '#70698A',
          dark: '#F5F2FF',
          'dark-muted': '#B8B0CE',
        },
        brand: {
          50: '#F4F2FF',
          100: '#E9E5FF',
          200: '#D6D0FF',
          300: '#B9B0FF',
          400: '#9C90FA',
          500: '#8475F0',
          600: '#7464E8',
          700: '#5D4FC2',
          800: '#453B91',
          900: '#2E2864',
        },
      },
    },
  },
  plugins: [],
};
