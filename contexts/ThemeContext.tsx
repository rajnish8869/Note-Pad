import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
} from "react";
import { Theme, ThemeDefinition, CustomThemeData } from "../types";

// Full definition of all style properties required for a theme
// Extended to support dynamic refactoring requirements
interface ExtendedThemeDefinition extends ThemeDefinition {
  primaryRing: string;
  successBg: string;
  accentColor: string; // Hex for CSS Vars
  profileIconBg: string;
}

// --- Preset Themes ---

const CLASSIC_THEME: ExtendedThemeDefinition = {
  bg: "bg-gray-50",
  text: "text-gray-900",
  secondaryText: "text-gray-500",
  cardBase: "bg-white",
  cardBorder: "border-transparent",
  header: "bg-white/90 backdrop-blur-md border-b border-gray-100",
  drawer: "bg-white border-r border-gray-200",
  searchBar: "bg-gray-100",
  searchBarText: "text-gray-900",
  searchBarPlaceholder: "placeholder-gray-500",
  iconHover: "hover:bg-gray-200",
  fab: "bg-blue-600 hover:bg-blue-700 text-white shadow-xl",
  divider: "border-gray-200",
  input:
    "bg-white border border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500",
  inputText: "text-gray-900",
  modalOverlay: "bg-black/20 backdrop-blur-sm",
  primaryText: "text-blue-600",
  primaryBg: "bg-blue-50",
  primaryRing: "ring-blue-500",
  dangerText: "text-red-600",
  dangerBg: "bg-red-50 hover:bg-red-100",
  successText: "text-green-600",
  successBg: "bg-green-100",
  activeItem: "bg-blue-50 text-blue-600 font-medium",
  lockedBg: "bg-gray-50 border-gray-200",
  lockedBorder: "border-gray-200",
  tagBg: "bg-gray-100",
  tagText: "text-gray-600",
  buttonSecondary: "bg-gray-100 hover:bg-gray-200 text-gray-900",
  statusBarColor: "#ffffff",
  accentColor: "#2563eb", // blue-600
  profileIconBg: "bg-gradient-to-br from-blue-400 to-blue-600 text-white",
  isDark: false,
};

const DARK_THEME: ExtendedThemeDefinition = {
  bg: "bg-[#121212]",
  text: "text-gray-100",
  secondaryText: "text-gray-400",
  cardBase: "bg-[#1e1e1e]",
  cardBorder: "border-gray-800",
  header: "bg-[#1e1e1e]/90 backdrop-blur-md border-b border-gray-800",
  drawer: "bg-[#1e1e1e] border-r border-gray-800",
  searchBar: "bg-[#2c2c2c]",
  searchBarText: "text-gray-100",
  searchBarPlaceholder: "placeholder-gray-500",
  iconHover: "hover:bg-gray-700",
  fab: "bg-blue-500 hover:bg-blue-600 text-white shadow-xl shadow-black/30",
  divider: "border-gray-800",
  input:
    "bg-gray-900 border border-gray-800 focus:border-gray-600 text-gray-100",
  inputText: "text-gray-100",
  modalOverlay: "bg-black/60 backdrop-blur-sm",
  primaryText: "text-blue-400",
  primaryBg: "bg-blue-500/10",
  primaryRing: "ring-blue-500",
  dangerText: "text-red-400",
  dangerBg: "bg-red-900/20 hover:bg-red-900/30",
  successText: "text-green-400",
  successBg: "bg-green-900/20",
  activeItem: "bg-blue-500/10 text-blue-400 font-medium",
  lockedBg: "bg-black/20 border-gray-800",
  lockedBorder: "border-gray-800",
  tagBg: "bg-white/10",
  tagText: "text-gray-300",
  buttonSecondary: "bg-gray-800 hover:bg-gray-700 text-gray-200",
  statusBarColor: "#1e1e1e",
  accentColor: "#3b82f6", // blue-500
  profileIconBg: "bg-gradient-to-br from-blue-500 to-blue-700 text-white",
  isDark: true,
};

