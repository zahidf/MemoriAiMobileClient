import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  const methods = [
    {
      id: "pdf",
      title: "PDF Upload",
      description: "Generate flashcards from PDF documents",
      icon: "doc.fill",
      gradient: ["#667eea", "#764ba2"] as const,
      route: "/(tabs)/create" as const,
    },
    {
      id: "text",
      title: "Direct Text",
      description: "Create flashcards from your own text",
      icon: "text.alignleft",
      gradient: ["#f093fb", "#f5576c"] as const,
      route: "/(tabs)/create" as const,
    },
    {
      id: "youtube",
      title: "YouTube Video",
      description: "Generate flashcards from YouTube video",
      icon: "play.fill",
      gradient: ["#4facfe", "#00f2fe"] as const,
      route: "/(tabs)/create" as const,
    },
    {
      id: "manual",
      title: "Manual Entry",
      description: "Create custom question-answer pairs",
      icon: "pencil",
      gradient: ["#43e97b", "#38f9d7"] as const,
      route: "/(tabs)/create" as const,
    },
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
            Anki Deck Generator
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: colors.text + "80" }]}>
            Create flashcards easily from PDFs or custom content
          </ThemedText>
        </View>

        {/* Method Selection */}
        <View style={styles.methodsContainer}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Choose Creation Method
          </ThemedText>

          {methods.map((method) => (
            <TouchableOpacity
              key={method.id}
              style={styles.methodCard}
              onPress={() =>
                router.push({
                  pathname: method.route,
                  params: { method: method.id },
                })
              }
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={method.gradient}
                style={styles.methodGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.methodIcon}>
                  <IconSymbol
                    name={method.icon as any}
                    size={24}
                    color="white"
                  />
                </View>
                <View style={styles.methodContent}>
                  <Text style={styles.methodTitle}>{method.title}</Text>
                  <Text style={styles.methodDescription}>
                    {method.description}
                  </Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))}
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
    alignItems: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
  },
  methodsContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 16,
    textAlign: "center",
  },
  methodCard: {
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  methodGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
  },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  methodContent: {
    flex: 1,
  },
  methodTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "white",
    marginBottom: 4,
  },
  methodDescription: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
  },
});
