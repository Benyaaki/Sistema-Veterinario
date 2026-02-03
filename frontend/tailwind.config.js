/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#5B9AA8', // Azul grisáceo del login (similar al botón)
        secondary: '#7BA5B0', // Azul más claro
        'brand-bg': '#F8FAFB', // Blanco con tinte azul muy suave
        'brand-surface': '#E8F1F5', // Azul muy claro (como el fondo del login)
        'brand-accent': '#A8C5D1', // Azul grisáceo medio
      }
    },
  },
  plugins: [],
}
