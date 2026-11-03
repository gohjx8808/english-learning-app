import React, { useState } from 'react';
import { GrammarLesson, GrammarExercise, UserProgress } from '../types';
import { 
  CheckCircle2, 
  BookOpen, 
  HelpCircle, 
  Volume2, 
  AlertTriangle, 
  Check, 
  X, 
  RotateCcw,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { speakText, playSound } from '../services/speech';
import confetti from 'canvas-confetti';

interface GrammarViewProps {
  lessons: GrammarLesson[];
  progress: UserProgress;
  onUpdateProgress: (updated: UserProgress) => void;
  onLogActivity: (title: string, titleZh: string, details?: string) => void;
}

type GrammarTab = 'explanation' | 'examples' | 'mistakes' | 'exercises';

export const GrammarView: React.FC<GrammarViewProps> = ({
  lessons,
  progress,
  onUpdateProgress,
  onLogActivity,
}) => {
  const [selectedLessonId, setSelectedLessonId] = useState<string>(lessons[0]?.id || '');
  const activeLesson = lessons.find((l) => l.id === selectedLessonId) || lessons[0];

  const [activeTab, setActiveTab] = useState<GrammarTab>('explanation');

  // Exercise states for active lesson
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [submittedExercises, setSubmittedExercises] = useState(false);

  const handlePronounce = (text: string) => {
    speakText(text, {
      voiceId: progress.settings.voiceId || 'us-female',
      speed: progress.settings.speechRate,
      accent: progress.settings.voiceAccent,
    });
  };

  const isCompleted = progress.completedGrammar.includes(activeLesson.id);

  const handleSelectOption = (exerciseId: string, option: string) => {
    if (submittedExercises) return;
    setUserAnswers((prev) => ({ ...prev, [exerciseId]: option }));
  };

  const handleResetExercises = () => {
    setUserAnswers({});
    setSubmittedExercises(false);
  };

  const handleSubmitExercises = () => {
    setSubmittedExercises(true);

    let correctCount = 0;
    activeLesson.exercises.forEach((ex) => {
      if (userAnswers[ex.id] === ex.correctAnswer) {
        correctCount++;
      }
    });

    const scorePercent = Math.round((correctCount / activeLesson.exercises.length) * 100);

    if (scorePercent >= 80) {
      playSound('complete');
      confetti({ particleCount: 60, spread: 50, origin: { y: 0.6 } });
    } else if (scorePercent >= 60) {
      playSound('correct');
    } else {
      playSound('wrong');
    }

    let updatedCompleted = [...progress.completedGrammar];
    if (!updatedCompleted.includes(activeLesson.id)) {
      updatedCompleted.push(activeLesson.id);
    }

    const updatedScores = {
      ...progress.grammarScores,
      [activeLesson.id]: scorePercent,
    };

    onUpdateProgress({
      ...progress,
      completedGrammar: updatedCompleted,
      grammarScores: updatedScores,
    });

    onLogActivity(
      `Grammar Exercises: ${activeLesson.title}`,
      `完成语法专练：${activeLesson.titleZh}`,
      `Score: ${correctCount}/${activeLesson.exercises.length} (${scorePercent}%)`
    );
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Grammar Mastery · A2 核心语法
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Structured explanations, formulas, common pitfalls, and 5 interactive exercises per topic.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl">
          <span>Completed:</span>
          <span className="text-sky-600 tabular-nums">
            {progress.completedGrammar.length} / {lessons.length}
          </span>
        </div>
      </div>

      {/* 2. Main 2-Column Split: Topic Navigator & Lesson Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Column: Topics Sidebar */}
        <div className="lg:col-span-1 space-y-2 bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 block mb-2">
            12 Grammar Topics · 语法专题
          </span>

          <div className="space-y-1">
            {lessons.map((lesson, idx) => {
              const isSelected = lesson.id === activeLesson.id;
              const completed = progress.completedGrammar.includes(lesson.id);
              const score = progress.grammarScores[lesson.id];

              return (
                <button
                  key={lesson.id}
                  onClick={() => {
                    setSelectedLessonId(lesson.id);
                    setUserAnswers({});
                    setSubmittedExercises(false);
                    setActiveTab('explanation');
                  }}
                  className={`w-full p-2.5 rounded-xl text-left transition-all cursor-pointer flex items-center justify-between text-xs ${
                    isSelected
                      ? 'bg-sky-500 text-white font-semibold shadow-xs'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] shrink-0 font-bold ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {idx + 1}
                    </span>
                    <span className="truncate">{lesson.title}</span>
                  </div>

                  {completed && (
                    <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-emerald-500'}`} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right 3 Columns: Active Lesson Body */}
        <div className="lg:col-span-3 space-y-4">
          
          {/* Lesson Header Card */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                    {activeLesson.title}
                  </h2>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-sky-50 text-sky-700">
                    {activeLesson.level}
                  </span>
                  {isCompleted && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Completed
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold text-sky-800 mt-1">
                  {activeLesson.titleZh}
                </p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {activeLesson.summary} · {activeLesson.summaryZh}
                </p>
              </div>
            </div>

            {/* Inner Subtabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto text-xs font-medium">
              <button
                onClick={() => setActiveTab('explanation')}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === 'explanation'
                    ? 'bg-white text-sky-700 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                1. Explanation & Rules
              </button>
              <button
                onClick={() => setActiveTab('examples')}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === 'examples'
                    ? 'bg-white text-sky-700 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                2. Examples (Pos / Neg / Q)
              </button>
              <button
                onClick={() => setActiveTab('mistakes')}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === 'mistakes'
                    ? 'bg-white text-sky-700 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                3. Common Mistakes
              </button>
              <button
                onClick={() => setActiveTab('exercises')}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1 ${
                  activeTab === 'exercises'
                    ? 'bg-white text-sky-700 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>4. Exercises</span>
                <span className="text-[10px] px-1.5 py-0.2 bg-sky-100 text-sky-700 rounded-full font-bold">5</span>
              </button>
            </div>
          </div>

          {/* Subtab Content 1: Explanation & Structures */}
          {activeTab === 'explanation' && (
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 space-y-6">
              
              {/* English Explanation */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Grammar Rule · 语法释义
                </span>
                <p className="text-sm text-slate-800 leading-relaxed font-medium">
                  {activeLesson.explanationEn}
                </p>
                <p className="text-xs text-slate-500 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                  {activeLesson.explanationZh}
                </p>
              </div>

              {/* Sentence Structures / Formulas */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Sentence Structures & Formulas · 句型结构
                </span>
                <div className="space-y-2">
                  {activeLesson.structures.map((st, i) => (
                    <div
                      key={i}
                      className="p-3 bg-sky-50/70 border border-sky-100 rounded-xl text-xs sm:text-sm font-mono text-sky-900 flex items-center gap-2"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                      <span>{st}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setActiveTab('examples')}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-600 hover:underline cursor-pointer"
                >
                  <span>See Examples (例句)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          )}

          {/* Subtab Content 2: Positive / Negative / Question Examples */}
          {activeTab === 'examples' && (
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 space-y-6">
              
              {/* Positive Examples */}
              <div className="space-y-2.5">
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">
                  Positive Examples · 肯定例句
                </span>
                <div className="space-y-2">
                  {activeLesson.positiveExamples.map((ex, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start justify-between gap-3 text-xs sm:text-sm"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">{ex.en}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{ex.zh}</p>
                      </div>
                      <button
                        onClick={() => handlePronounce(ex.en)}
                        className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-white rounded-lg transition-colors cursor-pointer shrink-0"
                        title="Pronounce"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Negative Examples */}
              <div className="space-y-2.5">
                <span className="text-xs font-bold text-rose-700 uppercase tracking-wider block">
                  Negative Examples · 否定例句
                </span>
                <div className="space-y-2">
                  {activeLesson.negativeExamples.map((ex, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start justify-between gap-3 text-xs sm:text-sm"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">{ex.en}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{ex.zh}</p>
                      </div>
                      <button
                        onClick={() => handlePronounce(ex.en)}
                        className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-white rounded-lg transition-colors cursor-pointer shrink-0"
                        title="Pronounce"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Question Examples */}
              <div className="space-y-2.5">
                <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider block">
                  Question Examples · 疑问例句
                </span>
                <div className="space-y-2">
                  {activeLesson.questionExamples.map((ex, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start justify-between gap-3 text-xs sm:text-sm"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">{ex.en}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{ex.zh}</p>
                      </div>
                      <button
                        onClick={() => handlePronounce(ex.en)}
                        className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-white rounded-lg transition-colors cursor-pointer shrink-0"
                        title="Pronounce"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setActiveTab('mistakes')}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-600 hover:underline cursor-pointer"
                >
                  <span>Review Common Mistakes (常见易错点)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          )}

          {/* Subtab Content 3: Common Mistakes */}
          {activeTab === 'mistakes' && (
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 space-y-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Common Mistakes to Avoid · 典型错误与警示
              </span>

              <div className="space-y-3">
                {activeLesson.commonMistakes.map((mis, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs sm:text-sm"
                  >
                    <div className="flex items-start gap-2 text-rose-600 line-through">
                      <X className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{mis.wrong}</span>
                    </div>
                    <div className="flex items-start gap-2 text-emerald-700 font-semibold">
                      <Check className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{mis.right}</span>
                    </div>
                    <p className="text-xs text-slate-600 pt-1 border-t border-slate-200/60 leading-relaxed">
                      💡 {mis.noteEn} ({mis.noteZh})
                    </p>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setActiveTab('exercises')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-xs"
                >
                  <span>Start 5 Exercises (进入专练)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Subtab Content 4: Interactive Exercises */}
          {activeTab === 'exercises' && (
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 space-y-6">
              
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Interactive Exercises · 课后针对练习
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Select the best option for each question and submit for instant feedback.
                  </p>
                </div>

                {submittedExercises && (
                  <button
                    onClick={handleResetExercises}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer font-medium"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Try Again</span>
                  </button>
                )}
              </div>

              <div className="space-y-6">
                {activeLesson.exercises.map((ex, index) => {
                  const selected = userAnswers[ex.id];
                  const isAnswered = submittedExercises;
                  const isCorrect = selected === ex.correctAnswer;

                  return (
                    <div
                      key={ex.id}
                      className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-slate-900">
                            {index + 1}. {ex.question}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">{ex.questionZh}</p>
                        </div>
                        {isAnswered && (
                          <div className="shrink-0">
                            {isCorrect ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                                <Check className="w-3.5 h-3.5" /> Correct
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                                <X className="w-3.5 h-3.5" /> Incorrect
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Options */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {ex.options.map((opt) => {
                          const isOptSelected = selected === opt;
                          let optStyle = 'bg-white border-slate-200 text-slate-700 hover:border-slate-300';

                          if (isAnswered) {
                            if (opt === ex.correctAnswer) {
                              optStyle = 'bg-emerald-50 border-emerald-400 text-emerald-900 font-semibold';
                            } else if (isOptSelected) {
                              optStyle = 'bg-rose-50 border-rose-400 text-rose-900';
                            } else {
                              optStyle = 'bg-white border-slate-200 text-slate-400 opacity-60';
                            }
                          } else if (isOptSelected) {
                            optStyle = 'bg-sky-50 border-sky-400 text-sky-900 font-semibold shadow-2xs';
                          }

                          return (
                            <button
                              key={opt}
                              disabled={isAnswered}
                              onClick={() => handleSelectOption(ex.id, opt)}
                              className={`p-3 rounded-xl border text-xs sm:text-sm text-left transition-all cursor-pointer flex items-center justify-between ${optStyle}`}
                            >
                              <span>{opt}</span>
                              {isAnswered && opt === ex.correctAnswer && (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Explanation Callout */}
                      {isAnswered && (
                        <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs text-slate-600 space-y-1 animate-in fade-in duration-150">
                          <p className="font-semibold text-slate-800">Explanation:</p>
                          <p>{ex.explanation}</p>
                          <p className="text-slate-500">{ex.explanationZh}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {!submittedExercises ? (
                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={handleSubmitExercises}
                    disabled={Object.keys(userAnswers).length < activeLesson.exercises.length}
                    className="px-6 py-2.5 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition-all cursor-pointer shadow-xs"
                  >
                    Submit Answers ({Object.keys(userAnswers).length}/{activeLesson.exercises.length})
                  </button>
                </div>
              ) : (
                <div className="p-4 bg-sky-50 rounded-2xl border border-sky-100 flex items-center justify-between text-xs">
                  <div className="text-sky-900 font-medium">
                    Review completed! Results have been recorded in your progress tracker.
                  </div>
                  <button
                    onClick={() => {
                      const currIdx = lessons.findIndex((l) => l.id === activeLesson.id);
                      if (currIdx + 1 < lessons.length) {
                        setSelectedLessonId(lessons[currIdx + 1].id);
                        handleResetExercises();
                        setActiveTab('explanation');
                      }
                    }}
                    className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-semibold cursor-pointer"
                  >
                    Next Lesson →
                  </button>
                </div>
              )}

            </div>
          )}

        </div>

      </div>

    </div>
  );
};
