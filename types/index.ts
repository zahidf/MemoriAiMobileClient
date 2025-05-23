// Database Models
export interface User {
  id?: number;
  google_id: string;
  email: string;
  name: string;
  profile_picture_url?: string;
  created_at?: string;
}

export interface Deck {
  id?: number;
  user_id: number;
  title: string;
  card_count?: number;
  created_at?: string;
}

export interface Card {
  id?: number;
  deck_id: number;
  question: string;
  answer: string;
  created_at?: string;
}

export interface CardStudyData {
  card_id: number;
  ease_factor: number;
  repetitions: number;
  interval_days: number;
  due_date: string;
}

// Extended types for joins
export interface CardWithStudyData extends Card {
  ease_factor: number;
  repetitions: number;
  interval_days: number;
  due_date: string;
}

export interface DeckWithStats extends Deck {
  card_count: number;
  dueCards: number;
  newCards?: number;
  reviewCards?: number;
  nextDueTime?: Date;
}

// SM-2 Algorithm Types
export interface SM2Input {
  quality: number; // 0-5 user rating
  repetitions: number; // previous repetitions
  previousEaseFactor: number; // previous ease factor
  previousInterval: number; // previous interval
}

export interface SM2Result {
  interval: number;
  repetitions: number;
  easeFactor: number;
}

// API & Content Types
export interface QAPair {
  question: string;
  answer: string;
}

export interface ApiResponse<T = any> {
  status: string;
  data?: T;
  message?: string;
  task_id?: string;
  progress?: number;
  estimated_count?: number;
}

// Content Creation Types
export type CreationMethod = "pdf" | "text" | "youtube" | "manual" | null;

export interface ContentProcessingRequest {
  method: CreationMethod;
  content?: string;
  url?: string;
  file?: any;
  num_pairs?: number;
}

// Study Session Types
export interface StudySession {
  id?: number;
  user_id: number;
  deck_id: number;
  started_at: string;
  ended_at?: string;
  cards_studied: number;
  cards_correct: number;
  cards_incorrect: number;
}

export interface CardReview {
  id?: number;
  card_id: number;
  session_id: number;
  quality: number;
  response_time_ms?: number;
  reviewed_at: string;
}

// Component Props Types
export interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
}

export interface StudyScreenProps {
  deckId: string;
}

// Statistics Types
export interface DeckStatistics {
  totalCards: number;
  dueCards: number;
  newCards: number;
  reviewCards: number;
  averageEaseFactor?: number;
  averageInterval?: number;
  retentionRate?: number;
  nextDueTime?: Date;
}

export interface UserProgress {
  totalDecks: number;
  totalCards: number;
  cardsStudiedToday: number;
  studyStreak: number;
  averageAccuracy: number;
}

// UI State Types
export interface LoadingState {
  isLoading: boolean;
  message?: string;
  progress?: number;
}

export interface ErrorState {
  hasError: boolean;
  message?: string;
  code?: string;
}

// Navigation Types
export interface StudyParams {
  deckId: string;
}

export interface ReviewCardsParams {
  taskId?: string;
  method?: string;
  cards?: string; // JSON stringified QAPair[]
}

export interface CreateParams {
  method?: CreationMethod;
}

// Form Types
export interface DeckFormData {
  title: string;
  description?: string;
}

export interface CardFormData {
  question: string;
  answer: string;
}

// Settings Types (for future use)
export interface UserSettings {
  id?: number;
  user_id: number;
  daily_study_goal: number;
  notifications_enabled: boolean;
  study_reminder_time: string;
  dark_mode: boolean;
  show_answer_timer: boolean;
}

// Quality Rating Definitions (from SM-2)
export const QUALITY_RATINGS = [
  {
    value: 0,
    label: "Again",
    description: "Complete blackout",
    color: "#ff4757",
  },
  {
    value: 1,
    label: "Hard",
    description: "Incorrect; correct seemed easy",
    color: "#ff6b7a",
  },
  {
    value: 2,
    label: "Good",
    description: "Incorrect; but remembered",
    color: "#ffa726",
  },
  {
    value: 3,
    label: "Easy",
    description: "Correct with serious difficulty",
    color: "#26c6da",
  },
  {
    value: 4,
    label: "Perfect",
    description: "Correct after hesitation",
    color: "#66bb6a",
  },
  {
    value: 5,
    label: "Excellent",
    description: "Perfect response",
    color: "#4caf50",
  },
] as const;

export type QualityRating = (typeof QUALITY_RATINGS)[number];

// Creation Method Definitions
export const CREATION_METHODS = [
  {
    id: "pdf" as const,
    title: "PDF Upload",
    description: "Generate flashcards from PDF documents",
    icon: "doc.fill",
    gradient: ["#667eea", "#764ba2"] as const,
  },
  {
    id: "text" as const,
    title: "Text Input",
    description: "Paste or type your content directly",
    icon: "text.alignleft",
    gradient: ["#f093fb", "#f5576c"] as const,
  },
  {
    id: "youtube" as const,
    title: "YouTube Video",
    description: "Generate cards from video transcripts",
    icon: "play.fill",
    gradient: ["#4facfe", "#00f2fe"] as const,
  },
  {
    id: "manual" as const,
    title: "Manual Entry",
    description: "Create cards one by one manually",
    icon: "pencil",
    gradient: ["#43e97b", "#38f9d7"] as const,
  },
] as const;

export type CreationMethodConfig = (typeof CREATION_METHODS)[number];

// Utility Types
export type DatabaseTable = "users" | "decks" | "cards" | "card_study_data";
export type StudyQuality = 0 | 1 | 2 | 3 | 4 | 5;
export type CardState = "new" | "learning" | "review" | "overdue";

// Re-export commonly used types
export type { User as AuthUser, Card as StudyCard, Deck as StudyDeck };
