import { APP_CONFIG } from "@/constants/AppConfig";

console.log("=== FEEDBACK CONFIG DEBUG ===");
console.log("BREVO_API_KEY:", APP_CONFIG.BREVO_API_KEY);
console.log("FEEDBACK_EMAIL:", APP_CONFIG.FEEDBACK_EMAIL);
console.log("============================");

export const FEEDBACK_CONFIG = {
  BREVO_API_KEY: APP_CONFIG.BREVO_API_KEY,

  SENDER_EMAIL: "noreply@memori-ai.com",
  SENDER_NAME: "MemoriAI App",

  // Email where feedback will be sent
  RECIPIENT_EMAIL: APP_CONFIG.FEEDBACK_EMAIL,
  RECIPIENT_NAME: "Zahid Faqiri",

  FEEDBACK_ROUTING: {
    bug: APP_CONFIG.FEEDBACK_EMAIL,
    crash: APP_CONFIG.FEEDBACK_EMAIL,
    feature: APP_CONFIG.FEEDBACK_EMAIL,
    improvement: APP_CONFIG.FEEDBACK_EMAIL,
    ui: APP_CONFIG.FEEDBACK_EMAIL,
    performance: APP_CONFIG.FEEDBACK_EMAIL,
    content: APP_CONFIG.FEEDBACK_EMAIL,
    other: APP_CONFIG.FEEDBACK_EMAIL,
  },
};