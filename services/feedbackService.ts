import { FEEDBACK_CONFIG } from "@/constants/FeedbackConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BREVO_API_KEY = FEEDBACK_CONFIG.BREVO_API_KEY;
const SENDER_EMAIL = FEEDBACK_CONFIG.SENDER_EMAIL;
const RECIPIENT_EMAIL = FEEDBACK_CONFIG.RECIPIENT_EMAIL;

export interface FeedbackData {
  type: string;
  message: string;
  email?: string;
  deviceInfo: {
    platform: string;
    screenSize: string;
    timestamp: string;
    appVersion?: string;
    userAgent?: string;
  };
  userInfo?: {
    userId?: string;
    userName?: string;
  };
}

export interface FeedbackType {
  id: string;
  label: string;
  color: string;
  priority: "low" | "medium" | "high" | "urgent";
}

export const FEEDBACK_TYPES: FeedbackType[] = [
  {
    id: "bug",
    label: "🐛 Bug Report",
    color: "#ff4757",
    priority: "high",
  },
  {
    id: "crash",
    label: "💥 App Crash",
    color: "#ff3838",
    priority: "urgent",
  },
  {
    id: "feature",
    label: "💡 Feature Request",
    color: "#2ed573",
    priority: "medium",
  },
  {
    id: "improvement",
    label: "⚡ Improvement",
    color: "#ffa502",
    priority: "medium",
  },
  {
    id: "ui",
    label: "🎨 UI/UX Issue",
    color: "#ff6348",
    priority: "medium",
  },
  {
    id: "performance",
    label: "🚀 Performance",
    color: "#ff9ff3",
    priority: "high",
  },
  {
    id: "content",
    label: "📝 Content Issue",
    color: "#54a0ff",
    priority: "low",
  },
  {
    id: "other",
    label: "💬 General Feedback",
    color: "#3742fa",
    priority: "low",
  },
];

export class FeedbackService {
  private static instance: FeedbackService;
  private apiKey: string;
  private senderEmail: string;
  private recipientEmail: string;

  private constructor() {
    this.apiKey = BREVO_API_KEY;
    this.senderEmail = SENDER_EMAIL;
    this.recipientEmail = RECIPIENT_EMAIL;
  }

  public static getInstance(): FeedbackService {
    if (!FeedbackService.instance) {
      FeedbackService.instance = new FeedbackService();
    }
    return FeedbackService.instance;
  }

  /**
   * Submit feedback via Brevo API
   */
  async submitFeedback(data: FeedbackData): Promise<boolean> {
    try {
      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": this.apiKey,
        },
        body: JSON.stringify(this.buildEmailPayload(data)),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Brevo API Error:", {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        });
        throw new Error(`Failed to send email: ${response.status}`);
      }

