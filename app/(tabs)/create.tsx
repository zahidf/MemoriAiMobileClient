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

    const selectedMethodConfig = methods.find((m) => m.id === selectedMethod);

    return (
      <View
        style={[styles.formSection, { backgroundColor: colors.background }]}
      >
        {/* Form Header */}
        <LinearGradient
          colors={selectedMethodConfig?.gradient || ["#667eea", "#764ba2"]}
          style={styles.formHeader}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.formHeaderContent}>
            <View style={styles.formHeaderIcon}>
              <IconSymbol
                name={selectedMethodConfig?.icon as any}
                size={24}
                color="white"
              />
            </View>
            <View style={styles.formHeaderText}>
              <Text style={styles.formHeaderTitle}>
                {selectedMethodConfig?.title}
              </Text>
              <Text style={styles.formHeaderSubtitle}>
                {selectedMethodConfig?.description}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Form Content */}
        <View style={styles.formContent}>
          {selectedMethod === "pdf" && (
            <>
              <TouchableOpacity
                style={[
                  styles.filePickerButton,
                  {
                    borderColor: selectedFile
                      ? colors.tint
                      : colors.text + "30",
                    backgroundColor: selectedFile
                      ? colors.tint + "10"
                      : "transparent",
                  },
                ]}
                onPress={pickDocument}
              >
                <View style={styles.filePickerContent}>
                  <IconSymbol
                    name="doc.fill"
                    size={24}
                    color={selectedFile ? colors.tint : colors.text + "60"}
                  />
                  <View style={styles.filePickerTextContainer}>
                    <Text
                      style={[
                        styles.filePickerText,
                        {
                          color: selectedFile
                            ? colors.tint
                            : colors.text + "60",
                        },
                      ]}
                    >
                      {selectedFile ? selectedFile.name : "Choose PDF File"}
                    </Text>
                    {selectedFile && (
                      <Text
                        style={[
                          styles.filePickerHint,
                          { color: colors.text + "50" },
                        ]}
                      >
                        Tap to change file
                      </Text>
                    )}
                  </View>
                  <IconSymbol
                    name="chevron.right"
                    size={16}
                    color={colors.text + "40"}
                  />
                </View>
              </TouchableOpacity>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>
                  Number of Cards
                </Text>
                <TextInput
                  style={[
                    styles.numberInput,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.text + "20",
                      color: colors.text,
                    },
                  ]}
                  placeholder="10"
                  placeholderTextColor={colors.text + "40"}
                  value={numPairs}
                  onChangeText={setNumPairs}
                  keyboardType="numeric"
                />
              </View>
            </>
          )}

          {selectedMethod === "text" && (
            <>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>
                  Your Content
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.text + "20",
                      color: colors.text,
                    },
                  ]}
                  placeholder="Paste your text content here..."
                  placeholderTextColor={colors.text + "40"}
                  value={textInput}
                  onChangeText={setTextInput}
                  multiline
                  numberOfLines={8}
                />
                <Text style={[styles.inputHint, { color: colors.text + "50" }]}>
                  Copy and paste any text content - articles, notes, study
                  materials
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>
                  Number of Cards
                </Text>
                <TextInput
                  style={[
                    styles.numberInput,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.text + "20",
                      color: colors.text,
                    },
                  ]}
                  placeholder="10"
                  placeholderTextColor={colors.text + "40"}
                  value={numPairs}
                  onChangeText={setNumPairs}
                  keyboardType="numeric"
                />
              </View>
            </>
          )}

          {selectedMethod === "youtube" && (
            <>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>
                  YouTube Video URL
                </Text>
                <TextInput
                  style={[
                    styles.urlInput,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.text + "20",
                      color: colors.text,
                    },
                  ]}
                  placeholder="https://www.youtube.com/watch?v=..."
                  placeholderTextColor={colors.text + "40"}
                  value={youtubeUrl}
                  onChangeText={setYoutubeUrl}
                  keyboardType="url"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Text style={[styles.inputHint, { color: colors.text + "50" }]}>
                  Enter any YouTube video URL to generate cards from its content
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>
                  Number of Cards
                </Text>
                <TextInput
                  style={[
                    styles.numberInput,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.text + "20",
                      color: colors.text,
                    },
                  ]}
                  placeholder="10"
                  placeholderTextColor={colors.text + "40"}
                  value={numPairs}
                  onChangeText={setNumPairs}
                  keyboardType="numeric"
                />
              </View>
            </>
          )}

          {selectedMethod === "manual" && (
            <View style={styles.manualCardsContainer}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>
                Create Your Flashcards
              </Text>
              <Text
                style={[
                  styles.inputHint,
                  { color: colors.text + "60", marginBottom: 20 },
                ]}
              >
                Add question and answer pairs manually
              </Text>

              {manualCards.map((card, index) => (
                <View
                  key={index}
                  style={[
                    styles.manualCardItem,
                    { backgroundColor: colors.background },
                  ]}
                >
                  <View style={styles.manualCardHeader}>
                    <View
                      style={[
                        styles.cardBadge,
                        { backgroundColor: colors.tint + "15" },
                      ]}
                    >
                      <Text
                        style={[styles.cardBadgeText, { color: colors.tint }]}
                      >
                        Card {index + 1}
                      </Text>
                    </View>
                    {manualCards.length > 1 && (
                      <TouchableOpacity
                        onPress={() => removeManualCard(index)}
                        style={styles.removeCardButton}
                      >
                        <IconSymbol name="trash" size={16} color="#ff4757" />
                      </TouchableOpacity>
                    )}
                  </View>

                  <TextInput
                    style={[
                      styles.questionInput,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.text + "20",
                        color: colors.text,
                      },
                    ]}
                    placeholder="Enter your question..."
                    placeholderTextColor={colors.text + "40"}
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
                        borderColor: colors.text + "20",
                        color: colors.text,
                      },
                    ]}
                    placeholder="Enter the answer..."
                    placeholderTextColor={colors.text + "40"}
                    value={card.answer}
                    onChangeText={(text) =>
                      updateManualCard(index, "answer", text)
                    }
                    multiline
                  />
                </View>
              ))}

              <TouchableOpacity
                style={[
                  styles.addCardButton,
                  { borderColor: colors.tint + "40" },
                ]}
                onPress={addManualCard}
              >
                <IconSymbol name="plus" size={20} color={colors.tint} />
                <Text style={[styles.addCardText, { color: colors.tint }]}>
                  Add Another Card
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: colors.tint }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <IconSymbol
                  name={selectedMethod === "manual" ? "checkmark" : "plus"}
                  size={20}
                  color="white"
                />
                <Text style={styles.submitButtonText}>
                  {selectedMethod === "manual"
                    ? "Review Cards"
                    : "Generate Flashcards"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

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
            <Text style={styles.title}>Create New Deck</Text>
            <Text style={styles.subtitle}>
              Transform any content into smart flashcards
            </Text>
          </View>

          <View style={styles.headerSpacer} />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {!selectedMethod ? (
          // Method Selection
          <View style={styles.methodSelection}>
            <View style={styles.selectionHeader}>
              <View style={styles.selectionSteps}>
                <View
                  style={[
                    styles.step,
                    styles.activeStep,
                    { backgroundColor: colors.tint },
                  ]}
                >
                  <Text style={styles.stepText}>1</Text>
                </View>
                <View
                  style={[
                    styles.stepLine,
                    { backgroundColor: colors.text + "20" },
                  ]}
                />
                <View
                  style={[styles.step, { backgroundColor: colors.text + "20" }]}
                >
                  <Text
                    style={[styles.stepText, { color: colors.text + "40" }]}
                  >
                    2
                  </Text>
                </View>
              </View>
              <Text style={[styles.selectionTitle, { color: colors.text }]}>
                Choose Creation Method
              </Text>
              <Text
                style={[
                  styles.selectionSubtitle,
                  { color: colors.text + "70" },
                ]}
              >
                Select how you'd like to create your flashcards
              </Text>
            </View>

            {/* AI Section Header */}
            <View style={styles.aiSectionHeader}>
              <View style={styles.aiHeaderContainer}>
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
                <Text style={[styles.aiTitle, { color: colors.text }]}>
                  AI-Powered Generation
                </Text>
                <Text
                  style={[styles.aiSubtitle, { color: colors.text + "70" }]}
                >
                  Let AI analyze your content and create perfect flashcards
                </Text>
              </View>
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
                    <TouchableOpacity
                      key={method.id}
                      style={styles.methodCard}
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
                    style={[
                      styles.separatorText,
                      { color: colors.text + "60" },
                    ]}
                  >
                    or create manually
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
                      style={styles.manualCard}
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
                      </View>
                    </TouchableOpacity>
                  ))}
              </View>
            </View>
          </View>
        ) : (
          // Form Display
          <View style={styles.formContainer}>
            <View style={styles.formSteps}>
              <View style={[styles.step, { backgroundColor: colors.tint }]}>
                <Text style={styles.stepText}>1</Text>
              </View>
              <View
                style={[
                  styles.stepLine,
                  styles.stepLineActive,
                  { backgroundColor: colors.tint },
                ]}
              />
              <View
                style={[
                  styles.step,
                  styles.activeStep,
                  { backgroundColor: colors.tint },
                ]}
              >
                <Text style={styles.stepText}>2</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.changeMethodButton}
              onPress={() => setSelectedMethod(null)}
            >
              <IconSymbol name="chevron.left" size={16} color={colors.tint} />
              <Text style={[styles.changeMethodText, { color: colors.tint }]}>
                Change Method
              </Text>
            </TouchableOpacity>

            {renderForm()}
          </View>
        )}
      </ScrollView>

      {/* Loading Modal */}
      <Modal visible={loading} transparent>
        <View style={styles.loadingOverlay}>
          <View
            style={[styles.loadingCard, { backgroundColor: colors.background }]}
          >
            <View style={styles.loadingIconContainer}>
              <ActivityIndicator size="large" color={colors.tint} />
              <View
                style={[
                  styles.loadingPulse,
                  { borderColor: colors.tint + "30" },
                ]}
              />
            </View>
            <Text style={[styles.loadingTitle, { color: colors.text }]}>
              Generating Flashcards
            </Text>
            <Text style={[styles.loadingText, { color: colors.text + "70" }]}>
              AI is analyzing your content... {Math.round(progress * 100)}%
            </Text>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // Method Selection Styles
  methodSelection: {
    padding: 24,
  },
  selectionHeader: {
    alignItems: "center",
    marginBottom: 32,
  },
  selectionSteps: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  step: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  activeStep: {
    shadowColor: "#667eea",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  stepText: {
    fontSize: 14,
    fontWeight: "600",
    color: "white",
  },
  stepLine: {
    width: 40,
    height: 2,
    marginHorizontal: 8,
  },
  stepLineActive: {
    shadowColor: "#667eea",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 1,
  },
  selectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  selectionSubtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
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
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  aiSubtitle: {
    fontSize: 14,
    lineHeight: 20,
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

  // Form Container Styles
  formContainer: {
    padding: 24,
  },
  formSteps: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  changeMethodButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 24,
  },
  changeMethodText: {
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 4,
  },

  // Form Section Styles
  formSection: {
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  formHeader: {
    padding: 24,
  },
  formHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  formHeaderIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  formHeaderText: {
    flex: 1,
  },
  formHeaderTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "white",
    marginBottom: 4,
  },
  formHeaderSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    lineHeight: 18,
  },
  formContent: {
    padding: 24,
    gap: 24,
  },

  // Input Styles
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  inputHint: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  textInput: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    textAlignVertical: "top",
    minHeight: 120,
    lineHeight: 22,
  },
  urlInput: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 50,
  },
  numberInput: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    width: 100,
    textAlign: "center",
  },

  // File Picker Styles
  filePickerButton: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 20,
  },
  filePickerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  filePickerTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  filePickerText: {
    fontSize: 16,
    fontWeight: "500",
  },
  filePickerHint: {
    fontSize: 12,
    marginTop: 2,
  },

  // Manual Cards Styles
  manualCardsContainer: {
    gap: 16,
  },
  manualCardItem: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "rgba(107, 114, 128, 0.2)",
    gap: 12,
  },
  manualCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  cardBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  removeCardButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255, 71, 87, 0.1)",
  },
  questionInput: {
    borderWidth: 1.5,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    minHeight: 60,
    textAlignVertical: "top",
  },
  answerInput: {
    borderWidth: 1.5,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: "top",
  },
  addCardButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: 12,
    gap: 8,
  },
  addCardText: {
    fontSize: 16,
    fontWeight: "500",
  },

  // Submit Button
  submitButton: {
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
  submitButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },

  // Loading Modal Styles
  loadingOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingCard: {
    margin: 40,
    padding: 32,
    borderRadius: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
    minWidth: 280,
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
    marginBottom: 20,
    lineHeight: 20,
  },
  progressBar: {
    width: 200,
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
});
