import React, { useState, useEffect, useRef } from 'react';
import { SpeakingItem, UserProgress } from '../types';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  CheckCircle2, 
  Sparkles, 
  RotateCcw, 
  AlertCircle, 
  Award,
  ChevronRight,
  ChevronLeft,
  Star
} from 'lucide-react';
import { speakText, evaluateSpokenSentence } from '../services/speech';

interface SpeakingViewProps {
  items: SpeakingItem[];
  progress: UserProgress;
  onUpdateProgress: (updated: UserProgress) => void;
  onLogActivity: (title: string, titleZh: string, details?: string) => void;
}

export const SpeakingView: React.FC<SpeakingViewProps> = ({
  items,
  progress,
  onUpdateProgress,
  onLogActivity,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [currentIndex, setCurrentIndex] = useState(0);

  // Speech Recognition states
  const [isListening, setIsListening] = useState(false);
  const [spokenTranscript, setSpokenTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Evaluation results
  const [evaluation, setEvaluation] = useState<{
    score: number;
    isGood: boolean;
    tokenAnalysis: { word: string; matched: boolean }[];
  } | null>(null);

  // Self rating fallback for unsupported browsers
  const [selfRating, setSelfRating] = useState<number | null>(null);

  const recognitionRef = useRef<any>(null);

  const categories = ['All', ...Array.from(new Set(items.map((i) => i.category)))];

  const filteredItems = items.filter(
    (item) => selectedCategory === 'All' || item.category === selectedCategory
  );

  const currentItem = filteredItems[currentIndex] || filteredItems[0];

  // Initialize SpeechRecognition on mount
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, []);

  const handlePronounce = (text: string) => {
    speakText(text, {
      rate: progress.settings.speechRate,
      accent: progress.settings.voiceAccent,
    });
  };

  const startListening = () => {
    setErrorMessage(null);
    setSpokenTranscript('');
    setEvaluation(null);

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = progress.settings.voiceAccent || 'en-US';
      recognition.continuous = false;
      recognition.interimResults = true;
      recognitionRef.current = recognition;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setSpokenTranscript(transcript);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setErrorMessage('Microphone access was denied. Please allow microphone permissions in your browser bar.');
        } else if (event.error === 'no-speech') {
          setErrorMessage('No speech detected. Please speak clearly into your microphone.');
        } else {
          setErrorMessage(`Speech recognition error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition', err);
      setIsListening(false);
      setErrorMessage('Could not initialize microphone. Please check browser permissions.');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsListening(false);
  };

  // Evaluate when speech completes
  useEffect(() => {
    if (!isListening && spokenTranscript.trim() && currentItem) {
      const evalResult = evaluateSpokenSentence(currentItem.en, spokenTranscript);
      setEvaluation(evalResult);

      // Record progress
      const prevRecord = progress.speakingPractices[currentItem.id] || { attempts: 0, bestScore: 0 };
      const updatedRecord = {
        attempts: prevRecord.attempts + 1,
        bestScore: Math.max(prevRecord.bestScore, evalResult.score),
      };

      const updatedProgress: UserProgress = {
        ...progress,
        speakingPractices: {
          ...progress.speakingPractices,
          [currentItem.id]: updatedRecord,
        },
      };

      onUpdateProgress(updatedProgress);
      onLogActivity('Practiced Speaking Sentence', '练习英语口语句子', `Score: ${evalResult.score}%`);
    }
  }, [isListening, spokenTranscript]);

  const handleNext = () => {
    stopListening();
    setSpokenTranscript('');
    setEvaluation(null);
    setErrorMessage(null);
    setSelfRating(null);
    setCurrentIndex((prev) => (prev + 1) % filteredItems.length);
  };

  const handlePrev = () => {
    stopListening();
    setSpokenTranscript('');
    setEvaluation(null);
    setErrorMessage(null);
    setSelfRating(null);
    setCurrentIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
  };

  const handleSelfRating = (stars: number) => {
    setSelfRating(stars);
    const score = stars * 20;
    const prevRecord = progress.speakingPractices[currentItem.id] || { attempts: 0, bestScore: 0 };
    onUpdateProgress({
      ...progress,
      speakingPractices: {
        ...progress.speakingPractices,
        [currentItem.id]: {
          attempts: prevRecord.attempts + 1,
          bestScore: Math.max(prevRecord.bestScore, score),
        },
      },
    });
    onLogActivity('Self-Rated Spoken Sentence', '自主评测口语句子', `${stars} Stars (${score}%)`);
  };

  const itemStats = progress.speakingPractices[currentItem?.id];

  return (
    <div className="space-y-6">
      
      {/* 1. Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Speaking & Pronunciation · 口语表达
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Listen to native pronunciation, speak into your microphone, and receive real-time accuracy scoring.
          </p>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setSelectedCategory(cat);
                setCurrentIndex(0);
                setEvaluation(null);
                setSpokenTranscript('');
              }}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors cursor-pointer font-medium ${
                selectedCategory === cat
                  ? 'bg-sky-500 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Main Sentence Practice Card */}
      {currentItem && (
        <div className="max-w-2xl mx-auto space-y-4">
          
          <div className="flex items-center justify-between text-xs text-slate-500 px-2">
            <span>
              Sentence {currentIndex + 1} of {filteredItems.length} ({currentItem.category})
            </span>
            {itemStats && itemStats.attempts > 0 && (
              <span className="text-emerald-700 font-semibold tabular-nums">
                Best Score: {itemStats.bestScore}% ({itemStats.attempts} attempts)
              </span>
            )}
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-10 space-y-6">
            
            {/* Context tag */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-lg">
                Context: {currentItem.context}
              </span>
              <button
                onClick={() => handlePronounce(currentItem.en)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 text-sky-700 hover:bg-sky-500 hover:text-white transition-all text-xs font-semibold cursor-pointer"
                title="Listen to native model pronunciation"
              >
                <Volume2 className="w-4 h-4" />
                <span>Listen (听示范)</span>
              </button>
            </div>

            {/* Target English Sentence */}
            <div className="space-y-2 py-2">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-snug">
                {currentItem.en}
              </h2>
              <p className="text-xs sm:text-sm font-mono text-slate-400">
                {currentItem.ipa}
              </p>
              <p className="text-sm sm:text-base font-semibold text-slate-600 pt-1">
                {currentItem.zh}
              </p>
            </div>

            {/* Pronunciation & Rhythm Tip */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-600 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Pronunciation & Stress Tip</span>
              </div>
              <p className="leading-relaxed">{currentItem.tips}</p>
            </div>

            {/* Microphone Control Area */}
            <div className="pt-2 text-center space-y-4">
              {isSupported ? (
                <div>
                  <button
                    onClick={isListening ? stopListening : startListening}
                    className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto transition-all cursor-pointer shadow-md ${
                      isListening
                        ? 'bg-rose-500 text-white animate-pulse ring-8 ring-rose-100'
                        : 'bg-sky-500 hover:bg-sky-600 text-white'
                    }`}
                    title={isListening ? 'Click to stop speaking' : 'Click to start speaking'}
                  >
                    {isListening ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
                  </button>

                  <p className="text-xs font-semibold text-slate-700 mt-3">
                    {isListening ? 'Listening... Speak now!' : 'Click the microphone to repeat sentence'}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {isListening ? 'Click again when finished' : '点击麦克风开始朗读，浏览器将实时评测'}
                  </p>
                </div>
              ) : (
                /* Fallback if browser doesn't support Web Speech Recognition */
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-800 space-y-2">
                  <div className="flex items-center justify-center gap-1.5 font-semibold">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span>Speech Recognition Notice</span>
                  </div>
                  <p>
                    Speech Recognition is not supported in this browser engine (or permission was denied). You can still practice by listening to native audio and self-rating your pronunciation below!
                  </p>
                  
                  {/* Self evaluation stars */}
                  <div className="pt-2 flex items-center justify-center gap-2">
                    <span className="font-semibold text-slate-700">Self Rating:</span>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => handleSelfRating(star)}
                        className="p-1 hover:scale-110 transition-transform cursor-pointer"
                      >
                        <Star
                          className={`w-5 h-5 ${
                            (selfRating || 0) >= star
                              ? 'text-amber-500 fill-amber-500'
                              : 'text-slate-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Error Callout */}
              {errorMessage && (
                <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200">
                  {errorMessage}
                </div>
              )}

              {/* Live transcript display while speaking */}
              {spokenTranscript && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-2 animate-in fade-in duration-150">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Recognized Speech (实时识别内容)
                  </span>
                  <p className="text-sm font-medium text-slate-800 italic">
                    “{spokenTranscript}”
                  </p>
                </div>
              )}

              {/* Evaluation Result */}
              {evaluation && (
                <div className="p-5 rounded-2xl bg-sky-50/80 border border-sky-200 text-left space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-sky-600" />
                      <span className="text-sm font-bold text-slate-900">
                        Accuracy Score: <span className="tabular-nums">{evaluation.score}%</span>
                      </span>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                      evaluation.score >= 80
                        ? 'bg-emerald-100 text-emerald-800'
                        : evaluation.score >= 60
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      {evaluation.score >= 80 ? '🎉 Excellent' : evaluation.score >= 60 ? '👍 Good Effort' : '💪 Keep Practicing'}
                    </span>
                  </div>

                  {/* Word-by-word token analysis */}
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                      Word Matching Breakdown (绿字为准确识别，灰字需加强发音清晰度):
                    </span>
                    <div className="flex flex-wrap gap-1.5 text-sm">
                      {evaluation.tokenAnalysis.map((tok, i) => (
                        <span
                          key={i}
                          className={`px-2 py-0.5 rounded-md font-medium text-xs ${
                            tok.matched
                              ? 'bg-emerald-100 text-emerald-900'
                              : 'bg-slate-200 text-slate-600 line-through'
                          }`}
                        >
                          {tok.word}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

            </div>

          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={handlePrev}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous Sentence</span>
            </button>

            <button
              onClick={handleNext}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <span>Next Sentence</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      )}

    </div>
  );
};
