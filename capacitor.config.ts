import type { CapacitorConfig } from "@capacitor/cli";

// IMPORTANT: after you deploy to Vercel, replace server.url below with your
// production URL (e.g. "https://sangam.vercel.app") and rebuild the APK.
// This is the one line that ties the Android app to your live site.
const config: CapacitorConfig = {
  appId: "com.sangam.app",
  appName: "Sangam",
  webDir: "capacitor/www",
  server: {
    url: "https://REPLACE-WITH-YOUR-VERCEL-URL.vercel.app",
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
  },
};

export default config;
