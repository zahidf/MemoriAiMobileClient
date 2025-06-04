export default {
  expo: {
    name: "MemoriAI",
    slug: "MemoriAiMobileClient",
    version: "1.0.4",
    orientation: "portrait",
    scheme: "memoriai",
    icon: "./assets/icons/splash-icon-dark.png",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.zahidf.memoriai",
      buildNumber: "1",
      icon: {
        dark: "./assets/icons/ios-dark.png",
        light: "./assets/icons/ios-light.png",
        tinted: "./assets/icons/ios-tinted.png"
      },
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSPhotoLibraryUsageDescription: "This app needs access to photo library to allow you to upload images for flashcard creation.",
        NSCameraUsageDescription: "This app needs access to camera to allow you to take photos for flashcard creation.",
        NSMicrophoneUsageDescription: "This app needs access to microphone for voice notes and audio features."
      },
      config: {
        googleSignIn: {
          reservedClientId: process.env.GOOGLE_IOS_CLIENT_ID
        }
      }
    },
    plugins: [
      "expo-router",
      "expo-sqlite",
      [
        "@react-native-google-signin/google-signin",
        {
          iosUrlScheme: `com.googleusercontent.apps.${process.env.GOOGLE_IOS_CLIENT_ID_SUFFIX}`
        }
      ],
      [
        "expo-splash-screen",
        {
          image: "./assets/icons/splash-icon-dark.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
          dark: {
            image: "./assets/icons/splash-icon-light.png",
            backgroundColor: "#000000"
          }
        }
      ]
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      router: {},
      eas: {
        projectId: "dc329b54-f841-44fb-b5f9-d62a728eadf6"
      },
      GOOGLE_WEB_CLIENT_ID: process.env.GOOGLE_WEB_CLIENT_ID,
      GOOGLE_IOS_CLIENT_ID: process.env.GOOGLE_IOS_CLIENT_ID,
      GOOGLE_IOS_CLIENT_ID_SUFFIX: process.env.GOOGLE_IOS_CLIENT_ID_SUFFIX,
      BREVO_API_KEY: process.env.BREVO_API_KEY, // Server-side only
      FEEDBACK_EMAIL: process.env.FEEDBACK_EMAIL // Server-side only
    },
    owner: "zahidf"
  }
};