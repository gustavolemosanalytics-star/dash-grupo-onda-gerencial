/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Montserrat"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
      },
      colors: {
        // Cores Grupo Onda
        onda: {
          yellow: '#FBC33D',
          orange: '#F9501E',
          blue: '#8BC5E5',
        },
      },
      boxShadow: {
        glow: '0 0 45px rgba(251, 195, 61, 0.35)',
      },
    },
  },
  plugins: [],
}

