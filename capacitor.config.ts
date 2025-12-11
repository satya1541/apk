import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.toxishield.app',
  appName: 'ToxiShield-X',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
    url: 'https://gmr.thynxai.cloud'
  },
  plugins: {
    CapacitorHttp: {
      enabled: true
    }
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystorePassword: undefined,
      keystoreAlias: undefined,
      keystoreAliasPassword: undefined,
      signingType: 'apksigner'
    }
  }
};

export default config;
