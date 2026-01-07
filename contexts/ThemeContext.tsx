import React, { createContext, useContext, useEffect, useState } from 'react';
import { Theme } from '../types';

export const THEME_STYLES: Record<Theme, {
  bg: string;
  text: string;
  secondaryText: string;
  cardBase: string;
  cardBorder: string;
  header: string;
  drawer: string;
  searchBar: string;
  searchBarText: string;
  searchBarPlaceholder: string;
  iconHover: string;
  fab: string;
  divider: string;
  input: string;
  inputText: string;
  modalOverlay: string;
  primaryText: string;
  primaryBg: string;
  dangerText: string;
  dangerBg: string;
  successText: string;
  activeItem: string;
  lockedBg: string;
  lockedBorder: string;
  tagBg: string;
  tagText: string;
  buttonSecondary: string;
}> = {
  classic: {
    bg: 'bg-gray-50',
    text: 'text-gray-900',
    secondaryText: 'text-gray-500',
    cardBase: 'bg-white',
    cardBorder: 'border-transparent',
    header: 'bg-white/90 backdrop-blur-md border-b border-gray-100',
    drawer: 'bg-white border-r border-gray-200',
    searchBar: 'bg-gray-100',
    searchBarText: 'text-gray-900',
    searchBarPlaceholder: 'placeholder-gray-500',
    iconHover: 'hover:bg-gray-200',
    fab: 'bg-blue-600 hover:bg-blue-700 text-white shadow-xl',
    divider: 'border-gray-200',
    input: 'bg-white border border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500',
    inputText: 'text-gray-900',
    modalOverlay: 'bg-black/20 backdrop-blur-sm',
    primaryText: 'text-blue-600',
    primaryBg: 'bg-blue-50',
    dangerText: 'text-red-600',
    dangerBg: 'bg-red-50 hover:bg-red-100',
    successText: 'text-green-600',
    activeItem: 'bg-blue-50 text-blue-600 font-medium',
    lockedBg: 'bg-gray-50 border-gray-200',
    lockedBorder: 'border-gray-200',
    tagBg: 'bg-gray-100',
    tagText: 'text-gray-600',
    buttonSecondary: 'bg-gray-100 hover:bg-gray-200 text-gray-900',
  },
  dark: {
    bg: 'bg-[#121212]',
    text: 'text-gray-100',
    secondaryText: 'text-gray-400',
    cardBase: 'bg-[#1e1e1e]',
    cardBorder: 'border-gray-800',
    header: 'bg-[#1e1e1e]/90 backdrop-blur-md border-b border-gray-800',
    drawer: 'bg-[#1e1e1e] border-r border-gray-800',
    searchBar: 'bg-[#2c2c2c]',
    searchBarText: 'text-gray-100',
    searchBarPlaceholder: 'placeholder-gray-500',
    iconHover: 'hover:bg-gray-700',
    fab: 'bg-blue-500 hover:bg-blue-600 text-white shadow-xl shadow-black/30',
    divider: 'border-gray-800',
    input: 'bg-gray-900 border border-gray-800 focus:border-gray-600 text-gray-100',
    inputText: 'text-gray-100',
    modalOverlay: 'bg-black/60 backdrop-blur-sm',
    primaryText: 'text-blue-400',
    primaryBg: 'bg-blue-500/10',
    dangerText: 'text-red-400',
    dangerBg: 'bg-red-900/20 hover:bg-red-900/30',
    successText: 'text-green-400',
    activeItem: 'bg-blue-500/10 text-blue-400 font-medium',
    lockedBg: 'bg-black/20 border-gray-800',
    lockedBorder: 'border-gray-800',
    tagBg: 'bg-white/10',
    tagText: 'text-gray-300',
    buttonSecondary: 'bg-gray-800 hover:bg-gray-700 text-gray-200',
  },
  'neo-glass': {
    bg: 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 bg-fixed',
    text: 'text-white',
    secondaryText: 'text-white/70',
    cardBase: 'bg-white/10 backdrop-blur-md shadow-lg',
    cardBorder: 'border-white/20',
    header: 'bg-white/10 backdrop-blur-xl border-b border-white/10',
    drawer: 'bg-black/40 backdrop-blur-xl border-r border-white/10',
    searchBar: 'bg-black/20 backdrop-blur-md border border-white/10',
    searchBarText: 'text-white',
    searchBarPlaceholder: 'placeholder-white/50',
    iconHover: 'hover:bg-white/20',
    fab: 'bg-white/20 hover:bg-white/30 backdrop-blur-md text-white border border-white/30 shadow-xl',
    divider: 'border-white/10',
    input: 'bg-black/20 border border-white/10 text-white placeholder-white/50 focus:bg-black/30',
    inputText: 'text-white',
    modalOverlay: 'bg-black/40 backdrop-blur-md',
    primaryText: 'text-white',
    primaryBg: 'bg-white/20',
    dangerText: 'text-red-200',
    dangerBg: 'bg-red-500/20 hover:bg-red-500/30',
    successText: 'text-green-300',
    activeItem: 'bg-white/20 text-white shadow-[0_0_15px_rgba(255,255,255,0.2)] font-medium border border-white/10',
    lockedBg: 'bg-black/10 border-white/10',
    lockedBorder: 'border-white/10',
    tagBg: 'bg-white/20',
    tagText: 'text-white',
    buttonSecondary: 'bg-white/10 hover:bg-white/20 text-white border border-white/10',
  },
  vision: {
    bg: 'bg-[#0B132B]',
    text: 'text-[#E6ECF5]',
    secondaryText: 'text-[#C9D2E3]',
    cardBase: 'bg-[#182545]',
    cardBorder: 'border-[#1F2C4D]',
    header: 'bg-[#0B132B]/90 backdrop-blur-md border-b border-[#1F2C4D]',
    drawer: 'bg-[#0E1A33] border-r border-[#1F2C4D]',
    searchBar: 'bg-[#141F3A] border border-[#2A3B66]',
    searchBarText: 'text-[#E6ECF5]',
    searchBarPlaceholder: 'placeholder-[#9AA7C2]',
    iconHover: 'hover:bg-[#24345C]',
    fab: 'bg-[#2F6BFF] hover:bg-[#3B7BFF] text-white shadow-lg shadow-[#0B132B]/50',
    divider: 'border-[#1F2C4D]',
    input: 'bg-[#141F3A] border border-[#2A3B66] text-[#E6ECF5] focus:border-[#2F6BFF]',
    inputText: 'text-[#E6ECF5]',
    modalOverlay: 'bg-black/60 backdrop-blur-md',
    primaryText: 'text-[#2F6BFF]',
    primaryBg: 'bg-[#2F6BFF]/10',
    dangerText: 'text-red-400',
    dangerBg: 'bg-red-900/20 hover:bg-red-900/30',
    successText: 'text-green-400',
    activeItem: 'bg-[#2F6BFF]/20 text-[#2F6BFF] border border-[#2F6BFF]/30 font-medium',
    lockedBg: 'bg-[#0B132B] border-[#1F2C4D]',
    lockedBorder: 'border-[#1F2C4D]',
    tagBg: 'bg-[#141F3A]',
    tagText: 'text-[#7F8FB0]',
    buttonSecondary: 'bg-[#141F3A] hover:bg-[#24345C] text-[#E6ECF5] border border-[#2A3B66]',
  }
};

