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
  createMockUser,
  getCurrentUser,
  isSignedIn,
} from "../services/authService";

// Set this to true to automatically use mock authentication for development
const USE_MOCK_AUTH = true;

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
        // Try to configure Google Sign In
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
          console.log("Falling back to mock user");

          // Fallback to mock user
          const mockUser = await createMockUser();
          setUser(mockUser);
          setIsAuthenticated(true);
        }
      }
    } catch (error) {
      console.error("App initialization error:", error);
      // Even if there's an error, create a mock user so the app can function
      try {
        const mockUser = await createMockUser();
        setUser(mockUser);
        setIsAuthenticated(true);
      } catch (mockError) {
        console.error("Failed to create mock user:", mockError);
      }
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

  if (!isAuthenticated) {
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
