import React, { useState } from 'react';
import { UserProgress } from '../types';
import { 
  Flame, 
  Clock, 
  BookOpen, 
  Languages, 
  FileText, 
  Headphones, 
  Mic, 
  TrendingUp, 
  CheckCircle2, 
  RotateCcw, 
  Award,
  Calendar,
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import { DEFAULT_PROGRESS } from '../services/storage';
import { TTSButton } from './TTSButton';

interface ProgressViewProps {
  progress: UserProgress;
  totalWordsCount: number;
  totalGrammarCount: number;
  totalReadingCount: number;
  totalListeningCount: number;
  onResetProgress: () => void;
  onLogActivity: (title: string, titleZh: string, details?: string) => void;
}

export const ProgressView: React.FC<ProgressViewProps> = ({
  progress,
  totalWordsCount,
  totalGrammarCount,
  totalReadingCount,
  totalListeningCount,
  onResetProgress,
  onLogActivity,
}) => {
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const learnedWords = progress.learnedWords.length;
  const needPracticeWords = progress.needPracticeWords.length;
  const grammarCount = progress.completedGrammar.length;
  const readingCount = progress.completedReading.length;
  const listeningCount = progress.completedListening.length;
  const speakingKeys = Object.keys(progress.speakingPractices || {});
  const speakingCount = speakingKeys.length;

  // Calculate average scores
  const grammarScoresArr = Object.values(progress.grammarScores || {});
  const avgGrammarScore = grammarScoresArr.length > 0
    ? Math.round(grammarScoresArr.reduce((a, b) => a + b, 0) / grammarScoresArr.length)
    : 0;

  const readingScoresArr = Object.values(progress.readingScores || {});
  const avgReadingScore = readingScoresArr.length > 0
    ? Math.round(readingScoresArr.reduce((a, b) => a + b, 0) / readingScoresArr.length)
    : 0;

  const speakingScoresArr = Object.values(progress.speakingPractices || {}).map((s) => s.bestScore);
  const avgSpeakingScore = speakingScoresArr.length > 0
    ? Math.round(speakingScoresArr.reduce((a, b) => a + b, 0) / speakingScoresArr.length)
    : 0;

  // Overall CEFR A2 -> B1 readiness
  const vocabRatio = Math.min(1, learnedWords / totalWordsCount);
  const grammarRatio = Math.min(1, grammarCount / totalGrammarCount);
  const readingRatio = Math.min(1, readingCount / totalReadingCount);
  const listeningRatio = Math.min(1, listeningCount / totalListeningCount);
  const speakingRatio = Math.min(1, speakingCount / 10);

  const overallPercent = Math.round(
    (vocabRatio * 0.3 + grammarRatio * 0.25 + readingRatio * 0.2 + listeningRatio * 0.15 + speakingRatio * 0.1) * 100
  );

  // 7-Day study history
  const today = new Date();
  const past7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(today.getDate() - (6 - i));
    const key = d.toISOString().split('T')[0];
    const dayLabel = d.toLocaleDateString(undefined, { weekday: 'short' });
    const minutes = progress.weeklyMinutes[key] || (key === today.toISOString().split('T')[0] ? Math.floor(progress.todayStudySeconds / 60) : 0);
    return { date: key, label: dayLabel, minutes };
  });

  const maxWeeklyMin = Math.max(30, ...past7Days.map((d) => d.minutes));

  const handleConfirmReset = () => {
    onResetProgress();
    setShowResetConfirm(false);
    onLogActivity('Reset Learning Progress', '重置学习进度', 'Progress restored to clean slate');
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Learning Progress & Analytics · 学习成就与进度
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            CEFR A2 milestone tracking, skill mastery radar, study time chart, and activity logs.
          </p>
        </div>

        <button
          onClick={() => setShowResetConfirm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Progress</span>
        </button>
      </div>

      {/* 2. Top Summary KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Streak */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Study Streak</span>
            <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900 mt-3 tabular-nums">
            {progress.streak} <span className="text-xs font-normal text-slate-400">days</span>
          </p>
          <p className="text-[12px] text-slate-400 mt-1">Continuous daily learning</p>
        </div>

        {/* Total Time */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Today’s Study Time</span>
            <Clock className="w-4 h-4 text-sky-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900 mt-3 tabular-nums">
            {Math.floor(progress.todayStudySeconds / 60)} <span className="text-xs font-normal text-slate-400">min</span>
          </p>
          <p className="text-[12px] text-slate-400 mt-1">Goal: {progress.settings.dailyGoalMinutes} min/day</p>
        </div>

        {/* Total Mastered Words */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Mastered Vocabulary</span>
            <BookOpen className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900 mt-3 tabular-nums">
            {learnedWords} <span className="text-xs font-normal text-slate-400">/ {totalWordsCount}</span>
          </p>
          <p className="text-[12px] text-slate-400 mt-1">{needPracticeWords} in review queue</p>
        </div>

        {/* B1 Target Progress */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Overall B1 Progress</span>
            <TrendingUp className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900 mt-3 tabular-nums">
            {overallPercent}%
          </p>
          <p className="text-[12px] text-slate-400 mt-1">CEFR A2 → B1 milestone</p>
        </div>

      </div>

      {/* 3. Skill Mastery Breakdown & Weekly Bar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Skill Progress Breakdown */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900">
              Module Completion & Average Scores
            </h3>
            <span className="text-xs text-slate-400">CEFR A2 Framework</span>
          </div>

          <div className="space-y-4 text-xs">
            
            {/* Vocabulary */}
            <div>
              <div className="flex items-center justify-between mb-1.5 font-medium">
                <span className="flex items-center gap-1.5 text-slate-800">
                  <BookOpen className="w-4 h-4 text-sky-600" />
                  Vocabulary Words ({learnedWords}/{totalWordsCount})
                </span>
                <span className="font-semibold text-slate-700 tabular-nums">
                  {Math.round(vocabRatio * 100)}%
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-sky-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${vocabRatio * 100}%` }}
                />
              </div>
            </div>

            {/* Grammar */}
            <div>
              <div className="flex items-center justify-between mb-1.5 font-medium">
                <span className="flex items-center gap-1.5 text-slate-800">
                  <Languages className="w-4 h-4 text-emerald-600" />
                  Grammar Topics ({grammarCount}/{totalGrammarCount}) · Avg Score: {avgGrammarScore}%
                </span>
                <span className="font-semibold text-slate-700 tabular-nums">
                  {Math.round(grammarRatio * 100)}%
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${grammarRatio * 100}%` }}
                />
              </div>
            </div>

            {/* Reading */}
            <div>
              <div className="flex items-center justify-between mb-1.5 font-medium">
                <span className="flex items-center gap-1.5 text-slate-800">
                  <FileText className="w-4 h-4 text-amber-600" />
                  Reading Passages ({readingCount}/{totalReadingCount}) · Avg Score: {avgReadingScore}%
                </span>
                <span className="font-semibold text-slate-700 tabular-nums">
                  {Math.round(readingRatio * 100)}%
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-amber-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${readingRatio * 100}%` }}
                />
              </div>
            </div>

            {/* Listening */}
            <div>
              <div className="flex items-center justify-between mb-1.5 font-medium">
                <span className="flex items-center gap-1.5 text-slate-800">
                  <Headphones className="w-4 h-4 text-purple-600" />
                  Listening Lessons ({listeningCount}/{totalListeningCount})
                </span>
                <span className="font-semibold text-slate-700 tabular-nums">
                  {Math.round(listeningRatio * 100)}%
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${listeningRatio * 100}%` }}
                />
              </div>
            </div>

            {/* Speaking */}
            <div>
              <div className="flex items-center justify-between mb-1.5 font-medium">
                <span className="flex items-center gap-1.5 text-slate-800">
                  <Mic className="w-4 h-4 text-rose-600" />
                  Speaking Sentences ({speakingCount} practiced) · Avg: {avgSpeakingScore}%
                </span>
                <span className="font-semibold text-slate-700 tabular-nums">
                  {Math.round(speakingRatio * 100)}%
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-rose-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${speakingRatio * 100}%` }}
                />
              </div>
            </div>

          </div>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-600 flex items-center justify-between">
            <span className="font-medium text-slate-800">CEFR Target: B1 Intermediate</span>
            <span className="text-slate-500">Requires 80%+ across all modules</span>
          </div>
        </div>

        {/* 7-Day Study Minutes Bar Chart */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 space-y-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-sky-600" />
                <span>Last 7 Days Study Time (学习时长)</span>
              </h3>
              <span className="text-xs text-slate-400">Minutes / Day</span>
            </div>

            {/* Simple Clean SVG/CSS Bar Chart */}
            <div className="mt-6 flex items-end justify-between gap-3 h-40 pt-6 px-2">
              {past7Days.map((d, i) => {
                const heightPercent = Math.max(8, Math.round((d.minutes / maxWeeklyMin) * 100));
                const isToday = i === 6;

                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                    <span className="text-[11px] font-semibold text-slate-600 tabular-nums">
                      {d.minutes}m
                    </span>
                    <div className="w-full max-w-[36px] bg-slate-100 rounded-xl h-full flex items-end p-1 overflow-hidden">
                      <div
                        className={`w-full rounded-lg transition-all duration-300 ${
                          isToday ? 'bg-sky-500 shadow-xs' : 'bg-sky-300'
                        }`}
                        style={{ height: `${heightPercent}%` }}
                      />
                    </div>
                    <span className={`text-[11px] font-medium ${isToday ? 'text-sky-600 font-bold' : 'text-slate-400'}`}>
                      {d.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-xs text-slate-400 text-center pt-3 border-t border-slate-100">
            Target: 15–30 minutes every day for steady language acquisition.
          </p>
        </div>

      </div>

      {/* 4. Complete Learning Activity History */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 space-y-4">
        <h3 className="text-base font-bold text-slate-900">
          Learning Activity Log · 详细练习记录
        </h3>

        {progress.activities && progress.activities.length > 0 ? (
          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
            {progress.activities.map((act) => {
              const dateStr = new Date(act.timestamp).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div key={act.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {act.title}
                      </p>
                      <p className="text-xs text-slate-400">
                        {act.titleZh} {act.details ? `· ${act.details}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {act.details && (
                      <TTSButton text={act.details} size="xs" variant="ghost" title={`Listen to ${act.details}`} />
                    )}
                    <span className="text-xs text-slate-400 whitespace-nowrap font-mono">
                      {dateStr}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-center text-xs text-slate-400 py-6">No activities logged yet.</p>
        )}
      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-xl border border-slate-200 text-center animate-in fade-in duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-slate-900">Reset Learning Progress?</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                This will clear your learned words, test scores, and streak data. This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReset}
                className="flex-1 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs cursor-pointer"
              >
                Yes, Reset All
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
