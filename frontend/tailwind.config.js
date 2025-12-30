/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Paleta Rosa Feminina e Elegante para Salão de Beleza
        primary: {
          50: '#fff1f3',   // Rosa muito claro (quase branco)
          100: '#ffe4e9',  // Rosa bebê
          200: '#fecdd6',  // Rosa suave
          300: '#fda4b4',  // Rosa claro
          400: '#fb7293',  // Rosa médio
          500: '#f43f75',  // Rosa vibrante (cor principal)
          600: '#e11d5f',  // Rosa intenso
          700: '#be1250',  // Rosa escuro
          800: '#9f1249',  // Rosa profundo
          900: '#881344',  // Rosa muito escuro
        },
        secondary: {
          50: '#faf5ff',   // Lavanda muito claro
          100: '#f3e8ff',  // Lavanda claro
          200: '#e9d5ff',  // Lavanda suave
          300: '#d8b4fe',  // Lavanda médio
          400: '#c084fc',  // Lavanda vibrante
          500: '#a855f7',  // Roxo lavanda (cor secundária)
          600: '#9333ea',  // Roxo médio
          700: '#7e22ce',  // Roxo escuro
          800: '#6b21a8',  // Roxo profundo
          900: '#581c87',  // Roxo muito escuro
        },
        accent: {
          50: '#fff9f5',   // Pêssego muito claro
          100: '#fff1e7',  // Pêssego claro
          200: '#ffe0ca',  // Pêssego suave
          300: '#ffc89f',  // Pêssego médio
          400: '#ffa672',  // Pêssego vibrante
          500: '#ff8347',  // Coral (cor de destaque)
          600: '#f56422',  // Laranja coral
          700: '#d84a18',  // Laranja escuro
          800: '#b13d19',  // Laranja profundo
          900: '#8f341a',  // Laranja muito escuro
        },
        // Neutros com toque rosado para modo claro e tons suaves para dark
        neutral: {
          50: '#fefcfe',   // Quase branco com toque rosa
          100: '#faf7fa',  // Cinza muito claro rosado
          200: '#f5eff5',  // Cinza claro rosado
          300: '#e8dce8',  // Cinza médio rosado
          400: '#c9b3c9',  // Cinza rosado
          500: '#9b7e9b',  // Cinza médio
          600: '#73617',   // Cinza escuro
          700: '#503850',  // Cinza muito escuro (feminino)
          800: '#3d2a3d',  // Roxo acinzentado escuro
          900: '#2a1d2a',  // Quase preto com toque roxo
        },
        // Cores especiais para dark mode (Elegante e Suave)
        dark: {
          bg: '#1A1625',       // Fundo principal dark (roxo bem escuro)
          card: '#1E1E1E',     // Cards e superfícies (preto fosco claro)
          surface: '#252030',  // Superfícies elevadas (roxo fosco)
          border: '#2D2837',   // Bordas suaves
          text: '#F5F5F5',     // Texto principal (branco gelo - não agride os olhos)
          muted: '#B8B5C0',    // Texto secundário (cinza lavanda)
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(244, 63, 117, 0.15), 0 10px 20px -2px rgba(244, 63, 117, 0.08)',
        'glow': '0 0 25px rgba(244, 63, 117, 0.4), 0 0 50px rgba(168, 85, 247, 0.2)',
        'glow-purple': '0 0 25px rgba(168, 85, 247, 0.4)',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #f43f75 0%, #a855f7 100%)',
        'gradient-primary-dark': 'linear-gradient(135deg, #e11d5f 0%, #9333ea 100%)',
        'gradient-soft': 'linear-gradient(135deg, #fff1f3 0%, #faf5ff 100%)',
        'gradient-soft-dark': 'linear-gradient(135deg, #3d2a3d 0%, #2d1f2d 100%)',
        'gradient-peach': 'linear-gradient(135deg, #fff9f5 0%, #ffe0ca 100%)',
      }
    },
  },
  plugins: [],
}
