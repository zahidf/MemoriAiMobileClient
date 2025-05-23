import {
  getDatabase,
  type Card,
  type CardStudyData,
  type CardWithStudyData,
  type Deck,
} from "../database/database";

// Create a new deck
export const createDeck = async (
  userId: number,
  title: string
): Promise<Deck> => {
  const db = getDatabase();

  try {
    const result = await db.runAsync(
      "INSERT INTO decks (user_id, title) VALUES (?, ?)",
      [userId, title]
    );

    return {
      id: result.lastInsertRowId,
      user_id: userId,
      title,
    };
  } catch (error) {
    console.error("Failed to create deck:", error);
    throw error;
  }
};

// Get all decks for a user
export const getUserDecks = async (
  userId: number
): Promise<Array<Deck & { card_count: number }>> => {
  const db = getDatabase();

  try {
    const decks = await db.getAllAsync<Deck & { card_count: number }>(
      `SELECT d.*, COALESCE(COUNT(c.id), 0) as card_count 
           FROM decks d 
           LEFT JOIN cards c ON d.id = c.deck_id 
           WHERE d.user_id = ? 
           GROUP BY d.id 
           ORDER BY d.created_at DESC`,
      [userId]
    );

    return decks;
  } catch (error) {
    console.error("Failed to get user decks:", error);
    throw error;
  }
};

// Add cards to a deck (from Q&A pairs)
export const addCardsToDeck = async (
  deckId: number,
  qaPairs: Array<{ question: string; answer: string }>
): Promise<Card[]> => {
  const db = getDatabase();

  try {
    const cards: Card[] = [];
    // Make cards immediately available for study
    const currentTime = new Date().toISOString();

    for (const pair of qaPairs) {
      // Insert card
      const cardResult = await db.runAsync(
        "INSERT INTO cards (deck_id, question, answer) VALUES (?, ?, ?)",
        [deckId, pair.question, pair.answer]
      );

      const cardId = cardResult.lastInsertRowId;

      // Initialize study data for the card - make it immediately due
      await db.runAsync(
        "INSERT INTO card_study_data (card_id, ease_factor, repetitions, interval_days, due_date) VALUES (?, ?, ?, ?, ?)",
        [cardId, 2.5, 0, 0, currentTime] // Set due_date to current time
      );

      cards.push({
        id: cardId,
        deck_id: deckId,
        question: pair.question,
        answer: pair.answer,
      });
    }

    console.log(
      `Added ${cards.length} cards to deck ${deckId}, all due immediately`
    );
    return cards;
  } catch (error) {
    console.error("Failed to add cards to deck:", error);
    throw error;
  }
};

// Get cards in a deck
export const getDeckCards = async (deckId: number): Promise<Card[]> => {
  const db = getDatabase();

  try {
    const cards = await db.getAllAsync<Card>(
      "SELECT * FROM cards WHERE deck_id = ? ORDER BY created_at ASC",
      [deckId]
    );

    return cards;
  } catch (error) {
    console.error("Failed to get deck cards:", error);
    throw error;
  }
};

// Get due cards for study (with study data) - FIXED VERSION
export const getDueCards = async (
  deckId: number
): Promise<CardWithStudyData[]> => {
  const db = getDatabase();

  try {
    const currentTime = new Date().toISOString();
    console.log("Getting due cards for deck:", deckId, "at time:", currentTime);

    // Get only cards that are actually due (respecting intervals)
    const dueCards = await db.getAllAsync<CardWithStudyData>(
      `SELECT c.*, csd.ease_factor, csd.repetitions, csd.interval_days, csd.due_date
           FROM cards c
           JOIN card_study_data csd ON c.id = csd.card_id
           WHERE c.deck_id = ? AND csd.due_date <= ?
           ORDER BY csd.due_date ASC`,
      [deckId, currentTime]
    );

    console.log(`Found ${dueCards.length} due cards`);

    // REMOVED: The automatic "make all cards due" logic that was defeating spaced repetition
    // We now respect the actual due dates and let users wait for their intervals

    return dueCards;
  } catch (error) {
    console.error("Failed to get due cards:", error);
    throw error;
  }
};

// Get the next due time for any card in the deck
export const getNextDueTime = async (deckId: number): Promise<Date | null> => {
  const db = getDatabase();

  try {
    const currentTime = new Date().toISOString();

    const nextDue = await db.getFirstAsync<{ next_due: string }>(
      `SELECT MIN(csd.due_date) as next_due
           FROM cards c
           JOIN card_study_data csd ON c.id = csd.card_id
           WHERE c.deck_id = ? AND csd.due_date > ?`,
      [deckId, currentTime]
    );

    if (nextDue?.next_due) {
      return new Date(nextDue.next_due);
    }

    return null;
  } catch (error) {
    console.error("Failed to get next due time:", error);
    return null;
  }
};

