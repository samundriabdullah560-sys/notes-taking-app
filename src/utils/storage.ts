import { Platform } from "react-native";

interface SimpleStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

const memoryStore = new Map<string, string>();

function getSafeStorage(): SimpleStorage {
  if (Platform.OS === "web") {
    return {
      async getItem(key: string): Promise<string | null> {
        try {
          if (typeof window !== "undefined" && window.localStorage) {
            return window.localStorage.getItem(key);
          }
          return memoryStore.get(key) ?? null;
        } catch {
          return memoryStore.get(key) ?? null;
        }
      },
      async setItem(key: string, value: string): Promise<void> {
        try {
          if (typeof window !== "undefined" && window.localStorage) {
            window.localStorage.setItem(key, value);
          }
          memoryStore.set(key, value);
        } catch {
          memoryStore.set(key, value);
        }
      },
      async removeItem(key: string): Promise<void> {
        try {
          if (typeof window !== "undefined" && window.localStorage) {
            window.localStorage.removeItem(key);
          }
          memoryStore.delete(key);
        } catch {
          memoryStore.delete(key);
        }
      },
    };
  }

  // Native (Android / iOS): load @react-native-async-storage/async-storage for persistent device storage
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const rnc = require("@react-native-async-storage/async-storage");
    const storageInstance = rnc?.default || rnc;
    if (storageInstance && typeof storageInstance.getItem === "function") {
      return storageInstance;
    }
  } catch {
    // Fall through to memory store if require fails
  }

  // Graceful fallback for builds that do not have the native AsyncStorage module compiled
  return {
    async getItem(key: string): Promise<string | null> {
      return memoryStore.get(key) ?? null;
    },
    async setItem(key: string, value: string): Promise<void> {
      memoryStore.set(key, value);
    },
    async removeItem(key: string): Promise<void> {
      memoryStore.delete(key);
    },
  };
}

const AsyncStorage: SimpleStorage = getSafeStorage();

