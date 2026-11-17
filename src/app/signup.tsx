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
import { registerUser } from "../utils/storage";
import { GoogleLogo } from "../components/CustomIcons";
import { configureGoogleSignIn, performGoogleSignIn } from "../utils/googleAuth";

export default function SignUpScreen() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [securePass, setSecurePass] = useState(true);
  const [secureConfirm, setSecureConfirm] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  useEffect(() => {
    configureGoogleSignIn();
  }, []);

  const handleGoogleSignUp = async () => {
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
        err?.message || "Failed to sign up with Google."
      );
    }
  };

  const handleSignUp = async () => {
    setErrorMessage(null);
    if (!username.trim()) {
      setErrorMessage("Please enter a username.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }
    if (!password || password.length < 4) {
      setErrorMessage("Password must be at least 4 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please re-enter.");
      return;
    }

    setIsLoading(true);
    const result = await registerUser({ username, email, password });
    setIsLoading(false);

    if (!result.success) {
      setErrorMessage(result.error || "Sign up failed.");
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
          {/* Top Bar */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={24} color="#1E293B" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Sign up</Text>
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

            {/* User name Field */}
            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>User name</Text>
              <TextInput
                style={styles.textInput}
                value={username}
                onChangeText={(t) => {
                  setUsername(t);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Enter username"
                placeholderTextColor="#94A3B8"
              />
            </View>

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
                  secureTextEntry={securePass}
                />
                <TouchableOpacity
                  onPress={() => setSecurePass(!securePass)}
                  style={styles.eyeBtn}
                >
                  <Ionicons
                    name={securePass ? "eye-outline" : "eye-off-outline"}
                    size={20}
                    color="#94A3B8"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password Field */}
            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>Confirm Password</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.textInput, { flex: 1 }]}
                  value={confirmPassword}
                  onChangeText={(t) => {
                    setConfirmPassword(t);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="Confirm password"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={secureConfirm}
                />
                <TouchableOpacity
                  onPress={() => setSecureConfirm(!secureConfirm)}
                  style={styles.eyeBtn}
                >
                  <Ionicons
                    name={secureConfirm ? "eye-outline" : "eye-off-outline"}
                    size={20}
                    color="#94A3B8"
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Action Buttons & Social Auth */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.signUpBtn, (isLoading || isGoogleLoading) && { opacity: 0.7 }]}
              activeOpacity={0.85}
              onPress={handleSignUp}
              disabled={isLoading || isGoogleLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.signUpBtnText}>Sign Up</Text>
              )}
            </TouchableOpacity>

            {/* OR Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Continue with Google */}
            <TouchableOpacity
              style={[styles.googleBtn, isGoogleLoading && { opacity: 0.7 }]}
              activeOpacity={0.85}
              onPress={handleGoogleSignUp}
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

            {/* Already have an account */}
            <View style={styles.loginPromptRow}>
              <Text style={styles.loginPromptText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.push("/login" as any)}>
                <Text style={styles.loginPromptLink}>Log In</Text>
              </TouchableOpacity>
            </View>

            {/* Terms & CTA Button */}
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
    marginBottom: 14,
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
    gap: 10,
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
  footer: {
    marginTop: 16,
    alignItems: "center",
  },
  termsText: {
    fontSize: 11,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 16,
    marginTop: 14,
    marginBottom: 6,
    paddingHorizontal: 12,
  },
  termsLink: {
    color: "#6C5CE7",
    fontWeight: "600",
  },
  signUpBtn: {
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
  signUpBtnText: {
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
  loginPromptRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  loginPromptText: {
    fontSize: 14,
    color: "#64748B",
  },
  loginPromptLink: {
    fontSize: 14,
    color: "#6C5CE7",
    fontWeight: "700",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 14,
    width: "100%",
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E2E8F0",
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 13,
    color: "#94A3B8",
    fontWeight: "600",
    textTransform: "uppercase",
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
    marginBottom: 8,
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
