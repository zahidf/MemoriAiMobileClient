import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
} from "react-native";

interface SettingItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: string;
  type: "toggle" | "action" | "navigation";
  value?: boolean;
  onPress?: () => void;
  onToggle?: (value: boolean) => void;
}

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  const [notifications, setNotifications] = useState(true);
  const [autoSync, setAutoSync] = useState(false);
  const [darkMode, setDarkMode] = useState(colorScheme === "dark");

  const userStats = [
    { label: "Decks Created", value: "12", icon: "folder.fill" },
    { label: "Cards Generated", value: "248", icon: "doc.text.fill" },
    { label: "Study Streak", value: "7 days", icon: "flame.fill" },
    { label: "Total Study Time", value: "24h", icon: "clock.fill" },
  ];

  const handleShare = async () => {
    try {
      await Share.share({
        message:
          "Check out MemoriAI - the best app for creating flashcards from PDFs, text, and YouTube videos!",
        title: "MemoriAI Flashcard Creator",
      });
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const handleRateApp = () => {
    Alert.alert(
      "Rate MemoriAI",
      "Would you like to rate MemoriAI on the App Store?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Rate Now", onPress: () => console.log("Open App Store") },
      ]
    );
  };

  const handleFeedback = () => {
    Alert.alert(
      "Send Feedback",
      "Help us improve MemoriAI by sending your feedback.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Send Email", onPress: () => console.log("Open email client") },
      ]
    );
  };

  const handleAbout = () => {
    Alert.alert(
      "About MemoriAI",
      "MemoriAI v1.0.0\n\nCreate flashcards effortlessly from PDFs, text, YouTube videos, or manual entry. Powered by AI to generate meaningful questions and answers.",
      [{ text: "OK" }]
    );
  };

  const settings: SettingItem[] = [
    {
      id: "notifications",
      title: "Push Notifications",
      subtitle: "Get notified when your decks are ready",
      icon: "bell.fill",
      type: "toggle",
      value: notifications,
      onToggle: setNotifications,
    },
    {
      id: "autoSync",
      title: "Auto Sync",
      subtitle: "Automatically sync your decks to the cloud",
      icon: "icloud.fill",
      type: "toggle",
      value: autoSync,
      onToggle: setAutoSync,
    },
    {
      id: "darkMode",
      title: "Dark Mode",
      subtitle: "Use dark theme for better night viewing",
      icon: "moon.fill",
      type: "toggle",
      value: darkMode,
      onToggle: setDarkMode,
    },
  ];

  const actions: SettingItem[] = [
    {
      id: "share",
      title: "Share App",
      subtitle: "Tell your friends about MemoriAI",
      icon: "square.and.arrow.up",
      type: "action",
      onPress: handleShare,
    },
    {
      id: "rate",
      title: "Rate App",
      subtitle: "Help us by rating the app",
      icon: "star.fill",
      type: "action",
      onPress: handleRateApp,
    },
    {
      id: "feedback",
      title: "Send Feedback",
      subtitle: "Report bugs or suggest features",
      icon: "envelope.fill",
      type: "action",
      onPress: handleFeedback,
    },
    {
      id: "about",
      title: "About",
      subtitle: "App version and information",
      icon: "info.circle.fill",
      type: "action",
      onPress: handleAbout,
    },
  ];

  const renderSettingItem = (item: SettingItem) => (
    <TouchableOpacity
      key={item.id}
      style={[styles.settingItem, { backgroundColor: colors.background }]}
      onPress={item.onPress}
      disabled={item.type === "toggle"}
      activeOpacity={item.type === "toggle" ? 1 : 0.7}
    >
      <View
        style={[styles.settingIcon, { backgroundColor: colors.tint + "20" }]}
      >
        <IconSymbol name={item.icon as any} size={20} color={colors.tint} />
      </View>

      <View style={styles.settingContent}>
        <ThemedText type="defaultSemiBold" style={styles.settingTitle}>
          {item.title}
        </ThemedText>
        {item.subtitle && (
          <ThemedText
            style={[styles.settingSubtitle, { color: colors.text + "60" }]}
          >
            {item.subtitle}
          </ThemedText>
        )}
      </View>

      {item.type === "toggle" ? (
        <Switch
          value={item.value}
          onValueChange={item.onToggle}
          trackColor={{ false: colors.text + "20", true: colors.tint + "40" }}
          thumbColor={item.value ? colors.tint : colors.text + "60"}
        />
      ) : (
        <IconSymbol name="chevron.right" size={16} color={colors.text + "40"} />
      )}
    </TouchableOpacity>
  );

  const renderStatCard = (stat: any, index: number) => (
    <View
      key={index}
      style={[styles.statCard, { backgroundColor: colors.background }]}
    >
      <View style={[styles.statIcon, { backgroundColor: colors.tint + "20" }]}>
        <IconSymbol name={stat.icon as any} size={20} color={colors.tint} />
      </View>
      <ThemedText type="defaultSemiBold" style={styles.statValue}>
        {stat.value}
      </ThemedText>
      <ThemedText style={[styles.statLabel, { color: colors.text + "60" }]}>
        {stat.label}
      </ThemedText>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            Profile
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: colors.text + "80" }]}>
            Manage your account and preferences
          </ThemedText>
        </View>

        {/* User Info Card */}
        <View style={[styles.userCard, { backgroundColor: colors.background }]}>
          <View style={[styles.avatar, { backgroundColor: colors.tint }]}>
            <IconSymbol name="person.fill" size={32} color="white" />
          </View>
          <View style={styles.userInfo}>
            <ThemedText type="subtitle" style={styles.userName}>
              John Doe
            </ThemedText>
            <ThemedText
              style={[styles.userEmail, { color: colors.text + "60" }]}
            >
              john.doe@example.com
            </ThemedText>
          </View>
          <TouchableOpacity style={styles.editButton}>
            <IconSymbol name="pencil" size={16} color={colors.tint} />
          </TouchableOpacity>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsContainer}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Your Statistics
          </ThemedText>
          <View style={styles.statsGrid}>{userStats.map(renderStatCard)}</View>
        </View>

        {/* Settings Section */}
        <View style={styles.settingsContainer}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Settings
          </ThemedText>
          <View style={styles.settingsGroup}>
            {settings.map(renderSettingItem)}
          </View>
        </View>

        {/* Actions Section */}
        <View style={styles.actionsContainer}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Support
          </ThemedText>
          <View style={styles.settingsGroup}>
            {actions.map(renderSettingItem)}
          </View>
        </View>

        {/* App Version */}
        <View style={styles.versionContainer}>
          <ThemedText
            style={[styles.versionText, { color: colors.text + "40" }]}
          >
            MemoriAI v1.0.0
          </ThemedText>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 24,
    padding: 20,
    borderRadius: 16,
    marginBottom: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
  },
  editButton: {
    padding: 8,
  },
  statsContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: "47%",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: "center",
  },
  settingsContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  actionsContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  settingsGroup: {
    gap: 2,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 2,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
  },
  versionContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  versionText: {
    fontSize: 14,
  },
});
