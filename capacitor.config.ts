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
      scopes: ['profile', 'email', 'https://www.googleapis.com/auth/drive.file'],
      serverClientId: '208175085130-1g95j5f3r0s3df2mui0jmltu4jj0ffln.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;