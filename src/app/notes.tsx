import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Platform,
  KeyboardAvoidingView,
  Animated,
  Dimensions,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  CityPlazaIllustration,
  LivingRoomIllustration,
} from "../components/Illustrations";
import {
  getUserNotes,
  deleteUserNote,
  toggleChecklistItemStorage,
  getCurrentUser,
  StoredNote,
} from "../utils/storage";

export interface NoteItem {
  _id: string;
  title: string;
  body: string;
  folder: string;
  date: string;
  isChecklist?: boolean;
  checklistItems?: { id: string; text: string; checked: boolean }[];
  imageUrl?: string;
  isLocked?: boolean;
  createdAt?: number;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function NotesScreen() {
  const params = useLocalSearchParams<{ folder?: string; noteId?: string }>();
  const folderName = params.folder || "Personal";

  const [activeView, setActiveView] = useState<"A" | "B">("A");
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNote, setSelectedNote] = useState<NoteItem | null | undefined>(undefined);
  const [noteToDelete, setNoteToDelete] = useState<NoteItem | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string>("");
  const [localNotes, setLocalNotes] = useState<StoredNote[]>([]);

  // Right-to-Left animated search bar
  const [searchAnim] = useState(() => new Animated.Value(0));
  const searchInputRef = useRef<any>(null);

