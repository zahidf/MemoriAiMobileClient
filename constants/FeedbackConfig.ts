import Constants from "expo-constants";

export const FEEDBACK_CONFIG = {
  BREVO_API_KEY: Constants.expoConfig?.extra?.BREVO_API_KEY,

  SENDER_EMAIL: "noreply@memori-ai.com",
  SENDER_NAME: "MemoriAI App",

  // Email where feedback will be sent
  RECIPIENT_EMAIL: Constants.expoConfig?.extra?.FEEDBACK_EMAIL,
  RECIPIENT_NAME: "Zahid Faqiri",

  FEEDBACK_ROUTING: {
    bug: Constants.expoConfig?.extra?.FEEDBACK_EMAIL,
    crash: Constants.expoConfig?.extra?.FEEDBACK_EMAIL,
    feature: Constants.expoConfig?.extra?.FEEDBACK_EMAIL,
    improvement: Constants.expoConfig?.extra?.FEEDBACK_EMAIL,
    ui: Constants.expoConfig?.extra?.FEEDBACK_EMAIL,
    performance: Constants.expoConfig?.extra?.FEEDBACK_EMAIL,
    content: Constants.expoConfig?.extra?.FEEDBACK_EMAIL,
    other: Constants.expoConfig?.extra?.FEEDBACK_EMAIL,
  },
};
