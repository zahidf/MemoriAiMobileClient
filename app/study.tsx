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

// Learning phase configuration
const LEARNING_STEPS = [1, 10]; // minutes - first review after 1 min, then 10 min
const GRADUATION_INTERVAL = 1; // days - when card graduates to review phase
const EASY_INTERVAL = 4; // days - when "Easy" is pressed on learning card

interface LearningCard extends CardWithStudyData {
  learningStep: number; // which learning step (0, 1, etc.)
  nextReviewTime: Date; // when this card should be shown next in session
  isLearning: boolean; // true if card is in learning phase
}

export default function StudyScreen() {
  const { deckId } = useLocalSearchParams<{ deckId: string }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  const [allCards, setAllCards] = useState<LearningCard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [studying, setStudying] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [cardsStudied, setCardsStudied] = useState(0);
  const [sessionStartTime] = useState(new Date());

  // Animation and transition state
  const scaleAnimation = new Animated.Value(1);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [displayedCard, setDisplayedCard] = useState<LearningCard | null>(null);

  useEffect(() => {
    loadDueCards();
  }, [deckId]);

  // Update displayed card when available cards change or current index changes
  // BUT only when we're not showing an answer (to prevent answer flash)
  useEffect(() => {
    const availableCards = getAvailableCards();
    if (
      availableCards.length > 0 &&
      currentCardIndex < availableCards.length &&
      !showAnswer
    ) {
      setDisplayedCard(availableCards[currentCardIndex]);
    }
  }, [allCards, currentCardIndex, showAnswer]);

  // Get cards that are ready to be studied right now
  const getAvailableCards = (): LearningCard[] => {
    const now = new Date();
    return allCards
      .filter((card) => card.nextReviewTime <= now)
      .sort((a, b) => a.nextReviewTime.getTime() - b.nextReviewTime.getTime());
  };

  const loadDueCards = async () => {
    if (!deckId) return;

    try {
      setLoading(true);
      const dueCards = await getDueCards(parseInt(deckId));

      // Convert to learning cards
      const learningCards: LearningCard[] = dueCards.map((card) => ({
        ...card,
        learningStep: card.repetitions === 0 ? 0 : -1, // New cards start at step 0, review cards at -1
        nextReviewTime: new Date(), // Available immediately
        isLearning:
          card.repetitions === 0 || card.interval_days < GRADUATION_INTERVAL, // Learning if new or interval < 1 day
      }));

      setAllCards(learningCards);

      if (learningCards.length === 0) {
        const allDeckCards = await getDeckCards(parseInt(deckId));
        if (allDeckCards.length === 0) {
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
    if (showAnswer || isTransitioning) return;
    setShowAnswer(true);
  };

  const handleQualityRating = async (quality: number) => {
    const availableCards = getAvailableCards();

    if (
      !showAnswer ||
      currentCardIndex >= availableCards.length ||
      isTransitioning ||
      studying
    )
      return;

    const currentCard = availableCards[currentCardIndex];

    if (!currentCard.id) {
      Alert.alert("Error", "Card is missing ID - cannot save progress");
      return;
    }

    setStudying(true);
    setIsTransitioning(true);

    try {
      let newCard: LearningCard = { ...currentCard };

      if (currentCard.isLearning) {
        // Handle learning phase
        if (quality >= 3) {
          // Correct answer in learning phase
          if (quality === 5) {
            // Easy - graduate immediately
            const sm2Result = calculateSM2({
              quality: 4, // Treat as "Good" for SM-2 calculation
              repetitions: currentCard.repetitions,
              previousEaseFactor: currentCard.ease_factor,
              previousInterval: currentCard.interval_days,
            });

            newCard = {
              ...currentCard,
              learningStep: -1,
              isLearning: false,
              ease_factor: sm2Result.easeFactor,
              repetitions: sm2Result.repetitions,
              interval_days: EASY_INTERVAL,
              nextReviewTime: new Date(
                Date.now() + EASY_INTERVAL * 24 * 60 * 60 * 1000
              ), // Out of session
            };

            // Update database
            await updateCardStudyData(currentCard.id, {
              card_id: currentCard.id,
              ease_factor: newCard.ease_factor,
              repetitions: newCard.repetitions,
              interval_days: newCard.interval_days,
              due_date: calculateDueDateString(newCard.interval_days),
            });
          } else {
            // Good/Hard - advance to next learning step
            const nextStep = currentCard.learningStep + 1;

            if (nextStep >= LEARNING_STEPS.length) {
              // Graduate to review phase
              const sm2Result = calculateSM2({
                quality,
                repetitions: 1, // First review
                previousEaseFactor: currentCard.ease_factor,
                previousInterval: 0,
              });

              newCard = {
                ...currentCard,
                learningStep: -1,
                isLearning: false,
                ease_factor: sm2Result.easeFactor,
                repetitions: sm2Result.repetitions,
                interval_days: GRADUATION_INTERVAL,
                nextReviewTime: new Date(
                  Date.now() + GRADUATION_INTERVAL * 24 * 60 * 60 * 1000
                ), // Out of session
              };

              // Update database
              await updateCardStudyData(currentCard.id, {
                card_id: currentCard.id,
                ease_factor: newCard.ease_factor,
                repetitions: newCard.repetitions,
                interval_days: newCard.interval_days,
                due_date: calculateDueDateString(newCard.interval_days),
              });
            } else {
              // Stay in learning, advance to next step
              const nextReviewMinutes = LEARNING_STEPS[nextStep];
              newCard = {
                ...currentCard,
                learningStep: nextStep,
                nextReviewTime: new Date(
                  Date.now() + nextReviewMinutes * 60 * 1000
                ),
              };
            }
          }
        } else {
          // Wrong answer - restart learning
          newCard = {
            ...currentCard,
            learningStep: 0,
            nextReviewTime: new Date(
              Date.now() + LEARNING_STEPS[0] * 60 * 1000
            ),
          };
        }
      } else {
        // Handle review phase (cards with interval >= 1 day)
        const sm2Result = calculateSM2({
          quality,
          repetitions: currentCard.repetitions,
          previousEaseFactor: currentCard.ease_factor,
          previousInterval: currentCard.interval_days,
        });

        if (quality >= 3) {
          // Correct - schedule for future
          newCard = {
            ...currentCard,
            ease_factor: sm2Result.easeFactor,
            repetitions: sm2Result.repetitions,
            interval_days: sm2Result.interval,
            nextReviewTime: new Date(
              Date.now() + sm2Result.interval * 24 * 60 * 60 * 1000
            ), // Out of session
          };

          // Update database
          await updateCardStudyData(currentCard.id, {
            card_id: currentCard.id,
            ease_factor: newCard.ease_factor,
            repetitions: newCard.repetitions,
            interval_days: newCard.interval_days,
            due_date: calculateDueDateString(newCard.interval_days),
          });
        } else {
          // Wrong - back to learning
          newCard = {
            ...currentCard,
            learningStep: 0,
            isLearning: true,
            repetitions: 0,
            interval_days: 0,
            nextReviewTime: new Date(
              Date.now() + LEARNING_STEPS[0] * 60 * 1000
            ),
          };

          // Update database
          await updateCardStudyData(currentCard.id, {
            card_id: currentCard.id,
            ease_factor: currentCard.ease_factor,
            repetitions: 0,
            interval_days: 0,
            due_date: new Date().toISOString(), // Due now
          });
        }
      }

      // Update the card in our state
      setAllCards((prevCards) =>
        prevCards.map((card) => (card.id === currentCard.id ? newCard : card))
      );

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

      setCardsStudied(cardsStudied + 1);

      // Immediate transition - no delays
      const nextAvailableCards = getAvailableCards();
      if (nextAvailableCards.length === 0) {
        setSessionComplete(true);
      } else {
        // Update both states together in the same batch
        setShowAnswer(false);
        setCurrentCardIndex(0);
      }
      setIsTransitioning(false);
    } catch (error) {
      console.error("Failed to update card:", error);
      Alert.alert("Error", "Failed to save your progress");
      setIsTransitioning(false);
    } finally {
      setStudying(false);
    }
  };

  const resetSession = () => {
    setCurrentCardIndex(0);
    setShowAnswer(false);
    setSessionComplete(false);
    setCardsStudied(0);
    setIsTransitioning(false);
    setDisplayedCard(null);
    loadDueCards();
  };

  const getCardTypeInfo = (card: LearningCard) => {
    if (!card.isLearning) {
      return {
        type: "Review",
        color: "#4A90E2",
        description: `Interval: ${card.interval_days} day${
          card.interval_days !== 1 ? "s" : ""
        }`,
      };
    }

    if (card.learningStep === 0) {
      return {
        type: card.repetitions === 0 ? "New" : "Learning (Again)",
        color: "#e74c3c",
        description: `Next: ${LEARNING_STEPS[0]} min`,
      };
    }

    return {
      type: "Learning",
      color: "#f39c12",
      description: `Step ${card.learningStep + 1}/${LEARNING_STEPS.length}`,
    };
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

  const availableCards = getAvailableCards();

  if (sessionComplete || availableCards.length === 0) {
    const learningCardsCount = allCards.filter(
      (card) => card.isLearning && card.nextReviewTime > new Date()
    ).length;

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
              {availableCards.length === 0
                ? "All Caught Up!"
                : "Session Complete!"}
            </ThemedText>
            <ThemedText
              style={[styles.completionText, { color: colors.text + "80" }]}
            >
              You studied {cardsStudied} cards. Great job!
            </ThemedText>

            {learningCardsCount > 0 && (
              <ThemedText
                style={[styles.learningCardsText, { color: "#f39c12" }]}
              >
                {learningCardsCount} card{learningCardsCount !== 1 ? "s" : ""}{" "}
                still learning - they'll appear again shortly in this session.
              </ThemedText>
            )}

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

              {learningCardsCount === 0 && (
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

  // Use displayedCard instead of currentCard to prevent content flashing
  const currentCard =
    displayedCard ||
    (availableCards.length > 0 ? availableCards[currentCardIndex] : null);

  if (!currentCard) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.tint} />
          <ThemedText style={styles.loadingText}>Loading card...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  const cardInfo = getCardTypeInfo(currentCard);
  const progress = ((currentCardIndex + 1) / availableCards.length) * 100;

  // Card colors based on state
  const questionCardColor = cardInfo.color;
  const answerCardColor = "#7ED321"; // Success green
  const questionTextColor = "#FFFFFF";
  const answerTextColor = "#2C3E50";

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
            {currentCardIndex + 1} of {availableCards.length} available
          </ThemedText>
          <ThemedText style={[styles.cardTypeText, { color: cardInfo.color }]}>
            {cardInfo.type} • {cardInfo.description}
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
              backgroundColor: showAnswer ? answerCardColor : questionCardColor,
              transform: [{ scale: scaleAnimation }],
            },
          ]}
        >
          <View
            style={[
              styles.cardCorner,
              {
                backgroundColor: showAnswer
                  ? "#5BB318"
                  : cardInfo.color === "#4A90E2"
                  ? "#2E7CD6"
                  : cardInfo.color,
              },
            ]}
          />

          <View style={styles.cardHeader}>
            <Text
              style={[
                styles.cardType,
                { color: showAnswer ? answerTextColor : questionTextColor },
              ]}
            >
              {showAnswer ? "Answer" : cardInfo.type}
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

          <View
            style={[
              styles.cardAccent,
              { backgroundColor: showAnswer ? "#5BB318" : cardInfo.color },
            ]}
          />
        </Animated.View>

        {!showAnswer ? (
          <TouchableOpacity
            style={[
              styles.showAnswerButton,
              { backgroundColor: colors.tint },
              isTransitioning && styles.disabledButton,
            ]}
            onPress={flipCard}
            disabled={isTransitioning}
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
              {(currentCard.isLearning
                ? // Learning phase buttons
                  [
                    {
                      quality: 0,
                      label: "Again",
                      color: "#ff4757",
                      description: `< ${LEARNING_STEPS[0]} min`,
                    },
                    {
                      quality: 3,
                      label: "Good",
                      color: "#66bb6a",
                      description:
                        currentCard.learningStep + 1 >= LEARNING_STEPS.length
                          ? `${GRADUATION_INTERVAL} day`
                          : `${
                              LEARNING_STEPS[currentCard.learningStep + 1]
                            } min`,
                    },
                    {
                      quality: 5,
                      label: "Easy",
                      color: "#4caf50",
                      description: `${EASY_INTERVAL} days`,
                    },
                  ]
                : // Review phase buttons
                  [
                    {
                      quality: 0,
                      label: "Again",
                      color: "#ff4757",
                      description: "Restart learning",
                    },
                    {
                      quality: 3,
                      label: "Hard",
                      color: "#ffa726",
                      description: "Reduced interval",
                    },
                    {
                      quality: 4,
                      label: "Good",
                      color: "#66bb6a",
                      description: "Normal interval",
                    },
                    {
                      quality: 5,
                      label: "Easy",
                      color: "#4caf50",
                      description: "Increased interval",
                    },
                  ]
              ).map((rating) => (
                <TouchableOpacity
                  key={rating.quality}
                  style={[
                    styles.ratingButton,
                    { backgroundColor: rating.color },
                    (studying || isTransitioning) && styles.disabledButton,
                  ]}
                  onPress={() => handleQualityRating(rating.quality)}
                  disabled={studying || isTransitioning}
                >
                  {studying && !isTransitioning ? (
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
    marginBottom: 4,
  },
  cardTypeText: {
    fontSize: 12,
    fontWeight: "500",
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
    marginBottom: 16,
    lineHeight: 24,
  },
  learningCardsText: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 20,
    fontStyle: "italic",
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
