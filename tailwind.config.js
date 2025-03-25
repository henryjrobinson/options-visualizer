/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'dark-bg': '#07020D',
        'dark-surface': '#1A182C',
        'dark-accent': '#FF2ECC',
      }
    },
  },
  plugins: [],
  corePlugins: {
    preflight: true,
  }
}
