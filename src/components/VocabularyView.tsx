import React, { useState, useMemo } from 'react';
import { VocabularyWord, VocabularyCategory, CefrLevel, UserProgress } from '../types';
import { 
  Volume2, 
  RotateCw, 
  Check, 
  AlertCircle, 
  Shuffle, 
  Search, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight, 
  Award,
  Sparkles,
  Layers,
  HelpCircle,
  ListFilter
} from 'lucide-react';
import { speakText, playSound } from '../services/speech';
import confetti from 'canvas-confetti';

interface VocabularyViewProps {
  vocabulary: VocabularyWord[];
  progress: UserProgress;
  onUpdateProgress: (updated: UserProgress) => void;
  onLogActivity: (title: string, titleZh: string, details?: string) => void;
}

type VocabTabMode = 'flashcards' | 'browse' | 'quiz';

export const VocabularyView: React.FC<VocabularyViewProps> = ({
  vocabulary,
  progress,
  onUpdateProgress,
  onLogActivity,
}) => {
  const [mode, setMode] = useState<VocabTabMode>('flashcards');

  // Flashcard states
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [flashcardDeck, setFlashcardDeck] = useState<VocabularyWord[]>(() => [...vocabulary]);

  // Browse & Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedLevel, setSelectedLevel] = useState<string>('All');
  const [expandedWordId, setExpandedWordId] = useState<string | null>(null);

  // Quiz states
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizQuestions, setQuizQuestions] = useState<{
    word: VocabularyWord;
    options: string[];
    correctIndex: number;
  }[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  const categories: ('All' | VocabularyCategory)[] = [
    'All',
    'Daily life',
    'Work and career',
    'Food and restaurants',
    'Shopping',
    'Travel',
    'Health',
    'Relationships',
    'Communication',
  ];

  const handlePronounce = (text: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    speakText(text, {
      rate: progress.settings.speechRate,
      accent: progress.settings.voiceAccent,
    });
  };

  const getWordStatus = (id: string): 'learned' | 'need_practice' | 'unlearned' => {
    if (progress.learnedWords.includes(id)) return 'learned';
    if (progress.needPracticeWords.includes(id)) return 'need_practice';
    return 'unlearned';
  };

  const markWord = (id: string, status: 'learned' | 'need_practice') => {
    let newLearned = [...progress.learnedWords];
    let newNeedPractice = [...progress.needPracticeWords];

    if (status === 'learned') {
      if (!newLearned.includes(id)) newLearned.push(id);
      newNeedPractice = newNeedPractice.filter((w) => w !== id);
      onLogActivity('Marked word as Learned', '已掌握单词', vocabulary.find((v) => v.id === id)?.word);
    } else {
      if (!newNeedPractice.includes(id)) newNeedPractice.push(id);
      newLearned = newLearned.filter((w) => w !== id);
      onLogActivity('Marked word for practice', '加入需复习单词', vocabulary.find((v) => v.id === id)?.word);
    }

    onUpdateProgress({
      ...progress,
      learnedWords: newLearned,
      needPracticeWords: newNeedPractice,
    });
  };

  // Flashcards navigation
  const currentCard = flashcardDeck[currentIndex] || flashcardDeck[0];

  const handleNextCard = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % flashcardDeck.length);
  };

  const handlePrevCard = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + flashcardDeck.length) % flashcardDeck.length);
  };

  const handleShuffleDeck = () => {
    setIsFlipped(false);
    const shuffled = [...flashcardDeck].sort(() => Math.random() - 0.5);
    setFlashcardDeck(shuffled);
    setCurrentIndex(0);
  };

  // Filtered words for Browse Mode
  const filteredWords = useMemo(() => {
    return vocabulary.filter((w) => {
      // Query match
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery = 
        !q ||
        w.word.toLowerCase().includes(q) ||
        w.chinese.includes(q) ||
        w.definition.toLowerCase().includes(q);

      // Category match
      const matchesCat = selectedCategory === 'All' || w.category === selectedCategory;

      // Level match
      const matchesLevel = selectedLevel === 'All' || w.level === selectedLevel;

      // Status match
      const status = getWordStatus(w.id);
      const matchesStatus =
        selectedStatus === 'All' ||
        (selectedStatus === 'Learned' && status === 'learned') ||
        (selectedStatus === 'Need Practice' && status === 'need_practice') ||
        (selectedStatus === 'Unlearned' && status === 'unlearned');

      return matchesQuery && matchesCat && matchesLevel && matchesStatus;
    });
  }, [vocabulary, searchQuery, selectedCategory, selectedLevel, selectedStatus, progress]);

  // Start 10-Question Quiz
  const startQuiz = () => {
    const pool = [...vocabulary].sort(() => Math.random() - 0.5).slice(0, 10);
    const questions = pool.map((target) => {
      // Pick 3 distractors
      const distractors = vocabulary
        .filter((w) => w.id !== target.id)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map((w) => w.chinese);
      
      const allOpts = [...distractors, target.chinese].sort(() => Math.random() - 0.5);
      return {
        word: target,
        options: allOpts,
        correctIndex: allOpts.indexOf(target.chinese),
      };
    });

    setQuizQuestions(questions);
    setQuizIndex(0);
    setQuizScore(0);
    setSelectedOption(null);
    setQuizFinished(false);
    setQuizStarted(true);
  };

  const handleSelectQuizOption = (index: number) => {
    if (selectedOption !== null) return; // already answered
    setSelectedOption(index);
    const q = quizQuestions[quizIndex];
    const isCorrect = index === q.correctIndex;

    if (isCorrect) {
      playSound('correct');
      setQuizScore((prev) => prev + 1);
      markWord(q.word.id, 'learned');
    } else {
      playSound('wrong');
      markWord(q.word.id, 'need_practice');
    }
  };

  const handleNextQuizQuestion = () => {
    if (quizIndex + 1 < quizQuestions.length) {
      setQuizIndex((prev) => prev + 1);
      setSelectedOption(null);
    } else {
      setQuizFinished(true);
      playSound('complete');
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });
      onLogActivity(
        `Completed Vocabulary Quiz: ${quizScore + (selectedOption === quizQuestions[quizIndex].correctIndex ? 1 : 0)}/10`,
        '完成词汇测验',
        `${Math.round(((quizScore + (selectedOption === quizQuestions[quizIndex].correctIndex ? 1 : 0)) / 10) * 100)}% accuracy`
      );
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header & Segmented Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Vocabulary Learning System · 词汇学习库
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Core A2 & B1 English vocabulary with IPA, native TTS, and real example sentences.
          </p>
        </div>

        {/* Mode Buttons */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setMode('flashcards')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              mode === 'flashcards'
                ? 'bg-white text-sky-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Flashcards (卡片)</span>
          </button>
          <button
            onClick={() => setMode('browse')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              mode === 'browse'
                ? 'bg-white text-sky-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            <span>Browse (列表 {vocabulary.length})</span>
          </button>
          <button
            onClick={() => {
              setMode('quiz');
              if (!quizStarted) startQuiz();
            }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              mode === 'quiz'
                ? 'bg-white text-sky-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Quiz (测试)</span>
          </button>
        </div>
      </div>

      {/* 2. MODE: FLASHCARDS */}
      {mode === 'flashcards' && currentCard && (
        <div className="max-w-2xl mx-auto space-y-4">
          
          {/* Card Top Meta */}
          <div className="flex items-center justify-between text-xs text-slate-500 px-2">
            <span className="font-medium">
              Card {currentIndex + 1} of {flashcardDeck.length}
            </span>
            <div className="flex items-center gap-3">
              <span>Category: {currentCard.category}</span>
              <span aria-hidden="true">·</span>
              <span className="font-semibold text-sky-600">{currentCard.level}</span>
            </div>
          </div>

          {/* 3D Flip Card Container */}
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="w-full min-h-[340px] sm:min-h-[380px] bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-10 flex flex-col justify-between cursor-pointer hover:border-sky-300 transition-all select-none relative"
          >
            {/* Front View */}
            {!isFlipped ? (
              <div className="flex flex-col justify-between h-full space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                    {currentCard.pos}
                  </span>
                  <button
                    onClick={(e) => handlePronounce(currentCard.word, e)}
                    className="p-2.5 rounded-xl bg-sky-50 text-sky-600 hover:bg-sky-500 hover:text-white transition-all cursor-pointer"
                    title="Pronounce word"
                  >
                    <Volume2 className="w-5 h-5" />
                  </button>
                </div>

                <div className="text-center my-auto py-6">
                  <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 tracking-tight">
                    {currentCard.word}
                  </h2>
                  <p className="text-slate-500 font-mono text-base sm:text-lg mt-2">
                    {currentCard.ipa}
                  </p>
                </div>

                <div className="text-center pt-4 border-t border-slate-100 flex items-center justify-center gap-1.5 text-xs text-slate-400">
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Click anywhere to flip and see definition & translation</span>
                </div>
              </div>
            ) : (
              /* Back View */
              <div className="flex flex-col justify-between h-full space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-slate-900">{currentCard.word}</span>
                    <span className="text-xs text-slate-400 font-mono">{currentCard.ipa}</span>
                  </div>
                  <button
                    onClick={(e) => handlePronounce(currentCard.word, e)}
                    className="p-1.5 rounded-lg text-sky-600 hover:bg-sky-50 transition-colors"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4 my-auto">
                  {/* Chinese Meaning */}
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                      Translation · 中文释义
                    </span>
                    <p className="text-xl font-bold text-slate-900">
                      {currentCard.chinese}
                    </p>
                  </div>

                  {/* English Definition */}
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">
                      English Definition
                    </span>
                    <p className="text-sm text-slate-700 leading-relaxed">
                      {currentCard.definition}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{currentCard.definitionZh}</p>
                  </div>

                  {/* Example Sentence */}
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-slate-800 italic">
                        “{currentCard.example}”
                      </p>
                      <button
                        onClick={(e) => handlePronounce(currentCard.example, e)}
                        className="text-slate-400 hover:text-sky-600 p-1 shrink-0"
                        title="Listen to example sentence"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {currentCard.exampleZh}
                    </p>
                  </div>
                </div>

                <div className="text-center pt-2 text-[11px] text-slate-400">
                  Click card again to flip back
                </div>
              </div>
            )}
          </div>

          {/* Flashcard Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                markWord(currentCard.id, 'need_practice');
                handleNextCard();
              }}
              className="flex items-center justify-center gap-2 py-3 px-4 bg-white border border-amber-300 text-amber-700 hover:bg-amber-50 font-semibold text-sm rounded-xl transition-all cursor-pointer shadow-2xs"
            >
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <span>Need Practice (需复习)</span>
            </button>

            <button
              onClick={() => {
                markWord(currentCard.id, 'learned');
                handleNextCard();
              }}
              className="flex items-center justify-center gap-2 py-3 px-4 bg-sky-500 hover:bg-sky-600 text-white font-semibold text-sm rounded-xl transition-all cursor-pointer shadow-xs"
            >
              <Check className="w-4 h-4" />
              <span>Mark as Learned (已掌握)</span>
            </button>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={handlePrevCard}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <button
              onClick={handleShuffleDeck}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-sky-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>Shuffle Deck (随机打乱)</span>
            </button>

            <button
              onClick={handleNextCard}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      )}

      {/* 3. MODE: BROWSE & FILTER */}
      {mode === 'browse' && (
        <div className="space-y-4">
          
          {/* Search and Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search English word, meaning, or Chinese... (搜索单词/释义)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-sky-500 transition-colors"
                />
              </div>

              {/* Status filter */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-hidden"
              >
                <option value="All">All Status (全部状态)</option>
                <option value="Learned">Learned (已掌握)</option>
                <option value="Need Practice">Need Practice (需复习)</option>
                <option value="Unlearned">Unlearned (未学)</option>
              </select>

              {/* Level filter */}
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-hidden"
              >
                <option value="All">All Levels (全部等级)</option>
                <option value="A2">CEFR A2</option>
                <option value="B1">CEFR B1</option>
              </select>
            </div>

            {/* Category horizontal pills / tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors cursor-pointer font-medium ${
                    selectedCategory === cat
                      ? 'bg-sky-500 text-white'
                      : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/80'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Results Counter */}
          <div className="text-xs text-slate-500 px-1">
            Showing <span className="font-semibold text-slate-800">{filteredWords.length}</span> vocabulary words
          </div>

          {/* Word Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredWords.map((item) => {
              const status = getWordStatus(item.id);
              const isExpanded = expandedWordId === item.id;

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-slate-900">{item.word}</h3>
                          <span className="text-xs text-slate-400 font-mono">{item.ipa}</span>
                          <span className="text-[11px] text-slate-500 font-medium">({item.pos})</span>
                        </div>
                        <p className="text-sm font-semibold text-sky-700 mt-1">
                          {item.chinese}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handlePronounce(item.word)}
                          className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                          title="Listen to pronunciation"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                        
                        {/* Status Icon */}
                        {status === 'learned' && (
                          <span 
                            title="Learned" 
                            className="p-1 rounded-md text-emerald-600 bg-emerald-50"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </span>
                        )}
                        {status === 'need_practice' && (
                          <span 
                            title="Need Practice" 
                            className="p-1 rounded-md text-amber-600 bg-amber-50"
                          >
                            <AlertCircle className="w-4 h-4" />
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">
                      {item.definition}
                    </p>

                    {/* Expandable Example Section */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-slate-100 space-y-2 animate-in fade-in duration-150">
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
                          <p className="text-slate-800 font-medium italic">“{item.example}”</p>
                          <p className="text-slate-500 mt-0.5">{item.exampleZh}</p>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>Category: {item.category}</span>
                          <span className="font-semibold text-sky-600">{item.level}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <button
                      onClick={() => setExpandedWordId(isExpanded ? null : item.id)}
                      className="text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
                    >
                      {isExpanded ? 'Hide details' : 'Show example & notes'}
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => markWord(item.id, 'need_practice')}
                        className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                          status === 'need_practice'
                            ? 'bg-amber-100 text-amber-800 font-semibold'
                            : 'text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        Review
                      </button>
                      <button
                        onClick={() => markWord(item.id, 'learned')}
                        className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                          status === 'learned'
                            ? 'bg-emerald-100 text-emerald-800 font-semibold'
                            : 'text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        Learned
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredWords.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
              No vocabulary matching your search or filters. Try clearing filters.
            </div>
          )}
        </div>
      )}

      {/* 4. MODE: MULTIPLE CHOICE QUIZ */}
      {mode === 'quiz' && (
        <div className="max-w-xl mx-auto space-y-4">
          {!quizFinished ? (
            quizQuestions.length > 0 && (
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8 space-y-6">
                
                {/* Progress bar */}
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                    <span className="font-semibold text-sky-600">
                      Question {quizIndex + 1} of {quizQuestions.length}
                    </span>
                    <span className="tabular-nums">
                      Score: {quizScore} / {quizQuestions.length}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-sky-500 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${((quizIndex + 1) / quizQuestions.length) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Target Word */}
                <div className="text-center py-4">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Select the correct Chinese translation
                  </span>
                  <div className="flex items-center justify-center gap-2">
                    <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
                      {quizQuestions[quizIndex].word.word}
                    </h2>
                    <button
                      onClick={() => handlePronounce(quizQuestions[quizIndex].word.word)}
                      className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                      title="Listen"
                    >
                      <Volume2 className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="text-sm font-mono text-slate-500 mt-1">
                    {quizQuestions[quizIndex].word.ipa} · {quizQuestions[quizIndex].word.pos}
                  </p>
                  <p className="text-xs text-slate-500 mt-2 italic max-w-md mx-auto">
                    “{quizQuestions[quizIndex].word.example}”
                  </p>
                </div>

                {/* 4 Choices */}
                <div className="space-y-2.5">
                  {quizQuestions[quizIndex].options.map((opt, i) => {
                    const isAnswered = selectedOption !== null;
                    const isCorrect = i === quizQuestions[quizIndex].correctIndex;
                    const isSelected = selectedOption === i;

                    let btnStyle = 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100/80 hover:border-slate-300';
                    if (isAnswered) {
                      if (isCorrect) {
                        btnStyle = 'bg-emerald-50 border-emerald-400 text-emerald-800 font-semibold';
                      } else if (isSelected) {
                        btnStyle = 'bg-rose-50 border-rose-400 text-rose-800';
                      } else {
                        btnStyle = 'bg-slate-50 border-slate-200 text-slate-400 opacity-60';
                      }
                    }

                    return (
                      <button
                        key={i}
                        disabled={isAnswered}
                        onClick={() => handleSelectQuizOption(i)}
                        className={`w-full p-4 rounded-xl border text-left text-sm font-medium transition-all flex items-center justify-between cursor-pointer ${btnStyle}`}
                      >
                        <span>{opt}</span>
                        {isAnswered && isCorrect && <Check className="w-4 h-4 text-emerald-600" />}
                      </button>
                    );
                  })}
                </div>

                {/* Explanation & Next */}
                {selectedOption !== null && (
                  <div className="pt-4 border-t border-slate-100 space-y-3 animate-in fade-in duration-150">
                    <p className="text-xs text-slate-600 leading-relaxed">
                      <span className="font-semibold text-slate-800">English Definition:</span>{' '}
                      {quizQuestions[quizIndex].word.definition}
                    </p>
                    <button
                      onClick={handleNextQuizQuestion}
                      className="w-full py-3 bg-sky-500 hover:bg-sky-600 text-white font-semibold text-sm rounded-xl transition-all cursor-pointer shadow-xs"
                    >
                      {quizIndex + 1 < quizQuestions.length ? 'Next Question →' : 'View Results'}
                    </button>
                  </div>
                )}

              </div>
            )
          ) : (
            /* Quiz Completed View */
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-8 text-center space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto shadow-xs">
                <Award className="w-8 h-8" />
              </div>

              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Quiz Completed!
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  You scored <span className="text-xl font-bold text-slate-900 tabular-nums">{quizScore}</span> / 10
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-600 space-y-1">
                <p>
                  {quizScore >= 8 
                    ? '🎉 Excellent mastery! Your CEFR A2 vocabulary is solid.' 
                    : 'Keep practicing! Review the words you missed in your Flashcards deck.'}
                </p>
                <p className="text-slate-400">
                  Correct answers have been automatically marked as Learned.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={startQuiz}
                  className="flex-1 py-3 bg-sky-500 hover:bg-sky-600 text-white font-semibold text-sm rounded-xl transition-colors cursor-pointer"
                >
                  Take Another Quiz
                </button>
                <button
                  onClick={() => setMode('flashcards')}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl transition-colors cursor-pointer"
                >
                  Return to Flashcards
                </button>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
