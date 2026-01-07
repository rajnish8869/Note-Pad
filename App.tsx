import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Icon } from './components/Icon';
import { Note, Theme, ViewState, UserProfile, Folder, EncryptedData, NoteSecurity } from './types';
import { DriveService } from './services/DriveService';
import { SecurityService } from './services/SecurityService';

import { App as CapacitorApp } from '@capacitor/app';
import { NativeBiometric } from '@capgo/capacitor-native-biometric';

// --- Theme Configurations ---

const THEME_STYLES: Record<Theme, {
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
}> = {
  classic: {
    bg: 'bg-gray-50',
    text: 'text-gray-900',
    secondaryText: 'text-gray-500',
    cardBase: 'bg-white',
    cardBorder: 'border-transparent',
    header: 'bg-white/90 backdrop-blur-md border-b border-gray-100',
    drawer: 'bg-white',
    searchBar: 'bg-gray-100',
    searchBarText: 'text-gray-900',
    searchBarPlaceholder: 'placeholder-gray-500',
    iconHover: 'hover:bg-gray-200',
    fab: 'bg-blue-600 hover:bg-blue-700 text-white shadow-xl',
  },
  dark: {
    bg: 'bg-[#121212]',
    text: 'text-gray-100',
    secondaryText: 'text-gray-400',
    cardBase: 'bg-[#1e1e1e]',
    cardBorder: 'border-gray-800',
    header: 'bg-[#1e1e1e]/90 backdrop-blur-md border-b border-gray-800',
    drawer: 'bg-[#1e1e1e]',
    searchBar: 'bg-[#2c2c2c]',
    searchBarText: 'text-gray-100',
    searchBarPlaceholder: 'placeholder-gray-500',
    iconHover: 'hover:bg-gray-700',
    fab: 'bg-blue-500 hover:bg-blue-600 text-white shadow-xl shadow-black/30',
  },
  'neo-glass': {
    // Fixed: Removed 'fixed inset-0' to allow scrolling, used bg-fixed for the gradient
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
  },
  vision: {
    bg: 'bg-[#0B132B]',
    text: 'text-[#E6ECF5]',
    secondaryText: 'text-[#C9D2E3]',
    cardBase: 'bg-[#182545]',
    cardBorder: 'border-[#1F2C4D]', // Button outlines color
    header: 'bg-[#0B132B]/90 backdrop-blur-md border-b border-[#1F2C4D]',
    drawer: 'bg-[#0E1A33] border-r border-[#1F2C4D]',
    searchBar: 'bg-[#141F3A] border border-[#2A3B66]', // Search bar border
    searchBarText: 'text-[#E6ECF5]',
    searchBarPlaceholder: 'placeholder-[#9AA7C2]',
    iconHover: 'hover:bg-[#24345C]', // Inactive tabs color used for hover background
    fab: 'bg-[#2F6BFF] hover:bg-[#3B7BFF] text-white shadow-lg shadow-[#0B132B]/50', // Primary & Highlight Blue
  }
};

