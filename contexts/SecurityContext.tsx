import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { NativeBiometric } from "@capgo/capacitor-native-biometric";
import { SecurityService } from "../services/SecurityService";
import { NoteSecurity } from "../types";

interface SecurityContextType {
  isAppLocked: boolean;
  isAppLockEnabled: boolean;
  hasSecuritySetup: boolean;
  sessionKey: CryptoKey | null;
  toggleAppLock: (enabled: boolean) => void;
  unlockApp: (key: CryptoKey, rawPin?: string) => void;
  lockApp: () => void;
  setupComplete: (
    key: CryptoKey,
    security: NoteSecurity,
    rawPin: string
  ) => void;
}

const SecurityContext = createContext<SecurityContextType | undefined>(
  undefined
);

export const SecurityProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isAppLocked, setIsAppLocked] = useState(false);
  const [isAppLockEnabled, setIsAppLockEnabled] = useState(false);
  const [hasSecuritySetup, setHasSecuritySetup] = useState(false);
  const [sessionKey, setSessionKey] = useState<CryptoKey | null>(null);

  useEffect(() => {
    // Load Security Prefs
    const lockedPref = localStorage.getItem("security_app_lock") === "true";
    setIsAppLockEnabled(lockedPref);

    const secSalt = localStorage.getItem("sec_salt");
    if (secSalt) {
      setHasSecuritySetup(true);
      if (lockedPref) {
        setIsAppLocked(true);
      }
    }

    CapacitorApp.addListener("appStateChange", ({ isActive }) => {
      if (!isActive) {
        // Security Best Practice: Always clear crypto keys from memory on background
        setSessionKey(null);

        // Only lock the full UI if preference is set
        if (lockedPref) {
          setIsAppLocked(true);
        }
      }
    });
  }, []);

  const saveBiometricCredentials = useCallback(async (pin: string) => {
    try {
      const result = await NativeBiometric.isAvailable().catch(() => ({
        isAvailable: false,
      }));
      if (result.isAvailable) {
        await NativeBiometric.setCredentials({
          username: "global_pin",
          password: pin,
          server: "com.cloudpad.app",
        });
      }
    } catch (err) {
      console.debug("Biometric credential storage skipped:", err);
    }
  }, []);

  const toggleAppLock = (enabled: boolean) => {
    setIsAppLockEnabled(enabled);
    localStorage.setItem("security_app_lock", enabled ? "true" : "false");
  };

  const unlockApp = (key: CryptoKey, rawPin?: string) => {
    setSessionKey(key);
    setIsAppLocked(false);
    if (rawPin) saveBiometricCredentials(rawPin);
  };

  const lockApp = () => {
    setSessionKey(null);
    if (isAppLockEnabled) setIsAppLocked(true);
  };

  const setupComplete = (
    key: CryptoKey,
    security: NoteSecurity,
    rawPin: string
  ) => {
    setHasSecuritySetup(true);
    setSessionKey(key);
    localStorage.setItem("sec_salt", security.salt);
    localStorage.setItem("sec_verifier", security.verifier);
    if (security.pinLength) {
      localStorage.setItem("sec_pin_length", security.pinLength.toString());
    }
    saveBiometricCredentials(rawPin);
  };

  return (
    <SecurityContext.Provider
      value={{
        isAppLocked,
        isAppLockEnabled,
        hasSecuritySetup,
        sessionKey,
        toggleAppLock,
        unlockApp,
        lockApp,
        setupComplete,
      }}
    >
      {children}
    </SecurityContext.Provider>
  );
};

export const useSecurity = () => {
  const context = useContext(SecurityContext);
  if (!context)
    throw new Error("useSecurity must be used within SecurityProvider");
  return context;
};
