import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { NotebookArt } from "../components/Illustrations";
import { getCurrentUser } from "../utils/storage";

export default function WelcomeScreen() {
  const router = useRouter();
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    let mounted = true;
    SplashScreen.hideAsync().catch(() => {});

    // Safety timeout: Never leave screen hanging blank
    const safetyTimer = setTimeout(() => {
      if (mounted) {
        setShowWelcome(true);
      }
    }, 1000);

    async function checkAuth() {
      try {
        const user = await getCurrentUser();
        if (user && mounted) {
          clearTimeout(safetyTimer);
          SplashScreen.hideAsync().catch(() => {});
          router.replace("/home" as any);
          return;
        }
      } catch (err) {
        console.warn("Auto-login check failed:", err);
      }

      if (mounted) {
        setShowWelcome(true);
      }
      SplashScreen.hideAsync().catch(() => {});
    }

    checkAuth();

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
    };
  }, [router]);

  // Loading state while checking auth
  if (!showWelcome) {
    return (
      <SafeAreaView style={[styles.safeArea, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#6C5CE7" />
        <Text style={{ marginTop: 14, fontSize: 15, fontWeight: "700", color: "#6C5CE7" }}>
          Loading Note Book App...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Top Header Title */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            <Text style={styles.titleHighlight}>Note </Text>
            <Text style={styles.titleDark}>Book App</Text>
          </Text>
        </View>

        {/* Center 3D Illustration */}
        <View style={styles.illustrationWrapper}>
          <NotebookArt />
        </View>

        {/* Bottom Card / Action Section */}
        <View style={styles.bottomSection}>
          <Text style={styles.heroText}>Save and share notes</Text>

          {/* Carousel Pagination Dots */}
          <View style={styles.paginationRow}>
            <View style={styles.dotInactive} />
            <View style={styles.dotInactive} />
            <View style={styles.dotInactive} />
            <View style={styles.dotActive} />
          </View>

          {/* Primary Action Button */}
          <TouchableOpacity
            style={styles.createAccountBtn}
            activeOpacity={0.85}
            onPress={() => router.push("/signup" as any)}
          >
            <Text style={styles.createAccountText}>Create account</Text>
          </TouchableOpacity>

          {/* Log In Link */}
          <View style={styles.loginRow}>
            <Text style={styles.loginQuestion}>Have an account? </Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push("/login" as any)}
            >
              <Text style={styles.loginLink}>Log In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  loadingCenter: {
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 28,
    justifyContent: "space-between",
    paddingTop: 24,
    paddingBottom: 28,
  },
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 28,
    justifyContent: "space-between",
    paddingTop: 36,
    paddingBottom: 24,
  },
  header: {
    alignItems: "center",
    marginTop: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  titleHighlight: {
    color: "#6C5CE7",
  },
  titleDark: {
    color: "#1E293B",
  },
  illustrationWrapper: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 20,
  },
  bottomSection: {
    alignItems: "center",
    width: "100%",
  },
  heroText: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1E293B",
    textAlign: "center",
    marginBottom: 20,
  },
  paginationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 30,
  },
  dotInactive: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#E2E8F0",
  },
  dotActive: {
    width: 22,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#6C5CE7",
  },
  createAccountBtn: {
    width: "100%",
    height: 54,
    backgroundColor: "#6C5CE7",
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#6C5CE7",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 4,
  },
  createAccountText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  loginRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
  },
  loginQuestion: {
    color: "#64748B",
    fontSize: 14,
  },
  loginLink: {
    color: "#6C5CE7",
    fontSize: 14,
    fontWeight: "700",
  },
});