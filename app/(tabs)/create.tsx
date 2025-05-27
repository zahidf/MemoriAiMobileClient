import { ThemedView } from "@/components/ThemedView";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import * as DocumentPicker from "expo-document-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
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
import YouTubeTranscriptExtractor from "../../components/YoutubeTranscriptExtractor";

const API_BASE_URL = "https://memori-ai.com";

type CreationMethod = "pdf" | "text" | "youtube" | "manual" | null;

const PROGRESS_STAGES = {
  pdf: [
    { stage: "Uploading document...", duration: 2000, progressEnd: 15 },
    { stage: "Processing PDF content...", duration: 3000, progressEnd: 35 },
    { stage: "Extracting text...", duration: 2000, progressEnd: 55 },
    { stage: "Analyzing content with AI...", duration: 4000, progressEnd: 80 },
    { stage: "Generating flashcards...", duration: 3000, progressEnd: 95 },
    { stage: "Finalizing...", duration: 1000, progressEnd: 100 },
  ],
  text: [
    { stage: "Processing your content...", duration: 1500, progressEnd: 20 },
    { stage: "Analyzing text structure...", duration: 2000, progressEnd: 45 },
    {
      stage: "Generating questions with AI...",
      duration: 4000,
      progressEnd: 75,
    },
    { stage: "Creating flashcards...", duration: 2000, progressEnd: 90 },
    { stage: "Finalizing...", duration: 1000, progressEnd: 100 },
  ],
  youtube: [
    { stage: "Processing video content...", duration: 2500, progressEnd: 25 },
    { stage: "Analyzing transcript...", duration: 3000, progressEnd: 50 },
    {
      stage: "Generating questions with AI...",
      duration: 4000,
      progressEnd: 80,
    },
    { stage: "Creating flashcards...", duration: 2500, progressEnd: 95 },
    { stage: "Finalizing...", duration: 1000, progressEnd: 100 },
  ],
};

