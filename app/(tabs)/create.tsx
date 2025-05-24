import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import * as DocumentPicker from "expo-document-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
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

// API Configuration
const API_BASE_URL = "https://memori-ai.com";

type CreationMethod = "pdf" | "text" | "youtube" | "manual" | null;

export default function CreateScreen() {
  const { method } = useLocalSearchParams<{ method?: string }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  const [selectedMethod, setSelectedMethod] = useState<CreationMethod>(
    (method as CreationMethod) || null
  );
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [taskId, setTaskId] = useState<string | null>(null);

  // Form states
  const [textInput, setTextInput] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [numPairs, setNumPairs] = useState("10");
  const [selectedFile, setSelectedFile] = useState<any>(null);

  // Manual entry states
  const [manualCards, setManualCards] = useState<
    Array<{ question: string; answer: string }>
  >([{ question: "", answer: "" }]);

  const methods = [
    {
      id: "pdf" as const,
      title: "PDF Upload",
      description: "Generate flashcards from documents",
      icon: "doc.fill",
      gradient: ["#667eea", "#764ba2"] as const,
    },
    {
      id: "text" as const,
      title: "Text Input",
      description: "Create from your own content",
      icon: "text.alignleft",
      gradient: ["#f093fb", "#f5576c"] as const,
    },
    {
      id: "youtube" as const,
      title: "YouTube Video",
      description: "Learn from video content",
      icon: "play.fill",
      gradient: ["#4facfe", "#00f2fe"] as const,
    },
    {
      id: "manual" as const,
      title: "Manual Entry",
      description: "Custom question-answer pairs",
      icon: "pencil",
      gradient: ["#43e97b", "#38f9d7"] as const,
    },
  ];

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedFile(result.assets[0]);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick document");
    }
  };

  const handleSubmit = async () => {
    if (!selectedMethod) return;

    setLoading(true);

    try {
      let response;

      switch (selectedMethod) {
        case "pdf":
          if (!selectedFile) {
            Alert.alert("Error", "Please select a PDF file");
            setLoading(false);
            return;
          }
          response = await uploadPDF();
          break;
        case "text":
          if (!textInput.trim()) {
            Alert.alert("Error", "Please enter some text");
            setLoading(false);
            return;
          }
          response = await processText();
          break;
        case "youtube":
          if (!youtubeUrl.trim()) {
            Alert.alert("Error", "Please enter a YouTube URL");
            setLoading(false);
            return;
          }
          response = await processYoutube();
          break;
        case "manual":
          // For manual method, go directly to review-cards
          const validCards = manualCards.filter(
            (card) => card.question.trim() && card.answer.trim()
          );
          if (validCards.length === 0) {
            Alert.alert(
              "Error",
              "Please add at least one complete question-answer pair"
            );
            setLoading(false);
            return;
          }
          setLoading(false);
          router.push({
            pathname: "../review-cards",
            params: { method: "manual", cards: JSON.stringify(validCards) },
          });
          return;
      }

      if (response?.task_id) {
        setTaskId(response.task_id);
        pollStatus(response.task_id);
      } else {
        setLoading(false);
        Alert.alert("Error", "No task ID received from server");
      }
    } catch (error) {
      console.error("Submit error:", error);
      Alert.alert("Error", "Failed to process request");
      setLoading(false);
    }
  };

  const uploadPDF = async () => {
    const formData = new FormData();
    formData.append("file", {
      uri: selectedFile.uri,
      type: "application/pdf",
      name: selectedFile.name,
    } as any);

    const response = await fetch(
      `${API_BASE_URL}/upload/pdf?num_pairs=${numPairs}`,
      {
        method: "POST",
        body: formData,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  };

  const processText = async () => {
    const response = await fetch(`${API_BASE_URL}/process/text`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: textInput,
        num_pairs: parseInt(numPairs),
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  };

  const processYoutube = async () => {
    const response = await fetch(`${API_BASE_URL}/process/youtube`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: youtubeUrl,
        num_pairs: parseInt(numPairs),
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  };

  const addManualCard = () => {
    setManualCards([...manualCards, { question: "", answer: "" }]);
  };

  const updateManualCard = (
    index: number,
    field: "question" | "answer",
    value: string
  ) => {
    const updated = [...manualCards];
    updated[index] = { ...updated[index], [field]: value };
    setManualCards(updated);
  };

  const removeManualCard = (index: number) => {
    if (manualCards.length > 1) {
      setManualCards(manualCards.filter((_, i) => i !== index));
    }
  };

  const pollStatus = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/status/${id}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setProgress(data.progress || 0);

      if (data.status === "completed") {
        setLoading(false);
        // Navigate to review-cards instead of direct success
        router.push(`/review-cards?taskId=${id}&method=${selectedMethod}`);
      } else if (data.status === "failed") {
        setLoading(false);
        Alert.alert("Error", data.message || "Processing failed");
      } else {
        setTimeout(() => pollStatus(id), 1000);
      }
    } catch (error) {
      console.error("Poll status error:", error);
      setLoading(false);
      Alert.alert("Error", "Failed to check status");
    }
  };

  const renderForm = () => {
    if (!selectedMethod) return null;

    return (
      <View style={[styles.formCard, { backgroundColor: colors.background }]}>
        {selectedMethod === "pdf" && (
          <>
            <TouchableOpacity
              style={[styles.filePickerButton, { borderColor: colors.tint }]}
              onPress={pickDocument}
            >
              <IconSymbol name="doc.fill" size={24} color={colors.tint} />
              <ThemedText
                style={[styles.filePickerText, { color: colors.tint }]}
              >
                {selectedFile ? selectedFile.name : "Select PDF File"}
              </ThemedText>
            </TouchableOpacity>

            <View style={styles.inputContainer}>
              <ThemedText type="defaultSemiBold" style={styles.inputLabel}>
                Number of Cards
              </ThemedText>
              <TextInput
                style={[
                  styles.numberInput,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.text + "30",
                    color: colors.text,
                  },
                ]}
                placeholder="10"
                value={numPairs}
                onChangeText={setNumPairs}
                keyboardType="numeric"
              />
            </View>
          </>
        )}

        {selectedMethod === "text" && (
          <>
            <View style={styles.inputContainer}>
              <ThemedText type="defaultSemiBold" style={styles.inputLabel}>
                Enter Your Text
              </ThemedText>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.text + "30",
                    color: colors.text,
                  },
                ]}
                placeholder="Paste your text here..."
                placeholderTextColor={colors.text + "60"}
                value={textInput}
                onChangeText={setTextInput}
                multiline
                numberOfLines={6}
              />
            </View>

            <View style={styles.inputContainer}>
              <ThemedText type="defaultSemiBold" style={styles.inputLabel}>
                Number of Cards
              </ThemedText>
              <TextInput
                style={[
                  styles.numberInput,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.text + "30",
                    color: colors.text,
                  },
                ]}
                placeholder="10"
                value={numPairs}
                onChangeText={setNumPairs}
                keyboardType="numeric"
              />
            </View>
          </>
        )}

        {selectedMethod === "youtube" && (
          <>
            <View style={styles.inputContainer}>
              <ThemedText type="defaultSemiBold" style={styles.inputLabel}>
                YouTube Video URL
              </ThemedText>
              <TextInput
                style={[
                  styles.urlInput,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.text + "30",
                    color: colors.text,
                  },
                ]}
                placeholder="https://www.youtube.com/watch?v=..."
                placeholderTextColor={colors.text + "60"}
                value={youtubeUrl}
                onChangeText={setYoutubeUrl}
                keyboardType="url"
              />
            </View>

            <View style={styles.inputContainer}>
              <ThemedText type="defaultSemiBold" style={styles.inputLabel}>
                Number of Cards
              </ThemedText>
              <TextInput
                style={[
                  styles.numberInput,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.text + "30",
                    color: colors.text,
                  },
                ]}
                placeholder="10"
                value={numPairs}
                onChangeText={setNumPairs}
                keyboardType="numeric"
              />
            </View>
          </>
        )}

        {selectedMethod === "manual" && (
          <View style={styles.inputContainer}>
            <ThemedText type="defaultSemiBold" style={styles.inputLabel}>
              Create Your Flashcards
            </ThemedText>
            {manualCards.map((card, index) => (
              <View key={index} style={styles.manualCardContainer}>
                <View style={styles.cardHeader}>
                  <ThemedText style={styles.cardNumber}>
                    Card #{index + 1}
                  </ThemedText>
                  {manualCards.length > 1 && (
                    <TouchableOpacity onPress={() => removeManualCard(index)}>
                      <IconSymbol name="trash" size={16} color="#ff4757" />
                    </TouchableOpacity>
                  )}
                </View>
                <TextInput
                  style={[
                    styles.questionInput,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.text + "30",
                      color: colors.text,
                    },
                  ]}
                  placeholder="Enter question..."
                  placeholderTextColor={colors.text + "60"}
                  value={card.question}
                  onChangeText={(text) =>
                    updateManualCard(index, "question", text)
                  }
                  multiline
                />
                <TextInput
                  style={[
                    styles.answerInput,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.text + "30",
                      color: colors.text,
                    },
                  ]}
                  placeholder="Enter answer..."
                  placeholderTextColor={colors.text + "60"}
                  value={card.answer}
                  onChangeText={(text) =>
                    updateManualCard(index, "answer", text)
                  }
                  multiline
                />
              </View>
            ))}
            <TouchableOpacity
              style={[styles.addCardButton, { borderColor: colors.tint }]}
              onPress={addManualCard}
            >
              <IconSymbol name="plus" size={20} color={colors.tint} />
              <ThemedText style={[styles.addCardText, { color: colors.tint }]}>
                Add Another Card
              </ThemedText>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: colors.tint }]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.submitButtonText}>
              {selectedMethod === "manual"
                ? "Review Cards"
                : "Generate Flashcards"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            Create Deck
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: colors.text + "80" }]}>
            Choose how you want to create your flashcards
          </ThemedText>
        </View>

        {/* AI Section Header - Matching Home Screen */}
        <View style={styles.methodsContainer}>
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
                Create New Deck with AI
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
                .map((method) => (
                  <View key={method.id}>
                    <TouchableOpacity
                      style={[
                        styles.methodCard,
                        selectedMethod === method.id &&
                          styles.selectedMethodCard,
                      ]}
                      onPress={() => setSelectedMethod(method.id)}
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

                        {/* Selection Indicator */}
                        {selectedMethod === method.id && (
                          <View style={styles.selectedIndicator}>
                            <IconSymbol
                              name="checkmark.circle.fill"
                              size={24}
                              color="white"
                            />
                          </View>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>

                    {/* Form appears directly below selected method */}
                    {selectedMethod === method.id && renderForm()}
                  </View>
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
                  <View key={method.id}>
                    <TouchableOpacity
                      style={[
                        styles.manualCard,
                        selectedMethod === method.id &&
                          styles.selectedManualCard,
                      ]}
                      onPress={() => setSelectedMethod(method.id)}
                      activeOpacity={0.8}
                    >
                      <View
                        style={[
                          styles.manualContent,
                          { backgroundColor: colors.background },
                        ]}
                      >
                        {/* Paper lines effect */}
                        <View style={styles.paperLinesContainer}>
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

                        {/* Selection Indicator */}
                        {selectedMethod === method.id && (
                          <View style={styles.selectedIndicatorManual}>
                            <IconSymbol
                              name="checkmark.circle.fill"
                              size={20}
                              color={colors.tint}
                            />
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>

                    {/* Form appears directly below manual method */}
                    {selectedMethod === method.id && renderForm()}
                  </View>
                ))}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Loading Modal */}
      <Modal visible={loading} transparent>
        <View style={styles.loadingOverlay}>
          <View
            style={[styles.loadingCard, { backgroundColor: colors.background }]}
          >
            <ActivityIndicator size="large" color={colors.tint} />
            <ThemedText style={styles.loadingText}>
              Processing... {Math.round(progress * 100)}%
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
                  { backgroundColor: colors.tint, width: `${progress * 100}%` },
                ]}
              />
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
  methodsContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },

  // AI Section Header styles (matching home screen)
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

  // Method cards (matching home screen)
  methodCard: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  selectedMethodCard: {
    transform: [{ scale: 1.02 }],
    shadowOpacity: 0.3,
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
  selectedIndicator: {
    position: "absolute",
    top: 12,
    left: 12,
  },

  // Manual card styles (matching home screen)
  manualCard: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "rgba(107, 114, 128, 0.2)",
  },
  selectedManualCard: {
    borderColor: "rgba(102, 126, 234, 0.4)",
    shadowOpacity: 0.15,
  },
  manualContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    position: "relative",
    minHeight: 80,
  },
  paperLinesContainer: {
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
  selectedIndicatorManual: {
    position: "absolute",
    top: 8,
    left: 8,
  },

  // Form styles
  formCard: {
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(102, 126, 234, 0.15)",
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    textAlignVertical: "top",
    minHeight: 120,
  },
  urlInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  numberInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    width: 100,
  },
  filePickerButton: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    marginBottom: 20,
  },
  filePickerText: {
    fontSize: 16,
    marginTop: 8,
    fontWeight: "500",
  },
  submitButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 20,
  },
  submitButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  loadingOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingCard: {
    margin: 40,
    padding: 32,
    borderRadius: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
    marginBottom: 16,
    textAlign: "center",
  },
  progressBar: {
    width: 200,
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  manualCardContainer: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cardNumber: {
    fontSize: 14,
    fontWeight: "600",
  },
  questionInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 8,
    minHeight: 60,
    textAlignVertical: "top",
  },
  answerInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: "top",
  },
  addCardButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 8,
    marginTop: 8,
  },
  addCardText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "500",
  },
});
