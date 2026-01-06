import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cloudpad.app',
  appName: 'CloudPad',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  android: {
    path: 'android'
  },
  // Ensure we are targeting strict stable versions
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
