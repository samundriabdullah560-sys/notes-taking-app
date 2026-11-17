import { Platform } from "react-native";
import {
  GoogleSignin,
  statusCodes,
  type SignInResponse,
} from "@react-native-google-signin/google-signin";
import { saveGoogleUser, UserAccount } from "./storage";
import { requestLocationAndNotificationPermissions } from "./permissions";

export interface GoogleAuthResult {
  success: boolean;
  user?: UserAccount;
  cancelled?: boolean;
  error?: string;
  requiresConfig?: boolean;
}

let isConfigured = false;

/**
 * Configure Google Sign In SDK with credentials from .env.local
 */
export function configureGoogleSignIn(): boolean {
  if (Platform.OS === "web") return false;

  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

  try {
    GoogleSignin.configure({
      webClientId: webClientId || undefined,
      offlineAccess: false,
      scopes: ["profile", "email"],
    });
    isConfigured = true;
    return true;
  } catch (err: any) {
    console.warn("GoogleSignin configure warning:", err);
    return false;
  }
}

/**
 * Perform Native Google Sign-In with real Google Cloud Console OAuth.
 * Launches Google Play Services Account Chooser directly on Android/iOS.
 */
export async function performGoogleSignIn(): Promise<GoogleAuthResult> {
  if (Platform.OS === "web") {
    return {
      success: false,
      error: "Google Sign-In is only supported on mobile devices.",
    };
  }

  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  if (!webClientId) {
    return {
      success: false,
      requiresConfig: true,
      error:
        "Google Cloud Web Client ID not configured.\nPlease set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in your .env.local file.",
    };
  }

  try {
    if (!isConfigured) {
      configureGoogleSignIn();
    }

    // Verify Google Play Services
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    // Open real Google Play Services dialog
    const response: SignInResponse = await GoogleSignin.signIn();

    if (response.type === "cancelled") {
      return { success: false, cancelled: true };
    }

    if (response.type === "success" && response.data) {
      const gUser = response.data.user;

      if (!gUser?.email) {
        return {
          success: false,
          error: "Google did not provide an email address for this account.",
        };
      }

      // Request location & notification permissions
      await requestLocationAndNotificationPermissions().catch(() => {});

      // Save real authenticated user session
      const displayName =
        gUser.name ||
        [gUser.givenName, gUser.familyName].filter(Boolean).join(" ") ||
        gUser.email.split("@")[0];

      const saveRes = await saveGoogleUser({
        email: gUser.email,
        username: displayName,
        profilePic: gUser.photo || undefined,
      });

      if (saveRes.success && saveRes.user) {
        return { success: true, user: saveRes.user };
      }

      return {
        success: false,
        error: saveRes.error || "Failed to save user session.",
      };
    }

    return {
      success: false,
      error: "Unexpected response from Google Sign-In.",
    };
  } catch (error: any) {
    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      return { success: false, cancelled: true };
    }
    if (error.code === statusCodes.IN_PROGRESS) {
      return {
        success: false,
        error: "Google sign-in is already in progress.",
      };
    }
    if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      return {
        success: false,
        error: "Google Play Services is not available or outdated on this device.",
      };
    }

    // Status code 10 = DEVELOPER_ERROR (SHA-1 / Web Client ID mismatch)
    if (error.code === "DEVELOPER_ERROR" || error.code === "10" || error.code === 10) {
      return {
        success: false,
        error:
          "Google Cloud Console Configuration Error (Code 10):\n" +
          "Your Android Keystore SHA-1 or Web Client ID does not match Google Cloud Console settings.",
      };
    }

    return {
      success: false,
      error: error?.message || "Google Sign-In failed.",
    };
  }
}

/**
 * Sign out from Google
 */
export async function signOutGoogle(): Promise<void> {
  try {
    await GoogleSignin.signOut();
  } catch (err) {
    console.warn("Google sign-out warning:", err);
  }
}
