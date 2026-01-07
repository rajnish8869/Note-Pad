import React from 'react';
import { Icon } from './Icon';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
    onSelectGlobal: () => void;
    onSelectCustom: () => void;
    onCancel: () => void;
    hasGlobalSecurity: boolean;
}

export const LockSelectionModal: React.FC<Props> = ({ onSelectGlobal, onSelectCustom, onCancel, hasGlobalSecurity }) => {
    const { styles } = useTheme();
    
    return (
        <div className={`fixed inset-0 z-[60] flex items-center justify-center ${styles.modalOverlay} p-4 animate-slide-in`} onClick={onCancel}>
            <div className={`w-full max-w-sm rounded-2xl p-6 shadow-2xl scale-100 ${styles.cardBase} ${styles.cardBorder} border`} onClick={e => e.stopPropagation()}>
                <h3 className={`text-lg font-bold mb-2 ${styles.text}`}>Lock Note</h3>
                <p className={`text-sm mb-6 ${styles.secondaryText}`}>Choose how you want to secure this note.</p>
                
                <div className="space-y-3">
                    <button onClick={onSelectGlobal} className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${styles.buttonSecondary} border-transparent`}>
                        <div className={`p-3 rounded-full ${styles.primaryBg} ${styles.primaryText}`}>
                            <Icon name="lock" size={24} />
                        </div>
                        <div className="text-left flex-1">
                            <div className={`font-semibold ${styles.text}`}>Global PIN</div>
                            <div className={`text-xs ${styles.secondaryText}`}>{hasGlobalSecurity ? "Use your main app PIN" : "Setup main PIN first"}</div>
                        </div>
                        {!hasGlobalSecurity && <Icon name="arrowLeft" size={16} className={`rotate-180 opacity-50 ${styles.text}`} />}
                    </button>

                    <button onClick={onSelectCustom} className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${styles.buttonSecondary} border-transparent`}>
                        <div className={`p-3 rounded-full ${styles.tagBg} ${styles.secondaryText}`}>
                            <Icon name="fingerprint" size={24} />
                        </div>
                        <div className="text-left flex-1">
                            <div className={`font-semibold ${styles.text}`}>Custom PIN</div>
                            <div className={`text-xs ${styles.secondaryText}`}>Unique PIN for this note</div>
                        </div>
                    </button>
                </div>

                <button onClick={onCancel} className={`mt-6 w-full py-3 rounded-xl font-medium ${styles.text} hover:opacity-70`}>Cancel</button>
            </div>
        </div>
    );
};