import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  Image,
  Modal,
  TextInput,
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Animated,
  PanResponder,
  RefreshControl,
  DevSettings,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect, useLocalSearchParams } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { Ionicons, Feather } from "@expo/vector-icons";
import { pickImageFromGallery, takePhotoWithCamera } from "../utils/imagePicker";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  RingingBellIcon,
  ChecklistTabIcon,
  IdeaBulbTabIcon,
  BottomNavBar,
  NavTabType,
  FolderCard,
} from "../components";
import {
  getCurrentUser,
  saveUserNote,
  getUserNotes,
  logoutUser,
  changeUserPassword,
  deleteUserNote,
  deleteUserAccount,
  updateUserProfilePic,
  updateUserName,
  toggleChecklistItemStorage,
  UserAccount,
  StoredNote,
} from "../utils/storage";

const initialDefaultFolders = [
  {
    name: "Personal",
    filesCount: 0,
    sizeDisplay: "0 files",
    icon: "document",
    color: "#6C5CE7",
  },
  {
    name: "Academic",
    filesCount: 0,
    sizeDisplay: "0 files",
    icon: "school",
    color: "#8B5CF6",
  },
  {
    name: "Work",
    filesCount: 0,
    sizeDisplay: "0 files",
    icon: "briefcase",
    color: "#3498DB",
  },
  {
    name: "Others",
    filesCount: 0,
    sizeDisplay: "0 files",
    icon: "folder",
    color: "#E67E22",
  },
];

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
// Hero Space Card Dimensions dynamically scaled to match reference image (723x284 aspect ratio)
const HERO_CARD_WIDTH = Math.min(SCREEN_WIDTH - 40, 500);
const HERO_CARD_HEIGHT = Math.round(HERO_CARD_WIDTH * (284 / 723));
const HERO_ICON_SIZE = Math.round(HERO_CARD_HEIGHT * (137 / 284));
const PIE_CHART_SIZE = Math.round(HERO_ICON_SIZE * 0.52);
const PIE_SLICE_SIZE = Math.floor((PIE_CHART_SIZE - 2) / 2);

const USE_NATIVE_DRIVER = Platform.OS !== "web";

