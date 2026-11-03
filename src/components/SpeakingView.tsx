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
  Star,
  ShieldAlert,
  Check,
  ExternalLink
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
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied' | 'unknown'>('unknown');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);

  // Evaluation results
  const [evaluation, setEvaluation] = useState<{
    score: number;
    isGood: boolean;
    tokenAnalysis: { word: string; matched: boolean }[];
  } | null>(null);

  // Self rating fallback
  const [selfRating, setSelfRating] = useState<number | null>(null);

  const recognitionRef = useRef<any>(null);

  const categories = ['All', ...Array.from(new Set(items.map((i) => i.category)))];

  const filteredItems = items.filter(
    (item) => selectedCategory === 'All' || item.category === selectedCategory
  );

  const currentItem = filteredItems[currentIndex] || filteredItems[0];

  // Initialize SpeechRecognition check & permission state check
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
    }

    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: 'microphone' as any })
        .then((perm) => {
          setPermissionState(perm.state as any);
          perm.onchange = () => {
            setPermissionState(perm.state as any);
            if (perm.state === 'granted') {
              setErrorMessage(null);
            }
          };
        })
        .catch(() => {
          // Permissions API query not supported for microphone in some browsers
        });
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
      voiceId: progress.settings.voiceId || 'us-female',
      speed: progress.settings.speechRate,
      accent: progress.settings.voiceAccent,
    });
  };

  // Explicitly prompt for mic permission using getUserMedia
  const requestMicPermission = async () => {
    setIsRequestingPermission(true);
    setErrorMessage(null);

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Close stream tracks immediately after permission check
        stream.getTracks().forEach((track) => track.stop());
        setPermissionState('granted');
        setErrorMessage(null);
        // Start listening right away now that mic is allowed
        setTimeout(() => startListening(), 200);
      } else {
        startListening();
      }
    } catch (err: any) {
      console.warn('getUserMedia mic request failed:', err);
      setPermissionState('denied');
      setErrorMessage('Microphone access was blocked or denied by your browser.');
    } finally {
      setIsRequestingPermission(false);
    }
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
        setPermissionState('granted');
        setErrorMessage(null);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setSpokenTranscript(transcript);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error event:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setPermissionState('denied');
          setErrorMessage(
            'Microphone access was blocked (not-allowed). Please click "Enable Microphone" below or use Self-Evaluation Mode.'
          );
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
    } catch (err: any) {
      console.error('Failed to start speech recognition', err);
      setIsListening(false);
      if (err?.name === 'NotAllowedError' || err?.message?.includes('not-allowed')) {
        setPermissionState('denied');
        setErrorMessage('Microphone access was not allowed by the browser.');
      } else {
        setErrorMessage('Could not initialize microphone. Please check browser permissions.');
      }
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
            Listen to native pronunciation, practice out loud, and receive real-time accuracy scoring.
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
                setErrorMessage(null);
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
              
              {/* Mic Button */}
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

              {/* Enhanced Troubleshooting / Permission Callout when "not-allowed" */}
              {errorMessage && (
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-left text-xs text-amber-900 space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-start gap-2.5">
                    <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-semibold text-slate-900">
                        Microphone Permission Required (麦克风权限提示)
                      </p>
                      <p className="text-amber-800 leading-relaxed">
                        Your browser blocked microphone access. In Chrome or Edge, click the <strong>site info icon (lock or tune icon)</strong> in the browser URL address bar and set <strong>Microphone</strong> to <strong>Allow</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-amber-200/70">
                    <button
                      onClick={requestMicPermission}
                      disabled={isRequestingPermission}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isRequestingPermission ? 'Requesting...' : 'Request Permission (请求麦克风)'}
                    </button>
                    <span className="text-[11px] text-amber-700">or use self-rating below</span>
                  </div>
                </div>
              )}

              {/* Self-Rating Star Evaluator (Always available as practical fallback or extra practice) */}
              <div className="pt-2 p-3 bg-slate-50/80 rounded-2xl border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="text-left">
                  <span className="font-semibold text-slate-800 block">Self-Evaluation Mode (自主评测)</span>
                  <span className="text-slate-400 text-[11px]">Read aloud, then rate how clearly you pronounced:</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => handleSelfRating(star)}
                      className="p-1 hover:scale-110 transition-transform cursor-pointer"
                      title={`Rate ${star} star(s)`}
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
                  {selfRating && (
                    <span className="ml-1 text-[11px] font-bold text-amber-600">
                      {selfRating * 20}%
                    </span>
                  )}
                </div>
              </div>

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
                    <p className="text-[11px] text-slate-500 pt-2 border-t border-sky-200/60 leading-relaxed">
                      💡 <em>Educational Note: Automated speech recognition evaluates word intelligibility and phoneme recognition. For natural sentence rhythm, intonation, and stress, shadow-repeat after the neural teacher model.</em>
                    </p>
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
