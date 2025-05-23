import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import { getDatabase, type User } from "../database/database";

const USER_KEY = "current_user";

// Define the actual Google user type from the response
interface GoogleUserResponse {
  id: string;
  name: string | null;
  email: string;
  photo: string | null;
  familyName: string | null;
  givenName: string | null;
}

// Configure Google Sign In
export const configureGoogleSignIn = (): void => {
  try {
    GoogleSignin.configure({
      webClientId: "WEB_CLIENT_ID",
      offlineAccess: true,
    });
  } catch (error) {
    console.error("Failed to configure Google Sign In:", error);
    throw new Error(
      "Google Sign In not available - requires development build"
    );
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

// Sign in with Google
export const signInWithGoogle = async (): Promise<User | null> => {
  try {
    await GoogleSignin.hasPlayServices();
    const userInfo = await GoogleSignin.signIn();

    if (userInfo.data?.user) {
      const googleUser = userInfo.data.user as GoogleUserResponse;
      const user = await saveUserToDatabase(googleUser);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
      return user;
    }

    return null;
  } catch (error: any) {
    console.error("Google Sign In Error:", error);

    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      console.log("User cancelled sign in");
    } else if (error.code === statusCodes.IN_PROGRESS) {
      console.log("Sign in already in progress");
    } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      console.log("Play services not available");
    }

    throw error;
  }
};

// Save Google user to local database
const saveUserToDatabase = async (
  googleUser: GoogleUserResponse
): Promise<User> => {
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
      // Update existing user (convert undefined to null for SQLite)
      await db.runAsync(
        "UPDATE users SET email = ?, name = ?, profile_picture_url = ? WHERE google_id = ?",
        [
          user.email,
          user.name,
          user.profile_picture_url ?? null, // Handle undefined
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
      // Create new user (convert undefined to null for SQLite)
      const result = await db.runAsync(
        "INSERT INTO users (google_id, email, name, profile_picture_url) VALUES (?, ?, ?, ?)",
        [
          user.google_id,
          user.email,
          user.name,
          user.profile_picture_url ?? null, // Handle undefined
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
      await GoogleSignin.signOut();
    } catch (error) {
      // Google Sign In might not be available
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
    // Simply check if we have a current user in storage
    const currentUser = await getCurrentUser();
    return currentUser !== null;
  } catch (error) {
    console.error("Failed to check sign in status:", error);
    return false;
  }
};