// 10 Preset Themes
const PRESET_THEMES: Record<string, ExtendedThemeDefinition> = {
  classic: CLASSIC_THEME,
  dark: DARK_THEME,
  "neo-glass": {
    bg: "bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 bg-fixed",
    text: "text-white",
    secondaryText: "text-white/70",
    cardBase: "bg-white/10 backdrop-blur-md shadow-lg",
    cardBorder: "border-white/20",
    header: "bg-white/10 backdrop-blur-xl border-b border-white/10",
    drawer: "bg-black/40 backdrop-blur-xl border-r border-white/10",
    searchBar: "bg-black/20 backdrop-blur-md border border-white/10",
    searchBarText: "text-white",
    searchBarPlaceholder: "placeholder-white/50",
    iconHover: "hover:bg-white/20",
    fab: "bg-white/20 hover:bg-white/30 backdrop-blur-md text-white border border-white/30 shadow-xl",
    divider: "border-white/10",
    input:
      "bg-black/20 border border-white/10 text-white placeholder-white/50 focus:bg-black/30",
    inputText: "text-white",
    modalOverlay: "bg-black/40 backdrop-blur-md",
    primaryText: "text-white",
    primaryBg: "bg-white/20",
    primaryRing: "ring-white/50",
    dangerText: "text-red-200",
    dangerBg: "bg-red-500/20 hover:bg-red-500/30",
    successText: "text-green-300",
    successBg: "bg-green-500/20",
    activeItem:
      "bg-white/20 text-white shadow-[0_0_15px_rgba(255,255,255,0.2)] font-medium border border-white/10",
    lockedBg: "bg-black/10 border-white/10",
    lockedBorder: "border-white/10",
    tagBg: "bg-white/20",
    tagText: "text-white",
    buttonSecondary:
      "bg-white/10 hover:bg-white/20 text-white border border-white/10",
    statusBarColor: "#6366f1",
    accentColor: "#ffffff",
    profileIconBg: "bg-white/20 text-white",
    isDark: true,
  },
  vision: {
    bg: "bg-[#0B132B]",
    text: "text-[#E6ECF5]",
    secondaryText: "text-[#C9D2E3]",
    cardBase: "bg-[#182545]",
    cardBorder: "border-[#1F2C4D]",
    header: "bg-[#0B132B]/90 backdrop-blur-md border-b border-[#1F2C4D]",
    drawer: "bg-[#0E1A33] border-r border-[#1F2C4D]",
    searchBar: "bg-[#141F3A] border border-[#2A3B66]",
    searchBarText: "text-[#E6ECF5]",
    searchBarPlaceholder: "placeholder-[#9AA7C2]",
    iconHover: "hover:bg-[#24345C]",
    fab: "bg-[#2F6BFF] hover:bg-[#3B7BFF] text-white shadow-lg shadow-[#0B132B]/50",
    divider: "border-[#1F2C4D]",
    input:
      "bg-[#141F3A] border border-[#2A3B66] text-[#E6ECF5] focus:border-[#2F6BFF]",
    inputText: "text-[#E6ECF5]",
    modalOverlay: "bg-black/60 backdrop-blur-md",
    primaryText: "text-[#2F6BFF]",
    primaryBg: "bg-[#2F6BFF]/10",
    primaryRing: "ring-[#2F6BFF]",
    dangerText: "text-red-400",
    dangerBg: "bg-red-900/20 hover:bg-red-900/30",
    successText: "text-green-400",
    successBg: "bg-green-900/20",
    activeItem:
      "bg-[#2F6BFF]/20 text-[#2F6BFF] border border-[#2F6BFF]/30 font-medium",
    lockedBg: "bg-[#0B132B] border-[#1F2C4D]",
    lockedBorder: "border-[#1F2C4D]",
    tagBg: "bg-[#141F3A]",
    tagText: "text-[#7F8FB0]",
    buttonSecondary:
      "bg-[#141F3A] hover:bg-[#24345C] text-[#E6ECF5] border border-[#2A3B66]",
    statusBarColor: "#0B132B",
    accentColor: "#2F6BFF",
    profileIconBg: "bg-[#2F6BFF] text-white",
    isDark: true,
  },
  midnight: {
    // AMOLED Black
    ...DARK_THEME,
    bg: "bg-black",
    cardBase: "bg-black",
    cardBorder: "border-gray-900",
    header: "bg-black/90 backdrop-blur-md border-b border-gray-900",
    drawer: "bg-black border-r border-gray-900",
    statusBarColor: "#000000",
    accentColor: "#3b82f6",
    isDark: true,
  },
  forest: {
    ...DARK_THEME,
    bg: "bg-[#051a10]", // Very dark green
    cardBase: "bg-[#0a2619]",
    cardBorder: "border-[#143d29]",
    header: "bg-[#051a10]/90 backdrop-blur-md border-b border-[#143d29]",
    drawer: "bg-[#051a10] border-r border-[#143d29]",
    primaryText: "text-emerald-400",
    primaryBg: "bg-emerald-500/10",
    primaryRing: "ring-emerald-500",
    successText: "text-emerald-400",
    successBg: "bg-emerald-500/10",
    activeItem: "bg-emerald-500/10 text-emerald-400 font-medium",
    fab: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl",
    statusBarColor: "#051a10",
    accentColor: "#10b981", // Emerald 500
    profileIconBg:
      "bg-gradient-to-br from-emerald-500 to-emerald-700 text-white",
    isDark: true,
  },
  ocean: {
    ...DARK_THEME,
    bg: "bg-[#0f172a]", // Slate 900
    cardBase: "bg-[#1e293b]", // Slate 800
    cardBorder: "border-[#334155]",
    header: "bg-[#0f172a]/90 backdrop-blur-md border-b border-[#1e293b]",
    drawer: "bg-[#0f172a] border-r border-[#1e293b]",
    primaryText: "text-cyan-400",
    primaryBg: "bg-cyan-500/10",
    primaryRing: "ring-cyan-500",
    activeItem: "bg-cyan-500/10 text-cyan-400 font-medium",
    fab: "bg-cyan-600 hover:bg-cyan-700 text-white shadow-xl",
    statusBarColor: "#0f172a",
    accentColor: "#06b6d4", // Cyan 500
    profileIconBg: "bg-gradient-to-br from-cyan-500 to-cyan-700 text-white",
    isDark: true,
  },
  sunset: {
    ...DARK_THEME,
    bg: "bg-[#2a1b1b]", // Dark brownish/red
    cardBase: "bg-[#3d2424]",
    cardBorder: "border-[#593232]",
    header: "bg-[#2a1b1b]/90 backdrop-blur-md border-b border-[#3d2424]",
    drawer: "bg-[#2a1b1b] border-r border-[#3d2424]",
    primaryText: "text-orange-400",
    primaryBg: "bg-orange-500/10",
    primaryRing: "ring-orange-500",
    activeItem: "bg-orange-500/10 text-orange-400 font-medium",
    fab: "bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-xl",
    statusBarColor: "#2a1b1b",
    accentColor: "#f97316", // Orange 500
    profileIconBg: "bg-gradient-to-r from-orange-500 to-rose-500 text-white",
    isDark: true,
  },
  coffee: {
    ...DARK_THEME,
    bg: "bg-[#1c1917]", // Stone 900
    cardBase: "bg-[#292524]", // Stone 800
    cardBorder: "border-[#44403c]",
    header: "bg-[#1c1917]/90 backdrop-blur-md border-b border-[#292524]",
    drawer: "bg-[#1c1917] border-r border-[#292524]",
    text: "text-amber-50",
    secondaryText: "text-amber-200/50",
    primaryText: "text-amber-400",
    primaryBg: "bg-amber-500/10",
    primaryRing: "ring-amber-500",
    activeItem: "bg-amber-500/10 text-amber-400 font-medium",
    fab: "bg-amber-700 hover:bg-amber-800 text-white shadow-xl",
    statusBarColor: "#1c1917",
    accentColor: "#f59e0b", // Amber 500
    profileIconBg: "bg-gradient-to-br from-amber-600 to-amber-800 text-white",
    isDark: true,
  },
  lavender: {
    ...DARK_THEME,
    bg: "bg-[#1e1b2e]", // Dark Purple/Blue
    cardBase: "bg-[#2d2a42]",
    cardBorder: "border-[#423e61]",
    header: "bg-[#1e1b2e]/90 backdrop-blur-md border-b border-[#2d2a42]",
    drawer: "bg-[#1e1b2e] border-r border-[#2d2a42]",
    text: "text-purple-50",
    secondaryText: "text-purple-200/50",
    primaryText: "text-purple-400",
    primaryBg: "bg-purple-500/10",
    primaryRing: "ring-purple-500",
    activeItem: "bg-purple-500/10 text-purple-400 font-medium",
    fab: "bg-purple-600 hover:bg-purple-700 text-white shadow-xl",
    statusBarColor: "#1e1b2e",
    accentColor: "#a855f7", // Purple 500
    profileIconBg: "bg-gradient-to-br from-purple-500 to-purple-700 text-white",
    isDark: true,
  },
};

