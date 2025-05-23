import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { getDatabase } from "../database/database";

export default function DatabaseInspector() {
  const [dbData, setDbData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const inspectDatabase = async () => {
    setLoading(true);
    try {
      const db = getDatabase();

      // Get all data from each table
      const users = await db.getAllAsync("SELECT * FROM users");
      const decks = await db.getAllAsync("SELECT * FROM decks");
      const cards = await db.getAllAsync("SELECT * FROM cards");
      const studyData = await db.getAllAsync("SELECT * FROM card_study_data");

      // Get table schemas
      const userSchema = await db.getAllAsync("PRAGMA table_info(users)");
      const deckSchema = await db.getAllAsync("PRAGMA table_info(decks)");
      const cardSchema = await db.getAllAsync("PRAGMA table_info(cards)");
      const studySchema = await db.getAllAsync(
        "PRAGMA table_info(card_study_data)"
      );

      const data = {
        schemas: {
          users: userSchema,
          decks: deckSchema,
          cards: cardSchema,
          card_study_data: studySchema,
        },
        data: {
          users,
          decks,
          cards,
          card_study_data: studyData,
        },
        stats: {
          userCount: users.length,
          deckCount: decks.length,
          cardCount: cards.length,
          studyDataCount: studyData.length,
        },
      };

      setDbData(data);
    } catch (error) {
      console.error("Failed to inspect database:", error);
      Alert.alert("Error", "Failed to inspect database");
    } finally {
      setLoading(false);
    }
  };

  const exportDatabase = async () => {
    try {
      const db = getDatabase();

      // Export as JSON
      const users = await db.getAllAsync("SELECT * FROM users");
      const decks = await db.getAllAsync("SELECT * FROM decks");
      const cards = await db.getAllAsync("SELECT * FROM cards");
      const studyData = await db.getAllAsync("SELECT * FROM card_study_data");

      const exportData = {
        exported_at: new Date().toISOString(),
        tables: {
          users,
          decks,
          cards,
          card_study_data: studyData,
        },
      };

      const jsonString = JSON.stringify(exportData, null, 2);
      const fileName = `memoriai_db_export_${Date.now()}.json`;
      const fileUri = FileSystem.documentDirectory + fileName;

      await FileSystem.writeAsStringAsync(fileUri, jsonString);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert("Success", `Database exported to: ${fileUri}`);
      }
    } catch (error) {
      console.error("Failed to export database:", error);
      Alert.alert("Error", "Failed to export database");
    }
  };

  const clearDatabase = async () => {
    Alert.alert(
      "Clear Database",
      "Are you sure you want to clear all data? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            try {
              const db = getDatabase();
              await db.runAsync("DELETE FROM card_study_data");
              await db.runAsync("DELETE FROM cards");
              await db.runAsync("DELETE FROM decks");
              await db.runAsync("DELETE FROM users");
              setDbData(null);
              Alert.alert("Success", "Database cleared");
            } catch (error) {
              console.error("Failed to clear database:", error);
              Alert.alert("Error", "Failed to clear database");
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Database Inspector</Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.inspectButton]}
          onPress={inspectDatabase}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Loading..." : "Inspect Database"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.exportButton]}
          onPress={exportDatabase}
        >
          <Text style={styles.buttonText}>Export Database</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.clearButton]}
          onPress={clearDatabase}
        >
          <Text style={styles.buttonText}>Clear Database</Text>
        </TouchableOpacity>
      </View>

      {dbData && (
        <View style={styles.dataContainer}>
          <Text style={styles.sectionTitle}>Database Statistics</Text>
          <Text>Users: {dbData.stats.userCount}</Text>
          <Text>Decks: {dbData.stats.deckCount}</Text>
          <Text>Cards: {dbData.stats.cardCount}</Text>
          <Text>Study Data: {dbData.stats.studyDataCount}</Text>

          <Text style={styles.sectionTitle}>Sample Data</Text>
          <Text style={styles.jsonText}>
            {JSON.stringify(dbData.data, null, 2)}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  buttonContainer: {
    marginBottom: 20,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: "center",
  },
  inspectButton: {
    backgroundColor: "#007AFF",
  },
  exportButton: {
    backgroundColor: "#34C759",
  },
  clearButton: {
    backgroundColor: "#FF3B30",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  dataContainer: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 15,
    marginBottom: 10,
  },
  jsonText: {
    fontFamily: "monospace",
    fontSize: 12,
    backgroundColor: "#f0f0f0",
    padding: 10,
    borderRadius: 4,
  },
});
