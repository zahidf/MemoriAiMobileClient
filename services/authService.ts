import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import Constants from "expo-constants";
import { getDatabase, type User } from "../database/database";

const USER_KEY = "current_user";

// Set this to false for production builds
const USE_MOCK_AUTH = false;

// Type definitions to handle different API versions
interface GoogleUserInfo {
  id: string;
  name?: string | null;
  email: string;
  photo?: string | null;
  givenName?: string | null;
  familyName?: string | null;
}

interface GoogleSignInResult {
  user?: GoogleUserInfo;
  data?: {
    user: GoogleUserInfo;
  };
  type?: "success" | "cancelled";
}

// Google Sign-In Configuration
export const configureGoogleSignIn = (): void => {
  try {
    const webClientId = Constants.expoConfig?.extra?.GOOGLE_WEB_CLIENT_ID;
    const iosClientId = Constants.expoConfig?.extra?.GOOGLE_IOS_CLIENT_ID;

    if (!webClientId || !iosClientId) {
      throw new Error(
        "Google OAuth client IDs are not configured. Please check your environment variables."
      );
    }

    GoogleSignin.configure({
      webClientId,
      iosClientId,

      // Request offline access (server-side access)
      offlineAccess: true,

      // Force refresh token for Android
      forceCodeForRefreshToken: true,

      // Optional: Hosted domain restriction
      hostedDomain: "",

      // Optional: Account name for Android
      accountName: "",
    });
    console.log("Google Sign In configured successfully");
  } catch (error) {
    console.error("Google Sign In configuration failed:", error);
    throw error;
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

// Extract user data from different API response formats
const extractUserFromResponse = (response: any): GoogleUserInfo | null => {
  // Handle different response formats from different library versions
  if (response?.data?.user) {
    return response.data.user;
  }
  if (response?.user) {
    return response.user;
  }
  if (response?.type === "success" && response?.data?.user) {
    return response.data.user;
  }
  return null;
};

// Sign in with Google
export const signInWithGoogle = async (): Promise<User | null> => {
  if (USE_MOCK_AUTH) {
    console.log("Using mock authentication for development");
    return await createMockUser();
  }

  try {
    // Check if device supports Google Play Services (Android)
    try {
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });
    } catch (playServicesError) {
      console.log("Play Services check failed, continuing anyway");
    }

    // Attempt to sign in
    const response = await GoogleSignin.signIn();
    console.log("Google Sign-In response:", JSON.stringify(response, null, 2));

    // Extract user data from response (handles different API versions)
    const googleUser = extractUserFromResponse(response);

    if (googleUser) {
      const user = await saveUserToDatabase(googleUser);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
      return user;
    } else {
      console.log("No user data in sign-in response");
      return null;
    }
  } catch (error: any) {
    console.error("Google Sign In error:", error);

    // Handle specific error codes
    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      console.log("User cancelled the sign-in process");
      return null;
    } else if (error.code === statusCodes.IN_PROGRESS) {
      console.log("Sign-in is in progress");
      return null;
    } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      console.log("Play Services not available - using fallback");
      return await createMockUser();
    } else {
      console.error("Unexpected sign-in error:", error.message);
      // In development, fallback to mock user
      if (__DEV__) {
        console.log("Development mode: falling back to mock user");
        return await createMockUser();
      }
      throw error;
    }
  }
};

// Save Google user to local database
const saveUserToDatabase = async (
  googleUser: GoogleUserInfo
): Promise<User> => {
  const db = getDatabase();

  // Build user name from available fields
  let userName = googleUser.name;
  if (!userName && (googleUser.givenName || googleUser.familyName)) {
    userName = `${googleUser.givenName || ""} ${
      googleUser.familyName || ""
    }`.trim();
  }
  if (!userName) {
    userName = "Google User";
  }

  const user: User = {
    google_id: googleUser.id,
    email: googleUser.email,
    name: userName,
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
    if (!USE_MOCK_AUTH) {
      await GoogleSignin.signOut();
    }
    await AsyncStorage.removeItem(USER_KEY);
    console.log("User signed out successfully");
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

// Check if user is signed in (with fallback methods)
export const isSignedIn = async (): Promise<boolean> => {
  try {
    if (USE_MOCK_AUTH) {
      const currentUser = await getCurrentUser();
      return currentUser !== null;
    }

    const currentUser = await GoogleSignin.getCurrentUser();
    return currentUser !== null;
  } catch (e) {
    console.log("getCurrentUser method failed");
    return false;
  }
};

// Get current user's access token (for API calls)
export const getCurrentUserToken = async (): Promise<string | null> => {
  try {
    if (USE_MOCK_AUTH) {
      return "mock_token_for_development";
    }

    const tokens = await GoogleSignin.getTokens();
    return tokens.accessToken;
  } catch (error) {
    console.error("Failed to get user token:", error);
    return null;
  }
};

// Refresh access token
export const refreshAccessToken = async (): Promise<string | null> => {
  try {
    if (USE_MOCK_AUTH) {
      return "mock_refreshed_token";
    }

    const tokens = await GoogleSignin.getTokens();
    return tokens.accessToken;
  } catch (error) {
    console.error("Failed to refresh access token:", error);
    return null;
  }
};
