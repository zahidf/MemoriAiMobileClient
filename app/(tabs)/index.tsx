import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width } = Dimensions.get("window");

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  const quickActions = [
    {
      id: "pdf",
      title: "PDF Upload",
      description: "Create flashcards from PDF documents",
      icon: "doc.fill",
      gradient: ["#667eea", "#764ba2"] as const,
      route: "/(tabs)/create" as const,
    },
    {
      id: "text",
      title: "Text Input",
      description: "Generate cards from your text",
      icon: "text.alignleft",
      gradient: ["#f093fb", "#f5576c"] as const,
      route: "/(tabs)/create" as const,
    },
    {
      id: "youtube",
      title: "YouTube Video",
      description: "Extract content from videos",
      icon: "play.fill",
      gradient: ["#4facfe", "#00f2fe"] as const,
      route: "/(tabs)/create" as const,
    },
    {
      id: "manual",
      title: "Manual Entry",
      description: "Create custom flashcards",
      icon: "pencil",
      gradient: ["#43e97b", "#38f9d7"] as const,
      route: "/(tabs)/create" as const,
    },
  ];

  const stats = [
    { label: "Decks Created", value: "12" },
    { label: "Cards Generated", value: "248" },
    { label: "Study Streak", value: "7 days" },
  ];

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            MemoriAI
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: colors.text + "80" }]}>
            Create flashcards effortlessly
          </ThemedText>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          {stats.map((stat, index) => (
            <View
              key={index}
              style={[styles.statCard, { backgroundColor: colors.background }]}
            >
              <ThemedText type="defaultSemiBold" style={styles.statValue}>
                {stat.value}
              </ThemedText>
              <ThemedText
                style={[styles.statLabel, { color: colors.text + "80" }]}
              >
                {stat.label}
              </ThemedText>
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Create New Deck
          </ThemedText>

          <View style={styles.actionsGrid}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={styles.actionCard}
                onPress={() =>
                  router.push({
                    pathname: action.route,
                    params: { method: action.id },
                  })
                }
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={action.gradient}
                  style={styles.actionGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.actionIcon}>
                    <IconSymbol
                      name={action.icon as any}
                      size={24}
                      color="white"
                    />
                  </View>
                  <View style={styles.actionContent}>
                    <Text style={styles.actionTitle}>{action.title}</Text>
                    <Text style={styles.actionDescription}>
                      {action.description}
                    </Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.recentContainer}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Recent Activity
          </ThemedText>

          <View
            style={[styles.recentCard, { backgroundColor: colors.background }]}
          >
            <View style={styles.recentItem}>
              <View
                style={[
                  styles.recentIcon,
                  { backgroundColor: colors.tint + "20" },
                ]}
              >
                <IconSymbol name="doc.fill" size={16} color={colors.tint} />
              </View>
              <View style={styles.recentContent}>
                <ThemedText type="defaultSemiBold">
                  Biology Chapter 3
                </ThemedText>
                <ThemedText
                  style={[styles.recentTime, { color: colors.text + "60" }]}
                >
                  2 hours ago • 15 cards
                </ThemedText>
              </View>
            </View>

            <View style={styles.recentItem}>
              <View
                style={[styles.recentIcon, { backgroundColor: "#4facfe20" }]}
              >
                <IconSymbol name="play.fill" size={16} color="#4facfe" />
              </View>
              <View style={styles.recentContent}>
                <ThemedText type="defaultSemiBold">Physics Lecture</ThemedText>
                <ThemedText
                  style={[styles.recentTime, { color: colors.text + "60" }]}
                >
                  Yesterday • 22 cards
                </ThemedText>
              </View>
            </View>
          </View>
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
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: 24,
    marginBottom: 32,
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statValue: {
    fontSize: 20,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: "center",
  },
  actionsContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 16,
  },
  actionsGrid: {
    gap: 16,
  },
  actionCard: {
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  actionGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "white",
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
  },
  recentContainer: {
    paddingHorizontal: 24,
  },
  recentCard: {
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  recentItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  recentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  recentContent: {
    flex: 1,
  },
  recentTime: {
    fontSize: 12,
    marginTop: 2,
  },
});
