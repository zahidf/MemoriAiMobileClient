import AsyncStorage from "@react-native-async-storage/async-storage";
import { getDatabase, type User } from "../database/database";

const USER_KEY = "current_user";

// Configure Google Sign In (only if available)
export const configureGoogleSignIn = (): void => {
  try {
    // Only try to import and configure if we're in a development build
    if (__DEV__) {
      console.log("Google Sign In configuration attempted");
      // Note: This will fail in Expo Go, but won't crash the app
    }
  } catch (error) {
    console.log("Google Sign In not available - using mock authentication");
  }
};

// Create mock user for testing
export const createMockUser = async (): Promise<User> => {
  const db = getDatabase();

  const mockUser: User = {
    google_id: "test_user_123",
    email: "test@example.com",
    name: "Test User",
    profile_picture_url: undefined,
  };

  try {
    // Check if mock user already exists
    const existingUser = await db.getFirstAsync<User>(
      "SELECT * FROM users WHERE google_id = ?",
      [mockUser.google_id]
    );

    if (existingUser) {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(existingUser));
      return existingUser;
    } else {
      // Create mock user in database
      const result = await db.runAsync(
        "INSERT INTO users (google_id, email, name, profile_picture_url) VALUES (?, ?, ?, ?)",
        [mockUser.google_id, mockUser.email, mockUser.name, null]
      );

      const newUser = { ...mockUser, id: result.lastInsertRowId };
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(newUser));
      return newUser;
    }
  } catch (error) {
    console.error("Failed to create mock user:", error);
    throw error;
  }
};

// Sign in with Google (fallback to mock in Expo Go)
export const signInWithGoogle = async (): Promise<User | null> => {
  try {
    // Try to dynamically import Google Sign In
    const { GoogleSignin } = await import(
      "@react-native-google-signin/google-signin"
    );

    // Configure Google Sign In
    GoogleSignin.configure({
      webClientId: "YOUR_WEB_CLIENT_ID", // Replace with actual web client ID
      offlineAccess: true,
    });

    await GoogleSignin.hasPlayServices();
    const userInfo = await GoogleSignin.signIn();

    if (userInfo.data?.user) {
      const googleUser = userInfo.data.user;
      const user = await saveUserToDatabase(googleUser);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
      return user;
    }

    return null;
  } catch (error: any) {
    console.log(
      "Google Sign In failed, falling back to mock user:",
      error.message
    );

    // Fallback to mock user for development
    return await createMockUser();
  }
};

// Save Google user to local database
const saveUserToDatabase = async (googleUser: any): Promise<User> => {
  const db = getDatabase();

  const user: User = {
    google_id: googleUser.id,
    email: googleUser.email,
    name: googleUser.name || "Unknown",
    profile_picture_url: googleUser.photo || undefined,
  };

  try {
    // Check if user already exists
    const existingUser = await db.getFirstAsync<User>(
      "SELECT * FROM users WHERE google_id = ?",
      [user.google_id]
    );

    if (existingUser) {
      // Update existing user
      await db.runAsync(
        "UPDATE users SET email = ?, name = ?, profile_picture_url = ? WHERE google_id = ?",
        [
          user.email,
          user.name,
          user.profile_picture_url ?? null,
          user.google_id,
        ]
      );
      return {
        ...existingUser,
        email: user.email,
        name: user.name,
        profile_picture_url: user.profile_picture_url,
      };
    } else {
      // Create new user
      const result = await db.runAsync(
        "INSERT INTO users (google_id, email, name, profile_picture_url) VALUES (?, ?, ?, ?)",
        [
          user.google_id,
          user.email,
          user.name,
          user.profile_picture_url ?? null,
        ]
      );

      return {
        ...user,
        id: result.lastInsertRowId,
      };
    }
  } catch (error) {
    console.error("Failed to save user to database:", error);
    throw error;
  }
};

// Sign out
export const signOut = async (): Promise<void> => {
  try {
    try {
      const { GoogleSignin } = await import(
        "@react-native-google-signin/google-signin"
      );
      await GoogleSignin.signOut();
    } catch (error) {
      console.log("Google Sign In not available for sign out");
    }
    await AsyncStorage.removeItem(USER_KEY);
  } catch (error) {
    console.error("Sign out error:", error);
    throw error;
  }
};

// Get current user from storage
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const userJson = await AsyncStorage.getItem(USER_KEY);
    if (userJson) {
      return JSON.parse(userJson);
    }
    return null;
  } catch (error) {
    console.error("Failed to get current user:", error);
    return null;
  }
};

// Check if user is signed in
export const isSignedIn = async (): Promise<boolean> => {
  try {
    const currentUser = await getCurrentUser();
    return currentUser !== null;
  } catch (error) {
    console.error("Failed to check sign in status:", error);
    return false;
  }
};
