import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { createMockUser, signInWithGoogle } from "../services/authService";
import type { User } from "../types";

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
  onLoginError?: (error: string) => void;
  authError?: string | null;
  useMockAuth?: boolean;
}

export default function LoginScreen({
  onLoginSuccess,
  onLoginError,
  authError,
  useMockAuth = false,
}: LoginScreenProps) {
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);

    try {
      const user = await signInWithGoogle();
      if (user) {
        onLoginSuccess(user);
      } else {
        const errorMsg = "Unable to sign in with Google. Please try again.";
        onLoginError?.(errorMsg);
        Alert.alert("Sign In Failed", errorMsg);
      }
    } catch (error: any) {
      console.error("Login error:", error);
      const errorMsg = error.message || "An error occurred during sign in";
      onLoginError?.(errorMsg);
      Alert.alert("Sign In Error", errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleMockSignIn = async () => {
    if (!useMockAuth) {
      Alert.alert(
        "Not Available",
        "Mock authentication is only available in development mode."
      );
      return;
    }

    setLoading(true);

    try {
      const user = await createMockUser();
      if (user) {
        onLoginSuccess(user);
      }
    } catch (error: any) {
      console.error("Mock login error:", error);
      const errorMsg = "Failed to create test user";
      onLoginError?.(errorMsg);
      Alert.alert("Error", errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* App Header */}
        <View style={styles.header}>
          <Text style={styles.title}>MemoriAI</Text>
          <Text style={styles.subtitle}>
            AI-powered flashcards with smart spaced repetition
          </Text>
        </View>

        {/* Features */}
        <View style={styles.features}>
          <View style={styles.feature}>
            <Text style={styles.featureIcon}>📄</Text>
            <Text style={styles.featureText}>Generate cards from PDFs</Text>
          </View>
          <View style={styles.feature}>
            <Text style={styles.featureIcon}>📝</Text>
            <Text style={styles.featureText}>Create from any text</Text>
          </View>
          <View style={styles.feature}>
            <Text style={styles.featureIcon}>🎥</Text>
            <Text style={styles.featureText}>Learn from YouTube videos</Text>
          </View>
          <View style={styles.feature}>
            <Text style={styles.featureIcon}>🧠</Text>
            <Text style={styles.featureText}>
              Smart spaced repetition (SM-2)
            </Text>
          </View>
        </View>

        {/* Error Display */}
        {authError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Authentication Error</Text>
            <Text style={styles.errorText}>{authError}</Text>
            <Text style={styles.errorHint}>
              Please check your internet connection and try again.
            </Text>
          </View>
        )}

        {/* Sign In Section */}
        <View style={styles.signInSection}>
          <Text style={styles.signInText}>
            Sign in to start creating and studying your flashcards
          </Text>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#667eea" />
              <Text style={styles.loadingText}>Signing in...</Text>
            </View>
          ) : (
            <View style={styles.buttonsContainer}>
              {/* Primary Sign In Button */}
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  authError && styles.buttonWithError,
                ]}
                onPress={handleGoogleSignIn}
                disabled={loading}
              >
                <View style={styles.buttonContent}>
                  <Text style={styles.googleIcon}>G</Text>
                  <Text style={styles.primaryButtonText}>
                    Continue with Google
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Development Mock Button - Only show in development */}
              {useMockAuth && (
                <>
                  <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>OR</Text>
                    <View style={styles.dividerLine} />
                  </View>

                  <TouchableOpacity
                    style={styles.mockButton}
                    onPress={handleMockSignIn}
                    disabled={loading}
                  >
                    <Text style={styles.mockButtonText}>
                      Continue as Test User
                    </Text>
                  </TouchableOpacity>

                  <Text style={styles.developmentNote}>
                    Development Mode: Google Sign-In requires a development
                    build. Use "Test User" option for Expo Go development.
                  </Text>
                </>
              )}

              {/* Privacy and Terms */}
              <View style={styles.legalContainer}>
                <Text style={styles.legalText}>
                  By continuing, you agree to our Terms of Service and
                  acknowledge that you have read our Privacy Policy.
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  header: {
    alignItems: "center",
    marginBottom: 50,
  },
  title: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#667eea",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: "#6c757d",
    textAlign: "center",
    lineHeight: 24,
  },
  features: {
    marginBottom: 50,
  },
  feature: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 16,
    width: 32,
  },
  featureText: {
    fontSize: 16,
    color: "#495057",
    flex: 1,
  },
  errorContainer: {
    backgroundColor: "#fff5f5",
    borderWidth: 1,
    borderColor: "#feb2b2",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#c53030",
    marginBottom: 4,
  },
  errorText: {
    fontSize: 14,
    color: "#c53030",
    marginBottom: 8,
    lineHeight: 20,
  },
  errorHint: {
    fontSize: 12,
    color: "#9c4221",
    fontStyle: "italic",
  },
  signInSection: {
    alignItems: "center",
  },
  signInText: {
    fontSize: 16,
    color: "#6c757d",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 22,
  },
  buttonsContainer: {
    width: "100%",
    alignItems: "center",
  },
  primaryButton: {
    backgroundColor: "#667eea",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
    width: "100%",
    maxWidth: 320,
    shadowColor: "#667eea",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonWithError: {
    backgroundColor: "#4299e1", // Slightly different shade when there's an error
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  googleIcon: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
    marginRight: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    width: 28,
    height: 28,
    textAlign: "center",
    textAlignVertical: "center",
    borderRadius: 14,
  },
  primaryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
    width: "100%",
    maxWidth: 320,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#e2e8f0",
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: "#6c757d",
    fontWeight: "500",
  },
  mockButton: {
    backgroundColor: "#28a745",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
    width: "100%",
    maxWidth: 320,
  },
  mockButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  developmentNote: {
    fontSize: 12,
    color: "#6c757d",
    textAlign: "center",
    fontStyle: "italic",
    marginTop: 8,
    paddingHorizontal: 16,
    lineHeight: 16,
  },
  legalContainer: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  legalText: {
    fontSize: 12,
    color: "#6c757d",
    textAlign: "center",
    lineHeight: 18,
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#667eea",
  },
});
