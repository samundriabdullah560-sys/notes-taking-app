import React, { useState, useEffect, useRef } from "react";
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
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { checkUserExists, resetUserPassword, getAllUsers } from "../utils/storage";

type Step = "EMAIL" | "OTP" | "PASSWORD" | "SUCCESS";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();

  const [step, setStep] = useState<Step>("EMAIL");
  const [email, setEmail] = useState(params.email || "");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Resend OTP countdown timer
  const [resendCooldown, setResendCooldown] = useState(45);
  const timerRef = useRef<any>(null);

  // Convex mutations
  const requestOtpMutation = useMutation(api.otp.requestOtp);
  const verifyOtpMutation = useMutation(api.otp.verifyOtp);
  const resetPasswordWithOtpMutation = useMutation(api.otp.resetPasswordWithOtp);
  const convexUsers = useQuery(api.users.getUsers);

  useEffect(() => {
    if (step === "OTP" && resendCooldown > 0) {
      timerRef.current = setInterval(() => {
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [step, resendCooldown]);

  // STEP 1: Send OTP to user's real email
  const handleSendOtp = async () => {
    setErrorMessage(null);
    setSuccessInfo(null);

    const emailTrimmed = email.trim().toLowerCase();
    if (!emailTrimmed) {
      setErrorMessage("Please enter your email address.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailTrimmed)) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    setIsLoading(true);

    try {
      // Verify account exists in local storage OR convex
      const existsLocally = await checkUserExists(emailTrimmed);
      const existsInConvex =
        Array.isArray(convexUsers) &&
        convexUsers.some(
          (u) => (u.email || "").trim().toLowerCase() === emailTrimmed
        );

      if (!existsLocally && !existsInConvex) {
        const allUsers = await getAllUsers();
        const match = allUsers.some(
          (u) => u.email.trim().toLowerCase() === emailTrimmed
        );
        if (!match) {
          setIsLoading(false);
          setErrorMessage(
            "No account registered with this email. Please check or sign up."
          );
          return;
        }
      }

      // Call Convex backend to generate and email the OTP to user's inbox
      const res = await requestOtpMutation({
        email: emailTrimmed,
        allowAnyUser: true,
      });

      if (!res.success) {
        setIsLoading(false);
        setErrorMessage(res.error || "Failed to send verification code.");
        return;
      }

      setOtp("");
      setResendCooldown(45);
      setIsLoading(false);

      setSuccessInfo(
        `Verification code sent to ${emailTrimmed}. Please check your email inbox.`
      );
      setStep("OTP");
    } catch {
      setIsLoading(false);
      setErrorMessage(
        "Could not send verification email. Please check your internet connection and try again."
      );
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const emailTrimmed = email.trim().toLowerCase();
      const res = await requestOtpMutation({
        email: emailTrimmed,
        allowAnyUser: true,
      });

      setIsLoading(false);
      if (res.success) {
        setResendCooldown(45);
        setSuccessInfo(`A new code has been sent to ${emailTrimmed}.`);
      } else {
        setErrorMessage(res.error || "Failed to resend code.");
      }
    } catch {
      setIsLoading(false);
      setErrorMessage("Failed to resend verification code.");
    }
  };

  // STEP 2: Verify OTP
  const handleVerifyOtp = async () => {
    setErrorMessage(null);
    if (!otp.trim()) {
      setErrorMessage("Please enter the 6-digit verification code from your email.");
      return;
    }

    const cleanCode = otp.trim().replace(/\s+/g, "");
    if (cleanCode.length !== 6) {
      setErrorMessage("The verification code must be 6 digits.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await verifyOtpMutation({
        email: email.trim().toLowerCase(),
        code: cleanCode,
      });

      setIsLoading(false);

      if (!res.success) {
        setErrorMessage(
          res.error || "Invalid verification code. Please check your email and try again."
        );
        return;
      }

      setErrorMessage(null);
      setSuccessInfo(null);
      setStep("PASSWORD");
    } catch {
      setIsLoading(false);
      setErrorMessage("Could not verify code. Please check your internet connection.");
    }
  };

  // STEP 3: Reset Password
  const handleResetPassword = async () => {
    setErrorMessage(null);
    if (!newPassword.trim()) {
      setErrorMessage("Please enter your new password.");
      return;
    }

    if (newPassword.trim().length < 4) {
      setErrorMessage("Password must be at least 4 characters long.");
      return;
    }

    if (newPassword.trim() !== confirmPassword.trim()) {
      setErrorMessage("Passwords do not match. Please verify.");
      return;
    }

    setIsLoading(true);

    try {
      const emailTrimmed = email.trim().toLowerCase();
      const cleanCode = otp.trim().replace(/\s+/g, "");

      // 1. Update in Convex backend
      await resetPasswordWithOtpMutation({
        email: emailTrimmed,
        code: cleanCode,
        newPassword: newPassword.trim(),
      }).catch(() => {});

      // 2. Update in local storage
      const res = await resetUserPassword(emailTrimmed, newPassword.trim());
      if (!res.success) {
        setIsLoading(false);
        setErrorMessage(res.error || "Failed to update password locally.");
        return;
      }

      setIsLoading(false);
      setStep("SUCCESS");
    } catch {
      setIsLoading(false);
      setErrorMessage("An unexpected error occurred. Please try again.");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
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
                onPress={() => {
                  if (step === "OTP") {
                    setStep("EMAIL");
                    setErrorMessage(null);
                  } else if (step === "PASSWORD") {
                    setStep("OTP");
                    setErrorMessage(null);
                  } else {
                    router.back();
                  }
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-back" size={24} color="#1E293B" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>
                {step === "SUCCESS" ? "Success" : "Forgot Password"}
              </Text>
              <View style={styles.backButtonPlaceholder} />
            </View>

            {/* Stepper Progress Bar (Only during steps 1-3) */}
            {step !== "SUCCESS" && (
              <View style={styles.stepperContainer}>
                <View style={styles.stepTrack}>
                  <View
                    style={[
                      styles.stepFill,
                      {
                        width:
                          step === "EMAIL"
                            ? "33%"
                            : step === "OTP"
                            ? "66%"
                            : "100%",
                      },
                    ]}
                  />
                </View>
                <View style={styles.stepsLabelRow}>
                  <Text
                    style={[
                      styles.stepLabel,
                      step === "EMAIL" && styles.stepLabelActive,
                    ]}
                  >
                    1. Email
                  </Text>
                  <Text
                    style={[
                      styles.stepLabel,
                      step === "OTP" && styles.stepLabelActive,
                    ]}
                  >
                    2. Code
                  </Text>
                  <Text
                    style={[
                      styles.stepLabel,
                      step === "PASSWORD" && styles.stepLabelActive,
                    ]}
                  >
                    3. Password
                  </Text>
                </View>
              </View>
            )}

            {/* Notification & Alerts */}
            {errorMessage && (
              <View style={styles.errorCard}>
                <Ionicons name="alert-circle" size={18} color="#EF4444" />
                <Text style={styles.errorCardText}>{errorMessage}</Text>
              </View>
            )}

            {successInfo && (
              <View style={styles.infoCard}>
                <Ionicons name="information-circle" size={18} color="#6C5CE7" />
                <Text style={styles.infoCardText}>{successInfo}</Text>
              </View>
            )}

            {/* STEP 1: ENTER EMAIL */}
            {step === "EMAIL" && (
              <View style={styles.stepContent}>
                <View style={styles.iconCirclePurple}>
                  <Ionicons name="mail-outline" size={32} color="#6C5CE7" />
                </View>

                <Text style={styles.stepTitle}>Reset Your Password</Text>
                <Text style={styles.stepSubtitle}>
                  Enter your registered email address. We will send a 6-digit
                  verification code to your email inbox.
                </Text>

                <View style={styles.inputCard}>
                  <Text style={styles.inputLabel}>Email Address</Text>
                  <View style={styles.inputWithIconRow}>
                    <Ionicons
                      name="mail"
                      size={18}
                      color="#94A3B8"
                      style={styles.fieldLeftIcon}
                    />
                    <TextInput
                      style={styles.textInputWithIcon}
                      value={email}
                      onChangeText={(t) => {
                        setEmail(t);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      placeholder="e.g. name@example.com"
                      placeholderTextColor="#94A3B8"
                      autoCapitalize="none"
                      keyboardType="email-address"
                      autoFocus
                    />
                    {email.length > 0 && (
                      <TouchableOpacity
                        onPress={() => setEmail("")}
                        style={styles.clearBtn}
                      >
                        <Ionicons
                          name="close-circle"
                          size={18}
                          color="#94A3B8"
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.primaryBtn, isLoading && { opacity: 0.7 }]}
                  activeOpacity={0.85}
                  onPress={handleSendOtp}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.primaryBtnText}>
                      Send Verification Code
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* STEP 2: ENTER OTP (Code sent to email, never shown on app screen) */}
            {step === "OTP" && (
              <View style={styles.stepContent}>
                <View style={styles.iconCirclePurple}>
                  <Ionicons name="shield-checkmark" size={32} color="#6C5CE7" />
                </View>

                <Text style={styles.stepTitle}>Check Your Email</Text>
                <Text style={styles.stepSubtitle}>
                  We sent a 6-digit verification code to{"\n"}
                  <Text style={styles.highlightText}>{email}</Text>
                </Text>

                {/* Email instruction notice box (No OTP code shown) */}
                <View style={styles.emailNoticeBox}>
                  <Ionicons name="mail" size={20} color="#6C5CE7" />
                  <Text style={styles.emailNoticeText}>
                    Please check your email inbox and enter the 6-digit code.
                    If you don&apos;t see it, check your spam/junk folder.
                  </Text>
                </View>

                <View style={styles.inputCard}>
                  <Text style={styles.inputLabel}>Enter 6-Digit Code</Text>
                  <TextInput
                    style={styles.otpInput}
                    value={otp}
                    onChangeText={(t) => {
                      setOtp(t);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="• • • • • •"
                    placeholderTextColor="#CBD5E1"
                    keyboardType="number-pad"
                    maxLength={6}
                    autoFocus
                  />
                </View>

                <View style={styles.resendRow}>
                  {resendCooldown > 0 ? (
                    <Text style={styles.resendTimerText}>
                      Resend code in{" "}
                      <Text style={styles.highlightText}>{resendCooldown}s</Text>
                    </Text>
                  ) : (
                    <TouchableOpacity
                      onPress={handleResendOtp}
                      activeOpacity={0.7}
                      disabled={isLoading}
                    >
                      <Text style={styles.resendActionText}>
                        {isLoading ? "Sending..." : "Resend Code"}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                <TouchableOpacity
                  style={[styles.primaryBtn, isLoading && { opacity: 0.7 }]}
                  activeOpacity={0.85}
                  onPress={handleVerifyOtp}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Verify & Continue</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* STEP 3: SET NEW PASSWORD */}
            {step === "PASSWORD" && (
              <View style={styles.stepContent}>
                <View style={styles.iconCirclePurple}>
                  <Ionicons name="lock-closed" size={32} color="#6C5CE7" />
                </View>

                <Text style={styles.stepTitle}>Create New Password</Text>
                <Text style={styles.stepSubtitle}>
                  Please choose a secure new password for your account.
                </Text>

                {/* New Password */}
                <View style={styles.inputCard}>
                  <Text style={styles.inputLabel}>New Password</Text>
                  <View style={styles.passwordRow}>
                    <TextInput
                      style={[styles.textInput, { flex: 1 }]}
                      value={newPassword}
                      onChangeText={(t) => {
                        setNewPassword(t);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      placeholder="At least 4 characters"
                      placeholderTextColor="#94A3B8"
                      secureTextEntry={!showNewPass}
                      autoFocus
                    />
                    <TouchableOpacity
                      onPress={() => setShowNewPass(!showNewPass)}
                      style={styles.eyeBtn}
                    >
                      <Ionicons
                        name={showNewPass ? "eye-outline" : "eye-off-outline"}
                        size={20}
                        color="#94A3B8"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Confirm Password */}
                <View style={styles.inputCard}>
                  <Text style={styles.inputLabel}>Confirm New Password</Text>
                  <View style={styles.passwordRow}>
                    <TextInput
                      style={[styles.textInput, { flex: 1 }]}
                      value={confirmPassword}
                      onChangeText={(t) => {
                        setConfirmPassword(t);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      placeholder="Repeat new password"
                      placeholderTextColor="#94A3B8"
                      secureTextEntry={!showConfirmPass}
                    />
                    <TouchableOpacity
                      onPress={() => setShowConfirmPass(!showConfirmPass)}
                      style={styles.eyeBtn}
                    >
                      <Ionicons
                        name={
                          showConfirmPass ? "eye-outline" : "eye-off-outline"
                        }
                        size={20}
                        color="#94A3B8"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.primaryBtn, isLoading && { opacity: 0.7 }]}
                  activeOpacity={0.85}
                  onPress={handleResetPassword}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Update Password</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* STEP 4: SUCCESS */}
            {step === "SUCCESS" && (
              <View style={[styles.stepContent, { paddingTop: 40 }]}>
                <View style={styles.iconCircleGreen}>
                  <Ionicons name="checkmark-done" size={42} color="#16A34A" />
                </View>

                <Text style={styles.stepTitle}>Password Reset!</Text>
                <Text style={styles.stepSubtitle}>
                  Your password has been changed successfully. You can now log
                  in to your account using your new password.
                </Text>

                <View style={styles.successAccountCard}>
                  <Ionicons name="person-circle" size={24} color="#6C5CE7" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.successAccountLabel}>Account Email</Text>
                    <Text style={styles.successAccountEmail}>{email}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.primaryBtn}
                  activeOpacity={0.85}
                  onPress={() => router.replace("/login" as any)}
                >
                  <Text style={styles.primaryBtnText}>Back to Log In</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
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
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Platform.OS === "android" ? 16 : 10,
    marginBottom: 20,
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
  stepperContainer: {
    marginBottom: 24,
  },
  stepTrack: {
    height: 4,
    backgroundColor: "#E2E8F0",
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 8,
  },
  stepFill: {
    height: "100%",
    backgroundColor: "#6C5CE7",
    borderRadius: 2,
  },
  stepsLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  stepLabel: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "600",
  },
  stepLabelActive: {
    color: "#6C5CE7",
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
    marginBottom: 16,
  },
  errorCardText: {
    color: "#DC2626",
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
    lineHeight: 18,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#C7D2FE",
    marginBottom: 16,
  },
  infoCardText: {
    color: "#4338CA",
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
    lineHeight: 18,
  },
  stepContent: {
    alignItems: "center",
  },
  iconCirclePurple: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#EDE9FE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  iconCircleGreen: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1E293B",
    textAlign: "center",
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  highlightText: {
    color: "#6C5CE7",
    fontWeight: "700",
  },
  emailNoticeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F5F3FF",
    borderWidth: 1,
    borderColor: "#DDD6FE",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 24,
    width: "100%",
  },
  emailNoticeText: {
    flex: 1,
    fontSize: 13,
    color: "#4C1D95",
    lineHeight: 18,
    fontWeight: "500",
  },
  inputCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 6,
  },
  inputWithIconRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  fieldLeftIcon: {
    marginRight: 8,
  },
  textInputWithIcon: {
    flex: 1,
    fontSize: 15,
    color: "#1E293B",
    paddingVertical: 4,
  },
  textInput: {
    fontSize: 15,
    color: "#1E293B",
    paddingVertical: 4,
  },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  eyeBtn: {
    padding: 6,
  },
  clearBtn: {
    padding: 6,
  },
  otpInput: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: 8,
    color: "#1E293B",
    textAlign: "center",
    paddingVertical: 8,
  },
  resendRow: {
    marginTop: 4,
    marginBottom: 24,
    alignItems: "center",
  },
  resendTimerText: {
    fontSize: 13,
    color: "#94A3B8",
  },
  resendActionText: {
    fontSize: 13,
    color: "#6C5CE7",
    fontWeight: "700",
  },
  primaryBtn: {
    width: "100%",
    backgroundColor: "#6C5CE7",
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#6C5CE7",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 4,
    marginTop: 8,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  successAccountCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    padding: 16,
    width: "100%",
    marginBottom: 28,
  },
  successAccountLabel: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  successAccountEmail: {
    fontSize: 14,
    color: "#1E293B",
    fontWeight: "700",
  },
});