// --- Theme Generator for Custom Themes ---

const generateThemeDefinition = (
  base: "light" | "dim" | "dark",
  accent: string
): ExtendedThemeDefinition => {
  // 1. Determine Base
  let baseDef = CLASSIC_THEME;
  if (base === "dim") {
    baseDef = {
      ...DARK_THEME,
      bg: "bg-gray-800",
      cardBase: "bg-gray-700",
      cardBorder: "border-gray-600",
      header: "bg-gray-800/90 backdrop-blur-md border-b border-gray-700",
      drawer: "bg-gray-800 border-r border-gray-700",
      statusBarColor: "#1f2937",
      isDark: true,
    };
  } else if (base === "dark") {
    baseDef = {
      ...DARK_THEME,
      bg: "bg-black",
      cardBase: "bg-[#111]",
      cardBorder: "border-[#333]",
      header: "bg-black/90 backdrop-blur-md border-b border-[#222]",
      drawer: "bg-black border-r border-[#222]",
      statusBarColor: "#000000",
      isDark: true,
    };
  }

  // 2. Apply Accent
  // Map simple color names to Tailwind ranges & Hex for CSS variables
  const accentMap: Record<
    string,
    { main: string; text: string; bg: string; fab: string; hex: string }
  > = {
    blue: {
      main: "blue-500",
      text: "blue-400",
      bg: "blue-500/10",
      fab: "bg-blue-600",
      hex: "#3b82f6",
    },
    red: {
      main: "red-500",
      text: "red-400",
      bg: "red-500/10",
      fab: "bg-red-600",
      hex: "#ef4444",
    },
    green: {
      main: "emerald-500",
      text: "emerald-400",
      bg: "emerald-500/10",
      fab: "bg-emerald-600",
      hex: "#10b981",
    },
    purple: {
      main: "purple-500",
      text: "purple-400",
      bg: "purple-500/10",
      fab: "bg-purple-600",
      hex: "#a855f7",
    },
    orange: {
      main: "orange-500",
      text: "orange-400",
      bg: "orange-500/10",
      fab: "bg-orange-600",
      hex: "#f97316",
    },
    pink: {
      main: "pink-500",
      text: "pink-400",
      bg: "pink-500/10",
      fab: "bg-pink-600",
      hex: "#ec4899",
    },
    teal: {
      main: "teal-500",
      text: "teal-400",
      bg: "teal-500/10",
      fab: "bg-teal-600",
      hex: "#14b8a6",
    },
    yellow: {
      main: "yellow-500",
      text: "yellow-400",
      bg: "yellow-500/10",
      fab: "bg-yellow-600",
      hex: "#eab308",
    },
    indigo: {
      main: "indigo-500",
      text: "indigo-400",
      bg: "indigo-500/10",
      fab: "bg-indigo-600",
      hex: "#6366f1",
    },
    rose: {
      main: "rose-500",
      text: "rose-400",
      bg: "rose-500/10",
      fab: "bg-rose-600",
      hex: "#f43f5e",
    },
    cyan: {
      main: "cyan-500",
      text: "cyan-400",
      bg: "cyan-500/10",
      fab: "bg-cyan-600",
      hex: "#06b6d4",
    },
    lime: {
      main: "lime-500",
      text: "lime-400",
      bg: "lime-500/10",
      fab: "bg-lime-600",
      hex: "#84cc16",
    },
  };

  const a = accentMap[accent] || accentMap.blue;
  const isDark = base !== "light";

  const generated: ExtendedThemeDefinition = {
    ...baseDef,
    primaryText: `text-${a.text}`,
    primaryBg: `bg-${a.bg}`,
    primaryRing: `ring-${a.main}`,
    activeItem: `bg-${a.bg} text-${a.text} font-medium border border-${a.text}/20`,
    fab: `${a.fab} text-white shadow-xl hover:opacity-90`,
    accentColor: a.hex,
    profileIconBg: `bg-${a.main} text-white`,
    // For light mode, we might want slightly different text colors
    ...(!isDark
      ? {
          primaryText: `text-${accent}-600`,
          primaryBg: `bg-${accent}-50`,
          activeItem: `bg-${accent}-50 text-${accent}-600 font-medium`,
          profileIconBg: `bg-gradient-to-br from-${accent}-400 to-${accent}-600 text-white`,
        }
      : {}),
  };
  return generated;
};