// Check if deck has any cards due now
export const hasDueCards = async (deckId: number): Promise<boolean> => {
  const db = getDatabase();

  try {
    const currentTime = new Date().toISOString();

    const dueCount = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count
           FROM cards c
           JOIN card_study_data csd ON c.id = csd.card_id
           WHERE c.deck_id = ? AND csd.due_date <= ?`,
      [deckId, currentTime]
    );

    return (dueCount?.count || 0) > 0;
  } catch (error) {
    console.error("Failed to check due cards:", error);
    return false;
  }
};

// Update card study data after review
export const updateCardStudyData = async (
  cardId: number,
  studyData: CardStudyData
): Promise<void> => {
  const db = getDatabase();

  try {
    console.log("Updating card study data:", cardId, studyData);

    await db.runAsync(
      `UPDATE card_study_data 
           SET ease_factor = ?, repetitions = ?, interval_days = ?, due_date = ?
           WHERE card_id = ?`,
      [
        studyData.ease_factor,
        studyData.repetitions,
        studyData.interval_days,
        studyData.due_date,
        cardId,
      ]
    );

    console.log("Card study data updated successfully");
  } catch (error) {
    console.error("Failed to update card study data:", error);
    throw error;
  }
};

// Delete a deck and all its cards
export const deleteDeck = async (deckId: number): Promise<void> => {
  const db = getDatabase();

  try {
    // Delete study data for all cards in the deck
    await db.runAsync(
      "DELETE FROM card_study_data WHERE card_id IN (SELECT id FROM cards WHERE deck_id = ?)",
      [deckId]
    );

    // Delete all cards in the deck
    await db.runAsync("DELETE FROM cards WHERE deck_id = ?", [deckId]);

    // Delete the deck
    await db.runAsync("DELETE FROM decks WHERE id = ?", [deckId]);
  } catch (error) {
    console.error("Failed to delete deck:", error);
    throw error;
  }
};

// Get deck statistics - UPDATED to show more accurate info
export const getDeckStats = async (
  deckId: number
): Promise<{
  totalCards: number;
  dueCards: number;
  newCards: number;
  reviewCards: number;
  nextDueTime?: Date;
}> => {
  const db = getDatabase();

  try {
    const currentTime = new Date().toISOString();

    const stats = await db.getFirstAsync<{
      total_cards: number;
      due_cards: number;
      new_cards: number;
      review_cards: number;
    }>(
      `SELECT 
            COUNT(*) as total_cards,
            COUNT(CASE WHEN csd.due_date <= ? THEN 1 END) as due_cards,
            COUNT(CASE WHEN csd.repetitions = 0 THEN 1 END) as new_cards,
            COUNT(CASE WHEN csd.repetitions > 0 THEN 1 END) as review_cards
           FROM cards c
           JOIN card_study_data csd ON c.id = csd.card_id
           WHERE c.deck_id = ?`,
      [currentTime, deckId]
    );

    // Get next due time
    const nextDueTime = await getNextDueTime(deckId);

    return {
      totalCards: stats?.total_cards || 0,
      dueCards: stats?.due_cards || 0,
      newCards: stats?.new_cards || 0,
      reviewCards: stats?.review_cards || 0,
      nextDueTime: nextDueTime || undefined,
    };
  } catch (error) {
    console.error("Failed to get deck stats:", error);
    return {
      totalCards: 0,
      dueCards: 0,
      newCards: 0,
      reviewCards: 0,
    };
  }
};

// Reset all cards in a deck to be due now (useful for testing/development)
export const resetDeckForStudy = async (deckId: number): Promise<void> => {
  const db = getDatabase();

  try {
    const currentTime = new Date().toISOString();

    await db.runAsync(
      `UPDATE card_study_data 
           SET due_date = ?, repetitions = 0, ease_factor = 2.5, interval_days = 0
           WHERE card_id IN (SELECT id FROM cards WHERE deck_id = ?)`,
      [currentTime, deckId]
    );

    console.log(`Reset all cards in deck ${deckId} to be due for study`);
  } catch (error) {
    console.error("Failed to reset deck for study:", error);
    throw error;
  }
};

// Format time until next due card (for UI display)
export const formatTimeUntilDue = (nextDueTime: Date): string => {
  const now = new Date();
  const diffMs = nextDueTime.getTime() - now.getTime();

  if (diffMs <= 0) {
    return "Due now";
  }

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays > 0) {
    return `${diffDays} day${diffDays !== 1 ? "s" : ""}`;
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours !== 1 ? "s" : ""}`;
  } else if (diffMinutes > 0) {
    return `${diffMinutes} minute${diffMinutes !== 1 ? "s" : ""}`;
  } else {
    return "< 1 minute";
  }
};
