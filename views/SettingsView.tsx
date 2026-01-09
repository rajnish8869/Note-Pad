
import React, { useRef, useState } from 'react';
import { Icon } from '../components/Icon';
import { useTheme } from '../contexts/ThemeContext';
import { useNotes } from '../contexts/NotesContext';
import { useSecurity } from '../contexts/SecurityContext';
import { BottomSheet } from '../components/BottomSheet';

interface Props {
  onBack: () => void;
  onSetupSecurity: () => void;
}

export const SettingsView: React.FC<Props> = ({ onBack, onSetupSecurity }) => {
  const { theme, setTheme, styles, customThemes, addCustomTheme, deleteCustomTheme } = useTheme();
  const { isIncognito, toggleIncognito, exportData, importData } = useNotes();
  const { isAppLockEnabled, toggleAppLock, hasSecuritySetup } = useSecurity();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Custom Theme Builder State
  const [showThemeBuilder, setShowThemeBuilder] = useState(false);
  const [newThemeName, setNewThemeName] = useState('');
  const [newThemeBase, setNewThemeBase] = useState<'light'|'dim'|'dark'>('dark');
  const [newThemeAccent, setNewThemeAccent] = useState('blue');
  
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

  const saveNewTheme = () => {
      if (!newThemeName.trim()) {
          alert("Please enter a theme name");
          return;
      }
      addCustomTheme(newThemeName, newThemeBase, newThemeAccent);
      setShowThemeBuilder(false);
      setNewThemeName('');
  };

  // Helper for Toggle Switch
  const Toggle = ({ checked }: { checked: boolean }) => (
    <div className={`w-11 h-6 rounded-full relative transition-colors duration-200 ${checked ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-200 ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </div>
  );

  const ThemeCard = ({ id, label, icon, bgClass, active, onDelete }: any) => (
      <button 
        onClick={() => setTheme(id)}
        className={`relative p-3 rounded-2xl flex flex-col items-center gap-2 transition-all border ${active ? 'border-blue-500 bg-blue-500/5 ring-1 ring-blue-500/20' : `border-transparent hover:bg-black/5 dark:hover:bg-white/5`}`}
      >
        <div className={`w-12 h-12 rounded-full shadow-sm flex items-center justify-center ${bgClass} border border-black/10 dark:border-white/10`}>
            <Icon name={icon} size={20} className="text-white mix-blend-overlay opacity-90" />
        </div>
        <div className="flex items-center gap-1">
             <span className={`text-xs font-medium truncate max-w-[80px] ${active ? 'text-blue-500' : styles.text}`}>{label}</span>
             {active && <Icon name="check" size={12} className="text-blue-500" />}
        </div>
        {onDelete && (
            <div 
                onClick={(e) => { e.stopPropagation(); onDelete(id); }}
                className="absolute top-1 right-1 p-1 rounded-full bg-red-500 text-white shadow-sm"
            >
                <Icon name="x" size={10} />
            </div>
        )}
      </button>
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
                <div className={`absolute top-0 left-0 w-full h-24 opacity-10 bg-gradient-to-b from-blue-500 to-transparent`} />
            </div>
        </div>

        {/* Themes Section */}
        <div className="mt-2">
            <div className="px-6 mb-3 flex justify-between items-center">
                 <h3 className={`text-xs font-bold uppercase tracking-wider opacity-60 ${styles.text}`}>Themes</h3>
                 <button onClick={() => setShowThemeBuilder(true)} className={`text-xs font-bold ${styles.primaryText}`}>+ Custom</button>
            </div>
            
            <div className={`mx-4 p-4 rounded-3xl border ${styles.cardBase} ${styles.cardBorder}`}>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                     {/* Preset Themes */}
                     {[
                         { id: 'classic', label: 'Classic', icon: 'sun', bg: 'bg-gray-200' },
                         { id: 'dark', label: 'Dark', icon: 'moon', bg: 'bg-gray-800' },
                         { id: 'midnight', label: 'Midnight', icon: 'moon', bg: 'bg-black' },
                         { id: 'neo-glass', label: 'Neo', icon: 'grid', bg: 'bg-gradient-to-br from-indigo-500 to-pink-500' },
                         { id: 'vision', label: 'Vision', icon: 'eye', bg: 'bg-[#0B132B]' },
                         { id: 'ocean', label: 'Ocean', icon: 'cloud', bg: 'bg-[#0f172a]' },
                         { id: 'forest', label: 'Forest', icon: 'image', bg: 'bg-[#051a10]' },
                         { id: 'sunset', label: 'Sunset', icon: 'sun', bg: 'bg-[#2a1b1b]' },
                         { id: 'coffee', label: 'Coffee', icon: 'fileText', bg: 'bg-[#1c1917]' },
                         { id: 'lavender', label: 'Lavender', icon: 'star', bg: 'bg-[#1e1b2e]' },
                     ].map(t => (
                        <ThemeCard key={t.id} {...t} active={theme === t.id} />
                     ))}
                     
                     {/* Custom Themes */}
                     {customThemes.map(t => (
                         <ThemeCard 
                            key={t.id} 
                            id={t.id} 
                            label={t.name} 
                            icon="palette" 
                            bg={`bg-${t.accent}-500`} // Approximation
                            active={theme === t.id}
                            onDelete={deleteCustomTheme}
                         />
                     ))}
                </div>
            </div>
        </div>

        {/* Data Management */}
        <div className="mt-6">
            <h3 className={`px-6 mb-2 text-xs font-bold uppercase tracking-wider opacity-60 ${styles.text}`}>Data</h3>
            <div className={`mx-4 rounded-3xl overflow-hidden border ${styles.cardBase} ${styles.cardBorder}`}>
                <div className="grid grid-cols-2 divide-x dark:divide-gray-800 border-gray-100">
                    <button onClick={() => exportData()} className={`p-6 flex flex-col items-center gap-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors`}>
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400`}><Icon name="share" size={24} /></div>
                        <span className={`text-sm font-medium ${styles.text}`}>Export</span>
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} className={`p-6 flex flex-col items-center gap-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors`}>
                         <input type="file" ref={fileInputRef} accept=".json" className="hidden" onChange={handleFileImport} />
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400`}><Icon name="save" size={24} /></div>
                        <span className={`text-sm font-medium ${styles.text}`}>Import</span>
                    </button>
                </div>
            </div>
        </div>

        {/* Security & Privacy */}
        <div className="mt-6">
            <h3 className={`px-6 mb-2 text-xs font-bold uppercase tracking-wider opacity-60 ${styles.text}`}>Privacy</h3>
            <div className={`mx-4 rounded-3xl overflow-hidden border divide-y ${styles.cardBase} ${styles.cardBorder} ${styles.divider}`}>
                <div onClick={hasSecuritySetup ? () => toggleAppLock(!isAppLockEnabled) : onSetupSecurity} className="p-4 flex items-center justify-between cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-xl ${styles.tagBg}`}><Icon name="lock" size={20} className={styles.text} /></div>
                        <div>
                            <div className={`font-semibold text-sm ${styles.text}`}>App Lock</div>
                            <div className={`text-xs opacity-70 ${styles.secondaryText}`}>{hasSecuritySetup ? "Require PIN on launch" : "Setup PIN"}</div>
                        </div>
                    </div>
                    <Toggle checked={isAppLockEnabled} />
                </div>
                <div onClick={() => toggleIncognito(!isIncognito)} className="p-4 flex items-center justify-between cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-xl ${isIncognito ? 'bg-purple-100 dark:bg-purple-900/30' : styles.tagBg}`}><Icon name="incognito" size={20} className={isIncognito ? 'text-purple-600 dark:text-purple-400' : styles.text} /></div>
                        <div>
                            <div className={`font-semibold text-sm ${styles.text}`}>Incognito Mode</div>
                            <div className={`text-xs opacity-70 ${styles.secondaryText}`}>Don't save new notes</div>
                        </div>
                    </div>
                    <Toggle checked={isIncognito} />
                </div>
            </div>
        </div>

        {/* Footer */}
        <div className="mt-8 mb-4 text-center">
            <h4 className={`font-bold ${styles.text}`}>CloudPad</h4>
            <p className={`text-xs opacity-50 ${styles.secondaryText}`}>Version 1.1.0</p>
        </div>
      </div>

      {/* --- Custom Theme Builder Modal --- */}
      <BottomSheet isOpen={showThemeBuilder} onClose={() => setShowThemeBuilder(false)} title="Create Theme">
          <div className="space-y-6 pb-6">
              
              {/* Name Input */}
              <div>
                  <label className={`text-xs font-bold uppercase tracking-wider opacity-60 mb-2 block ${styles.text}`}>Theme Name</label>
                  <input 
                    type="text" 
                    value={newThemeName}
                    onChange={(e) => setNewThemeName(e.target.value)}
                    placeholder="My Awesome Theme"
                    className={`w-full p-3 rounded-xl border outline-none ${styles.input} ${styles.inputText}`}
                  />
              </div>

              {/* Base Selection */}
              <div>
                  <label className={`text-xs font-bold uppercase tracking-wider opacity-60 mb-2 block ${styles.text}`}>Base Style</label>
                  <div className="grid grid-cols-3 gap-2">
                      {['light', 'dim', 'dark'].map((b) => (
                          <button 
                            key={b}
                            onClick={() => setNewThemeBase(b as any)}
                            className={`p-3 rounded-xl border font-medium capitalize transition-all ${newThemeBase === b ? `border-blue-500 bg-blue-500/10 text-blue-500` : `${styles.cardBase} border-transparent ${styles.text}`}`}
                          >
                              {b}
                          </button>
                      ))}
                  </div>
              </div>

              {/* Accent Selection */}
              <div>
                  <label className={`text-xs font-bold uppercase tracking-wider opacity-60 mb-2 block ${styles.text}`}>Accent Color</label>
                  <div className="grid grid-cols-6 gap-3">
                      {['blue', 'red', 'green', 'purple', 'orange', 'pink', 'teal', 'yellow', 'indigo', 'rose', 'cyan', 'lime'].map(c => (
                          <button 
                            key={c}
                            onClick={() => setNewThemeAccent(c)}
                            className={`w-10 h-10 rounded-full transition-transform active:scale-90 border-2 ${newThemeAccent === c ? 'border-white ring-2 ring-blue-500 scale-110' : 'border-transparent'} bg-${c}-500`}
                          />
                      ))}
                  </div>
              </div>

              {/* Preview Box */}
              <div className={`p-4 rounded-xl border ${styles.divider} ${newThemeBase === 'light' ? 'bg-gray-50' : (newThemeBase === 'dim' ? 'bg-gray-800' : 'bg-black')}`}>
                  <div className="flex items-center gap-2 mb-2">
                      <div className={`w-3 h-3 rounded-full bg-${newThemeAccent}-500`}></div>
                      <span className={`text-xs font-bold ${newThemeBase === 'light' ? 'text-gray-900' : 'text-white'}`}>Preview</span>
                  </div>
                  <div className={`h-2 w-2/3 rounded-full mb-2 bg-${newThemeAccent}-500/20`}></div>
                  <div className={`h-2 w-1/2 rounded-full bg-${newThemeAccent}-500/10`}></div>
              </div>

              <button 
                onClick={saveNewTheme}
                className={`w-full py-4 rounded-xl font-bold text-white shadow-lg bg-${newThemeAccent}-600 hover:opacity-90 transition-opacity`}
              >
                  Save Theme
              </button>
          </div>
      </BottomSheet>
    </div>
  );
};
