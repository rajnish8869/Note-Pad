import React, { useEffect, useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Icon } from './Icon';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({ isOpen, onClose, title, children }) => {
  const { styles } = useTheme();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      document.body.style.overflow = 'hidden';
    } else {
      const timer = setTimeout(() => setVisible(false), 300); // Wait for animation
      document.body.style.overflow = '';
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!visible && !isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 z-50 transition-opacity duration-300 ${styles.modalOverlay} ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      
      {/* Sheet */}
      <div 
        className={`fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl border-t shadow-2xl transform transition-transform duration-300 ease-out pb-[env(safe-area-inset-bottom)] ${styles.cardBase} ${styles.cardBorder} ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
        style={{ maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
      >
        <div className="flex flex-col flex-1 min-h-0">
          {/* Handle Bar */}
          <div className="w-full flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing flex-shrink-0" onClick={onClose}>
             <div className="w-12 h-1.5 rounded-full bg-gray-300 dark:bg-gray-700 opacity-50" />
          </div>

          {/* Header */}
          {title && (
             <div className="px-6 pb-2 flex-shrink-0">
                 <h3 className={`text-lg font-bold ${styles.text}`}>{title}</h3>
             </div>
          )}

          {/* Content Scroll Area */}
          <div className="overflow-y-auto px-4 pb-6 flex-1">
             {children}
          </div>
        </div>
      </div>
    </>
  );
};