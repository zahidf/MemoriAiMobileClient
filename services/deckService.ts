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

// Get due cards for study (with study data)
export const getDueCards = async (
  deckId: number
): Promise<CardWithStudyData[]> => {
  const db = getDatabase();

  try {
    const currentTime = new Date().toISOString();
    console.log("Getting due cards for deck:", deckId, "at time:", currentTime);

    const dueCards = await db.getAllAsync<CardWithStudyData>(
      `SELECT c.*, csd.ease_factor, csd.repetitions, csd.interval_days, csd.due_date
         FROM cards c
         JOIN card_study_data csd ON c.id = csd.card_id
         WHERE c.deck_id = ? AND csd.due_date <= ?
         ORDER BY csd.due_date ASC`,
      [deckId, currentTime]
    );

    console.log(`Found ${dueCards.length} due cards`);

    // If no due cards but there are cards in the deck, let's check why
    if (dueCards.length === 0) {
      const allCardsWithStudyData = await db.getAllAsync<CardWithStudyData>(
        `SELECT c.*, csd.ease_factor, csd.repetitions, csd.interval_days, csd.due_date
           FROM cards c
           JOIN card_study_data csd ON c.id = csd.card_id
           WHERE c.deck_id = ?
           ORDER BY csd.due_date ASC`,
        [deckId]
      );

      console.log("All cards in deck with study data:", allCardsWithStudyData);

      // If there are cards but none are due, make them due now (for new decks)
      if (allCardsWithStudyData.length > 0) {
        console.log("Making all cards in deck due for study...");

        for (const card of allCardsWithStudyData) {
          if (card.id) {
            // Type guard to ensure card.id exists
            await db.runAsync(
              `UPDATE card_study_data 
                 SET due_date = ?
                 WHERE card_id = ?`,
              [currentTime, card.id]
            );
          }
        }

        // Fetch the updated due cards
        const updatedDueCards = await db.getAllAsync<CardWithStudyData>(
          `SELECT c.*, csd.ease_factor, csd.repetitions, csd.interval_days, csd.due_date
             FROM cards c
             JOIN card_study_data csd ON c.id = csd.card_id
             WHERE c.deck_id = ? AND csd.due_date <= ?
             ORDER BY csd.due_date ASC`,
          [deckId, currentTime]
        );

        console.log(`After update: ${updatedDueCards.length} due cards`);
        return updatedDueCards;
      }
    }

    return dueCards;
  } catch (error) {
    console.error("Failed to get due cards:", error);
    throw error;
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

// Get deck statistics
export const getDeckStats = async (
  deckId: number
): Promise<{
  totalCards: number;
  dueCards: number;
  newCards: number;
  reviewCards: number;
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

    return {
      totalCards: stats?.total_cards || 0,
      dueCards: stats?.due_cards || 0,
      newCards: stats?.new_cards || 0,
      reviewCards: stats?.review_cards || 0,
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
