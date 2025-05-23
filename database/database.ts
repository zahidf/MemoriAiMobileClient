import * as SQLite from "expo-sqlite";

const DB_NAME = "memoriai.db";

// Database connection
let db: SQLite.SQLiteDatabase;

// Initialize database connection
export const initDatabase = async (): Promise<void> => {
  try {
    db = await SQLite.openDatabaseAsync(DB_NAME);
    console.log("Database connection established");
    await createTables();
  } catch (error) {
    console.error("Failed to initialize database:", error);
    throw error;
  }
};

// Create all tables
const createTables = async (): Promise<void> => {
  try {
    // Users table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        google_id TEXT UNIQUE NOT NULL,
        email TEXT NOT NULL,
        name TEXT NOT NULL,
        profile_picture_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Decks table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS decks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      );
    `);

    // Cards table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS cards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        deck_id INTEGER NOT NULL,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (deck_id) REFERENCES decks (id)
      );
    `);

    // Card study data table (SM-2)
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS card_study_data (
        card_id INTEGER PRIMARY KEY,
        ease_factor REAL DEFAULT 2.5,
        repetitions INTEGER DEFAULT 0,
        interval_days INTEGER DEFAULT 0,
        due_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (card_id) REFERENCES cards (id)
      );
    `);

    // Create indexes
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_cards_deck_id ON cards (deck_id);
      CREATE INDEX IF NOT EXISTS idx_card_study_data_due_date ON card_study_data (due_date);
    `);

    console.log("Database tables created successfully");
  } catch (error) {
    console.error("Failed to create tables:", error);
    throw error;
  }
};

// Get database instance
export const getDatabase = (): SQLite.SQLiteDatabase => {
  if (!db) {
    throw new Error("Database not initialized. Call initDatabase() first.");
  }
  return db;
};

// Re-export types from centralized location
export type {
  Card,
  CardStudyData,
  CardWithStudyData,
  Deck,
  DeckWithStats,
  User,
} from "../types";
