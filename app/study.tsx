import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  getDeckCards,
  getDueCards,
  updateCardStudyData,
} from "../services/deckService";
import type { CardWithStudyData } from "../types";
import { calculateDueDateString, calculateSM2 } from "../utils/sm2Algorithm";

export default function StudyScreen() {
  const { deckId } = useLocalSearchParams<{ deckId: string }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  const [cards, setCards] = useState<CardWithStudyData[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [studying, setStudying] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [cardsStudied, setCardsStudied] = useState(0);

  // Simple animation values
  const scaleAnimation = new Animated.Value(1);

  useEffect(() => {
    loadDueCards();
  }, [deckId]);

  const loadDueCards = async () => {
    if (!deckId) return;

    try {
      setLoading(true);
      const dueCards = await getDueCards(parseInt(deckId));
      setCards(dueCards);

      if (dueCards.length === 0) {
        const allCards = await getDeckCards(parseInt(deckId));
        if (allCards.length === 0) {
          setSessionComplete(true);
        } else {
          setTimeout(() => loadDueCards(), 1000);
        }
      }
    } catch (error) {
      console.error("Failed to load due cards:", error);
      Alert.alert("Error", "Failed to load cards for study");
    } finally {
      setLoading(false);
    }
  };

  const flipCard = () => {
    if (showAnswer) return;
    setShowAnswer(true);
  };

  const handleQualityRating = async (quality: number) => {
    if (!showAnswer || currentCardIndex >= cards.length) return;

    const currentCard = cards[currentCardIndex];

    if (!currentCard.id) {
      Alert.alert("Error", "Card is missing ID - cannot save progress");
      return;
    }

    setStudying(true);

    try {
      const sm2Result = calculateSM2({
        quality,
        repetitions: currentCard.repetitions,
        previousEaseFactor: currentCard.ease_factor,
        previousInterval: currentCard.interval_days,
      });

      await updateCardStudyData(currentCard.id, {
        card_id: currentCard.id,
        ease_factor: sm2Result.easeFactor,
        repetitions: sm2Result.repetitions,
        interval_days: sm2Result.interval,
        due_date: calculateDueDateString(sm2Result.interval),
      });

      // Quick scale animation for feedback
      Animated.sequence([
        Animated.timing(scaleAnimation, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnimation, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();

      const nextIndex = currentCardIndex + 1;
      setCardsStudied(cardsStudied + 1);

      if (nextIndex >= cards.length) {
        setSessionComplete(true);
      } else {
        // Reset for next card
        setTimeout(() => {
          setCurrentCardIndex(nextIndex);
          setShowAnswer(false);
        }, 200);
      }
    } catch (error) {
      console.error("Failed to update card:", error);
      Alert.alert("Error", "Failed to save your progress");
    } finally {
      setStudying(false);
    }
  };

  const resetSession = () => {
    setCurrentCardIndex(0);
    setShowAnswer(false);
    setSessionComplete(false);
    setCardsStudied(0);
    loadDueCards();
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.tint} />
          <ThemedText style={styles.loadingText}>Loading cards...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (sessionComplete || cards.length === 0) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <IconSymbol name="chevron.left" size={24} color={colors.tint} />
          </TouchableOpacity>
          <ThemedText type="title" style={styles.headerTitle}>
            Study Complete
          </ThemedText>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.centerContent}>
          <View
            style={[
              styles.completionCard,
              { backgroundColor: colors.background },
            ]}
          >
            <Text style={styles.completionIcon}>🎉</Text>
            <ThemedText type="subtitle" style={styles.completionTitle}>
              {cards.length === 0 ? "All Caught Up!" : "Session Complete!"}
            </ThemedText>
            <ThemedText
              style={[styles.completionText, { color: colors.text + "80" }]}
            >
              {cards.length === 0
                ? "No cards are due for review right now. Try the reset button on the home screen!"
                : `You studied ${cardsStudied} cards. Great job!`}
            </ThemedText>

            <View style={styles.completionButtons}>
              <TouchableOpacity
                style={[
                  styles.completionButton,
                  styles.secondaryButton,
                  { borderColor: colors.tint },
                ]}
                onPress={() => router.back()}
              >
                <ThemedText style={[styles.buttonText, { color: colors.tint }]}>
                  Back to Home
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.completionButton,
                  { backgroundColor: colors.tint },
                ]}
                onPress={resetSession}
              >
                <Text style={[styles.buttonText, { color: "white" }]}>
                  Study Again
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ThemedView>
    );
  }

  const currentCard = cards[currentCardIndex];
  const progress = ((currentCardIndex + 1) / cards.length) * 100;

  // Card colors based on state
  const questionCardColor = "#4A90E2"; // Thoughtful blue - represents curiosity/inquiry
  const answerCardColor = "#7ED321"; // Success green - represents knowledge/completion
  const questionTextColor = "#FFFFFF"; // White text on blue
  const answerTextColor = "#2C3E50"; // Dark text on green for better readability

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <IconSymbol name="chevron.left" size={24} color={colors.tint} />
        </TouchableOpacity>
        <View style={styles.progressContainer}>
          <ThemedText style={styles.progressText}>
            {currentCardIndex + 1} of {cards.length}
          </ThemedText>
          <View
            style={[
              styles.progressBar,
              { backgroundColor: colors.text + "20" },
            ]}
          >
            <View
              style={[
                styles.progressFill,
                { backgroundColor: colors.tint, width: `${progress}%` },
              ]}
            />
          </View>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.cardContainer}>
        {/* Card-like design with enhanced depth */}
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: showAnswer ? answerCardColor : questionCardColor,
              transform: [{ scale: scaleAnimation }],
            },
          ]}
        >
          {/* Card corner indicator */}
          <View
            style={[
              styles.cardCorner,
              { backgroundColor: showAnswer ? "#5BB318" : "#2E7CD6" },
            ]}
          />

          <View style={styles.cardHeader}>
            <Text
              style={[
                styles.cardType,
                { color: showAnswer ? answerTextColor : questionTextColor },
              ]}
            >
              {showAnswer ? "Answer" : "Question"}
            </Text>
          </View>

          <View style={styles.cardContent}>
            <Text
              style={[
                styles.cardText,
                { color: showAnswer ? answerTextColor : questionTextColor },
              ]}
            >
              {showAnswer ? currentCard.answer : currentCard.question}
            </Text>
          </View>

          {/* Card bottom accent */}
          <View
            style={[
              styles.cardAccent,
              { backgroundColor: showAnswer ? "#5BB318" : "#2E7CD6" },
            ]}
          />
        </Animated.View>

        {/* Buttons below the card */}
        {!showAnswer ? (
          <TouchableOpacity
            style={[styles.showAnswerButton, { backgroundColor: colors.tint }]}
            onPress={flipCard}
          >
            <Text style={styles.showAnswerText}>Show Answer</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.ratingContainer}>
            <ThemedText
              style={[styles.ratingTitle, { color: colors.text + "80" }]}
            >
              How well did you know this?
            </ThemedText>

            <View style={styles.ratingButtons}>
              {[
                {
                  quality: 0,
                  label: "Again",
                  color: "#ff4757",
                  description: "Complete blackout",
                },
                {
                  quality: 3,
                  label: "Hard",
                  color: "#ffa726",
                  description: "Correct with difficulty",
                },
                {
                  quality: 4,
                  label: "Good",
                  color: "#66bb6a",
                  description: "Correct after hesitation",
                },
                {
                  quality: 5,
                  label: "Easy",
                  color: "#4caf50",
                  description: "Perfect response",
                },
              ].map((rating) => (
                <TouchableOpacity
                  key={rating.quality}
                  style={[
                    styles.ratingButton,
                    { backgroundColor: rating.color },
                    studying && styles.disabledButton,
                  ]}
                  onPress={() => handleQualityRating(rating.quality)}
                  disabled={studying}
                >
                  {studying ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <>
                      <Text style={styles.ratingButtonText}>
                        {rating.label}
                      </Text>
                      <Text style={styles.ratingDescription}>
                        {rating.description}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  progressContainer: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 20,
  },
  progressText: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  progressBar: {
    width: "100%",
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
  },
  headerSpacer: {
    width: 40,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  completionCard: {
    padding: 32,
    borderRadius: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    maxWidth: 400,
    width: "100%",
  },
  completionIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  completionTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  },
  completionText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 24,
  },
  completionButtons: {
    flexDirection: "row",
    gap: 16,
    width: "100%",
  },
  completionButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  secondaryButton: {
    backgroundColor: "transparent",
    borderWidth: 2,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  cardContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
    justifyContent: "center",
  },
  card: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 32,
    minHeight: 320,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
    justifyContent: "space-between",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  cardCorner: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 40,
    height: 40,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 16,
    opacity: 0.8,
  },
  cardHeader: {
    marginBottom: 20,
    alignItems: "center",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.3)",
  },
  cardType: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 2,
    opacity: 0.9,
  },
  cardContent: {
    flex: 1,
    justifyContent: "center",
    paddingVertical: 16,
  },
  cardText: {
    fontSize: 19,
    lineHeight: 32,
    textAlign: "center",
    fontWeight: "500",
    textShadowColor: "rgba(0, 0, 0, 0.1)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  cardAccent: {
    height: 4,
    borderRadius: 2,
    marginTop: 16,
    marginHorizontal: 20,
    opacity: 0.6,
  },
  showAnswerButton: {
    padding: 18,
    borderRadius: 16,
    alignItems: "center",
  },
  showAnswerText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  ratingContainer: {
    alignItems: "center",
  },
  ratingTitle: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: "center",
  },
  ratingButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "center",
  },
  ratingButton: {
    minWidth: 80,
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 60,
  },
  ratingButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  ratingDescription: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 10,
    textAlign: "center",
  },
  disabledButton: {
    opacity: 0.7,
  },
});