  const openSearch = () => {
    setIsSearching(true);
    Animated.spring(searchAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 70,
      friction: 12,
    }).start(() => {
      searchInputRef.current?.focus();
    });
  };

  const closeSearch = () => {
    Keyboard.dismiss();
    Animated.timing(searchAnim, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setIsSearching(false);
      setSearchQuery("");
    });
  };

  // Load user-specific notes whenever screen is focused or parameters change
  const loadNotes = useCallback(async () => {
    const user = await getCurrentUser();
    const email = user?.email || "samundriabdullah560@gmail.com";
    setCurrentUserEmail(email);
    const notesFromStorage = await getUserNotes(email);
    setLocalNotes(notesFromStorage);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadNotes();
    }, [loadNotes])
  );

  // Convex live mutations
  const toggleMutation = useMutation(api.notes.toggleChecklistItem);
  const deleteMutation = useMutation(api.notes.deleteNote);

  // Active notes strictly isolated to current user's notes (new accounts start with 0 files)
  const rawList: any[] = localNotes;

  const notes: NoteItem[] = rawList.filter((n) => {
    const itemFolder = (n.folder || "Personal").trim().toLowerCase();
    const currentFolder = (folderName || "Personal").trim().toLowerCase();
    if (itemFolder !== currentFolder) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (n.title && n.title.toLowerCase().includes(q)) ||
      (n.body && n.body.toLowerCase().includes(q))
    );
  });

  // Divide notes into 2 columns for masonry layout
  const col1Notes = notes.filter((_, i) => i % 2 === 0);
  const col2Notes = notes.filter((_, i) => i % 2 === 1);

  // Derive active note without calling setState inside an effect
  const activeNote =
    selectedNote !== undefined
      ? selectedNote
      : params.noteId
      ? notes.find((n) => n._id === params.noteId) || null
      : null;

  const closeNote = () => {
    setSelectedNote(null);
    if (params.noteId) {
      router.setParams({ noteId: "" });
    }
  };

  const handleToggleChecklist = async (noteId: string, itemId: string) => {
    // 1. Update in local per-user storage immediately
    await toggleChecklistItemStorage(noteId, itemId, currentUserEmail);
    setLocalNotes((prev) =>
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

    // 2. Fire-and-forget sync to Convex if reachable (do NOT await)
    toggleMutation({ noteId: noteId as any, itemId }).catch(() => {});
  };

  const handleDeleteNote = async (id: string) => {
    // 1. Immediately remove from local state so it vanishes instantly on the 1st tap!
    setLocalNotes((prev) => prev.filter((n) => n._id !== id));
    setSelectedNote(null);
    setNoteToDelete(null);

    // 2. Clear route param if this noteId was opened
    if (params.noteId === id) {
      router.setParams({ noteId: "" });
    }

    // 3. Delete from local per-user storage
    try {
      const email = currentUserEmail || (await getCurrentUser())?.email;
      await deleteUserNote(id, email);
    } catch (err) {
      console.warn("Failed to delete note from storage:", err);
    }

    // 4. Fire-and-forget sync to Convex if reachable (do NOT await)
    deleteMutation({ id: id as any }).catch(() => {});
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={20} color="#6C5CE7" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>{folderName}</Text>

          <TouchableOpacity
            style={styles.searchButton}
            onPress={openSearch}
            activeOpacity={0.7}
          >
            <Ionicons name="search" size={18} color="#6C5CE7" />
            <Text style={styles.searchText}>Search</Text>
          </TouchableOpacity>

          {/* Animated Slide-in Search Bar from Right */}
          <Animated.View
            style={[
              styles.animatedSearchHeader,
              {
                transform: [
                  {
                    translateX: searchAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [SCREEN_WIDTH, 0],
                    }),
                  },
                ],
                opacity: searchAnim.interpolate({
                  inputRange: [0, 0.2, 1],
                  outputRange: [0, 1, 1],
                }),
              },
            ]}
            pointerEvents={isSearching ? "auto" : "none"}
          >
            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={16} color="#6C5CE7" />
              <TextInput
                ref={searchInputRef}
                style={styles.animatedSearchTextInput}
                placeholder={`Search in ${folderName}...`}
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchQuery("")}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle" size={16} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={styles.closeSearchBtn}
              onPress={closeSearch}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.closeSearchText}>Cancel</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* View Switcher Bar */}
        <View style={styles.topControlBar}>
          <View style={styles.viewTogglePill}>
            <TouchableOpacity
              style={[
                styles.viewToggleBtn,
                activeView === "A" && styles.viewToggleBtnActive,
              ]}
              onPress={() => setActiveView("A")}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.viewToggleText,
                  activeView === "A" && styles.viewToggleTextActive,
                ]}
              >
                {folderName} notes A
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.viewToggleBtn,
                activeView === "B" && styles.viewToggleBtnActive,
              ]}
              onPress={() => setActiveView("B")}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.viewToggleText,
                  activeView === "B" && styles.viewToggleTextActive,
                ]}
              >
                {folderName} notes B
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Notes Content */}
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {notes.length === 0 && activeView === "A" ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={60} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No notes in {folderName}</Text>
              <Text style={styles.emptySubtitle}>
                You haven&apos;t added any notes here yet. Tap &quot;Add New Notes&quot; below to write your first note!
              </Text>
            </View>
          ) : activeView === "A" ? (
            /* VIEW A: Masonry Layout */
            <View style={styles.masonryRow}>
              <View style={styles.masonryCol}>
                {col1Notes.map((note) => (
                  <NoteCardViewA
                    key={note._id}
                    note={note}
                    onPress={() => setSelectedNote(note)}
                    onLongPress={() => setNoteToDelete(note)}
                    onToggleChecklist={(itemId) =>
                      handleToggleChecklist(note._id, itemId)
                    }
                  />
                ))}
              </View>

              <View style={styles.masonryCol}>
                {col2Notes.map((note) => (
                  <NoteCardViewA
                    key={note._id}
                    note={note}
                    onPress={() => setSelectedNote(note)}
                    onLongPress={() => setNoteToDelete(note)}
                    onToggleChecklist={(itemId) =>
                      handleToggleChecklist(note._id, itemId)
                    }
                  />
                ))}
              </View>
            </View>
          ) : (
            /* VIEW B: Visual Cards Grid */
            <View style={styles.masonryRow}>
              <View style={styles.masonryCol}>
                <TouchableOpacity
                  style={styles.newNoteTile}
                  activeOpacity={0.8}
                  onPress={() =>
                    router.push({
                      pathname: "/create-note" as any,
                      params: { folder: folderName },
                    })
                  }
                >
                  <View style={styles.newNoteIconCircle}>
                    <Ionicons name="add" size={24} color="#6C5CE7" />
                  </View>
                  <Text style={styles.newNoteTileText}>New note</Text>
                </TouchableOpacity>

                {col1Notes.map((note) => (
                  <NoteCardViewB
                    key={note._id}
                    note={note}
                    onPress={() => setSelectedNote(note)}
                    onLongPress={() => setNoteToDelete(note)}
                  />
                ))}
              </View>

              <View style={styles.masonryCol}>
                {col2Notes.map((note) => (
                  <NoteCardViewB
                    key={note._id}
                    note={note}
                    onPress={() => setSelectedNote(note)}
                    onLongPress={() => setNoteToDelete(note)}
                  />
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Note Detail Modal - opens when a note/file is clicked */}
        <Modal
          visible={activeNote !== null}
          animationType="fade"
          transparent
          onRequestClose={closeNote}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1, justifyContent: "center" }}
          >
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => {
                Keyboard.dismiss();
                closeNote();
              }}
            >
              <TouchableOpacity
                activeOpacity={1}
                style={styles.modalCard}
                onPress={(e) => e.stopPropagation()}
              >
                <View style={styles.modalHeader}>
                <Text style={styles.modalTitle} numberOfLines={2}>
                  {activeNote?.title}
                </Text>
                <TouchableOpacity
                  onPress={closeNote}
                  style={styles.closeBtn}
                >
                  <Ionicons name="close" size={22} color="#64748B" />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalDate}>{activeNote?.date}</Text>

              <ScrollView style={styles.modalBodyScroll}>
                <Text style={styles.modalBody}>{activeNote?.body}</Text>

                {activeNote?.isChecklist && activeNote.checklistItems && (
                  <View style={styles.modalChecklist}>
                    {activeNote.checklistItems.map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        style={styles.checkItemRow}
                        onPress={() => {
                          if (activeNote) {
                            handleToggleChecklist(activeNote._id, item.id);
                            setSelectedNote({
                              ...activeNote,
                              checklistItems: activeNote.checklistItems?.map(
                                (ci) =>
                                  ci.id === item.id
                                    ? { ...ci, checked: !ci.checked }
                                    : ci
                              ),
                            });
                          }
                        }}
                      >
                        <Ionicons
                          name={item.checked ? "checkbox" : "square-outline"}
                          size={20}
                          color="#6C5CE7"
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
                )}

                {activeNote?.imageUrl === "city_plaza" && (
                  <CityPlazaIllustration />
                )}
                {activeNote?.imageUrl === "cozy_room" && (
                  <LivingRoomIllustration />
                )}
                {activeNote?.imageUrl &&
                  activeNote.imageUrl !== "city_plaza" &&
                  activeNote.imageUrl !== "cozy_room" && (
                    <View style={styles.modalImageContainer}>
                      <Image
                        source={{ uri: activeNote.imageUrl }}
                        style={styles.modalImage}
                        resizeMode="cover"
                      />
                    </View>
                  )}
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => {
                    if (activeNote) {
                      const noteId = activeNote._id;
                      closeNote();
                      handleDeleteNote(noteId);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={17} color="#EF4444" />
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </TouchableOpacity>

                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => {
                      if (activeNote) {
                        const noteToEdit = activeNote;
                        closeNote();
                        router.push({
                          pathname: "/create-note" as any,
                          params: {
                            id: noteToEdit._id,
                            title: noteToEdit.title,
                            body: noteToEdit.body,
                            folder: noteToEdit.folder,
                            isChecklist: String(Boolean(noteToEdit.isChecklist)),
                            checklistItems: noteToEdit.checklistItems
                              ? JSON.stringify(noteToEdit.checklistItems)
                              : undefined,
                            imageUrl: noteToEdit.imageUrl,
                          },
                        });
                      }
                    }}
                  >
                    <Ionicons name="pencil-outline" size={17} color="#6C5CE7" />
                    <Text style={styles.editBtnText}>Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.doneBtn}
                    onPress={closeNote}
                  >
                    <Text style={styles.doneBtnText}>Done</Text>
                  </TouchableOpacity>
                </View>
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
                    const idToDelete = noteToDelete._id;
                    setNoteToDelete(null);
                    handleDeleteNote(idToDelete);
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
      </View>
    </SafeAreaView>
  );
}