const SECURITY_THEME: Record<Theme, {
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
    container: "bg-gray-950",
    text: "text-white",
    subText: "text-gray-400",
    keypad: "bg-white/5 text-white active:bg-white/20",
    keypadAction: "text-white/60 hover:bg-white/10",
    dotActive: "bg-white border-white scale-110",
    dotInactive: "border-white/30 bg-transparent",
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

const NOTE_COLORS: Record<string, Record<Theme, string>> = {
  default: {
    classic: 'bg-white border-gray-200',
    dark: 'bg-[#1e1e1e] border-gray-700',
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

const COLOR_KEYS = Object.keys(NOTE_COLORS);

// --- Components ---

const FAB: React.FC<{ onClick: () => void; theme: Theme }> = ({ onClick, theme }) => (
  <button
    onClick={onClick}
    className={`fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] right-6 w-14 h-14 rounded-2xl flex items-center justify-center active:scale-95 transition-all z-30 focus:outline-none ring-offset-2 ring-primary-500 ${THEME_STYLES[theme].fab}`}
    aria-label="Create Note"
  >
    <Icon name="plus" size={28} />
  </button>
);

const NoteCard: React.FC<{ 
    note: Note; 
    onClick: () => void; 
    onPin: (e: React.MouseEvent) => void;
    onRestore?: (e: React.MouseEvent) => void;
    onDeleteForever?: (e: React.MouseEvent) => void;
    isTrashView: boolean;
    theme: Theme;
}> = ({ note, onClick, onPin, onRestore, onDeleteForever, isTrashView, theme }) => {
  const colorKey = note.color || 'default';
  const colorClass = NOTE_COLORS[colorKey][theme];
  const styles = THEME_STYLES[theme];

  // Enhanced visual style for pinned notes
  const pinnedStyle = !isTrashView && note.isPinned 
    ? (theme === 'neo-glass' 
        ? 'border-yellow-200/50 shadow-[0_0_15px_rgba(255,255,255,0.15)] bg-white/15' 
        : theme === 'vision' 
            ? 'border-[#2F6BFF] shadow-[0_0_12px_rgba(47,107,255,0.25)]'
            : 'border-primary-400/80 dark:border-primary-600 shadow-md ring-1 ring-primary-400/20')
    : '';

  const isLocked = note.isLocked || !!note.encryptedData;
  const isCustomLock = note.lockMode === 'CUSTOM';
  const isEncrypted = !!note.encryptedData;

  return (
    <div 
      onClick={onClick}
      className={`${colorClass} ${styles.text} border rounded-2xl p-4 transition-all cursor-pointer relative overflow-hidden group mb-4 break-inside-avoid hover:shadow-lg ${pinnedStyle} ${isLocked ? 'ring-1 ring-inset ring-black/5 dark:ring-white/5' : ''}`}
    >
      <div className="flex justify-between items-start mb-2">
         {/* Show title always, use placeholder if locked and empty */}
         <h3 className={`font-semibold text-lg line-clamp-2 leading-tight flex-1 pr-6 mb-1 ${(!note.title && isLocked) ? "italic opacity-50" : ""}`}>
            {note.title || (isLocked ? "Locked Note" : "Untitled")}
        </h3>
        
        {!isTrashView && note.isPinned && (
             <div className={`absolute top-0 right-0 p-2 rounded-bl-xl ${theme === 'vision' ? 'bg-[#2F6BFF] text-white' : 'bg-primary-500 text-white'}`}>
                 <Icon name="pinFilled" size={12} fill={true} />
             </div>
        )}
      </div>
      
      {isLocked ? (
        <div className={`mt-2 h-24 rounded-xl flex flex-col items-center justify-center gap-2 border-2 border-dashed transition-colors ${
             theme === 'neo-glass' 
                ? 'bg-black/10 border-white/10' 
                : (theme === 'vision' ? 'bg-[#0B132B] border-[#1F2C4D]' : 'bg-gray-50 dark:bg-black/20 border-gray-200 dark:border-gray-800')
         }`}>
           <div className={`p-2 rounded-full ${isCustomLock ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-500' : (theme === 'vision' ? 'bg-[#141F3A] text-[#2F6BFF]' : (theme === 'neo-glass' ? 'bg-white/20 text-white' : 'bg-gray-200 dark:bg-gray-800 text-gray-500'))}`}>
                <Icon name="lock" size={20} />
           </div>
           <span className={`text-[10px] uppercase font-bold tracking-widest ${isCustomLock ? 'text-purple-500' : 'text-gray-500'}`}>
                {isCustomLock ? "Private" : "Locked"}
           </span>
        </div>
      ) : (
        <p className={`text-sm line-clamp-[8] mb-3 min-h-[1.5rem] whitespace-pre-wrap ${styles.secondaryText} ${!note.title ? 'text-base pt-1' : ''}`}>
            {note.plainTextPreview || (note.title ? "" : "Empty note")}
        </p>
      )}

      {/* Tags */}
      {note.tags && note.tags.length > 0 && !isEncrypted && (
          <div className="flex flex-wrap gap-1 mb-3">
              {note.tags.slice(0, 3).map(tag => (
                  <span key={tag} className={`text-[10px] uppercase font-bold tracking-wide px-2 py-0.5 rounded ${theme === 'neo-glass' ? 'bg-white/20 text-white' : (theme === 'vision' ? 'bg-[#141F3A] text-[#7F8FB0]' : 'bg-black/5 dark:bg-white/10 text-gray-500 dark:text-gray-400')}`}>
                      {tag}
                  </span>
              ))}
              {note.tags.length > 3 && (
                   <span className={`text-[10px] self-center ${styles.secondaryText}`}>+{note.tags.length - 3}</span>
              )}
          </div>
      )}

      {/* Footer Info */}
      <div className={`flex justify-between items-center mt-2 text-[10px] ${styles.secondaryText}`}>
        <span className="flex items-center gap-1">
             {note.updatedAt > note.createdAt ? "Edited" : ""} {new Date(note.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
             {!isTrashView && note.isSynced && <Icon name="check" size={10} className={theme === 'neo-glass' ? 'text-white' : 'text-green-500 ml-1'} />}
             {note.isIncognito && <Icon name="incognito" size={12} className="ml-1 opacity-70" />}
        </span>
      </div>
      
      {!isTrashView && (
        <button 
            onClick={onPin}
            className={`absolute bottom-2 right-2 p-1.5 rounded-full transition-all ${theme === 'neo-glass' ? 'bg-white/10 hover:bg-white/20 text-white' : (theme === 'vision' ? 'bg-[#141F3A] hover:bg-[#24345C] text-[#E6ECF5]' : 'bg-black/5 dark:bg-white/10 text-gray-400 dark:text-gray-500 hover:text-primary-600')} ${note.isPinned ? 'opacity-100 text-primary-500' : 'opacity-0 group-hover:opacity-100'}`}
        >
            <Icon name={note.isPinned ? 'pinFilled' : 'pin'} size={14} fill={note.isPinned} />
        </button>
      )}

      {isTrashView && (
          <div className={`flex justify-end gap-2 mt-2 pt-2 border-t ${theme === 'neo-glass' ? 'border-white/10' : (theme === 'vision' ? 'border-[#1F2C4D]' : 'border-black/5 dark:border-white/5')}`}>
              <button 
                onClick={onRestore}
                className={`p-2 rounded-full ${theme === 'neo-glass' ? 'hover:bg-white/20 text-white' : (theme === 'vision' ? 'hover:bg-[#24345C] text-[#2F6BFF]' : 'hover:bg-green-50 dark:hover:bg-green-900/30 text-green-600')}`}
                title="Restore"
              >
                  <Icon name="restore" size={18} />
              </button>
              <button 
                onClick={onDeleteForever}
                className={`p-2 rounded-full ${theme === 'neo-glass' ? 'hover:bg-white/20 text-red-200' : (theme === 'vision' ? 'hover:bg-[#24345C] text-red-400' : 'hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600')}`}
                title="Delete Forever"
              >
                  <Icon name="trash" size={18} />
              </button>
          </div>
      )}
    </div>
  );
};

const SettingsView: React.FC<{
  onBack: () => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
  user: UserProfile | null;
  onLogin: () => void;
  onLogout: () => void;
  isSyncing: boolean;
  onSync: () => void;
  isAppLocked: boolean;
  toggleAppLock: (enabled: boolean) => void;
  hasSecuritySetup: boolean;
  onSetupSecurity: () => void;
  isIncognito: boolean;
  toggleIncognito: (enabled: boolean) => void;
}> = ({
  onBack, theme, setTheme, user, onLogin, onLogout, isSyncing, onSync,
  isAppLocked, toggleAppLock, hasSecuritySetup, onSetupSecurity, isIncognito, toggleIncognito
}) => {
  const styles = THEME_STYLES[theme];
  
  return (
    <div className={`fixed inset-0 z-50 flex flex-col ${styles.bg} animate-slide-in`}>
      {/* Header */}
      <div className={`flex items-center gap-4 p-4 pt-[calc(1rem+env(safe-area-inset-top))] ${styles.header}`}>
        <button onClick={onBack} className={`p-2 rounded-full ${styles.iconHover} ${styles.text}`}>
           <Icon name="arrowLeft" size={24} />
        </button>
        <h1 className={`text-xl font-bold ${styles.text}`}>Settings</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-[calc(2rem+env(safe-area-inset-bottom))]">
        
        {/* Account Section */}
        <section>
          <h2 className={`text-xs font-bold uppercase tracking-wider mb-3 px-2 ${styles.secondaryText}`}>Account</h2>
          <div className={`rounded-2xl p-4 border ${styles.cardBase} ${styles.cardBorder}`}>
             <div className="flex items-center gap-4 mb-4">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center overflow-hidden ${theme === 'neo-glass' ? 'bg-white/20' : 'bg-gray-200 dark:bg-gray-700'}`}>
                   {user?.imageUrl ? <img src={user.imageUrl} className="w-full h-full object-cover" /> : <Icon name="user" size={32} className={styles.secondaryText} />}
                </div>
                <div>
                   <div className={`font-bold text-lg ${styles.text}`}>{user?.name || "Guest"}</div>
                   <div className={`text-sm ${styles.secondaryText}`}>{user?.email || "Not signed in"}</div>
                </div>
             </div>
             
             {user ? (
               <button onClick={onLogout} className="w-full py-3 rounded-xl border border-red-500/30 text-red-500 font-medium hover:bg-red-500/10 transition-colors">
                  Sign Out
               </button>
             ) : (
               <button onClick={onLogin} className={`w-full py-3 rounded-xl font-medium ${theme === 'vision' ? 'bg-[#2F6BFF] text-white' : 'bg-primary-500 text-white'}`}>
                  Sign In with Google
               </button>
             )}
          </div>
        </section>

        {/* Appearance Section */}
        <section>
          <h2 className={`text-xs font-bold uppercase tracking-wider mb-3 px-2 ${styles.secondaryText}`}>Appearance</h2>
          <div className={`rounded-2xl p-4 border ${styles.cardBase} ${styles.cardBorder}`}>
             <div className="grid grid-cols-2 gap-3">
                 {(['classic', 'dark', 'neo-glass', 'vision'] as Theme[]).map(t => (
                     <button 
                        key={t}
                        onClick={() => setTheme(t)}
                        className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-2 ${theme === t ? (theme === 'vision' ? 'border-[#2F6BFF] bg-[#2F6BFF]/10' : 'border-primary-500 bg-primary-50 dark:bg-primary-900/20') : 'border-transparent hover:bg-black/5 dark:hover:bg-white/5'}`}
                     >
                        <div className={`w-full h-12 rounded-lg mb-1 border shadow-sm ${t === 'classic' ? 'bg-gray-50' : (t === 'dark' ? 'bg-[#121212]' : (t === 'neo-glass' ? 'bg-gradient-to-br from-indigo-500 to-pink-500' : 'bg-[#0B132B]'))}`}></div>
                        <span className={`text-sm font-medium ${styles.text}`}>
                          {t.charAt(0).toUpperCase() + t.slice(1).replace('-', ' ')}
                        </span>
                     </button>
                 ))}
             </div>
          </div>
        </section>

        {/* Security Section */}
        <section>
          <h2 className={`text-xs font-bold uppercase tracking-wider mb-3 px-2 ${styles.secondaryText}`}>Security & Privacy</h2>
          <div className={`rounded-2xl overflow-hidden border ${styles.cardBase} ${styles.cardBorder}`}>
             
             {/* App Lock Toggle */}
             <div onClick={hasSecuritySetup ? () => toggleAppLock(!isAppLocked) : onSetupSecurity} className={`p-4 flex items-center justify-between cursor-pointer border-b ${theme === 'neo-glass' ? 'border-white/10' : (theme === 'vision' ? 'border-[#1F2C4D]' : 'border-gray-100 dark:border-gray-800')}`}>
                <div className="flex items-center gap-3">
                   <div className={`p-2 rounded-lg ${theme === 'vision' ? 'bg-[#2F6BFF]/20 text-[#2F6BFF]' : 'bg-blue-500/10 text-blue-500'}`}>
                      <Icon name="lock" size={20} />
                   </div>
                   <div>
                      <div className={`font-medium ${styles.text}`}>App Lock</div>
                      <div className={`text-xs ${styles.secondaryText}`}>Require PIN to open app</div>
                   </div>
                </div>
                <div className={`w-12 h-6 rounded-full relative transition-colors ${isAppLocked ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-700'}`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${isAppLocked ? 'left-7' : 'left-1'}`} />
                </div>
             </div>

             {/* Incognito Toggle */}
             <div onClick={() => toggleIncognito(!isIncognito)} className={`p-4 flex items-center justify-between cursor-pointer`}>
                <div className="flex items-center gap-3">
                   <div className={`p-2 rounded-lg bg-purple-500/10 text-purple-500`}>
                      <Icon name="incognito" size={20} />
                   </div>
                   <div>
                      <div className={`font-medium ${styles.text}`}>Incognito Mode</div>
                      <div className={`text-xs ${styles.secondaryText}`}>Don't save notes to storage</div>
                   </div>
                </div>
                <div className={`w-12 h-6 rounded-full relative transition-colors ${isIncognito ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-700'}`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${isIncognito ? 'left-7' : 'left-1'}`} />
                </div>
             </div>
          </div>
        </section>

        {/* Data Section */}
        <section>
          <h2 className={`text-xs font-bold uppercase tracking-wider mb-3 px-2 ${styles.secondaryText}`}>Data & Sync</h2>
          <div className={`rounded-2xl p-4 border ${styles.cardBase} ${styles.cardBorder}`}>
              <button 
                onClick={onSync}
                disabled={isSyncing || isIncognito}
                className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors ${isIncognito ? 'opacity-50' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
              >
                 <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${theme === 'vision' ? 'bg-[#2F6BFF]/20 text-[#2F6BFF]' : 'bg-green-500/10 text-green-500'}`}>
                        <Icon name={isSyncing ? "refresh" : "cloud"} size={20} className={isSyncing ? "animate-spin" : ""} />
                    </div>
                    <div className="text-left">
                       <div className={`font-medium ${styles.text}`}>Sync with Google Drive</div>
                       <div className={`text-xs ${styles.secondaryText}`}>{isSyncing ? "Syncing..." : "Tap to sync now"}</div>
                    </div>
                 </div>
                 {!isSyncing && <Icon name="check" size={16} className="text-green-500 opacity-0" />} 
              </button>
          </div>
        </section>

        <div className={`text-center text-xs py-4 ${styles.secondaryText}`}>
           CloudPad v1.0.0
        </div>

      </div>
    </div>
  );
};

const Drawer: React.FC<{ 
  isOpen: boolean; 
  onClose: () => void; 
  theme: Theme; 
  setTheme: (t: Theme) => void;
  user: UserProfile | null;
  onLogin: () => void;
  onLogout: () => void;
  onSync: () => void;
  isSyncing: boolean;
  folders: Folder[];
  currentView: ViewState;
  currentFolderId: string | null;
  onChangeView: (view: ViewState, folderId?: string, tagName?: string) => void;
  onCreateFolder: (name: string) => void;
  tags: string[];
  isAppLocked: boolean;
  toggleAppLock: (enabled: boolean) => void;
  isIncognito: boolean;
  toggleIncognito: (enabled: boolean) => void;
  hasSecuritySetup: boolean;
  onSetupSecurity: () => void;
}> = ({ 
    isOpen, onClose, theme, setTheme, user, onLogin, onLogout, onSync, isSyncing, 
    folders, currentView, currentFolderId, onChangeView, onCreateFolder, tags,
    isAppLocked, toggleAppLock, isIncognito, toggleIncognito, hasSecuritySetup, onSetupSecurity
}) => {
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const styles = THEME_STYLES[theme];

  useEffect(() => {
    if (isCreatingFolder && inputRef.current) {
        inputRef.current.focus();
    }
  }, [isCreatingFolder]);

  const submitFolder = () => {
    if (newFolderName.trim()) {
        onCreateFolder(newFolderName.trim());
        setNewFolderName("");
        setIsCreatingFolder(false);
    }
  };

  const menuButtonClass = (isActive: boolean) => 
    `w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${isActive ? (theme === 'vision' ? 'bg-[#2F6BFF]/20 text-[#2F6BFF] font-medium' : 'bg-primary-500/10 text-primary-500 font-medium') : `${styles.text} ${styles.iconHover}`}`;

  return (
    <>
      <div 
        className={`fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      <div className={`fixed top-0 left-0 h-[100dvh] w-[280px] z-50 shadow-2xl transform transition-transform duration-300 overflow-y-auto pb-[env(safe-area-inset-bottom)] ${isOpen ? 'translate-x-0' : '-translate-x-full'} ${styles.drawer}`}>
        <div className={`p-6 pt-[calc(1.5rem+env(safe-area-inset-top))] border-b ${theme === 'neo-glass' ? 'border-white/10' : (theme === 'vision' ? 'border-[#1F2C4D]' : 'border-gray-100 dark:border-gray-800')} flex flex-col items-center`}>
          <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mb-3 overflow-hidden shadow-inner ${theme === 'neo-glass' ? 'bg-white/20 text-white' : (theme === 'vision' ? 'bg-[#141F3A] text-[#2F6BFF]' : 'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-300')}`}>
            {user?.imageUrl ? (
                <img src={user.imageUrl} alt={user.name} className="w-full h-full object-cover" />
            ) : (
                user ? user.name.charAt(0).toUpperCase() : <Icon name="user" size={32} />
            )}
          </div>
          <h2 className={`font-bold text-lg ${styles.text}`}>
            {user ? user.name : "Guest User"}
          </h2>
          <p className={`text-sm truncate w-full text-center ${styles.secondaryText}`}>
            {user ? user.email : "Sign in to sync notes"}
          </p>
        </div>
        
        <div className="p-4 space-y-1">
           {/* Standard Views */}
          <button onClick={() => onChangeView('LIST')} className={menuButtonClass(currentView === 'LIST')}>
             <Icon name="list" size={20} />
             <span>All Notes</span>
          </button>
          <button onClick={() => onChangeView('TRASH')} className={menuButtonClass(currentView === 'TRASH')}>
             <Icon name="trash" size={20} />
             <span>Trash</span>
          </button>
          
          <div className={`h-px my-2 ${theme === 'neo-glass' ? 'bg-white/10' : (theme === 'vision' ? 'bg-[#1F2C4D]' : 'bg-gray-100 dark:bg-gray-800')}`} />
          
          {/* Folders Section */}
          <div className={`flex justify-between items-center px-3 py-2 text-xs font-semibold uppercase tracking-wider ${styles.secondaryText}`}>
             <span>Folders</span>
             <button onClick={() => setIsCreatingFolder(!isCreatingFolder)} className={`p-1 rounded ${styles.iconHover}`}>
                 <Icon name={isCreatingFolder ? "x" : "plus"} size={14} />
             </button>
          </div>
          
          {isCreatingFolder && (
              <div className="px-3 py-2 flex gap-2 animate-slide-in">
                  <input 
                      ref={inputRef}
                      type="text" 
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      placeholder="Folder Name"
                      className={`flex-1 rounded px-2 py-1 text-sm outline-none ${theme === 'neo-glass' ? 'bg-white/20 text-white placeholder-white/50' : (theme === 'vision' ? 'bg-[#141F3A] text-[#E6ECF5] placeholder-[#7F8FB0]' : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100')}`}
                      onKeyDown={(e) => e.key === 'Enter' && submitFolder()}
                  />
                  <button onClick={submitFolder} className={theme === 'vision' ? 'text-[#2F6BFF]' : 'text-primary-500'}>
                      <Icon name="check" size={18} />
                  </button>
              </div>
          )}

          {folders.length === 0 && !isCreatingFolder && <p className={`text-xs px-3 italic ${styles.secondaryText}`}>No folders</p>}
          {folders.map(f => (
               <button 
                  key={f.id}
                  onClick={() => onChangeView('FOLDER', f.id)}
                  className={menuButtonClass(currentView === 'FOLDER' && currentFolderId === f.id)}
               >
                  <Icon name="folder" size={18} />
                  <span className="truncate">{f.name}</span>
               </button>
          ))}

          <div className={`h-px my-2 ${theme === 'neo-glass' ? 'bg-white/10' : (theme === 'vision' ? 'bg-[#1F2C4D]' : 'bg-gray-100 dark:bg-gray-800')}`} />

          {/* Settings Link */}
          <button 
            onClick={() => onChangeView('SETTINGS')}
            className={menuButtonClass(currentView === 'SETTINGS')}
          >
            <Icon name="settings" size={20} />
            <span>Settings</span>
          </button>
          
        </div>
      </div>
    </>
  );
};

const NoteEditor: React.FC<{ 
  note: Note; 
  onSave: (note: Note) => void; 
  onBack: () => void;
  onDelete: (id: string) => void;
  initialEditMode: boolean;
  folders: Folder[];
  theme: Theme;
  onLockToggle: () => void; // Trigger modal for lock setup/toggle
  encryptionKey: CryptoKey | null;
}> = ({ note, onSave, onBack, onDelete, initialEditMode, folders, theme, onLockToggle, encryptionKey }) => {
  const [isEditing, setIsEditing] = useState(initialEditMode);
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  // Separate state for decrypted flag to show loading
  const [isDecrypted, setIsDecrypted] = useState(!note.encryptedData);
  const [decryptionError, setDecryptionError] = useState(false);

  const [tags, setTags] = useState<string[]>(note.tags || []);
  const [color, setColor] = useState(note.color || 'default');
  const [folderId, setFolderId] = useState(note.folderId || '');
  
  const [history, setHistory] = useState<string[]>([note.content]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [newTag, setNewTag] = useState('');
  
  const contentRef = useRef<HTMLDivElement>(null);
  const [lastSaved, setLastSaved] = useState(Date.now());
  const saveTimeoutRef = useRef<any>(null);

  const styles = THEME_STYLES[theme];
  // Calculate background color for the editor itself based on theme and note color
  const noteColorClass = NOTE_COLORS[color][theme];

  // Decryption Effect
  useEffect(() => {
    const decryptContent = async () => {
      if (note.encryptedData) {
        if (!encryptionKey) {
           setDecryptionError(true);
           return;
        }
        try {
           const encryptedData: EncryptedData = JSON.parse(note.encryptedData);
           const jsonString = await SecurityService.decrypt(encryptedData, encryptionKey);
           const payload = JSON.parse(jsonString);
           setTitle(payload.title);
           setContent(payload.content);
           setIsDecrypted(true);
           setDecryptionError(false);
        } catch (e) {
           console.error("Decryption failed", e);
           setDecryptionError(true);
        }
      } else {
        setIsDecrypted(true);
      }
    };
    decryptContent();
  }, [note, encryptionKey]);

  const handleSave = useCallback(async () => {
    let plainText = note.plainTextPreview;
    if (isEditing && contentRef.current) {
         plainText = contentRef.current.innerText;
    }

    let updatedNote: Note = {
      ...note,
      title,
      content,
      plainTextPreview: plainText,
      updatedAt: Date.now(),
      isSynced: false,
      tags,
      color,
      folderId: folderId || undefined
    };

    // If note is locked or was encrypted, we must encrypt before saving
    // We use the currently active encryptionKey (derived from Global or Custom PIN)
    if (updatedNote.isLocked && encryptionKey) {
        try {
            const payload = JSON.stringify({ title, content });
            const encrypted = await SecurityService.encrypt(payload, encryptionKey);
            updatedNote.encryptedData = JSON.stringify(encrypted);
            // Clear visible content fields for security in storage
            // KEEP TITLE VISIBLE for UI
            updatedNote.title = title;
            updatedNote.content = "";
            updatedNote.plainTextPreview = "";
        } catch (e) {
            console.error("Encryption failed on save", e);
            // Fallback: don't save corrupted state
            return;
        }
    } else if (!updatedNote.isLocked) {
        // If unlocked, remove encryption data
        updatedNote.encryptedData = undefined;
        updatedNote.lockMode = undefined; // Reset mode
        updatedNote.security = undefined; // Reset security params
    }

    onSave(updatedNote);
    setLastSaved(Date.now());
  }, [note, title, content, tags, color, folderId, onSave, isEditing, encryptionKey]);

  // Auto-save logic
  useEffect(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    // Don't auto-save if we haven't decrypted yet
    if (!isDecrypted) return; 

    // Simple diff check (not perfect for objects but good enough for debouncing)
    if (title === note.title && content === note.content && JSON.stringify(tags) === JSON.stringify(note.tags) && color === note.color && folderId === (note.folderId || '')) return;

    saveTimeoutRef.current = setTimeout(() => {
      handleSave();
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [title, content, tags, color, folderId, handleSave, isDecrypted]);

  useEffect(() => {
    if (isEditing && contentRef.current && contentRef.current.innerHTML !== content) {
      const range = document.createRange();
      const selection = window.getSelection();
      contentRef.current.innerHTML = content;
      if (document.activeElement === contentRef.current) {
        range.selectNodeContents(contentRef.current);
        range.collapse(false);
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    }
  }, [content, isEditing]);

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    if (newContent !== history[historyIndex]) {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(newContent);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    }
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
        const prevContent = history[historyIndex - 1];
        setHistoryIndex(historyIndex - 1);
        setContent(prevContent);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
        const nextContent = history[historyIndex + 1];
        setHistoryIndex(historyIndex + 1);
        setContent(nextContent);
    }
  };

  const handleAddTag = () => {
      if(newTag.trim() && !tags.includes(newTag.trim())) {
          setTags([...tags, newTag.trim()]);
          setNewTag('');
      }
  };

  const handleRemoveTag = (t: string) => {
      setTags(tags.filter(tag => tag !== t));
  };

  const execCmd = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (contentRef.current) {
        handleContentChange(contentRef.current.innerHTML);
    }
  };

  const handleTripleClick = (e: React.MouseEvent) => {
    if (e.detail === 3) {
      setIsEditing(true);
    }
  };

  const editorBgClass = theme === 'neo-glass' 
    ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 bg-fixed' // Fixed: Use bg-fixed instead of fixed position
    : noteColorClass.split(' ')[0] + ' min-h-[100dvh]'; 

  // Loading/Decryption State
  if (!isDecrypted && !decryptionError) {
      return (
          <div className={`flex flex-col min-h-[100dvh] items-center justify-center ${editorBgClass}`}>
              <Icon name="shield" size={48} className="animate-bounce opacity-50 mb-4" />
              <p className={styles.text}>Decrypting secure note...</p>
          </div>
      );
  }

  if (decryptionError) {
      return (
        <div className={`flex flex-col min-h-[100dvh] items-center justify-center ${editorBgClass}`}>
             <Icon name="lock" size={48} className="text-red-500 mb-4" />
             <h2 className={`text-xl font-bold ${styles.text}`}>Authentication Required</h2>
             <p className={`mb-4 ${styles.secondaryText}`}>Unlock your secure session to view this note.</p>
             <button onClick={onBack} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg">Go Back</button>
        </div>
      );
  }

  return (
    <div className={`flex flex-col min-h-[100dvh] transition-colors duration-300 animate-slide-in relative ${editorBgClass}`}>
      {/* Editor Content Wrapper to handle Neo-glass translucency */}
      <div className={`flex flex-col flex-1 ${theme === 'neo-glass' ? 'bg-white/10 backdrop-blur-3xl' : ''}`}>
        
        {/* Toolbar */}
        <div className={`flex items-center justify-between sticky top-0 z-10 pt-[calc(0.5rem+env(safe-area-inset-top))] pb-2 px-2 md:px-4 ${theme === 'neo-glass' ? 'bg-transparent' : (theme === 'vision' ? 'bg-[#0B132B]/90 backdrop-blur-md border-b border-[#1F2C4D]' : 'bg-white/50 dark:bg-black/50 backdrop-blur-md border-b border-black/5 dark:border-white/5')}`}>
            <button onClick={() => { handleSave(); onBack(); }} className={`p-2 rounded-full ${styles.iconHover} ${styles.text}`}>
            <Icon name="arrowLeft" size={24} />
            </button>
            <div className="flex gap-2">
                {!isEditing ? (
                    <button onClick={() => setIsEditing(true)} className={`p-2 rounded-full ${styles.iconHover} ${styles.text}`}>
                        <Icon name="edit" size={20} />
                    </button>
                ) : (
                    <button onClick={() => { handleSave(); setIsEditing(false); }} className={`p-2 rounded-full hover:bg-green-500/20 text-green-500`}>
                        <Icon name="check" size={20} />
                    </button>
                )}

                {isEditing && (
                    <>
                    <button onClick={handleUndo} disabled={historyIndex === 0} className={`p-2 disabled:opacity-30 rounded-full ${styles.iconHover} ${styles.text}`}>
                        <Icon name="share" size={20} className="rotate-180 scale-x-[-1]" />
                    </button>
                    <button onClick={handleRedo} disabled={historyIndex === history.length - 1} className={`p-2 disabled:opacity-30 rounded-full ${styles.iconHover} ${styles.text}`}>
                        <Icon name="share" size={20} />
                    </button>
                    <div className={`w-px h-6 mx-2 self-center ${theme === 'neo-glass' ? 'bg-white/20' : (theme === 'vision' ? 'bg-[#2F436F]' : 'bg-gray-300 dark:bg-gray-700')}`}></div>
                    </>
                )}
                
                <button onClick={() => setShowSettings(!showSettings)} className={`p-2 rounded-full ${showSettings ? 'bg-primary-500/20 text-primary-500' : `${styles.iconHover} ${styles.text}`}`}>
                    <Icon name="moreVertical" size={20} />
                </button>
            </div>
        </div>

        {/* Settings Panel (Dropdown) */}
        {showSettings && (
            <>
            <div className="fixed inset-0 z-10 bg-black/10 backdrop-blur-sm" onClick={() => setShowSettings(false)} />
            <div className={`absolute top-16 right-4 w-72 shadow-2xl rounded-xl border z-20 p-4 animate-slide-up ${theme === 'neo-glass' ? 'bg-black/60 backdrop-blur-xl border-white/20' : (theme === 'vision' ? 'bg-[#141F3A] border-[#1F2C4D]' : 'bg-white dark:bg-dark-surface border-gray-100 dark:border-dark-border')}`}>
                <h4 className={`text-xs font-semibold mb-3 ${styles.secondaryText}`}>NOTE SETTINGS</h4>
                
                {/* Security */}
                <button 
                    onClick={onLockToggle}
                    className={`w-full flex items-center gap-2 mb-4 p-2 rounded-lg text-sm ${note.isLocked ? 'bg-red-500/10 text-red-500' : `${styles.text} hover:bg-black/5 dark:hover:bg-white/5`}`}
                >
                    <Icon name={note.isLocked ? "unlock" : "lock"} size={16} />
                    {note.isLocked ? "Unlock Note" : "Lock Note (Encrypt)"}
                </button>

                <hr className={`my-3 ${theme === 'neo-glass' ? 'border-white/10' : (theme === 'vision' ? 'border-[#1F2C4D]' : 'border-gray-100 dark:border-gray-700')}`} />

                {/* Color Picker */}
                <div className="mb-4">
                    <label className={`text-xs block mb-2 ${styles.secondaryText}`}>Background</label>
                    <div className="flex flex-wrap gap-2">
                        {COLOR_KEYS.map(c => (
                            <button 
                                key={c} 
                                onClick={() => setColor(c)}
                                className={`w-6 h-6 rounded-full border border-black/10 shadow-sm ${NOTE_COLORS[c].classic.split(' ')[0]} ${color === c ? 'ring-2 ring-primary-500 ring-offset-2 ring-offset-transparent' : ''}`}
                            />
                        ))}
                    </div>
                </div>

                {/* Folder Selector */}
                <div className="mb-4">
                    <label className={`text-xs block mb-2 ${styles.secondaryText}`}>Folder</label>
                    <select 
                        value={folderId} 
                        onChange={(e) => setFolderId(e.target.value)}
                        className={`w-full rounded-lg p-2 text-sm outline-none border ${theme === 'neo-glass' ? 'bg-white/10 text-white border-white/10' : (theme === 'vision' ? 'bg-[#0B132B] text-[#E6ECF5] border-[#2A3B66]' : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700')}`}
                    >
                        <option value="">None (All Notes)</option>
                        {folders.map(f => (
                            <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                    </select>
                </div>

                {/* Tag Manager */}
                <div className="mb-4">
                    <label className={`text-xs block mb-2 ${styles.secondaryText}`}>Tags</label>
                    <div className="flex gap-2 mb-2">
                        <input 
                            type="text" 
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            placeholder="Add tag..."
                            className={`flex-1 rounded-lg p-2 text-sm outline-none border ${theme === 'neo-glass' ? 'bg-white/10 text-white border-white/10 placeholder-white/40' : (theme === 'vision' ? 'bg-[#0B132B] text-[#E6ECF5] border-[#2A3B66] placeholder-[#7F8FB0]' : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700')}`}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                        />
                        <button onClick={handleAddTag} className={theme === 'vision' ? 'bg-[#0B132B] p-2 rounded-lg text-[#2F6BFF]' : 'bg-gray-100 dark:bg-gray-700 p-2 rounded-lg text-gray-600 dark:text-gray-300'}>
                            <Icon name="plus" size={16} />
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                        {tags.map(t => (
                            <span key={t} className={`text-xs px-2 py-1 rounded-md flex items-center gap-1 ${theme === 'neo-glass' ? 'bg-white/20 text-white' : (theme === 'vision' ? 'bg-[#2F6BFF]/20 text-[#2F6BFF]' : 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300')}`}>
                                #{t}
                                <button onClick={() => handleRemoveTag(t)} className="hover:text-red-500">
                                    <Icon name="x" size={12} />
                                </button>
                            </span>
                        ))}
                    </div>
                </div>

                <hr className={`my-3 ${theme === 'neo-glass' ? 'border-white/10' : (theme === 'vision' ? 'border-[#1F2C4D]' : 'border-gray-100 dark:border-gray-700')}`} />
                
                <button 
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full flex items-center gap-2 text-red-500 p-2 hover:bg-red-500/10 rounded-lg text-sm"
                >
                    <Icon name="trash" size={16} />
                    Move to Trash
                </button>
            </div>
            </>
        )}

        <div className="flex-1 overflow-y-auto p-4 md:p-6" onClick={!isEditing ? handleTripleClick : undefined}>
            {isEditing ? (
                <>
                    <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Title"
                    className={`w-full text-2xl md:text-3xl font-bold bg-transparent border-none outline-none mb-4 ${styles.text} ${styles.searchBarPlaceholder}`}
                    />
                    
                    <div 
                    ref={contentRef}
                    contentEditable
                    onInput={(e) => handleContentChange(e.currentTarget.innerHTML)}
                    className={`w-full min-h-[50vh] text-lg leading-relaxed outline-none empty:before:content-[attr(data-placeholder)] ${styles.text} ${theme === 'neo-glass' ? 'empty:before:text-white/40' : (theme === 'vision' ? 'empty:before:text-[#7F8FB0]' : 'empty:before:text-gray-400')}`}
                    data-placeholder="Start typing..."
                    suppressContentEditableWarning={true}
                    />
                </>
            ) : (
                <>
                    <div className="mb-4">
                        <h1 className={`text-2xl md:text-3xl font-bold break-words ${styles.text}`}>
                            {title || <span className="opacity-50 italic">Untitled</span>}
                        </h1>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {tags.map(t => (
                                <span key={t} className={`text-xs px-2 py-1 rounded-full ${theme === 'neo-glass' ? 'bg-white/20 text-white' : (theme === 'vision' ? 'bg-[#141F3A] text-[#7F8FB0]' : 'text-gray-500 bg-black/5 dark:bg-white/10')}`}>#{t}</span>
                            ))}
                        </div>
                    </div>
                    
                    <div 
                        className={`w-full min-h-[50vh] text-lg leading-relaxed break-words prose max-w-none ${theme === 'dark' || theme === 'neo-glass' || theme === 'vision' ? 'prose-invert' : ''} ${styles.text}`}
                        dangerouslySetInnerHTML={{__html: content || "<p class='opacity-50 italic'>No content</p>"}}
                    />
                </>
            )}
        </div>

        {/* Formatting Toolbar - Only show in Edit mode */}
        {isEditing && (
            <div className={`p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] flex justify-around items-center safe-area-bottom ${theme === 'neo-glass' ? 'bg-black/40 backdrop-blur-xl border-t border-white/10' : (theme === 'vision' ? 'bg-[#0B132B]/90 backdrop-blur-md border-t border-[#1F2C4D]' : 'bg-white/90 dark:bg-black/90 backdrop-blur border-t border-gray-200 dark:border-gray-800')}`}>
                <button onClick={() => execCmd('bold')} className={`p-3 rounded-lg ${styles.iconHover} ${styles.text}`}>
                    <Icon name="bold" size={20} />
                </button>
                <button onClick={() => execCmd('italic')} className={`p-3 rounded-lg ${styles.iconHover} ${styles.text}`}>
                    <Icon name="italic" size={20} />
                </button>
                <button onClick={() => execCmd('insertUnorderedList')} className={`p-3 rounded-lg ${styles.iconHover} ${styles.text}`}>
                    <Icon name="list" size={20} />
                </button>
            </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
           <div className={`rounded-xl shadow-xl w-full max-w-sm p-6 border animate-slide-up ${theme === 'neo-glass' ? 'bg-black/70 backdrop-blur-xl border-white/20' : (theme === 'vision' ? 'bg-[#141F3A] border-[#1F2C4D]' : 'bg-white dark:bg-dark-surface border-gray-100 dark:border-dark-border')}`}>
             <h3 className={`text-lg font-bold mb-2 ${styles.text}`}>Move to Trash?</h3>
             <p className={`mb-6 text-sm ${styles.secondaryText}`}>
               The note will be moved to the Trash. You can restore it later.
             </p>
             <div className="flex justify-end gap-3">
               <button 
                 onClick={() => setShowDeleteConfirm(false)}
                 className={`px-4 py-2 rounded-lg font-medium text-sm ${theme === 'neo-glass' ? 'text-white hover:bg-white/10' : (theme === 'vision' ? 'text-[#C9D2E3] hover:bg-[#24345C]' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800')}`}
               >
                 Cancel
               </button>
               <button 
                 onClick={() => onDelete(note.id)}
                 className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 font-medium text-sm shadow-sm"
               >
                 Trash Note
               </button>
             </div>
           </div>
        </div>
      )}
    </div>
  );
};

// AuthModal supports both Global verification (localStorage) and Custom verification (passed params)
const AuthModal: React.FC<{ 
    onUnlock: (key: CryptoKey, rawPin?: string) => void; 
    onCancel?: () => void; 
    customSecurity?: NoteSecurity;
    theme: Theme;
}> = ({ onUnlock, onCancel, customSecurity, theme }) => {
    const [pin, setPin] = useState("");
    const [error, setError] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [bioAvailable, setBioAvailable] = useState(false);

    const s = SECURITY_THEME[theme];
    const GLOBAL_PIN_ALIAS = "global_pin";

    // Determine target length for auto-submit
    const targetLength = useMemo(() => {
        if (customSecurity && customSecurity.pinLength) return customSecurity.pinLength;
        const storedGlobalLen = localStorage.getItem('sec_pin_length');
        if (!customSecurity && storedGlobalLen) return parseInt(storedGlobalLen);
        return 0; // Unknown
    }, [customSecurity]);

    // Check availability
    useEffect(() => {
        if (!customSecurity) {
            NativeBiometric.isAvailable().then(result => {
                setBioAvailable(result.isAvailable);
                // Auto trigger if available and using Global lock
                if (result.isAvailable) {
                   performBiometricAuth();
                }
            }).catch(() => setBioAvailable(false));
        }
    }, [customSecurity]);

    const performBiometricAuth = async () => {
        try {
            await NativeBiometric.verifyIdentity({
                reason: "Unlock CloudPad",
                title: "Authentication Required",
                subtitle: "Use fingerprint or Face ID",
                description: "Confirm identity to access secured notes"
            });
            // On success, retrieve the PIN
            const creds = await NativeBiometric.getCredentials({
                server: "com.cloudpad.app",
            });
            
            // Check if we retrieved the right alias
            if (creds && creds.username === GLOBAL_PIN_ALIAS && creds.password) {
                 handleVerify(creds.password);
            } 
        } catch (e) {
            console.log("Biometric Auth skipped or failed", e);
            // Fallback to manual entry silently
        }
    };

    const handleVerify = useCallback(async (code: string) => {
        setVerifying(true);
        let storedSalt: string | null = null;
        let storedVerifier: string | null = null;

        if (customSecurity) {
            storedSalt = customSecurity.salt;
            storedVerifier = customSecurity.verifier;
        } else {
            storedSalt = localStorage.getItem('sec_salt');
            storedVerifier = localStorage.getItem('sec_verifier');
        }

        if (storedSalt && storedVerifier) {
            const key = await SecurityService.verifyPassword(code, storedSalt, storedVerifier);
            if (key) {
                onUnlock(key, code); // Pass code back to allow saving it to keychain if needed
            } else {
                setError(true);
                setPin("");
                setTimeout(() => setError(false), 500); // Quick shake reset
            }
        } else {
            setError(true);
        }
        setVerifying(false);
    }, [customSecurity, onUnlock]);

    // Auto-verify effect
    useEffect(() => {
        if (targetLength > 0 && pin.length === targetLength) {
            handleVerify(pin);
        }
    }, [pin, targetLength, handleVerify]);

    const handleNumClick = (num: string) => {
        if (pin.length < 8) { // Max arbitrary limit if unknown
            setPin(prev => prev + num);
        }
    }

    const handleBackspace = () => {
        setPin(prev => prev.slice(0, -1));
    }

    return (
    <div className={`fixed inset-0 z-[100] flex flex-col pt-[env(safe-area-inset-top)] pb-[calc(2rem+env(safe-area-inset-bottom))] select-none min-h-[100dvh] ${s.container}`}>
        
        {/* Header / Display */}
        <div className="flex-1 flex flex-col items-center justify-center">
            <div 
                className={`mb-6 transition-all cursor-pointer ${error ? "animate-[shake_0.5s_ease-in-out]" : ""} ${s.icon}`}
                onClick={() => bioAvailable && !customSecurity && performBiometricAuth()}
            >
                {bioAvailable && !customSecurity ? (
                     <div className="flex flex-col items-center gap-2">
                        <Icon name="fingerprint" size={56} />
                        <span className="text-xs opacity-50">Tap for Biometrics</span>
                     </div>
                ) : (
                    <Icon name="lock" size={48} />
                )}
            </div>
            
            {/* PIN Indicators */}
            <div className={`flex gap-6 h-4 items-center justify-center mb-8 ${error ? "animate-[shake_0.5s_ease-in-out]" : ""}`}>
                {targetLength > 0 ? (
                    // Show exact placeholders if we know length
                    Array.from({ length: targetLength }).map((_, i) => (
                        <div 
                            key={i} 
                            className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${i < pin.length ? s.dotActive : s.dotInactive}`} 
                        />
                    ))
                ) : (
                    // Variable length indicators
                    Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
                        <div 
                            key={i} 
                            className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${i < pin.length ? s.dotActive : s.dotInactive}`} 
                        />
                    ))
                )}
            </div>
            
            <p className={`text-sm font-medium tracking-wide uppercase ${s.subText}`}>{customSecurity ? "Private Note" : "Enter PIN"}</p>
        </div>

        {/* Keypad */}
        <div className="px-8 pb-4 w-full max-w-sm mx-auto">
            <div className="grid grid-cols-3 gap-x-8 gap-y-6">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                    <button 
                        key={n} 
                        onClick={() => handleNumClick(n.toString())} 
                        className={`w-20 h-20 mx-auto rounded-full text-3xl font-light flex items-center justify-center transition-all active:scale-95 outline-none select-none ${s.keypad}`}
                    >
                        {n}
                    </button>
                ))}
                
                {/* Bottom Row */}
                <div className="w-20 h-20 mx-auto flex items-center justify-center">
                   {onCancel && (
                        <button onClick={onCancel} className={`text-xs font-bold tracking-widest uppercase transition-colors py-4 ${s.keypadAction}`}>
                            Cancel
                        </button>
                    )}
                </div>
                
                <button 
                    onClick={() => handleNumClick("0")} 
                    className={`w-20 h-20 mx-auto rounded-full text-3xl font-light flex items-center justify-center transition-all active:scale-95 outline-none select-none ${s.keypad}`}
                >
                    0
                </button>
                
                <button 
                    onClick={handleBackspace} 
                    className={`w-20 h-20 mx-auto rounded-full active:scale-90 flex items-center justify-center transition-all outline-none ${s.keypadAction}`}
                >
                    <Icon name="arrowLeft" size={28} />
                </button>
            </div>
        </div>

        {/* Footer Actions / Unlock Button if length unknown */}
        {targetLength === 0 && !onCancel && (
             <div className="absolute bottom-[calc(2rem+env(safe-area-inset-bottom))] left-8">
                 <button onClick={() => handleVerify(pin)} className="text-blue-500 font-medium">Unlock</button>
             </div>
        )}
    </div>
)};

const SecuritySetupModal: React.FC<{ 
    onComplete: (key: CryptoKey, security: NoteSecurity, rawPin: string) => void; 
    onCancel: () => void;
    theme: Theme;
}> = ({ onComplete, onCancel, theme }) => {
    const [pin, setPin] = useState("");
    const [confirmPin, setConfirmPin] = useState("");
    const [step, setStep] = useState(1); // 1: Enter, 2: Confirm
    const [error, setError] = useState("");
    const [creating, setCreating] = useState(false);
    
    const s = SECURITY_THEME[theme];
    const PIN_LENGTH = 4; // Fixed length for better UX

    const handleNumClick = (num: string) => {
        // Enforce max length
        if (creating) return;

        if (step === 1) {
            if (pin.length < PIN_LENGTH) {
                const newPin = pin + num;
                setPin(newPin);
                if (newPin.length === PIN_LENGTH) {
                    setTimeout(() => setStep(2), 200);
                }
            }
        } else {
             if (confirmPin.length < PIN_LENGTH) {
                 setConfirmPin(confirmPin + num);
                 // useEffect handles submit
             }
        }
    }

    const handleBackspace = () => {
        if (step === 1) setPin(prev => prev.slice(0, -1));
        else setConfirmPin(prev => prev.slice(0, -1));
    }

    const handleSubmit = useCallback(async () => {
        if (pin !== confirmPin) {
            setError("PINs do not match");
            // Shake effect would be triggered by 'error' state in real UI
            setTimeout(() => {
                setConfirmPin(""); // Reset confirmation
                setError("");
            }, 1000);
            return;
        }

        setCreating(true);
        // Create Verifier
        const { salt, verifier } = await SecurityService.createVerifier(pin);
        
        // Derive key for immediate use
        const key = await SecurityService.verifyPassword(pin, salt, verifier);
        if (key) {
            onComplete(key, { salt, verifier, pinLength: pin.length }, pin);
        } else {
            setError("Error creating key");
        }
        setCreating(false);
    }, [pin, confirmPin, onComplete]);

    // Auto-submit when confirmation length matches original length
    useEffect(() => {
        if (step === 2 && confirmPin.length === PIN_LENGTH && pin.length === PIN_LENGTH) {
            handleSubmit();
        }
    }, [confirmPin, pin, step, handleSubmit, PIN_LENGTH]);

    return (
        <div className={`fixed inset-0 z-[100] flex flex-col pt-[env(safe-area-inset-top)] pb-[calc(2rem+env(safe-area-inset-bottom))] select-none min-h-[100dvh] ${s.container}`}>
             
             {/* Header */}
             <div className="flex-1 flex flex-col items-center justify-center">
                <div className={`mb-6 transition-all ${step === 2 ? 'scale-110' : ''} ${step === 1 ? s.icon : "text-green-500"}`}>
                     <Icon name={step === 1 ? "lock" : "check"} size={48} />
                </div>
                
                {/* Dots */}
                <div className={`flex gap-6 h-4 items-center justify-center mb-8 ${error ? "animate-[shake_0.5s_ease-in-out]" : ""}`}>
                    {/* Render dots based on current input length */}
                    {Array.from({ length: PIN_LENGTH }).map((_, i) => (
                        <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${i < (step === 1 ? pin.length : confirmPin.length) ? s.dotActive : s.dotInactive}`} />
                    ))}
                </div>

                <p className={`text-sm font-medium tracking-wide uppercase transition-all ${error ? "text-red-500" : s.subText}`}>
                    {error || (step === 1 ? "Create 4-digit PIN" : "Confirm PIN")}
                </p>
            </div>

            {/* Keypad */}
            <div className="px-8 pb-4 w-full max-w-sm mx-auto">
                <div className="grid grid-cols-3 gap-x-8 gap-y-6">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                        <button key={n} onClick={() => handleNumClick(n.toString())} className={`w-20 h-20 mx-auto rounded-full text-3xl font-light flex items-center justify-center transition-all active:scale-95 outline-none ${s.keypad}`}>
                            {n}
                        </button>
                    ))}
                    <div className="w-20 h-20 mx-auto flex items-center justify-center">
                         <button onClick={onCancel} className={`text-xs font-bold tracking-widest uppercase transition-colors py-4 ${s.keypadAction}`}>
                            Cancel
                        </button>
                    </div>
                    <button onClick={() => handleNumClick("0")} className={`w-20 h-20 mx-auto rounded-full text-3xl font-light flex items-center justify-center transition-all active:scale-95 outline-none ${s.keypad}`}>0</button>
                    <button onClick={handleBackspace} className={`w-20 h-20 mx-auto rounded-full active:scale-90 flex items-center justify-center transition-all outline-none ${s.keypadAction}`}>
                        <Icon name="arrowLeft" size={28} />
                    </button>
                </div>
            </div>
        </div>
    );
}

const LockMethodModal: React.FC<{ 
    onSelectGlobal: () => void; 
    onSelectCustom: () => void; 
    onCancel: () => void;
    globalAvailable: boolean; 
    theme: Theme;
}> = ({ onSelectGlobal, onSelectCustom, onCancel, globalAvailable, theme }) => {
    const s = THEME_STYLES[theme];
    
    // Additional style overrides for modal-specific parts
    const modalBg = theme === 'neo-glass' ? 'bg-black/80 backdrop-blur-xl border border-white/20' : (theme === 'vision' ? 'bg-[#182545] border border-[#1F2C4D]' : s.cardBase);
    const borderColor = theme === 'neo-glass' ? 'border-white/10' : (theme === 'vision' ? 'border-[#1F2C4D]' : 'border-gray-100 dark:border-gray-800');
    
    return (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center backdrop-blur-sm p-4">
            <div className={`rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-slide-up ${modalBg}`}>
                <div className={`p-6 text-center border-b ${borderColor}`}>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${theme === 'neo-glass' ? 'bg-white/20 text-white' : (theme === 'vision' ? 'bg-[#0B132B] text-[#2F6BFF]' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400')}`}>
                        <Icon name="lock" size={24} />
                    </div>
                    <h3 className={`text-lg font-bold mb-2 ${s.text}`}>Lock Note</h3>
                    <p className={`text-sm ${s.secondaryText}`}>Choose how you want to secure this note.</p>
                </div>
                
                <div className="p-4 space-y-3">
                    <button 
                        onClick={onSelectGlobal}
                        disabled={!globalAvailable}
                        className={`w-full p-4 rounded-xl flex items-center gap-4 text-left border-2 transition-all ${globalAvailable ? (theme === 'neo-glass' ? 'border-white/10 hover:border-white/30 hover:bg-white/5' : (theme === 'vision' ? 'border-[#1F2C4D] hover:border-[#2F6BFF]' : 'border-gray-100 dark:border-gray-800 hover:border-blue-500 dark:hover:border-blue-500')) : 'opacity-50 cursor-not-allowed border-transparent bg-black/5 dark:bg-white/5'}`}
                    >
                        <div className={`p-2 rounded-lg ${globalAvailable ? (theme === 'vision' ? 'bg-[#2F6BFF] text-white' : 'bg-blue-500 text-white') : 'bg-gray-300 text-gray-500'}`}>
                            <Icon name="lock" size={20} />
                        </div>
                        <div>
                            <div className={`font-bold ${s.text}`}>Use App PIN</div>
                            <div className={`text-xs ${s.secondaryText}`}>{globalAvailable ? "Uses the main security PIN" : "Main PIN not set up"}</div>
                        </div>
                    </button>

                    <button 
                        onClick={onSelectCustom}
                        className={`w-full p-4 rounded-xl flex items-center gap-4 text-left border-2 transition-all ${theme === 'neo-glass' ? 'border-white/10 hover:border-white/30 hover:bg-white/5' : (theme === 'vision' ? 'border-[#1F2C4D] hover:border-purple-500' : 'border-gray-100 dark:border-gray-800 hover:border-purple-500')}`}
                    >
                        <div className="p-2 rounded-lg bg-purple-500 text-white">
                            <Icon name="lock" size={20} />
                        </div>
                        <div>
                            <div className={`font-bold ${s.text}`}>Custom PIN</div>
                            <div className={`text-xs ${s.secondaryText}`}>Set a unique PIN for this note</div>
                        </div>
                    </button>
                </div>

                <div className={`p-4 text-center ${theme === 'neo-glass' ? 'bg-white/5' : (theme === 'vision' ? 'bg-[#0B132B]/50' : 'bg-gray-50 dark:bg-black/20')}`}>
                    <button onClick={onCancel} className={`font-medium text-sm hover:opacity-80 ${s.secondaryText}`}>Cancel</button>
                </div>
            </div>
        </div>
    );
};

// --- Main App Component ---

const driveService = new DriveService();

type SortOption = 'UPDATED' | 'CREATED' | 'TITLE';

export default function App() {
  const [view, setView] = useState<ViewState>('LIST');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [currentTagFilter, setCurrentTagFilter] = useState<string | null>(null);
  const [layoutMode, setLayoutMode] = useState<'GRID' | 'LIST'>('GRID');
  const [sortBy, setSortBy] = useState<SortOption>('UPDATED');
  
  const [theme, setTheme] = useState<Theme>('classic');
  // Regular Notes
  const [notes, setNotes] = useState<Note[]>([]);
  // Incognito Notes (Memory Only)
  const [incognitoNotes, setIncognitoNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSyncSuccess, setShowSyncSuccess] = useState(false);
  const [startInEditMode, setStartInEditMode] = useState(false);

  // Security State
  const [isAppLocked, setIsAppLocked] = useState(false); // Controls overlay
  const [isAppLockEnabled, setIsAppLockEnabled] = useState(false); // Controls preference
  const [isIncognito, setIsIncognito] = useState(false);
  
  // NEW: AES Security Context
  const [hasSecuritySetup, setHasSecuritySetup] = useState(false);
  const [sessionKey, setSessionKey] = useState<CryptoKey | null>(null); // Global Key
  const [activeNoteKey, setActiveNoteKey] = useState<CryptoKey | null>(null); // Key for current note (Global or Custom)
  
  // Modals
  const [showSecuritySetup, setShowSecuritySetup] = useState(false); // Global setup
  const [showAuthModal, setShowAuthModal] = useState(false); // For ad-hoc unlocking
  const [pendingAuthNote, setPendingAuthNote] = useState<Note | null>(null); // Note waiting to be opened
  
  const [showLockMethodModal, setShowLockMethodModal] = useState(false);
  const [showCustomLockSetup, setShowCustomLockSetup] = useState(false);

  // --- App Lifecycle Handling for Security ---
  useEffect(() => {
    CapacitorApp.addListener('appStateChange', ({ isActive }) => {
        // If app goes to background (inactive) and App Lock is enabled, lock it.
        // Also clear session keys from memory to force re-auth.
        if (!isActive && isAppLockEnabled) {
            setIsAppLocked(true);
            setSessionKey(null);
            setActiveNoteKey(null);
            // Close any open editors to safe list view
            if (view === 'EDITOR') {
                 // Optional: Save before close if needed, but 'EDITOR' view relies on key. 
                 // It will simply require re-auth when returning to 'EDITOR' if logic handles it, 
                 // but usually safe to drop to list behind lock screen.
            }
        }
    });
  }, [isAppLockEnabled, view]);

  useEffect(() => {
    // Load Security Prefs
    const lockedPref = localStorage.getItem('security_app_lock') === 'true';
    setIsAppLockEnabled(lockedPref);
    
    const secSalt = localStorage.getItem('sec_salt');
    if (secSalt) {
        setHasSecuritySetup(true);
        if(lockedPref) {
            setIsAppLocked(true); 
        }
    }

    const savedTheme = localStorage.getItem('theme') as Theme || 'classic';
    setTheme(savedTheme);
    applyTheme(savedTheme);

    const savedNotes = localStorage.getItem('notes');
    if (savedNotes) {
      let loadedNotes: Note[] = JSON.parse(savedNotes);

      // --- TRASH AUTO-DELETE LOGIC ---
      const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
      const now = Date.now();
      
      const filteredNotes = loadedNotes.filter(note => {
        if (note.isTrashed && note.deletedAt) {
            const timeDiff = now - note.deletedAt;
            return timeDiff <= THIRTY_DAYS_MS;
        }
        return true; 
      });

      setNotes(filteredNotes);
    } else {
        const welcome: Note = {
            id: 'welcome-1',
            title: 'Welcome to CloudPad',
            content: 'This is a sample note showing off the features.',
            plainTextPreview: 'This is a sample note showing off the features.',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            isPinned: true,
            color: 'default',
            tags: ['welcome']
        };
        setNotes([welcome]);
    }
    
    const savedFolders = localStorage.getItem('folders');
    if (savedFolders) {
        setFolders(JSON.parse(savedFolders));
    }

    driveService.init(
        "YOUR_API_KEY", 
        "YOUR_CLIENT_ID"
    ).catch(e => console.warn("Drive Init Error (Expected if no keys):", e));

  }, []);

  useEffect(() => {
    localStorage.setItem('notes', JSON.stringify(notes));
  }, [notes]);
  
  useEffect(() => {
    localStorage.setItem('folders', JSON.stringify(folders));
  }, [folders]);

  // Handle active notes list based on mode
  const activeNotes = isIncognito ? incognitoNotes : notes;

  const allTags = useMemo(() => {
      const tags = new Set<string>();
      activeNotes.forEach(n => n.tags?.forEach(t => tags.add(t)));
      return Array.from(tags).sort();
  }, [activeNotes]);

  const applyTheme = (t: Theme) => {
    const root = window.document.documentElement;
    if (t === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', t);
  };

  const handleThemeChange = (newTheme: Theme) => {
      setTheme(newTheme);
      applyTheme(newTheme);
  };

  const handleCreateNote = () => {
    const newNote: Note = {
      id: Date.now().toString(),
      title: "",
      content: "",
      plainTextPreview: "",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isPinned: false,
      color: 'default',
      tags: [],
      folderId: view === 'FOLDER' && currentFolderId ? currentFolderId : undefined,
      isIncognito: isIncognito
    };
    if (isIncognito) {
        setIncognitoNotes([newNote, ...incognitoNotes]);
    } else {
        setNotes([newNote, ...notes]);
    }
    setSelectedNoteId(newNote.id);
    setActiveNoteKey(null); // New note has no encryption yet
    setStartInEditMode(true);
    setView('EDITOR');
  };

  const handleCreateFolder = (name: string) => {
      if (name) {
          const newFolder: Folder = {
              id: Date.now().toString(),
              name,
              createdAt: Date.now()
          };
          setFolders([...folders, newFolder]);
      }
  };

  const handleUpdateNote = (updatedNote: Note) => {
    if (isIncognito) {
        setIncognitoNotes(prev => prev.map(n => n.id === updatedNote.id ? updatedNote : n));
    } else {
        setNotes(prev => prev.map(n => n.id === updatedNote.id ? updatedNote : n));
    }
  };

  const handleMoveToTrash = (id: string) => {
    if (isIncognito) {
        // Incognito notes delete permanently immediately or just remove from list
        setIncognitoNotes(prev => prev.filter(n => n.id !== id));
    } else {
        setNotes(prev => prev.map(n => n.id === id ? { ...n, isTrashed: true, deletedAt: Date.now() } : n));
    }
    setView(view === 'EDITOR' ? 'LIST' : view);
    setSelectedNoteId(null);
  };
  
  const handleRestoreNote = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      setNotes(prev => prev.map(n => n.id === id ? { ...n, isTrashed: false, deletedAt: undefined } : n));
  };

  const handleDeleteForever = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if(window.confirm("Delete this note forever? This cannot be undone.")) {
          setNotes(prev => prev.filter(n => n.id !== id));
      }
  };

  const togglePin = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if(isIncognito) {
        setIncognitoNotes(prev => prev.map(n => n.id === id ? { ...n, isPinned: !n.isPinned } : n));
    } else {
        setNotes(prev => prev.map(n => n.id === id ? { ...n, isPinned: !n.isPinned } : n));
    }
  };

  // Triggered from Editor settings
  const handleLockToggleRequest = () => {
      const note = activeNotes.find(n => n.id === selectedNoteId);
      if(!note) return;

      if (note.isLocked) {
          // Unlocking
          // We already have the key (activeNoteKey) since we are in the editor
          // Just update note state to unlocked
          const unlockedNote = { ...note, isLocked: false, lockMode: undefined, security: undefined };
          handleUpdateNote(unlockedNote);
          // We keep activeNoteKey because we still need it to save the DECRYPTED content (handleSave logic handles this)
          // or rather, handleSave checks `isLocked` to decide whether to encrypt.
          // If isLocked is false, it removes encryptionData. Perfect.
      } else {
          // Locking
          setShowLockMethodModal(true);
      }
  };

  const handleSetGlobalLock = () => {
      if (!sessionKey) {
          alert("Global session not active. Please unlock app first.");
          return;
      }
      const note = activeNotes.find(n => n.id === selectedNoteId);
      if (note) {
          handleUpdateNote({ ...note, isLocked: true, lockMode: 'GLOBAL' });
          setActiveNoteKey(sessionKey);
      }
      setShowLockMethodModal(false);
  };

  const handleSetCustomLock = (key: CryptoKey, security: NoteSecurity, rawPin: string) => {
      const note = activeNotes.find(n => n.id === selectedNoteId);
      if (note) {
          handleUpdateNote({ ...note, isLocked: true, lockMode: 'CUSTOM', security: security });
          setActiveNoteKey(key);
      }
      setShowCustomLockSetup(false);
      setShowLockMethodModal(false);
  };

  const handleNoteClick = async (note: Note) => {
      if(note.isTrashed) return;

      // Note is locked OR Encrypted
      if(note.isLocked || note.encryptedData) {
          
          if (note.lockMode === 'CUSTOM' && note.security) {
              // Always require auth for custom lock
              setPendingAuthNote(note);
              setShowAuthModal(true);
              return;
          } 
          
          // Default/Global Lock
          if (!sessionKey) {
              setPendingAuthNote(note);
              setShowAuthModal(true);
              return; // Wait for auth
          }
          
          // Have global key, open directly
          setActiveNoteKey(sessionKey);
      } else {
          setActiveNoteKey(null);
      }

      setSelectedNoteId(note.id); 
      setStartInEditMode(false); 
      setView('EDITOR'); 
  };

  const handleLogin = async () => {
    try {
        await driveService.signIn();
        setUser({
            id: 'google-user',
            name: 'Google User',
            email: 'Signed In',
            imageUrl: ''
        });
        handleSync();
    } catch (e) {
        console.error("Login failed", e);
        alert("Sign in failed. Check console or network.");
    }
  };

  const handleLogout = async () => {
    await driveService.signOut();
    setUser(null);
  };

  const handleSync = async () => {
    if(isIncognito) return; // Disable sync in incognito
    setIsSyncing(true);
    try {
        const syncedNotes = await driveService.syncNotes(notes);
        setNotes(syncedNotes);
        setShowSyncSuccess(true);
        setTimeout(() => setShowSyncSuccess(false), 3000);
    } catch (error) {
        console.error("Sync failed", error);
    } finally {
        setIsSyncing(false);
    }
  };

  const handleViewChange = (newView: ViewState, fId?: string, tagName?: string) => {
      setView(newView);
      setCurrentFolderId(fId || null);
      setCurrentTagFilter(tagName || null);
      setIsDrawerOpen(false);
  };

  const toggleAppLockSetting = (enabled: boolean) => {
      setIsAppLockEnabled(enabled);
      localStorage.setItem('security_app_lock', enabled ? 'true' : 'false');
  };

  const saveBiometricCredentials = useCallback(async (pin: string) => {
    try {
        // First check if biometrics are actually supported/enabled on this device
        // This prevents calling setCredentials on Web or unsupported devices where it throws "Not Implemented"
        const result = await NativeBiometric.isAvailable().catch(() => ({ isAvailable: false }));
        
        if (result.isAvailable) {
            await NativeBiometric.setCredentials({
                username: "global_pin",
                password: pin,
                server: "com.cloudpad.app"
            });
        }
    } catch (err) {
        // Suppress errors, as this is an enhancement feature, not critical path
        console.debug("Biometric credential storage skipped:", err);
    }
  }, []);

  const handleAuthSuccess = (key: CryptoKey, rawPin?: string) => {
      // If we authenticated manually (rawPin exists) and we don't have biometrics stored yet (or just to keep it fresh),
      // update the biometric credentials for Global Auth.
      if (rawPin && (!pendingAuthNote || pendingAuthNote.lockMode !== 'CUSTOM')) {
          saveBiometricCredentials(rawPin);
      }

      if (isAppLocked) {
          setSessionKey(key);
          setIsAppLocked(false);
      } else if (pendingAuthNote) {
          // We were trying to open a specific note
          if (pendingAuthNote.lockMode === 'CUSTOM') {
              setActiveNoteKey(key); // Use the custom key derived for this note
          } else {
              setSessionKey(key); // We unlocked the global session
              setActiveNoteKey(key);
          }
          
          setSelectedNoteId(pendingAuthNote.id);
          setStartInEditMode(false);
          setView('EDITOR');
          setPendingAuthNote(null);
      }
      setShowAuthModal(false);
  };

  const handleGlobalSetupComplete = (key: CryptoKey, security: NoteSecurity, rawPin: string) => {
      setHasSecuritySetup(true);
      setSessionKey(key);
      localStorage.setItem('sec_salt', security.salt);
      localStorage.setItem('sec_verifier', security.verifier);
      // Save global length preference
      if (security.pinLength) {
        localStorage.setItem('sec_pin_length', security.pinLength.toString());
      }

      // Save for Biometric Future Use
      saveBiometricCredentials(rawPin);

      setShowSecuritySetup(false);
  }

  const filteredNotes = useMemo(() => {
    const lowerQuery = searchQuery.toLowerCase();
    
    // Base filter
    let filtered = activeNotes.filter(n => 
      (n.title.toLowerCase().includes(lowerQuery) || n.plainTextPreview.toLowerCase().includes(lowerQuery) || (n.encryptedData && lowerQuery === ''))
    );

    // View specific filtering
    if (view === 'TRASH') {
        filtered = filtered.filter(n => n.isTrashed);
    } else {
        filtered = filtered.filter(n => !n.isTrashed); // Hide trash in other views

        if (view === 'FOLDER' && currentFolderId) {
            filtered = filtered.filter(n => n.folderId === currentFolderId);
        } else if (view === 'TAG' && currentTagFilter) {
            filtered = filtered.filter(n => n.tags?.includes(currentTagFilter));
        }
    }

    // Sort Logic
    return filtered.sort((a, b) => {
        // Pinned always on top unless trashed
        if (!a.isTrashed && !b.isTrashed && a.isPinned !== b.isPinned) {
            return a.isPinned ? -1 : 1;
        }

        switch(sortBy) {
            case 'TITLE':
                return a.title.localeCompare(b.title);
            case 'CREATED':
                return b.createdAt - a.createdAt;
            case 'UPDATED':
            default:
                return b.updatedAt - a.updatedAt;
        }
    });
  }, [activeNotes, searchQuery, view, currentFolderId, currentTagFilter, sortBy]);

  // --- Render ---

  const styles = THEME_STYLES[theme];

  // Full Screen Overlays
  if (isAppLocked) {
      return <AuthModal onUnlock={handleAuthSuccess} theme={theme} />;
  }

  if (showSecuritySetup) {
      // Global Setup
      return <SecuritySetupModal onComplete={handleGlobalSetupComplete} onCancel={() => setShowSecuritySetup(false)} theme={theme} />;
  }
  
  if (showCustomLockSetup) {
      // Per-Note Setup
      return <SecuritySetupModal onComplete={handleSetCustomLock} onCancel={() => setShowCustomLockSetup(false)} theme={theme} />;
  }

  if (showLockMethodModal) {
      return <LockMethodModal 
                onSelectGlobal={handleSetGlobalLock} 
                onSelectCustom={() => { setShowLockMethodModal(false); setShowCustomLockSetup(true); }} 
                onCancel={() => setShowLockMethodModal(false)}
                globalAvailable={hasSecuritySetup} 
                theme={theme}
            />;
  }
  
  if (showAuthModal) {
      return <AuthModal 
        onUnlock={handleAuthSuccess} 
        onCancel={() => { setShowAuthModal(false); setPendingAuthNote(null); }} 
        customSecurity={pendingAuthNote?.lockMode === 'CUSTOM' ? pendingAuthNote.security : undefined}
        theme={theme}
      />;
  }

  if (view === 'EDITOR' && selectedNoteId) {
    const note = activeNotes.find(n => n.id === selectedNoteId);
    if (note) {
        return (
            <NoteEditor 
                note={note} 
                onSave={handleUpdateNote} 
                onBack={() => setView('LIST')}
                onDelete={handleMoveToTrash}
                initialEditMode={startInEditMode}
                folders={folders}
                theme={theme}
                onLockToggle={handleLockToggleRequest}
                encryptionKey={activeNoteKey}
            />
        );
    }
  }

  if (view === 'SETTINGS') {
      return (
          <SettingsView
             onBack={() => setView('LIST')}
             theme={theme}
             setTheme={handleThemeChange}
             user={user}
             onLogin={handleLogin}
             onLogout={handleLogout}
             isSyncing={isSyncing}
             onSync={handleSync}
             isAppLocked={isAppLockEnabled}
             toggleAppLock={toggleAppLockSetting}
             hasSecuritySetup={hasSecuritySetup}
             onSetupSecurity={() => setShowSecuritySetup(true)}
             isIncognito={isIncognito}
             toggleIncognito={setIsIncognito}
          />
      );
  }

  // Get view title
  let viewTitle = isIncognito ? "Incognito" : "Notes";
  if (view === 'TRASH') viewTitle = "Trash";
  else if (view === 'FOLDER') viewTitle = folders.find(f => f.id === currentFolderId)?.name || "Folder";
  else if (view === 'TAG') viewTitle = `#${currentTagFilter}`;

  return (
    <div className={`min-h-[100dvh] flex justify-center ${styles.bg}`}>
      <div className="w-full max-w-md md:max-w-3xl min-h-[100dvh] relative flex flex-col">
        
        {/* Incognito Banner */}
        {isIncognito && (
            <div className="bg-purple-900 text-white text-xs text-center py-1 font-bold tracking-widest uppercase pt-[env(safe-area-inset-top)]">
                Incognito Mode Active - Data not saved
            </div>
        )}

        {/* Modern Floating Search Bar Header */}
        <div className="sticky top-0 z-30 pt-[calc(1rem+env(safe-area-inset-top))] px-4 pb-4 pointer-events-none">
          <div className={`pointer-events-auto shadow-md rounded-full h-12 flex items-center px-2 transition-all ${styles.searchBar} ${isIncognito ? 'ring-2 ring-purple-500' : ''}`}>
            
            <button onClick={() => setIsDrawerOpen(true)} className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full ${styles.iconHover} ${styles.text}`}>
              <Icon name="menu" size={24} />
            </button>
            
            <div className="flex-1 flex items-center px-2 min-w-0">
                <input 
                  type="text" 
                  placeholder={`Search ${viewTitle.toLowerCase()}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full bg-transparent border-none focus:ring-0 text-base ${styles.searchBarText} ${styles.searchBarPlaceholder}`}
                />
            </div>

            {view === 'LIST' && (
                <>
                    <button 
                        onClick={() => setLayoutMode(prev => prev === 'GRID' ? 'LIST' : 'GRID')}
                        className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full ${styles.iconHover} ${styles.text}`}
                        title={layoutMode === 'GRID' ? "List View" : "Grid View"}
                    >
                        <Icon name={layoutMode === 'GRID' ? 'viewList' : 'grid'} size={22} />
                    </button>

                    <div className="relative">
                        <button 
                            onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
                            className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full transition-colors ${isSortMenuOpen ? 'bg-black/10 dark:bg-white/10' : `${styles.iconHover} ${styles.text}`}`}
                            title="Sort"
                        >
                             <Icon name="sort" size={22} />
                        </button>
                        
                        {/* Sort Dropdown */}
                        {isSortMenuOpen && (
                            <>
                            <div className="fixed inset-0 z-30 bg-black/10 backdrop-blur-sm" onClick={() => setIsSortMenuOpen(false)}></div>
                            <div className={`absolute top-12 right-0 w-48 shadow-xl rounded-xl border py-2 z-40 animate-slide-up origin-top-right ${theme === 'neo-glass' ? 'bg-black/60 backdrop-blur-xl border-white/20' : (theme === 'vision' ? 'bg-[#141F3A] border-[#1F2C4D]' : 'bg-white dark:bg-dark-surface border-gray-100 dark:border-dark-border')}`}>
                                <div className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider ${styles.secondaryText}`}>Sort By</div>
                                <button onClick={() => { setSortBy('UPDATED'); setIsSortMenuOpen(false); }} className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 ${sortBy === 'UPDATED' ? 'text-primary-500 font-medium' : styles.text}`}>
                                    Last Modified {sortBy === 'UPDATED' && <Icon name="check" size={14} />}
                                </button>
                                <button onClick={() => { setSortBy('CREATED'); setIsSortMenuOpen(false); }} className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 ${sortBy === 'CREATED' ? 'text-primary-500 font-medium' : styles.text}`}>
                                    Date Created {sortBy === 'CREATED' && <Icon name="check" size={14} />}
                                </button>
                                <button onClick={() => { setSortBy('TITLE'); setIsSortMenuOpen(false); }} className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 ${sortBy === 'TITLE' ? 'text-primary-500 font-medium' : styles.text}`}>
                                    Title (A-Z) {sortBy === 'TITLE' && <Icon name="check" size={14} />}
                                </button>
                            </div>
                            </>
                        )}
                    </div>
                </>
            )}

            <div 
                className={`w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center text-sm font-bold cursor-pointer overflow-hidden ml-1 mr-1 border border-transparent ${theme === 'neo-glass' ? 'bg-white/20 text-white' : (theme === 'vision' ? 'bg-[#141F3A] text-[#2F6BFF]' : 'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-300')}`} 
                onClick={() => setIsDrawerOpen(true)}
            >
             {user?.imageUrl ? <img src={user.imageUrl} className="w-full h-full object-cover" /> : (user ? user.name[0] : (isIncognito ? <Icon name="incognito" size={16} /> : <Icon name="user" size={16} />))}
            </div>

          </div>
        </div>

        {showSyncSuccess && (
            <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur text-white px-4 py-2 rounded-full text-sm shadow-lg z-30 animate-slide-up flex items-center gap-2">
                <Icon name="check" size={16} className="text-green-400" />
                Synced with Drive
            </div>
        )}

        <main className="flex-1 px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] -mt-2">
            {filteredNotes.length === 0 ? (
                <div className={`flex flex-col items-center justify-center h-[60vh] ${styles.secondaryText}`}>
                    <div className={`p-8 rounded-full mb-6 animate-pulse ${theme === 'neo-glass' ? 'bg-white/5' : (theme === 'vision' ? 'bg-[#141F3A]' : 'bg-gray-100 dark:bg-white/5')}`}>
                        <Icon 
                            name={searchQuery ? 'search' : (view === 'TRASH' ? 'trash' : (isIncognito ? 'incognito' : 'fileText'))} 
                            size={64} 
                            className={`opacity-40 ${theme === 'vision' ? 'text-[#2F6BFF]' : ''}`} 
                        />
                    </div>
                    <p className="font-bold text-lg">{searchQuery ? "No results found" : (isIncognito ? "Incognito Mode" : "No notes here")}</p>
                    <p className="text-sm mt-2 max-w-[200px] text-center opacity-70">
                        {searchQuery 
                            ? `Couldn't find anything matching "${searchQuery}"`
                            : (isIncognito 
                                ? "Notes created here are not saved to storage." 
                                : (view === 'TRASH' ? "Trash is empty" : "Create your first note to get started"))}
                    </p>
                </div>
            ) : (
                <div className={`${layoutMode === 'GRID' ? 'columns-2 md:columns-3 gap-4 space-y-4' : 'flex flex-col gap-4'}`}>
                    {filteredNotes.map(note => (
                        <NoteCard 
                            key={note.id} 
                            note={note} 
                            onClick={() => handleNoteClick(note)}
                            onPin={(e) => togglePin(e, note.id)}
                            onRestore={(e) => handleRestoreNote(e, note.id)}
                            onDeleteForever={(e) => handleDeleteForever(e, note.id)}
                            isTrashView={!!note.isTrashed}
                            theme={theme}
                        />
                    ))}
                </div>
            )}
        </main>

        {view !== 'TRASH' && <FAB onClick={handleCreateNote} theme={theme} />}

        <Drawer 
            isOpen={isDrawerOpen} 
            onClose={() => setIsDrawerOpen(false)}
            theme={theme}
            setTheme={handleThemeChange}
            user={user}
            onLogin={handleLogin}
            onLogout={handleLogout}
            onSync={handleSync}
            isSyncing={isSyncing}
            folders={folders}
            currentView={view}
            currentFolderId={currentFolderId}
            onChangeView={handleViewChange}
            onCreateFolder={handleCreateFolder}
            tags={allTags}
            isAppLocked={isAppLockEnabled}
            toggleAppLock={toggleAppLockSetting}
            isIncognito={isIncognito}
            toggleIncognito={setIsIncognito}
            hasSecuritySetup={hasSecuritySetup}
            onSetupSecurity={() => { setIsDrawerOpen(false); setShowSecuritySetup(true); }}
        />
      </div>
    </div>
  );
}