import { GoogleSigninButton } from "@react-native-google-signin/google-signin";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
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
            <GoogleSigninButton
              style={styles.googleButton}
              size={GoogleSigninButton.Size.Wide}
              color={GoogleSigninButton.Color.Light}
              onPress={handleGoogleSignIn}
            />
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
  googleButton: {
    width: 240,
    height: 48,
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
