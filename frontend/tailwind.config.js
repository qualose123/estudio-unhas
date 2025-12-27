/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta rosa feminina e elegante
        primary: {
          50: '#fef1f7',
          100: '#fee5f0',
          200: '#feccdf',
          300: '#ffa3c4',
          400: '#fe6b9f',
          500: '#f83d7d',
          600: '#e51d64',
          700: '#c71150',
          800: '#a51145',
          900: '#8a123d',
        },
        secondary: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7e22ce',
          800: '#6b21a8',
          900: '#581c87',
        },
        accent: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
        neutral: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(248, 61, 125, 0.1), 0 10px 20px -2px rgba(248, 61, 125, 0.05)',
        'glow': '0 0 20px rgba(248, 61, 125, 0.3)',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #f83d7d 0%, #a855f7 100%)',
        'gradient-soft': 'linear-gradient(135deg, #fef1f7 0%, #faf5ff 100%)',
      }
    },
  },
  plugins: [],
}
