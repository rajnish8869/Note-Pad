import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Robustly suppress benign ResizeObserver errors
const RO_IGNORE_PATTERNS = [
  'ResizeObserver loop completed with undelivered notifications',
  'ResizeObserver loop limit exceeded'
];

const isResizeObserverError = (err: any): boolean => {
  if (!err) return false;
  const msg = (typeof err === 'string' ? err : err.message || '').toString();
  return RO_IGNORE_PATTERNS.some(pattern => msg.includes(pattern));
};

// 1. Patch console.error (for React's error logging)
const originalConsoleError = console.error;
console.error = (...args) => {
  if (args.some(arg => isResizeObserverError(arg))) return;
  originalConsoleError(...args);
};

// 2. Global error event listener (for runtime exceptions)
window.addEventListener('error', (event) => {
  if (isResizeObserverError(event.message) || (event.error && isResizeObserverError(event.error))) {
    event.stopImmediatePropagation();
    event.preventDefault();
  }
});

// 3. window.onerror (legacy/fallback backup)
const originalOnError = window.onerror;
window.onerror = (message, source, lineno, colno, error) => {
  if (isResizeObserverError(message) || isResizeObserverError(error)) {
    return true; // Returns true to prevent firing the default event handler
  }
  if (originalOnError) {
    // @ts-ignore
    return originalOnError(message, source, lineno, colno, error);
  }
  return false;
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);