export interface UserAccount {
  username: string;
  email: string;
  password: string;
  createdAt: number;
  profilePic?: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

export interface StoredNote {
  _id: string;
  userEmail: string;
  title: string;
  body: string;
  folder: string;
  date: string;
  isChecklist?: boolean;
  checklistItems?: ChecklistItem[];
  imageUrl?: string;
  isLocked?: boolean;
  createdAt: number;
}

const USERS_KEY = "@note_app_users_v2";
const CURRENT_USER_KEY = "@note_app_current_user_v2";
const NOTES_PREFIX = "@note_app_user_notes_v2_";

// Pre-seeded starter accounts so the user can test right away
const defaultAccounts: UserAccount[] = [
  {
    username: "Abdullah Jutt",
    email: "samundriabdullah560@gmail.com",
    password: "ABDULLAHJUTT",
    createdAt: Date.now(),
  },
  {
    username: "Hakim Gul",
    email: "hakim.gul@nayatel.com",
    password: "password",
    createdAt: Date.now(),
  },
];

// All new accounts start clean with 0 files
export const getStarterNotes = (_userEmail?: string): StoredNote[] => [];

export function getTodayFormattedDate(): string {
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, "0");
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const yyyy = today.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

// ----------------- USER AUTH FUNCTIONS -----------------

export async function getAllUsers(): Promise<UserAccount[]> {
  try {
    const raw = await AsyncStorage.getItem(USERS_KEY);
    if (!raw) {
      await AsyncStorage.setItem(USERS_KEY, JSON.stringify(defaultAccounts));
      return defaultAccounts;
    }
    return JSON.parse(raw);
  } catch {
    return defaultAccounts;
  }
}

export async function registerUser(account: {
  username: string;
  email: string;
  password: string;
}): Promise<{ success: boolean; error?: string; user?: UserAccount }> {
  const emailNorm = account.email.trim().toLowerCase();
  const users = await getAllUsers();

  const existing = users.find((u) => u.email.trim().toLowerCase() === emailNorm);
  if (existing) {
    return {
      success: false,
      error: "An account with this email already exists. Please log in.",
    };
  }

  const newUser: UserAccount = {
    username: account.username.trim() || emailNorm.split("@")[0],
    email: emailNorm,
    password: account.password,
    createdAt: Date.now(),
  };

  const updated = [...users, newUser];
  await AsyncStorage.setItem(USERS_KEY, JSON.stringify(updated));
  await setCurrentUser(newUser);

  // New user starts with zero files
  await AsyncStorage.setItem(
    `${NOTES_PREFIX}${emailNorm}`,
    JSON.stringify([])
  );

  return { success: true, user: newUser };
}

export async function loginUser(
  email: string,
  pass: string
): Promise<{ success: boolean; error?: string; user?: UserAccount }> {
  const emailNorm = email.trim().toLowerCase();
  const users = await getAllUsers();

  const found = users.find((u) => u.email.trim().toLowerCase() === emailNorm);
  if (!found) {
    return {
      success: false,
      error: "No account found with this email. Please sign up first.",
    };
  }

  if (found.password.trim() !== pass.trim()) {
    return {
      success: false,
      error: "Incorrect password. Please verify your password and try again.",
    };
  }

  await setCurrentUser(found);
  return { success: true, user: found };
}

const LOGGED_OUT_KEY = "@note_app_logged_out_v2";

export async function setCurrentUser(user: UserAccount | null): Promise<void> {
  if (!user) {
    await AsyncStorage.removeItem(CURRENT_USER_KEY);
    await AsyncStorage.setItem(LOGGED_OUT_KEY, "true");
  } else {
    await AsyncStorage.removeItem(LOGGED_OUT_KEY);
    await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  }
}

export async function getCurrentUser(): Promise<UserAccount | null> {
  try {
    const isLoggedOut = await AsyncStorage.getItem(LOGGED_OUT_KEY);
    if (isLoggedOut === "true") {
      return null;
    }

    const raw = await AsyncStorage.getItem(CURRENT_USER_KEY);
    if (raw) {
      const parsed: UserAccount = JSON.parse(raw);
      const users = await getAllUsers();
      const found = users.find(
        (u) => u.email.trim().toLowerCase() === parsed.email.trim().toLowerCase()
      );
      return found || parsed;
    }

    // Primary user session active by default unless explicitly logged out
    const defaultUser = defaultAccounts[0];
    await setCurrentUser(defaultUser);
    return defaultUser;
  } catch {
    return null;
  }
}

export async function logoutUser(): Promise<void> {
  await AsyncStorage.removeItem(CURRENT_USER_KEY);
  await AsyncStorage.setItem(LOGGED_OUT_KEY, "true");
}

export async function changeUserPassword(
  email: string,
  currentPass: string,
  newPass: string
): Promise<{ success: boolean; error?: string }> {
  const emailNorm = email.trim().toLowerCase();
  const users = await getAllUsers();
  const index = users.findIndex(
    (u) => u.email.trim().toLowerCase() === emailNorm
  );

  if (index === -1) {
    return {
      success: false,
      error: "User account not found.",
    };
  }

  if (users[index].password.trim() !== currentPass.trim()) {
    return {
      success: false,
      error: "Current password is incorrect.",
    };
  }

  if (!newPass || newPass.trim().length < 4) {
    return {
      success: false,
      error: "New password must be at least 4 characters long.",
    };
  }

  if (users[index].password.trim() === newPass.trim()) {
    return {
      success: false,
      error: "New password must be different from current password.",
    };
  }

  users[index].password = newPass.trim();
  await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
  await setCurrentUser(users[index]);

  return { success: true };
}

export async function checkUserExists(email: string): Promise<boolean> {
  const emailNorm = email.trim().toLowerCase();
  const users = await getAllUsers();
  return users.some((u) => u.email.trim().toLowerCase() === emailNorm);
}

export async function resetUserPassword(
  email: string,
  newPass: string
): Promise<{ success: boolean; error?: string }> {
  const emailNorm = email.trim().toLowerCase();
  const users = await getAllUsers();
  const index = users.findIndex(
    (u) => u.email.trim().toLowerCase() === emailNorm
  );

  if (index === -1) {
    return {
      success: false,
      error: "User account not found with this email.",
    };
  }

  if (!newPass || newPass.trim().length < 4) {
    return {
      success: false,
      error: "New password must be at least 4 characters long.",
    };
  }

  users[index].password = newPass.trim();
  await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));

  const current = await getCurrentUser();
  if (current && current.email.trim().toLowerCase() === emailNorm) {
    await setCurrentUser(users[index]);
  }

  return { success: true };
}

