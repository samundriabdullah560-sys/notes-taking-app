import React, { useState } from "react";
import { View, StyleSheet, TouchableOpacity, Animated, Platform } from "react-native";
import {
  NotesTabIcon,
  ChecklistTabIcon,
  IdeaBulbTabIcon,
  SettingsTabIcon,
  PlusIcon,
} from "./CustomIcons";

export type NavTabType = "folders" | "checklists" | "ideas" | "settings";

interface BottomNavBarProps {
  activeTab: NavTabType;
  onTabPress: (tab: NavTabType) => void;
  onPlusPress: () => void;
  bottomOffset?: number;
}

export function BottomNavBar({
  activeTab,
  onTabPress,
  onPlusPress,
  bottomOffset = 24,
}: BottomNavBarProps) {
  const ACTIVE_COLOR = "#1F1A3A"; // Dark active color
  const INACTIVE_COLOR = "#9D9ABF"; // Light inactive color
  const [scaleAnim] = useState(() => new Animated.Value(1));

  const USE_NATIVE_DRIVER = Platform.OS !== "web";

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.88,
      useNativeDriver: USE_NATIVE_DRIVER,
      speed: 20,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();
  };

  return (
    <>
      {/* Rounded Bottom Navigation Bar */}
      <View style={[styles.bottomNav, { bottom: bottomOffset }]}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => onTabPress("folders")}
          activeOpacity={0.7}
        >
          <NotesTabIcon
            size={26}
            color={activeTab === "folders" ? ACTIVE_COLOR : INACTIVE_COLOR}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => onTabPress("checklists")}
          activeOpacity={0.7}
        >
          <ChecklistTabIcon
            size={26}
            color={activeTab === "checklists" ? ACTIVE_COLOR : INACTIVE_COLOR}
          />
        </TouchableOpacity>

        {/* Center Spacer for Floating Button */}
        <View style={styles.navCenterSpacer} />

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => onTabPress("ideas")}
          activeOpacity={0.7}
        >
          <IdeaBulbTabIcon
            size={26}
            color={activeTab === "ideas" ? ACTIVE_COLOR : INACTIVE_COLOR}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => onTabPress("settings")}
          activeOpacity={0.7}
        >
          <SettingsTabIcon
            size={26}
            color={activeTab === "settings" ? ACTIVE_COLOR : INACTIVE_COLOR}
          />
        </TouchableOpacity>
      </View>

      {/* Floating Center Action Button (+) placed on top of nav bar */}
      <Animated.View
        style={[
          styles.fabWrapper,
          {
            bottom: bottomOffset + 32,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.fabButton}
          activeOpacity={0.88}
          onPress={onPlusPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          <PlusIcon size={28} color="#FFFFFF" strokeWidth={3} />
        </TouchableOpacity>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  bottomNav: {
    position: "absolute",
    left: 20,
    right: 20,
    height: 68,
    backgroundColor: "#FFFFFF",
    borderRadius: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    zIndex: 99,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  },
  navCenterSpacer: {
    width: 58,
  },
  fabWrapper: {
    position: "absolute",
    left: "50%",
    marginLeft: -29,
    width: 58,
    height: 58,
    zIndex: 999,
    elevation: 25,
  },
  fabButton: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: "#6352F7",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#6352F7",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 25,
  },
});