// --- Context Setup ---

export const SECURITY_STYLES: Record<
  string,
  {
    container: string;
    text: string;
    subText: string;
    keypad: string;
    keypadAction: string;
    dotActive: string;
    dotInactive: string;
    icon: string;
  }
> = {
  classic: {
    container: "bg-gray-50",
    text: "text-gray-900",
    subText: "text-gray-500",
    keypad:
      "bg-white shadow-sm border border-gray-200 text-gray-900 active:bg-gray-100",
    keypadAction: "text-gray-900 hover:bg-gray-100",
    dotActive: "bg-gray-900 border-gray-900 scale-110",
    dotInactive: "border-gray-300 bg-transparent",
    icon: "text-gray-900",
  },
  dark: {
    container: "bg-[#121212]",
    text: "text-white",
    subText: "text-gray-400",
    keypad: "bg-[#1e1e1e] text-white active:bg-white/10 border border-gray-800",
    keypadAction: "text-white/60 hover:bg-white/10",
    dotActive: "bg-white border-white scale-110",
    dotInactive: "border-gray-700 bg-transparent",
    icon: "text-white/90",
  },
};

export const NOTE_COLORS: Record<string, Record<string, string>> = {
  default: {
    classic: "bg-white border-gray-200",
    dark: "bg-[#1e1e1e] border-gray-800",
  },
  red: {
    classic: "bg-red-50 border-red-100",
    dark: "bg-red-950/30 border-red-900/50",
  },
  orange: {
    classic: "bg-orange-50 border-orange-100",
    dark: "bg-orange-950/30 border-orange-900/50",
  },
  yellow: {
    classic: "bg-yellow-50 border-yellow-100",
    dark: "bg-yellow-950/30 border-yellow-900/50",
  },
  green: {
    classic: "bg-green-50 border-green-100",
    dark: "bg-green-950/30 border-green-900/50",
  },
  teal: {
    classic: "bg-teal-50 border-teal-100",
    dark: "bg-teal-950/30 border-teal-900/50",
  },
  blue: {
    classic: "bg-blue-50 border-blue-100",
    dark: "bg-blue-950/30 border-blue-900/50",
  },
  purple: {
    classic: "bg-purple-50 border-purple-100",
    dark: "bg-purple-950/30 border-purple-900/50",
  },
  pink: {
    classic: "bg-pink-50 border-pink-100",
    dark: "bg-pink-950/30 border-pink-900/50",
  },
  gray: {
    classic: "bg-gray-100 border-gray-200",
    dark: "bg-gray-800 border-gray-700",
  },
};