export const SECURITY_STYLES: Record<Theme, {
    container: string;
    text: string;
    subText: string;
    keypad: string;
    keypadAction: string;
    dotActive: string;
    dotInactive: string;
    icon: string;
}> = {
  classic: {
    container: "bg-gray-50",
    text: "text-gray-900",
    subText: "text-gray-500",
    keypad: "bg-white shadow-sm border border-gray-200 text-gray-900 active:bg-gray-100",
    keypadAction: "text-gray-900 hover:bg-gray-100",
    dotActive: "bg-gray-900 border-gray-900 scale-110",
    dotInactive: "border-gray-300 bg-transparent",
    icon: "text-gray-900"
  },
  dark: {
    container: "bg-[#121212]",
    text: "text-white",
    subText: "text-gray-400",
    keypad: "bg-[#1e1e1e] text-white active:bg-white/10 border border-gray-800",
    keypadAction: "text-white/60 hover:bg-white/10",
    dotActive: "bg-white border-white scale-110",
    dotInactive: "border-gray-700 bg-transparent",
    icon: "text-white/90"
  },
  'neo-glass': {
    container: "bg-gradient-to-br from-indigo-900/95 via-purple-900/95 to-pink-900/95 backdrop-blur-3xl",
    text: "text-white",
    subText: "text-white/70",
    keypad: "bg-white/10 border border-white/20 text-white backdrop-blur-md active:bg-white/20 shadow-lg",
    keypadAction: "text-white/80 hover:bg-white/10",
    dotActive: "bg-white border-white shadow-[0_0_15px_rgba(255,255,255,0.6)] scale-110",
    dotInactive: "border-white/30 bg-transparent",
    icon: "text-white"
  },
  vision: {
    container: "bg-[#0B132B]",
    text: "text-[#E6ECF5]",
    subText: "text-[#7F8FB0]",
    keypad: "bg-[#141F3A] border border-[#1F2C4D] text-[#2F6BFF] active:bg-[#24345C] shadow-lg shadow-[#0B132B]/50",
    keypadAction: "text-[#7F8FB0] hover:bg-[#141F3A]",
    dotActive: "bg-[#2F6BFF] border-[#2F6BFF] shadow-[0_0_10px_rgba(47,107,255,0.5)] scale-110",
    dotInactive: "border-[#1F2C4D] bg-transparent",
    icon: "text-[#2F6BFF]"
  }
};

