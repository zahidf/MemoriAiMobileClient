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
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/useColorScheme";
import { initDatabase, type User } from "../database/database";
import LoginScreen from "../screens/LoginScreen";
import {
  configureGoogleSignIn,
  getCurrentUser,
  isSignedIn,
} from "../services/authService";

// Temporary: Set this to true to skip authentication for testing
const SKIP_AUTH_FOR_TESTING = true;

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Initialize database
      await initDatabase();
      console.log("Database initialized");

      if (SKIP_AUTH_FOR_TESTING) {
        // Create a mock user for testing
        const mockUser: User = {
          id: 1,
          google_id: "test_user_123",
          email: "test@example.com",
          name: "Test User",
          profile_picture_url: undefined,
        };
        setUser(mockUser);
        setIsAuthenticated(true);
        console.log("Using mock authentication for testing");
      } else {
        // Configure Google Sign In (this will fail in Expo Go)
        try {
          configureGoogleSignIn();
          console.log("Google Sign In configured");

          // Check if user is already signed in
          const signedIn = await isSignedIn();
          if (signedIn) {
            const currentUser = await getCurrentUser();
            if (currentUser) {
              setUser(currentUser);
              setIsAuthenticated(true);
            }
          }
        } catch (error) {
          console.error("Google Sign In configuration failed:", error);
          console.log(
            "Google Sign In not available in Expo Go - create a development build"
          );
        }
      }
    } catch (error) {
      console.error("App initialization error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSuccess = (user: User) => {
    setUser(user);
    setIsAuthenticated(true);
  };

  if (!loaded || isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
      </View>
    );
  }

  if (!isAuthenticated && !SKIP_AUTH_FOR_TESTING) {
    return (
      <>
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
        <StatusBar style="auto" />
      </>
    );
  }

  return (
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
      <StatusBar style="auto" />
    </ThemeProvider>
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
