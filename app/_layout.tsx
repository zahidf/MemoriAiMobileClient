import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";

import FeedbackButton from "@/components/FeedbackButton";
import { useColorScheme } from "@/hooks/useColorScheme";
import { FEEDBACK_CONFIG } from "../constants/FeedbackConfig";
import { initDatabase, type User } from "../database/database";
import LoginScreen from "../screens/LoginScreen";
import {
  configureGoogleSignIn,
  createMockUser,
  getCurrentUser,
  isSignedIn,
} from "../services/authService";
import { feedbackService } from "../services/feedbackService";

// Set this to false for production builds
const USE_MOCK_AUTH = __DEV__; // Only use mock auth in development

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Configure feedback service immediately when component mounts
  useEffect(() => {
    feedbackService.configure({
      apiKey: FEEDBACK_CONFIG.BREVO_API_KEY,
      senderEmail: FEEDBACK_CONFIG.SENDER_EMAIL,
      recipientEmail: FEEDBACK_CONFIG.RECIPIENT_EMAIL,
    });
  }, []);

  // Initialize app and retry pending feedback when authenticated
  useEffect(() => {
    initializeApp();
  }, []);

  // Retry pending feedback when user becomes authenticated
  useEffect(() => {
    if (isAuthenticated) {
      feedbackService.retryPendingFeedback();
    }
  }, [isAuthenticated]);

  const initializeApp = async () => {
    try {
      setAuthError(null);

      // Initialize database first
      await initDatabase();
      console.log("Database initialized");

      if (USE_MOCK_AUTH) {
        // Use mock authentication for development
        console.log("Using mock authentication for development");
        const mockUser = await createMockUser();
        setUser(mockUser);
        setIsAuthenticated(true);
      } else {
        // Production authentication flow
        try {
          // Configure Google Sign In
          configureGoogleSignIn();
          console.log("Google Sign In configured");

          // Check if user is already signed in
          const signedIn = await isSignedIn();
          if (signedIn) {
            const currentUser = await getCurrentUser();
            if (currentUser) {
              setUser(currentUser);
              setIsAuthenticated(true);
              console.log("User already authenticated:", currentUser.name);
            }
          }
        } catch (error: any) {
          console.error("Google Sign In initialization error:", error);
          setAuthError(error.message || "Failed to initialize authentication");

          // Don't fallback to mock in production - let user see the error
          if (__DEV__) {
            console.log("Development mode: falling back to mock user");
            const mockUser = await createMockUser();
            setUser(mockUser);
            setIsAuthenticated(true);
          }
        }
      }
    } catch (error: any) {
      console.error("App initialization error:", error);
      setAuthError(error.message || "Failed to initialize app");

      // Only fallback to mock user in development
      if (__DEV__) {
        try {
          const mockUser = await createMockUser();
          setUser(mockUser);
          setIsAuthenticated(true);
          setAuthError(null);
        } catch (mockError) {
          console.error("Failed to create mock user:", mockError);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSuccess = (user: User) => {
    setUser(user);
    setIsAuthenticated(true);
    setAuthError(null);
    console.log("Login successful for user:", user.name);
  };

  const handleLoginError = (error: string) => {
    setAuthError(error);
    console.error("Login error:", error);
  };

  if (!loaded || isLoading) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
        </View>
      </GestureHandlerRootView>
    );
  }

  if (!isAuthenticated) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <LoginScreen
          onLoginSuccess={handleLoginSuccess}
          onLoginError={handleLoginError}
          authError={authError}
          useMockAuth={USE_MOCK_AUTH}
        />
        <FeedbackButton isVisible={false} />
        <StatusBar style="auto" />
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="review-cards"
            options={{
              title: "Review Cards",
              presentation: "modal",
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="study"
            options={{
              title: "Study",
              headerShown: false,
              presentation: "modal",
            }}
          />
          <Stack.Screen name="+not-found" />
        </Stack>

        {/* Feedback button appears on all screens when authenticated */}
        <FeedbackButton isVisible={isAuthenticated} />

        <StatusBar style="auto" />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  },
});
