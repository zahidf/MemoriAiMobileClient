import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
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

const { width: screenWidth } = Dimensions.get("window");

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

  const methods = [
    {
      id: "pdf",
      title: "PDF Upload",
      description: "Generate flashcards from documents",
      icon: "doc.fill",
      gradient: ["#667eea", "#764ba2"] as const,
    },
    {
      id: "text",
      title: "Text Input",
      description: "Create from your own content",
      icon: "text.alignleft",
      gradient: ["#f093fb", "#f5576c"] as const,
    },
    {
      id: "youtube",
      title: "YouTube Video",
      description: "Learn from video content",
      icon: "play.fill",
      gradient: ["#4facfe", "#00f2fe"] as const,
    },
    {
      id: "manual",
      title: "Manual Entry",
      description: "Custom question-answer pairs",
      icon: "pencil",
      gradient: ["#43e97b", "#38f9d7"] as const,
    },
  ];

  // UPDATED: Direct navigation to create screen with method pre-selected
  const handleMethodSelect = (methodId: string) => {
    router.push({
      pathname: "/(tabs)/create",
      params: {
        method: methodId,
        skipSelection: "true", // Skip method selection step
      },
    });
  };

  // Calculate stats for the header
  const totalCards = decks.reduce((sum, deck) => sum + deck.card_count, 0);
  const totalDueCards = decks.reduce((sum, deck) => sum + deck.dueCards, 0);

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
        {/* Enhanced Header with Stats */}
        <LinearGradient
          colors={
            colorScheme === "dark"
              ? ["#1a1a2e", "#16213e"]
              : ["#667eea", "#764ba2"]
          }
          style={styles.headerGradient}
        >
          <View style={styles.header}>
            <Image
              style={styles.logo}
              source={require("../../assets/images/logo.png")}
              contentFit="contain"
              transition={1000}
            />

            {user && (
              <ThemedText style={styles.welcomeText}>
                Welcome back, {user.name.split(" ")[0]}!
              </ThemedText>
            )}

            {/* Stats Cards */}
            <View style={styles.statsContainer}>
              <View
                style={[
                  styles.statCard,
                  { backgroundColor: "rgba(255, 255, 255, 0.15)" },
                ]}
              >
                <Text style={styles.statValue}>{decks.length}</Text>
                <Text style={styles.statLabel}>Decks</Text>
              </View>
              <View
                style={[
                  styles.statCard,
                  { backgroundColor: "rgba(255, 255, 255, 0.15)" },
                ]}
              >
                <Text style={styles.statValue}>{totalCards}</Text>
                <Text style={styles.statLabel}>Cards</Text>
              </View>
              <View
                style={[
                  styles.statCard,
                  { backgroundColor: "rgba(255, 111, 53, 0.2)" },
                ]}
              >
                <Text style={[styles.statValue, { color: "#FF6B35" }]}>
                  {totalDueCards}
                </Text>
                <Text style={[styles.statLabel, { color: "#FF6B35" }]}>
                  Due
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Quick Actions */}
        {decks.length > 0 && totalDueCards > 0 && (
          <View style={styles.quickActionsContainer}>
            <TouchableOpacity
              style={[styles.quickStudyButton, { backgroundColor: "#FF6B35" }]}
              onPress={() => {
                // Find first deck with due cards and start studying
                const deckWithDueCards = decks.find(
                  (deck) => deck.dueCards > 0
                );
                if (deckWithDueCards) {
                  handleStudyDeck(deckWithDueCards);
                }
              }}
            >
              <IconSymbol name="flame.fill" size={24} color="white" />
              <Text style={styles.quickStudyText}>
                Study Now ({totalDueCards} due)
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* My Decks Section */}
        {decks.length > 0 && (
          <View style={styles.decksSection}>
            <View style={styles.sectionHeader}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                My Decks
              </ThemedText>
            </View>

            <View style={styles.decksGrid}>
              {decks.map((deck, deckIndex) => {
                const status = getDeckStatus(deck);

                return (
                  <TouchableOpacity
                    key={deck.id}
                    style={styles.deckCardContainer}
                    onPress={() => handleStudyDeck(deck)}
                    activeOpacity={0.8}
                  >
                    {/* Pile of Cards Effect - Background Layers */}
                    <View
                      style={[
                        styles.cardLayer,
                        styles.cardLayer3,
                        { backgroundColor: colors.background },
                      ]}
                    />
                    <View
                      style={[
                        styles.cardLayer,
                        styles.cardLayer2,
                        { backgroundColor: colors.background },
                      ]}
                    />

                    {/* Main Card (Top Layer) */}
                    <View
                      style={[
                        styles.deckCard,
                        { backgroundColor: colors.background },
                      ]}
                    >
                      {/* Card corner fold effect */}
                      <View
                        style={[
                          styles.cardCornerFold,
                          { backgroundColor: colors.text + "10" },
                        ]}
                      />

                      {/* Deck Header */}
                      <View style={styles.deckHeader}>
                        <View
                          style={[
                            styles.deckIconContainer,
                            { backgroundColor: status.color + "20" },
                          ]}
                        >
                          <IconSymbol
                            name={status.icon}
                            size={20}
                            color={status.color}
                          />
                        </View>

                        <TouchableOpacity
                          style={styles.deckMenuButton}
                          onPress={() => {
                            Alert.alert(deck.title, "Choose an action", [
                              { text: "Cancel", style: "cancel" },
                              ...(__DEV__ && deck.card_count > 0
                                ? [
                                    {
                                      text: "Reset for Study",
                                      onPress: () =>
                                        handleResetDeckForStudy(deck),
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

                      {/* Deck Content */}
                      <View style={styles.deckContent}>
                        <ThemedText
                          type="defaultSemiBold"
                          style={styles.deckTitle}
                          numberOfLines={2}
                        >
                          {deck.title}
                        </ThemedText>

                        <View style={styles.deckStats}>
                          <ThemedText
                            style={[
                              styles.deckStat,
                              { color: colors.text + "70" },
                            ]}
                          >
                            {deck.card_count} cards
                          </ThemedText>
                        </View>

                        <View
                          style={[
                            styles.statusBadge,
                            { backgroundColor: status.color + "15" },
                          ]}
                        >
                          <Text
                            style={[styles.statusText, { color: status.color }]}
                          >
                            {status.text}
                          </Text>
                        </View>
                      </View>

                      {/* Card count indicator on the side */}
                      <View style={styles.cardCountIndicator}>
                        {Array.from(
                          { length: Math.min(deck.card_count, 5) },
                          (_, i) => (
                            <View
                              key={i}
                              style={[
                                styles.cardCountLine,
                                { backgroundColor: colors.text + "20" },
                                i === 4 &&
                                  deck.card_count > 5 &&
                                  styles.cardCountLineThicker,
                              ]}
                            />
                          )
                        )}
                        {deck.card_count > 5 && (
                          <Text
                            style={[
                              styles.cardCountText,
                              { color: colors.text + "60" },
                            ]}
                          >
                            +{deck.card_count - 5}
                          </Text>
                        )}
                      </View>

                      {/* Study Button Overlay */}
                      {status.canStudy && (
                        <View style={styles.studyOverlay}>
                          <View
                            style={[
                              styles.studyBadge,
                              { backgroundColor: status.color },
                            ]}
                          >
                            <IconSymbol
                              name="flame.fill"
                              size={14}
                              color="white"
                            />
                            <Text style={styles.studyBadgeText}>Ready</Text>
                          </View>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Create New Section with AI Theme */}
        <View style={styles.methodsContainer}>
          {/* AI Section Header */}
          <View style={styles.aiSectionHeader}>
            <View style={styles.aiHeaderContainer}>
              {/* AI Icon */}
              <View
                style={[
                  styles.aiHeaderIcon,
                  {
                    backgroundColor: colors.tint + "15",
                    borderColor: colors.tint + "30",
                  },
                ]}
              >
                <IconSymbol name="plus" size={24} color={colors.tint} />
              </View>

              {/* Header Content */}
              <Text style={[styles.aiTitle, { color: colors.text }]}>
                {decks.length > 0
                  ? "Create New Deck with AI"
                  : "Get Started - AI-Powered Learning"}
              </Text>
              <Text style={[styles.aiSubtitle, { color: colors.text + "70" }]}>
                Transform any content into smart flashcards instantly
              </Text>
            </View>

            {/* Connection line */}
            <View
              style={[
                styles.aiConnectionLine,
                { backgroundColor: colors.tint + "30" },
              ]}
            />
          </View>

          <View style={styles.methodsGrid}>
            {/* AI-Powered Methods */}
            <View style={styles.aiMethodsSection}>
              {methods
                .filter((method) => method.id !== "manual")
                .map((method, index) => (
                  <TouchableOpacity
                    key={method.id}
                    style={[
                      styles.methodCard,
                      {
                        transform: [{ scale: 1 }],
                        opacity: 1,
                      },
                    ]}
                    onPress={() => handleMethodSelect(method.id)} // UPDATED: Direct navigation
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
                          size={20}
                          color="white"
                        />
                      </View>
                      <View style={styles.methodContent}>
                        <Text style={styles.methodTitle}>{method.title}</Text>
                        <Text style={styles.methodDescription}>
                          {method.description}
                        </Text>
                      </View>

                      {/* AI Sparkle Effect */}
                      <View style={styles.aiSparkleContainer}>
                        <View style={[styles.aiSparkle, styles.sparkle1]} />
                        <View style={[styles.aiSparkle, styles.sparkle2]} />
                        <View style={[styles.aiSparkle, styles.sparkle3]} />
                      </View>

                      {/* AI Badge */}
                      <View style={styles.aiBadge}>
                        <Text style={styles.aiBadgeText}>AI</Text>
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                ))}
            </View>

            {/* Separator */}
            <View style={styles.methodsSeparator}>
              <View
                style={[
                  styles.separatorLine,
                  { backgroundColor: colors.text + "20" },
                ]}
              />
              <View
                style={[
                  styles.separatorTextContainer,
                  { backgroundColor: colors.background },
                ]}
              >
                <Text
                  style={[styles.separatorText, { color: colors.text + "60" }]}
                >
                  or
                </Text>
              </View>
              <View
                style={[
                  styles.separatorLine,
                  { backgroundColor: colors.text + "20" },
                ]}
              />
            </View>

            {/* Manual Method */}
            <View style={styles.manualMethodSection}>
              {methods
                .filter((method) => method.id === "manual")
                .map((method) => (
                  <TouchableOpacity
                    key={method.id}
                    style={[
                      styles.manualCard,
                      {
                        transform: [{ scale: 1 }],
                        opacity: 1,
                      },
                    ]}
                    onPress={() => handleMethodSelect(method.id)} // UPDATED: Direct navigation
                    activeOpacity={0.8}
                  >
                    <View
                      style={[
                        styles.manualContent,
                        { backgroundColor: colors.background },
                      ]}
                    >
                      {/* Paper lines effect */}
                      <View style={styles.paperLines}>
                        <View style={styles.paperLine} />
                        <View style={styles.paperLine} />
                        <View style={styles.paperLine} />
                      </View>

                      {/* Red margin line */}
                      <View style={styles.marginLine} />

                      <View style={styles.manualIconContainer}>
                        <IconSymbol
                          name={method.icon as any}
                          size={20}
                          color="#6B7280"
                        />
                      </View>
                      <View style={styles.manualTextContent}>
                        <Text
                          style={[styles.manualTitle, { color: colors.text }]}
                        >
                          {method.title}
                        </Text>
                        <Text
                          style={[
                            styles.manualDescription,
                            { color: colors.text + "70" },
                          ]}
                        >
                          {method.description}
                        </Text>
                      </View>

                      {/* Manual Badge */}
                      <View
                        style={[
                          styles.manualBadgeContainer,
                          { backgroundColor: colors.text + "10" },
                        ]}
                      >
                        <Text
                          style={[
                            styles.manualBadgeTextNew,
                            { color: colors.text + "60" },
                          ]}
                        >
                          Manual
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

// Styles remain exactly the same as the original file
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
  headerGradient: {
    paddingTop: 60,
    paddingBottom: 32,
    marginBottom: 24,
  },
  header: {
    paddingHorizontal: 24,
    alignItems: "center",
  },
  logo: {
    width: 180,
    height: 60,
    marginBottom: 16,
  },
  welcomeText: {
    fontSize: 18,
    color: "white",
    marginBottom: 24,
    fontWeight: "500",
  },
  statsContainer: {
    flexDirection: "row",
    gap: 16,
    width: "100%",
    justifyContent: "center",
  },
  statCard: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: "center",
    minWidth: 80,
    flex: 1,
    maxWidth: 100,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  quickActionsContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  quickStudyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    gap: 12,
    shadowColor: "#FF6B35",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  quickStudyText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  decksSection: {
    paddingHorizontal: 24,
    marginBottom: 40,
  },
  sectionHeader: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  decksGrid: {
    gap: 24,
  },
  // Updated deck card styles for pile of cards effect
  deckCardContainer: {
    marginBottom: 32,
    marginHorizontal: 8,
    position: "relative",
    height: 180, // Increased to accommodate more visible layers
  },

  // Background card layers for pile effect
  cardLayer: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 160,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 2,
    borderColor: "rgba(102, 126, 234, 0.25)",
  },

  cardLayer2: {
    top: 6,
    left: 4,
    right: -4,
    transform: [{ rotate: "2.5deg" }],
    opacity: 0.85,
    borderColor: "rgba(102, 126, 234, 0.35)",
  },

  cardLayer3: {
    top: 12,
    left: 8,
    right: -8,
    transform: [{ rotate: "-1.8deg" }],
    opacity: 0.65,
    borderColor: "rgba(102, 126, 234, 0.45)",
  },

  // Main deck card (top layer)
  deckCard: {
    borderRadius: 16,
    padding: 20,
    height: 160,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
    position: "relative",
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(102, 126, 234, 0.3)",
    justifyContent: "space-between",
    zIndex: 3, // Ensure top layer is above others
  },

  // Corner fold effect to make it look more like a card
  cardCornerFold: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 20,
    height: 20,
    transform: [{ rotate: "45deg" }],
    borderTopRightRadius: 16,
  },

  deckHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  deckIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },

  deckMenuButton: {
    padding: 6,
  },

  deckContent: {
    flex: 1,
    justifyContent: "space-between",
  },

  deckTitle: {
    fontSize: 16,
    lineHeight: 20,
    marginBottom: 8,
  },

  deckStats: {
    marginBottom: 8,
  },

  deckStat: {
    fontSize: 13,
  },

  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },

  statusText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Card count indicator on the right side
  cardCountIndicator: {
    position: "absolute",
    right: 8,
    top: "50%",
    transform: [{ translateY: -20 }],
    alignItems: "center",
  },

  cardCountLine: {
    width: 3,
    height: 8,
    marginVertical: 1,
    borderRadius: 1.5,
  },

  cardCountLineThicker: {
    width: 4,
    height: 10,
  },

  cardCountText: {
    fontSize: 9,
    fontWeight: "600",
    marginTop: 2,
  },

  studyOverlay: {
    position: "absolute",
    top: 12,
    right: 12,
  },

  studyBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
  },

  studyBadgeText: {
    color: "white",
    fontSize: 9,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  methodsContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  // AI Section Header styles
  aiSectionHeader: {
    marginBottom: 8,
    paddingHorizontal: 0,
  },
  aiHeaderContainer: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: "center",
    backgroundColor: "transparent",
  },
  aiHeaderIcon: {
    marginBottom: 12,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
  },
  aiConnectionLine: {
    width: 2,
    height: 16,
    alignSelf: "center",
    marginVertical: 8,
  },
  aiTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  aiSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    maxWidth: 280,
  },
  methodsGrid: {},
  aiMethodsSection: {
    gap: 16,
    marginBottom: 12,
  },
  methodsSeparator: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
    paddingHorizontal: 20,
  },
  separatorLine: {
    flex: 1,
    height: 1,
  },
  separatorTextContainer: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 12,
    marginHorizontal: 12,
  },
  separatorText: {
    fontSize: 12,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  manualMethodSection: {
    marginTop: 12,
  },
  methodCard: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  methodGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    position: "relative",
    overflow: "hidden",
  },
  methodIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    shadowColor: "rgba(255, 255, 255, 0.5)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  methodContent: {
    flex: 1,
  },
  methodTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
    marginBottom: 4,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  methodDescription: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.85)",
    lineHeight: 18,
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  aiSparkleContainer: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    pointerEvents: "none",
  },
  aiSparkle: {
    position: "absolute",
    width: 4,
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.6)",
    borderRadius: 2,
  },
  sparkle1: {
    top: 15,
    right: 20,
    opacity: 0.8,
  },
  sparkle2: {
    top: 35,
    right: 45,
    opacity: 0.6,
  },
  sparkle3: {
    top: 25,
    right: 70,
    opacity: 0.7,
  },
  aiBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  aiBadgeText: {
    color: "white",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  // Manual Entry - Paper/Notebook Theme
  manualCard: {
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "rgba(107, 114, 128, 0.2)",
  },
  manualContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    position: "relative",
    minHeight: 80,
  },
  paperLines: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "space-around",
    paddingVertical: 15,
  },
  paperLine: {
    height: 1,
    backgroundColor: "rgba(107, 114, 128, 0.1)",
    marginHorizontal: 20,
  },
  marginLine: {
    position: "absolute",
    left: 60,
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: "rgba(239, 68, 68, 0.3)",
  },
  manualIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "rgba(107, 114, 128, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    borderWidth: 1,
    borderColor: "rgba(107, 114, 128, 0.2)",
  },
  manualTextContent: {
    flex: 1,
  },
  manualTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
    fontFamily: "System",
  },
  manualDescription: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "System",
  },
  manualBadgeContainer: {
    position: "absolute",
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(107, 114, 128, 0.2)",
  },
  manualBadgeTextNew: {
    fontSize: 10,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