export default function CreateScreen() {
  const { method, skipSelection } = useLocalSearchParams<{
    method?: string;
    skipSelection?: string;
  }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  const [selectedMethod, setSelectedMethod] = useState<CreationMethod>(
    (method as CreationMethod) || null
  );
  const [showMethodSwitcher, setShowMethodSwitcher] = useState(false);
  const [showYouTubeExtractor, setShowYouTubeExtractor] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [simulatedProgress, setSimulatedProgress] = useState(0);
  const [loadingStage, setLoadingStage] = useState<string>("");
  const [taskId, setTaskId] = useState<string | null>(null);

  const [textInput, setTextInput] = useState("");
  const [numPairs, setNumPairs] = useState("10");
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [extractedTranscript, setExtractedTranscript] = useState("");
  const [videoTitle, setVideoTitle] = useState("");

  const [manualCards, setManualCards] = useState<
    Array<{ question: string; answer: string }>
  >([{ question: "", answer: "" }]);

  const progressIntervalRef = useRef<number | null>(null);

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

  useEffect(() => {
    if (method && skipSelection === "true") {
      setSelectedMethod(method as CreationMethod);
    }
  }, [method, skipSelection]);

  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  const currentMethodConfig = methods.find((m) => m.id === selectedMethod);

  const handleMethodSelection = (methodId: CreationMethod) => {
    if (methodId === "youtube") {
      setShowYouTubeExtractor(true);
    } else {
      setSelectedMethod(methodId);
    }
  };

  const handleTranscriptExtracted = (transcript: string, title: string) => {
    setExtractedTranscript(transcript);
    setVideoTitle(title);
    setShowYouTubeExtractor(false);
    setSelectedMethod("youtube");
    processYouTubeTranscript(transcript, title);
  };

  const processYouTubeTranscript = async (
    transcript: string,
    title: string
  ) => {
    setLoading(true);
    setProgress(0);
    setSimulatedProgress(0);
    setLoadingStage("Processing transcript...");

    try {
      startProgressSimulation("youtube");

      const response = await fetch(`${API_BASE_URL}/process/text`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: transcript,
          num_pairs: parseInt(numPairs),
          source_title: title,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.task_id) {
        setTaskId(data.task_id);
        pollStatus(data.task_id);
      } else {
        setLoading(false);
        Alert.alert("Error", "No task ID received from server");
      }
    } catch (error) {
      console.error("YouTube processing error:", error);
      Alert.alert("Error", "Failed to process YouTube transcript");
      setLoading(false);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    }
  };

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

  const startProgressSimulation = (method: "pdf" | "text" | "youtube") => {
    const stages = PROGRESS_STAGES[method];
    let currentStageIndex = 0;
    let stageStartTime = Date.now();
    let stageStartProgress = 0;

    const updateProgress = () => {
      if (currentStageIndex >= stages.length) {
        setSimulatedProgress(100);
        setLoadingStage("Completing...");
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }
        return;
      }

      const currentStage = stages[currentStageIndex];
      const elapsed = Date.now() - stageStartTime;
      const stageProgress = Math.min(elapsed / currentStage.duration, 1);

      const progressRange = currentStage.progressEnd - stageStartProgress;
      const newProgress = stageStartProgress + progressRange * stageProgress;

      setSimulatedProgress(Math.min(newProgress, 95));
      setLoadingStage(currentStage.stage);

      if (
        elapsed >= currentStage.duration &&
        currentStageIndex < stages.length - 1
      ) {
        currentStageIndex++;
        stageStartTime = Date.now();
        stageStartProgress = currentStage.progressEnd;
      }
    };

    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    progressIntervalRef.current = setInterval(updateProgress, 100);
    updateProgress();
  };

  const handleSubmit = async () => {
    if (!selectedMethod) return;

    setLoading(true);
    setProgress(0);
    setSimulatedProgress(0);
    setLoadingStage("Initializing...");

    try {
      let response;

      if (selectedMethod !== "manual") {
        startProgressSimulation(selectedMethod as "pdf" | "text" | "youtube");
      }

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
          if (!extractedTranscript.trim()) {
            Alert.alert("Error", "No transcript available");
            setLoading(false);
            return;
          }
          return;
        case "manual":
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
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
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

      if (data.progress !== undefined && data.progress > simulatedProgress) {
        setProgress(data.progress);
        setSimulatedProgress(data.progress);
      } else {
        setProgress(simulatedProgress);
      }

      if (data.status === "completed") {
        setSimulatedProgress(100);
        setProgress(100);
        setLoadingStage("Complete!");

        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }

        setTimeout(() => {
          setLoading(false);
          router.push(`/review-cards?taskId=${id}&method=${selectedMethod}`);
        }, 500);
      } else if (data.status === "failed") {
        setLoading(false);
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }
        Alert.alert("Error", data.message || "Processing failed");
      } else {
        setTimeout(() => pollStatus(id), 1000);
      }
    } catch (error) {
      console.error("Poll status error:", error);
      setLoading(false);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      Alert.alert("Error", "Failed to check status");
    }
  };

  const renderMethodSwitcher = () => (
    <Modal visible={showMethodSwitcher} transparent animationType="fade">
      <View style={styles.methodSwitcherOverlay}>
        <View
          style={[
            styles.methodSwitcherContent,
            { backgroundColor: colors.background },
          ]}
        >
          <View style={styles.methodSwitcherHeader}>
            <Text style={[styles.methodSwitcherTitle, { color: colors.text }]}>
              Choose Method
            </Text>
            <TouchableOpacity
              style={styles.methodSwitcherClose}
              onPress={() => setShowMethodSwitcher(false)}
            >
              <IconSymbol name="chevron.left" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.methodSwitcherScroll}>
            {methods.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.methodSwitcherOption,
                  selectedMethod === method.id && {
                    backgroundColor: colors.tint + "10",
                    borderColor: colors.tint,
                  },
                ]}
                onPress={() => {
                  setSelectedMethod(method.id);
                  setShowMethodSwitcher(false);
                }}
              >
                <LinearGradient
                  colors={method.gradient}
                  style={styles.methodSwitcherIcon}
                >
                  <IconSymbol
                    name={method.icon as any}
                    size={20}
                    color="white"
                  />
                </LinearGradient>
                <View style={styles.methodSwitcherTextContent}>
                  <Text
                    style={[
                      styles.methodSwitcherOptionTitle,
                      { color: colors.text },
                    ]}
                  >
                    {method.title}
                  </Text>
                  <Text
                    style={[
                      styles.methodSwitcherOptionDescription,
                      { color: colors.text + "70" },
                    ]}
                  >
                    {method.description}
                  </Text>
                </View>
                {selectedMethod === method.id && (
                  <IconSymbol name="checkmark" size={20} color={colors.tint} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderForm = () => {
    if (!selectedMethod || !currentMethodConfig) return null;

    return (
      <View
        style={[styles.formSection, { backgroundColor: colors.background }]}
      >
        <LinearGradient
          colors={currentMethodConfig.gradient}
          style={styles.formHeader}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.formHeaderContent}>
            <View style={styles.formHeaderIcon}>
              <IconSymbol
                name={currentMethodConfig.icon as any}
                size={24}
                color="white"
              />
            </View>
            <View style={styles.formHeaderText}>
              <Text style={styles.formHeaderTitle}>
                {currentMethodConfig.title}
              </Text>
              <Text style={styles.formHeaderSubtitle}>
                {currentMethodConfig.description}
              </Text>
            </View>
          </View>
        </LinearGradient>

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
                  Video Content
                </Text>
                <View
                  style={[
                    styles.youtubePreview,
                    {
                      backgroundColor: colors.tint + "10",
                      borderColor: colors.tint + "30",
                    },
                  ]}
                >
                  <IconSymbol name="play.fill" size={24} color={colors.tint} />
                  <View style={styles.youtubePreviewText}>
                    <Text
                      style={[styles.youtubeTitle, { color: colors.text }]}
                      numberOfLines={2}
                    >
                      {videoTitle || "YouTube Video Transcript"}
                    </Text>
                    <Text
                      style={[
                        styles.youtubeDetails,
                        { color: colors.text + "70" },
                      ]}
                    >
                      {extractedTranscript.length} characters extracted
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.youtubeChangeButton}
                    onPress={() => setShowYouTubeExtractor(true)}
                  >
                    <Text
                      style={[styles.youtubeChangeText, { color: colors.tint }]}
                    >
                      Change
                    </Text>
                  </TouchableOpacity>
                </View>
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

  const shouldShowMethodSelection = !selectedMethod;

  return (
    <ThemedView style={styles.container}>
      <LinearGradient
        colors={
          selectedMethod && currentMethodConfig
            ? currentMethodConfig.gradient
            : colorScheme === "dark"
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
            <Text style={styles.title}>
              {selectedMethod && currentMethodConfig
                ? currentMethodConfig.title
                : "Create New Deck"}
            </Text>
            {selectedMethod && currentMethodConfig ? (
              <TouchableOpacity
                style={styles.changeMethodButton}
                onPress={() => setShowMethodSwitcher(true)}
              >
                <IconSymbol name="chevron.right" size={12} color="white" />
                <Text style={styles.changeMethodText}>Change Method</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.subtitle}>
                Transform any content into smart flashcards
              </Text>
            )}
          </View>

          <View style={styles.headerSpacer} />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {shouldShowMethodSelection ? (
          <View style={styles.methodSelection}>
            <View style={styles.selectionHeader}>
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

            <View style={styles.methodsGrid}>
              {methods.map((method) => (
                <TouchableOpacity
                  key={method.id}
                  style={styles.methodCard}
                  onPress={() => handleMethodSelection(method.id)}
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

                    {method.id !== "manual" && (
                      <View style={styles.aiBadge}>
                        <Text style={styles.aiBadgeText}>AI</Text>
                      </View>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          renderForm()
        )}
      </ScrollView>

      {renderMethodSwitcher()}

      {showYouTubeExtractor && (
        <Modal visible={showYouTubeExtractor} animationType="slide">
          <YouTubeTranscriptExtractor
            onTranscriptExtracted={handleTranscriptExtracted}
            onCancel={() => setShowYouTubeExtractor(false)}
          />
        </Modal>
      )}

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
            <Text style={[styles.loadingStage, { color: colors.text + "90" }]}>
              {loadingStage}
            </Text>
            <Text style={[styles.loadingText, { color: colors.text + "70" }]}>
              {Math.round(simulatedProgress)}% complete
            </Text>
            <View style={styles.progressContainer}>
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
                      width: `${simulatedProgress}%`,
                    },
                  ]}
                />
              </View>
            </View>

            {simulatedProgress > 10 && simulatedProgress < 95 && (
              <Text
                style={[styles.estimatedTime, { color: colors.text + "50" }]}
              >
                This usually takes 30-60 seconds
              </Text>
            )}
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
  changeMethodButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  changeMethodText: {
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
  methodSelection: {
    padding: 24,
  },
  selectionHeader: {
    alignItems: "center",
    marginBottom: 32,
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
  methodsGrid: {
    gap: 16,
  },
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
  },
  methodContent: {
    flex: 1,
  },
  methodTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
    marginBottom: 4,
  },
  methodDescription: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.85)",
    lineHeight: 18,
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
  methodSwitcherOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  methodSwitcherContent: {
    margin: 20,
    borderRadius: 20,
    maxHeight: "80%",
    width: "90%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  methodSwitcherHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.1)",
  },
  methodSwitcherTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  methodSwitcherClose: {
    padding: 4,
  },
  methodSwitcherScroll: {
    maxHeight: 400,
  },
  methodSwitcherOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderWidth: 1,
    borderColor: "transparent",
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 4,
  },
  methodSwitcherIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  methodSwitcherTextContent: {
    flex: 1,
  },
  methodSwitcherOptionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  methodSwitcherOptionDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  formSection: {
    margin: 24,
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
  numberInput: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    width: 100,
    textAlign: "center",
  },
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
  youtubePreview: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 12,
  },
  youtubePreviewText: {
    flex: 1,
  },
  youtubeTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  youtubeDetails: {
    fontSize: 12,
  },
  youtubeChangeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  youtubeChangeText: {
    fontSize: 14,
    fontWeight: "500",
  },
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
  loadingStage: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 8,
    fontWeight: "500",
    minHeight: 20,
  },
  loadingText: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  progressContainer: {
    width: 240,
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
  estimatedTime: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
    fontStyle: "italic",
  },
});
