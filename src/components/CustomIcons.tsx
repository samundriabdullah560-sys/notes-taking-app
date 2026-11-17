import React from "react";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";

export interface CustomIconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

/**
 * Ringing Notification Bell Icon (matching user screenshot 2)
 * Outlined bell with dual vibration waves on both sides.
 * Uses MaterialCommunityIcons "bell-ring-outline" - 100% native Expo Go compatible.
 */
export function RingingBellIcon({
  size = 24,
  color = "#9D9ABF",
}: CustomIconProps) {
  return (
    <MaterialCommunityIcons
      name="bell-ring-outline"
      size={size}
      color={color}
    />
  );
}

/**
 * Notes / Document Icon (matching user screenshot 1, leftmost)
 * Document sheet with folded corner and text lines.
 */
export function NotesTabIcon({
  size = 24,
  color = "#1F1A3A",
}: CustomIconProps) {
  return (
    <MaterialCommunityIcons
      name="note-text-outline"
      size={size}
      color={color}
    />
  );
}

/**
 * Checklist / Todo Icon (matching user screenshot 1, second from left)
 * List with checkmarks and task lines.
 */
export function ChecklistTabIcon({
  size = 24,
  color = "#9D9ABF",
}: CustomIconProps) {
  return (
    <MaterialCommunityIcons
      name="format-list-checks"
      size={size}
      color={color}
    />
  );
}

/**
 * Ideas / Lightbulb Icon (matching user screenshot 1, second from right)
 * Bulb outline with filament.
 */
export function IdeaBulbTabIcon({
  size = 24,
  color = "#9D9ABF",
}: CustomIconProps) {
  return (
    <MaterialCommunityIcons
      name="lightbulb-on-outline"
      size={size}
      color={color}
    />
  );
}

/**
 * Settings / Gear Icon (matching user screenshot 1, rightmost)
 * Smooth cog with hollow center.
 */
export function SettingsTabIcon({
  size = 24,
  color = "#9D9ABF",
}: CustomIconProps) {
  return (
    <MaterialCommunityIcons
      name="cog-outline"
      size={size}
      color={color}
    />
  );
}

/**
 * Plus Icon (for center elevated action button)
 */
export function PlusIcon({
  size = 32,
  color = "#FFFFFF",
}: CustomIconProps) {
  return (
    <Ionicons
      name="add"
      size={size}
      color={color}
    />
  );
}