export const NOTE_COLORS: Record<string, Record<Theme, string>> = {
  default: {
    classic: 'bg-white border-gray-200',
    dark: 'bg-[#1e1e1e] border-gray-800',
    'neo-glass': 'bg-white/10 border-white/20',
    vision: 'bg-[#182545] border-[#1F2C4D]',
  },
  red: {
    classic: 'bg-red-50 border-red-100',
    dark: 'bg-red-950/30 border-red-900/50',
    'neo-glass': 'bg-red-500/20 border-red-400/30',
    vision: 'bg-red-900/20 border-red-800/30',
  },
  orange: {
    classic: 'bg-orange-50 border-orange-100',
    dark: 'bg-orange-950/30 border-orange-900/50',
    'neo-glass': 'bg-orange-500/20 border-orange-400/30',
    vision: 'bg-orange-900/20 border-orange-800/30',
  },
  yellow: {
    classic: 'bg-yellow-50 border-yellow-100',
    dark: 'bg-yellow-950/30 border-yellow-900/50',
    'neo-glass': 'bg-yellow-500/20 border-yellow-400/30',
    vision: 'bg-yellow-900/20 border-yellow-800/30',
  },
  green: {
    classic: 'bg-green-50 border-green-100',
    dark: 'bg-green-950/30 border-green-900/50',
    'neo-glass': 'bg-green-500/20 border-green-400/30',
    vision: 'bg-green-900/20 border-green-800/30',
  },
  teal: {
    classic: 'bg-teal-50 border-teal-100',
    dark: 'bg-teal-950/30 border-teal-900/50',
    'neo-glass': 'bg-teal-500/20 border-teal-400/30',
    vision: 'bg-teal-900/20 border-teal-800/30',
  },
  blue: {
    classic: 'bg-blue-50 border-blue-100',
    dark: 'bg-blue-950/30 border-blue-900/50',
    'neo-glass': 'bg-blue-500/20 border-blue-400/30',
    vision: 'bg-blue-900/20 border-blue-800/30',
  },
  purple: {
    classic: 'bg-purple-50 border-purple-100',
    dark: 'bg-purple-950/30 border-purple-900/50',
    'neo-glass': 'bg-purple-500/20 border-purple-400/30',
    vision: 'bg-purple-900/20 border-purple-800/30',
  },
  pink: {
    classic: 'bg-pink-50 border-pink-100',
    dark: 'bg-pink-950/30 border-pink-900/50',
    'neo-glass': 'bg-pink-500/20 border-pink-400/30',
    vision: 'bg-pink-900/20 border-pink-800/30',
  },
  gray: {
    classic: 'bg-gray-100 border-gray-200',
    dark: 'bg-gray-800 border-gray-700',
    'neo-glass': 'bg-white/5 border-white/10',
    vision: 'bg-[#141F3A] border-[#2A3B66]',
  },
};

interface ThemeContextType {
  theme: Theme;
  setTheme: (t: Theme) => void;
  styles: typeof THEME_STYLES['classic'];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('classic');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme || 'classic';
    setTheme(savedTheme);
    applyDomTheme(savedTheme);
  }, []);

  const applyDomTheme = (t: Theme) => {
    const root = window.document.documentElement;
    if (t === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', t);
  };

  const handleThemeChange = (t: Theme) => {
    setTheme(t);
    applyDomTheme(t);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme: handleThemeChange, styles: THEME_STYLES[theme] }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
};