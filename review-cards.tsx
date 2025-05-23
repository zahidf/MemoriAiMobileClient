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
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const API_BASE_URL = "https://memori-ai.com"; // Replace with your API URL

interface QAPair {
  question: string;
  answer: string;
}

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
        // Fallback: start with empty cards
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

  const createDeck = async () => {
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

    setCreating(true);

    try {
      const response = await fetch(`${API_BASE_URL}/generate-deck`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: deckTitle,
          qa_pairs: qaPairs,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.task_id) {
        pollDeckCreation(data.task_id);
      }
    } catch (error) {
      console.error("Create deck error:", error);
      Alert.alert("Error", "Failed to create deck");
      setCreating(false);
    }
  };

  const pollDeckCreation = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/status/${id}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.status === "completed") {
        setCreating(false);
        Alert.alert(
          "Success!",
          "Your Anki deck has been created successfully.",
          [
            {
              text: "OK",
              onPress: () => router.back(),
            },
          ]
        );
      } else if (data.status === "failed") {
        setCreating(false);
        Alert.alert("Error", data.message || "Failed to create deck");
      } else {
        setTimeout(() => pollDeckCreation(id), 1000);
      }
    } catch (error) {
      setCreating(false);
      Alert.alert("Error", "Failed to check deck creation status");
    }
  };

  const renderCard = (pair: QAPair, index: number) => (
    <View
      key={index}
      style={[styles.cardContainer, { backgroundColor: colors.background }]}
    >
      <View style={styles.cardHeader}>
        <View
          style={[styles.cardNumber, { backgroundColor: colors.tint + "20" }]}
        >
          <ThemedText style={[styles.cardNumberText, { color: colors.tint }]}>
            {index + 1}
          </ThemedText>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteCard(index)}
        >
          <IconSymbol name="trash" size={20} color="#ff4757" />
        </TouchableOpacity>
      </View>

      <View style={styles.cardContent}>
        <View style={styles.inputSection}>
          <ThemedText type="defaultSemiBold" style={styles.inputLabel}>
            Question
          </ThemedText>
          <TextInput
            style={[
              styles.questionInput,
              {
                backgroundColor: colors.background,
                borderColor: colors.text + "30",
                color: colors.text,
              },
            ]}
            placeholder="Enter your question..."
            placeholderTextColor={colors.text + "60"}
            value={pair.question}
            onChangeText={(text) => updateQAPair(index, "question", text)}
            multiline
          />
        </View>

        <View style={styles.inputSection}>
          <ThemedText type="defaultSemiBold" style={styles.inputLabel}>
            Answer
          </ThemedText>
          <TextInput
            style={[
              styles.answerInput,
              {
                backgroundColor: colors.background,
                borderColor: colors.text + "30",
                color: colors.text,
              },
            ]}
            placeholder="Enter your answer..."
            placeholderTextColor={colors.text + "60"}
            value={pair.answer}
            onChangeText={(text) => updateQAPair(index, "answer", text)}
            multiline
          />
        </View>
      </View>
    </View>
  );

  const renderPagination = () => (
    <View style={styles.pagination}>
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
        <ThemedText style={styles.paginationText}>
          {currentIndex + 1} of {qaPairs.length}
        </ThemedText>
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
          <ActivityIndicator size="large" color={colors.tint} />
          <ThemedText style={styles.loadingText}>
            Loading flashcards...
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <IconSymbol name="chevron.left" size={24} color={colors.tint} />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.title}>
          Review Cards
        </ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {qaPairs.length > 0 && renderCard(qaPairs[currentIndex], currentIndex)}

        {renderPagination()}

        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.background }]}
          onPress={addNewCard}
        >
          <IconSymbol name="plus" size={24} color={colors.tint} />
          <ThemedText style={[styles.addButtonText, { color: colors.tint }]}>
            Add New Card
          </ThemedText>
        </TouchableOpacity>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: colors.tint }]}
          onPress={() => setShowTitleModal(true)}
          disabled={creating}
        >
          {creating ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <IconSymbol name="checkmark" size={20} color="white" />
              <Text style={styles.createButtonText}>Create Anki Deck</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Title Modal */}
      <Modal visible={showTitleModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.background },
            ]}
          >
            <ThemedText type="subtitle" style={styles.modalTitle}>
              Deck Title
            </ThemedText>
            <TextInput
              style={[
                styles.titleInput,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.text + "30",
                  color: colors.text,
                },
              ]}
              placeholder="Enter deck title..."
              placeholderTextColor={colors.text + "60"}
              value={deckTitle}
              onChangeText={setDeckTitle}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  { backgroundColor: colors.text + "20" },
                ]}
                onPress={() => setShowTitleModal(false)}
              >
                <ThemedText>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.tint }]}
                onPress={() => {
                  setShowTitleModal(false);
                  createDeck();
                }}
              >
                <Text style={styles.modalButtonText}>Create</Text>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginLeft: 16,
  },
  headerSpacer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
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
  cardContainer: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  cardNumber: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  cardNumberText: {
    fontSize: 14,
    fontWeight: "600",
  },
  deleteButton: {
    padding: 8,
  },
  cardContent: {
    gap: 20,
  },
  inputSection: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 16,
  },
  questionInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: "top",
  },
  answerInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: "top",
  },
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    gap: 16,
  },
  paginationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  disabledButton: {
    opacity: 0.5,
  },
  paginationInfo: {
    paddingHorizontal: 16,
  },
  paginationText: {
    fontSize: 16,
    fontWeight: "500",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#ccc",
    marginBottom: 24,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  footer: {
    padding: 24,
    paddingBottom: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 16,
    gap: 8,
  },
  createButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    margin: 40,
    padding: 24,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 16,
    textAlign: "center",
  },
  titleInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  modalButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