export async function updateUserProfilePic(
  email: string,
  profilePic?: string
): Promise<{ success: boolean; error?: string }> {
  const emailNorm = email.trim().toLowerCase();
  const users = await getAllUsers();
  const index = users.findIndex(
    (u) => u.email.trim().toLowerCase() === emailNorm
  );

  if (index === -1) {
    return {
      success: false,
      error: "User account not found.",
    };
  }

  users[index].profilePic = profilePic;
  await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));

  const current = await getCurrentUser();
  if (current && current.email.trim().toLowerCase() === emailNorm) {
    await setCurrentUser(users[index]);
  }

  return { success: true };
}

export async function deleteUserAccount(
  email: string,
  passwordConfirm?: string
): Promise<{ success: boolean; error?: string }> {
  const emailNorm = email.trim().toLowerCase();
  const users = await getAllUsers();
  const found = users.find(
    (u) => u.email.trim().toLowerCase() === emailNorm
  );

  if (!found) {
    return {
      success: false,
      error: "Account not found.",
    };
  }

  if (passwordConfirm !== undefined && passwordConfirm.trim() !== found.password.trim()) {
    return {
      success: false,
      error: "Incorrect password. Cannot delete account.",
    };
  }

  const updatedUsers = users.filter(
    (u) => u.email.trim().toLowerCase() !== emailNorm
  );
  await AsyncStorage.setItem(USERS_KEY, JSON.stringify(updatedUsers));
  await AsyncStorage.removeItem(`${NOTES_PREFIX}${emailNorm}`);
  await logoutUser();

  return { success: true };
}

export async function updateUserName(
  email: string,
  newUsername: string
): Promise<{ success: boolean; error?: string }> {
  const emailNorm = email.trim().toLowerCase();
  const trimmed = newUsername.trim();
  if (!trimmed) {
    return {
      success: false,
      error: "Name cannot be empty.",
    };
  }
  if (trimmed.length < 2) {
    return {
      success: false,
      error: "Name must be at least 2 characters.",
    };
  }

  const users = await getAllUsers();
  const index = users.findIndex(
    (u) => u.email.trim().toLowerCase() === emailNorm
  );

  if (index === -1) {
    return {
      success: false,
      error: "User account not found.",
    };
  }

  users[index].username = trimmed;
  await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));

  const current = await getCurrentUser();
  if (current && current.email.trim().toLowerCase() === emailNorm) {
    await setCurrentUser(users[index]);
  }

  return { success: true };
}

// ----------------- USER NOTES STORAGE -----------------

