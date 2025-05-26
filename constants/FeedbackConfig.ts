import { BREVO_API_KEY, FEEDBACK_EMAIL } from "@env";

console.log("=== FEEDBACK CONFIG DEBUG ===");
console.log("BREVO_API_KEY:", BREVO_API_KEY);
console.log("FEEDBACK_EMAIL:", FEEDBACK_EMAIL);
console.log("============================");

export const FEEDBACK_CONFIG = {
  BREVO_API_KEY,

  SENDER_EMAIL: "noreply@memori-ai.com",
  SENDER_NAME: "MemoriAI App",

  // Email where feedback will be sent
  RECIPIENT_EMAIL: FEEDBACK_EMAIL,
  RECIPIENT_NAME: "Zahid Faqiri",

  FEEDBACK_ROUTING: {
    bug: FEEDBACK_EMAIL,
    crash: FEEDBACK_EMAIL,
    feature: FEEDBACK_EMAIL,
    improvement: FEEDBACK_EMAIL,
    ui: FEEDBACK_EMAIL,
    performance: FEEDBACK_EMAIL,
    content: FEEDBACK_EMAIL,
    other: FEEDBACK_EMAIL,
  },
};
