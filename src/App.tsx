import React, { useState, useEffect } from 'react';
import { UserProgress, ListeningLesson } from './types';
import { 
  loadUserProgress, 
  saveUserProgress, 
  logActivity, 
  DEFAULT_PROGRESS 
} from './services/storage';

// Datasets
import { VOCABULARY_LIST } from './data/vocabularyData';
import { GRAMMAR_LESSONS } from './data/grammarData';
import { READING_PASSAGES } from './data/readingData';
import { INITIAL_LISTENING_LESSONS } from './data/listeningData';
import { SPEAKING_ITEMS } from './data/speakingData';

// Components
import { Navbar, NavTab } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { VocabularyView } from './components/VocabularyView';
import { ListeningView } from './components/ListeningView';
import { GrammarView } from './components/GrammarView';
import { ReadingView } from './components/ReadingView';
import { SpeakingView } from './components/SpeakingView';
import { ProgressView } from './components/ProgressView';
import { SettingsView } from './components/SettingsView';
import { TTSProvider } from './context/TTSContext';
import { GlobalTTSPlayer } from './components/GlobalTTSPlayer';
import { UserSettings } from './types';

const CUSTOM_LESSONS_KEY = 'my_english_custom_lessons_v1';

export default function App() {
  const [progress, setProgress] = useState<UserProgress>(() => loadUserProgress());
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Listening lessons (initial + custom user created)
  const [listeningLessons, setListeningLessons] = useState<ListeningLesson[]>(() => {
    try {
      const stored = localStorage.getItem(CUSTOM_LESSONS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ListeningLesson[];
        return parsed;
      }
    } catch {}
    return INITIAL_LISTENING_LESSONS;
  });

  // Save progress updates
  const handleUpdateProgress = (updated: UserProgress) => {
    setProgress(updated);
    saveUserProgress(updated);
  };

  // Activity logger helper
  const handleLogActivity = (title: string, titleZh: string, details?: string) => {
    const updated = logActivity(progress, {
      type: currentTab as any,
      title,
      titleZh,
      details,
    });
    setProgress(updated);
  };

  // Update listening lessons
  const handleUpdateListeningLessons = (updated: ListeningLesson[]) => {
    setListeningLessons(updated);
    try {
      localStorage.setItem(CUSTOM_LESSONS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save custom lessons', e);
    }
  };

  // Study timer effect
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setProgress((prev) => {
          const newSeconds = prev.todayStudySeconds + 1;
          const todayKey = new Date().toISOString().split('T')[0];
          const newWeekly = {
            ...prev.weeklyMinutes,
            [todayKey]: Math.floor(newSeconds / 60),
          };
          const updated = {
            ...prev,
            todayStudySeconds: newSeconds,
            weeklyMinutes: newWeekly,
          };
          saveUserProgress(updated);
          return updated;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning]);

  const handleToggleTimer = () => {
    setIsTimerRunning(!isTimerRunning);
  };

  const handleUpdateUserSettings = (updatedSettings: Partial<UserSettings>) => {
    const updated = {
      ...progress,
      settings: {
        ...progress.settings,
        ...updatedSettings,
      },
    };
    handleUpdateProgress(updated);
  };

  const handleResetProgress = () => {
    const reset = { ...DEFAULT_PROGRESS, settings: progress.settings };
    setProgress(reset);
    saveUserProgress(reset);
  };

  return (
    <TTSProvider userSettings={progress.settings} onUpdateUserSettings={handleUpdateUserSettings}>
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
        
        {/* Strict 3-zone Top Bar */}
        <Navbar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          streak={progress.streak}
          todaySeconds={progress.todayStudySeconds}
          goalMinutes={progress.settings.dailyGoalMinutes}
          isTimerRunning={isTimerRunning}
          onToggleTimer={handleToggleTimer}
        />

        {/* Main Content Container with Desktop Baseline */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          
          {currentTab === 'dashboard' && (
            <DashboardView
              progress={progress}
              totalWordsCount={VOCABULARY_LIST.length}
              onNavigate={setCurrentTab}
              onToggleTimer={handleToggleTimer}
              isTimerRunning={isTimerRunning}
            />
          )}

          {currentTab === 'vocabulary' && (
            <VocabularyView
              vocabulary={VOCABULARY_LIST}
              progress={progress}
              onUpdateProgress={handleUpdateProgress}
              onLogActivity={handleLogActivity}
            />
          )}

          {currentTab === 'listening' && (
            <ListeningView
              lessons={listeningLessons}
              onUpdateLessons={handleUpdateListeningLessons}
              progress={progress}
              onUpdateProgress={handleUpdateProgress}
              onLogActivity={handleLogActivity}
            />
          )}

          {currentTab === 'grammar' && (
            <GrammarView
              lessons={GRAMMAR_LESSONS}
              progress={progress}
              onUpdateProgress={handleUpdateProgress}
              onLogActivity={handleLogActivity}
            />
          )}

          {currentTab === 'reading' && (
            <ReadingView
              passages={READING_PASSAGES}
              progress={progress}
              onUpdateProgress={handleUpdateProgress}
              onLogActivity={handleLogActivity}
            />
          )}

          {currentTab === 'speaking' && (
            <SpeakingView
              items={SPEAKING_ITEMS}
              progress={progress}
              onUpdateProgress={handleUpdateProgress}
              onLogActivity={handleLogActivity}
            />
          )}

          {currentTab === 'progress' && (
            <ProgressView
              progress={progress}
              totalWordsCount={VOCABULARY_LIST.length}
              totalGrammarCount={GRAMMAR_LESSONS.length}
              totalReadingCount={READING_PASSAGES.length}
              totalListeningCount={listeningLessons.length}
              onResetProgress={handleResetProgress}
              onLogActivity={handleLogActivity}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsView
              progress={progress}
              onUpdateProgress={handleUpdateProgress}
              onLogActivity={handleLogActivity}
            />
          )}

        </main>

        {/* Quiet Footer */}
        <footer className="mt-auto border-t border-slate-200/80 bg-white py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              <span className="font-semibold text-slate-700">My English</span> · Personal English Learning Platform (CEFR A2 → B1)
            </div>
            <div className="flex items-center gap-4 text-slate-400">
              <span>15–30 min Daily Habit</span>
              <span aria-hidden="true">·</span>
              <span>Bilingual Support (简体中文)</span>
              <span aria-hidden="true">·</span>
              <button
                onClick={() => setCurrentTab('settings')}
                className="hover:text-slate-600 cursor-pointer"
              >
                Preferences
              </button>
            </div>
          </div>
        </footer>

        {/* Global Floating Natural TTS Player */}
        <GlobalTTSPlayer />

      </div>
    </TTSProvider>
  );
}
