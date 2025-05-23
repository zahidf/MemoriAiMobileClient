import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import React, { useState } from "react";
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface HistoryItem {
  id: string;
  title: string;
  method: "pdf" | "text" | "youtube" | "manual";
  cardCount: number;
  createdAt: string;
  status: "completed" | "processing" | "failed";
}

// Mock data - replace with actual API calls
const mockHistory: HistoryItem[] = [
  {
    id: "1",
    title: "Biology Chapter 3",
    method: "pdf",
    cardCount: 15,
    createdAt: "2 hours ago",
    status: "completed",
  },
  {
    id: "2",
    title: "Physics Lecture Notes",
    method: "text",
    cardCount: 22,
    createdAt: "Yesterday",
    status: "completed",
  },
  {
    id: "3",
    title: "Khan Academy: Calculus",
    method: "youtube",
    cardCount: 18,
    createdAt: "2 days ago",
    status: "completed",
  },
  {
    id: "4",
    title: "Spanish Vocabulary",
    method: "manual",
    cardCount: 30,
    createdAt: "3 days ago",
    status: "completed",
  },
  {
    id: "5",
    title: "Chemistry Formulas",
    method: "pdf",
    cardCount: 0,
    createdAt: "1 week ago",
    status: "processing",
  },
];

export default function HistoryScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const [history, setHistory] = useState<HistoryItem[]>(mockHistory);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // Simulate API call
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const getMethodIcon = (method: string) => {
    switch (method) {
      case "pdf":
        return "doc.fill";
      case "text":
        return "text.alignleft";
      case "youtube":
        return "play.fill";
      case "manual":
        return "pencil";
      default:
        return "doc.fill";
    }
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case "pdf":
        return "#667eea";
      case "text":
        return "#f093fb";
      case "youtube":
        return "#4facfe";
      case "manual":
        return "#43e97b";
      default:
        return colors.tint;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "#2ed573";
      case "processing":
        return "#ffa502";
      case "failed":
        return "#ff4757";
      default:
        return colors.text;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return "Completed";
      case "processing":
        return "Processing";
      case "failed":
        return "Failed";
      default:
        return "Unknown";
    }
  };

  const handleItemPress = (item: HistoryItem) => {
    if (item.status === "completed") {
      // Navigate to deck details or download
      Alert.alert(item.title, `This deck contains ${item.cardCount} cards.`, [
        { text: "Cancel", style: "cancel" },
        { text: "Download", onPress: () => downloadDeck(item.id) },
        { text: "View Details", onPress: () => viewDeckDetails(item.id) },
      ]);
    } else if (item.status === "processing") {
      Alert.alert(
        "Processing",
        "This deck is still being created. Please check back later."
      );
    } else {
      Alert.alert(
        "Failed",
        "This deck creation failed. You can try creating it again."
      );
    }
  };

  const downloadDeck = (id: string) => {
    // Implement download functionality
    Alert.alert(
      "Download",
      "Download functionality would be implemented here."
    );
  };

  const viewDeckDetails = (id: string) => {
    // Navigate to deck details
    Alert.alert(
      "Details",
      "View deck details functionality would be implemented here."
    );
  };

  const deleteDeck = (id: string) => {
    Alert.alert("Delete Deck", "Are you sure you want to delete this deck?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          setHistory(history.filter((item) => item.id !== id));
        },
      },
    ]);
  };

  const renderHistoryItem = (item: HistoryItem) => (
    <TouchableOpacity
      key={item.id}
      style={[styles.historyItem, { backgroundColor: colors.background }]}
      onPress={() => handleItemPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.itemHeader}>
        <View
          style={[
            styles.methodIcon,
            { backgroundColor: getMethodColor(item.method) + "20" },
          ]}
        >
          <IconSymbol
            name={getMethodIcon(item.method) as any}
            size={20}
            color={getMethodColor(item.method)}
          />
        </View>

        <View style={styles.itemContent}>
          <ThemedText type="defaultSemiBold" style={styles.itemTitle}>
            {item.title}
          </ThemedText>
          <View style={styles.itemMeta}>
            <ThemedText
              style={[styles.itemTime, { color: colors.text + "60" }]}
            >
              {item.createdAt}
            </ThemedText>
            {item.status === "completed" && (
              <>
                <Text
                  style={[styles.metaSeparator, { color: colors.text + "40" }]}
                >
                  •
                </Text>
                <ThemedText
                  style={[styles.cardCount, { color: colors.text + "60" }]}
                >
                  {item.cardCount} cards
                </ThemedText>
              </>
            )}
          </View>
        </View>

        <View style={styles.itemActions}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) + "20" },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: getStatusColor(item.status) },
              ]}
            >
              {getStatusText(item.status)}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => deleteDeck(item.id)}
          >
            <IconSymbol name="trash" size={16} color="#ff4757" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  const completedDecks = history.filter((item) => item.status === "completed");
  const totalCards = completedDecks.reduce(
    (sum, item) => sum + item.cardCount,
    0
  );

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            Your Decks
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: colors.text + "80" }]}>
            All your created flashcard decks
          </ThemedText>
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <View
            style={[styles.summaryCard, { backgroundColor: colors.background }]}
          >
            <ThemedText type="defaultSemiBold" style={styles.summaryValue}>
              {completedDecks.length}
            </ThemedText>
            <ThemedText
              style={[styles.summaryLabel, { color: colors.text + "60" }]}
            >
              Completed Decks
            </ThemedText>
          </View>

          <View
            style={[styles.summaryCard, { backgroundColor: colors.background }]}
          >
            <ThemedText type="defaultSemiBold" style={styles.summaryValue}>
              {totalCards}
            </ThemedText>
            <ThemedText
              style={[styles.summaryLabel, { color: colors.text + "60" }]}
            >
              Total Cards
            </ThemedText>
          </View>
        </View>

        {/* History List */}
        <View style={styles.historyContainer}>
          {history.length === 0 ? (
            <View style={styles.emptyState}>
              <IconSymbol name="folder" size={64} color={colors.text + "40"} />
              <ThemedText
                style={[styles.emptyTitle, { color: colors.text + "60" }]}
              >
                No decks yet
              </ThemedText>
              <ThemedText
                style={[styles.emptyDescription, { color: colors.text + "40" }]}
              >
                Create your first flashcard deck to get started
              </ThemedText>
            </View>
          ) : (
            history.map(renderHistoryItem)
          )}
        </View>
      </ScrollView>
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
  summaryContainer: {
    flexDirection: "row",
    paddingHorizontal: 24,
    marginBottom: 32,
    gap: 16,
  },
  summaryCard: {
    flex: 1,
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryValue: {
    fontSize: 28,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 14,
    textAlign: "center",
  },
  historyContainer: {
    paddingHorizontal: 24,
  },
  historyItem: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  methodIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    marginBottom: 4,
  },
  itemMeta: {
    flexDirection: "row",
    alignItems: "center",
  },
  itemTime: {
    fontSize: 14,
  },
  metaSeparator: {
    marginHorizontal: 8,
    fontSize: 14,
  },
  cardCount: {
    fontSize: 14,
  },
  itemActions: {
    alignItems: "flex-end",
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  deleteButton: {
    padding: 4,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});
