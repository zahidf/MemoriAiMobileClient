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
  FlatList,
  StyleSheet,
  Text,
  TextInput,
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

export default function DecksScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  const [allDecks, setAllDecks] = useState<DeckWithStatsLocal[]>([]);
  const [filteredDecks, setFilteredDecks] = useState<DeckWithStatsLocal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [user, setUser] = useState<any>(null);

  // Load decks when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadUserDecks();
    }, [])
  );

  // Filter decks based on search query
  React.useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredDecks(allDecks);
    } else {
      const filtered = allDecks.filter((deck) =>
        deck.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredDecks(filtered);
    }
  }, [searchQuery, allDecks]);

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

      setAllDecks(decksWithStats);
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
              loadUserDecks();
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

    const hasDue = await hasDueCards(deck.id);

    if (!hasDue) {
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
        icon: "doc.fill" as const,
      };
    }

    if (deck.dueCards > 0) {
      return {
        text: `${deck.dueCards} due`,
        color: "#FF6B35",
        canStudy: true,
        icon: "flame.fill" as const,
      };
    }

    if (deck.nextDueTime) {
      const timeUntilDue = formatTimeUntilDue(deck.nextDueTime);
      return {
        text: `Next: ${timeUntilDue}`,
        color: "#4A90E2",
        canStudy: false,
        icon: "clock.fill" as const,
      };
    }

    return {
      text: "All studied",
      color: "#4CAF50",
      canStudy: false,
      icon: "checkmark.circle.fill" as const,
    };
  };

  const renderDeckItem = ({ item: deck }: { item: DeckWithStatsLocal }) => {
    const status = getDeckStatus(deck);

    return (
      <TouchableOpacity
        style={styles.deckItem}
        onPress={() => handleStudyDeck(deck)}
        activeOpacity={0.8}
      >
        <View style={[styles.deckCard, { backgroundColor: colors.background }]}>
          {/* Status indicator */}
          <View
            style={[styles.statusIndicator, { backgroundColor: status.color }]}
          />

          {/* Deck Content */}
          <View style={styles.deckMainContent}>
            <View style={styles.deckInfo}>
              <View
                style={[
                  styles.deckIconContainer,
                  { backgroundColor: status.color + "20" },
                ]}
              >
                <IconSymbol name={status.icon} size={18} color={status.color} />
              </View>

              <View style={styles.deckTextContent}>
                <ThemedText
                  type="defaultSemiBold"
                  style={styles.deckTitle}
                  numberOfLines={1}
                >
                  {deck.title}
                </ThemedText>
                <View style={styles.deckMeta}>
                  <ThemedText
                    style={[styles.deckStat, { color: colors.text + "70" }]}
                  >
                    {deck.card_count} cards
                  </ThemedText>
                  <Text style={styles.metaSeparator}>•</Text>
                  <Text style={[styles.statusText, { color: status.color }]}>
                    {status.text}
                  </Text>
                </View>
              </View>
            </View>

            {/* Study Button */}
            {status.canStudy && (
              <TouchableOpacity
                style={[styles.studyButton, { backgroundColor: status.color }]}
                onPress={() => handleStudyDeck(deck)}
              >
                <IconSymbol name="flame.fill" size={16} color="white" />
                <Text style={styles.studyButtonText}>Study</Text>
              </TouchableOpacity>
            )}

            {/* Menu Button */}
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => {
                Alert.alert(deck.title, "Choose an action", [
                  { text: "Cancel", style: "cancel" },
                  ...(__DEV__ && deck.card_count > 0
                    ? [
                        {
                          text: "Reset for Study",
                          onPress: () => handleResetDeckForStudy(deck),
                        },
                      ]
                    : []),
                  {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => handleDeleteDeck(deck),
                  },
                ]);
              }}
            >
              <IconSymbol
                name="chevron.right"
                size={16}
                color={colors.text + "60"}
              />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View
        style={[
          styles.emptyIconContainer,
          { backgroundColor: colors.text + "10" },
        ]}
      >
        <IconSymbol name="folder" size={48} color={colors.text + "40"} />
      </View>
      <ThemedText style={styles.emptyTitle}>
        {searchQuery ? "No decks found" : "No decks yet"}
      </ThemedText>
      <ThemedText style={[styles.emptyText, { color: colors.text + "60" }]}>
        {searchQuery
          ? `No decks match "${searchQuery}"`
          : "Create your first deck to start learning"}
      </ThemedText>
      {!searchQuery && (
        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: colors.tint }]}
          onPress={() => router.push("/(tabs)/create")}
        >
          <IconSymbol name="plus" size={20} color="white" />
          <Text style={styles.createButtonText}>Create Deck</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
          <ThemedText style={styles.loadingText}>Loading decks...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  const totalDueCards = filteredDecks.reduce(
    (sum, deck) => sum + deck.dueCards,
    0
  );

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={
          colorScheme === "dark"
            ? ["#1a1a2e", "#16213e"]
            : ["#667eea", "#764ba2"]
        }
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <IconSymbol name="chevron.left" size={24} color="white" />
          </TouchableOpacity>

          <View style={styles.headerContent}>
            <Text style={styles.title}>My Decks</Text>
            <Text style={styles.subtitle}>
              {allDecks.length} deck{allDecks.length !== 1 ? "s" : ""}
              {totalDueCards > 0 && ` • ${totalDueCards} due`}
            </Text>
          </View>

          <View style={styles.headerSpacer} />
        </View>
      </LinearGradient>

      {/* Search Bar */}
      {allDecks.length > 0 && (
        <View style={styles.searchContainer}>
          <View
            style={[
              styles.searchBar,
              {
                backgroundColor: colors.background,
                borderColor: colors.text + "20",
              },
            ]}
          >
            <IconSymbol
              name="magnifyingglass"
              size={20}
              color={colors.text + "60"}
            />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search decks..."
              placeholderTextColor={colors.text + "50"}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => setSearchQuery("")}
              >
                <IconSymbol name="xmark" size={16} color={colors.text + "60"} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Decks List */}
      <FlatList
        data={filteredDecks}
        renderItem={renderDeckItem}
        keyExtractor={(item) => item.id?.toString() || ""}
        contentContainerStyle={[
          styles.listContainer,
          filteredDecks.length === 0 && styles.emptyListContainer,
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmptyState}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.tint }]}
        onPress={() => router.push("/(tabs)/create")}
        activeOpacity={0.8}
      >
        <IconSymbol name="plus" size={24} color="white" />
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  headerGradient: {
    paddingTop: 60,
    paddingBottom: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  headerContent: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    marginBottom: 4,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
  },
  headerSpacer: {
    width: 40,
  },
  searchContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 20,
  },
  clearButton: {
    padding: 4,
  },
  listContainer: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: "center",
  },
  separator: {
    height: 12,
  },
  deckItem: {
    marginBottom: 8,
  },
  deckCard: {
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(102, 126, 234, 0.15)",
    position: "relative",
    overflow: "hidden",
  },
  statusIndicator: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  deckMainContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  deckInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  deckIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  deckTextContent: {
    flex: 1,
  },
  deckTitle: {
    fontSize: 16,
    marginBottom: 4,
  },
  deckMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  deckStat: {
    fontSize: 13,
  },
  metaSeparator: {
    color: "#ccc",
    fontSize: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  studyButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    marginRight: 12,
  },
  studyButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  menuButton: {
    padding: 8,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  createButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
