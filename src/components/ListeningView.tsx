import React, { useState, useEffect, useRef } from 'react';
import { ListeningLesson, ListeningSentence, UserProgress, VoiceProfileId } from '../types';
import { 
  Play, 
  Pause, 
  Square,
  RotateCcw, 
  Upload, 
  Plus, 
  CheckCircle2, 
  Volume2, 
  Repeat, 
  BookOpen, 
  FileAudio, 
  Edit3, 
  Check, 
  Sparkles,
  Eye,
  EyeOff,
  Radio,
  Headphones
} from 'lucide-react';
import { 
  playNaturalVoice, 
  stopCurrentAudio, 
  pauseCurrentAudio, 
  resumeCurrentAudio, 
  isAudioPlaying, 
  isAudioPaused,
  NATURAL_VOICE_OPTIONS 
} from '../services/speech';
import { saveAudioFile, getAudioFile } from '../services/storage';

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

  // Active voice selection for this session
  const [activeVoiceId, setActiveVoiceId] = useState<VoiceProfileId>(
    progress.settings.voiceId || 'us-female'
  );

  // Playback control states
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(progress.settings.speechRate || 1.0);
  const [activeSentenceId, setActiveSentenceId] = useState<string | null>(null);
  const [repeatSentenceMode, setRepeatSentenceMode] = useState(false);
  
  // Learning experience toggles
  const [showChineseTranslation, setShowChineseTranslation] = useState(true);
  const [isBlindTestMode, setIsBlindTestMode] = useState(false); // Hide transcript for listening comprehension test
  const [audioSourceMode, setAudioSourceMode] = useState<'ai-voice' | 'uploaded-mp3'>('ai-voice');

  // Loaded MP3 URL from user upload (via Blob ObjectURL)
  const [loadedAudioUrl, setLoadedAudioUrl] = useState<string | null>(null);
  const [audioFileName, setAudioFileName] = useState<string | null>(null);

  // Audio element ref for MP3
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sentence sequence index for AI voice playback
  const sequenceIndexRef = useRef<number>(0);
  const isSequenceActiveRef = useRef<boolean>(false);

  // Edit / Add modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editTitle, setEditTitle] = useState('');
  const [editTitleZh, setEditTitleZh] = useState('');
  const [editLevel, setEditLevel] = useState<'A2' | 'B1'>('A2');
  const [editSentencesText, setEditSentencesText] = useState('');
  const [editVocabText, setEditVocabText] = useState('');
  const [editUploadedFile, setEditUploadedFile] = useState<File | null>(null);

  // Load custom MP3 from IndexedDB if available
  useEffect(() => {
    let currentBlobUrl: string | null = null;
    let isCancelled = false;

    stopPlayback();

    const loadLessonAudio = async () => {
      if (!activeLesson) return;
      const key = activeLesson.audioKey || `audio_${activeLesson.id}`;
      const blob = await getAudioFile(key);
      if (blob && !isCancelled) {
        currentBlobUrl = URL.createObjectURL(blob);
        setLoadedAudioUrl(currentBlobUrl);
        setAudioFileName(activeLesson.audioFileName || 'custom_lesson_audio.mp3');
        setAudioSourceMode('uploaded-mp3');
      } else if (!isCancelled) {
        setLoadedAudioUrl(null);
        setAudioFileName(null);
        setAudioSourceMode('ai-voice');
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

  // Sync active voice with progress settings if updated
  useEffect(() => {
    if (progress.settings.voiceId) {
      setActiveVoiceId(progress.settings.voiceId);
    }
  }, [progress.settings.voiceId]);

  // Audio player timeupdate listener for uploaded MP3
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
    setIsPaused(false);
    setActiveSentenceId(null);
    onLogActivity('Finished Listening Lesson', '完成听力练习', activeLesson.title);
  };

  // Play / Pause / Resume controls
  const handlePlay = () => {
    if (isPaused) {
      // Resume
      if (audioSourceMode === 'uploaded-mp3' && audioRef.current) {
        audioRef.current.play();
      } else {
        resumeCurrentAudio();
      }
      setIsPlaying(true);
      setIsPaused(false);
      return;
    }

    if (audioSourceMode === 'uploaded-mp3' && loadedAudioUrl && audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
      audioRef.current.play().then(() => {
        setIsPlaying(true);
        setIsPaused(false);
      }).catch(console.warn);
    } else {
      // Natural AI Voice Sequence
      isSequenceActiveRef.current = true;
      setIsPlaying(true);
      setIsPaused(false);
      const startIndex = activeSentenceId 
        ? Math.max(0, activeLesson.sentences.findIndex((s) => s.id === activeSentenceId))
        : 0;
      playSentenceSequence(startIndex);
    }
  };

  const handlePause = () => {
    if (audioSourceMode === 'uploaded-mp3' && audioRef.current) {
      audioRef.current.pause();
    } else {
      pauseCurrentAudio();
    }
    setIsPlaying(false);
    setIsPaused(true);
  };

  const stopPlayback = () => {
    isSequenceActiveRef.current = false;
    stopCurrentAudio();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setIsPaused(false);
    setActiveSentenceId(null);
    setCurrentTime(0);
  };

  const handleReplay = () => {
    stopPlayback();
    if (audioSourceMode === 'uploaded-mp3' && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      setIsPlaying(true);
    } else {
      isSequenceActiveRef.current = true;
      setIsPlaying(true);
      playSentenceSequence(0);
    }
  };

  // Sequential Natural Voice Playback
  const playSentenceSequence = async (idx: number) => {
    if (!isSequenceActiveRef.current) return;
    if (!activeLesson?.sentences || idx >= activeLesson.sentences.length) {
      setIsPlaying(false);
      setIsPaused(false);
      setActiveSentenceId(null);
      isSequenceActiveRef.current = false;
      onLogActivity('Completed Listening Passage', '听完完整语篇', activeLesson.title);
      return;
    }

    sequenceIndexRef.current = idx;
    const sentence = activeLesson.sentences[idx];
    setActiveSentenceId(sentence.id);

    // Speak single sentence using high-quality neural voice
    await playNaturalVoice(sentence.en, {
      voiceId: activeVoiceId,
      speed: playbackSpeed,
      onEnd: () => {
        if (!isSequenceActiveRef.current) return;
        if (repeatSentenceMode) {
          playSentenceSequence(idx);
        } else {
          // Natural slight pause between sentences (500ms)
          setTimeout(() => {
            if (isSequenceActiveRef.current) {
              playSentenceSequence(idx + 1);
            }
          }, 500);
        }
      },
      onError: () => {
        setIsPlaying(false);
        setIsPaused(false);
      },
    });
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (audioRef.current) {
      audioRef.current.preservesPitch = true;
      audioRef.current.playbackRate = speed;
    }
    // Update setting preference
    onUpdateProgress({
      ...progress,
      settings: {
        ...progress.settings,
        speechRate: speed,
      },
    });
  };

  // Switch voice selection and update setting
  const handleVoiceChange = (vId: VoiceProfileId) => {
    setActiveVoiceId(vId);
    onUpdateProgress({
      ...progress,
      settings: {
        ...progress.settings,
        voiceId: vId,
      },
    });
  };

  // Click individual sentence to hear and repeat it
  const handleSelectSentence = async (sentence: ListeningSentence) => {
    setActiveSentenceId(sentence.id);

    if (audioSourceMode === 'uploaded-mp3' && loadedAudioUrl && audioRef.current) {
      audioRef.current.currentTime = sentence.startTime;
      if (!isPlaying) {
        audioRef.current.play();
        setIsPlaying(true);
        setIsPaused(false);
      }
    } else {
      isSequenceActiveRef.current = false;
      setIsPlaying(true);
      setIsPaused(false);
      await playNaturalVoice(sentence.en, {
        voiceId: activeVoiceId,
        speed: playbackSpeed,
        onEnd: () => {
          setIsPlaying(false);
        },
      });
    }
  };

  // Direct MP3 upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeLesson) return;

    try {
      const storageKey = `audio_${activeLesson.id}`;
      await saveAudioFile(storageKey, file);

      const objectUrl = URL.createObjectURL(file);
      setLoadedAudioUrl(objectUrl);
      setAudioFileName(file.name);
      setAudioSourceMode('uploaded-mp3');

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

  // Add / Edit modal helpers
  const openCreateModal = () => {
    setModalMode('create');
    setEditTitle('');
    setEditTitleZh('');
    setEditLevel('A2');
    setEditSentencesText(
      'Person A: Good morning! How was your trip? // 早上好！你的旅程怎么样？\nPerson B: It was fantastic, thank you! I loved the historic castle. // 太棒了，谢谢！我很喜欢那座历史悠久的城堡。'
    );
    setEditVocabText('fantastic: 极好的\nhistoric: 历史悠久的');
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

  const selectedVoiceMeta = NATURAL_VOICE_OPTIONS.find((v) => v.id === activeVoiceId);

  return (
    <div className="space-y-6">
      
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Listening Practice · 听力训练
            </h1>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-sky-500" />
              Neural Voices Active
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Natural human-like teacher narration, sentence-by-sentence repeat, and blind comprehension test mode.
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

      {/* 3. Main Audio Player & Transcript */}
      {activeLesson && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left 2 Cols: Audio Player & Sentence Transcript */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* Audio Controller Card */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 space-y-5">
              
              {/* Lesson Title & Controls */}
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

              {/* Natural Voice Selector Bar */}
              <div className="p-3.5 rounded-2xl bg-sky-50/70 border border-sky-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-sky-500 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    AI
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900">
                      Teacher Voice: {selectedVoiceMeta?.label}
                    </span>
                    <span className="text-slate-500 block text-[11px]">
                      {selectedVoiceMeta?.description}
                    </span>
                  </div>
                </div>

                {/* Voice Toggle Buttons */}
                <div className="flex items-center gap-1 p-0.5 bg-white rounded-xl border border-sky-200">
                  {NATURAL_VOICE_OPTIONS.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => handleVoiceChange(v.id)}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer ${
                        activeVoiceId === v.id
                          ? 'bg-sky-500 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                      title={v.description}
                    >
                      {v.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Uploaded MP3 Mode Switcher (if user uploaded an MP3 file) */}
              {loadedAudioUrl && (
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-700">
                    <FileAudio className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>
                      MP3 Loaded: <span className="font-semibold text-slate-900">{audioFileName}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setAudioSourceMode(audioSourceMode === 'ai-voice' ? 'uploaded-mp3' : 'ai-voice')}
                      className={`px-2.5 py-1 rounded-lg font-semibold text-xs transition-colors cursor-pointer ${
                        audioSourceMode === 'uploaded-mp3'
                          ? 'bg-purple-600 text-white'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {audioSourceMode === 'uploaded-mp3' ? 'Playing MP3' : 'Switch to MP3'}
                    </button>
                  </div>
                </div>
              )}

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

              {/* Playback Progress Indicator for Sentence Sequence */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-medium">
                    {activeSentenceId 
                      ? `Sentence ${(activeLesson.sentences.findIndex((s) => s.id === activeSentenceId) + 1)} of ${activeLesson.sentences.length}`
                      : 'Entire Passage Flow'}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    Est. {activeLesson.duration}
                  </span>
                </div>

                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-sky-500 h-1.5 rounded-full transition-all duration-300"
                    style={{
                      width: activeSentenceId 
                        ? `${(((activeLesson.sentences.findIndex((s) => s.id === activeSentenceId) + 1) / activeLesson.sentences.length) * 100)}%`
                        : isPlaying ? '100%' : '0%'
                    }}
                  />
                </div>
              </div>

              {/* Comprehensive Audio Controls: Play, Pause, Resume, Stop, Replay, Repeat */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                
                <div className="flex items-center gap-2.5">
                  
                  {/* Replay */}
                  <button
                    onClick={handleReplay}
                    className="p-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                    title="Replay from beginning"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </button>

                  {/* Play / Pause / Resume */}
                  {isPlaying ? (
                    <button
                      onClick={handlePause}
                      className="p-3.5 bg-sky-500 hover:bg-sky-600 text-white rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer"
                      title="Pause"
                    >
                      <Pause className="w-6 h-6" />
                    </button>
                  ) : (
                    <button
                      onClick={handlePlay}
                      className="p-3.5 bg-sky-500 hover:bg-sky-600 text-white rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer"
                      title={isPaused ? 'Resume' : 'Play'}
                    >
                      <Play className="w-6 h-6 fill-white" />
                    </button>
                  )}

                  {/* Stop */}
                  {(isPlaying || isPaused) && (
                    <button
                      onClick={stopPlayback}
                      className="p-2.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                      title="Stop playback"
                    >
                      <Square className="w-5 h-5" />
                    </button>
                  )}

                  {/* Repeat Sentence Mode */}
                  <button
                    onClick={() => setRepeatSentenceMode(!repeatSentenceMode)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                      repeatSentenceMode
                        ? 'bg-sky-50 text-sky-700 border-sky-300 font-semibold'
                        : 'text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                    title="Loop current sentence continuously"
                  >
                    <Repeat className="w-3.5 h-3.5" />
                    <span>Repeat Sentence (单句循环)</span>
                  </button>

                </div>

                {/* Pitch-Preserving Speed Controls */}
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

            {/* Transcript & Blind Test View */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 space-y-4">
              
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Headphones className="w-4 h-4 text-sky-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Bilingual Dialogue Transcript
                  </h3>
                </div>

                {/* Blind Listening Test & Translation Toggles */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsBlindTestMode(!isBlindTestMode)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                      isBlindTestMode
                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                        : 'text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                    title="Hide transcript to test pure listening comprehension"
                  >
                    {isBlindTestMode ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    <span>{isBlindTestMode ? 'Exit Blind Test' : 'Blind Test Mode (盲听测试)'}</span>
                  </button>

                  {!isBlindTestMode && (
                    <button
                      onClick={() => setShowChineseTranslation(!showChineseTranslation)}
                      className="text-xs text-sky-600 hover:underline font-medium cursor-pointer"
                    >
                      {showChineseTranslation ? 'Hide Chinese' : 'Show Chinese'}
                    </button>
                  )}
                </div>
              </div>

              {/* Blind Listening Curtain Mode */}
              {isBlindTestMode ? (
                <div className="py-12 px-6 text-center bg-slate-50/70 rounded-2xl border border-dashed border-slate-200 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                    <Headphones className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-800">
                      Blind Comprehension Mode Active (盲听训练进行中)
                    </h4>
                    <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                      Transcript is hidden. Focus purely on auditory comprehension, rhythm, and sentence stress. Click "Exit Blind Test" whenever you want to check the text.
                    </p>
                  </div>
                  {activeSentenceId && (
                    <div className="pt-2 text-xs font-semibold text-sky-600">
                      Currently playing: Sentence {(activeLesson.sentences.findIndex((s) => s.id === activeSentenceId) + 1)}
                    </div>
                  )}
                </div>
              ) : (
                /* Interactive Sentences with Sentence-by-Sentence Highlight & Replay */
                <div className="space-y-3">
                  {activeLesson.sentences.map((sent, index) => {
                    const isActive = activeSentenceId === sent.id;

                    return (
                      <div
                        key={sent.id}
                        onClick={() => handleSelectSentence(sent)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                          isActive
                            ? 'bg-sky-50/80 border-sky-300 shadow-2xs ring-1 ring-sky-200'
                            : 'bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50/60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1 flex-1">
                            <p className={`text-sm sm:text-base leading-relaxed ${
                              isActive ? 'font-bold text-slate-900' : 'text-slate-700'
                            }`}>
                              {sent.en}
                            </p>
                            {showChineseTranslation && (
                              <p className="text-xs text-slate-500 leading-normal">
                                {sent.zh}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectSentence(sent);
                              }}
                              className={`p-2 rounded-xl transition-all cursor-pointer ${
                                isActive 
                                  ? 'text-white bg-sky-500 shadow-xs' 
                                  : 'text-slate-400 hover:text-sky-600 hover:bg-sky-50'
                              }`}
                              title="Replay this sentence"
                            >
                              <Volume2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>

          </div>

          {/* Right Col: Teacher Voice Info & Vocabulary Explanations */}
          <div className="space-y-4">
            
            {/* Active Voice Persona Spotlight */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900">
                  Voice Technology · 语音引擎
                </h3>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Selected Voice:</span>
                  <span className="font-semibold text-slate-800">{selectedVoiceMeta?.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Accent:</span>
                  <span className="font-semibold text-slate-800">{selectedVoiceMeta?.accentLabel}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Playback Speed:</span>
                  <span className="font-semibold text-slate-800">{playbackSpeed}x (pitch preserved)</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/mp3,audio/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-sky-600 hover:underline font-semibold cursor-pointer inline-flex items-center gap-1"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Custom MP3 Audio</span>
                </button>
              </div>
            </div>

            {/* Key Vocabulary Drawer */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <BookOpen className="w-4 h-4 text-sky-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Key Vocabulary in this Audio
                </h3>
              </div>

              <div className="space-y-2.5">
                {activeLesson.vocabulary.map((vocab, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{vocab.word}</span>
                        <button
                          onClick={() => playNaturalVoice(vocab.word, { voiceId: activeVoiceId })}
                          className="p-1 text-slate-400 hover:text-sky-600 cursor-pointer"
                          title="Pronounce word"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-slate-600 mt-1">{vocab.meaningZh}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-sky-50 rounded-2xl border border-sky-100 text-xs text-sky-800 space-y-1">
                <p className="font-semibold">💡 Listening Tip:</p>
                <p className="text-[11px] leading-relaxed text-sky-700">
                  Try listening once in Blind Test Mode without looking at the text. Then click sentences to review and repeat!
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
