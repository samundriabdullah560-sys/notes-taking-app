import { Alert } from "react-native";

export interface PickedImageResult {
  canceled: boolean;
  uri?: string;
  error?: string;
}

export interface PickImageOptions {
  aspect?: [number, number];
  allowsEditing?: boolean;
  quality?: number;
}

function getNativePicker() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const picker = require("expo-image-picker");
    return picker;
  } catch (err) {
    console.warn(
      "expo-image-picker native module is not compiled into the current binary:",
      err
    );
    return null;
  }
}

export function isNativePickerAvailable(): boolean {
  return Boolean(getNativePicker());
}

export async function pickImageFromGallery(
  options?: PickImageOptions
): Promise<PickedImageResult> {
  const picker = getNativePicker();
  if (!picker) {
    Alert.alert(
      "Native Module Required",
      "The currently installed APK was built before camera/photo modules were linked. You can paste any image link directly or choose a preset art! To enable native gallery picking in the mobile app, re-run `npx expo run:android`."
    );
    return { canceled: true, error: "native_module_missing" };
  }

  try {
    const { status } = await picker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Please allow access to your photo library to pick images."
      );
      return { canceled: true };
    }

    const result = await picker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: options?.allowsEditing ?? true,
      aspect: options?.aspect ?? [4, 3],
      quality: options?.quality ?? 0.9,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      return { canceled: false, uri: result.assets[0].uri };
    }
    return { canceled: true };
  } catch (err: any) {
    console.warn("pickImageFromGallery error:", err);
    Alert.alert(
      "Error",
      "Could not open gallery: " + (err?.message || "Unknown error")
    );
    return { canceled: true, error: String(err) };
  }
}

export async function takePhotoWithCamera(
  options?: PickImageOptions
): Promise<PickedImageResult> {
  const picker = getNativePicker();
  if (!picker) {
    Alert.alert(
      "Native Module Required",
      "The currently installed APK was built before camera/photo modules were linked. You can paste any image link directly or choose a preset art! To enable native camera in the mobile app, re-run `npx expo run:android`."
    );
    return { canceled: true, error: "native_module_missing" };
  }

  try {
    const { status } = await picker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Please allow camera access to take photos."
      );
      return { canceled: true };
    }

    const result = await picker.launchCameraAsync({
      allowsEditing: options?.allowsEditing ?? true,
      aspect: options?.aspect ?? [4, 3],
      quality: options?.quality ?? 0.9,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      return { canceled: false, uri: result.assets[0].uri };
    }
    return { canceled: true };
  } catch (err: any) {
    console.warn("takePhotoWithCamera error:", err);
    Alert.alert(
      "Error",
      "Could not access camera: " + (err?.message || "Unknown error")
    );
    return { canceled: true, error: String(err) };
  }
}

