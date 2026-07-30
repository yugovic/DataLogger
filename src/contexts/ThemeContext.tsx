import React, { createContext, useContext, useState, useEffect } from 'react';

/**
 * 画面の外観。
 * - basic   : これまでの明るい配色。実測でピット要件（60px以上・7:1以上）を満たしている
 * - refined : near-black ＋ 骨色オフホワイトの配色。計器盤的な見せ方をする
 *
 * refined はダークを前提にした配色なので、選ぶと dark も併せて有効になる。
 * どちらのモードでもピット要件は外さない（docs/visual-reference-mezgr.md）。
 */
export type Appearance = 'basic' | 'refined';

interface ThemeContextType {
  darkMode: boolean;
  toggleDarkMode: () => void;
  appearance: Appearance;
  setAppearance: (a: Appearance) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

const readAppearance = (): Appearance => {
  try {
    return localStorage.getItem('appearance') === 'refined' ? 'refined' : 'basic';
  } catch {
    return 'basic';
  }
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const savedTheme = localStorage.getItem('darkMode');
    return savedTheme ? JSON.parse(savedTheme) : false;
  });
  const [appearance, setAppearanceState] = useState<Appearance>(readAppearance);

  // refined は暗い地色が前提なので、ダーク指定と併せて効かせる
  const effectiveDark = darkMode || appearance === 'refined';

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  useEffect(() => {
    try {
      localStorage.setItem('appearance', appearance);
    } catch {
      // 保存できなくても表示は切り替わる
    }
  }, [appearance]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', effectiveDark);
    root.classList.toggle('refined', appearance === 'refined');
  }, [effectiveDark, appearance]);

  const toggleDarkMode = () => {
    setDarkMode((prev) => !prev);
  };

  const setAppearance = (a: Appearance) => {
    setAppearanceState(a);
  };

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode, appearance, setAppearance }}>
      {children}
    </ThemeContext.Provider>
  );
};