export default function HomeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: NavTabType }>();
  const insets = useSafeAreaInsets();
  const bottomOffset = Math.max(18, insets.bottom + 6);
  const [selectedTab, setSelectedTab] = useState<NavTabType | null>(null);
  const activeTab: NavTabType = (params.tab as NavTabType) || selectedTab || "folders";

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [slideAnim] = useState(() => new Animated.Value(SCREEN_HEIGHT || 800));
  const [backdropAnim] = useState(() => new Animated.Value(0));

  const openCreateNoteSheet = () => {
    slideAnim.setValue(SCREEN_HEIGHT || 800);
    backdropAnim.setValue(0);
    setIsModalOpen(true);
    Animated.parallel([
      Animated.timing(backdropAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        damping: 24,
        mass: 0.8,
        stiffness: 180,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
    ]).start();
  };

  const handleModalShow = () => {
    Animated.parallel([
      Animated.timing(backdropAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        damping: 24,
        mass: 0.8,
        stiffness: 180,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
    ]).start();
  };

  const closeCreateNoteSheet = (onComplete?: () => void) => {
    Keyboard.dismiss();
    Animated.parallel([
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT || 800,
        duration: 220,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
    ]).start(() => {
      setIsModalOpen(false);
      if (onComplete) {
        onComplete();
      }
    });
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 5,
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dy > 0) {
            slideAnim.setValue(gestureState.dy);
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy > 110 || gestureState.vy > 0.5) {
            closeCreateNoteSheet();
          } else {
            Animated.spring(slideAnim, {
              toValue: 0,
              damping: 24,
              useNativeDriver: USE_NATIVE_DRIVER,
            }).start();
          }
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [slideAnim]
  );

  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [userNotes, setUserNotes] = useState<StoredNote[]>([]);
  const [noteToDelete, setNoteToDelete] = useState<StoredNote | null>(null);
  const isLongPressActiveRef = useRef(false);
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteBody, setNewNoteBody] = useState("");
  const [selectedFolder, setSelectedFolder] = useState("Personal");
  const [isChecklist, setIsChecklist] = useState(false);
  const [checklistItems, setChecklistItems] = useState<
    { id: string; text: string; checked: boolean }[]
  >([{ id: "1", text: "", checked: false }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newNoteImage, setNewNoteImage] = useState<string | undefined>(undefined);
  const [isPickingQuickImage, setIsPickingQuickImage] = useState(false);

  const handleAddChecklistItem = () => {
    setChecklistItems((prev) => [
      ...prev,
      { id: `${Date.now()}_${Math.random()}`, text: "", checked: false },
    ]);
  };

  const handleUpdateChecklistItem = (id: string, text: string) => {
    setChecklistItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, text } : item))
    );
  };

  const handleRemoveChecklistItem = (id: string) => {
    if (checklistItems.length > 1) {
      setChecklistItems((prev) => prev.filter((item) => item.id !== id));
    }
  };

  const handlePickQuickImage = async () => {
    setIsPickingQuickImage(true);
    const result = await pickImageFromGallery();
    setIsPickingQuickImage(false);
    if (!result.canceled && result.uri) {
      setNewNoteImage(result.uri);
    }
  };

  const handleTakeQuickPhoto = async () => {
    setIsPickingQuickImage(true);
    const result = await takePhotoWithCamera();
    setIsPickingQuickImage(false);
    if (!result.canceled && result.uri) {
      setNewNoteImage(result.uri);
    }
  };

  const handleToggleChecklist = async (noteId: string, itemId: string) => {
    if (!currentUser?.email) return;
    await toggleChecklistItemStorage(noteId, itemId, currentUser.email);
    setUserNotes((prev) =>
      prev.map((n) => {
        if (n._id !== noteId || !n.checklistItems) return n;
        return {
          ...n,
          checklistItems: n.checklistItems.map((ci) =>
            ci.id === itemId ? { ...ci, checked: !ci.checked } : ci
          ),
        };
      })
    );
  };

  const handleDeleteNote = async (id: string) => {
    // 1. Immediately update UI state so it vanishes on 1st tap!
    setUserNotes((prev) => prev.filter((n) => n._id !== id));
    setNoteToDelete(null);

    // 2. Delete from persistent local storage
    try {
      const email = currentUser?.email || (await getCurrentUser())?.email;
      await deleteUserNote(id, email);
    } catch (err) {
      console.warn("Failed to delete note from storage:", err);
    }
  };

  // Change Password state
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Permanent Delete Account state
  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = useState(false);
  const [deleteConfirmPassword, setDeleteConfirmPassword] = useState("");
  const [showDeleteConfirmPass, setShowDeleteConfirmPass] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Profile picture edit modal & handlers
  const [isProfilePicModalOpen, setIsProfilePicModalOpen] = useState(false);
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);

  const defaultAvatarUri =
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80";

  const handlePickProfilePic = async () => {
    if (!currentUser?.email) return;
    setIsUpdatingAvatar(true);
    const result = await pickImageFromGallery({ aspect: [1, 1], allowsEditing: true });
    setIsUpdatingAvatar(false);
    if (!result.canceled && result.uri) {
      await updateUserProfilePic(currentUser.email, result.uri);
      setCurrentUser((prev) => (prev ? { ...prev, profilePic: result.uri } : prev));
      setIsProfilePicModalOpen(false);
    }
  };

  const handleTakeProfilePhoto = async () => {
    if (!currentUser?.email) return;
    setIsUpdatingAvatar(true);
    const result = await takePhotoWithCamera({ aspect: [1, 1], allowsEditing: true });
    setIsUpdatingAvatar(false);
    if (!result.canceled && result.uri) {
      await updateUserProfilePic(currentUser.email, result.uri);
      setCurrentUser((prev) => (prev ? { ...prev, profilePic: result.uri } : prev));
      setIsProfilePicModalOpen(false);
    }
  };

  const handleRemoveProfilePic = async () => {
    if (!currentUser?.email) return;
    setIsUpdatingAvatar(true);
    await updateUserProfilePic(currentUser.email, undefined);
    setCurrentUser((prev) => (prev ? { ...prev, profilePic: undefined } : prev));
    setIsUpdatingAvatar(false);
    setIsProfilePicModalOpen(false);
  };

  // Edit Name state & handlers
  const [isEditNameModalOpen, setIsEditNameModalOpen] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);
  const [editNameError, setEditNameError] = useState<string | null>(null);

  const openEditNameModal = () => {
    setEditedName(currentUser?.username || "");
    setEditNameError(null);
    setIsEditNameModalOpen(true);
  };

  const handleSaveName = async () => {
    if (!currentUser?.email) return;
    const trimmed = editedName.trim();
    if (!trimmed) {
      setEditNameError("Please enter your name.");
      return;
    }
    if (trimmed.length < 2) {
      setEditNameError("Name must be at least 2 characters.");
      return;
    }

    setIsSavingName(true);
    setEditNameError(null);
    const res = await updateUserName(currentUser.email, trimmed);
    setIsSavingName(false);

    if (!res.success) {
      setEditNameError(res.error || "Failed to update name.");
      return;
    }

    setCurrentUser((prev) => (prev ? { ...prev, username: trimmed } : prev));
    setIsEditNameModalOpen(false);
  };

  // Dismiss splash screen when home is rendered
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  // Load currently logged-in user and notes on focus
  const loadUser = useCallback(async () => {
    const user = await getCurrentUser();
    if (!user) {
      router.replace("/login" as any);
      return;
    }
    setCurrentUser(user);
    const email = user.email;
    const notes = await getUserNotes(email);
    setUserNotes(notes);
  }, [router]);

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadUser();
    setTimeout(() => setRefreshing(false), 500);
  }, [loadUser]);

  useFocusEffect(
    useCallback(() => {
      loadUser();
    }, [loadUser])
  );

  const handleChangePassword = async () => {
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentUser?.email) {
      setPasswordError("No active user session.");
      return;
    }
    if (!currentPassword.trim()) {
      setPasswordError("Please enter your current password.");
      return;
    }
    if (!newPassword.trim()) {
      setPasswordError("Please enter a new password.");
      return;
    }
    if (newPassword.trim().length < 4) {
      setPasswordError("New password must be at least 4 characters long.");
      return;
    }
    if (newPassword.trim() !== confirmPassword.trim()) {
      setPasswordError("New passwords do not match.");
      return;
    }
    if (currentPassword.trim() === newPassword.trim()) {
      setPasswordError("New password must be different from current password.");
      return;
    }

    setIsChangingPassword(true);
    const res = await changeUserPassword(currentUser.email, currentPassword, newPassword);
    setIsChangingPassword(false);

    if (!res.success) {
      setPasswordError(res.error || "Failed to update password.");
      return;
    }

    setPasswordSuccess("Password updated successfully!");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setTimeout(() => {
      setIsChangePasswordOpen(false);
      setPasswordSuccess(null);
    }, 1200);
  };

  const handlePermanentDeleteAccount = async () => {
    setDeleteError(null);
    if (!currentUser?.email) return;

    if (!deleteConfirmPassword.trim()) {
      setDeleteError("Please enter your current password to confirm deletion.");
      return;
    }

    setIsDeletingAccount(true);
    const res = await deleteUserAccount(currentUser.email, deleteConfirmPassword.trim());
    setIsDeletingAccount(false);

    if (!res.success) {
      setDeleteError(res.error || "Failed to delete account. Incorrect password.");
      return;
    }

    setIsDeleteAccountOpen(false);
    router.replace("/login" as any);
  };

  // Convex Queries and Mutations
  const liveFolders = useQuery(api.folders.getFolders);
  const liveStorage = useQuery(api.folders.getStorage);
  const seedMutation = useMutation(api.folders.seedInitialData);
  const createNoteMutation = useMutation(api.notes.createNote);

  // Automatically attempt to seed initial database if empty
  useEffect(() => {
    seedMutation().catch(() => {});
  }, [seedMutation]);

  const folders = (Array.isArray(liveFolders) && liveFolders.length > 0
    ? liveFolders
    : initialDefaultFolders
  ).map((f: any) => {
    const count = userNotes.filter(
      (n) => (n.folder || "Personal").trim().toLowerCase() === f.name.toLowerCase()
    ).length;
    return {
      ...f,
      filesCount: count,
      sizeDisplay: `${count} file${count === 1 ? "" : "s"}`,
    };
  });

  const storageUsed = liveStorage?.usedGb ?? 61;
  const storageTotal = liveStorage?.totalGb ?? 128;

  const isSubmittingRef = useRef(false);

  const handleCreateNote = async () => {
    if (isSubmittingRef.current) return;
    if (!newNoteTitle.trim() && !newNoteBody.trim() && checklistItems.every((i) => !i.text.trim())) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    const today = new Date();
    const formattedDate = `${String(today.getDate()).padStart(2, "0")}.${String(
      today.getMonth() + 1
    ).padStart(2, "0")}.${today.getFullYear()}`;

    const userEmail = currentUser?.email || "samundriabdullah560@gmail.com";
    const cleanedChecklist = isChecklist
      ? checklistItems.filter((i) => i.text.trim().length > 0)
      : undefined;

    try {
      // 1. Always save in user's persistent local storage immediately
      const savedNote = await saveUserNote(
        {
          title: newNoteTitle.trim() || (isChecklist ? "New Checklist" : "New Note"),
          body: newNoteBody.trim() || newNoteTitle.trim(),
          folder: selectedFolder,
          date: formattedDate,
          isChecklist,
          checklistItems: cleanedChecklist,
          imageUrl: newNoteImage,
        },
        userEmail
      );

      // Immediately sync state in home
      setUserNotes((prev) => [savedNote, ...prev.filter((n) => n._id !== savedNote._id)]);

      // 2. Fire-and-forget sync to Convex if reachable (do NOT block UI)
      createNoteMutation({
        title: newNoteTitle.trim() || (isChecklist ? "New Checklist" : "New Note"),
        body: newNoteBody.trim() || newNoteTitle.trim(),
        folder: selectedFolder,
        date: formattedDate,
        isChecklist,
        checklistItems: cleanedChecklist,
        imageUrl: newNoteImage,
      }).catch(() => {});
    } catch (err) {
      console.warn("Failed to create note:", err);
    } finally {
      setNewNoteTitle("");
      setNewNoteBody("");
      setNewNoteImage(undefined);
      setIsChecklist(false);
      setChecklistItems([{ id: "1", text: "", checked: false }]);
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }

    // Smoothly close bottom sheet and open notes screen
    closeCreateNoteSheet(() => {
      router.push({
        pathname: "/notes" as any,
        params: { folder: selectedFolder },
      });
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={openEditNameModal}
          activeOpacity={0.7}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <Text style={styles.welcomeText}>
              Welcome, {currentUser?.username || "Friend"} !
            </Text>
            <Feather name="edit-2" size={12} color="#6C5CE7" style={{ marginBottom: 4 }} />
          </View>
          <Text style={styles.appTitle}>Note Book App</Text>
        </TouchableOpacity>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={onRefresh}
            onLongPress={() => {
              if (DevSettings && typeof DevSettings.reload === "function") {
                DevSettings.reload();
              }
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="reload" size={20} color="#6C5CE7" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => seedMutation().catch(() => {})}
            activeOpacity={0.7}
          >
            <RingingBellIcon size={26} color="#9D9ABF" strokeWidth={2.2} />
            <View style={styles.notificationDot} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.avatarTouchable}
            onPress={() => setIsProfilePicModalOpen(true)}
            activeOpacity={0.8}
          >
            <Image
              source={{
                uri: currentUser?.profilePic || defaultAvatarUri,
              }}
              style={styles.avatar}
            />
            <View style={styles.avatarEditBadgeSmall}>
              <Ionicons name="camera" size={9} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* 1. Folders Tab */}
      {activeTab === "folders" && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#6C5CE7"]}
              tintColor="#6C5CE7"
            />
          }
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 130 }]}
        >
          {/* Available Space Hero Card */}
          <View style={styles.heroCardWrapper}>
            <View style={styles.heroShadeBottom} />
            <View style={styles.heroShadeMiddle} />

            <View style={styles.heroCard}>
              <View style={styles.heroIconBox}>
                <View style={styles.pieChart}>
                  <View style={styles.pieRow}>
                    <View style={styles.pieSliceOrange} />
                    <View style={styles.pieSliceBlueTR} />
                  </View>
                  <View style={styles.pieRow}>
                    <View style={styles.pieSliceBlueBL} />
                    <View style={styles.pieSliceBlueBR} />
                  </View>
                </View>
              </View>

              <View style={styles.heroTextContainer}>
                <Text style={styles.heroTitle}>Available Space</Text>
                <Text style={styles.heroSubtitle}>
                  {storageUsed} GB of {storageTotal} GB Used
                </Text>
              </View>
            </View>
          </View>

          {/* Categories / Folders 2x2 Grid */}
          <View style={styles.gridContainer}>
            {folders.map((item, index) => (
              <FolderCard
                key={index}
                name={item.name}
                filesCount={item.filesCount}
                sizeDisplay={item.sizeDisplay}
                onPress={() => {
                  router.push({
                    pathname: "/notes" as any,
                    params: {
                      folder: item.name,
                    },
                  });
                }}
              />
            ))}
          </View>
        </ScrollView>
      )}

      {/* 2. Checklists Tab */}
      {activeTab === "checklists" && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 130 }]}
        >
          <View style={styles.tabBanner}>
            <View style={styles.tabBannerIconWrapper}>
              <ChecklistTabIcon size={24} color="#6C5CE7" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.tabBannerTitle}>My Checklists & Tasks</Text>
              <Text style={styles.tabBannerSubtitle}>
                {userNotes.filter((n) => n.isChecklist || (n.checklistItems && n.checklistItems.length > 0)).length} active lists
              </Text>
            </View>
          </View>

          {userNotes.filter((n) => n.isChecklist || (n.checklistItems && n.checklistItems.length > 0)).length === 0 ? (
            <View style={styles.tabEmptyContainer}>
              <Ionicons name="checkmark-done-circle-outline" size={56} color="#CBD5E1" />
              <Text style={styles.tabEmptyTitle}>No Checklists Yet</Text>
              <Text style={styles.tabEmptySubtitle}>
                Stay organized by creating checklists. Tap the center + button below to add tasks.
              </Text>
            </View>
          ) : (
            userNotes
              .filter((n) => n.isChecklist || (n.checklistItems && n.checklistItems.length > 0))
              .map((note) => (
                <View key={note._id} style={styles.checklistCard}>
                  <TouchableOpacity
                    style={styles.checklistCardHeader}
                    activeOpacity={0.7}
                    onPress={() => {
                      if (isLongPressActiveRef.current) {
                        isLongPressActiveRef.current = false;
                        return;
                      }
                      router.push({
                        pathname: "/notes" as any,
                        params: { folder: note.folder || "Personal", noteId: note._id },
                      });
                    }}
                    onLongPress={() => {
                      isLongPressActiveRef.current = true;
                      setNoteToDelete(note);
                    }}
                    delayLongPress={350}
                    onPressOut={() => {
                      setTimeout(() => {
                        isLongPressActiveRef.current = false;
                      }, 200);
                    }}
                  >
                    <Text style={styles.checklistCardTitle}>{note.title}</Text>
                    <View style={styles.checklistFolderBadge}>
                      <Text style={styles.checklistFolderText}>{note.folder || "Personal"}</Text>
                    </View>
                  </TouchableOpacity>
                  {note.checklistItems && note.checklistItems.length > 0 ? (
                    <View style={styles.checklistItemsWrapper}>
                      {note.checklistItems.map((item) => (
                        <TouchableOpacity
                          key={item.id}
                          style={styles.checkItemRow}
                          activeOpacity={0.7}
                          onPress={() => handleToggleChecklist(note._id, item.id)}
                        >
                          <Ionicons
                            name={item.checked ? "checkbox" : "square-outline"}
                            size={22}
                            color={item.checked ? "#6C5CE7" : "#94A3B8"}
                          />
                          <Text
                            style={[
                              styles.checkItemText,
                              item.checked && styles.checkItemTextChecked,
                            ]}
                          >
                            {item.text}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.checklistBodyFallback}>{note.body || "No items yet."}</Text>
                  )}
                </View>
              ))
          )}
        </ScrollView>
      )}

      {/* 3. Ideas Tab */}
      {activeTab === "ideas" && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 130 }]}
        >
          <View style={styles.tabBanner}>
            <View style={[styles.tabBannerIconWrapper, { backgroundColor: "#FEF3C7" }]}>
              <IdeaBulbTabIcon size={24} color="#D97706" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.tabBannerTitle}>Ideas & Inspiration</Text>
              <Text style={styles.tabBannerSubtitle}>
                Capture thoughts, brainwaves & research notes
              </Text>
            </View>
          </View>

          {userNotes.length === 0 ? (
            <View style={styles.tabEmptyContainer}>
              <Ionicons name="bulb-outline" size={56} color="#CBD5E1" />
              <Text style={styles.tabEmptyTitle}>No Ideas Saved Yet</Text>
              <Text style={styles.tabEmptySubtitle}>
                Got a brilliant idea? Tap the + button below to jot it down before it slips away.
              </Text>
            </View>
          ) : (
            <View style={styles.ideasGrid}>
              {userNotes.map((note) => (
                <TouchableOpacity
                  key={note._id}
                  style={styles.ideaCard}
                  activeOpacity={0.85}
                  onPress={() => {
                    if (isLongPressActiveRef.current) {
                      isLongPressActiveRef.current = false;
                      return;
                    }
                    router.push({
                      pathname: "/notes" as any,
                      params: { folder: note.folder || "Personal", noteId: note._id },
                    });
                  }}
                  onLongPress={() => {
                    isLongPressActiveRef.current = true;
                    setNoteToDelete(note);
                  }}
                  delayLongPress={350}
                  onPressOut={() => {
                    setTimeout(() => {
                      isLongPressActiveRef.current = false;
                    }, 200);
                  }}
                >
                  <View style={styles.ideaCardHeader}>
                    <Text style={styles.ideaFolderTag}>{note.folder || "General"}</Text>
                    <Text style={styles.ideaDateTag}>{note.date}</Text>
                  </View>
                  <Text style={styles.ideaTitle} numberOfLines={2}>
                    {note.title}
                  </Text>
                  {note.body ? (
                    <Text style={styles.ideaBody} numberOfLines={3}>
                      {note.body}
                    </Text>
                  ) : null}
                  {note.imageUrl ? (
                    <View style={styles.ideaImageThumbContainer}>
                      <Image
                        source={{
                          uri:
                            note.imageUrl === "city_plaza"
                              ? "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=600&auto=format&fit=crop&q=80"
                              : note.imageUrl === "cozy_room"
                              ? "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&auto=format&fit=crop&q=80"
                              : note.imageUrl,
                        }}
                        style={styles.ideaImageThumb}
                        resizeMode="cover"
                      />
                    </View>
                  ) : null}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* 4. Settings Tab */}
      {activeTab === "settings" && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 130 }]}
        >
          <View style={styles.settingsContainerInline}>
            {/* Profile info */}
            <View style={styles.settingsProfileRow}>
              <TouchableOpacity
                onPress={() => setIsProfilePicModalOpen(true)}
                activeOpacity={0.8}
                style={styles.settingsAvatarTouchable}
              >
                <Image
                  source={{
                    uri: currentUser?.profilePic || defaultAvatarUri,
                  }}
                  style={styles.settingsAvatar}
                />
                <View style={styles.settingsAvatarBadge}>
                  <Ionicons name="camera" size={13} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <View style={styles.profileNameRow}>
                  <Text style={styles.profileName} numberOfLines={1}>
                    {currentUser?.username || "Abdullah Jutt"}
                  </Text>
                  <TouchableOpacity
                    onPress={openEditNameModal}
                    style={styles.editNamePencilBtn}
                    activeOpacity={0.7}
                  >
                    <Feather name="edit-2" size={13} color="#6C5CE7" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.profileEmail} numberOfLines={1}>
                  {currentUser?.email || "samundriabdullah560@gmail.com"}
                </Text>
                <View style={styles.profileBtnsRow}>
                  <TouchableOpacity
                    onPress={() => setIsProfilePicModalOpen(true)}
                    style={styles.changePhotoBtnInline}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="camera-outline" size={13} color="#6C5CE7" />
                    <Text style={styles.changePhotoBtnText}>Edit Photo</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={openEditNameModal}
                    style={styles.changePhotoBtnInline}
                    activeOpacity={0.7}
                  >
                    <Feather name="user" size={13} color="#6C5CE7" />
                    <Text style={styles.changePhotoBtnText}>Edit Name</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Cloud Sync Status */}
            <View style={styles.syncCard}>
              <View style={styles.syncStatusRow}>
                <View style={styles.statusDotGreen} />
                <Text style={styles.syncTitle}>Cloud Sync Status</Text>
              </View>
              <Text style={styles.syncSubtitle}>
                Active Session for {currentUser?.email || "User"}
              </Text>
            </View>

            {/* Storage Progress */}
            <View style={styles.storageCard}>
              <View style={styles.storageHeaderRow}>
                <Text style={styles.storageLabel}>Device Storage</Text>
                <Text style={styles.storageAmount}>
                  {storageUsed} GB / {storageTotal} GB
                </Text>
              </View>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.min(
                        100,
                        Math.round((storageUsed / storageTotal) * 100)
                      )}%`,
                    },
                  ]}
                />
              </View>
            </View>

            {/* Account & Security Section */}
            <Text style={styles.sectionHeaderTitle}>Account & Security</Text>

            {/* Edit Name button */}
            <TouchableOpacity
              style={styles.editNameSettingBtn}
              activeOpacity={0.8}
              onPress={openEditNameModal}
            >
              <View style={styles.btnIconCircleBlue}>
                <Feather name="user-check" size={17} color="#2563EB" />
              </View>
              <View style={styles.btnTextContainer}>
                <Text style={styles.editNameSettingBtnText}>Edit Name</Text>
                <Text style={styles.btnSubtext}>Change your display name</Text>
              </View>
              <Feather name="chevron-right" size={18} color="#94A3B8" />
            </TouchableOpacity>

            {/* Change Password button */}
            <TouchableOpacity
              style={styles.changePasswordBtn}
              activeOpacity={0.8}
              onPress={() => {
                setIsChangePasswordOpen(true);
                setPasswordError(null);
                setPasswordSuccess(null);
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
              }}
            >
              <View style={styles.btnIconCirclePurple}>
                <Ionicons name="key-outline" size={17} color="#6C5CE7" />
              </View>
              <View style={styles.btnTextContainer}>
                <Text style={styles.changePasswordBtnText}>Change Password</Text>
                <Text style={styles.btnSubtext}>Update your login credentials</Text>
              </View>
              <Feather name="chevron-right" size={18} color="#94A3B8" />
            </TouchableOpacity>

            {/* Log Out button */}
            <TouchableOpacity
              style={styles.logoutBtn}
              activeOpacity={0.8}
              onPress={async () => {
                await logoutUser();
                router.replace("/login" as any);
              }}
            >
              <View style={styles.btnIconCircleOrange}>
                <Feather name="log-out" size={16} color="#EA580C" />
              </View>
              <View style={styles.btnTextContainer}>
                <Text style={styles.logoutBtnText}>Log Out / Switch Account</Text>
                <Text style={styles.btnSubtext}>Sign out of this device session</Text>
              </View>
              <Feather name="chevron-right" size={18} color="#94A3B8" />
            </TouchableOpacity>

            {/* Permanent Delete Account button */}
            <TouchableOpacity
              style={styles.deleteAccountBtn}
              activeOpacity={0.8}
              onPress={() => {
                setIsDeleteAccountOpen(true);
                setDeleteError(null);
                setDeleteConfirmPassword("");
              }}
            >
              <View style={styles.btnIconCircleRed}>
                <Feather name="trash-2" size={16} color="#DC2626" />
              </View>
              <View style={styles.btnTextContainer}>
                <Text style={styles.deleteAccountBtnText}>Permanent Delete Account</Text>
                <Text style={styles.btnSubtextDanger}>Permanently delete account & notes</Text>
              </View>
              <Feather name="chevron-right" size={18} color="#F87171" />
            </TouchableOpacity>

            {/* Re-sync action button */}
            <TouchableOpacity
              style={styles.seedButton}
              activeOpacity={0.8}
              onPress={async () => {
                try {
                  await seedMutation();
                } catch {}
              }}
            >
              <Feather name="refresh-cw" size={16} color="#6C5CE7" />
              <Text style={styles.seedButtonText}>Re-sync Sample Data</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Floating Center Action Button (+) & Persistent Bottom Navigation Bar */}
      {!isChangePasswordOpen && !isDeleteAccountOpen && (
        <BottomNavBar
          activeTab={activeTab}
          onTabPress={(tab) => {
            setSelectedTab(tab);
            router.setParams({ tab });
          }}
          onPlusPress={openCreateNoteSheet}
          bottomOffset={bottomOffset}
        />
      )}

      {/* Create Note Animated Bottom Sheet */}
      <Modal
        visible={isModalOpen}
        transparent
        animationType="none"
        onRequestClose={() => closeCreateNoteSheet()}
        onShow={handleModalShow}
        statusBarTranslucent
      >
        <View style={styles.modalRoot}>
          {/* Animated Dimmed Backdrop */}
          <Animated.View
            style={[
              styles.modalBackdrop,
              {
                opacity: backdropAnim,
              },
            ]}
          >
            <TouchableWithoutFeedback onPress={() => closeCreateNoteSheet()}>
              <View style={{ flex: 1 }} />
            </TouchableWithoutFeedback>
          </Animated.View>

          {/* Animated Bottom Sheet Card */}
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.keyboardAvoidingSheet}
            pointerEvents="box-none"
          >
            <Animated.View
              style={[
                styles.bottomSheetCard,
                {
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <View style={{ width: "100%" }}>
                {/* Drag Handle Bar with PanResponder */}
                  <View {...panResponder.panHandlers} style={styles.sheetHandleWrapper}>
                    <View style={styles.sheetHandleBar} />
                  </View>

                  {/* Header row */}
                  <View style={styles.sheetHeaderRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalTitle}>Create New Note</Text>
                      <Text style={styles.modalSubtitle}>Save a thought, idea or task</Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <TouchableOpacity
                        style={styles.sheetExpandBtn}
                        onPress={() => {
                          closeCreateNoteSheet(() => {
                            router.push({
                              pathname: "/create-note" as any,
                              params: { folder: selectedFolder },
                            });
                          });
                        }}
                        activeOpacity={0.7}
                      >
                        <Feather name="maximize-2" size={16} color="#6C5CE7" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.sheetCloseBtn}
                        onPress={() => closeCreateNoteSheet()}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="close" size={20} color="#64748B" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={{ paddingBottom: 16 }}
                  >
                    {/* Folder selection pills */}
                    <View style={styles.folderPills}>
                      {["Personal", "Academic", "Work", "Others"].map((folderName) => (
                        <TouchableOpacity
                          key={folderName}
                          style={[
                            styles.folderPill,
                            selectedFolder === folderName ? styles.folderPillActive : undefined,
                          ]}
                          onPress={() => setSelectedFolder(folderName)}
                        >
                          <Text
                            style={[
                              styles.folderPillText,
                              selectedFolder === folderName ? styles.folderPillTextActive : undefined,
                            ]}
                          >
                            {folderName}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Note Type Toggle (Text vs Checklist) */}
                    <View style={styles.typeToggleRow}>
                      <TouchableOpacity
                        style={[styles.typeBtn, !isChecklist && styles.typeBtnActive]}
                        onPress={() => setIsChecklist(false)}
                      >
                        <Ionicons
                          name="document-text-outline"
                          size={15}
                          color={!isChecklist ? "#6C5CE7" : "#64748B"}
                        />
                        <Text
                          style={[styles.typeBtnText, !isChecklist && styles.typeBtnTextActive]}
                        >
                          Text Note
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.typeBtn, isChecklist && styles.typeBtnActive]}
                        onPress={() => setIsChecklist(true)}
                      >
                        <Ionicons
                          name="checkbox-outline"
                          size={15}
                          color={isChecklist ? "#6C5CE7" : "#64748B"}
                        />
                        <Text
                          style={[styles.typeBtnText, isChecklist && styles.typeBtnTextActive]}
                        >
                          Checklist
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <TextInput
                      style={styles.modalInput}
                      placeholder={isChecklist ? "Checklist Title (e.g. Daily Tasks)" : "Note Title"}
                      placeholderTextColor="#94A3B8"
                      value={newNoteTitle}
                      onChangeText={setNewNoteTitle}
                      autoFocus
                    />

                    {!isChecklist ? (
                      <TextInput
                        style={[styles.modalInput, styles.modalTextArea]}
                        placeholder="Write your note description..."
                        placeholderTextColor="#94A3B8"
                        value={newNoteBody}
                        onChangeText={setNewNoteBody}
                        multiline
                        numberOfLines={4}
                      />
                    ) : (
                      <View style={styles.sheetChecklistSection}>
                        <Text style={styles.sheetChecklistLabel}>Checklist Items</Text>
                        {checklistItems.map((item, idx) => (
                          <View key={item.id} style={styles.checkItemInputRow}>
                            <Ionicons name="square-outline" size={18} color="#6C5CE7" />
                            <TextInput
                              style={styles.checkTextInput}
                              placeholder={`Item ${idx + 1}`}
                              placeholderTextColor="#94A3B8"
                              value={item.text}
                              onChangeText={(t) => handleUpdateChecklistItem(item.id, t)}
                            />
                            {checklistItems.length > 1 && (
                              <TouchableOpacity
                                onPress={() => handleRemoveChecklistItem(item.id)}
                                style={{ padding: 4 }}
                              >
                                <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
                              </TouchableOpacity>
                            )}
                          </View>
                        ))}
                        <TouchableOpacity
                          style={styles.addItemBtn}
                          onPress={handleAddChecklistItem}
                        >
                          <Ionicons name="add-circle-outline" size={17} color="#6C5CE7" />
                          <Text style={styles.addItemText}>Add another item</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* Quick Image Picker Options */}
                    <View style={styles.quickImageRow}>
                      <TouchableOpacity
                        style={styles.quickImageBtn}
                        onPress={handlePickQuickImage}
                        disabled={isPickingQuickImage}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="images-outline" size={16} color="#208AEF" />
                        <Text style={styles.quickImageBtnText}>
                          {newNoteImage ? "Crop / Change" : "Gallery (Crop)"}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.quickImageBtn}
                        onPress={handleTakeQuickPhoto}
                        disabled={isPickingQuickImage}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="camera-outline" size={16} color="#208AEF" />
                        <Text style={styles.quickImageBtnText}>Camera (Crop)</Text>
                      </TouchableOpacity>

                      {newNoteImage ? (
                        <TouchableOpacity
                          style={styles.quickRemoveBtn}
                          onPress={() => setNewNoteImage(undefined)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="trash-outline" size={15} color="#EF4444" />
                          <Text style={styles.quickRemoveText}>Remove</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>

                    {isPickingQuickImage && (
                      <View style={styles.quickLoadingWrapper}>
                        <ActivityIndicator color="#208AEF" size="small" />
                        <Text style={styles.quickLoadingText}>Opening photo cropper...</Text>
                      </View>
                    )}

                    {newNoteImage ? (
                      <View style={styles.quickPreviewWrapper}>
                        <View style={styles.quickPreviewContainer}>
                          <Image
                            source={{ uri: newNoteImage }}
                            style={styles.quickPreviewImage}
                            resizeMode="cover"
                          />
                        </View>
                        <View style={styles.quickPreviewFooter}>
                          <View style={styles.quickDoneBadge}>
                            <Ionicons name="checkmark-circle" size={15} color="#16A34A" />
                            <Text style={styles.quickDoneText}>Photo Attached & Done</Text>
                          </View>
                          <TouchableOpacity
                            style={styles.quickCropActionBtn}
                            onPress={handlePickQuickImage}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="crop-outline" size={13} color="#208AEF" />
                            <Text style={styles.quickCropActionText}>Crop</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : null}

                    <View style={styles.modalActions}>
                      <TouchableOpacity
                        style={styles.modalCancel}
                        onPress={() => closeCreateNoteSheet()}
                      >
                        <Text style={styles.cancelText}>Cancel</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.modalSubmit}
                        onPress={handleCreateNote}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                          <Text style={styles.submitText}>Save Note</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </ScrollView>
                </View>
            </Animated.View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Edit Profile Picture Modal */}
      <Modal
        visible={isProfilePicModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isUpdatingAvatar) setIsProfilePicModalOpen(false);
        }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            if (!isUpdatingAvatar) setIsProfilePicModalOpen(false);
          }}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={styles.profilePicModalCard}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.profilePicModalHeader}>
              <View style={styles.profilePicPreviewBox}>
                <Image
                  source={{
                    uri: currentUser?.profilePic || defaultAvatarUri,
                  }}
                  style={styles.profilePicModalImg}
                />
              </View>
              <Text style={styles.profilePicModalTitle}>Profile Photo</Text>
              <Text style={styles.profilePicModalSubtitle}>
                Select a photo from your gallery or take a new one
              </Text>
            </View>

            {isUpdatingAvatar ? (
              <View style={styles.profilePicLoadingBox}>
                <ActivityIndicator color="#6C5CE7" size="large" />
                <Text style={styles.profilePicLoadingText}>Processing photo...</Text>
              </View>
            ) : (
              <View style={styles.profilePicOptionsList}>
                <TouchableOpacity
                  style={styles.profilePicOptionBtn}
                  onPress={handlePickProfilePic}
                  activeOpacity={0.8}
                >
                  <View style={[styles.profilePicOptionIconCircle, { backgroundColor: "#F3F0FF" }]}>
                    <Ionicons name="images-outline" size={20} color="#6C5CE7" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.profilePicOptionTitle}>Choose from Gallery (Crop)</Text>
                    <Text style={styles.profilePicOptionDesc}>Select and crop square image</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.profilePicOptionBtn}
                  onPress={handleTakeProfilePhoto}
                  activeOpacity={0.8}
                >
                  <View style={[styles.profilePicOptionIconCircle, { backgroundColor: "#EFF6FF" }]}>
                    <Ionicons name="camera-outline" size={20} color="#2563EB" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.profilePicOptionTitle}>Take Photo with Camera</Text>
                    <Text style={styles.profilePicOptionDesc}>Capture new square profile picture</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.profilePicOptionBtn}
                  onPress={() => {
                    setIsProfilePicModalOpen(false);
                    setTimeout(() => openEditNameModal(), 200);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={[styles.profilePicOptionIconCircle, { backgroundColor: "#F0FDF4" }]}>
                    <Feather name="user-check" size={20} color="#16A34A" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.profilePicOptionTitle}>Edit Display Name</Text>
                    <Text style={styles.profilePicOptionDesc}>Change your account display name</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                </TouchableOpacity>

                {currentUser?.profilePic ? (
                  <TouchableOpacity
                    style={styles.profilePicOptionBtn}
                    onPress={handleRemoveProfilePic}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.profilePicOptionIconCircle, { backgroundColor: "#FEF2F2" }]}>
                      <Ionicons name="trash-outline" size={20} color="#EF4444" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.profilePicOptionTitle, { color: "#EF4444" }]}>
                        Remove Photo
                      </Text>
                      <Text style={styles.profilePicOptionDesc}>Reset to default avatar</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                  </TouchableOpacity>
                ) : null}
              </View>
            )}

            <TouchableOpacity
              style={styles.profilePicModalCloseBtn}
              onPress={() => setIsProfilePicModalOpen(false)}
              disabled={isUpdatingAvatar}
              activeOpacity={0.8}
            >
              <Text style={styles.profilePicModalCloseText}>Close</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Edit Name Modal */}
      <Modal
        visible={isEditNameModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isSavingName) setIsEditNameModalOpen(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardAvoidingModal}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => {
              if (!isSavingName) {
                Keyboard.dismiss();
                setIsEditNameModalOpen(false);
              }
            }}
          >
            <TouchableOpacity
              activeOpacity={1}
              style={styles.actionModalCard}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.actionModalHeader}>
                <View style={styles.actionModalTitleRow}>
                  <View style={[styles.iconCirclePurple, { backgroundColor: "#EEF2FF" }]}>
                    <Feather name="user-check" size={20} color="#4F46E5" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.actionModalTitle}>Edit Your Name</Text>
                    <Text style={styles.actionModalSubtitle} numberOfLines={1}>
                      Update your display name
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => setIsEditNameModalOpen(false)}
                  style={styles.closeBtnSmall}
                  disabled={isSavingName}
                >
                  <Ionicons name="close" size={20} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              <View style={styles.formInputGroup}>
                <Text style={styles.formLabel}>Full Name / Display Name</Text>
                <View style={styles.formInputWrapper}>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Enter your name"
                    placeholderTextColor="#94A3B8"
                    value={editedName}
                    onChangeText={(val) => {
                      setEditedName(val);
                      if (editNameError) setEditNameError(null);
                    }}
                    autoCapitalize="words"
                    maxLength={40}
                  />
                  {editedName.trim().length > 0 && (
                    <TouchableOpacity
                      onPress={() => setEditedName("")}
                      style={styles.eyeBtnSmall}
                    >
                      <Ionicons name="close-circle" size={18} color="#94A3B8" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {editNameError && (
                <View style={styles.errorAlertCard}>
                  <Ionicons name="alert-circle" size={18} color="#EF4444" />
                  <Text style={styles.errorAlertText}>{editNameError}</Text>
                </View>
              )}

              <View style={styles.actionModalFooter}>
                <TouchableOpacity
                  style={styles.actionModalCancelBtn}
                  onPress={() => setIsEditNameModalOpen(false)}
                  disabled={isSavingName}
                >
                  <Text style={styles.actionModalCancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.actionModalPrimaryBtn,
                    isSavingName && { opacity: 0.7 },
                  ]}
                  onPress={handleSaveName}
                  disabled={isSavingName}
                >
                  {isSavingName ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.actionModalPrimaryText}>Save Name</Text>
                  )}
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        visible={isChangePasswordOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isChangingPassword) setIsChangePasswordOpen(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardAvoidingModal}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => {
              if (!isChangingPassword) {
                Keyboard.dismiss();
                setIsChangePasswordOpen(false);
              }
            }}
          >
            <TouchableOpacity
              activeOpacity={1}
              style={styles.actionModalCard}
              onPress={(e) => e.stopPropagation()}
            >
              {/* Header */}
            <View style={styles.actionModalHeader}>
              <View style={styles.actionModalTitleRow}>
                <View style={styles.iconCirclePurple}>
                  <Ionicons name="key-outline" size={20} color="#6C5CE7" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.actionModalTitle}>Change Password</Text>
                  <Text style={styles.actionModalSubtitle} numberOfLines={1}>
                    {currentUser?.email}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setIsChangePasswordOpen(false)}
                disabled={isChangingPassword}
                style={styles.closeBtnSmall}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Error Alert */}
            {passwordError && (
              <View style={styles.errorAlertCard}>
                <Ionicons name="alert-circle" size={18} color="#EF4444" />
                <Text style={styles.errorAlertText}>{passwordError}</Text>
              </View>
            )}

            {/* Success Alert */}
            {passwordSuccess && (
              <View style={styles.successAlertCard}>
                <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
                <Text style={styles.successAlertText}>{passwordSuccess}</Text>
              </View>
            )}

            {/* Current Password Field */}
            <View style={styles.formInputGroup}>
              <Text style={styles.formLabel}>Current Password</Text>
              <View style={styles.formInputWrapper}>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter current password"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showCurrentPass}
                  value={currentPassword}
                  onChangeText={(val) => {
                    setCurrentPassword(val);
                    if (passwordError) setPasswordError(null);
                  }}
                />
                <TouchableOpacity
                  onPress={() => setShowCurrentPass(!showCurrentPass)}
                  style={styles.eyeBtnSmall}
                >
                  <Ionicons
                    name={showCurrentPass ? "eye-off-outline" : "eye-outline"}
                    size={18}
                    color="#94A3B8"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* New Password Field */}
            <View style={styles.formInputGroup}>
              <Text style={styles.formLabel}>New Password</Text>
              <View style={styles.formInputWrapper}>
                <TextInput
                  style={styles.formInput}
                  placeholder="At least 4 characters"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showNewPass}
                  value={newPassword}
                  onChangeText={(val) => {
                    setNewPassword(val);
                    if (passwordError) setPasswordError(null);
                  }}
                />
                <TouchableOpacity
                  onPress={() => setShowNewPass(!showNewPass)}
                  style={styles.eyeBtnSmall}
                >
                  <Ionicons
                    name={showNewPass ? "eye-off-outline" : "eye-outline"}
                    size={18}
                    color="#94A3B8"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm New Password Field */}
            <View style={styles.formInputGroup}>
              <Text style={styles.formLabel}>Confirm New Password</Text>
              <View style={styles.formInputWrapper}>
                <TextInput
                  style={styles.formInput}
                  placeholder="Re-enter new password"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showConfirmPass}
                  value={confirmPassword}
                  onChangeText={(val) => {
                    setConfirmPassword(val);
                    if (passwordError) setPasswordError(null);
                  }}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPass(!showConfirmPass)}
                  style={styles.eyeBtnSmall}
                >
                  <Ionicons
                    name={showConfirmPass ? "eye-off-outline" : "eye-outline"}
                    size={18}
                    color="#94A3B8"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionModalFooter}>
              <TouchableOpacity
                style={styles.actionModalCancelBtn}
                onPress={() => setIsChangePasswordOpen(false)}
                disabled={isChangingPassword}
              >
                <Text style={styles.actionModalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionModalPrimaryBtn,
                  isChangingPassword && { opacity: 0.7 },
                ]}
                onPress={handleChangePassword}
                disabled={isChangingPassword}
              >
                {isChangingPassword ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.actionModalPrimaryText}>Update Password</Text>
                )}
              </TouchableOpacity>
            </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* Permanent Delete Account Confirmation Modal */}
      <Modal
        visible={isDeleteAccountOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isDeletingAccount) setIsDeleteAccountOpen(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardAvoidingModal}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => {
              if (!isDeletingAccount) {
                Keyboard.dismiss();
                setIsDeleteAccountOpen(false);
              }
            }}
          >
            <TouchableOpacity
              activeOpacity={1}
              style={styles.actionModalCard}
              onPress={(e) => e.stopPropagation()}
            >
              {/* Warning Header */}
            <View style={styles.dangerHeaderRow}>
              <View style={styles.iconCircleRedLarge}>
                <Feather name="alert-triangle" size={24} color="#DC2626" />
              </View>
              <Text style={styles.dangerTitle}>Permanent Account Deletion</Text>
              <Text style={styles.dangerSubtitle}>
                This action is permanent and cannot be undone.
              </Text>
            </View>

            {/* Warning Info Box */}
            <View style={styles.dangerWarningBox}>
              <Text style={styles.dangerWarningText}>
                Deleting this account will permanently erase:
              </Text>
              <Text style={styles.dangerBullet}>
                • Account credentials ({currentUser?.email})
              </Text>
              <Text style={styles.dangerBullet}>
                • All user notes, folders & checklists
              </Text>
              <Text style={styles.dangerBullet}>
                • All associated local device data
              </Text>
            </View>

            {/* Password input for safety */}
            <View style={styles.formInputGroup}>
              <Text style={styles.formLabel}>Enter password to confirm deletion:</Text>
              <View style={styles.formInputWrapper}>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter current password"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showDeleteConfirmPass}
                  value={deleteConfirmPassword}
                  onChangeText={(val) => {
                    setDeleteConfirmPassword(val);
                    if (deleteError) setDeleteError(null);
                  }}
                />
                <TouchableOpacity
                  onPress={() => setShowDeleteConfirmPass(!showDeleteConfirmPass)}
                  style={styles.eyeBtnSmall}
                >
                  <Ionicons
                    name={showDeleteConfirmPass ? "eye-off-outline" : "eye-outline"}
                    size={18}
                    color="#94A3B8"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Error Alert */}
            {deleteError && (
              <View style={styles.errorAlertCard}>
                <Ionicons name="alert-circle" size={18} color="#EF4444" />
                <Text style={styles.errorAlertText}>{deleteError}</Text>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionModalFooter}>
              <TouchableOpacity
                style={styles.actionModalCancelBtn}
                onPress={() => setIsDeleteAccountOpen(false)}
                disabled={isDeletingAccount}
              >
                <Text style={styles.actionModalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.dangerConfirmBtn,
                  isDeletingAccount && { opacity: 0.7 },
                ]}
                onPress={handlePermanentDeleteAccount}
                disabled={isDeletingAccount}
              >
                {isDeletingAccount ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Feather name="trash-2" size={15} color="#FFFFFF" />
                    <Text style={styles.dangerConfirmBtnText}>Delete Permanently</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
      {/* Long Press: Delete or Cancel Modal */}
      <Modal
        visible={noteToDelete !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setNoteToDelete(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setNoteToDelete(null)}
        >
          <View style={styles.actionSheetCard}>
            <View style={styles.actionSheetHeader}>
              <View style={styles.dangerIconBadge}>
                <Ionicons name="trash-outline" size={26} color="#EF4444" />
              </View>
              <Text style={styles.actionSheetTitle}>Delete File?</Text>
              <Text style={styles.actionSheetSubtitle} numberOfLines={2}>
                &quot;{noteToDelete?.title || "Untitled"}&quot; ko delete karna chahte hain?
              </Text>
            </View>

            <View style={styles.actionSheetButtons}>
              <TouchableOpacity
                style={styles.actionSheetDeleteBtn}
                activeOpacity={0.8}
                onPress={() => {
                  if (noteToDelete) {
                    const id = noteToDelete._id;
                    setNoteToDelete(null);
                    handleDeleteNote(id);
                  }
                }}
              >
                <Text style={styles.actionSheetDeleteText}>Delete</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionSheetCancelBtn}
                activeOpacity={0.8}
                onPress={() => setNoteToDelete(null)}
              >
                <Text style={styles.actionSheetCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F6F5FB",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
  },
  welcomeText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
    marginBottom: 4,
  },
  appTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1E293B",
    letterSpacing: -0.5,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  iconButton: {
    position: "relative",
    padding: 6,
  },
  notificationDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#6C5CE7",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 110,
  },
  // Hero Space Card Container & Stacked Shades
  heroCardWrapper: {
    position: "relative",
    marginTop: 8,
    marginBottom: 32,
  },
  heroShadeBottom: {
    position: "absolute",
    bottom: -16,
    left: Math.round(HERO_CARD_WIDTH * 0.12),
    right: Math.round(HERO_CARD_WIDTH * 0.12),
    height: 24,
    backgroundColor: "#E4DDFE",
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    zIndex: 1,
  },
  heroShadeMiddle: {
    position: "absolute",
    bottom: -8,
    left: Math.round(HERO_CARD_WIDTH * 0.05),
    right: Math.round(HERO_CARD_WIDTH * 0.05),
    height: 22,
    backgroundColor: "#8E72FA",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    zIndex: 2,
  },
  heroCard: {
    backgroundColor: "#6C42F5",
    borderRadius: 26,
    height: 210,
    minHeight: HERO_CARD_HEIGHT,
    paddingHorizontal: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    zIndex: 3,
    shadowColor: "#6C42F5",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.24,
    shadowRadius: 12,
    elevation: 6,
  },
  heroIconBox: {
    width: HERO_ICON_SIZE,
    height: HERO_ICON_SIZE,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderWidth: 1.2,
    borderColor: "rgba(255, 255, 255, 0.32)",
    justifyContent: "center",
    alignItems: "center",
  },
  pieChart: {
    width: PIE_CHART_SIZE,
    height: PIE_CHART_SIZE,
    justifyContent: "center",
    alignItems: "center",
    gap: 2,
  },
  pieRow: {
    flexDirection: "row",
    gap: 2,
  },
  pieSliceOrange: {
    width: PIE_SLICE_SIZE,
    height: PIE_SLICE_SIZE,
    backgroundColor: "#FFA200",
    borderTopLeftRadius: PIE_SLICE_SIZE,
    shadowColor: "#C2410C",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  pieSliceBlueTR: {
    width: PIE_SLICE_SIZE,
    height: PIE_SLICE_SIZE,
    backgroundColor: "#008AFF",
    borderTopRightRadius: PIE_SLICE_SIZE,
  },
  pieSliceBlueBL: {
    width: PIE_SLICE_SIZE,
    height: PIE_SLICE_SIZE,
    backgroundColor: "#006EE6",
    borderBottomLeftRadius: PIE_SLICE_SIZE,
  },
  pieSliceBlueBR: {
    width: PIE_SLICE_SIZE,
    height: PIE_SLICE_SIZE,
    backgroundColor: "#0078F0",
    borderBottomRightRadius: PIE_SLICE_SIZE,
  },
  heroTextContainer: {
    flex: 1,
    justifyContent: "center",
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.85)",
    fontWeight: "500",
    letterSpacing: 0.1,
  },
  // Folders Grid
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 18,
  },
  // Floating Action Button
  fabButton: {
    position: "absolute",
    alignSelf: "center",
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: "#6352F7",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#6352F7",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.42,
    shadowRadius: 16,
    elevation: 12,
    zIndex: 99,
  },
  // Bottom Nav
  bottomNav: {
    position: "absolute",
    left: 20,
    right: 20,
    height: 70,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 22,
    borderRadius: 35,
    shadowColor: "#1F1A3A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
    zIndex: 10,
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    width: 48,
    height: 48,
  },
  navCenterSpacer: {
    width: 56,
  },
  // Bottom Sheet Modal
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.48)",
    zIndex: 1,
  },
  keyboardAvoidingModal: {
    flex: 1,
    justifyContent: "center",
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  keyboardAvoidingSheet: {
    justifyContent: "flex-end",
    maxHeight: "90%",
    zIndex: 10,
    elevation: 30,
  },
  bottomSheetCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: Platform.OS === "android" ? 24 : 36,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 35,
    zIndex: 20,
  },
  sheetHandleWrapper: {
    width: "100%",
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetHandleBar: {
    width: 44,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#CBD5E1",
  },
  sheetHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sheetExpandBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F0FF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#DDD6FE",
  },
  sheetCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  typeToggleRow: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    padding: 3,
    marginBottom: 14,
  },
  typeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
  },
  typeBtnActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  typeBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
  typeBtnTextActive: {
    color: "#6C5CE7",
  },
  sheetChecklistSection: {
    marginBottom: 14,
  },
  sheetChecklistLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  checkItemInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  checkTextInput: {
    flex: 1,
    fontSize: 14,
    color: "#1E293B",
  },
  addItemBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    marginBottom: 6,
  },
  addItemText: {
    color: "#6C5CE7",
    fontSize: 13,
    fontWeight: "600",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: 16,
  },
  folderPills: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  folderPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
  },
  folderPillActive: {
    backgroundColor: "#6C5CE7",
  },
  folderPillText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },
  folderPillTextActive: {
    color: "#FFFFFF",
  },
  modalInput: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1E293B",
    marginBottom: 14,
  },
  modalTextArea: {
    height: 90,
    textAlignVertical: "top",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  modalCancel: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  cancelText: {
    color: "#64748B",
    fontWeight: "600",
    fontSize: 15,
  },
  modalSubmit: {
    backgroundColor: "#6C5CE7",
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 12,
  },
  submitText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
  settingsModalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    maxHeight: "88%",
  },
  settingsScrollContent: {
    paddingBottom: 10,
  },
  settingsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  settingsTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1E293B",
  },
  settingsProfileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#F8FAFC",
    padding: 14,
    borderRadius: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  settingsAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  profileName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
  },
  profileEmail: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
  syncCard: {
    backgroundColor: "#F0FDF4",
    padding: 12,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#DCFCE7",
  },
  syncStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusDotGreen: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#16A34A",
  },
  syncTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#166534",
  },
  syncSubtitle: {
    fontSize: 11,
    color: "#15803D",
    marginTop: 2,
    paddingLeft: 16,
  },
  storageCard: {
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  storageHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  storageLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  storageAmount: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6C5CE7",
  },
  progressBarBg: {
    height: 7,
    backgroundColor: "#E2E8F0",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#6C5CE7",
    borderRadius: 4,
  },
  sectionHeaderTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.7,
    marginBottom: 10,
    marginTop: 4,
  },
  changePasswordBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  changePasswordBtnText: {
    color: "#1E293B",
    fontSize: 13,
    fontWeight: "700",
  },
  btnIconCirclePurple: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#EDE9FE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  btnIconCircleOrange: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FFEDD5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  btnIconCircleRed: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  btnTextContainer: {
    flex: 1,
  },
  btnSubtext: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  btnSubtextDanger: {
    fontSize: 11,
    color: "#EF4444",
    marginTop: 1,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF7ED",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  logoutBtnText: {
    color: "#C2410C",
    fontSize: 13,
    fontWeight: "700",
  },
  deleteAccountBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  deleteAccountBtnText: {
    color: "#DC2626",
    fontSize: 13,
    fontWeight: "700",
  },
  seedButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#F3F0FF",
    paddingVertical: 11,
    borderRadius: 14,
    marginBottom: 12,
  },
  seedButtonText: {
    color: "#6C5CE7",
    fontSize: 13,
    fontWeight: "700",
  },
  settingsCloseBtn: {
    backgroundColor: "#6C5CE7",
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 6,
  },
  settingsCloseText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  // Submodal Styles
  actionModalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 22,
    width: "100%",
    maxWidth: 390,
  },
  actionModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  actionModalTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  iconCirclePurple: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#EDE9FE",
    alignItems: "center",
    justifyContent: "center",
  },
  actionModalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1E293B",
  },
  actionModalSubtitle: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  closeBtnSmall: {
    padding: 4,
  },
  errorAlertCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    padding: 10,
    borderRadius: 12,
    marginBottom: 14,
  },
  errorAlertText: {
    color: "#DC2626",
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  successAlertCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#DCFCE7",
    padding: 10,
    borderRadius: 12,
    marginBottom: 14,
  },
  successAlertText: {
    color: "#16A34A",
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  formInputGroup: {
    marginBottom: 12,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 6,
  },
  formInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  formInput: {
    flex: 1,
    height: 44,
    fontSize: 14,
    color: "#1E293B",
  },
  eyeBtnSmall: {
    padding: 8,
  },
  actionModalFooter: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  actionModalCancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  actionModalCancelText: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "700",
  },
  actionModalPrimaryBtn: {
    flex: 1.4,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#6C5CE7",
    alignItems: "center",
    justifyContent: "center",
  },
  actionModalPrimaryText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  // Danger Deletion Modal
  dangerHeaderRow: {
    alignItems: "center",
    marginBottom: 14,
  },
  iconCircleRedLarge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  dangerTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#1E293B",
    textAlign: "center",
  },
  dangerSubtitle: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    marginTop: 4,
  },
  dangerWarningBox: {
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
    marginBottom: 14,
  },
  dangerWarningText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#991B1B",
    marginBottom: 6,
  },
  dangerBullet: {
    fontSize: 12,
    color: "#B91C1C",
    marginTop: 2,
    lineHeight: 17,
  },
  dangerConfirmBtn: {
    flex: 1.4,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#DC2626",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  dangerConfirmBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  // Tab Content Styles
  tabBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 20,
    marginBottom: 16,
    gap: 14,
    shadowColor: "#1F1A3A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  tabBannerIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EDE9FE",
    alignItems: "center",
    justifyContent: "center",
  },
  tabBannerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1E293B",
  },
  tabBannerSubtitle: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
  tabEmptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 50,
    paddingHorizontal: 24,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    gap: 10,
  },
  tabEmptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#334155",
  },
  tabEmptySubtitle: {
    fontSize: 13,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 18,
  },
  checklistCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#1F1A3A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  checklistCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  checklistCardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    flex: 1,
  },
  checklistFolderBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  checklistFolderText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  checklistItemsWrapper: {
    gap: 8,
  },
  checkItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 4,
  },
  checkItemText: {
    fontSize: 14,
    color: "#334155",
    flex: 1,
  },
  checkItemTextChecked: {
    textDecorationLine: "line-through",
    color: "#94A3B8",
  },
  checklistBodyFallback: {
    fontSize: 13,
    color: "#64748B",
  },
  ideasGrid: {
    gap: 12,
  },
  ideaCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    shadowColor: "#1F1A3A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  ideaCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  ideaFolderTag: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6C5CE7",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  ideaDateTag: {
    fontSize: 11,
    color: "#94A3B8",
  },
  ideaTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 4,
  },
  ideaBody: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 18,
  },
  ideaImageThumbContainer: {
    width: "100%",
    height: 100,
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 10,
    backgroundColor: "#F1F5F9",
  },
  ideaImageThumb: {
    width: "100%",
    height: "100%",
  },
  quickImageRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
    alignItems: "center",
  },
  quickImageBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F5F3FF",
    borderWidth: 1,
    borderColor: "#DDD6FE",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  quickImageBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6C5CE7",
  },
  quickRemoveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
  },
  quickRemoveText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#EF4444",
  },
  quickLoadingWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  quickLoadingText: {
    fontSize: 12,
    color: "#6C5CE7",
  },
  quickPreviewWrapper: {
    marginBottom: 14,
  },
  quickPreviewContainer: {
    width: "100%",
    height: 140,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  quickPreviewImage: {
    width: "100%",
    height: "100%",
  },
  quickPreviewFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
    paddingHorizontal: 4,
  },
  quickDoneBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  quickDoneText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#15803D",
  },
  quickCropActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F3F0FF",
    borderWidth: 1,
    borderColor: "#DDD6FE",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  quickCropActionText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6C5CE7",
  },
  settingsContainerInline: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    shadowColor: "#1F1A3A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },
  avatarTouchable: {
    position: "relative",
  },
  avatarEditBadgeSmall: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: "#6C5CE7",
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  settingsAvatarTouchable: {
    position: "relative",
    alignSelf: "center",
  },
  settingsAvatarBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    backgroundColor: "#6C5CE7",
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  changePhotoBtnInline: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: 6,
    backgroundColor: "#F3F0FF",
    borderWidth: 1,
    borderColor: "#DDD6FE",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    marginTop: 10,
  },
  changePhotoBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6C5CE7",
  },
  profilePicModalCard: {
    backgroundColor: "#FFFFFF",
    width: "100%",
    maxWidth: 360,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  profilePicModalHeader: {
    alignItems: "center",
    marginBottom: 20,
  },
  profilePicPreviewBox: {
    width: 88,
    height: 88,
    borderRadius: 44,
    overflow: "hidden",
    borderWidth: 3,
    borderColor: "#6C5CE7",
    marginBottom: 12,
    backgroundColor: "#F1F5F9",
  },
  profilePicModalImg: {
    width: "100%",
    height: "100%",
  },
  profilePicModalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 4,
  },
  profilePicModalSubtitle: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  profilePicLoadingBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    gap: 10,
  },
  profilePicLoadingText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6C5CE7",
  },
  profilePicOptionsList: {
    width: "100%",
    gap: 10,
    marginBottom: 16,
  },
  profilePicOptionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  profilePicOptionIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  profilePicOptionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
  },
  profilePicOptionDesc: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 1,
  },
  profilePicModalCloseBtn: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
  },
  profilePicModalCloseText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
  },
  profileNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  editNamePencilBtn: {
    padding: 5,
    backgroundColor: "#F3F0FF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#DDD6FE",
  },
  profileBtnsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  editNameSettingBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F9FF",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#BAE6FD",
  },
  editNameSettingBtnText: {
    color: "#0369A1",
    fontSize: 13,
    fontWeight: "700",
  },
  btnIconCircleBlue: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#E0F2FE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  actionSheetCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    width: "88%",
    maxWidth: 360,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  actionSheetHeader: {
    alignItems: "center",
    marginBottom: 20,
  },
  dangerIconBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  actionSheetTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 6,
  },
  actionSheetSubtitle: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  actionSheetButtons: {
    width: "100%",
    gap: 10,
  },
  actionSheetDeleteBtn: {
    width: "100%",
    height: 48,
    backgroundColor: "#EF4444",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  actionSheetDeleteText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  actionSheetCancelBtn: {
    width: "100%",
    height: 48,
    backgroundColor: "#F1F5F9",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  actionSheetCancelText: {
    color: "#475569",
    fontSize: 15,
    fontWeight: "600",
  },
});