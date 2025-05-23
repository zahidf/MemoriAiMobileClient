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
import { getDueCards, updateCardStudyData } from "../services/deckService";
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

  // Animation values
  const flipAnimation = new Animated.Value(0);
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
        setSessionComplete(true);
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

    Animated.timing(flipAnimation, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    setShowAnswer(true);
  };

  const handleQualityRating = async (quality: number) => {
    if (!showAnswer || currentCardIndex >= cards.length) return;

    const currentCard = cards[currentCardIndex];
    setStudying(true);

    try {
      // Calculate new SM-2 values
      const sm2Result = calculateSM2({
        quality,
        repetitions: currentCard.repetitions,
        previousEaseFactor: currentCard.ease_factor,
        previousInterval: currentCard.interval_days,
      });

      // Update card study data
      await updateCardStudyData(currentCard.id!, {
        card_id: currentCard.id!,
        ease_factor: sm2Result.easeFactor,
        repetitions: sm2Result.repetitions,
        interval_days: sm2Result.interval,
        due_date: calculateDueDateString(sm2Result.interval),
      });

      // Animate card exit
      Animated.sequence([
        Animated.timing(scaleAnimation, {
          toValue: 0.8,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnimation, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Move to next card or complete session
      const nextIndex = currentCardIndex + 1;
      setCardsStudied(cardsStudied + 1);

      if (nextIndex >= cards.length) {
        setSessionComplete(true);
      } else {
        setCurrentCardIndex(nextIndex);
        setShowAnswer(false);
        flipAnimation.setValue(0);
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
    flipAnimation.setValue(0);
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
                ? "No cards are due for review right now. Come back later!"
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

              {cards.length > 0 && (
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
              )}
            </View>
          </View>
        </View>
      </ThemedView>
    );
  }

  const currentCard = cards[currentCardIndex];
  const progress = ((currentCardIndex + 1) / cards.length) * 100;

  const frontRotation = flipAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  const backRotation = flipAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ["180deg", "360deg"],
  });

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
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: colors.background,
              transform: [{ scale: scaleAnimation }],
            },
          ]}
        >
          {!showAnswer ? (
            // Question Side
            <Animated.View
              style={[
                styles.cardSide,
                { transform: [{ rotateY: frontRotation }] },
              ]}
            >
              <View style={styles.cardHeader}>
                <ThemedText style={[styles.cardType, { color: colors.tint }]}>
                  Question
                </ThemedText>
              </View>
              <View style={styles.cardContent}>
                <ThemedText style={styles.cardText}>
                  {currentCard.question}
                </ThemedText>
              </View>
            </Animated.View>
          ) : (
            // Answer Side
            <Animated.View
              style={[
                styles.cardSide,
                { transform: [{ rotateY: backRotation }] },
              ]}
            >
              <View style={styles.cardHeader}>
                <ThemedText style={[styles.cardType, { color: colors.tint }]}>
                  Answer
                </ThemedText>
              </View>
              <View style={styles.cardContent}>
                <ThemedText style={styles.cardText}>
                  {currentCard.answer}
                </ThemedText>
              </View>
            </Animated.View>
          )}
        </Animated.View>

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
                  quality: 1,
                  label: "Hard",
                  color: "#ff6b7a",
                  description: "Incorrect; correct seemed easy",
                },
                {
                  quality: 2,
                  label: "Good",
                  color: "#ffa726",
                  description: "Incorrect; but remembered",
                },
                {
                  quality: 3,
                  label: "Easy",
                  color: "#26c6da",
                  description: "Correct with serious difficulty",
                },
                {
                  quality: 4,
                  label: "Perfect",
                  color: "#66bb6a",
                  description: "Correct after hesitation",
                },
                {
                  quality: 5,
                  label: "Excellent",
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
    borderRadius: 24,
    padding: 32,
    marginBottom: 32,
    minHeight: 300,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  cardSide: {
    flex: 1,
  },
  cardHeader: {
    marginBottom: 24,
    alignItems: "center",
  },
  cardType: {
    fontSize: 14,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  cardContent: {
    flex: 1,
    justifyContent: "center",
  },
  cardText: {
    fontSize: 18,
    lineHeight: 28,
    textAlign: "center",
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
    minWidth: 100,
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
