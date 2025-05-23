import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { getCurrentUser } from "../../services/authService";
import {
  deleteDeck,
  formatTimeUntilDue,
  getDeckStats,
  getUserDecks,
  hasDueCards,
  resetDeckForStudy,
} from "../../services/deckService";
import type { Deck } from "../../types";

interface DeckWithStatsLocal extends Deck {
  card_count: number;
  dueCards: number;
  nextDueTime?: Date;
}

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  const [decks, setDecks] = useState<DeckWithStatsLocal[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  // Load decks when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadUserDecks();
    }, [])
  );

  const loadUserDecks = async () => {
    try {
      setLoading(true);
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        console.error("No user found");
        return;
      }

      setUser(currentUser);
      const userDecks = await getUserDecks(currentUser.id!);

      // Get stats for each deck
      const decksWithStats: DeckWithStatsLocal[] = await Promise.all(
        userDecks.map(async (deck) => {
          const stats = await getDeckStats(deck.id!);
          return {
            ...deck,
            card_count: deck.card_count || 0,
            dueCards: stats.dueCards,
            nextDueTime: stats.nextDueTime,
          };
        })
      );

      setDecks(decksWithStats);
    } catch (error) {
      console.error("Failed to load decks:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDeck = (deck: DeckWithStatsLocal) => {
    if (!deck.id) {
      Alert.alert("Error", "Deck ID is missing");
      return;
    }

    Alert.alert(
      "Delete Deck",
      `Are you sure you want to delete "${deck.title}"? This will delete all cards in the deck.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDeck(deck.id!);
              loadUserDecks();
            } catch (error) {
              console.error("Failed to delete deck:", error);
              Alert.alert("Error", "Failed to delete deck");
            }
          },
        },
      ]
    );
  };

  const handleResetDeckForStudy = (deck: DeckWithStatsLocal) => {
    if (!deck.id) {
      Alert.alert("Error", "Deck ID is missing");
      return;
    }

    Alert.alert(
      "Reset Deck for Study",
      `Reset all cards in "${deck.title}" to be available for study?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          onPress: async () => {
            try {
              await resetDeckForStudy(deck.id!);
              loadUserDecks(); // Refresh to show updated due cards
              Alert.alert("Success", "All cards are now available for study!");
            } catch (error) {
              console.error("Failed to reset deck:", error);
              Alert.alert("Error", "Failed to reset deck");
            }
          },
        },
      ]
    );
  };

  const handleStudyDeck = async (deck: DeckWithStatsLocal) => {
    if (!deck.id) {
      Alert.alert("Error", "Deck ID is missing");
      return;
    }

    // Check if there are actually cards due for study
    const hasDue = await hasDueCards(deck.id);

    if (!hasDue) {
      // Show when next cards will be due
      if (deck.nextDueTime) {
        const timeUntilDue = formatTimeUntilDue(deck.nextDueTime);
        Alert.alert(
          "All Cards Studied",
          `Great job! You've completed all due cards for today.\n\nNext review in: ${timeUntilDue}`,
          [{ text: "OK" }]
        );
      } else {
        Alert.alert(
          "All Cards Studied",
          "Great job! You've completed all cards in this deck.",
          [{ text: "OK" }]
        );
      }
      return;
    }

    router.push(`./study?deckId=${deck.id}`);
  };

  const getDeckStatus = (deck: DeckWithStatsLocal) => {
    if (deck.card_count === 0) {
      return {
        text: "No cards",
        color: colors.text + "60",
        canStudy: false,
      };
    }

    if (deck.dueCards > 0) {
      return {
        text: `${deck.dueCards} due`,
        color: colors.tint,
        canStudy: true,
      };
    }

    if (deck.nextDueTime) {
      const timeUntilDue = formatTimeUntilDue(deck.nextDueTime);
      return {
        text: `Next: ${timeUntilDue}`,
        color: "#ff6b35",
        canStudy: false,
      };
    }

    return {
      text: "All studied",
      color: "#4caf50",
      canStudy: false,
    };
  };

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

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
          <ThemedText style={styles.loadingText}>
            Loading your decks...
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

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
          {user && (
            <ThemedText
              style={[styles.subtitle, { color: colors.text + "80" }]}
            >
              Welcome back, {user.name}
            </ThemedText>
          )}
        </View>

        {/* My Decks Section */}
        {decks.length > 0 && (
          <View style={styles.decksSection}>
            <View style={styles.sectionHeader}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                My Decks
              </ThemedText>
              <ThemedText
                style={[styles.deckCount, { color: colors.text + "60" }]}
              >
                {decks.length} deck{decks.length !== 1 ? "s" : ""}
              </ThemedText>
            </View>

            {decks.map((deck) => {
              const status = getDeckStatus(deck);

              return (
                <View
                  key={deck.id}
                  style={[
                    styles.deckCard,
                    { backgroundColor: colors.background },
                  ]}
                >
                  <View style={styles.deckInfo}>
                    <ThemedText type="defaultSemiBold" style={styles.deckTitle}>
                      {deck.title}
                    </ThemedText>
                    <View style={styles.deckStats}>
                      <ThemedText
                        style={[styles.deckStat, { color: colors.text + "70" }]}
                      >
                        {deck.card_count} cards
                      </ThemedText>
                      <ThemedText
                        style={[styles.statusText, { color: status.color }]}
                      >
                        • {status.text}
                      </ThemedText>
                    </View>
                  </View>

                  <View style={styles.deckActions}>
                    {/* Reset button for development */}
                    {__DEV__ && deck.card_count > 0 && (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.resetButton]}
                        onPress={() => handleResetDeckForStudy(deck)}
                      >
                        <IconSymbol
                          name="clock.fill"
                          size={16}
                          color="#ff6b35"
                        />
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={[styles.actionButton, styles.deleteButton]}
                      onPress={() => handleDeleteDeck(deck)}
                    >
                      <IconSymbol name="trash" size={16} color="#ff4757" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        styles.studyButton,
                        {
                          backgroundColor: status.canStudy
                            ? colors.tint
                            : colors.text + "20",
                        },
                        !status.canStudy && styles.disabledButton,
                      ]}
                      onPress={() => handleStudyDeck(deck)}
                    >
                      <ThemedText
                        style={[
                          styles.studyButtonText,
                          {
                            color: status.canStudy
                              ? "white"
                              : colors.text + "60",
                          },
                        ]}
                      >
                        {status.canStudy ? "Study" : "Studied"}
                      </ThemedText>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Create New Section */}
        <View style={styles.methodsContainer}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            {decks.length > 0
              ? "Create New Deck"
              : "Get Started - Create Your First Deck"}
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
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
  decksSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  deckCount: {
    fontSize: 14,
  },
  deckCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  deckInfo: {
    flex: 1,
  },
  deckTitle: {
    fontSize: 16,
    marginBottom: 4,
  },
  deckStats: {
    flexDirection: "row",
    alignItems: "center",
  },
  deckStat: {
    fontSize: 14,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },
  deckActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  resetButton: {
    backgroundColor: "transparent",
  },
  deleteButton: {
    backgroundColor: "transparent",
  },
  studyButton: {
    paddingHorizontal: 16,
  },
  disabledButton: {
    opacity: 0.8,
  },
  studyButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  methodsContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
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
