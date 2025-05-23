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
import { signInWithGoogle } from "../services/authService";
import type { User } from "../types";

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);

    try {
      const user = await signInWithGoogle();
      if (user) {
        onLoginSuccess(user);
      } else {
        Alert.alert("Sign In Failed", "Unable to sign in with Google");
      }
    } catch (error: any) {
      console.error("Login error:", error);
      Alert.alert(
        "Sign In Error",
        error.message || "An error occurred during sign in"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleMockSignIn = async () => {
    setLoading(true);

    try {
      // Use the signInWithGoogle function which will fall back to mock user
      const user = await signInWithGoogle();
      if (user) {
        onLoginSuccess(user);
      }
    } catch (error: any) {
      console.error("Mock login error:", error);
      Alert.alert("Error", "Failed to sign in");
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
                style={styles.primaryButton}
                onPress={handleGoogleSignIn}
              >
                <Text style={styles.primaryButtonText}>
                  Sign in with Google
                </Text>
              </TouchableOpacity>

              {/* Development Mock Button */}
              <TouchableOpacity
                style={styles.mockButton}
                onPress={handleMockSignIn}
              >
                <Text style={styles.mockButtonText}>
                  Continue as Test User (Development)
                </Text>
              </TouchableOpacity>

              <Text style={styles.developmentNote}>
                Note: Google Sign In requires a development build. Use "Test
                User" option for Expo Go development.
              </Text>
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
    marginBottom: 60,
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
    marginBottom: 60,
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
  signInSection: {
    alignItems: "center",
  },
  signInText: {
    fontSize: 16,
    color: "#6c757d",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  buttonsContainer: {
    width: "100%",
    alignItems: "center",
  },
  primaryButton: {
    backgroundColor: "#667eea",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
    width: "100%",
    maxWidth: 300,
  },
  primaryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  mockButton: {
    backgroundColor: "#28a745",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
    width: "100%",
    maxWidth: 300,
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
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 12,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#667eea",
  },
});
