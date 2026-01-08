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
      serverClientId: '208175085130-iobgi82bd5dqi1n7pu9udt11ie2h92bb.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;