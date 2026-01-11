import React from "react";
import { Icon } from "./Icon";
import { useTheme } from "../contexts/ThemeContext";

interface FABProps {
  onClick: () => void;
}

export const FAB: React.FC<FABProps> = ({ onClick }) => {
  const { theme, styles } = useTheme();

  const handleClick = () => {
    if (navigator.vibrate) navigator.vibrate(15);
    onClick();
  };

  return (
    <button
      onClick={handleClick}
      className={`fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] right-6 w-14 h-14 rounded-2xl flex items-center justify-center active:scale-95 transition-all z-30 focus:outline-none ring-offset-2 ${styles.primaryRing} ${styles.fab}`}
      aria-label="Create Note"
    >
      <Icon name="plus" size={28} />
    </button>
  );
};
