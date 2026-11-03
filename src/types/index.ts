export type CefrLevel = 'A2' | 'B1';

export type VocabularyCategory =
  | 'Daily life'
  | 'Work and career'
  | 'Food and restaurants'
  | 'Shopping'
  | 'Travel'
  | 'Health'
  | 'Relationships'
  | 'Communication';

export interface VocabularyWord {
  id: string;
  word: string;
  ipa: string;
  pos: 'noun' | 'verb' | 'adjective' | 'adverb' | 'preposition' | 'phrase' | 'conjunction' | 'pronoun';
  chinese: string;
  definition: string;
  definitionZh: string;
  example: string;
  exampleZh: string;
  category: VocabularyCategory;
  level: CefrLevel;
}

export type WordStatus = 'unlearned' | 'need_practice' | 'learned';

export interface GrammarExercise {
  id: string;
  question: string;
  questionZh: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  explanationZh: string;
}

export interface GrammarLesson {
  id: string;
  title: string;
  titleZh: string;
  level: CefrLevel;
  summary: string;
  summaryZh: string;
  explanationEn: string;
  explanationZh: string;
  structures: string[];
  positiveExamples: { en: string; zh: string }[];
  negativeExamples: { en: string; zh: string }[];
  questionExamples: { en: string; zh: string }[];
  commonMistakes: { wrong: string; right: string; noteEn: string; noteZh: string }[];
  exercises: GrammarExercise[];
}

export interface ReadingQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface ReadingVocab {
  word: string;
  pos: string;
  meaningZh: string;
  phonetic: string;
}

export interface ReadingPassage {
  id: string;
  title: string;
  titleZh: string;
  category: string;
  level: CefrLevel;
  estimatedMinutes: number;
  paragraphs: { en: string; zh: string }[];
  vocabulary: ReadingVocab[];
  questions: ReadingQuestion[];
}

export interface ListeningSentence {
  id: string;
  startTime: number; // in seconds
  endTime: number;   // in seconds
  en: string;
  zh: string;
}

export interface ListeningLesson {
  id: string;
  title: string;
  titleZh: string;
  level: CefrLevel;
  duration: string;
  sentences: ListeningSentence[];
  vocabulary: { word: string; meaningZh: string }[];
  isCustom?: boolean;
  audioKey?: string; // key in IndexedDB for custom MP3
  audioBlobUrl?: string; // runtime blob URL
  audioFileName?: string;
}

export interface SpeakingItem {
  id: string;
  category: string;
  en: string;
  zh: string;
  context: string;
  ipa: string;
  tips: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string; // ISO string
  type: 'vocab' | 'grammar' | 'reading' | 'listening' | 'speaking' | 'quiz';
  title: string;
  titleZh: string;
  details?: string;
}

export interface UserSettings {
  userName: string;
  dailyGoalMinutes: number;
  voiceGender: 'female' | 'male';
  voiceAccent: 'en-US' | 'en-GB';
  speechRate: number; // 0.8, 1.0, 1.2
  bilingualMode: 'both' | 'click' | 'english-only';
  soundEffects: boolean;
}

export interface UserProgress {
  learnedWords: string[];
  needPracticeWords: string[];
  completedGrammar: string[];
  grammarScores: Record<string, number>; // lessonId -> percentage
  completedReading: string[];
  readingScores: Record<string, number>; // passageId -> percentage
  completedListening: string[];
  speakingPractices: Record<string, { attempts: number; bestScore: number }>;
  streak: number;
  lastActiveDate: string; // YYYY-MM-DD
  todayStudySeconds: number;
  weeklyMinutes: Record<string, number>; // date string YYYY-MM-DD -> minutes
  activities: ActivityLog[];
  settings: UserSettings;
}