// Fallback logic for note colors in new themes
const getNoteColor = (
  color: string,
  themeId: string,
  isDark: boolean
): string => {
  const palette = NOTE_COLORS[color];
  if (!palette)
    return isDark ? NOTE_COLORS.default.dark : NOTE_COLORS.default.classic;

  // Specific overrides
  if (themeId === "classic" && !isDark) return palette.classic;

  return isDark ? palette.dark : palette.classic;
};

interface ThemeContextType {
  theme: Theme;
  setTheme: (t: Theme) => void;
  styles: ExtendedThemeDefinition;

  // Custom Theme Features
  customThemes: CustomThemeData[];
  addCustomTheme: (
    name: string,
    base: "light" | "dim" | "dark",
    accent: string
  ) => void;
  deleteCustomTheme: (id: string) => void;

  // Helpers
  getNoteColorStyle: (color: string) => string;
  getSecurityStyles: () => (typeof SECURITY_STYLES)["classic"];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [themeId, setThemeId] = useState<Theme>("classic");
  const [customThemes, setCustomThemes] = useState<CustomThemeData[]>([]);

  // Load Custom Themes & Current Theme
  useEffect(() => {
    const savedCustom = localStorage.getItem("custom_themes");
    if (savedCustom) {
      try {
        setCustomThemes(JSON.parse(savedCustom));
      } catch (e) {}
    }

    const savedThemeId = localStorage.getItem("theme") || "classic";
    setThemeId(savedThemeId);
  }, []);

