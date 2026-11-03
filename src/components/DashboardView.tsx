import React from 'react';
import { UserProgress } from '../types';
import { NavTab } from './Navbar';
import { 
  Flame, 
  Timer, 
  BookOpen, 
  CheckCircle2, 
  TrendingUp, 
  ArrowRight, 
  Volume2, 
  Sparkles,
  Headphones,
  Languages,
  FileText,
  Mic,
  Clock
} from 'lucide-react';
import { speakText } from '../services/speech';

interface DashboardViewProps {
  progress: UserProgress;
  totalWordsCount: number;
  onNavigate: (tab: NavTab) => void;
  onToggleTimer: () => void;
  isTimerRunning: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  progress,
  totalWordsCount,
  onNavigate,
  onToggleTimer,
  isTimerRunning,
}) => {
  const goalMinutes = progress.settings.dailyGoalMinutes || 15;
  const todayMinutes = Math.floor(progress.todayStudySeconds / 60);
  const goalPercent = Math.min(100, Math.round((todayMinutes / goalMinutes) * 100));

  const learnedWordsCount = progress.learnedWords.length;
  const needPracticeCount = progress.needPracticeWords.length;
  
  const grammarCount = progress.completedGrammar.length; // out of 12
  const readingCount = progress.completedReading.length; // out of 10
  const listeningCount = progress.completedListening.length; // out of 3+
  const speakingKeys = Object.keys(progress.speakingPractices || {});
  const speakingCount = speakingKeys.length;

  const totalLessonsDone = grammarCount + readingCount + listeningCount;

  // Calculate overall progress towards CEFR B1 milestone
  // Weight: vocab 30%, grammar 25%, reading 20%, listening 15%, speaking 10%
  const vocabRatio = Math.min(1, learnedWordsCount / totalWordsCount);
  const grammarRatio = Math.min(1, grammarCount / 12);
  const readingRatio = Math.min(1, readingCount / 10);
  const listeningRatio = Math.min(1, listeningCount / 3);
  const speakingRatio = Math.min(1, speakingCount / 10);
  
  const overallB1Progress = Math.round(
    (vocabRatio * 0.3 + grammarRatio * 0.25 + readingRatio * 0.2 + listeningRatio * 0.15 + speakingRatio * 0.1) * 100
  );

  const dailyQuote = {
    en: 'Consistency is the key to mastering any language.',
    zh: '坚持与持之以恒是掌握任何语言的钥匙。',
    context: 'Proverb · 每日箴言',
  };

  const handlePlayQuoteAudio = () => {
    speakText(dailyQuote.en, {
      rate: progress.settings.speechRate,
      accent: progress.settings.voiceAccent,
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      
      {/* 1. Welcome Hero Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="flex items-center gap-2 text-xs font-semibold text-sky-600 mb-2 tracking-wide uppercase">
            <span>CEFR A2 Elementary</span>
            <span aria-hidden="true">·</span>
            <span className="text-slate-500 font-normal">Progressing towards B1 Intermediate</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Welcome back, {progress.settings.userName}! 👋
          </h1>
          <p className="mt-2 text-slate-600 text-sm sm:text-base leading-relaxed">
            Ready for your 15–30 minute daily English practice? Consistent small steps yield fluency.
            <span className="block text-xs sm:text-sm text-slate-400 mt-0.5">准备好今天的日常英语练习了吗？每天坚持一步，自然流利自如。</span>
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('vocabulary')}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-medium text-sm rounded-xl shadow-xs transition-all cursor-pointer whitespace-nowrap"
            >
              <span>Continue Learning</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onToggleTimer}
              className={`inline-flex items-center gap-2 px-4 py-2.5 font-medium text-sm rounded-xl border transition-all whitespace-nowrap cursor-pointer ${
                isTimerRunning
                  ? 'bg-amber-50 text-amber-700 border-amber-300'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Timer className="w-4 h-4 text-sky-600" />
              <span>{isTimerRunning ? 'Pause Study Timer' : 'Start 15m Study Timer'}</span>
            </button>
          </div>
        </div>

        {/* Ambient background decoration */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-linear-to-l from-sky-50/70 to-transparent pointer-events-none hidden md:block" />
      </div>

      {/* 2. Key Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1: Daily Study Goal */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Daily Goal (今日目标)</span>
            <Clock className="w-4 h-4 text-sky-500" />
          </div>
          <div className="mt-4">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold text-slate-900 tabular-nums">
                {todayMinutes} <span className="text-xs font-normal text-slate-400">/ {goalMinutes} min</span>
              </span>
              <span className="text-xs font-semibold text-sky-600 tabular-nums">{goalPercent}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 mt-2 overflow-hidden">
              <div 
                className="bg-sky-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${goalPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Metric 2: Streak */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Study Streak (打卡天数)</span>
            <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-slate-900 tabular-nums">{progress.streak}</span>
              <span className="text-xs text-slate-500 font-medium">consecutive days</span>
            </div>
            <p className="text-[12px] text-slate-400 mt-1">Keep it up tomorrow!</p>
          </div>
        </div>

        {/* Metric 3: Total Vocabulary */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Words Mastered (已掌握)</span>
            <BookOpen className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-4">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold text-slate-900 tabular-nums">
                {learnedWordsCount} <span className="text-xs font-normal text-slate-400">/ {totalWordsCount}</span>
              </span>
              {needPracticeCount > 0 && (
                <span className="text-[11px] text-amber-600 font-medium">{needPracticeCount} to review</span>
              )}
            </div>
            <p className="text-[12px] text-slate-400 mt-1">Practical A2 core vocabulary</p>
          </div>
        </div>

        {/* Metric 4: Overall B1 Progress */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">B1 Target Progress (总进度)</span>
            <TrendingUp className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-4">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold text-slate-900 tabular-nums">{overallB1Progress}%</span>
              <span className="text-[11px] text-indigo-600 font-semibold">CEFR B1</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 mt-2 overflow-hidden">
              <div 
                className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${overallB1Progress}%` }}
              />
            </div>
          </div>
        </div>

      </div>

      {/* 3. Daily Recommendation & Quote Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Daily Recommended Lesson Card */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
              <span className="font-semibold text-sky-600">Daily Recommendation · 今日推荐课程</span>
              <span>15 min study</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              Grammar Master: Past Simple vs Present Perfect
            </h2>
            <p className="text-sm text-slate-600 mt-1 leading-relaxed">
              Understand when to use specific past time indicators (yesterday, ago) versus general life experiences (ever, already).
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              掌握一般过去时与现在完成时的关键界限，彻底告别中式时态混淆。
            </p>

            <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block text-[11px]">Structures</span>
                <span className="font-semibold text-slate-800">have + V3</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block text-[11px]">Exercises</span>
                <span className="font-semibold text-slate-800">5 interactive</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block text-[11px]">CEFR Level</span>
                <span className="font-semibold text-slate-800">A2 Elementary</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">Completed {grammarCount} of 12 grammar topics</span>
            <button
              onClick={() => onNavigate('grammar')}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-sky-600 bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors cursor-pointer"
            >
              <span>Start Grammar Lesson</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Daily Phrase of the Day */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
              <span className="font-semibold text-amber-600 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                Phrase of the Day
              </span>
              <span>Daily inspiration</span>
            </div>

            <blockquote className="text-base font-semibold text-slate-800 leading-snug">
              “{dailyQuote.en}”
            </blockquote>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              {dailyQuote.zh}
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-400">{dailyQuote.context}</span>
            <button
              onClick={handlePlayQuoteAudio}
              className="p-2 text-slate-600 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
              title="Listen to native pronunciation"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

      {/* 4. Quick Module Launchers */}
      <div>
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">
          Learning Modules · 核心学习模块
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          
          <button
            onClick={() => onNavigate('vocabulary')}
            className="p-4 rounded-xl bg-white border border-slate-200/80 hover:border-sky-300 hover:shadow-xs transition-all text-left group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center group-hover:bg-sky-500 group-hover:text-white transition-colors mb-3">
              <BookOpen className="w-4 h-4" />
            </div>
            <span className="font-semibold text-sm text-slate-800 block group-hover:text-sky-600 transition-colors">
              Vocabulary
            </span>
            <span className="text-xs text-slate-400 block mt-0.5">50+ words · 词汇库</span>
          </button>

          <button
            onClick={() => onNavigate('listening')}
            className="p-4 rounded-xl bg-white border border-slate-200/80 hover:border-sky-300 hover:shadow-xs transition-all text-left group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-500 group-hover:text-white transition-colors mb-3">
              <Headphones className="w-4 h-4" />
            </div>
            <span className="font-semibold text-sm text-slate-800 block group-hover:text-purple-600 transition-colors">
              Listening
            </span>
            <span className="text-xs text-slate-400 block mt-0.5">MP3 Upload · 听力训练</span>
          </button>

          <button
            onClick={() => onNavigate('grammar')}
            className="p-4 rounded-xl bg-white border border-slate-200/80 hover:border-sky-300 hover:shadow-xs transition-all text-left group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors mb-3">
              <Languages className="w-4 h-4" />
            </div>
            <span className="font-semibold text-sm text-slate-800 block group-hover:text-emerald-600 transition-colors">
              Grammar
            </span>
            <span className="text-xs text-slate-400 block mt-0.5">12 Topics · 语法专练</span>
          </button>

          <button
            onClick={() => onNavigate('reading')}
            className="p-4 rounded-xl bg-white border border-slate-200/80 hover:border-sky-300 hover:shadow-xs transition-all text-left group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-colors mb-3">
              <FileText className="w-4 h-4" />
            </div>
            <span className="font-semibold text-sm text-slate-800 block group-hover:text-amber-600 transition-colors">
              Reading
            </span>
            <span className="text-xs text-slate-400 block mt-0.5">10 Passages · 阅读理解</span>
          </button>

          <button
            onClick={() => onNavigate('speaking')}
            className="p-4 rounded-xl bg-white border border-slate-200/80 hover:border-sky-300 hover:shadow-xs transition-all text-left group cursor-pointer col-span-2 sm:col-span-1"
          >
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center group-hover:bg-rose-500 group-hover:text-white transition-colors mb-3">
              <Mic className="w-4 h-4" />
            </div>
            <span className="font-semibold text-sm text-slate-800 block group-hover:text-rose-600 transition-colors">
              Speaking
            </span>
            <span className="text-xs text-slate-400 block mt-0.5">Speech Recognition · 口语</span>
          </button>

        </div>
      </div>

      {/* 5. Recent Learning Activities */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">
            Recent Activities · 最近学习记录
          </h3>
          <button
            onClick={() => onNavigate('progress')}
            className="text-xs font-medium text-sky-600 hover:underline cursor-pointer"
          >
            View full progress report →
          </button>
        </div>

        {progress.activities && progress.activities.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {progress.activities.slice(0, 5).map((act) => {
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
                      <p className="text-sm font-medium text-slate-800">
                        {act.title}
                      </p>
                      <p className="text-xs text-slate-400">
                        {act.titleZh} {act.details ? `· ${act.details}` : ''}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 whitespace-nowrap tabular-nums">
                    {dateStr}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center text-slate-400 text-sm">
            No learning activities recorded yet. Start practicing with vocabulary or grammar!
          </div>
        )}
      </div>

    </div>
  );
};
