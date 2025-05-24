import { ThemedView } from "@/components/ThemedView";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { getCurrentUser } from "../services/authService";
import { addCardsToDeck, createDeck } from "../services/deckService";
import type { QAPair } from "../types";

const { height: screenHeight } = Dimensions.get("window");

export default function ReviewCardsScreen() {
  const { taskId, method } = useLocalSearchParams<{
    taskId?: string;
    method?: string;
  }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  const [qaPairs, setQaPairs] = useState<QAPair[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deckTitle, setDeckTitle] = useState("My Flashcards");
  const [showTitleModal, setShowTitleModal] = useState(false);

  const API_BASE_URL = "https://memori-ai.com";

  // Method configuration for styling
  const methodConfig = {
    pdf: {
      title: "PDF Upload",
      gradient: ["#667eea", "#764ba2"] as const,
      icon: "doc.fill" as const,
    },
    text: {
      title: "Text Input",
      gradient: ["#f093fb", "#f5576c"] as const,
      icon: "text.alignleft" as const,
    },
    youtube: {
      title: "YouTube Video",
      gradient: ["#4facfe", "#00f2fe"] as const,
      icon: "play.fill" as const,
    },
    manual: {
      title: "Manual Entry",
      gradient: ["#43e97b", "#38f9d7"] as const,
      icon: "pencil" as const,
    },
  };

  const currentMethod =
    methodConfig[method as keyof typeof methodConfig] || methodConfig.manual;

  useEffect(() => {
    if (taskId && method !== "manual") {
      fetchQAPairs();
    } else if (method === "manual") {
      const { cards } = useLocalSearchParams<{ cards?: string }>();
      if (cards) {
        try {
          const parsedCards = JSON.parse(cards);
          setQaPairs(parsedCards);
          setLoading(false);
        } catch (error) {
          console.error("Error parsing manual cards:", error);
          setQaPairs([{ question: "", answer: "" }]);
          setLoading(false);
        }
      } else {
        setQaPairs([{ question: "", answer: "" }]);
        setLoading(false);
      }
    }
  }, [taskId, method]);

  const fetchQAPairs = async () => {
    if (!taskId) return;

    try {
      const response = await fetch(`${API_BASE_URL}/qa-pairs/${taskId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setQaPairs(data.qa_pairs || []);
    } catch (error) {
      console.error("Fetch error:", error);
      Alert.alert("Error", "Failed to load flashcards");
    } finally {
      setLoading(false);
    }
  };

  const updateQAPair = (
    index: number,
    field: "question" | "answer",
    value: string
  ) => {
    const updated = [...qaPairs];
    updated[index] = { ...updated[index], [field]: value };
    setQaPairs(updated);
  };

  const deleteCard = (index: number) => {
    if (qaPairs.length <= 1) {
      Alert.alert("Error", "You need at least one flashcard");
      return;
    }

    Alert.alert(
      "Delete Card",
      "Are you sure you want to delete this flashcard?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            const updated = qaPairs.filter((_, i) => i !== index);
            setQaPairs(updated);
            if (currentIndex >= updated.length) {
              setCurrentIndex(Math.max(0, updated.length - 1));
            }
          },
        },
      ]
    );
  };

  const addNewCard = () => {
    const newCard: QAPair = { question: "", answer: "" };
    setQaPairs([...qaPairs, newCard]);
    setCurrentIndex(qaPairs.length);
  };

  const createDeckLocally = async () => {
    // Validate cards
    const invalidCards = qaPairs.filter(
      (card) => !card.question.trim() || !card.answer.trim()
    );

    if (invalidCards.length > 0) {
      Alert.alert(
        "Incomplete Cards",
        `${invalidCards.length} cards have empty questions or answers. Please complete all cards.`
      );
      return;
    }

    if (!deckTitle.trim()) {
      Alert.alert("Error", "Please enter a deck title");
      return;
    }

    setCreating(true);

    try {
      // Get current user
      const user = await getCurrentUser();
      if (!user?.id) {
        Alert.alert("Error", "No user found. Please sign in again.");
        setCreating(false);
        return;
      }

      // Create deck in local database
      const deck = await createDeck(user.id, deckTitle.trim());

      // Add cards to the deck
      await addCardsToDeck(deck.id!, qaPairs);

      setCreating(false);

      Alert.alert("Success!", "Your deck has been created successfully!", [
        {
          text: "OK",
          onPress: () => {
            // Navigate back to home screen
            router.dismissAll();
            router.replace("/(tabs)");
          },
        },
      ]);
    } catch (error) {
      console.error("Create deck error:", error);
      Alert.alert("Error", "Failed to create deck");
      setCreating(false);
    }
  };

  const renderCard = (pair: QAPair, index: number) => (
    <View style={styles.cardContainer}>
      {/* Card Stack Effect */}
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

      {/* Main Card */}
      <View style={[styles.mainCard, { backgroundColor: colors.background }]}>
        {/* Card corner fold effect */}
        <View
          style={[
            styles.cardCornerFold,
            { backgroundColor: colors.text + "10" },
          ]}
        />

        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View
              style={[
                styles.cardBadge,
                { backgroundColor: currentMethod.gradient[0] + "20" },
              ]}
            >
              <IconSymbol
                name={currentMethod.icon}
                size={16}
                color={currentMethod.gradient[0]}
              />
              <Text
                style={[
                  styles.cardBadgeText,
                  { color: currentMethod.gradient[0] },
                ]}
              >
                Card {index + 1}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => deleteCard(index)}
          >
            <View style={styles.deleteButtonBackground}>
              <IconSymbol name="trash" size={18} color="#ff4757" />
            </View>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.cardContentScrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.cardContentContainer}
        >
          {/* Question Section */}
          <View style={styles.inputGroup}>
            <View style={styles.inputLabelContainer}>
              <View
                style={[
                  styles.inputLabelIcon,
                  { backgroundColor: "#4facfe20" },
                ]}
              >
                <Text style={styles.inputLabelIconText}>Q</Text>
              </View>
              <Text style={[styles.inputLabel, { color: colors.text }]}>
                Question
              </Text>
            </View>
            <ScrollView
              style={[
                styles.questionInputScrollView,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.text + "20",
                },
              ]}
              showsVerticalScrollIndicator={true}
              persistentScrollbar={true}
            >
              <TextInput
                style={[
                  styles.questionInput,
                  {
                    backgroundColor: colors.background,
                    color: colors.text,
                  },
                ]}
                placeholder="Enter your question..."
                placeholderTextColor={colors.text + "50"}
                value={pair.question}
                onChangeText={(text) => updateQAPair(index, "question", text)}
                multiline
                scrollEnabled={false} // Disable TextInput scroll since we're using ScrollView
              />
            </ScrollView>
          </View>

          {/* Answer Section */}
          <View style={styles.inputGroup}>
            <View style={styles.inputLabelContainer}>
              <View
                style={[
                  styles.inputLabelIcon,
                  { backgroundColor: "#4caf5020" },
                ]}
              >
                <Text style={styles.inputLabelIconText}>A</Text>
              </View>
              <Text style={[styles.inputLabel, { color: colors.text }]}>
                Answer
              </Text>
            </View>
            <ScrollView
              style={[
                styles.answerInputScrollView,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.text + "20",
                },
              ]}
              showsVerticalScrollIndicator={true}
              persistentScrollbar={true}
            >
              <TextInput
                style={[
                  styles.answerInput,
                  {
                    backgroundColor: colors.background,
                    color: colors.text,
                  },
                ]}
                placeholder="Enter the answer..."
                placeholderTextColor={colors.text + "50"}
                value={pair.answer}
                onChangeText={(text) => updateQAPair(index, "answer", text)}
                multiline
                scrollEnabled={false} // Disable TextInput scroll since we're using ScrollView
              />
            </ScrollView>
          </View>
        </ScrollView>

        {/* Card count indicator on the side */}
        <View style={styles.cardCountIndicator}>
          {Array.from({ length: Math.min(qaPairs.length, 5) }, (_, i) => (
            <View
              key={i}
              style={[
                styles.cardCountLine,
                {
                  backgroundColor:
                    i === index % 5
                      ? currentMethod.gradient[0]
                      : colors.text + "20",
                },
                i === 4 && qaPairs.length > 5 && styles.cardCountLineThicker,
              ]}
            />
          ))}
          {qaPairs.length > 5 && (
            <Text style={[styles.cardCountText, { color: colors.text + "60" }]}>
              +{qaPairs.length - 5}
            </Text>
          )}
        </View>
      </View>
    </View>
  );

  const renderPagination = () => (
    <View style={styles.paginationContainer}>
      <TouchableOpacity
        style={[
          styles.paginationButton,
          { backgroundColor: colors.background },
          currentIndex === 0 && styles.disabledButton,
        ]}
        onPress={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
        disabled={currentIndex === 0}
      >
        <IconSymbol
          name="chevron.left"
          size={20}
          color={currentIndex === 0 ? colors.text + "40" : colors.tint}
        />
      </TouchableOpacity>

      <View style={styles.paginationInfo}>
        <Text style={[styles.paginationText, { color: colors.text }]}>
          {currentIndex + 1} of {qaPairs.length}
        </Text>
        <View style={styles.paginationDots}>
          {qaPairs.slice(0, Math.min(qaPairs.length, 5)).map((_, i) => (
            <View
              key={i}
              style={[
                styles.paginationDot,
                {
                  backgroundColor:
                    i === currentIndex % 5 ? colors.tint : colors.text + "20",
                },
              ]}
            />
          ))}
          {qaPairs.length > 5 && (
            <Text
              style={[styles.paginationMore, { color: colors.text + "60" }]}
            >
              +{qaPairs.length - 5}
            </Text>
          )}
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.paginationButton,
          { backgroundColor: colors.background },
          currentIndex === qaPairs.length - 1 && styles.disabledButton,
        ]}
        onPress={() =>
          setCurrentIndex(Math.min(qaPairs.length - 1, currentIndex + 1))
        }
        disabled={currentIndex === qaPairs.length - 1}
      >
        <IconSymbol
          name="chevron.right"
          size={20}
          color={
            currentIndex === qaPairs.length - 1
              ? colors.text + "40"
              : colors.tint
          }
        />
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingIconContainer}>
            <ActivityIndicator size="large" color={colors.tint} />
            <View
              style={[styles.loadingPulse, { borderColor: colors.tint + "30" }]}
            />
          </View>
          <Text style={[styles.loadingTitle, { color: colors.text }]}>
            Loading Flashcards
          </Text>
          <Text style={[styles.loadingText, { color: colors.text + "70" }]}>
            Preparing your cards for review...
          </Text>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Enhanced Header */}
      <LinearGradient
        colors={currentMethod.gradient}
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
            <Text style={styles.title}>Review Cards</Text>
            <View style={styles.headerBadge}>
              <IconSymbol name={currentMethod.icon} size={16} color="white" />
              <Text style={styles.headerBadgeText}>{currentMethod.title}</Text>
            </View>
          </View>

          <View style={styles.headerSpacer} />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Progress Indicator */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressTitle, { color: colors.text }]}>
              Review & Edit Your Cards
            </Text>
            <Text
              style={[styles.progressSubtitle, { color: colors.text + "70" }]}
            >
              Make any necessary changes before creating your deck
            </Text>
          </View>

          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBar,
                { backgroundColor: colors.text + "20" },
              ]}
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: colors.tint,
                    width: `${((currentIndex + 1) / qaPairs.length) * 100}%`,
                  },
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: colors.text + "60" }]}>
              {Math.round(((currentIndex + 1) / qaPairs.length) * 100)}%
              reviewed
            </Text>
          </View>
        </View>

        {/* Current Card */}
        {qaPairs.length > 0 && renderCard(qaPairs[currentIndex], currentIndex)}

        {/* Pagination */}
        {renderPagination()}

        {/* Add New Card Button */}
        <TouchableOpacity
          style={[
            styles.addButton,
            {
              backgroundColor: colors.background,
              borderColor: colors.tint + "40",
            },
          ]}
          onPress={addNewCard}
        >
          <View
            style={[
              styles.addButtonIcon,
              { backgroundColor: colors.tint + "15" },
            ]}
          >
            <IconSymbol name="plus" size={20} color={colors.tint} />
          </View>
          <Text style={[styles.addButtonText, { color: colors.tint }]}>
            Add New Card
          </Text>
          <Text style={[styles.addButtonHint, { color: colors.text + "50" }]}>
            Create additional flashcards
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Enhanced Footer */}
      <LinearGradient
        colors={[colors.background + "00", colors.background]}
        style={styles.footerGradient}
      >
        <View style={[styles.footer, { backgroundColor: "transparent" }]}>
          <View style={styles.footerStats}>
            <View style={styles.footerStat}>
              <Text style={[styles.footerStatNumber, { color: colors.tint }]}>
                {qaPairs.length}
              </Text>
              <Text
                style={[styles.footerStatLabel, { color: colors.text + "70" }]}
              >
                Cards
              </Text>
            </View>
            <View style={styles.footerStat}>
              <Text style={[styles.footerStatNumber, { color: "#4caf50" }]}>
                {
                  qaPairs.filter(
                    (card) => card.question.trim() && card.answer.trim()
                  ).length
                }
              </Text>
              <Text
                style={[styles.footerStatLabel, { color: colors.text + "70" }]}
              >
                Complete
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.createButton, { backgroundColor: colors.tint }]}
            onPress={() => setShowTitleModal(true)}
            disabled={creating}
          >
            {creating ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <IconSymbol name="checkmark" size={20} color="white" />
                <Text style={styles.createButtonText}>Save Deck</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Enhanced Title Modal */}
      <Modal visible={showTitleModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.background },
            ]}
          >
            <View style={styles.modalHeader}>
              <LinearGradient
                colors={currentMethod.gradient}
                style={styles.modalHeaderGradient}
              >
                <IconSymbol name="folder" size={24} color="white" />
              </LinearGradient>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Name Your Deck
              </Text>
              <Text
                style={[styles.modalSubtitle, { color: colors.text + "70" }]}
              >
                Choose a memorable name for your flashcard deck
              </Text>
            </View>

            <TextInput
              style={[
                styles.titleInput,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.text + "20",
                  color: colors.text,
                },
              ]}
              placeholder="Enter deck title..."
              placeholderTextColor={colors.text + "40"}
              value={deckTitle}
              onChangeText={setDeckTitle}
              autoFocus
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalCancelButton,
                  {
                    backgroundColor: colors.text + "10",
                    borderColor: colors.text + "20",
                  },
                ]}
                onPress={() => setShowTitleModal(false)}
              >
                <Text style={[styles.modalCancelText, { color: colors.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.tint }]}
                onPress={() => {
                  setShowTitleModal(false);
                  createDeckLocally();
                }}
              >
                <IconSymbol name="checkmark" size={16} color="white" />
                <Text style={styles.modalButtonText}>Create Deck</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  headerBadgeText: {
    fontSize: 12,
    color: "white",
    fontWeight: "500",
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // Loading Styles
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  loadingIconContainer: {
    position: "relative",
    marginBottom: 24,
  },
  loadingPulse: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    top: -14,
    left: -14,
    opacity: 0.3,
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  loadingText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },

  // Progress Section
  progressSection: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  progressHeader: {
    alignItems: "center",
    marginBottom: 16,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
    textAlign: "center",
  },
  progressSubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  progressBarContainer: {
    alignItems: "center",
    gap: 8,
  },
  progressBar: {
    width: "100%",
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: "500",
  },

  // Card Styles with Stack Effect - UPDATED FOR DYNAMIC HEIGHT
  cardContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
    position: "relative",
    minHeight: 480, // Increased minimum height
  },
  cardLayer: {
    position: "absolute",
    left: 24,
    right: 24,
    minHeight: 460, // Dynamic height based on content
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(102, 126, 234, 0.15)",
  },
  cardLayer2: {
    top: 8,
    left: 28,
    right: 20,
    transform: [{ rotate: "1.5deg" }],
    opacity: 0.7,
  },
  cardLayer3: {
    top: 16,
    left: 32,
    right: 16,
    transform: [{ rotate: "-1deg" }],
    opacity: 0.4,
  },
  mainCard: {
    borderRadius: 20,
    padding: 24,
    minHeight: 460, // Increased minimum height
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
    position: "relative",
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(102, 126, 234, 0.2)",
    zIndex: 3,
    flex: 1, // Allow card to expand
  },
  cardCornerFold: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 20,
    height: 20,
    transform: [{ rotate: "45deg" }],
    borderTopRightRadius: 20,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  cardBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  deleteButton: {
    padding: 4,
  },
  deleteButtonBackground: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255, 71, 87, 0.1)",
  },

  // NEW: Scrollable card content
  cardContentScrollView: {
    flex: 1,
    maxHeight: screenHeight * 0.4, // Limit to 40% of screen height
  },
  cardContentContainer: {},

  // Input Styles - UPDATED FOR BETTER SCROLLING
  inputGroup: {
    marginBottom: 24,
  },
  inputLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  inputLabelIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  inputLabelIconText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4facfe",
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
  },

  // NEW: ScrollView containers for text inputs
  questionInputScrollView: {
    borderWidth: 1.5,
    borderRadius: 12,
    maxHeight: 120, // Limit height and add scrolling
  },
  answerInputScrollView: {
    borderWidth: 1.5,
    borderRadius: 12,
    maxHeight: 140, // Limit height and add scrolling
  },

  // UPDATED: Text inputs without fixed heights
  questionInput: {
    padding: 16,
    fontSize: 16,
    lineHeight: 22,
    minHeight: 80, // Minimum height but can expand
  },
  answerInput: {
    padding: 16,
    fontSize: 16,
    lineHeight: 22,
    minHeight: 100, // Minimum height but can expand
  },

  // Card Count Indicator
  cardCountIndicator: {
    position: "absolute",
    right: 8,
    top: "50%",
    transform: [{ translateY: -30 }],
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
    marginTop: 4,
  },

  // Pagination Styles
  paginationContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    marginBottom: 32,
    gap: 20,
  },
  paginationButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  disabledButton: {
    opacity: 0.4,
  },
  paginationInfo: {
    alignItems: "center",
    gap: 8,
  },
  paginationText: {
    fontSize: 16,
    fontWeight: "600",
  },
  paginationDots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  paginationMore: {
    fontSize: 10,
    fontWeight: "600",
    marginLeft: 4,
  },

  // Add Button Styles
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 24,
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: "dashed",
    marginBottom: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  addButtonIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  addButtonHint: {
    fontSize: 12,
    position: "absolute",
    right: 20,
    bottom: 6,
  },

  // Footer Styles
  footerGradient: {
    paddingTop: 20,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 20,
  },
  footerStats: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 40,
    marginBottom: 20,
  },
  footerStat: {
    alignItems: "center",
  },
  footerStatNumber: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 4,
  },
  footerStatLabel: {
    fontSize: 12,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    borderRadius: 16,
    gap: 8,
    shadowColor: "#667eea",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  createButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    margin: 40,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
    minWidth: 320,
    maxWidth: 400,
  },
  modalHeader: {
    alignItems: "center",
    padding: 32,
    paddingBottom: 24,
  },
  modalHeaderGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  titleInput: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginHorizontal: 24,
    marginBottom: 32,
  },
  modalButtons: {
    flexDirection: "row",
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    gap: 6,
  },
  modalCancelButton: {
    borderWidth: 1.5,
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: "600",
  },
  modalButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
