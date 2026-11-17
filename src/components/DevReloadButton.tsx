import React, { useState } from "react";
import {
  TouchableOpacity,
  StyleSheet,
  View,
  Text,
  DevSettings,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export function DevReloadButton() {
  const [isReloading, setIsReloading] = useState(false);

  // Only render in development mode
  if (!__DEV__) return null;

  const handleReload = () => {
    setIsReloading(true);
    if (DevSettings && typeof DevSettings.reload === "function") {
      DevSettings.reload();
    }
    setTimeout(() => setIsReloading(false), 1000);
  };

  const handleLongPress = () => {
    // Open full React Native Dev Menu (Inspect, Debug, etc.)
    if (DevSettings && (DevSettings as any).openMenu) {
      (DevSettings as any).openMenu();
    } else {
      handleReload();
    }
  };

  return (
    <View style={styles.floatingContainer} pointerEvents="box-none">
      <TouchableOpacity
        style={styles.pillButton}
        activeOpacity={0.8}
        onPress={handleReload}
        onLongPress={handleLongPress}
      >
        <Ionicons
          name="refresh"
          size={16}
          color="#FFFFFF"
          style={isReloading ? styles.spinning : undefined}
        />
        <Text style={styles.pillText}>Reload</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  floatingContainer: {
    position: "absolute",
    bottom: Platform.OS === "android" ? 100 : 110,
    right: 16,
    zIndex: 999999,
    elevation: 999999,
  },
  pillButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(30, 41, 59, 0.88)",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  pillText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  spinning: {
    transform: [{ rotate: "180deg" }],
  },
});

