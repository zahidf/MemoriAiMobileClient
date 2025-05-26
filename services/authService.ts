import { GOOGLE_IOS_CLIENT_ID, GOOGLE_WEB_CLIENT_ID } from "@env";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getDatabase, type User } from "../database/database";

// Set this to false for production builds
const USE_MOCK_AUTH = true;

// Conditionally import Google Sign-In only when not using mock auth
let GoogleSignin: any = null;
let statusCodes: any = null;

if (!USE_MOCK_AUTH) {
  try {
    const googleSignInModule = require("@react-native-google-signin/google-signin");
    GoogleSignin = googleSignInModule.GoogleSignin;
    statusCodes = googleSignInModule.statusCodes;
  } catch (error) {
    console.log("Google Sign-In module not available");
  }
}

const USER_KEY = "current_user";

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
  if (USE_MOCK_AUTH || !GoogleSignin) {
    console.log(
      "Mock auth enabled or Google Sign-In not available - skipping configuration"
    );
    return;
  }

  try {
    const webClientId = GOOGLE_WEB_CLIENT_ID;
    const iosClientId = GOOGLE_IOS_CLIENT_ID;

    if (!webClientId || !iosClientId) {
      throw new Error(
        "Google OAuth client IDs are not configured. Please check your environment variables."
      );
    }

    GoogleSignin.configure({
      webClientId,
      iosClientId,
      offlineAccess: true,
      forceCodeForRefreshToken: true,
      hostedDomain: "",
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

// Sign in with Google - Updated to handle mock auth properly
export const signInWithGoogle = async (): Promise<User | null> => {
  if (USE_MOCK_AUTH || !GoogleSignin) {
    console.log("Using mock authentication");
    return await createMockUser();
  }

  try {
    await GoogleSignin.hasPlayServices({
      showPlayServicesUpdateDialog: true,
    });

    const response = await GoogleSignin.signIn();
    console.log("Google Sign-In response:", JSON.stringify(response, null, 2));

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

    if (statusCodes && error.code === statusCodes.SIGN_IN_CANCELLED) {
      console.log("User cancelled the sign-in process");
      return null;
    } else if (statusCodes && error.code === statusCodes.IN_PROGRESS) {
      console.log("Sign-in is in progress");
      return null;
    } else if (
      statusCodes &&
      error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE
    ) {
      console.log("Play Services not available - using fallback");
      return await createMockUser();
    } else {
      console.error("Unexpected sign-in error:", error.message);
      if (__DEV__) {
        console.log("Development mode: falling back to mock user");
        return await createMockUser();
      }
      throw error;
    }
  }
};

// Sign out
export const signOut = async (): Promise<void> => {
  try {
    if (!USE_MOCK_AUTH && GoogleSignin) {
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

// Check if user is signed in
export const isSignedIn = async (): Promise<boolean> => {
  try {
    if (USE_MOCK_AUTH || !GoogleSignin) {
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

// Get current user's access token
export const getCurrentUserToken = async (): Promise<string | null> => {
  try {
    if (USE_MOCK_AUTH || !GoogleSignin) {
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
    if (USE_MOCK_AUTH || !GoogleSignin) {
      return "mock_refreshed_token";
    }

    const tokens = await GoogleSignin.getTokens();
    return tokens.accessToken;
  } catch (error) {
    console.error("Failed to refresh access token:", error);
    return null;
  }
};

// Helper functions
const extractUserFromResponse = (response: any): GoogleUserInfo | null => {
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

const saveUserToDatabase = async (
  googleUser: GoogleUserInfo
): Promise<User> => {
  const db = getDatabase();

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
    const existingUser = await db.getFirstAsync<User>(
      "SELECT * FROM users WHERE google_id = ?",
      [user.google_id]
    );

    if (existingUser) {
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
