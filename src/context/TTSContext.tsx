import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { VoiceProfileId, UserSettings, ListeningLesson } from '../types';
import {
  CentralizedPlaybackState,
  PlaybackOptions,
  subscribePlaybackState,
  getPlaybackState,
  playNaturalVoice,
  playParagraphSequence,
  startListeningLessonPlayback,
  pauseCurrentAudio,
  resumeCurrentAudio,
  stopCurrentAudio,
  replayPlayback,
  playNextSentence,
  playPrevSentence,
  seekPlayback,
  seekRelative,
  setGlobalPlaybackSpeed,
  setGlobalPlaybackVoice,
  setGlobalRepeatMode,
  extractEnglishOnly,
  NATURAL_VOICE_OPTIONS,
  NaturalVoiceOption,
  getCacheStats,
  clearAllAudioCache,
  getTTSQueueState,
  subscribeTTSQueue,
  TTSQueueState,
  loadBrowserVoices,
  playWithFallbackNow as speechPlayWithFallbackNow
} from '../services/speech';

interface TTSContextType {
  playbackState: CentralizedPlaybackState;
  queueState: TTSQueueState;
  play: (text: string, options?: Partial<PlaybackOptions>) => Promise<void>;
  playParagraph: (text: string, options?: Partial<PlaybackOptions>) => Promise<void>;
  playListeningLesson: (
    lesson: ListeningLesson,
    options?: { startIndex?: number; sourceMode?: 'ai-voice' | 'uploaded-mp3'; mp3Url?: string }
  ) => Promise<void>;
  playSentenceIndex: (index: number) => void;
  playImmediateFallback: (text?: string) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  replay: () => void;
  nextSentence: () => void;
  prevSentence: () => void;
  seek: (seconds: number) => void;
  seekRelative: (deltaSeconds: number) => void;
  setSpeed: (speed: number) => void;
  setVoiceId: (voiceId: VoiceProfileId) => void;
  setRepeatMode: (repeat: boolean) => void;
  isTextPlaying: (text: string) => boolean;
  isSentencePlaying: (sentenceIdOrText: string) => boolean;
  currentVoiceOption: NaturalVoiceOption;
  cacheStats: { count: number; totalEstimatedBytes: number };
  refreshCacheStats: () => Promise<void>;
  clearCache: () => Promise<void>;
  availableSystemVoices: SpeechSynthesisVoice[];
  preferredSystemVoice: string | null;
  setPreferredSystemVoice: (uri: string) => void;
}

const TTSContext = createContext<TTSContextType | null>(null);

interface TTSProviderProps {
  children: ReactNode;
  userSettings: UserSettings;
  onUpdateUserSettings?: (updatedSettings: Partial<UserSettings>) => void;
}

