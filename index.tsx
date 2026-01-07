import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { Capacitor } from '@capacitor/core';
import { defineCustomElements as jeepSqlite } from 'jeep-sqlite/loader';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const initializeApp = async () => {
    // Web Specific: Manual Injection of jeep-sqlite
    // We inject the element AFTER registering the custom element to avoid "unknown host element" errors
    // that occur when the element exists in HTML before the Stencil runtime is ready.
    if (Capacitor.getPlatform() === 'web') {
        // 1. Define the custom elements
        jeepSqlite(window);
        
        // 2. Create the element
        const jeepEl = document.createElement('jeep-sqlite');
        jeepEl.setAttribute('auto-save', 'true');
        jeepEl.setAttribute('wasm-path', 'https://unpkg.com/sql.js@1.12.0/dist/');
        
        // 3. Append to body
        document.body.appendChild(jeepEl);
        
        // 4. Wait for it to be defined
        await customElements.whenDefined('jeep-sqlite');
        
        // 5. Small delay to ensure hydration/internal init
        await new Promise(resolve => setTimeout(resolve, 150));
    }

    // Mount React App
    const root = ReactDOM.createRoot(rootElement);
    root.render(
        <App />
    );
};

initializeApp();