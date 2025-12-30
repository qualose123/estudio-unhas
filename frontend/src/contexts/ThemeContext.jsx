import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme deve ser usado dentro de ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    // Sempre começar com light mode
    const savedTheme = localStorage.getItem('theme');
    return savedTheme || 'light';
  });

  useEffect(() => {
    const root = document.documentElement;

    // Remover todas as classes de tema
    root.classList.remove('light', 'dark');

    // Adicionar a classe do tema atual
    root.classList.add(theme);

    // Salvar no localStorage
    localStorage.setItem('theme', theme);

    console.log('Tema aplicado:', theme, 'Classes no HTML:', root.className);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => {
      const newTheme = prevTheme === 'light' ? 'dark' : 'light';
      console.log('Mudando tema de', prevTheme, 'para', newTheme);
      return newTheme;
    });
  };

  const value = {
    theme,
    toggleTheme,
    isDark: theme === 'dark'
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
