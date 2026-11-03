import React, { useState, useEffect, useRef } from 'react';
import { ListeningLesson, ListeningSentence, UserProgress } from '../types';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Upload, 
  Plus, 
  CheckCircle2, 
  Volume2, 
  Repeat, 
  BookOpen, 
  FileAudio, 
  Trash2, 
  Edit3, 
  Check, 
  Clock, 
  Sparkles,
  Info
} from 'lucide-react';
import { speakText, stopSpeech } from '../services/speech';
import { saveAudioFile, getAudioFile, deleteAudioFile } from '../services/storage';

interface ListeningViewProps {
  lessons: ListeningLesson[];
  onUpdateLessons: (lessons: ListeningLesson[]) => void;
  progress: UserProgress;
  onUpdateProgress: (updated: UserProgress) => void;
  onLogActivity: (title: string, titleZh: string, details?: string) => void;
}

export const ListeningView: React.FC<ListeningViewProps> = ({
  lessons,
  onUpdateLessons,
  progress,
  onUpdateProgress,
  onLogActivity,
}) => {
  const [selectedLessonId, setSelectedLessonId] = useState<string>(lessons[0]?.id || '');
  const activeLesson = lessons.find((l) => l.id === selectedLessonId) || lessons[0];

  // Audio playback states
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [activeSentenceId, setActiveSentenceId] = useState<string | null>(null);
  const [repeatSentenceMode, setRepeatSentenceMode] = useState(false);
  const [showChineseTranslation, setShowChineseTranslation] = useState(true);

  // Loaded MP3 URL from user upload (via Blob ObjectURL)
  const [loadedAudioUrl, setLoadedAudioUrl] = useState<string | null>(null);
  const [audioFileName, setAudioFileName] = useState<string | null>(null);

  // Audio element ref
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Edit / Add modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editTitle, setEditTitle] = useState('');
  const [editTitleZh, setEditTitleZh] = useState('');
  const [editLevel, setEditLevel] = useState<'A2' | 'B1'>('A2');
  const [editSentencesText, setEditSentencesText] = useState('');
  const [editVocabText, setEditVocabText] = useState('');
  const [editUploadedFile, setEditUploadedFile] = useState<File | null>(null);

  // Load custom audio file from IndexedDB when active lesson changes
  useEffect(() => {
    let currentBlobUrl: string | null = null;
    let isCancelled = false;

    setIsPlaying(false);
    stopSpeech();
    setCurrentTime(0);
    setActiveSentenceId(null);

    const loadLessonAudio = async () => {
      if (!activeLesson) return;
      const key = activeLesson.audioKey || `audio_${activeLesson.id}`;
      const blob = await getAudioFile(key);
      if (blob && !isCancelled) {
        currentBlobUrl = URL.createObjectURL(blob);
        setLoadedAudioUrl(currentBlobUrl);
        setAudioFileName(activeLesson.audioFileName || 'uploaded_lesson_audio.mp3');
      } else if (!isCancelled) {
        setLoadedAudioUrl(null);
        setAudioFileName(null);
      }
    };

    loadLessonAudio();

    return () => {
      isCancelled = true;
      if (currentBlobUrl) {
        URL.revokeObjectURL(currentBlobUrl);
      }
    };
  }, [activeLesson?.id]);

  // Audio player timeupdate listener
  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const time = audioRef.current.currentTime;
    setCurrentTime(time);

    // Sync active sentence based on timestamp
    if (activeLesson?.sentences) {
      const match = activeLesson.sentences.find(
        (s) => time >= s.startTime && time <= s.endTime
      );
      if (match) {
        setActiveSentenceId(match.id);
        if (repeatSentenceMode && time >= match.endTime) {
          // Loop current sentence
          audioRef.current.currentTime = match.startTime;
        }
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setActiveSentenceId(null);
    onLogActivity('Finished Listening Lesson', '完成听力练习', activeLesson.title);
  };

  // Play / Pause toggle
  const togglePlay = () => {
    if (loadedAudioUrl && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.playbackRate = playbackSpeed;
        audioRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch((err) => {
          console.warn('Audio play error:', err);
        });
      }
    } else {
      // Fallback: Web Speech API narration of all dialogue sentences
      if (isPlaying) {
        stopSpeech();
        setIsPlaying(false);
      } else {
        setIsPlaying(true);
        playSpeechSequence(0);
      }
    }
  };

  // Helper for sequential speech synthesis when no MP3 is uploaded
  const playSpeechSequence = (idx: number) => {
    if (!activeLesson?.sentences || idx >= activeLesson.sentences.length) {
      setIsPlaying(false);
      setActiveSentenceId(null);
      return;
    }
    const sentence = activeLesson.sentences[idx];
    setActiveSentenceId(sentence.id);

    speakText(sentence.en, {
      rate: playbackSpeed,
      accent: progress.settings.voiceAccent,
      onEnd: () => {
        if (repeatSentenceMode) {
          playSpeechSequence(idx);
        } else {
          playSpeechSequence(idx + 1);
        }
      },
      onError: () => {
        setIsPlaying(false);
      },
    });
  };

  const handleReplay = () => {
    if (loadedAudioUrl && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      setIsPlaying(true);
    } else {
      stopSpeech();
      setIsPlaying(true);
      playSpeechSequence(0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };

  // Repeat or jump to specific sentence
  const handleSelectSentence = (sentence: ListeningSentence) => {
    setActiveSentenceId(sentence.id);
    if (loadedAudioUrl && audioRef.current) {
      audioRef.current.currentTime = sentence.startTime;
      if (!isPlaying) {
        audioRef.current.play();
        setIsPlaying(true);
      }
    } else {
      stopSpeech();
      speakText(sentence.en, {
        rate: playbackSpeed,
        accent: progress.settings.voiceAccent,
      });
    }
  };

  // Handle direct MP3 File Upload from computer
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeLesson) return;

    try {
      const storageKey = `audio_${activeLesson.id}`;
      await saveAudioFile(storageKey, file);

      const objectUrl = URL.createObjectURL(file);
      setLoadedAudioUrl(objectUrl);
      setAudioFileName(file.name);

      // Update lesson metadata
      const updatedLessons = lessons.map((l) =>
        l.id === activeLesson.id
          ? { ...l, audioKey: storageKey, audioFileName: file.name }
          : l
      );
      onUpdateLessons(updatedLessons);
      onLogActivity('Uploaded MP3 Audio', '上传自定义听力音频', file.name);
    } catch (err) {
      console.error('Failed to save audio file', err);
    }
  };

  // Mark lesson as completed
  const isCompleted = progress.completedListening.includes(activeLesson.id);
  const toggleCompleted = () => {
    let updatedCompleted = [...progress.completedListening];
    if (isCompleted) {
      updatedCompleted = updatedCompleted.filter((id) => id !== activeLesson.id);
    } else {
      updatedCompleted.push(activeLesson.id);
      onLogActivity('Completed Listening Lesson', '完成听力课程', activeLesson.title);
    }

    onUpdateProgress({
      ...progress,
      completedListening: updatedCompleted,
    });
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Open modal to add or edit lesson
  const openCreateModal = () => {
    setModalMode('create');
    setEditTitle('');
    setEditTitleZh('');
    setEditLevel('A2');
    setEditSentencesText(
      'Person A: Hello, how are you today?\nPerson B: I am great, thank you! Ready for our English practice.'
    );
    setEditVocabText('practice: 练习\nfluent: 流利的');
    setEditUploadedFile(null);
    setIsModalOpen(true);
  };

  const openEditModal = () => {
    if (!activeLesson) return;
    setModalMode('edit');
    setEditTitle(activeLesson.title);
    setEditTitleZh(activeLesson.titleZh);
    setEditLevel(activeLesson.level);
    setEditSentencesText(
      activeLesson.sentences.map((s) => `${s.en} // ${s.zh}`).join('\n')
    );
    setEditVocabText(
      activeLesson.vocabulary.map((v) => `${v.word}: ${v.meaningZh}`).join('\n')
    );
    setEditUploadedFile(null);
    setIsModalOpen(true);
  };

  const handleSaveModal = async () => {
    if (!editTitle.trim()) return;

    // Parse sentences
    const lines = editSentencesText.split('\n').filter((l) => l.trim().length > 0);
    let cumulativeTime = 0;
    const parsedSentences: ListeningSentence[] = lines.map((line, idx) => {
      const parts = line.split('//');
      const en = parts[0]?.trim() || line.trim();
      const zh = parts[1]?.trim() || '';
      const start = cumulativeTime;
      const durationEst = Math.max(3, Math.round(en.split(' ').length * 0.45));
      cumulativeTime += durationEst;
      return {
        id: `s-custom-${idx}`,
        startTime: start,
        endTime: start + durationEst,
        en,
        zh,
      };
    });

    // Parse vocabulary
    const vocabLines = editVocabText.split('\n').filter((l) => l.trim().length > 0);
    const parsedVocab = vocabLines.map((vl) => {
      const [w, m] = vl.split(':');
      return {
        word: (w || '').trim(),
        meaningZh: (m || w || '').trim(),
      };
    });

    const lessonId = modalMode === 'edit' && activeLesson ? activeLesson.id : `l-custom-${Date.now()}`;
    const storageKey = `audio_${lessonId}`;

    let fileName = modalMode === 'edit' ? activeLesson.audioFileName : undefined;

    if (editUploadedFile) {
      await saveAudioFile(storageKey, editUploadedFile);
      fileName = editUploadedFile.name;
    }

    const newLesson: ListeningLesson = {
      id: lessonId,
      title: editTitle,
      titleZh: editTitleZh || editTitle,
      level: editLevel,
      duration: `${Math.floor(cumulativeTime / 60)}:${cumulativeTime % 60 < 10 ? '0' : ''}${cumulativeTime % 60}`,
      sentences: parsedSentences,
      vocabulary: parsedVocab,
      isCustom: true,
      audioKey: storageKey,
      audioFileName: fileName,
    };

    if (modalMode === 'create') {
      onUpdateLessons([...lessons, newLesson]);
      setSelectedLessonId(newLesson.id);
      onLogActivity('Created Custom Listening Lesson', '创建自定义听力课程', newLesson.title);
    } else {
      onUpdateLessons(lessons.map((l) => (l.id === lessonId ? newLesson : l)));
      onLogActivity('Updated Listening Lesson', '更新听力课程', newLesson.title);
    }

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Listening Practice · 听力专练
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real English audio with synchronized bilingual transcripts and sentence repeat practice.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Custom Lesson (添加课程)</span>
          </button>
        </div>
      </div>

      {/* 2. Lesson Selection Row */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {lessons.map((l) => {
          const isSelected = l.id === activeLesson?.id;
          const done = progress.completedListening.includes(l.id);

          return (
            <button
              key={l.id}
              onClick={() => setSelectedLessonId(l.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-all whitespace-nowrap cursor-pointer ${
                isSelected
                  ? 'bg-sky-500 text-white border-sky-600 font-semibold shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200/80 hover:bg-slate-50'
              }`}
            >
              {done && <CheckCircle2 className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-emerald-500'}`} />}
              <span>{l.title}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-sm ${isSelected ? 'bg-sky-600/70 text-sky-100' : 'bg-slate-100 text-slate-500'}`}>
                {l.level}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. Main Player & Transcript Card */}
      {activeLesson && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left 2 Cols: Audio Player & Sentence Transcript */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* Audio Controller Card */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 space-y-5">
              
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-slate-900">{activeLesson.title}</h2>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-sky-50 text-sky-700">
                      {activeLesson.level}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{activeLesson.titleZh}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={openEditModal}
                    className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    title="Edit Lesson"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={toggleCompleted}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
                      isCompleted
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{isCompleted ? 'Completed' : 'Mark Complete'}</span>
                  </button>
                </div>
              </div>

              {/* Upload MP3 status / Drop zone banner */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-slate-700">
                  <FileAudio className="w-4 h-4 text-sky-600 shrink-0" />
                  <div>
                    {audioFileName ? (
                      <span className="font-semibold text-slate-800">
                        Active Audio: <span className="font-normal text-slate-600">{audioFileName}</span>
                      </span>
                    ) : (
                      <span>
                        <span className="font-semibold text-slate-800">Ready to play</span> (Upload your MP3 or use built-in narration)
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/mp3,audio/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-sky-300 hover:bg-sky-50 text-slate-700 text-xs font-semibold rounded-lg transition-all cursor-pointer shadow-2xs"
                  >
                    <Upload className="w-3.5 h-3.5 text-sky-600" />
                    <span>{audioFileName ? 'Replace MP3 File' : 'Upload MP3 File'}</span>
                  </button>
                </div>
              </div>

              {/* Hidden HTML5 Audio Element for user uploaded MP3 */}
              {loadedAudioUrl && (
                <audio
                  ref={audioRef}
                  src={loadedAudioUrl}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onEnded={handleAudioEnded}
                />
              )}

              {/* Progress Seek Bar */}
              <div className="space-y-1.5">
                <input
                  type="range"
                  min={0}
                  max={duration || 60}
                  step={0.1}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-500"
                />
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>{formatSeconds(currentTime)}</span>
                  <span>{formatSeconds(duration || 60)}</span>
                </div>
              </div>

              {/* Playback Controls & Speed */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleReplay}
                    className="p-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                    title="Replay from start"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </button>

                  <button
                    onClick={togglePlay}
                    className="p-4 bg-sky-500 hover:bg-sky-600 text-white rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer"
                    title={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 fill-white" />}
                  </button>

                  <button
                    onClick={() => setRepeatSentenceMode(!repeatSentenceMode)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                      repeatSentenceMode
                        ? 'bg-sky-50 text-sky-700 border-sky-300'
                        : 'text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                    title="Loop current sentence"
                  >
                    <Repeat className="w-3.5 h-3.5" />
                    <span>Repeat Sentence (单句循环)</span>
                  </button>
                </div>

                {/* Speed Toggles */}
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
                  {[0.75, 1.0, 1.25, 1.5].map((spd) => (
                    <button
                      key={spd}
                      onClick={() => handleSpeedChange(spd)}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                        playbackSpeed === spd
                          ? 'bg-white text-sky-700 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Transcript Sentence List */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">
                    Interactive Transcript · 对话字幕
                  </h3>
                  <span className="text-xs text-slate-400">
                    (Click any sentence to play & repeat)
                  </span>
                </div>

                <button
                  onClick={() => setShowChineseTranslation(!showChineseTranslation)}
                  className="text-xs text-sky-600 hover:underline font-medium cursor-pointer"
                >
                  {showChineseTranslation ? 'Hide Translations' : 'Show Translations'}
                </button>
              </div>

              <div className="space-y-3">
                {activeLesson.sentences.map((sent, index) => {
                  const isActive = activeSentenceId === sent.id;

                  return (
                    <div
                      key={sent.id}
                      onClick={() => handleSelectSentence(sent)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                        isActive
                          ? 'bg-sky-50/70 border-sky-300 shadow-2xs'
                          : 'bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 flex-1">
                          <p className={`text-sm sm:text-base leading-relaxed ${
                            isActive ? 'font-semibold text-slate-900' : 'text-slate-700'
                          }`}>
                            {sent.en}
                          </p>
                          {showChineseTranslation && (
                            <p className="text-xs text-slate-500 leading-normal">
                              {sent.zh}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0 pt-0.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectSentence(sent);
                            }}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isActive ? 'text-sky-600 bg-sky-100' : 'text-slate-400 hover:text-slate-700'
                            }`}
                            title="Play this sentence"
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Right Col: Vocabulary Explanations & Notes */}
          <div className="space-y-4">
            
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <BookOpen className="w-4 h-4 text-sky-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Key Vocabulary in this Audio
                </h3>
              </div>

              <div className="space-y-3">
                {activeLesson.vocabulary.map((vocab, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{vocab.word}</span>
                        <button
                          onClick={() => speakText(vocab.word, { accent: progress.settings.voiceAccent })}
                          className="p-1 text-slate-400 hover:text-sky-600 cursor-pointer"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">{vocab.meaningZh}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-sky-50 rounded-2xl border border-sky-100 text-xs text-sky-800 space-y-1">
                <div className="flex items-center gap-1 font-semibold">
                  <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                  <span>Listening Tip</span>
                </div>
                <p className="text-[11px] leading-relaxed text-sky-700">
                  Try listening once with Chinese translations hidden at 1.0x speed. Then click individual sentences to shadow repeat.
                </p>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* 4. Add / Edit Lesson Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-200 animate-in fade-in duration-150 my-8">
            <h2 className="text-lg font-bold text-slate-900">
              {modalMode === 'create' ? 'Create Custom Listening Lesson' : 'Edit Listening Lesson'}
            </h2>

            <div className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Lesson Title (English) *
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="e.g. Airport Check-In & Bag Drop"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-sky-500 text-sm"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Chinese Title (中文标题)
                </label>
                <input
                  type="text"
                  value={editTitleZh}
                  onChange={(e) => setEditTitleZh(e.target.value)}
                  placeholder="e.g. 机场值机与行李托运"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-sky-500 text-sm"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  CEFR Level
                </label>
                <select
                  value={editLevel}
                  onChange={(e) => setEditLevel(e.target.value as 'A2' | 'B1')}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700"
                >
                  <option value="A2">A2 Elementary</option>
                  <option value="B1">B1 Intermediate</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Upload MP3 Audio File (Optional now, can upload anytime)
                </label>
                <input
                  type="file"
                  accept="audio/mp3,audio/*"
                  onChange={(e) => setEditUploadedFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100 cursor-pointer"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  English Transcript & Chinese (format: English sentence // 中文翻译)
                </label>
                <textarea
                  rows={5}
                  value={editSentencesText}
                  onChange={(e) => setEditSentencesText(e.target.value)}
                  placeholder="Person A: Good morning! // 早上好！"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-sky-500 text-xs font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Key Vocabulary (format: word: 中文含义)
                </label>
                <textarea
                  rows={3}
                  value={editVocabText}
                  onChange={(e) => setEditVocabText(e.target.value)}
                  placeholder="itinerary: 行程路线单"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-sky-500 text-xs font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveModal}
                disabled={!editTitle.trim()}
                className="px-4 py-2 text-xs font-semibold bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white rounded-xl shadow-xs cursor-pointer"
              >
                Save Lesson
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