  // Save Custom Themes
  useEffect(() => {
    localStorage.setItem("custom_themes", JSON.stringify(customThemes));
  }, [customThemes]);

  const activeStyles = useMemo(() => {
    // 1. Check Presets
    if (PRESET_THEMES[themeId]) return PRESET_THEMES[themeId];

    // 2. Check Custom
    const custom = customThemes.find((c) => c.id === themeId);
    if (custom) return generateThemeDefinition(custom.base, custom.accent);

    // 3. Fallback
    return CLASSIC_THEME;
  }, [themeId, customThemes]);

  const applyDomTheme = (def: ExtendedThemeDefinition, id: string) => {
    const root = window.document.documentElement;

    // Simple dark mode toggle for Tailwind 'dark:' modifier
    if (def.isDark) root.classList.add("dark");
    else root.classList.remove("dark");

    // Update Status Bar
    let metaThemeColor = document.querySelector("meta[name=theme-color]");
    if (!metaThemeColor) {
      metaThemeColor = document.createElement("meta");
      metaThemeColor.setAttribute("name", "theme-color");
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.setAttribute("content", def.statusBarColor);

    // Set CSS Variable for dynamic colors (like checkbox ticks)
    root.style.setProperty("--primary-color", def.accentColor);

    localStorage.setItem("theme", id);
  };

  useEffect(() => {
    applyDomTheme(activeStyles, themeId);
  }, [activeStyles, themeId]);

  const addCustomTheme = (
    name: string,
    base: "light" | "dim" | "dark",
    accent: string
  ) => {
    const newTheme: CustomThemeData = {
      id: `custom_${Date.now()}`,
      name,
      base,
      accent,
    };
    setCustomThemes((prev) => [...prev, newTheme]);
    setThemeId(newTheme.id);
  };

  const deleteCustomTheme = (id: string) => {
    setCustomThemes((prev) => prev.filter((t) => t.id !== id));
    if (themeId === id) setThemeId("classic");
  };

  const getNoteColorStyle = (color: string) =>
    getNoteColor(color, themeId, activeStyles.isDark);

  const getSecurityStyles = () => {
    if (!activeStyles.isDark) return SECURITY_STYLES.classic;
    return SECURITY_STYLES.dark;
  };

  return (
    <ThemeContext.Provider
      value={{
        theme: themeId,
        setTheme: setThemeId,
        styles: activeStyles,
        customThemes,
        addCustomTheme,
        deleteCustomTheme,
        getNoteColorStyle,
        getSecurityStyles,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
};
