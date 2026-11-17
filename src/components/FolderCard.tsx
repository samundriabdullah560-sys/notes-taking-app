import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  StyleProp,
  ViewStyle,
} from "react-native";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

export interface FolderCardProps {
  name: string;
  filesCount: number;
  sizeDisplay?: string;
  onPress: () => void;
  activeOpacity?: number;
  style?: StyleProp<ViewStyle>;
}

export function FolderCard({
  name,
  filesCount,
  sizeDisplay,
  onPress,
  activeOpacity = 0.85,
  style,
}: FolderCardProps) {
  const renderIcon = () => {
    switch (name) {
      case "Personal":
        return <Feather name="file-text" size={24} color="#6C5CE7" />;
      case "Academic":
        return <Ionicons name="school-outline" size={26} color="#6C5CE7" />;
      case "Work":
        return <Feather name="user" size={24} color="#6C5CE7" />;
      case "Others":
      default:
        return (
          <MaterialCommunityIcons
            name="file-document-outline"
            size={26}
            color="#6C5CE7"
          />
        );
    }
  };

  return (
    <TouchableOpacity
      style={[styles.cardContainer, style]}
      activeOpacity={activeOpacity}
      onPress={onPress}
    >
      {/* Exact Pixel-Perfect Figma Background (Wave cut-out + Layered Lavender Tabs) */}
      <Image
        source={require("../../assets/images/Group253.png")}
        style={styles.cardBgImage}
        resizeMode="stretch"
      />

      {/* Foreground Content */}
      <View style={styles.cardContent}>
        {/* Folder Icon Container */}
        <View style={styles.iconContainer}>
          {renderIcon()}
        </View>

        {/* Folder Details */}
        <Text style={styles.folderName} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.folderFiles}>
          {filesCount} {filesCount === 1 ? "File" : "Files"}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    width: "47.5%",
    height: 168,
    borderRadius: 22,
    backgroundColor: "transparent",
    position: "relative",
    shadowColor: "#1F1A3A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
  },
  cardBgImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "214",
    height: "214",
    borderRadius: 22,
  },
  cardContent: {
    flex: 1,
    position: "relative",
    zIndex: 10,
    paddingHorizontal: 35,
    paddingTop: 43,
    paddingBottom: 14,
    justifyContent: "flex-start",
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F0EEFD",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  folderName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 3,
    letterSpacing: -0.2,
  },
  folderFiles: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
    marginBottom: 2,
  },
  folderSize: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "500",
  },
});

export default FolderCard;

