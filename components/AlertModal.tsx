import React from "react";
import { useTheme } from "../contexts/ThemeContext";

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
}

export const AlertModal: React.FC<AlertModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
}) => {
  const { styles } = useTheme();

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center ${styles.modalOverlay} p-6 animate-slide-in`}
      onClick={onClose}
    >
      <div
        className={`w-full max-w-xs rounded-3xl p-6 shadow-2xl transform scale-100 transition-all ${styles.cardBase} ${styles.cardBorder} border`}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className={`text-xl font-bold mb-2 ${styles.text}`}>{title}</h3>
        <p
          className={`text-sm mb-6 leading-relaxed opacity-80 ${styles.secondaryText}`}
        >
          {message}
        </p>
        <button
          onClick={onClose}
          className={`w-full py-3.5 rounded-xl font-bold text-sm shadow-lg active:scale-95 transition-all ${styles.primaryBg} ${styles.primaryText}`}
        >
          OK
        </button>
      </div>
    </div>
  );
};