// NOTE CARD COMPONENT FOR VIEW A
function NoteCardViewA({
  note,
  onPress,
  onLongPress,
  onToggleChecklist,
}: {
  note: NoteItem;
  onPress: () => void;
  onLongPress?: () => void;
  onToggleChecklist: (itemId: string) => void;
}) {
  const isLongPressedRef = useRef(false);

  const handleLongPress = () => {
    isLongPressedRef.current = true;
    onLongPress?.();
  };

  const handlePress = () => {
    if (isLongPressedRef.current) {
      isLongPressedRef.current = false;
      return;
    }
    onPress();
  };

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      style={styles.cardA}
      onPress={handlePress}
      onLongPress={handleLongPress}
      delayLongPress={350}
      onPressOut={() => {
        setTimeout(() => {
          isLongPressedRef.current = false;
        }, 200);
      }}
    >
      <Text style={styles.cardTitleA}>{note.title}</Text>

      {note.isChecklist && note.checklistItems ? (
        <View style={styles.checklistWrapper}>
          {note.checklistItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.checkboxRow}
              onPress={() => onToggleChecklist(item.id)}
            >
              <Ionicons
                name={item.checked ? "checkbox" : "square-outline"}
                size={16}
                color={item.checked ? "#6C5CE7" : "#475569"}
              />
              <Text
                style={[
                  styles.checkboxText,
                  item.checked && styles.checkboxTextChecked,
                ]}
                numberOfLines={1}
              >
                {item.text}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <Text style={styles.cardBodyA} numberOfLines={7}>
          {note.body}
        </Text>
      )}

      {note.imageUrl === "city_plaza" && <CityPlazaIllustration />}
      {note.imageUrl === "cozy_room" && <LivingRoomIllustration />}
      {note.imageUrl &&
        note.imageUrl !== "city_plaza" &&
        note.imageUrl !== "cozy_room" && (
          <View style={styles.cardImageContainerA}>
            <Image
              source={{ uri: note.imageUrl }}
              style={styles.cardImageA}
              resizeMode="cover"
            />
          </View>
        )}
    </TouchableOpacity>
  );
}

