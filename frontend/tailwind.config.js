/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#4FA3A1', // Verde petróleo pastel
        secondary: '#D98FA6', // Rosado pastel
        'brand-bg': '#FAFAFA', // Blanco suave
        'brand-surface': '#E6F2F3', // Celeste muy claro
        'brand-accent': '#BFD6DF', // Azul grisáceo claro
      }
    },
  },
  plugins: [],
}
