import React, { useState } from 'react';
import { ReadingPassage, ReadingVocab, UserProgress } from '../types';
import { 
  CheckCircle2, 
  Clock, 
  Volume2, 
  Check, 
  X, 
  BookOpen, 
  RotateCcw, 
  Sparkles,
  HelpCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { speakText, playSound } from '../services/speech';
import confetti from 'canvas-confetti';

interface ReadingViewProps {
  passages: ReadingPassage[];
  progress: UserProgress;
  onUpdateProgress: (updated: UserProgress) => void;
  onLogActivity: (title: string, titleZh: string, details?: string) => void;
}

export const ReadingView: React.FC<ReadingViewProps> = ({
  passages,
  progress,
  onUpdateProgress,
  onLogActivity,
}) => {
  const [selectedPassageId, setSelectedPassageId] = useState<string>(passages[0]?.id || '');
  const activePassage = passages.find((p) => p.id === selectedPassageId) || passages[0];

  const [showChinese, setShowChinese] = useState(true);
  const [inspectedWord, setInspectedWord] = useState<ReadingVocab | null>(null);

  // Comprehension question answers
  const [userAnswers, setUserAnswers] = useState<Record<string, number>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  const isCompleted = progress.completedReading.includes(activePassage.id);

  const handlePronounce = (text: string) => {
    speakText(text, {
      rate: progress.settings.speechRate,
      accent: progress.settings.voiceAccent,
    });
  };

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    if (isSubmitted) return;
    setUserAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  };

  const handleResetQuestions = () => {
    setUserAnswers({});
    setIsSubmitted(false);
  };

  const handleSubmitComprehension = () => {
    setIsSubmitted(true);

    let correctCount = 0;
    activePassage.questions.forEach((q) => {
      if (userAnswers[q.id] === q.correctAnswerIndex) {
        correctCount++;
      }
    });

    const scorePercent = Math.round((correctCount / activePassage.questions.length) * 100);

    if (scorePercent >= 80) {
      playSound('complete');
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
    } else {
      playSound('correct');
    }

    let updatedCompleted = [...progress.completedReading];
    if (!updatedCompleted.includes(activePassage.id)) {
      updatedCompleted.push(activePassage.id);
    }

    const updatedScores = {
      ...progress.readingScores,
      [activePassage.id]: scorePercent,
    };

    onUpdateProgress({
      ...progress,
      completedReading: updatedCompleted,
      readingScores: updatedScores,
    });

    onLogActivity(
      `Completed Reading: ${activePassage.title}`,
      `完成阅读理解：${activePassage.titleZh}`,
      `Score: ${correctCount}/${activePassage.questions.length} (${scorePercent}%)`
    );
  };

  // Helper to highlight words in text
  const renderParagraphWithHighlights = (text: string) => {
    const vocabMap = new Map<string, ReadingVocab>();
    activePassage.vocabulary.forEach((v) => {
      vocabMap.set(v.word.toLowerCase(), v);
    });

    // Tokenize text into words and punctuation
    const tokens = text.split(/(\s+|[.,!?;:"'()])/);

    return tokens.map((token, index) => {
      const cleanToken = token.toLowerCase().replace(/[^a-z]/g, '');
      const match = vocabMap.get(cleanToken);

      if (match) {
        return (
          <button
            key={index}
            onClick={() => setInspectedWord(match)}
            className="inline text-sky-700 bg-sky-50 hover:bg-sky-100 font-semibold px-1 py-0.5 rounded cursor-pointer transition-colors border-b border-sky-300"
            title={`Click to inspect: ${match.meaningZh}`}
          >
            {token}
          </button>
        );
      }

      return <span key={index}>{token}</span>;
    });
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header & Stats */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Reading Comprehension · 阅读理解
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Bilingual everyday passages, highlighted vocabulary lookup, and comprehension checks.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl self-start sm:self-auto">
          <span>Completed Passages:</span>
          <span className="text-sky-600 tabular-nums">
            {progress.completedReading.length} / {passages.length}
          </span>
        </div>
      </div>

      {/* 2. Passages Horizontal Picker */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {passages.map((p, idx) => {
          const isSelected = p.id === activePassage.id;
          const completed = progress.completedReading.includes(p.id);

          return (
            <button
              key={p.id}
              onClick={() => {
                setSelectedPassageId(p.id);
                setUserAnswers({});
                setIsSubmitted(false);
                setInspectedWord(null);
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-all whitespace-nowrap cursor-pointer ${
                isSelected
                  ? 'bg-sky-500 text-white border-sky-600 font-semibold shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200/80 hover:bg-slate-50'
              }`}
            >
              {completed && <CheckCircle2 className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-emerald-500'}`} />}
              <span>{idx + 1}. {p.title}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Main Passage Reader & Comprehension Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Passage Text & Paragraphs */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-6">
            
            {/* Passage Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                    {activePassage.title}
                  </h2>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-sky-50 text-sky-700">
                    {activePassage.level}
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-1">
                  {activePassage.titleZh}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowChinese(!showChinese)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  {showChinese ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showChinese ? 'Hide Chinese' : 'Show Chinese'}</span>
                </button>
              </div>
            </div>

            {/* Paragraphs */}
            <div className="space-y-6">
              {activePassage.paragraphs.map((para, i) => (
                <div key={i} className="space-y-2">
                  <p className="text-slate-800 text-base sm:text-lg leading-relaxed font-normal">
                    {renderParagraphWithHighlights(para.en)}
                  </p>
                  {showChinese && (
                    <p className="text-xs sm:text-sm text-slate-500 leading-relaxed bg-slate-50/70 p-3 rounded-xl border border-slate-100/80">
                      {para.zh}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-100 text-xs text-slate-400 flex items-center justify-between">
              <span>💡 Tip: Click any highlighted word to inspect phonetic & definition.</span>
              <span className="tabular-nums">Est. {activePassage.estimatedMinutes} min read</span>
            </div>

          </div>

          {/* Comprehension Questions */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-sky-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Comprehension Questions · 理解检测
                </h3>
              </div>

              {isSubmitted && (
                <button
                  onClick={handleResetQuestions}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retake</span>
                </button>
              )}
            </div>

            <div className="space-y-5">
              {activePassage.questions.map((q, qIndex) => {
                const selected = userAnswers[q.id];
                const answered = isSubmitted;
                const isCorrect = selected === q.correctAnswerIndex;

                return (
                  <div
                    key={q.id}
                    className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-bold text-slate-900">
                        {qIndex + 1}. {q.question}
                      </p>
                      {answered && (
                        <div>
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

                    <div className="space-y-2">
                      {q.options.map((opt, optIndex) => {
                        const isSelected = selected === optIndex;
                        let btnStyle = 'bg-white border-slate-200 text-slate-700 hover:border-slate-300';

                        if (answered) {
                          if (optIndex === q.correctAnswerIndex) {
                            btnStyle = 'bg-emerald-50 border-emerald-400 text-emerald-900 font-semibold';
                          } else if (isSelected) {
                            btnStyle = 'bg-rose-50 border-rose-400 text-rose-900';
                          } else {
                            btnStyle = 'bg-white border-slate-200 text-slate-400 opacity-60';
                          }
                        } else if (isSelected) {
                          btnStyle = 'bg-sky-50 border-sky-400 text-sky-900 font-semibold';
                        }

                        return (
                          <button
                            key={optIndex}
                            disabled={answered}
                            onClick={() => handleSelectOption(q.id, optIndex)}
                            className={`w-full p-3 rounded-xl border text-left text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-between ${btnStyle}`}
                          >
                            <span>{opt}</span>
                            {answered && optIndex === q.correctAnswerIndex && (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {answered && (
                      <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-600 animate-in fade-in duration-150">
                        <span className="font-semibold text-slate-800">Explanation: </span>
                        {q.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {!isSubmitted ? (
              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleSubmitComprehension}
                  disabled={Object.keys(userAnswers).length < activePassage.questions.length}
                  className="px-6 py-2.5 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition-all cursor-pointer shadow-xs"
                >
                  Submit Answers ({Object.keys(userAnswers).length}/{activePassage.questions.length})
                </button>
              </div>
            ) : (
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-between text-xs text-emerald-900 font-medium">
                <span>Reading complete! Your score has been updated.</span>
                <button
                  onClick={() => {
                    const idx = passages.findIndex((p) => p.id === activePassage.id);
                    if (idx + 1 < passages.length) {
                      setSelectedPassageId(passages[idx + 1].id);
                      handleResetQuestions();
                      setInspectedWord(null);
                    }
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold cursor-pointer"
                >
                  Next Passage →
                </button>
              </div>
            )}

          </div>

        </div>

        {/* Right Col: Vocabulary Inspector & Glossary */}
        <div className="space-y-4">
          
          {/* Live Word Inspector Card */}
          {inspectedWord && (
            <div className="bg-sky-50/90 rounded-3xl border border-sky-200 p-6 space-y-4 shadow-xs animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-sky-700 uppercase tracking-wider">
                  Word Inspector · 单词解析
                </span>
                <button
                  onClick={() => setInspectedWord(null)}
                  className="text-xs text-sky-600 hover:text-sky-900 font-medium cursor-pointer"
                >
                  ✕ Close
                </button>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-2xl font-bold text-slate-900">
                    {inspectedWord.word}
                  </h4>
                  <button
                    onClick={() => handlePronounce(inspectedWord.word)}
                    className="p-1.5 text-sky-700 hover:bg-sky-100 rounded-lg transition-colors cursor-pointer"
                    title="Pronounce"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs font-mono text-slate-500 mt-0.5">
                  {inspectedWord.phonetic} · {inspectedWord.pos}
                </p>
                <p className="text-base font-bold text-sky-900 mt-2">
                  {inspectedWord.meaningZh}
                </p>
              </div>
            </div>
          )}

          {/* Full Glossary List for this Passage */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <BookOpen className="w-4 h-4 text-sky-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Key Words in this Passage
              </h3>
            </div>

            <div className="space-y-2.5">
              {activePassage.vocabulary.map((vocab, idx) => (
                <div
                  key={idx}
                  onClick={() => setInspectedWord(vocab)}
                  className="p-3 rounded-xl bg-slate-50 hover:bg-sky-50/60 border border-slate-100 hover:border-sky-200 transition-colors cursor-pointer flex items-start justify-between gap-2"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-slate-900">{vocab.word}</span>
                      <span className="text-[11px] text-slate-400 font-mono">({vocab.pos})</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">{vocab.meaningZh}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePronounce(vocab.word);
                    }}
                    className="p-1 text-slate-400 hover:text-sky-600 cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
