import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { loginUser } from "../utils/storage";
import { GoogleLogo } from "../components/CustomIcons";
import { configureGoogleSignIn, performGoogleSignIn } from "../utils/googleAuth";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secureText, setSecureText] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  useEffect(() => {
    configureGoogleSignIn();
  }, []);

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setIsGoogleLoading(true);
    try {
      const result = await performGoogleSignIn();
      setIsGoogleLoading(false);

      if (result.success && result.user) {
        router.replace("/home" as any);
      } else if (!result.cancelled && result.error) {
        Alert.alert("Google Sign-In", result.error);
      }
    } catch (err: any) {
      setIsGoogleLoading(false);
      Alert.alert(
        "Google Sign-In Error",
        err?.message || "Failed to sign in with Google."
      );
    }
  };

  const handleLogin = async () => {
    setErrorMessage(null);
    if (!email.trim()) {
      setErrorMessage("Please enter your email address.");
      return;
    }
    if (!password.trim()) {
      setErrorMessage("Please enter your password.");
      return;
    }

    setIsLoading(true);
    const result = await loginUser(email.trim(), password.trim());
    setIsLoading(false);

    if (!result.success) {
      setErrorMessage(result.error || "Login failed. Please check your credentials.");
      return;
    }

    router.replace("/home" as any);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "android" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={24} color="#1E293B" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Log in</Text>
            <View style={styles.backButtonPlaceholder} />
          </View>

          {/* Form Fields */}
          <View style={styles.formContainer}>
            {/* Error Banner */}
            {errorMessage && (
              <View style={styles.errorCard}>
                <Ionicons name="alert-circle" size={18} color="#EF4444" />
                <Text style={styles.errorCardText}>{errorMessage}</Text>
              </View>
            )}

            {/* Email Field */}
            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.textInput}
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Enter email"
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            {/* Password Field */}
            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.textInput, { flex: 1 }]}
                  value={password}
                  onChangeText={(t) => {
                    setPassword(t);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="Enter password"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={secureText}
                />
                <TouchableOpacity
                  onPress={() => setSecureText(!secureText)}
                  style={styles.eyeBtn}
                >
                  <Ionicons
                    name={secureText ? "eye-outline" : "eye-off-outline"}
                    size={20}
                    color="#94A3B8"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot Password Row */}
            <View style={styles.forgotPasswordRow}>
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: "/forgot-password" as any,
                    params: email.trim() ? { email: email.trim() } : undefined,
                  })
                }
                activeOpacity={0.7}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.footer}>
            {/* Primary Log In Button */}
            <TouchableOpacity
              style={[styles.loginBtn, isLoading && { opacity: 0.7 }]}
              activeOpacity={0.85}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.loginBtnText}>Log In</Text>
              )}
            </TouchableOpacity>

            {/* Switch to SignUp row */}
            <View style={styles.signupPromptRow}>
              <Text style={styles.signupPromptText}>Don&apos;t have an account? </Text>
              <TouchableOpacity onPress={() => router.push("/signup" as any)}>
                <Text style={styles.signupPromptLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>

            {/* Continue with Google */}
            <TouchableOpacity
              style={[styles.googleBtn, isGoogleLoading && { opacity: 0.7 }]}
              activeOpacity={0.85}
              onPress={handleGoogleSignIn}
              disabled={isLoading || isGoogleLoading}
            >
              {isGoogleLoading ? (
                <ActivityIndicator color="#4285F4" size="small" />
              ) : (
                <>
                  <GoogleLogo size={20} />
                  <Text style={styles.googleBtnText}>Continue with Google</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Terms of Service */}
            <Text style={styles.termsText}>
              By continuing, you agree to our{" "}
              <Text style={styles.termsLink}>Terms of Service</Text> and{" "}
              <Text style={styles.termsLink}>Privacy Policy</Text>.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FAFAFD",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Platform.OS === "android" ? 12 : 6,
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonPlaceholder: {
    width: 40,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
  },
  formContainer: {
    gap: 12,
    marginTop: 4,
  },
  inputCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#EEF0F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  inputLabel: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "500",
    marginBottom: 4,
  },
  textInput: {
    fontSize: 15,
    color: "#1E293B",
    fontWeight: "500",
    padding: 0,
  },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  eyeBtn: {
    padding: 4,
  },
  forgotPassBtn: {
    alignSelf: "flex-start",
    marginTop: 4,
  },
  forgotPassText: {
    color: "#6C5CE7",
    fontSize: 14,
    fontWeight: "600",
  },
  footer: {
    marginTop: 18,
    alignItems: "center",
  },
  termsText: {
    fontSize: 11,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 16,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
  },
  termsLink: {
    color: "#6C5CE7",
    fontWeight: "600",
  },
  loginBtn: {
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
  loginBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  errorCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  errorCardText: {
    color: "#DC2626",
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
    lineHeight: 18,
  },
  signupPromptRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 14,
  },
  signupPromptText: {
    fontSize: 14,
    color: "#64748B",
  },
  signupPromptLink: {
    fontSize: 14,
    color: "#6C5CE7",
    fontWeight: "700",
  },
  forgotPasswordRow: {
    alignItems: "flex-end",
    marginTop: -4,
    marginBottom: 4,
  },
  forgotPasswordText: {
    fontSize: 13,
    color: "#6C5CE7",
    fontWeight: "600",
  },
  googleBtn: {
    width: "100%",
    height: 52,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  googleBtnText: {
    color: "#1E293B",
    fontSize: 15,
    fontWeight: "600",
  },
});
