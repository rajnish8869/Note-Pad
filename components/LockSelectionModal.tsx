import React from "react";
import { Icon } from "./Icon";
import { useTheme } from "../contexts/ThemeContext";

interface Props {
  onSelectGlobal: () => void;
  onSelectCustom: () => void;
  onCancel: () => void;
  hasGlobalSecurity: boolean;
}

export const LockSelectionModal: React.FC<Props> = ({
  onSelectGlobal,
  onSelectCustom,
  onCancel,
  hasGlobalSecurity,
}) => {
  const { styles } = useTheme();

  return (
    <div
      className={`fixed inset-0 z-[60] flex items-center justify-center ${styles.modalOverlay} p-6 animate-slide-in`}
      onClick={onCancel}
    >
      <div
        className={`w-full max-w-sm rounded-3xl p-6 shadow-2xl scale-100 ${styles.cardBase} ${styles.cardBorder} border transition-all`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div
            className={`w-16 h-16 rounded-full mb-4 flex items-center justify-center ${styles.primaryBg} ${styles.primaryText} shadow-lg ring-4 ${styles.cardBase} ring-opacity-50`}
          >
            <Icon name="shield" size={32} />
          </div>
          <h3 className={`text-xl font-bold ${styles.text}`}>Secure Note</h3>
          <p className={`text-sm mt-1 opacity-60 ${styles.secondaryText}`}>
            Choose a protection method
          </p>
        </div>

        {/* Options */}
        <div className="space-y-3">
          <button
            onClick={onSelectGlobal}
            className={`w-full group relative flex items-center gap-4 p-4 rounded-2xl border transition-all duration-200 active:scale-95 ${styles.buttonSecondary} border-transparent hover:border-gray-300 dark:hover:border-gray-600`}
          >
            <div
              className={`p-3.5 rounded-xl transition-colors ${styles.primaryBg} ${styles.primaryText} group-hover:scale-110 duration-200`}
            >
              <Icon name="lock" size={24} />
            </div>
            <div className="text-left flex-1">
              <div className={`font-bold text-sm ${styles.text}`}>
                Global PIN
              </div>
              <div
                className={`text-xs mt-0.5 opacity-70 ${styles.secondaryText}`}
              >
                {hasGlobalSecurity ? "Use main app PIN" : "Setup required"}
              </div>
            </div>
            {!hasGlobalSecurity && (
              <div
                className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${styles.dangerBg} ${styles.dangerText}`}
              >
                Setup
              </div>
            )}
            {hasGlobalSecurity && (
              <Icon
                name="check"
                size={18}
                className={`opacity-0 group-hover:opacity-100 transition-opacity ${styles.primaryText}`}
              />
            )}
          </button>

          <button
            onClick={onSelectCustom}
            className={`w-full group relative flex items-center gap-4 p-4 rounded-2xl border transition-all duration-200 active:scale-95 ${styles.buttonSecondary} border-transparent hover:border-gray-300 dark:hover:border-gray-600`}
          >
            <div
              className={`p-3.5 rounded-xl transition-colors ${styles.tagBg} ${styles.text} group-hover:scale-110 duration-200`}
            >
              <Icon name="key" size={24} />
            </div>
            <div className="text-left flex-1">
              <div className={`font-bold text-sm ${styles.text}`}>
                Custom PIN
              </div>
              <div
                className={`text-xs mt-0.5 opacity-70 ${styles.secondaryText}`}
              >
                Unique code for this note
              </div>
            </div>
            <Icon
              name="moreHorizontal"
              size={18}
              className={`opacity-0 group-hover:opacity-100 transition-opacity ${styles.secondaryText}`}
            />
          </button>
        </div>

        {/* Footer */}
        <button
          onClick={onCancel}
          className={`mt-8 w-full py-4 rounded-xl text-sm font-bold tracking-wide uppercase opacity-60 hover:opacity-100 transition-opacity ${styles.text}`}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
