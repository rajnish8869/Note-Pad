import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Icon } from "./Icon";
import { NoteSecurity, Theme } from "../types";
import { NativeBiometric } from "@capgo/capacitor-native-biometric";
import { SecurityService } from "../services/SecurityService";
import { useTheme } from "../contexts/ThemeContext";

export const AuthModal: React.FC<{
  onUnlock: (key: CryptoKey, rawPin?: string) => void;
  onCancel?: () => void;
  customSecurity?: NoteSecurity;
  theme: Theme;
}> = ({ onUnlock, onCancel, customSecurity }) => {
  const { getSecurityStyles } = useTheme();
  const s = getSecurityStyles();

  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);

  const targetLength = useMemo(() => {
    if (customSecurity && customSecurity.pinLength)
      return customSecurity.pinLength;
    const storedGlobalLen = localStorage.getItem("sec_pin_length");
    if (!customSecurity && storedGlobalLen) return parseInt(storedGlobalLen);
    return 0;
  }, [customSecurity]);

  const handleVerify = useCallback(
    async (code: string) => {
      let storedSalt: string | null = null;
      let storedVerifier: string | null = null;

      if (customSecurity) {
        storedSalt = customSecurity.salt;
        storedVerifier = customSecurity.verifier;
      } else {
        storedSalt = localStorage.getItem("sec_salt");
        storedVerifier = localStorage.getItem("sec_verifier");
      }

      if (storedSalt && storedVerifier) {
        const key = await SecurityService.verifyPassword(
          code,
          storedSalt,
          storedVerifier
        );
        if (key) {
          onUnlock(key, code);
        } else {
          setError(true);
          setPin("");
          setTimeout(() => setError(false), 500);
        }
      } else {
        setError(true);
      }
    },
    [customSecurity, onUnlock]
  );

  // Biometric Logic
  useEffect(() => {
    let isActive = true;

    const checkBiometric = async () => {
      // Biometrics are only for Global Auth (stored credentials), not Custom/Private notes
      if (customSecurity) {
        if (isActive) setBioAvailable(false);
        return;
      }

      try {
        const result = await NativeBiometric.isAvailable();
        if (!isActive) return;

        setBioAvailable(result.isAvailable);

        if (result.isAvailable) {
          try {
            await NativeBiometric.verifyIdentity({
              reason: "Unlock CloudPad",
              title: "Authentication Required",
              subtitle: "Use fingerprint or Face ID",
              description: "Confirm identity to access secured notes",
            });

            const creds = await NativeBiometric.getCredentials({
              server: "com.cloudpad.app",
            });

            if (
              isActive &&
              creds &&
              creds.username === "global_pin" &&
              creds.password
            ) {
              handleVerify(creds.password);
            }
          } catch (e) {
            console.log("Biometric Auth skipped or failed", e);
          }
        }
      } catch (e) {
        if (isActive) setBioAvailable(false);
      }
    };

    checkBiometric();

    return () => {
      isActive = false;
    };
  }, [customSecurity, handleVerify]);

  // Manual trigger for biometric (clicking the icon)
  const triggerBiometric = async () => {
    if (!bioAvailable || customSecurity) return;

    try {
      await NativeBiometric.verifyIdentity({
        reason: "Unlock CloudPad",
        title: "Authentication Required",
        subtitle: "Use fingerprint or Face ID",
        description: "Confirm identity to access secured notes",
      });
      const creds = await NativeBiometric.getCredentials({
        server: "com.cloudpad.app",
      });
      if (creds && creds.username === "global_pin" && creds.password) {
        handleVerify(creds.password);
      }
    } catch (e) {
      console.log("Biometric Auth skipped or failed", e);
    }
  };

  useEffect(() => {
    if (targetLength > 0 && pin.length === targetLength) {
      handleVerify(pin);
    }
  }, [pin, targetLength, handleVerify]);

  const handleNumClick = (num: string) => {
    if (pin.length < 8) setPin((prev) => prev + num);
  };

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col pt-[env(safe-area-inset-top)] pb-[calc(2rem+env(safe-area-inset-bottom))] select-none min-h-[100dvh] ${s.container}`}
    >
      <div className="flex-1 flex flex-col items-center justify-center">
        <div
          className={`mb-6 transition-all cursor-pointer ${
            error ? "animate-[shake_0.5s_ease-in-out]" : ""
          } ${s.icon}`}
          onClick={triggerBiometric}
        >
          {bioAvailable && !customSecurity ? (
            <div className="flex flex-col items-center gap-2">
              <Icon name="scan" size={56} />
              <span className="text-xs opacity-50">Tap for Biometrics</span>
            </div>
          ) : (
            <Icon name="lock" size={48} />
          )}
        </div>

        <div
          className={`flex gap-6 h-4 items-center justify-center mb-8 ${
            error ? "animate-[shake_0.5s_ease-in-out]" : ""
          }`}
        >
          {Array.from({
            length: targetLength > 0 ? targetLength : Math.max(4, pin.length),
          }).map((_, i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${
                i < pin.length ? s.dotActive : s.dotInactive
              }`}
            />
          ))}
        </div>

        <p
          className={`text-sm font-medium tracking-wide uppercase ${s.subText}`}
        >
          {customSecurity ? "Private Note" : "Enter PIN"}
        </p>
      </div>

      <div className="px-8 pb-4 w-full max-w-sm mx-auto">
        <div className="grid grid-cols-3 gap-x-8 gap-y-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <button
              key={n}
              onClick={() => handleNumClick(n.toString())}
              className={`w-20 h-20 mx-auto rounded-full text-3xl font-light flex items-center justify-center transition-all active:scale-95 outline-none select-none ${s.keypad}`}
            >
              {n}
            </button>
          ))}
          <div className="w-20 h-20 mx-auto flex items-center justify-center">
            {onCancel && (
              <button
                onClick={onCancel}
                className={`text-xs font-bold tracking-widest uppercase transition-colors py-4 ${s.keypadAction}`}
              >
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
            onClick={() => setPin((p) => p.slice(0, -1))}
            className={`w-20 h-20 mx-auto rounded-full active:scale-90 flex items-center justify-center transition-all outline-none ${s.keypadAction}`}
          >
            <Icon name="arrowLeft" size={28} />
          </button>
        </div>
      </div>
    </div>
  );
};