export const TTSProvider: React.FC<TTSProviderProps> = ({
  children,
  userSettings,
  onUpdateUserSettings,
}) => {
  const [playbackState, setPlaybackState] = useState<CentralizedPlaybackState>(() => getPlaybackState());
  const [queueState, setQueueState] = useState<TTSQueueState>(() => getTTSQueueState());
  const [cacheStats, setCacheStats] = useState({ count: 0, totalEstimatedBytes: 0 });
  const [availableSystemVoices, setAvailableSystemVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [preferredSystemVoice, setPreferredSystemVoiceState] = useState<string | null>(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('my_english_preferred_sys_voice') : null;
  });

  // Subscribe to centralized playback & queue state
  useEffect(() => {
    const unsubPlayback = subscribePlaybackState((state) => {
      setPlaybackState({ ...state });
    });
    const unsubQueue = subscribeTTSQueue((qState) => {
      setQueueState({ ...qState });
    });
    return () => {
      unsubPlayback();
      unsubQueue();
    };
  }, []);

  // Initialize and keep voice & speed in sync with user settings
  useEffect(() => {
    if (userSettings.voiceId) {
      setGlobalPlaybackVoice(userSettings.voiceId);
    }
    if (userSettings.speechRate) {
      setGlobalPlaybackSpeed(userSettings.speechRate);
    }
  }, [userSettings.voiceId, userSettings.speechRate]);

  // Load cache stats and available system voices
  const refreshCacheStats = useCallback(async () => {
    const stats = await getCacheStats();
    setCacheStats(stats);
  }, []);

  useEffect(() => {
    refreshCacheStats();
    loadBrowserVoices().then((voices) => {
      setAvailableSystemVoices(voices.filter((v) => v.lang.startsWith('en')));
    });
  }, [refreshCacheStats]);

  const clearCache = useCallback(async () => {
    await clearAllAudioCache();
    await refreshCacheStats();
  }, [refreshCacheStats]);

  const setPreferredSystemVoice = useCallback((uri: string) => {
    setPreferredSystemVoiceState(uri);
    if (typeof window !== 'undefined') {
      localStorage.setItem('my_english_preferred_sys_voice', uri);
    }
  }, []);

  const currentVoiceOption =
    NATURAL_VOICE_OPTIONS.find((v) => v.id === playbackState.voiceId) ||
    NATURAL_VOICE_OPTIONS[0];

  const play = useCallback(
    async (text: string, options?: Partial<PlaybackOptions>) => {
      const clean = extractEnglishOnly(text);
      if (!clean) return;

      const voiceId = options?.voiceId || userSettings.voiceId || playbackState.voiceId || 'us-female';
      const speed = options?.speed || userSettings.speechRate || playbackState.speed || 1.0;
      const accent = userSettings.voiceAccent || currentVoiceOption.accent;

      await playNaturalVoice(clean, {
        voiceId,
        speed,
        accent,
        ...options,
      });

      refreshCacheStats();
    },
    [userSettings.voiceId, userSettings.speechRate, userSettings.voiceAccent, playbackState.voiceId, playbackState.speed, currentVoiceOption.accent, refreshCacheStats]
  );

  const playParagraph = useCallback(
    async (text: string, options?: Partial<PlaybackOptions>) => {
      const clean = extractEnglishOnly(text);
      if (!clean) return;

      const voiceId = options?.voiceId || userSettings.voiceId || playbackState.voiceId || 'us-female';
      const speed = options?.speed || userSettings.speechRate || playbackState.speed || 1.0;
      const accent = userSettings.voiceAccent || currentVoiceOption.accent;

      await playParagraphSequence(clean, {
        voiceId,
        speed,
        accent,
        ...options,
      });

      refreshCacheStats();
    },
    [userSettings.voiceId, userSettings.speechRate, userSettings.voiceAccent, playbackState.voiceId, playbackState.speed, currentVoiceOption.accent, refreshCacheStats]
  );

  const playListeningLesson = useCallback(
    async (
      lesson: ListeningLesson,
      options?: { startIndex?: number; sourceMode?: 'ai-voice' | 'uploaded-mp3'; mp3Url?: string }
    ) => {
      const voiceId = userSettings.voiceId || playbackState.voiceId || 'us-female';
      const speed = userSettings.speechRate || playbackState.speed || 1.0;

      await startListeningLessonPlayback(lesson, {
        startIndex: options?.startIndex || 0,
        sourceMode: options?.sourceMode || 'ai-voice',
        mp3Url: options?.mp3Url,
        speed,
        voiceId,
      });

      refreshCacheStats();
    },
    [userSettings.voiceId, userSettings.speechRate, playbackState.voiceId, playbackState.speed, refreshCacheStats]
  );

  const playSentenceIndex = useCallback(
    (index: number) => {
      if (playbackState.sentences && playbackState.sentences[index]) {
        const sentence = playbackState.sentences[index];
        playNaturalVoice(sentence.en, {
          voiceId: playbackState.voiceId,
          speed: playbackState.speed,
          sentenceId: sentence.id,
          sentenceIndex: index,
          sentences: playbackState.sentences,
          module: playbackState.currentModule || undefined,
          contentId: playbackState.contentId || undefined,
        });
      }
    },
    [playbackState.sentences, playbackState.voiceId, playbackState.speed, playbackState.currentModule, playbackState.contentId]
  );

  const playImmediateFallback = useCallback(
    (text?: string) => {
      const target = text || playbackState.currentText;
      if (target) {
        speechPlayWithFallbackNow(target);
      }
    },
    [playbackState.currentText]
  );

  const pause = useCallback(() => {
    pauseCurrentAudio();
  }, []);

  const resume = useCallback(() => {
    resumeCurrentAudio();
  }, []);

  const stop = useCallback(() => {
    stopCurrentAudio();
  }, []);

  const replay = useCallback(() => {
    replayPlayback();
  }, []);

  const nextSentence = useCallback(() => {
    playNextSentence();
  }, []);

  const prevSentence = useCallback(() => {
    playPrevSentence();
  }, []);

  const seek = useCallback((seconds: number) => {
    seekPlayback(seconds);
  }, []);

  const handleSeekRelative = useCallback((delta: number) => {
    seekRelative(delta);
  }, []);

  const setSpeed = useCallback(
    (speed: number) => {
      setGlobalPlaybackSpeed(speed);
      if (onUpdateUserSettings) {
        onUpdateUserSettings({ speechRate: speed });
      }
    },
    [onUpdateUserSettings]
  );

  const setVoiceId = useCallback(
    (voiceId: VoiceProfileId) => {
      setGlobalPlaybackVoice(voiceId);
      const option = NATURAL_VOICE_OPTIONS.find((v) => v.id === voiceId);
      if (onUpdateUserSettings && option) {
        onUpdateUserSettings({
          voiceId,
          voiceAccent: option.accent,
          voiceGender: option.gender,
        });
      }
    },
    [onUpdateUserSettings]
  );

  const setRepeatMode = useCallback((repeat: boolean) => {
    setGlobalRepeatMode(repeat);
  }, []);

  const isTextPlaying = useCallback(
    (text: string) => {
      if (playbackState.status !== 'playing' && playbackState.status !== 'paused') return false;
      const clean = extractEnglishOnly(text);
      if (!clean || !playbackState.currentText) return false;
      return (
        playbackState.currentText === clean ||
        playbackState.currentText.includes(clean) ||
        clean.includes(playbackState.currentText)
      );
    },
    [playbackState.status, playbackState.currentText]
  );

  const isSentencePlaying = useCallback(
    (sentenceIdOrText: string) => {
      if (playbackState.status !== 'playing' && playbackState.status !== 'paused') return false;
      if (playbackState.currentSentenceId && playbackState.currentSentenceId === sentenceIdOrText) {
        return true;
      }
      const clean = extractEnglishOnly(sentenceIdOrText);
      if (!clean || !playbackState.currentText) return false;
      return (
        playbackState.currentText === clean ||
        playbackState.currentText.includes(clean) ||
        clean.includes(playbackState.currentText)
      );
    },
    [playbackState.status, playbackState.currentSentenceId, playbackState.currentText]
  );

  return (
    <TTSContext.Provider
      value={{
        playbackState,
        queueState,
        play,
        playParagraph,
        playListeningLesson,
        playSentenceIndex,
        playImmediateFallback,
        pause,
        resume,
        stop,
        replay,
        nextSentence,
        prevSentence,
        seek,
        seekRelative: handleSeekRelative,
        setSpeed,
        setVoiceId,
        setRepeatMode,
        isTextPlaying,
        isSentencePlaying,
        currentVoiceOption,
        cacheStats,
        refreshCacheStats,
        clearCache,
        availableSystemVoices,
        preferredSystemVoice,
        setPreferredSystemVoice,
      }}
    >
      {children}
    </TTSContext.Provider>
  );
};

export function useTTS(): TTSContextType {
  const context = useContext(TTSContext);
  if (!context) {
    throw new Error('useTTS must be used within a TTSProvider');
  }
  return context;
}