      console.log("Feedback sent successfully");
      return true;
    } catch (error) {
      console.error("Feedback submission error:", error);

      // Fallback: Try to save locally for later retry
      this.saveFeedbackForRetry(data);
      throw error;
    }
  }

  /**
   * Build email payload for Brevo API
   */
  private buildEmailPayload(data: FeedbackData) {
    const feedbackType = FEEDBACK_TYPES.find((t) => t.id === data.type);
    const subject = this.generateSubject(data, feedbackType);

    return {
      sender: {
        name: "MemoriAI App",
        email: this.senderEmail,
      },
      to: [
        {
          email: this.recipientEmail,
          name: "Zahid Faqiri",
        },
      ],
      subject,
      htmlContent: this.generateHTMLContent(data, feedbackType),
      textContent: this.generateTextContent(data, feedbackType),
      tags: [
        "memoriai-feedback",
        `type-${data.type}`,
        `priority-${feedbackType?.priority || "medium"}`,
      ],
      // Add custom headers for better tracking
      headers: {
        "X-Feedback-Type": data.type,
        "X-App-Platform": data.deviceInfo.platform,
        "X-Feedback-Priority": feedbackType?.priority || "medium",
      },
    };
  }

  /**
   * Generate email subject
   */
  private generateSubject(
    data: FeedbackData,
    feedbackType?: FeedbackType
  ): string {
    const priority =
      feedbackType?.priority === "urgent"
        ? "[URGENT] "
        : feedbackType?.priority === "high"
        ? "[HIGH] "
        : "";

    const typeLabel =
      feedbackType?.label.replace(/[🐛💥💡⚡🎨🚀📝💬]/g, "").trim() ||
      "Feedback";

    return `${priority}MemoriAI Mobile: ${typeLabel}`;
  }

  /**
   * Generate HTML email content
   */
  private generateHTMLContent(
    data: FeedbackData,
    feedbackType?: FeedbackType
  ): string {
    const priorityBadge = this.getPriorityBadge(
      feedbackType?.priority || "medium"
    );

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>MemoriAI Feedback</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8f9fa;">
          <div style="max-width: 600px; margin: 0 auto; background: white; box-shadow: 0 0 20px rgba(0,0,0,0.1);">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">
                MemoriAI Feedback Report
              </h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">
                Mobile App Feedback System
              </p>
            </div>

            <!-- Content -->
            <div style="padding: 30px;">
              
              <!-- Type & Priority -->
              <div style="background: #f8f9fa; padding: 20px; border-radius: 12px; margin-bottom: 25px; border-left: 4px solid ${
                feedbackType?.color || "#667eea"
              };">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                  <h2 style="margin: 0; font-size: 20px; color: ${
                    feedbackType?.color || "#333"
                  };">
                    ${feedbackType?.label || data.type}
                  </h2>
                  ${priorityBadge}
                </div>
                <p style="margin: 0; color: #666; font-size: 14px;">
                  <strong>Submitted:</strong> ${new Date(
                    data.deviceInfo.timestamp
                  ).toLocaleString()}
                </p>
                ${
                  data.email
                    ? `
                  <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">
                    <strong>Contact:</strong> <a href="mailto:${data.email}" style="color: #667eea; text-decoration: none;">${data.email}</a>
                  </p>
                `
                    : ""
                }
              </div>

              <!-- Message -->
              <div style="background: white; padding: 25px; border: 2px solid #e9ecef; border-radius: 12px; margin-bottom: 25px;">
                <h3 style="margin: 0 0 15px 0; color: #495057; font-size: 18px;">Feedback Message</h3>
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea;">
                  <p style="margin: 0; white-space: pre-wrap; font-size: 16px; line-height: 1.6;">${this.escapeHtml(
                    data.message
                  )}</p>
                </div>
              </div>

              <!-- Technical Details -->
              <div style="background: #e9ecef; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
                <h3 style="margin: 0 0 15px 0; color: #495057; font-size: 16px;">📱 Technical Information</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 14px;">
                  <div><strong>Platform:</strong> ${
                    data.deviceInfo.platform
                  }</div>
                  <div><strong>Screen Size:</strong> ${
                    data.deviceInfo.screenSize
                  }</div>
                  ${
                    data.deviceInfo.appVersion
                      ? `<div><strong>App Version:</strong> ${data.deviceInfo.appVersion}</div>`
                      : ""
                  }
                  ${
                    data.userInfo?.userId
                      ? `<div><strong>User ID:</strong> ${data.userInfo.userId}</div>`
                      : ""
                  }
                </div>
              </div>

              <!-- User Information -->
              ${
                data.userInfo
                  ? `
                <div style="background: #e3f2fd; padding: 20px; border-radius: 12px; margin-bottom: 20px; border-left: 4px solid #2196f3;">
                  <h3 style="margin: 0 0 15px 0; color: #1976d2; font-size: 16px;">👤 User Information</h3>
                  <div style="font-size: 14px;">
                    ${
                      data.userInfo.userName
                        ? `<div><strong>Name:</strong> ${data.userInfo.userName}</div>`
                        : ""
                    }
                    ${
                      data.userInfo.userId
                        ? `<div><strong>User ID:</strong> ${data.userInfo.userId}</div>`
                        : ""
                    }
                  </div>
                </div>
              `
                  : ""
              }

              <!-- Actions -->
              <div style="text-align: center; padding-top: 20px; border-top: 1px solid #dee2e6;">
                <p style="margin: 0; color: #6c757d; font-size: 14px;">
                  This feedback was automatically generated by the MemoriAI mobile app.
                </p>
                ${
                  data.email
                    ? `
                  <div style="margin-top: 15px;">
                    <a href="mailto:${data.email}?subject=Re: Your MemoriAI Feedback" 
                       style="display: inline-block; background: #667eea; color: white; padding: 10px 20px; 
                              text-decoration: none; border-radius: 6px; font-weight: 500;">
                      Reply to User
                    </a>
                  </div>
                `
                    : ""
                }
              </div>

            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Generate plain text email content
   */
  private generateTextContent(
    data: FeedbackData,
    feedbackType?: FeedbackType
  ): string {
    return `
MemoriAI Mobile App Feedback Report

Type: ${feedbackType?.label || data.type}
Priority: ${feedbackType?.priority.toUpperCase() || "MEDIUM"}
Submitted: ${new Date(data.deviceInfo.timestamp).toLocaleString()}
${data.email ? `Contact: ${data.email}` : ""}

FEEDBACK MESSAGE:
${data.message}

TECHNICAL INFORMATION:
Platform: ${data.deviceInfo.platform}
Screen Size: ${data.deviceInfo.screenSize}
${
  data.deviceInfo.appVersion ? `App Version: ${data.deviceInfo.appVersion}` : ""
}

USER INFORMATION:
${data.userInfo?.userName ? `Name: ${data.userInfo.userName}` : ""}
${data.userInfo?.userId ? `User ID: ${data.userInfo.userId}` : ""}

---
This feedback was automatically generated by the MemoriAI mobile app.
    `.trim();
  }

  /**
   * Get priority badge HTML
   */
  private getPriorityBadge(priority: string): string {
    const badges = {
      urgent:
        '<span style="background: #ff3838; color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 600; text-transform: uppercase;">🚨 URGENT</span>',
      high: '<span style="background: #ff4757; color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 600; text-transform: uppercase;">⚠️ HIGH</span>',
      medium:
        '<span style="background: #ffa502; color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 600; text-transform: uppercase;">📋 MEDIUM</span>',
      low: '<span style="background: #2ed573; color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 600; text-transform: uppercase;">📝 LOW</span>',
    };
    return badges[priority as keyof typeof badges] || badges.medium;
  }

  /**
   * Escape HTML characters
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /**
   * Save feedback locally for retry (fallback mechanism)
   */
  private async saveFeedbackForRetry(data: FeedbackData): Promise<void> {
    try {
      const existingFeedback = await AsyncStorage.getItem("pending_feedback");
      const pending = existingFeedback ? JSON.parse(existingFeedback) : [];

      pending.push({
        ...data,
        retryCount: 0,
        savedAt: new Date().toISOString(),
        id: Date.now().toString(), // Simple ID for tracking
      });

      await AsyncStorage.setItem("pending_feedback", JSON.stringify(pending));
      console.log("Feedback saved locally for retry");
    } catch (error) {
      console.error("Failed to save feedback locally:", error);
    }
  }

  /**
   * Retry sending failed feedback
   */
  async retryPendingFeedback(): Promise<void> {
    try {
      const existingFeedback = await AsyncStorage.getItem("pending_feedback");
      if (!existingFeedback) return;

      const pending = JSON.parse(existingFeedback);
      const successful: number[] = [];

      for (let i = 0; i < pending.length; i++) {
        const feedback = pending[i];

        // Skip if too many retry attempts
        if (feedback.retryCount >= 3) {
          successful.push(i);
          continue;
        }

        try {
          // Remove retry-specific fields before sending
          const { retryCount, savedAt, id, ...feedbackData } = feedback;
          await this.submitFeedback(feedbackData);
          successful.push(i);
          console.log(`Successfully retried feedback ${i}`);
        } catch (error) {
          feedback.retryCount++;
          console.log(
            `Retry failed for feedback ${i}, attempts: ${feedback.retryCount}`
          );
        }
      }

      // Remove successful feedback
      const remaining = pending.filter(
        (_: any, index: number) => !successful.includes(index)
      );
      await AsyncStorage.setItem("pending_feedback", JSON.stringify(remaining));

      console.log(
        `Retry complete: ${successful.length} successful, ${remaining.length} remaining`
      );
    } catch (error) {
      console.error("Failed to retry pending feedback:", error);
    }
  }

  /**
   * Get pending feedback count
   */
  async getPendingFeedbackCount(): Promise<number> {
    try {
      const existingFeedback = await AsyncStorage.getItem("pending_feedback");
      if (!existingFeedback) return 0;

      const pending = JSON.parse(existingFeedback);
      return pending.length;
    } catch (error) {
      console.error("Failed to get pending feedback count:", error);
      return 0;
    }
  }

  /**
   * Clear all pending feedback (for debugging/admin purposes)
   */
  async clearPendingFeedback(): Promise<void> {
    try {
      await AsyncStorage.removeItem("pending_feedback");
      console.log("Cleared all pending feedback");
    } catch (error) {
      console.error("Failed to clear pending feedback:", error);
    }
  }

  /**
   * Get all pending feedback (for debugging/admin purposes)
   */
  async getPendingFeedback(): Promise<any[]> {
    try {
      const existingFeedback = await AsyncStorage.getItem("pending_feedback");
      if (!existingFeedback) return [];

      return JSON.parse(existingFeedback);
    } catch (error) {
      console.error("Failed to get pending feedback:", error);
      return [];
    }
  }

  /**
   * Validate feedback data
   */
  validateFeedback(data: Partial<FeedbackData>): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!data.message || data.message.trim().length < 10) {
      errors.push("Message must be at least 10 characters long");
    }

    if (data.message && data.message.trim().length > 5000) {
      errors.push("Message cannot exceed 5000 characters");
    }

    if (!data.type || !FEEDBACK_TYPES.find((t) => t.id === data.type)) {
      errors.push("Please select a valid feedback type");
    }

    if (data.email && !this.isValidEmail(data.email)) {
      errors.push("Please enter a valid email address");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Configure API credentials (for updating at runtime)
   */
  configure(config: {
    apiKey?: string;
    senderEmail?: string;
    recipientEmail?: string;
  }): void {
    if (config.apiKey) this.apiKey = config.apiKey;
    if (config.senderEmail) this.senderEmail = config.senderEmail;
    if (config.recipientEmail) this.recipientEmail = config.recipientEmail;

    console.log("Feedback service configured with new credentials");
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch("https://api.brevo.com/v3/account", {
        method: "GET",
        headers: {
          "api-key": this.apiKey,
        },
      });

      const isConnected = response.ok;
      console.log(
        "Brevo API connection test:",
        isConnected ? "SUCCESS" : "FAILED"
      );

      if (!isConnected) {
        const errorData = await response.json().catch(() => ({}));
        console.error("API connection test error:", errorData);
      }

      return isConnected;
    } catch (error) {
      console.error("API connection test failed:", error);
      return false;
    }
  }

  /**
   * Get service status and statistics
   */
  async getServiceStatus(): Promise<{
    isConfigured: boolean;
    apiConnected: boolean;
    pendingCount: number;
    lastError?: string;
  }> {
    const isConfigured = !!(
      this.apiKey &&
      this.senderEmail &&
      this.recipientEmail
    );
    const apiConnected = isConfigured ? await this.testConnection() : false;
    const pendingCount = await this.getPendingFeedbackCount();

    return {
      isConfigured,
      apiConnected,
      pendingCount,
    };
  }

  /**
   * Send a test feedback message
   */
  async sendTestFeedback(): Promise<boolean> {
    const testData: FeedbackData = {
      type: "other",
      message:
        "This is a test feedback message to verify the feedback system is working correctly.",
      email: "test@example.com",
      deviceInfo: {
        platform: "Test Environment",
        screenSize: "375x812",
        timestamp: new Date().toISOString(),
        appVersion: "1.0.0-test",
      },
      userInfo: {
        userId: "test-user-123",
        userName: "Test User",
      },
    };

    try {
      await this.submitFeedback(testData);
      console.log("Test feedback sent successfully");
      return true;
    } catch (error) {
      console.error("Test feedback failed:", error);
      return false;
    }
  }
}

// Export singleton instance
export const feedbackService = FeedbackService.getInstance();

// Export utility functions
export const submitFeedback = (data: FeedbackData) =>
  feedbackService.submitFeedback(data);
export const validateFeedback = (data: Partial<FeedbackData>) =>
  feedbackService.validateFeedback(data);
export const retryPendingFeedback = () =>
  feedbackService.retryPendingFeedback();
export const getPendingFeedbackCount = () =>
  feedbackService.getPendingFeedbackCount();
export const testFeedbackConnection = () => feedbackService.testConnection();
export const sendTestFeedback = () => feedbackService.sendTestFeedback();
