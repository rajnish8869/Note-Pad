import React from 'react';
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
  const { user, login, logout, isSyncing, sync, isIncognito, toggleIncognito } = useNotes();
  const { isAppLocked, isAppLockEnabled, toggleAppLock, hasSecuritySetup } = useSecurity();
  
  return (
    <div className={`fixed inset-0 z-50 flex flex-col ${styles.bg} animate-slide-in`}>
      <div className={`flex items-center gap-4 p-4 pt-[calc(1rem+env(safe-area-inset-top))] ${styles.header}`}>
        <button onClick={onBack} className={`p-2 rounded-full ${styles.iconHover} ${styles.text}`}>
           <Icon name="arrowLeft" size={24} />
        </button>
        <h1 className={`text-xl font-bold ${styles.text}`}>Settings</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-[calc(2rem+env(safe-area-inset-bottom))]">
        <section>
          <h2 className={`text-xs font-bold uppercase tracking-wider mb-3 px-2 ${styles.secondaryText}`}>Account</h2>
          <div className={`rounded-2xl p-4 border ${styles.cardBase} ${styles.cardBorder}`}>
             <div className="flex items-center gap-4 mb-4">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center overflow-hidden ${styles.tagBg} ${styles.secondaryText}`}>
                   {user?.imageUrl ? <img src={user.imageUrl} className="w-full h-full object-cover" /> : <Icon name="user" size={32} />}
                </div>
                <div>
                   <div className={`font-bold text-lg ${styles.text}`}>{user?.name || "Guest"}</div>
                   <div className={`text-sm ${styles.secondaryText}`}>{user?.email || "Not signed in"}</div>
                </div>
             </div>
             
             {user ? (
               <button onClick={logout} className={`w-full py-3 rounded-xl border ${styles.dangerText} border-red-500/30 ${styles.dangerBg} font-medium transition-colors`}>Sign Out</button>
             ) : (
               <button onClick={login} className={`w-full py-3 rounded-xl font-medium ${styles.fab} text-white`}>Sign In with Google</button>
             )}
          </div>
        </section>

        <section>
          <h2 className={`text-xs font-bold uppercase tracking-wider mb-3 px-2 ${styles.secondaryText}`}>Appearance</h2>
          <div className={`rounded-2xl p-4 border ${styles.cardBase} ${styles.cardBorder}`}>
             <div className="grid grid-cols-2 gap-3">
                 {['classic', 'dark', 'neo-glass', 'vision'].map(t => (
                     <button key={t} onClick={() => setTheme(t as any)} className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-2 ${theme === t ? `${styles.primaryBg} ${styles.primaryText} border-blue-500/50` : `${styles.buttonSecondary} border-transparent`}`}>
                        <span className={`text-sm font-medium ${theme === t ? styles.primaryText : styles.text}`}>{t.charAt(0).toUpperCase() + t.slice(1)}</span>
                     </button>
                 ))}
             </div>
          </div>
        </section>

        <section>
          <h2 className={`text-xs font-bold uppercase tracking-wider mb-3 px-2 ${styles.secondaryText}`}>Security</h2>
          <div className={`rounded-2xl overflow-hidden border ${styles.cardBase} ${styles.cardBorder}`}>
             <div onClick={hasSecuritySetup ? () => toggleAppLock(!isAppLockEnabled) : onSetupSecurity} className={`p-4 flex items-center justify-between cursor-pointer border-b ${styles.divider}`}>
                <div className="flex items-center gap-3">
                   <div className={`p-2 rounded-lg ${styles.primaryBg} ${styles.primaryText}`}><Icon name="lock" size={20} /></div>
                   <div>
                      <div className={`font-medium ${styles.text}`}>App Lock</div>
                      <div className={`text-xs ${styles.secondaryText}`}>Require PIN to open app</div>
                   </div>
                </div>
                <div className={`w-12 h-6 rounded-full relative transition-colors ${isAppLockEnabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-700'}`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${isAppLockEnabled ? 'left-7' : 'left-1'}`} />
                </div>
             </div>
             <div onClick={() => toggleIncognito(!isIncognito)} className={`p-4 flex items-center justify-between cursor-pointer`}>
                <div className="flex items-center gap-3">
                   <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500"><Icon name="incognito" size={20} /></div>
                   <div>
                      <div className={`font-medium ${styles.text}`}>Incognito Mode</div>
                      <div className={`text-xs ${styles.secondaryText}`}>Don't save notes</div>
                   </div>
                </div>
                <div className={`w-12 h-6 rounded-full relative transition-colors ${isIncognito ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-700'}`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${isIncognito ? 'left-7' : 'left-1'}`} />
                </div>
             </div>
          </div>
        </section>
        
        <section>
          <h2 className={`text-xs font-bold uppercase tracking-wider mb-3 px-2 ${styles.secondaryText}`}>Data</h2>
          <div className={`rounded-2xl p-4 border ${styles.cardBase} ${styles.cardBorder}`}>
              <button onClick={sync} disabled={isSyncing || isIncognito} className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors ${isIncognito ? 'opacity-50' : styles.iconHover}`}>
                 <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${styles.successText} bg-green-500/10`}><Icon name={isSyncing ? "refresh" : "cloud"} size={20} className={isSyncing ? "animate-spin" : ""} /></div>
                    <div className="text-left">
                       <div className={`font-medium ${styles.text}`}>Sync with Drive</div>
                       <div className={`text-xs ${styles.secondaryText}`}>{isSyncing ? "Syncing..." : "Tap to sync now"}</div>
                    </div>
                 </div>
              </button>
          </div>
        </section>
      </div>
    </div>
  );
};