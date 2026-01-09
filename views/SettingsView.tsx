
import React, { useRef } from 'react';
import { Icon } from '../components/Icon';
import { useTheme } from '../contexts/ThemeContext';
import { useNotes } from '../contexts/NotesContext';
import { useSecurity } from '../contexts/SecurityContext';

interface Props {
  onBack: () => void;
  onSetupSecurity: () => void;
}

export const SettingsView: React.FC<Props> = ({ onBack, onSetupSecurity }) => {
  const { theme, setTheme, styles } = useTheme();
  const { isIncognito, toggleIncognito, exportData, importData } = useNotes();
  const { isAppLockEnabled, toggleAppLock, hasSecuritySetup } = useSecurity();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (e) => {
          const content = e.target?.result as string;
          try {
              await importData(content);
              alert("Backup imported successfully!");
          } catch (err) {
              alert("Failed to import backup. Please ensure it is a valid JSON file.");
          }
      };
      reader.readAsText(file);
      // Reset input
      if(fileInputRef.current) fileInputRef.current.value = "";
  };

  // Helper for Toggle Switch
  const Toggle = ({ checked }: { checked: boolean }) => (
    <div className={`w-11 h-6 rounded-full relative transition-colors duration-200 ${checked ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-200 ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </div>
  );

  return (
    <div className={`fixed inset-0 z-50 flex flex-col ${styles.bg} animate-slide-in`}>
      {/* Header */}
      <div className={`flex items-center gap-4 p-4 pt-[calc(1rem+env(safe-area-inset-top))] ${styles.header}`}>
        <button onClick={onBack} className={`p-2 rounded-full ${styles.iconHover} ${styles.text}`}>
           <Icon name="arrowLeft" size={24} />
        </button>
        <h1 className={`text-xl font-bold ${styles.text}`}>Settings</h1>
      </div>

      <div className="flex-1 overflow-y-auto pb-[calc(2rem+env(safe-area-inset-bottom))]">
        
        {/* Profile Card (Local) */}
        <div className="p-4">
            <div className={`rounded-3xl p-6 border shadow-sm relative overflow-hidden ${styles.cardBase} ${styles.cardBorder}`}>
                <div className="relative z-10 flex flex-col items-center text-center">
                    <div className={`w-20 h-20 rounded-full mb-4 flex items-center justify-center overflow-hidden border-4 ${styles.cardBase} ${styles.cardBorder} shadow-lg`}>
                        <div className={`w-full h-full flex items-center justify-center ${styles.tagBg}`}>
                            <Icon name="user" size={32} className={styles.secondaryText} />
                        </div>
                    </div>
                    <h2 className={`text-lg font-bold ${styles.text}`}>Local Account</h2>
                    <p className={`text-sm ${styles.secondaryText}`}>Notes are stored on your device</p>
                </div>
                {/* Decorative Background Elements */}
                <div className={`absolute top-0 left-0 w-full h-24 opacity-10 ${theme === 'neo-glass' ? 'bg-white' : 'bg-blue-500'}`} />
            </div>
        </div>

        {/* Data Management (Import/Export) */}
        <div className="mt-2">
            <h3 className={`px-6 mb-2 text-xs font-bold uppercase tracking-wider opacity-60 ${styles.text}`}>Backup & Restore</h3>
            <div className={`mx-4 rounded-3xl overflow-hidden border ${styles.cardBase} ${styles.cardBorder}`}>
                <div className="grid grid-cols-2 divide-x dark:divide-gray-800 border-gray-100">
                    <button 
                        onClick={() => exportData()}
                        className={`p-6 flex flex-col items-center gap-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors`}
                    >
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400`}>
                            <Icon name="share" size={24} />
                        </div>
                        <span className={`text-sm font-medium ${styles.text}`}>Export Data</span>
                    </button>
                    
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className={`p-6 flex flex-col items-center gap-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors`}
                    >
                         <input 
                            type="file" 
                            ref={fileInputRef} 
                            accept=".json" 
                            className="hidden" 
                            onChange={handleFileImport}
                        />
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400`}>
                            <Icon name="save" size={24} />
                        </div>
                        <span className={`text-sm font-medium ${styles.text}`}>Import Data</span>
                    </button>
                </div>
            </div>
        </div>

        {/* Appearance */}
        <div className="mt-6">
            <h3 className={`px-6 mb-2 text-xs font-bold uppercase tracking-wider opacity-60 ${styles.text}`}>Appearance</h3>
            <div className={`mx-4 rounded-3xl overflow-hidden border ${styles.cardBase} ${styles.cardBorder}`}>
                <div className="grid grid-cols-2 sm:grid-cols-2 divide-x divide-y dark:divide-gray-800 border-gray-100">
                     {[
                         { id: 'classic', label: 'Classic', icon: 'sun', bg: 'bg-gray-100' },
                         { id: 'dark', label: 'Dark', icon: 'moon', bg: 'bg-gray-900' },
                         { id: 'neo-glass', label: 'Neo', icon: 'grid', bg: 'bg-gradient-to-br from-indigo-500 to-pink-500' },
                         { id: 'vision', label: 'Vision', icon: 'eyeOff', bg: 'bg-[#0B132B]' }
                     ].map((t: any) => (
                        <button 
                            key={t.id}
                            onClick={() => setTheme(t.id)}
                            className={`p-4 flex flex-col items-center gap-3 transition-colors ${theme === t.id ? 'bg-blue-500/5' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
                        >
                            <div className={`w-10 h-10 rounded-full shadow-sm border border-black/10 flex items-center justify-center ${t.bg}`}>
                                <Icon name={t.icon} size={18} className="text-white mix-blend-overlay" />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`text-sm font-medium ${theme === t.id ? 'text-blue-600 dark:text-blue-400' : styles.text}`}>{t.label}</span>
                                {theme === t.id && <Icon name="check" size={14} className="text-blue-600 dark:text-blue-400" />}
                            </div>
                        </button>
                     ))}
                </div>
            </div>
        </div>

        {/* Security & Privacy */}
        <div className="mt-6">
            <h3 className={`px-6 mb-2 text-xs font-bold uppercase tracking-wider opacity-60 ${styles.text}`}>Privacy</h3>
            <div className={`mx-4 rounded-3xl overflow-hidden border divide-y ${styles.cardBase} ${styles.cardBorder} ${styles.divider}`}>
                
                {/* App Lock */}
                <div 
                    onClick={hasSecuritySetup ? () => toggleAppLock(!isAppLockEnabled) : onSetupSecurity}
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                    <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-xl ${styles.tagBg}`}>
                            <Icon name="lock" size={20} className={styles.text} />
                        </div>
                        <div>
                            <div className={`font-semibold text-sm ${styles.text}`}>App Lock</div>
                            <div className={`text-xs opacity-70 ${styles.secondaryText}`}>{hasSecuritySetup ? "Require PIN on launch" : "Setup PIN"}</div>
                        </div>
                    </div>
                    <Toggle checked={isAppLockEnabled} />
                </div>

                {/* Change PIN (Only if setup) */}
                {hasSecuritySetup && (
                    <div 
                        onClick={onSetupSecurity}
                        className="p-4 flex items-center justify-between cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    >
                         <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-xl ${styles.tagBg}`}>
                                <Icon name="shield" size={20} className={styles.text} />
                            </div>
                            <div className={`font-semibold text-sm ${styles.text}`}>Change PIN</div>
                        </div>
                        <Icon name="chevronDown" size={16} className={`-rotate-90 opacity-30 ${styles.text}`} />
                    </div>
                )}

                {/* Incognito */}
                <div 
                    onClick={() => toggleIncognito(!isIncognito)}
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                    <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-xl ${isIncognito ? 'bg-purple-100 dark:bg-purple-900/30' : styles.tagBg}`}>
                            <Icon name="incognito" size={20} className={isIncognito ? 'text-purple-600 dark:text-purple-400' : styles.text} />
                        </div>
                        <div>
                            <div className={`font-semibold text-sm ${styles.text}`}>Incognito Mode</div>
                            <div className={`text-xs opacity-70 ${styles.secondaryText}`}>Don't save new notes</div>
                        </div>
                    </div>
                    <Toggle checked={isIncognito} />
                </div>

            </div>
        </div>

        {/* About / Footer */}
        <div className="mt-8 mb-4 text-center">
            <div className={`w-12 h-12 mx-auto mb-3 rounded-2xl flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg text-white`}>
                <Icon name="cloud" size={24} />
            </div>
            <h4 className={`font-bold ${styles.text}`}>CloudPad</h4>
            <p className={`text-xs opacity-50 ${styles.secondaryText}`}>Version 1.0.3 • Local Storage Only</p>
        </div>

      </div>
    </div>
  );
};