// NOTE CARD COMPONENT FOR VIEW B
function NoteCardViewB({
  note,
  onPress,
  onLongPress,
}: {
  note: NoteItem;
  onPress: () => void;
  onLongPress?: () => void;
}) {
  const isLongPressedRef = useRef(false);

  const handleLongPress = () => {
    isLongPressedRef.current = true;
    onLongPress?.();
  };

  const handlePress = () => {
    if (isLongPressedRef.current) {
      isLongPressedRef.current = false;
      return;
    }
    onPress();
  };

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      style={styles.cardB}
      onPress={handlePress}
      onLongPress={handleLongPress}
      delayLongPress={350}
      onPressOut={() => {
        setTimeout(() => {
          isLongPressedRef.current = false;
        }, 200);
      }}
    >
      <Text style={styles.cardTitleB} numberOfLines={1}>
        {note.title}
      </Text>

      <Text style={styles.cardBodyB} numberOfLines={4}>
        {note.body}
      </Text>

      {note.imageUrl === "city_plaza" && <CityPlazaIllustration />}
      {note.imageUrl === "cozy_room" && <LivingRoomIllustration />}
      {note.imageUrl &&
        note.imageUrl !== "city_plaza" &&
        note.imageUrl !== "cozy_room" && (
          <View style={styles.cardImageContainerB}>
            <Image
              source={{ uri: note.imageUrl }}
              style={styles.cardImageB}
              resizeMode="cover"
            />
          </View>
        )}

      <View style={styles.cardFooterB}>
        <Text style={styles.cardDateB}>{note.date}</Text>
        {note.isLocked && (
          <Ionicons name="lock-closed-outline" size={14} color="#64748B" />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F7F8FA",
  },
  container: {
    flex: 1,
  },
  header: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 4,
    height: 46,
    overflow: "hidden",
  },
  animatedSearchHeader: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#F7F8FA",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    zIndex: 10,
    gap: 10,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 38,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 8,
  },
  animatedSearchTextInput: {
    flex: 1,
    fontSize: 14,
    color: "#1E293B",
    paddingVertical: 0,
    height: "100%",
  },
  closeSearchBtn: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  closeSearchText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6C5CE7",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  backText: {
    fontSize: 16,
    color: "#6C5CE7",
    fontWeight: "600",
    marginLeft: 2,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1E293B",
  },
  searchButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  searchText: {
    fontSize: 15,
    color: "#6C5CE7",
    fontWeight: "500",
  },
  topControlBar: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  viewTogglePill: {
    flexDirection: "row",
    backgroundColor: "#E2E8F0",
    borderRadius: 24,
    padding: 3,
  },
  viewToggleBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  viewToggleBtnActive: {
    backgroundColor: "#6C5CE7",
  },
  viewToggleText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  viewToggleTextActive: {
    color: "#FFFFFF",
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 130,
  },
  masonryRow: {
    flexDirection: "row",
    gap: 12,
  },
  masonryCol: {
    flex: 1,
    gap: 12,
  },
  cardA: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitleA: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  cardBodyA: {
    fontSize: 12,
    color: "#475569",
    lineHeight: 18,
  },
  checklistWrapper: {
    gap: 6,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  checkboxText: {
    fontSize: 12,
    color: "#334155",
    flex: 1,
  },
  checkboxTextChecked: {
    textDecorationLine: "line-through",
    color: "#94A3B8",
  },
  newNoteTile: {
    backgroundColor: "#F8F7FF",
    borderWidth: 1.5,
    borderColor: "#D8D4FF",
    borderStyle: "dashed",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 36,
    minHeight: 160,
  },
  newNoteIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    shadowColor: "#6C5CE7",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  newNoteTileText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#6C5CE7",
  },
  cardB: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitleB: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 6,
  },
  cardBodyB: {
    fontSize: 12,
    color: "#475569",
    lineHeight: 18,
  },
  cardFooterB: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#F8FAFC",
  },
  cardDateB: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "500",
  },
  fabContainer: {
    position: "absolute",
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  fabBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#6C5CE7",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 28,
    shadowColor: "#6C5CE7",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
    gap: 8,
  },
  fabText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    width: "100%",
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    flex: 1,
    marginRight: 10,
  },
  closeBtn: {
    padding: 4,
  },
  modalDate: {
    fontSize: 12,
    color: "#94A3B8",
    marginBottom: 14,
  },
  modalBodyScroll: {
    maxHeight: 320,
    marginBottom: 16,
  },
  modalBody: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 22,
  },
  modalChecklist: {
    marginTop: 14,
    gap: 10,
  },
  checkItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  checkItemText: {
    fontSize: 14,
    color: "#1E293B",
  },
  checkItemTextChecked: {
    textDecorationLine: "line-through",
    color: "#94A3B8",
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 12,
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  deleteBtnText: {
    color: "#EF4444",
    fontSize: 14,
    fontWeight: "600",
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "#F3F0FF",
  },
  editBtnText: {
    color: "#6C5CE7",
    fontSize: 14,
    fontWeight: "600",
  },
  doneBtn: {
    backgroundColor: "#6C5CE7",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  doneBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#475569",
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 20,
  },
  cardImageContainerA: {
    width: "100%",
    height: 120,
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 10,
    backgroundColor: "#F1F5F9",
  },
  cardImageA: {
    width: "100%",
    height: "100%",
  },
  cardImageContainerB: {
    width: "100%",
    height: 90,
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 8,
    backgroundColor: "#F1F5F9",
  },
  cardImageB: {
    width: "100%",
    height: "100%",
  },
  modalImageContainer: {
    width: "100%",
    height: 180,
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 14,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  modalImage: {
    width: "100%",
    height: "100%",
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
