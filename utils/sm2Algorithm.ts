import type { SM2Input, SM2Result } from "../types";

export function calculateSM2(input: SM2Input): SM2Result {
  const { quality, repetitions, previousEaseFactor, previousInterval } = input;

  let newInterval: number;
  let newRepetitions: number;
  let newEaseFactor: number;

  if (quality >= 3) {
    // Correct response
    if (repetitions === 0) {
      newInterval = 1;
    } else if (repetitions === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(previousInterval * previousEaseFactor);
    }

    newRepetitions = repetitions + 1;

    // Calculate new ease factor
    newEaseFactor =
      previousEaseFactor +
      (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

    // Ensure ease factor is at least 1.3
    if (newEaseFactor < 1.3) {
      newEaseFactor = 1.3;
    }
  } else {
    // Incorrect response
    newRepetitions = 0;
    newInterval = 1;
    newEaseFactor = previousEaseFactor; // No change
  }

  return {
    interval: newInterval,
    repetitions: newRepetitions,
    easeFactor: newEaseFactor,
  };
}

/**
 * Calculate the due date for a card
 */
export function calculateDueDate(intervalDays: number): Date {
  const now = new Date();
  const dueDate = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);
  return dueDate;
}

/**
 * Calculate the due date as ISO string for database storage
 */
export function calculateDueDateString(intervalDays: number): string {
  const dueDate = calculateDueDate(intervalDays);
  return dueDate.toISOString();
}

/**
 * Check if a card is due for review
 */
export function isCardDue(dueDate: Date): boolean {
  return new Date() >= dueDate;
}

/**
 * Get quality description for UI
 */
export function getQualityDescription(quality: number): string {
  switch (quality) {
    case 5:
      return "Perfect response";
    case 4:
      return "Correct response after a hesitation";
    case 3:
      return "Correct response recalled with serious difficulty";
    case 2:
      return "Incorrect response; where the correct one seemed easy to recall";
    case 1:
      return "Incorrect response; the correct one remembered";
    case 0:
      return "Complete blackout";
    default:
      return "Invalid quality";
  }
}
