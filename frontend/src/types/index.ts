// ── Enums ──

export type LessonType = "phonics" | "sight_words" | "sentences" | "story" | "conversation";
export type PhonicsLevel = "short_vowels" | "long_vowels" | "blends_digraphs" | "advanced";
export type SightWordPhase = "pre_k" | "kinder" | "first_grade" | "nouns";
export type PronunciationGrade = "green" | "yellow" | "retry";
export type CharacterRarity = "common" | "rare" | "epic" | "legendary";

// ── Auth ──

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

// ── Child Profile ──

export interface ChildProfile {
  id: string;
  nickname: string;
  birth_year: number;
  avatar_config: Record<string, unknown> | null;
  current_phase: number;
  current_month: number;
  total_xp: number;
  level: number;
  coins: number;
  streak_days: number;
}

// ── Curriculum ──

export interface CurriculumPhase {
  id: number;
  phase_number: number;
  title: string;
  title_ko: string;
  description: string;
  start_month: number;
  end_month: number;
}

export interface Lesson {
  id: string;
  lesson_type: LessonType;
  month: number;
  order_index: number;
  title: string;
  title_ko: string;
  description: string | null;
  phonics_level: PhonicsLevel | null;
  sight_word_phase: SightWordPhase | null;
  xp_reward: number;
  is_completed: boolean;
  is_locked: boolean;
}

export type LessonContentType =
  | "letter_sound"
  | "phonics_blend"
  | "phonics_word"
  | "sight_word_flash"
  | "sentence_build"
  | "sentence_pattern"
  | "pronoun_match"
  | "noun_match";

export interface BaseLessonContentData {
  [key: string]: unknown;
  letter?: string;
  keyword?: string;
  sound?: string;
  word?: string;
  phonemes?: string[];
  meaning?: string;
  meaning_ko?: string;
  translation_ko?: string;
  word_ko?: string;
  complete_sentence?: string;
  example?: string;
  example_sentence?: string;
  word_blocks?: string[];
  correct_order?: number[];
  noun?: string;
}

export interface LetterSoundContentData extends BaseLessonContentData {
  letter: string;
}

export interface PhonicsContentData extends BaseLessonContentData {
  word: string;
  phonemes: string[];
}

export interface SightWordFlashContentData extends BaseLessonContentData {
  word: string;
}

export interface SentenceBuildContentData extends BaseLessonContentData {
  example_sentence: string;
  word_blocks: string[];
  correct_order: number[];
}

interface BaseLessonItem {
  id: string;
  order_index: number;
  audio_url: string | null;
  image_url: string | null;
}

export type LessonItem =
  | (BaseLessonItem & {
      content_type: "letter_sound";
      content_data: LetterSoundContentData;
    })
  | (BaseLessonItem & {
      content_type: "phonics_blend" | "phonics_word";
      content_data: PhonicsContentData;
    })
  | (BaseLessonItem & {
      content_type: "sight_word_flash";
      content_data: SightWordFlashContentData;
    })
  | (BaseLessonItem & {
      content_type: "sentence_build";
      content_data: SentenceBuildContentData;
    })
  | (BaseLessonItem & {
      content_type: "sentence_pattern" | "pronoun_match" | "noun_match";
      content_data: BaseLessonContentData;
    });

export function isLessonItemType<T extends LessonContentType>(
  item: LessonItem,
  contentType: T,
): item is Extract<LessonItem, { content_type: T }> {
  return item.content_type === contentType;
}

export interface LessonDetail extends Lesson {
  items: LessonItem[];
  unlock_character_id: string | null;
}

export interface CurriculumMap {
  phases: CurriculumPhase[];
  lessons: Lesson[];
  child_progress: ChildProfile;
}

// ── Stories ──

export interface StoryListItem {
  id: string;
  title: string;
  genre: string;
  lexile_min: number;
  lexile_max: number;
  page_count: number;
  cover_image_url: string | null;
  is_fiction: boolean;
  is_read: boolean;
}

// ── Learning Records ──

export interface LearningRecordCreate {
  lesson_id: string;
  lesson_type: LessonType;
  score: number;
  total_items: number;
  correct_items: number;
  time_spent_seconds: number;
  detail_data?: Record<string, unknown>;
}

export interface AdaptiveRecommendation {
  action: "advance" | "review" | "none";
  lesson_type: LessonType;
  message_ko: string;
}

export interface LearningRecord {
  id: string;
  lesson_type: LessonType;
  score: number;
  total_items: number;
  correct_items: number;
  time_spent_seconds: number;
  xp_earned: number;
  completed_at: string;
  adaptive_recommendation?: AdaptiveRecommendation | null;
}

// ── Speech ──

export interface PhonemeScore {
  phoneme: string;
  score: number;
  suggestion: string | null;
}

export interface PronunciationResult {
  overall_score: number;
  grade: PronunciationGrade;
  transcript: string | null;
  phoneme_scores: PhonemeScore[];
}

// ── Gamification ──

export interface Character {
  id: string;
  name: string;
  name_ko: string;
  description: string | null;
  rarity: CharacterRarity;
  image_url_locked: string | null;
  image_url_unlocked: string | null;
  phase_number: number;
  is_collected: boolean;
  unlocked_at: string | null;
}

export interface CharacterUnlockResponse {
  success: boolean;
  character: Character;
  xp_earned: number;
  coins_earned: number;
}

export interface Badge {
  id: string;
  code: string;
  name: string;
  name_ko: string;
  description: string | null;
  image_url: string | null;
  is_earned: boolean;
  earned_at: string | null;
}

export interface ShopItem {
  id: string;
  category: string;
  name: string;
  name_ko: string;
  price_coins: number;
  image_url: string | null;
  is_purchased: boolean;
}

// ── AI Conversation ──

export interface ConversationScenario {
  id: string;
  title: string;
  title_ko: string;
  description: string | null;
  character_name: string;
  character_image_url: string | null;
  target_month: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

// ── Spaced Repetition ──

export interface ReviewItem {
  item_type: string;
  item_key: string;
  word?: string | null;
  sentence?: string | null;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  next_review: string;
}

// ── Parent Dashboard ──

export interface DailyStat {
  date: string;
  total_time_seconds: number;
  lessons_completed: number;
  xp_earned: number;
  accuracy: number;
}

export interface WeeklyReport {
  child: ChildProfile;
  period_start: string;
  period_end: string;
  daily_stats: DailyStat[];
  phonics_accuracy: number;
  sight_word_accuracy: number;
  sentence_accuracy: number;
  pronunciation_avg_score: number;
  new_words_learned: number;
  characters_collected: number;
  streak_days: number;
  llm_analysis: string | null;
}

export interface LearnedWordItem {
  word: string;
  lesson_type: LessonType;
  first_learned_at: string;
  lesson_title: string;
}

export interface LearnedWords {
  period_start: string;
  period_end: string;
  total_count: number;
  words: LearnedWordItem[];
}
