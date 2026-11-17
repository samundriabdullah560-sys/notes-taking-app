import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export interface PermissionStatusResult {
  locationGranted: boolean;
  notificationsGranted: boolean;
}

/**
 * Request both Location and Notification permissions.
 */
export async function requestLocationAndNotificationPermissions(): Promise<PermissionStatusResult> {
  let locationGranted = false;
  let notificationsGranted = false;

  try {
    const locRes = await Location.requestForegroundPermissionsAsync();
    locationGranted = locRes.status === "granted";
  } catch (error) {
    console.warn("Location permission request skipped or failed:", error);
  }

  try {
    if (Platform.OS === "android" || Platform.OS === "ios") {
      const notifRes = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      notificationsGranted =
        notifRes.status === "granted" ||
        notifRes.granted === true;
    }
  } catch (error) {
    console.warn("Notification permission request skipped or failed:", error);
  }

  return {
    locationGranted,
    notificationsGranted,
  };
}

