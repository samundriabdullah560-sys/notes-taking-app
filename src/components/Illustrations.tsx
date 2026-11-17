import React from "react";
import { View, StyleSheet, Image } from "react-native";

export const DonutChartIcon = () => {
  return (
    <View style={styles.donutBox}>
      <View style={styles.donutYellow} />
      <View style={styles.donutCyan} />
      <View style={styles.donutHole} />
    </View>
  );
};

export const UserAvatar = () => {
  return (
    <Image
      source={{
        uri: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      }}
      style={styles.avatarImage}
    />
  );
};

export const CityPlazaIllustration = () => {
  return (
    <View style={styles.illustrationWrapper}>
      <Image
        source={{
          uri: "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=600&auto=format&fit=crop&q=80",
        }}
        style={styles.illustrationImage}
      />
    </View>
  );
};

export const LivingRoomIllustration = () => {
  return (
    <View style={styles.illustrationWrapper}>
      <Image
        source={{
          uri: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&auto=format&fit=crop&q=80",
        }}
        style={styles.illustrationImage}
      />
    </View>
  );
};

export const NotebookArt = () => {
  return (
    <View style={styles.notebookContainer}>
      {/* Background Soft Ambient Glow */}
      <View style={styles.glowDiscOuter} />
      <View style={styles.glowDiscInner} />

      {/* Floating 3D Sparkles / Deco */}
      <View style={styles.sparkleTopLeft}>
        <View style={styles.sparkleCrossH} />
        <View style={styles.sparkleCrossV} />
      </View>
      <View style={styles.sparkleTopRight}>
        <View style={styles.sparkleDotSmall} />
      </View>
      <View style={styles.sparkleBottomRight}>
        <View style={styles.sparkleCrossH} />
        <View style={styles.sparkleCrossV} />
      </View>

      {/* Floating Mini Tag Badge */}
      <View style={styles.floatingTag}>
        <View style={styles.tagCheckCircle}>
          <View style={styles.tagCheckmarkStem} />
          <View style={styles.tagCheckmarkKick} />
        </View>
        <View style={styles.tagLine} />
      </View>

      {/* 3D Notebook Shadow */}
      <View style={styles.notebookBaseShadow} />

      {/* 3D Notebook Body (Stacked Pages & Cover) */}
      <View style={styles.notebookStack}>
        {/* Under Cover (Back) */}
        <View style={styles.bookBackCover} />

        {/* Paper Pages Layer */}
        <View style={styles.bookPagesLayer}>
          {/* Top page lines */}
          <View style={styles.pageHeaderLine} />
          <View style={styles.pageLine} />
          <View style={styles.pageLine} />
          <View style={[styles.pageLine, { width: "65%" }]} />
          <View style={styles.pageLine} />
          <View style={[styles.pageLine, { width: "45%" }]} />
        </View>

        {/* Bookmark Ribbon */}
        <View style={styles.ribbonContainer}>
          <View style={styles.ribbonBody} />
          <View style={styles.ribbonTail} />
        </View>

        {/* Book Left Spine / Rings */}
        <View style={styles.bookSpine}>
          <View style={styles.spineRing} />
          <View style={styles.spineRing} />
          <View style={styles.spineRing} />
          <View style={styles.spineRing} />
          <View style={styles.spineRing} />
          <View style={styles.spineRing} />
        </View>

        {/* Front Cover Half-fold Flap */}
        <View style={styles.bookFlap}>
          <View style={styles.flapBadge}>
            <View style={styles.flapStar} />
          </View>
        </View>
      </View>

      {/* 3D Floating Pen / Stylus */}
      <View style={styles.penWrapper}>
        <View style={styles.penTip} />
        <View style={styles.penBody} />
        <View style={styles.penCap} />
        <View style={styles.penClip} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  donutBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    position: "relative",
  },
  donutYellow: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 22,
    height: 22,
    backgroundColor: "#F59E0B",
  },
  donutCyan: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: 22,
    height: 22,
    backgroundColor: "#06B6D4",
  },
  donutHole: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#6C5CE7",
    zIndex: 2,
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  illustrationWrapper: {
    width: "100%",
    height: 72,
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 8,
    backgroundColor: "#EEF2FF",
  },
  illustrationImage: {
    width: "100%",
    height: "100%",
  },

  /* 3D Notebook Illustration Styles */
  notebookContainer: {
    width: 260,
    height: 260,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  glowDiscOuter: {
    position: "absolute",
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: "#EDE9FE",
    opacity: 0.7,
  },
  glowDiscInner: {
    position: "absolute",
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: "#DDD6FE",
    opacity: 0.85,
  },
  sparkleTopLeft: {
    position: "absolute",
    top: 24,
    left: 20,
    width: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  sparkleTopRight: {
    position: "absolute",
    top: 36,
    right: 28,
  },
  sparkleDotSmall: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#F59E0B",
  },
  sparkleBottomRight: {
    position: "absolute",
    bottom: 30,
    right: 26,
    width: 14,
    height: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  sparkleCrossH: {
    position: "absolute",
    width: 14,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#6C5CE7",
  },
  sparkleCrossV: {
    position: "absolute",
    width: 3,
    height: 14,
    borderRadius: 2,
    backgroundColor: "#6C5CE7",
  },
  floatingTag: {
    position: "absolute",
    top: 22,
    right: 18,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    zIndex: 10,
    shadowColor: "#6C5CE7",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 5,
  },
  tagCheckCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  tagCheckmarkStem: {
    position: "absolute",
    width: 2,
    height: 7,
    backgroundColor: "#FFFFFF",
    transform: [{ rotate: "45deg" }],
    top: 5,
    right: 6,
  },
  tagCheckmarkKick: {
    position: "absolute",
    width: 2,
    height: 4,
    backgroundColor: "#FFFFFF",
    transform: [{ rotate: "-45deg" }],
    top: 7,
    left: 5,
  },
  tagLine: {
    width: 28,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#CBD5E1",
  },
  notebookBaseShadow: {
    position: "absolute",
    bottom: 24,
    width: 170,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#4C1D95",
    opacity: 0.18,
    transform: [{ scaleX: 1.1 }],
  },
  notebookStack: {
    width: 156,
    height: 186,
    position: "relative",
    transform: [{ rotate: "-6deg" }],
  },
  bookBackCover: {
    position: "absolute",
    top: 6,
    left: 6,
    width: "100%",
    height: "100%",
    backgroundColor: "#4F46E5",
    borderRadius: 18,
    shadowColor: "#4338CA",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 8,
  },
  bookPagesLayer: {
    position: "absolute",
    top: 3,
    left: 4,
    width: "98%",
    height: "98%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingLeft: 34,
    paddingTop: 24,
    paddingRight: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  pageHeaderLine: {
    width: "80%",
    height: 7,
    borderRadius: 4,
    backgroundColor: "#6C5CE7",
    marginBottom: 14,
  },
  pageLine: {
    width: "90%",
    height: 3,
    borderRadius: 2,
    backgroundColor: "#E2E8F0",
    marginBottom: 10,
  },
  ribbonContainer: {
    position: "absolute",
    top: -2,
    right: 28,
    zIndex: 8,
    alignItems: "center",
  },
  ribbonBody: {
    width: 16,
    height: 44,
    backgroundColor: "#F59E0B",
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  ribbonTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderStyle: "solid",
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#F59E0B",
  },
  bookSpine: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 26,
    height: "100%",
    backgroundColor: "#5B21B6",
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
    justifyContent: "space-evenly",
    alignItems: "center",
    paddingVertical: 12,
    zIndex: 6,
  },
  spineRing: {
    width: 10,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#EDE9FE",
    borderWidth: 1,
    borderColor: "#C4B5FD",
  },
  bookFlap: {
    position: "absolute",
    top: 0,
    left: 24,
    width: 24,
    height: "100%",
    backgroundColor: "#6C5CE7",
    opacity: 0.15,
  },
  flapBadge: {
    position: "absolute",
    top: 14,
    left: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#FDE047",
    alignItems: "center",
    justifyContent: "center",
  },
  flapStar: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#D97706",
  },
  penWrapper: {
    position: "absolute",
    right: 32,
    bottom: 24,
    width: 16,
    height: 110,
    alignItems: "center",
    transform: [{ rotate: "28deg" }],
    zIndex: 12,
  },
  penTip: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderBottomWidth: 14,
    borderStyle: "solid",
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "#1E293B",
  },
  penBody: {
    width: 10,
    height: 64,
    backgroundColor: "#F43F5E",
    borderRadius: 2,
    borderWidth: 1,
    borderColor: "#E11D48",
  },
  penCap: {
    width: 12,
    height: 28,
    backgroundColor: "#3B82F6",
    borderRadius: 3,
    marginTop: -2,
  },
  penClip: {
    position: "absolute",
    top: 24,
    right: -2,
    width: 3,
    height: 20,
    backgroundColor: "#CBD5E1",
    borderRadius: 1,
  },
});
