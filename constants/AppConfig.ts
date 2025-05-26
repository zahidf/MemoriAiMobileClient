import Constants from "expo-constants";

const getAppInfo = () => {
  const expoConfig = Constants.expoConfig;
  const manifest = Constants.manifest2?.extra?.expoClient || Constants.manifest;

  return {
    APP_ID: "memoriai-mobile",
    APP_NAME: expoConfig?.name || "MemoriAI",
    APP_PLATFORM: "React Native",
    APP_ENVIRONMENT: __DEV__ ? "development" : "production",
    APP_VERSION: expoConfig?.version || "1.0.0",
    APP_BUNDLE_ID: expoConfig?.ios?.bundleIdentifier || "unknown",
    APP_BUILD_NUMBER:
      expoConfig?.ios?.buildNumber ||
      expoConfig?.android?.versionCode?.toString() ||
      "1",
    APP_SLUG: expoConfig?.slug || "memoriai",
    APP_SCHEME: Array.isArray(expoConfig?.scheme)
      ? expoConfig.scheme[0]
      : expoConfig?.scheme || "memoriai",
    APP_OWNER: expoConfig?.owner || "zahidf",
    EAS_PROJECT_ID: expoConfig?.extra?.eas?.projectId,
  };
};

export const APP_CONFIG = getAppInfo();

if (__DEV__) {
  console.log("App Configuration:", APP_CONFIG);
}
