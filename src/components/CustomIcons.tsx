import React from "react";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import Svg, { Path } from "react-native-svg";

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

/**
 * Official Google 4-Color 'G' Logo
 */
export function GoogleLogo({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <Path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <Path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        fill="#FBBC05"
      />
      <Path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        fill="#EA4335"
      />
    </Svg>
  );
}
