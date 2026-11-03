import { UserProgress, ActivityLog } from '../types';

const PROGRESS_STORAGE_KEY = 'my_english_user_progress_v1';
const DB_NAME = 'MyEnglishAudioDB';
const DB_STORE = 'audio_files';
const DB_VERSION = 1;

export const DEFAULT_PROGRESS: UserProgress = {
  learnedWords: [],
  needPracticeWords: [],
  completedGrammar: [],
  grammarScores: {},
  completedReading: [],
  readingScores: {},
  completedListening: [],
  speakingPractices: {},
  streak: 1,
  lastActiveDate: new Date().toISOString().split('T')[0],
  todayStudySeconds: 180, // initial 3 minutes today
  weeklyMinutes: {
    [new Date().toISOString().split('T')[0]]: 3,
  },
  activities: [
    {
      id: 'act-init-1',
      timestamp: new Date().toISOString(),
      type: 'vocab',
      title: 'Joined My English Platform',
      titleZh: '加入 My English 平台，开启英语进阶之旅',
      details: 'CEFR A2 → B1 Pathway',
    },
  ],
  settings: {
    userName: 'Learner',
    dailyGoalMinutes: 15,
    voiceGender: 'female',
    voiceAccent: 'en-US',
    speechRate: 1.0,
    bilingualMode: 'both',
    soundEffects: true,
  },
};

export function loadUserProgress(): UserProgress {
  try {
    const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (!raw) {
      saveUserProgress(DEFAULT_PROGRESS);
      return DEFAULT_PROGRESS;
    }
    const parsed = JSON.parse(raw) as UserProgress;
    
    // Check streak & date
    const today = new Date().toISOString().split('T')[0];
    if (parsed.lastActiveDate !== today) {
      const lastDate = new Date(parsed.lastActiveDate);
      const currDate = new Date(today);
      const diffDays = Math.round((currDate.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
      
      if (diffDays === 1) {
        // Consecutive day!
        parsed.streak = (parsed.streak || 0) + 1;
      } else if (diffDays > 1) {
        // Streak broken
        parsed.streak = 1;
      }
      parsed.lastActiveDate = today;
      parsed.todayStudySeconds = 0;
    }

    if (!parsed.settings) {
      parsed.settings = DEFAULT_PROGRESS.settings;
    }
    if (!parsed.weeklyMinutes) {
      parsed.weeklyMinutes = {};
    }
    return parsed;
  } catch (err) {
    console.error('Failed to parse progress from localStorage', err);
    return DEFAULT_PROGRESS;
  }
}

export function saveUserProgress(progress: UserProgress): void {
  try {
    localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
  } catch (err) {
    console.error('Failed to save progress to localStorage', err);
  }
}

export function logActivity(progress: UserProgress, activity: Omit<ActivityLog, 'id' | 'timestamp'>): UserProgress {
  const newActivity: ActivityLog = {
    ...activity,
    id: 'act-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    timestamp: new Date().toISOString(),
  };

  const updated: UserProgress = {
    ...progress,
    activities: [newActivity, ...(progress.activities || [])].slice(0, 30),
  };
  saveUserProgress(updated);
  return updated;
}

// IndexedDB Helper for audio files
function openAudioDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DB_STORE)) {
        db.createObjectStore(DB_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveAudioFile(id: string, file: Blob): Promise<void> {
  const db = await openAudioDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readwrite');
    const store = tx.objectStore(DB_STORE);
    const req = store.put(file, id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getAudioFile(id: string): Promise<Blob | null> {
  try {
    const db = await openAudioDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readonly');
      const store = tx.objectStore(DB_STORE);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function deleteAudioFile(id: string): Promise<void> {
  try {
    const db = await openAudioDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readwrite');
      const store = tx.objectStore(DB_STORE);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Ignore error
  }
}
