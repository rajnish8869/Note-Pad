
import React, { useState, useEffect, useCallback } from 'react';
import { Icon } from './Icon';
import { NoteSecurity, Theme } from '../types';
import { SecurityService } from '../services/SecurityService';
import { useTheme } from '../contexts/ThemeContext';

interface Props { 
    onComplete: (key: CryptoKey, security: NoteSecurity, rawPin: string) => void; 
    onCancel: () => void;
    theme: Theme;
}

export const SecuritySetupModal: React.FC<Props> = ({ onComplete, onCancel }) => {
    const { getSecurityStyles } = useTheme();
    const s = getSecurityStyles();
    
    const [pin, setPin] = useState("");
    const [confirmPin, setConfirmPin] = useState("");
    const [step, setStep] = useState(1);
    const [error, setError] = useState("");
    const PIN_LENGTH = 4;

    const handleNumClick = (num: string) => {
        if (step === 1) {
            if (pin.length < PIN_LENGTH) {
                const newPin = pin + num;
                setPin(newPin);
                if (newPin.length === PIN_LENGTH) setTimeout(() => setStep(2), 200);
            }
        } else {
             if (confirmPin.length < PIN_LENGTH) setConfirmPin(confirmPin + num);
        }
    }

    const handleSubmit = useCallback(async () => {
        if (pin !== confirmPin) {
            setError("PINs do not match");
            setTimeout(() => { setConfirmPin(""); setError(""); }, 1000);
            return;
        }
        const { salt, verifier } = await SecurityService.createVerifier(pin);
        const key = await SecurityService.verifyPassword(pin, salt, verifier);
        if (key) {
            onComplete(key, { salt, verifier, pinLength: pin.length }, pin);
        } else {
            setError("Error creating key");
        }
    }, [pin, confirmPin, onComplete]);

    useEffect(() => {
        if (step === 2 && confirmPin.length === PIN_LENGTH) handleSubmit();
    }, [confirmPin, step, handleSubmit]);

    return (
        <div className={`fixed inset-0 z-[100] flex flex-col pt-[env(safe-area-inset-top)] pb-[calc(2rem+env(safe-area-inset-bottom))] select-none min-h-[100dvh] ${s.container}`}>
             <div className="flex-1 flex flex-col items-center justify-center">
                <div className={`mb-6 transition-all ${step === 2 ? 'scale-110' : ''} ${step === 1 ? s.icon : "text-green-500"}`}>
                     <Icon name={step === 1 ? "lock" : "check"} size={48} />
                </div>
                <div className={`flex gap-6 h-4 items-center justify-center mb-8 ${error ? "animate-[shake_0.5s_ease-in-out]" : ""}`}>
                    {Array.from({ length: PIN_LENGTH }).map((_, i) => (
                        <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${i < (step === 1 ? pin.length : confirmPin.length) ? s.dotActive : s.dotInactive}`} />
                    ))}
                </div>
                <p className={`text-sm font-medium tracking-wide uppercase transition-all ${error ? "text-red-500" : s.subText}`}>
                    {error || (step === 1 ? "Create 4-digit PIN" : "Confirm PIN")}
                </p>
            </div>
            <div className="px-8 pb-4 w-full max-w-sm mx-auto">
                <div className="grid grid-cols-3 gap-x-8 gap-y-6">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                        <button key={n} onClick={() => handleNumClick(n.toString())} className={`w-20 h-20 mx-auto rounded-full text-3xl font-light flex items-center justify-center transition-all active:scale-95 outline-none ${s.keypad}`}>{n}</button>
                    ))}
                    <div className="w-20 h-20 mx-auto flex items-center justify-center">
                         <button onClick={onCancel} className={`text-xs font-bold tracking-widest uppercase transition-colors py-4 ${s.keypadAction}`}>Cancel</button>
                    </div>
                    <button onClick={() => handleNumClick("0")} className={`w-20 h-20 mx-auto rounded-full text-3xl font-light flex items-center justify-center transition-all active:scale-95 outline-none ${s.keypad}`}>0</button>
                    <button onClick={() => step === 1 ? setPin(p => p.slice(0, -1)) : setConfirmPin(p => p.slice(0, -1))} className={`w-20 h-20 mx-auto rounded-full active:scale-90 flex items-center justify-center transition-all outline-none ${s.keypadAction}`}><Icon name="arrowLeft" size={28} /></button>
                </div>
            </div>
        </div>
    );
}
