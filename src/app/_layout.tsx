import React from "react";
import { LogBox } from "react-native";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { DevReloadButton } from "../components";

// Suppress dev warning banner / toast notifications on screen
LogBox.ignoreAllLogs(true);

const convexUrl =
  process.env.EXPO_PUBLIC_CONVEX_URL || "https://polished-flamingo-312.convex.cloud";

const convex = new ConvexReactClient(convexUrl, {
  unsavedChangesWarning: false,
});

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <ConvexProvider client={convex}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: {
              backgroundColor: "#FAFAFD",
            },
            animation: "fade_from_bottom",
          }}
        >
          <Stack.Screen name="index" options={{ animation: "none" }} />
          <Stack.Screen name="login" />
          <Stack.Screen name="signup" />
          <Stack.Screen name="forgot-password" />
          <Stack.Screen name="home" options={{ animation: "none" }} />
          <Stack.Screen name="notes" />
          <Stack.Screen
            name="create-note"
            options={{ presentation: "modal", animation: "slide_from_bottom" }}
          />
        </Stack>
        <DevReloadButton />
      </ConvexProvider>
    </SafeAreaProvider>
  );
}
