import { IconSymbol } from "@/components/ui/IconSymbol";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { PanGestureHandler } from "react-native-gesture-handler";
import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { getCurrentUser } from "../services/authService";
import {
  FEEDBACK_TYPES,
  feedbackService,
  validateFeedback,
  type FeedbackData,
} from "../services/feedbackService";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

const BUTTON_SIZE = 56;
const MARGIN = 20;

interface FeedbackButtonProps {
  isVisible?: boolean; // New prop to control visibility
}

export default function FeedbackButton({
  isVisible = true,
}: FeedbackButtonProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  // Animation values for dragging
  const translateX = useSharedValue(screenWidth - BUTTON_SIZE - MARGIN);
  const translateY = useSharedValue(screenHeight / 2);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(isVisible ? 1 : 0);

  // Modal state
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Form state
  const [feedbackType, setFeedbackType] = useState("bug");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  // User info
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Update opacity when visibility changes
  useEffect(() => {
    opacity.value = withTiming(isVisible ? 1 : 0, { duration: 300 });
  }, [isVisible, opacity]);

  useEffect(() => {
    if (isVisible) {
      loadUserInfo();
      loadPendingCount();

      // Retry pending feedback on app start
      feedbackService.retryPendingFeedback();
    }
  }, [isVisible]);

  const loadUserInfo = async () => {
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);
      if (user?.email) {
        setEmail(user.email);
      }
    } catch (error) {
      console.log("Could not load user info:", error);
    }
  };

  const loadPendingCount = async () => {
    try {
      const count = await feedbackService.getPendingFeedbackCount();
      setPendingCount(count);
    } catch (error) {
      console.log("Could not load pending feedback count:", error);
    }
  };

  // Drag gesture handler
  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, context: any) => {
      if (!isVisible) return;
      context.startX = translateX.value;
      context.startY = translateY.value;
      scale.value = withSpring(0.95);
    },
    onActive: (event, context) => {
      if (!isVisible) return;
      translateX.value = context.startX + event.translationX;
      translateY.value = context.startY + event.translationY;
    },
    onEnd: () => {
      if (!isVisible) return;
      scale.value = withSpring(1);

      // Snap to edges
      const snapToLeft = translateX.value < screenWidth / 2;
      translateX.value = withSpring(
        snapToLeft ? MARGIN : screenWidth - BUTTON_SIZE - MARGIN
      );

      // Keep within screen bounds
      if (translateY.value < 100) {
        translateY.value = withSpring(100);
      } else if (translateY.value > screenHeight - BUTTON_SIZE - 100) {
        translateY.value = withSpring(screenHeight - BUTTON_SIZE - 100);
      }
    },
  });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
      opacity: opacity.value,
      pointerEvents: isVisible ? "auto" : "none",
    };
  });

  const handlePress = () => {
    if (!isVisible) return;
    setIsModalVisible(true);
    setErrors([]);
  };

  const resetForm = () => {
    setMessage("");
    if (!currentUser?.email) {
      setEmail("");
    }
    setFeedbackType("bug");
    setErrors([]);
  };

  const submitFeedback = async () => {
    const feedbackData: Partial<FeedbackData> = {
      type: feedbackType,
      message: message.trim(),
      email: email.trim() || undefined,
    };

    // Validate input
    const validation = validateFeedback(feedbackData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setIsSubmitting(true);
    setErrors([]);

    try {
      const fullFeedbackData: FeedbackData = {
        ...(feedbackData as FeedbackData),
        deviceInfo: {
          platform:
            Platform.OS === "ios"
              ? "iOS"
              : Platform.OS === "android"
              ? "Android"
              : "Web",
          screenSize: `${screenWidth}x${screenHeight}`,
          timestamp: new Date().toISOString(),
          appVersion: "1.0.0", // You can get this from app.json or package.json
        },
        userInfo: currentUser
          ? {
              userId: currentUser.id?.toString(),
              userName: currentUser.name,
            }
          : undefined,
      };

      await feedbackService.submitFeedback(fullFeedbackData);

      Alert.alert(
        "Thank you! 🎉",
        "Your feedback has been sent successfully. We appreciate your input and will review it carefully!",
        [
          {
            text: "OK",
            onPress: () => {
              setIsModalVisible(false);
              resetForm();
              loadPendingCount(); // Refresh pending count
            },
          },
        ]
      );
    } catch (error) {
      console.error("Feedback submission error:", error);

      Alert.alert(
        "Feedback Saved",
        "We couldn't send your feedback right now, but we've saved it and will try again later. Thank you!",
        [
          {
            text: "OK",
            onPress: () => {
              setIsModalVisible(false);
              resetForm();
              loadPendingCount(); // Refresh pending count
            },
          },
        ]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Always render the component, but control visibility with animations
  return (
    <>
      {/* Floating Feedback Button */}
      <PanGestureHandler onGestureEvent={gestureHandler}>
        <Animated.View style={[styles.floatingButton, animatedStyle]}>
          <TouchableOpacity
            style={[
              styles.buttonTouchable,
              {
                backgroundColor: colors.tint,
                shadowColor: colors.tint,
              },
            ]}
            onPress={handlePress}
            activeOpacity={0.8}
            disabled={!isVisible}
          >
            <IconSymbol name="envelope.fill" size={24} color="white" />
            {pendingCount > 0 && (
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>{pendingCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>
      </PanGestureHandler>

      {/* Feedback Modal - Only show when visible and modal is open */}
      {isVisible && (
        <Modal
          visible={isModalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setIsModalVisible(false)}
        >
          <View
            style={[
              styles.modalContainer,
              { backgroundColor: colors.background },
            ]}
          >
            {/* Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setIsModalVisible(false)}
              >
                <IconSymbol name="xmark" size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Send Feedback
              </Text>
              <View style={styles.headerSpacer} />
            </View>

            <ScrollView
              style={styles.modalContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Error Messages */}
              {errors.length > 0 && (
                <View style={styles.errorContainer}>
                  {errors.map((error, index) => (
                    <Text key={index} style={styles.errorText}>
                      • {error}
                    </Text>
                  ))}
                </View>
              )}

              {/* Feedback Type Selection */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  What type of feedback is this? *
                </Text>
                <View style={styles.typeContainer}>
                  {FEEDBACK_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type.id}
                      style={[
                        styles.typeButton,
                        {
                          backgroundColor:
                            feedbackType === type.id
                              ? type.color + "15"
                              : colors.background,
                          borderColor:
                            feedbackType === type.id
                              ? type.color
                              : colors.text + "20",
                        },
                      ]}
                      onPress={() => setFeedbackType(type.id)}
                    >
                      <Text
                        style={[
                          styles.typeButtonText,
                          {
                            color:
                              feedbackType === type.id
                                ? type.color
                                : colors.text + "70",
                          },
                        ]}
                      >
                        {type.label}
                      </Text>
                      {type.priority === "urgent" && (
                        <Text style={styles.urgentLabel}>🚨</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Message Input */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Tell us more *
                </Text>
                <Text
                  style={[
                    styles.sectionSubtitle,
                    { color: colors.text + "60" },
                  ]}
                >
                  Please provide as much detail as possible. Include steps to
                  reproduce if reporting a bug.
                </Text>
                <TextInput
                  style={[
                    styles.messageInput,
                    {
                      backgroundColor: colors.background,
                      borderColor: errors.some((e) => e.includes("Message"))
                        ? "#ff4757"
                        : colors.text + "20",
                      color: colors.text,
                    },
                  ]}
                  placeholder="Describe the issue, suggestion, or feedback in detail..."
                  placeholderTextColor={colors.text + "50"}
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />
                <Text
                  style={[styles.characterCount, { color: colors.text + "50" }]}
                >
                  {message.length} characters (minimum 10)
                </Text>
              </View>

              {/* Email Input */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Email {currentUser?.email ? "(optional)" : "*"}
                </Text>
                <Text
                  style={[
                    styles.sectionSubtitle,
                    { color: colors.text + "60" },
                  ]}
                >
                  {currentUser?.email
                    ? "We'll use your account email, but you can override it here"
                    : "We need your email to follow up on your feedback"}
                </Text>
                <TextInput
                  style={[
                    styles.emailInput,
                    {
                      backgroundColor: colors.background,
                      borderColor: errors.some((e) => e.includes("email"))
                        ? "#ff4757"
                        : colors.text + "20",
                      color: colors.text,
                    },
                  ]}
                  placeholder={currentUser?.email || "your.email@example.com"}
                  placeholderTextColor={colors.text + "50"}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* User Info Display */}
              {currentUser && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Account Information
                  </Text>
                  <View
                    style={[
                      styles.userInfoCard,
                      {
                        backgroundColor: colors.text + "05",
                        borderColor: colors.text + "10",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.userInfoText,
                        { color: colors.text + "70" },
                      ]}
                    >
                      Signed in as: {currentUser.name}
                    </Text>
                    <Text
                      style={[
                        styles.userInfoText,
                        { color: colors.text + "70" },
                      ]}
                    >
                      User ID: {currentUser.id}
                    </Text>
                  </View>
                </View>
              )}

              {/* Submit Button */}
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  {
                    backgroundColor: colors.tint,
                    opacity: !message.trim() || isSubmitting ? 0.5 : 1,
                  },
                ]}
                onPress={submitFeedback}
                disabled={!message.trim() || isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <>
                    <IconSymbol
                      name="paperplane.fill"
                      size={20}
                      color="white"
                    />
                    <Text style={styles.submitButtonText}>Send Feedback</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Footer Note */}
              <Text style={[styles.footerNote, { color: colors.text + "50" }]}>
                Your feedback helps us improve MemoriAI. We read every message
                and appreciate your input!
                {pendingCount > 0 &&
                  ` (${pendingCount} feedback messages are queued for retry)`}
              </Text>
            </ScrollView>
          </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  // Floating Button Styles
  floatingButton: {
    position: "absolute",
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    zIndex: 9999,
  },
  buttonTouchable: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    justifyContent: "center",
    alignItems: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    position: "relative",
  },
  pendingBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#ff4757",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "white",
  },
  pendingBadgeText: {
    color: "white",
    fontSize: 10,
    fontWeight: "700",
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.1)",
  },
  closeButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
    flex: 1,
  },
  headerSpacer: {
    width: 40,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },

  // Error Display
  errorContainer: {
    backgroundColor: "#fff5f5",
    borderColor: "#ff4757",
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginVertical: 16,
  },
  errorText: {
    color: "#ff4757",
    fontSize: 14,
    marginBottom: 4,
  },

  // Form Styles
  section: {
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },

  // Type Selection
  typeContainer: {
    gap: 12,
  },
  typeButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: "500",
    flex: 1,
  },
  urgentLabel: {
    fontSize: 16,
  },

  // Input Styles
  messageInput: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 120,
    lineHeight: 22,
  },
  emailInput: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    height: 50,
  },
  characterCount: {
    fontSize: 12,
    marginTop: 4,
    textAlign: "right",
  },

  // User Info
  userInfoCard: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  userInfoText: {
    fontSize: 14,
    marginBottom: 4,
  },

  // Submit Button
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 20,
    gap: 8,
  },
  submitButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },

  // Footer
  footerNote: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 20,
    marginBottom: 40,
    lineHeight: 20,
    paddingHorizontal: 20,
  },
});
