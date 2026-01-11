import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  // App identity (must match Java package)
  appId: "com.cloudpad.app",
  appName: "CloudPad",

  // React/Vite build output
  webDir: "dist",

  // Prevent Capacitor from wiping Android folder on sync
  android: {
    path: "android",
  },

  // Required for OAuth, Google Sign-In, and secure WebView behavior
  server: {
    androidScheme: "https",

    // Uncomment ONLY for local dev with live reload
    // url: 'http://192.168.1.100:5173',
    // cleartext: true,
  },

  // Improves keyboard behavior on Android
  plugins: {
    Keyboard: {
      resize: "body",
      style: "dark",
      resizeOnFullScreen: true,
    },
  },
};

export default config;