export async function getUserNotes(email?: string): Promise<StoredNote[]> {
  try {
    let targetEmail = email?.trim().toLowerCase();
    if (!targetEmail) {
      const current = await getCurrentUser();
      targetEmail = current?.email.trim().toLowerCase() || defaultAccounts[0].email;
    }

    const key = `${NOTES_PREFIX}${targetEmail}`;
    const raw = await AsyncStorage.getItem(key);
    if (!raw) {
      await AsyncStorage.setItem(key, JSON.stringify([]));
      return [];
    }
    const notes: StoredNote[] = JSON.parse(raw);
    return notes.sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

export async function saveUserNote(
  noteData: {
    title: string;
    body: string;
    folder: string;
    date?: string;
    isChecklist?: boolean;
    checklistItems?: ChecklistItem[];
    imageUrl?: string;
    isLocked?: boolean;
  },
  email?: string
): Promise<StoredNote> {
  let targetEmail = email?.trim().toLowerCase();
  if (!targetEmail) {
    const current = await getCurrentUser();
    targetEmail = current?.email.trim().toLowerCase() || defaultAccounts[0].email;
  }

  const existingNotes = await getUserNotes(targetEmail);
  const normalizedTitle = noteData.title.trim() || "Untitled Note";
  const normalizedBody = noteData.body.trim();
  const normalizedFolder = noteData.folder || "Personal";

  // Prevent duplicate note creation from rapid taps (within 3 seconds)
  const recentDuplicate = existingNotes.find(
    (n) =>
      n.title === normalizedTitle &&
      n.body === normalizedBody &&
      n.folder === normalizedFolder &&
      Date.now() - n.createdAt < 3000
  );
  if (recentDuplicate) {
    return recentDuplicate;
  }

  const newNote: StoredNote = {
    _id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    userEmail: targetEmail,
    title: normalizedTitle,
    body: normalizedBody,
    folder: normalizedFolder,
    date: noteData.date || getTodayFormattedDate(),
    isChecklist: noteData.isChecklist,
    checklistItems: noteData.checklistItems,
    imageUrl: noteData.imageUrl,
    isLocked: noteData.isLocked,
    createdAt: Date.now(),
  };

  const updated = [newNote, ...existingNotes];
  await AsyncStorage.setItem(
    `${NOTES_PREFIX}${targetEmail}`,
    JSON.stringify(updated)
  );

  return newNote;
}

export async function updateUserNote(
  noteId: string,
  updates: Partial<StoredNote>,
  email?: string
): Promise<StoredNote | null> {
  let targetEmail = email?.trim().toLowerCase();
  if (!targetEmail) {
    const current = await getCurrentUser();
    targetEmail = current?.email.trim().toLowerCase() || defaultAccounts[0].email;
  }

  const existingNotes = await getUserNotes(targetEmail);
  let updatedNote: StoredNote | null = null;

  const updatedList = existingNotes.map((note) => {
    if (note._id === noteId) {
      updatedNote = { ...note, ...updates };
      return updatedNote;
    }
    return note;
  });

  await AsyncStorage.setItem(
    `${NOTES_PREFIX}${targetEmail}`,
    JSON.stringify(updatedList)
  );

  return updatedNote;
}

export async function deleteUserNote(
  noteId: string,
  email?: string
): Promise<void> {
  let targetEmail = email?.trim().toLowerCase();
  if (!targetEmail) {
    const current = await getCurrentUser();
    targetEmail = current?.email.trim().toLowerCase() || defaultAccounts[0].email;
  }

  const existingNotes = await getUserNotes(targetEmail);
  const filtered = existingNotes.filter((n) => n._id !== noteId);

  await AsyncStorage.setItem(
    `${NOTES_PREFIX}${targetEmail}`,
    JSON.stringify(filtered)
  );
}

export async function toggleChecklistItemStorage(
  noteId: string,
  itemId: string,
  email?: string
): Promise<void> {
  let targetEmail = email?.trim().toLowerCase();
  if (!targetEmail) {
    const current = await getCurrentUser();
    targetEmail = current?.email.trim().toLowerCase() || defaultAccounts[0].email;
  }

  const existingNotes = await getUserNotes(targetEmail);
  const updatedList = existingNotes.map((note) => {
    if (note._id !== noteId || !note.checklistItems) return note;
    return {
      ...note,
      checklistItems: note.checklistItems.map((item) =>
        item.id === itemId ? { ...item, checked: !item.checked } : item
      ),
    };
  });

  await AsyncStorage.setItem(
    `${NOTES_PREFIX}${targetEmail}`,
    JSON.stringify(updatedList)
  );
}
