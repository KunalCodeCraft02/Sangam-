import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.sangam.app",
  appName: "Sangam",
  webDir: "capacitor/www",
  server: {
    url: "https://sangam-phi.vercel.app",
    cleartext: false,
  },
  android: {
    backgroundColor: "#fdf6ec",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: "#fdf6ec",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
    StatusBar: {
      overlaysWebView: false,
      style: "DARK",
      backgroundColor: "#ff9933",
    },
    LocalNotifications: {
      iconColor: "#ff9933",
    },
  },
};

export default config;
