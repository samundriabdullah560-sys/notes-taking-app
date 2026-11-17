import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { pickImageFromGallery, takePhotoWithCamera } from "../utils/imagePicker";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  CityPlazaIllustration,
  LivingRoomIllustration,
} from "../components/Illustrations";
import { saveUserNote, updateUserNote, getCurrentUser } from "../utils/storage";

export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

const defaultFolders = [
  { name: "Personal" },
  { name: "Academic" },
  { name: "Work" },
  { name: "Others" },
];

export default function CreateNoteScreen() {
  const params = useLocalSearchParams<{
    id?: string;
    title?: string;
    body?: string;
    folder?: string;
    isChecklist?: string;
    checklistItems?: string;
    imageUrl?: string;
  }>();

  const isEditing = Boolean(params.id);
  const liveFolders = useQuery(api.folders.getFolders);
  const createNoteMutation = useMutation(api.notes.createNote);
  const updateNoteMutation = useMutation(api.notes.updateNote);

  const folders =
    Array.isArray(liveFolders) && liveFolders.length > 0
      ? liveFolders
      : defaultFolders;

  const [title, setTitle] = useState(params.title || "");
  const [body, setBody] = useState(params.body || "");
  const [folder, setFolder] = useState(params.folder || "Personal");
  const [isChecklist, setIsChecklist] = useState(params.isChecklist === "true");

  const initialChecklist = (() => {
    if (params.checklistItems) {
      try {
        const parsed = JSON.parse(params.checklistItems);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    return [{ id: "1", text: "", checked: false }];
  })();

  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>(initialChecklist);
  const [selectedImage, setSelectedImage] = useState<string | undefined>(
    params.imageUrl || undefined
  );
  const [isPickingImage, setIsPickingImage] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [customUrlText, setCustomUrlText] = useState("");

  const handlePickFromGallery = async () => {
    setIsPickingImage(true);
    const result = await pickImageFromGallery();
    setIsPickingImage(false);
    if (!result.canceled && result.uri) {
      setSelectedImage(result.uri);
      setShowUrlInput(false);
    }
  };

  const handleTakePhoto = async () => {
    setIsPickingImage(true);
    const result = await takePhotoWithCamera();
    setIsPickingImage(false);
    if (!result.canceled && result.uri) {
      setSelectedImage(result.uri);
      setShowUrlInput(false);
    }
  };

  const handleApplyUrl = () => {
    if (customUrlText.trim()) {
      setSelectedImage(customUrlText.trim());
      setShowUrlInput(false);
      setCustomUrlText("");
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(undefined);
    setShowUrlInput(false);
    setCustomUrlText("");
  };

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

  const isSavingRef = useRef(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (isSavingRef.current) return;
    if (!title.trim() && !body.trim() && checklistItems.every((i) => !i.text.trim())) {
      router.back();
      return;
    }

    isSavingRef.current = true;
    setIsSaving(true);
    const today = new Date();
    const formattedDate = `${String(today.getDate()).padStart(2, "0")}.${String(
      today.getMonth() + 1
    ).padStart(2, "0")}.${today.getFullYear()}`;

    try {
      const user = await getCurrentUser();
      const userEmail = user?.email || "samundriabdullah560@gmail.com";
      const cleanedChecklist = isChecklist
        ? checklistItems.filter((i) => i.text.trim().length > 0)
        : undefined;

      if (isEditing && params.id) {
        // 1. Save in local user-isolated storage immediately
        await updateUserNote(
          params.id,
          {
            title: title.trim() || "Untitled Note",
            body: body.trim(),
            folder,
            isChecklist,
            checklistItems: cleanedChecklist,
            imageUrl: selectedImage,
          },
          userEmail
        );

        // 2. Fire-and-forget sync to Convex if reachable (do NOT block UI)
        updateNoteMutation({
          id: params.id as any,
          title: title.trim() || "Untitled Note",
          body: body.trim(),
          folder,
          isChecklist,
          checklistItems: cleanedChecklist,
          imageUrl: selectedImage,
        }).catch(() => {});
      } else {
        // 1. Save new note in local user-isolated storage immediately
        await saveUserNote(
          {
            title: title.trim() || "Untitled Note",
            body: body.trim(),
            folder,
            date: formattedDate,
            isChecklist,
            checklistItems: cleanedChecklist,
            imageUrl: selectedImage,
          },
          userEmail
        );

        // 2. Fire-and-forget sync to Convex if reachable (do NOT block UI)
        createNoteMutation({
          title: title.trim() || "Untitled Note",
          body: body.trim(),
          folder,
          date: formattedDate,
          isChecklist,
          checklistItems: cleanedChecklist,
          imageUrl: selectedImage,
        }).catch(() => {});
      }
    } catch (err) {
      console.warn("Failed to save note:", err);
    } finally {
      setIsSaving(false);
      isSavingRef.current = false;
    }

    // Return to notes screen without duplicating it on the navigation stack
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace({
        pathname: "/notes" as any,
        params: { folder },
      });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <View style={styles.container}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.cancelBtn}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <Text style={styles.screenTitle}>
              {isEditing ? "Edit Note" : "New Note"}
            </Text>

            <TouchableOpacity
              onPress={handleSave}
              style={[styles.saveBtn, isSaving && { opacity: 0.7 }]}
              disabled={isSaving}
            >
              <Text style={styles.saveBtnText}>
                {isSaving ? "Saving..." : "Save"}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            {/* Category Selector */}
            <Text style={styles.fieldLabel}>Category / Folder</Text>
            <View style={styles.categoryRow}>
              {folders.map((f: any, idx: number) => (
                <TouchableOpacity
                  key={f._id || f.id || idx}
                  style={[
                    styles.categoryChip,
                    folder.toLowerCase() === f.name.toLowerCase() &&
                      styles.categoryChipActive,
                  ]}
                  onPress={() => setFolder(f.name)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      folder.toLowerCase() === f.name.toLowerCase() &&
                        styles.categoryChipTextActive,
                    ]}
                  >
                    {f.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Note Title Input */}
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.titleInput}
                placeholder="Note Title"
                placeholderTextColor="#94A3B8"
                value={title}
                onChangeText={setTitle}
              />
            </View>

            {/* Note Type Toggle (Text vs Checklist) */}
            <View style={styles.typeToggleRow}>
              <TouchableOpacity
                style={[
                  styles.typeBtn,
                  !isChecklist && styles.typeBtnActive,
                ]}
                onPress={() => setIsChecklist(false)}
              >
                <Ionicons
                  name="document-text-outline"
                  size={16}
                  color={!isChecklist ? "#6C5CE7" : "#64748B"}
                />
                <Text
                  style={[
                    styles.typeBtnText,
                    !isChecklist && styles.typeBtnTextActive,
                  ]}
                >
                  Text Note
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeBtn,
                  isChecklist && styles.typeBtnActive,
                ]}
                onPress={() => setIsChecklist(true)}
              >
                <Ionicons
                  name="checkbox-outline"
                  size={16}
                  color={isChecklist ? "#6C5CE7" : "#64748B"}
                />
                <Text
                  style={[
                    styles.typeBtnText,
                    isChecklist && styles.typeBtnTextActive,
                  ]}
                >
                  Checklist
                </Text>
              </TouchableOpacity>
            </View>

            {/* Body or Checklist Content */}
            {!isChecklist ? (
              <View style={styles.bodyInputWrapper}>
                <TextInput
                  style={styles.bodyInput}
                  placeholder="Type your memories here. Write down your thoughts..."
                  placeholderTextColor="#94A3B8"
                  value={body}
                  onChangeText={setBody}
                  multiline
                  textAlignVertical="top"
                />
              </View>
            ) : (
              <View style={styles.checklistSection}>
                <Text style={styles.checklistTitle}>Checklist Items</Text>
                {checklistItems.map((item, idx) => (
                  <View key={item.id} style={styles.checkItemInputRow}>
                    <Ionicons
                      name="square-outline"
                      size={20}
                      color="#6C5CE7"
                    />
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
                        style={styles.removeCheckBtn}
                      >
                        <Ionicons
                          name="close-circle-outline"
                          size={20}
                          color="#EF4444"
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}

                <TouchableOpacity
                  style={styles.addItemBtn}
                  onPress={handleAddChecklistItem}
                >
                  <Ionicons name="add-circle-outline" size={18} color="#6C5CE7" />
                  <Text style={styles.addItemText}>Add another item</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Media Attachment (Images & Illustrations) */}
            <Text style={styles.fieldLabel}>Attach Image / Illustration</Text>

            {/* Quick Action Buttons: Gallery, Camera, Web URL */}
            <View style={styles.imageActionsRow}>
              <TouchableOpacity
                style={styles.imageActionBtn}
                onPress={handlePickFromGallery}
                disabled={isPickingImage}
                activeOpacity={0.8}
              >
                <Ionicons name="images-outline" size={17} color="#6C5CE7" />
                <Text style={styles.imageActionBtnText}>Gallery (Crop)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.imageActionBtn}
                onPress={handleTakePhoto}
                disabled={isPickingImage}
                activeOpacity={0.8}
              >
                <Ionicons name="camera-outline" size={17} color="#6C5CE7" />
                <Text style={styles.imageActionBtnText}>Camera (Crop)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.imageActionBtn,
                  showUrlInput && styles.imageActionBtnActive,
                ]}
                onPress={() => setShowUrlInput(!showUrlInput)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="link-outline"
                  size={17}
                  color={showUrlInput ? "#FFFFFF" : "#6C5CE7"}
                />
                <Text
                  style={[
                    styles.imageActionBtnText,
                    showUrlInput && styles.imageActionBtnTextActive,
                  ]}
                >
                  Link
                </Text>
              </TouchableOpacity>
            </View>

            {/* Web Image URL Input Box */}
            {showUrlInput && (
              <View style={styles.urlInputRow}>
                <TextInput
                  style={styles.urlInput}
                  placeholder="Paste image URL (https://...)"
                  placeholderTextColor="#94A3B8"
                  value={customUrlText}
                  onChangeText={setCustomUrlText}
                  autoCapitalize="none"
                  keyboardType="url"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.urlApplyBtn}
                  onPress={handleApplyUrl}
                  activeOpacity={0.8}
                >
                  <Text style={styles.urlApplyBtnText}>Set</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Loading Indicator */}
            {isPickingImage && (
              <View style={styles.loadingWrapper}>
                <ActivityIndicator color="#6C5CE7" size="small" />
                <Text style={styles.loadingText}>Opening photo...</Text>
              </View>
            )}

            {/* Preset Art Chips */}
            <Text style={styles.subFieldLabel}>Or choose preset art:</Text>
            <View style={styles.mediaChoiceRow}>
              <TouchableOpacity
                style={[
                  styles.mediaChoiceChip,
                  selectedImage === undefined && styles.mediaChoiceChipActive,
                ]}
                onPress={handleRemoveImage}
              >
                <Text
                  style={[
                    styles.mediaChoiceText,
                    selectedImage === undefined && styles.mediaChoiceTextActive,
                  ]}
                >
                  None
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.mediaChoiceChip,
                  selectedImage === "city_plaza" && styles.mediaChoiceChipActive,
                ]}
                onPress={() => {
                  setSelectedImage("city_plaza");
                  setShowUrlInput(false);
                }}
              >
                <Text
                  style={[
                    styles.mediaChoiceText,
                    selectedImage === "city_plaza" &&
                      styles.mediaChoiceTextActive,
                  ]}
                >
                  City Plaza
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.mediaChoiceChip,
                  selectedImage === "cozy_room" && styles.mediaChoiceChipActive,
                ]}
                onPress={() => {
                  setSelectedImage("cozy_room");
                  setShowUrlInput(false);
                }}
              >
                <Text
                  style={[
                    styles.mediaChoiceText,
                    selectedImage === "cozy_room" &&
                      styles.mediaChoiceTextActive,
                  ]}
                >
                  Cozy Room
                </Text>
              </TouchableOpacity>
            </View>

            {/* Attached Image / Illustration Preview */}
            {selectedImage && (
              <View style={styles.imagePreviewWrapper}>
                <View style={styles.previewHeaderRow}>
                  <View style={styles.previewBadge}>
                    <Ionicons name="checkmark-circle" size={15} color="#16A34A" />
                    <Text style={styles.imagePreviewLabel}>Done & Attached</Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    {selectedImage !== "city_plaza" && selectedImage !== "cozy_room" && (
                      <TouchableOpacity
                        onPress={handlePickFromGallery}
                        style={styles.cropActionBtn}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="crop-outline" size={14} color="#6C5CE7" />
                        <Text style={styles.cropActionText}>Crop</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      onPress={handleRemoveImage}
                      style={styles.removeImageBtn}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash-outline" size={14} color="#EF4444" />
                      <Text style={styles.removeImageText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {selectedImage === "city_plaza" ? (
                  <CityPlazaIllustration />
                ) : selectedImage === "cozy_room" ? (
                  <LivingRoomIllustration />
                ) : (
                  <View style={styles.attachedImageContainer}>
                    <Image
                      source={{ uri: selectedImage }}
                      style={styles.attachedImagePreview}
                      resizeMode="cover"
                    />
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  keyboardView: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginTop: Platform.OS === "android" ? 16 : 10,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderColor: "#F1F5F9",
  },
  cancelBtn: {
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  cancelText: {
    color: "#64748B",
    fontSize: 16,
    fontWeight: "500",
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
  },
  saveBtn: {
    backgroundColor: "#6C5CE7",
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 20,
    shadowColor: "#6C5CE7",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
    marginBottom: 10,
    marginTop: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  categoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
  },
  categoryChipActive: {
    backgroundColor: "#6C5CE7",
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  categoryChipTextActive: {
    color: "#FFFFFF",
  },
  inputWrapper: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  titleInput: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
  },
  typeToggleRow: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    padding: 3,
    marginBottom: 16,
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
  bodyInputWrapper: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 180,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  bodyInput: {
    fontSize: 15,
    color: "#334155",
    lineHeight: 22,
  },
  checklistSection: {
    marginBottom: 20,
  },
  checklistTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 8,
  },
  checkItemInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  checkTextInput: {
    flex: 1,
    fontSize: 14,
    color: "#1E293B",
  },
  removeCheckBtn: {
    padding: 2,
  },
  addItemBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    alignSelf: "flex-start",
  },
  addItemText: {
    color: "#6C5CE7",
    fontSize: 14,
    fontWeight: "600",
  },
  subFieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 10,
    marginBottom: 8,
  },
  imageActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 6,
  },
  imageActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#F5F3FF",
    borderWidth: 1,
    borderColor: "#DDD6FE",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 14,
  },
  imageActionBtnActive: {
    backgroundColor: "#6C5CE7",
    borderColor: "#6C5CE7",
  },
  imageActionBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6C5CE7",
  },
  imageActionBtnTextActive: {
    color: "#FFFFFF",
  },
  urlInputRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    marginBottom: 4,
  },
  urlInput: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontSize: 13,
    color: "#1E293B",
  },
  urlApplyBtn: {
    backgroundColor: "#6C5CE7",
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  urlApplyBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  loadingWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },
  loadingText: {
    fontSize: 13,
    color: "#6C5CE7",
    fontWeight: "600",
  },
  previewHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  previewBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  cropActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F3F0FF",
    borderWidth: 1,
    borderColor: "#DDD6FE",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  cropActionText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6C5CE7",
  },
  removeImageBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  removeImageText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#EF4444",
  },
  attachedImageContainer: {
    width: "100%",
    height: 180,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  attachedImagePreview: {
    width: "100%",
    height: "100%",
  },
  mediaChoiceRow: {
    flexDirection: "row",
    gap: 8,
  },
  mediaChoiceChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
  },
  mediaChoiceChipActive: {
    backgroundColor: "#6C5CE7",
  },
  mediaChoiceText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  mediaChoiceTextActive: {
    color: "#FFFFFF",
  },
  imagePreviewWrapper: {
    marginTop: 14,
    marginBottom: 8,
  },
  imagePreviewLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#16A34A",
  },
});
