import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { VoiceProfileId, UserSettings } from '../types';
import {
  ActivePlaybackState,
  PlaybackOptions,
  subscribePlaybackState,
  getPlaybackState,
  playNaturalVoice,
  playParagraphSequence,
  pauseCurrentAudio,
  resumeCurrentAudio,
  stopCurrentAudio,
  setGlobalPlaybackSpeed,
  setGlobalPlaybackVoice,
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
  playbackState: ActivePlaybackState;
  queueState: TTSQueueState;
  play: (text: string, options?: Partial<PlaybackOptions>) => Promise<void>;
  playParagraph: (text: string, options?: Partial<PlaybackOptions>) => Promise<void>;
  playImmediateFallback: (text?: string) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  replay: () => void;
  setSpeed: (speed: number) => void;
  setVoiceId: (voiceId: VoiceProfileId) => void;
  isTextPlaying: (text: string) => boolean;
  isSentencePlaying: (sentence: string) => boolean;
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
  const [playbackState, setPlaybackState] = useState<ActivePlaybackState>(() => getPlaybackState());
  const [queueState, setQueueState] = useState<TTSQueueState>(() => getTTSQueueState());
  const [lastPlayedText, setLastPlayedText] = useState<string | null>(null);
  const [lastWasParagraph, setLastWasParagraph] = useState<boolean>(false);
  const [cacheStats, setCacheStats] = useState({ count: 0, totalEstimatedBytes: 0 });
  const [availableSystemVoices, setAvailableSystemVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [preferredSystemVoice, setPreferredSystemVoiceState] = useState<string | null>(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('my_english_preferred_sys_voice') : null;
  });

  // Sync state from audio engine subscription
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

  // Sync global speech settings when userSettings change
  useEffect(() => {
    if (userSettings.voiceId) {
      setGlobalPlaybackVoice(userSettings.voiceId);
    }
    if (userSettings.speechRate) {
      setGlobalPlaybackSpeed(userSettings.speechRate);
    }
  }, [userSettings.voiceId, userSettings.speechRate]);

  const currentVoiceOption =
    NATURAL_VOICE_OPTIONS.find((v) => v.id === playbackState.voiceId) ||
    NATURAL_VOICE_OPTIONS[0];

  const play = useCallback(
    async (text: string, options?: Partial<PlaybackOptions>) => {
      const clean = extractEnglishOnly(text);
      if (!clean) return;

      setLastPlayedText(clean);
      setLastWasParagraph(false);

      const voiceId = options?.voiceId || userSettings.voiceId || 'us-female';
      const speed = options?.speed || userSettings.speechRate || 1.0;
      const accent = userSettings.voiceAccent;

      await playNaturalVoice(clean, {
        voiceId,
        speed,
        accent,
        ...options,
      });

      // Update cache stats in background
      refreshCacheStats();
    },
    [userSettings.voiceId, userSettings.speechRate, userSettings.voiceAccent, refreshCacheStats]
  );

  const playParagraph = useCallback(
    async (text: string, options?: Partial<PlaybackOptions>) => {
      const clean = extractEnglishOnly(text);
      if (!clean) return;

      setLastPlayedText(clean);
      setLastWasParagraph(true);

      const voiceId = options?.voiceId || userSettings.voiceId || 'us-female';
      const speed = options?.speed || userSettings.speechRate || 1.0;
      const accent = userSettings.voiceAccent;

      await playParagraphSequence(clean, {
        voiceId,
        speed,
        accent,
        ...options,
      });

      // Update cache stats in background
      refreshCacheStats();
    },
    [userSettings.voiceId, userSettings.speechRate, userSettings.voiceAccent, refreshCacheStats]
  );

  const playImmediateFallback = useCallback(
    (text?: string) => {
      const target = text || lastPlayedText || playbackState.currentText;
      if (target) {
        speechPlayWithFallbackNow(target);
      }
    },
    [lastPlayedText, playbackState.currentText]
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
    if (!lastPlayedText) return;
    if (lastWasParagraph) {
      playParagraph(lastPlayedText);
    } else {
      play(lastPlayedText);
    }
  }, [lastPlayedText, lastWasParagraph, play, playParagraph]);

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

  const isTextPlaying = useCallback(
    (text: string) => {
      if (!playbackState.isPlaying && !playbackState.isPaused) return false;
      const clean = extractEnglishOnly(text);
      if (!clean || !playbackState.currentText) return false;
      return (
        playbackState.currentText === clean ||
        playbackState.currentText.includes(clean) ||
        clean.includes(playbackState.currentText)
      );
    },
    [playbackState.isPlaying, playbackState.isPaused, playbackState.currentText]
  );

  const isSentencePlaying = useCallback(
    (sentence: string) => {
      if (!playbackState.isPlaying && !playbackState.isPaused) return false;
      const clean = extractEnglishOnly(sentence);
      if (!clean || !playbackState.activeSentence) return false;
      return (
        playbackState.activeSentence === clean ||
        playbackState.activeSentence.includes(clean) ||
        clean.includes(playbackState.activeSentence)
      );
    },
    [playbackState.isPlaying, playbackState.isPaused, playbackState.activeSentence]
  );

  return (
    <TTSContext.Provider
      value={{
        playbackState,
        queueState,
        play,
        playParagraph,
        playImmediateFallback,
        pause,
        resume,
        stop,
        replay,
        setSpeed,
        setVoiceId,
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
