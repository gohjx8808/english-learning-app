/**
 * Centralized High-Quality Natural Voice Speech Engine & Playback Manager
 * Provides a single source of truth for all playback across:
 * - Listening Module (sentence sequences & uploaded MP3)
 * - Floating Global Audio Player
 * - Vocabulary, Grammar, Reading, Speaking & Dashboard
 *
 * Implements synchronized controls:
 * Play, Pause, Resume, Stop, Replay, Next Sentence, Previous Sentence, Seek.
 * Guarantees strict voice consistency, persistent cache keying, and development telemetry.
 */

import { VoiceProfileId, ListeningLesson, ListeningSentence } from '../types';
import { 
  buildAudioCacheKey, 
  getAudioFromCache, 
  saveAudioToCache,
  getCacheStats,
  clearAllAudioCache
} from './ttsCache';
import { 
  enqueueTTSRequest, 
  bypassQueueToBrowserFallback,
  getTTSQueueState,
  subscribeTTSQueue,
  TTSQueueState
} from './ttsQueue';

export { getCacheStats, clearAllAudioCache, getTTSQueueState, subscribeTTSQueue };
export type { TTSQueueState };

export type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'stopped' | 'error';
export type AudioSourceType = 'gemini' | 'cached' | 'fallback' | 'uploaded-mp3';

export interface NaturalVoiceOption {
  id: VoiceProfileId;
  name: string;
  label: string;
  gender: 'female' | 'male';
  accent: 'en-US' | 'en-GB';
  accentLabel: string;
  description: string;
  previewText: string;
  voiceName: string; // Gemini model voice name: Kore, Puck, Aoede, Charon
}

export const NATURAL_VOICE_OPTIONS: NaturalVoiceOption[] = [
  {
    id: 'us-female',
    name: 'Sarah',
    label: 'Sarah (US Female)',
    gender: 'female',
    accent: 'en-US',
    accentLabel: 'American English (美式)',
    description: 'Warm, clear, and encouraging American English teacher voice',
    previewText: 'Hello! I am Sarah, your American English teacher. Consistent daily practice brings natural fluency!',
    voiceName: 'Kore',
  },
  {
    id: 'us-male',
    name: 'Michael',
    label: 'Michael (US Male)',
    gender: 'male',
    accent: 'en-US',
    accentLabel: 'American English (美式)',
    description: 'Friendly, natural American conversational instructor',
    previewText: 'Hi there! I am Michael. Let us practice English together step by step today.',
    voiceName: 'Puck',
  },
  {
    id: 'uk-female',
    name: 'Emma',
    label: 'Emma (UK Female)',
    gender: 'female',
    accent: 'en-GB',
    accentLabel: 'British English (英式)',
    description: 'Articulate, elegant British RP teacher voice with clear enunciation',
    previewText: 'Good day! I am Emma. Welcome to your British English listening and speaking lesson.',
    voiceName: 'Aoede',
  },
  {
    id: 'uk-male',
    name: 'Oliver',
    label: 'Oliver (UK Male)',
    gender: 'male',
    accent: 'en-GB',
    accentLabel: 'British English (英式)',
    description: 'Warm, thoughtful British English language instructor',
    previewText: 'Hello! I am Oliver. Take your time, listen carefully, and repeat after me.',
    voiceName: 'Charon',
  },
];

export interface PlaybackSentenceItem {
  id: string;
  en: string;
  zh?: string;
  startTime?: number;
  endTime?: number;
}

export interface CentralizedPlaybackState {
  status: PlaybackStatus;
  currentText: string | null;
  currentModule: string | null;      // 'listening' | 'vocabulary' | 'reading' | etc.
  contentId: string | null;          // lessonId, passageId, etc.
  contentTitle: string | null;
  currentSentenceId: string | null;
  currentSentenceIndex: number;
  totalSentences: number;
  sentences: PlaybackSentenceItem[];
  audioSource: AudioSourceType;
  provider: 'gemini' | 'browser' | 'mp3';
  currentTime: number;              // playback progress in seconds
  duration: number;                 // total duration in seconds
  voiceId: VoiceProfileId;
  accent: 'en-US' | 'en-GB';
  speed: number;
  repeatMode: boolean;
  errorMessage?: string;
}

export interface PlaybackOptions {
  voiceId?: VoiceProfileId;
  speed?: number; // 0.75, 1.0, 1.25, 1.5
  accent?: 'en-US' | 'en-GB';
  voiceGender?: 'female' | 'male';
  module?: string;
  contentId?: string;
  contentTitle?: string;
  sentenceId?: string;
  sentences?: PlaybackSentenceItem[];
  sentenceIndex?: number;
  forceBrowserFallback?: boolean;
  allowFallbackIfWaiting?: boolean;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: unknown) => void;
  onPause?: () => void;
  onResume?: () => void;
}

// Global Single Source of Truth Playback State
let globalPlaybackState: CentralizedPlaybackState = {
  status: 'idle',
  currentText: null,
  currentModule: null,
  contentId: null,
  contentTitle: null,
  currentSentenceId: null,
  currentSentenceIndex: 0,
  totalSentences: 0,
  sentences: [],
  audioSource: 'gemini',
  provider: 'gemini',
  currentTime: 0,
  duration: 0,
  voiceId: 'us-female',
  accent: 'en-US',
  speed: 1.0,
  repeatMode: false,
};

// State change subscribers
const stateListeners = new Set<(state: CentralizedPlaybackState) => void>();

function notifyStateChange(updates?: Partial<CentralizedPlaybackState>) {
  if (updates) {
    globalPlaybackState = { ...globalPlaybackState, ...updates };
  }
  stateListeners.forEach((listener) => {
    try {
      listener(globalPlaybackState);
    } catch (e) {
      console.warn('[Playback State] Listener callback error:', e);
    }
  });
}

export function subscribePlaybackState(listener: (state: CentralizedPlaybackState) => void): () => void {
  stateListeners.add(listener);
  listener(globalPlaybackState);
  return () => {
    stateListeners.delete(listener);
  };
}

export function getPlaybackState(): CentralizedPlaybackState {
  return globalPlaybackState;
}

export function setGlobalPlaybackVoice(voiceId: VoiceProfileId): void {
  const matched = NATURAL_VOICE_OPTIONS.find((v) => v.id === voiceId) || NATURAL_VOICE_OPTIONS[0];
  globalPlaybackState.voiceId = matched.id;
  globalPlaybackState.accent = matched.accent;
  console.log('[TTS Debug] Switched Centralized Voice to:', matched.id, `(${matched.name}, ${matched.accent}, ${matched.voiceName})`);
  notifyStateChange({ voiceId: matched.id, accent: matched.accent });
}

export function setGlobalPlaybackSpeed(speed: number): void {
  globalPlaybackState.speed = speed;
  if (currentAudio) {
    currentAudio.playbackRate = speed;
  }
  notifyStateChange({ speed });
}

export function setGlobalRepeatMode(repeat: boolean): void {
  globalPlaybackState.repeatMode = repeat;
  notifyStateChange({ repeatMode: repeat });
}

/**
 * Strips Chinese characters, Chinese punctuation, and bracketed translations
 * so only clean English is synthesized.
 */
export function extractEnglishOnly(text: string): string {
  if (!text) return '';
  let cleaned = text.replace(/[\(（\[][^\)）\]]*[\u4e00-\u9fa5]+[^\)）\]]*[\)）\]]/g, '');
  cleaned = cleaned.replace(/[\u4e00-\u9fa5\u3000-\u303f\uff01-\uff5e]/g, ' ');
  cleaned = cleaned.replace(/[\(（\[]\s*[\)）\]]/g, ' ');
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  return cleaned || text.trim();
}

/**
 * Splits long paragraphs into individual natural sentences (. ! ?)
 */
export function splitIntoSentences(text: string): string[] {
  const english = extractEnglishOnly(text);
  if (!english) return [];
  const regex = /[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g;
  const matches = english.match(regex);
  if (!matches) return [english];
  return matches.map((s) => s.trim()).filter((s) => s.length > 0);
}

// Audio player instances
let currentAudio: HTMLAudioElement | null = null;
let currentAbortController: AbortController | null = null;
let activeSequenceToken = 0;
let progressInterval: any = null;

// Clean in-memory URL cache
const memoryAudioCache = new Map<string, string>();

function stopProgressTicker() {
  if (progressInterval) {
    clearInterval(progressInterval);
    progressInterval = null;
  }
}

function startProgressTicker() {
  stopProgressTicker();
  progressInterval = setInterval(() => {
    if (currentAudio && !currentAudio.paused && !currentAudio.ended) {
      notifyStateChange({
        currentTime: currentAudio.currentTime,
        duration: currentAudio.duration || 0,
      });
    }
  }, 200);
}

/**
 * Halts ALL active audio playback, timers, sequences, and speech synthesis
 */
export function stopCurrentAudio(): void {
  activeSequenceToken++; // Invalidate sequence loop
  stopProgressTicker();

  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    } catch {}
    currentAudio = null;
  }

  if (currentAbortController) {
    try {
      currentAbortController.abort();
    } catch {}
    currentAbortController = null;
  }

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }

  notifyStateChange({
    status: 'stopped',
    currentTime: 0,
  });
}

/**
 * Synchronized Pause: Pauses whatever audio is currently active
 */
export function pauseCurrentAudio(): void {
  stopProgressTicker();

  if (currentAudio && !currentAudio.paused) {
    currentAudio.pause();
    notifyStateChange({ status: 'paused' });
  } else if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.speaking) {
    window.speechSynthesis.pause();
    notifyStateChange({ status: 'paused' });
  } else {
    notifyStateChange({ status: 'paused' });
  }
}

/**
 * Synchronized Resume: Resumes paused audio or sequence
 */
export function resumeCurrentAudio(): void {
  if (currentAudio && currentAudio.paused) {
    currentAudio.play().then(() => {
      startProgressTicker();
      notifyStateChange({ status: 'playing' });
    }).catch(console.warn);
  } else if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.paused) {
    window.speechSynthesis.resume();
    notifyStateChange({ status: 'playing' });
  } else if (globalPlaybackState.status === 'paused') {
    // If we paused between sentences in an active sequence, trigger resume sequence
    if (globalPlaybackState.sentences.length > 0) {
      resumeSequencePlayback();
    }
  }
}

export function isAudioPlaying(): boolean {
  return globalPlaybackState.status === 'playing';
}

export function isAudioPaused(): boolean {
  return globalPlaybackState.status === 'paused';
}

/**
 * Plays a single sentence or text snippet with full voice synchronization & caching
 */
export async function playNaturalVoice(
  text: string,
  options: PlaybackOptions = {}
): Promise<HTMLAudioElement | null> {
  const cleanText = extractEnglishOnly(text);
  if (!cleanText) return null;

  stopCurrentAudio();

  // Explicit voice resolution: options -> centralized state -> default
  const voiceId: VoiceProfileId = options.voiceId || globalPlaybackState.voiceId || 'us-female';
  const voiceMeta = NATURAL_VOICE_OPTIONS.find((v) => v.id === voiceId) || NATURAL_VOICE_OPTIONS[0];
  const speed = options.speed || globalPlaybackState.speed || 1.0;
  const accent = options.accent || voiceMeta.accent;

  // Build strict unique cache key incorporating provider, model, voiceId, accent, and speed
  const cacheKey = buildAudioCacheKey(cleanText, voiceId, 'gemini', 'gemini-3.8-flash-lite-tts', speed, accent);

  notifyStateChange({
    status: 'loading',
    currentText: cleanText,
    currentModule: options.module || globalPlaybackState.currentModule,
    contentId: options.contentId || globalPlaybackState.contentId,
    contentTitle: options.contentTitle || globalPlaybackState.contentTitle,
    currentSentenceId: options.sentenceId || globalPlaybackState.currentSentenceId,
    currentSentenceIndex: options.sentenceIndex !== undefined ? options.sentenceIndex : globalPlaybackState.currentSentenceIndex,
    totalSentences: options.sentences ? options.sentences.length : (globalPlaybackState.totalSentences || 1),
    sentences: options.sentences || (globalPlaybackState.sentences.length > 0 ? globalPlaybackState.sentences : [{ id: 's1', en: cleanText }]),
    voiceId,
    accent,
    speed,
    audioSource: 'gemini',
    provider: 'gemini',
  });

  // Layer 1: Memory URL Cache
  const memoryUrl = memoryAudioCache.get(cacheKey);
  if (memoryUrl) {
    console.log('[TTS Debug]', {
      selectedVoiceId: voiceId,
      actualVoiceSentToAPI: voiceMeta.voiceName,
      provider: 'gemini',
      model: 'gemini-3.8-flash-lite-tts',
      isFromCache: true,
      cacheLayer: 'memory',
      playbackStatus: 'playing',
      currentModule: globalPlaybackState.currentModule,
      audioSource: 'cached',
    });

    notifyStateChange({
      status: 'playing',
      audioSource: 'cached',
      provider: 'gemini',
    });
    return playAudioUrl(memoryUrl, speed, options, 'cached');
  }

  // Layer 2: Persistent IndexedDB Cache
  const dbRecord = await getAudioFromCache(cacheKey);
  if (dbRecord && dbRecord.audioBase64) {
    const audioUrl = `data:${dbRecord.mimeType || 'audio/wav'};base64,${dbRecord.audioBase64}`;
    memoryAudioCache.set(cacheKey, audioUrl);

    console.log('[TTS Debug]', {
      selectedVoiceId: voiceId,
      actualVoiceSentToAPI: voiceMeta.voiceName,
      provider: 'gemini',
      model: 'gemini-3.8-flash-lite-tts',
      isFromCache: true,
      cacheLayer: 'indexedDB',
      playbackStatus: 'playing',
      currentModule: globalPlaybackState.currentModule,
      audioSource: 'cached',
    });

    notifyStateChange({
      status: 'playing',
      audioSource: 'cached',
      provider: 'gemini',
    });
    return playAudioUrl(audioUrl, speed, options, 'cached');
  }

  // Layer 3: Live Gemini Neural API via Safe Request Queue
  try {
    console.log('[TTS Debug]', {
      selectedVoiceId: voiceId,
      actualVoiceSentToAPI: voiceMeta.voiceName,
      provider: 'gemini',
      model: 'gemini-3.8-flash-lite-tts',
      isFromCache: false,
      playbackStatus: 'loading',
      currentModule: globalPlaybackState.currentModule,
      audioSource: 'gemini',
    });

    const result = await enqueueTTSRequest(cleanText, voiceId, cacheKey, {
      allowFallbackIfWaiting: options.allowFallbackIfWaiting,
    });

    if (result.fallback || !result.audioBase64) {
      console.log('[TTS Debug] Fallback triggered. Using natural system voice for voiceId:', voiceId);
      notifyStateChange({
        status: 'playing',
        audioSource: 'fallback',
        provider: 'browser',
      });
      await speakTextWithBrowser(cleanText, { ...options, speed, voiceId, accent });
      return null;
    }

    // Save into persistent IndexedDB and memory cache
    await saveAudioToCache(
      cacheKey,
      cleanText,
      voiceId,
      result.audioBase64,
      result.mimeType || 'audio/wav',
      'gemini',
      'gemini-3.8-flash-lite-tts',
      speed,
      accent
    );

    const audioUrl = `data:${result.mimeType || 'audio/wav'};base64,${result.audioBase64}`;
    memoryAudioCache.set(cacheKey, audioUrl);

    notifyStateChange({
      status: 'playing',
      audioSource: 'gemini',
      provider: 'gemini',
    });

    return playAudioUrl(audioUrl, speed, options, 'gemini');
  } catch (err) {
    console.warn('[TTS API Error] Falling back to browser speech:', err);
    notifyStateChange({
      status: 'playing',
      audioSource: 'fallback',
      provider: 'browser',
    });
    await speakTextWithBrowser(cleanText, { ...options, speed, voiceId, accent });
    return null;
  }
}

function playAudioUrl(
  url: string,
  speed: number,
  options: PlaybackOptions,
  source: AudioSourceType
): HTMLAudioElement {
  const audio = new Audio(url);
  currentAudio = audio;
  audio.preservesPitch = true;
  audio.playbackRate = speed;

  audio.onplay = () => {
    startProgressTicker();
    notifyStateChange({ status: 'playing', audioSource: source });
    options.onStart?.();
  };

  audio.onended = () => {
    stopProgressTicker();
    if (currentAudio === audio) {
      currentAudio = null;
    }
    notifyStateChange({ status: 'idle', currentTime: audio.duration || 0 });
    options.onEnd?.();
  };

  audio.onerror = (e) => {
    stopProgressTicker();
    if (currentAudio === audio) {
      currentAudio = null;
    }
    notifyStateChange({ status: 'error', errorMessage: 'Audio playback failed' });
    options.onError?.(e);
  };

  audio.play().catch((err) => {
    console.warn('[Audio Play Error]:', err);
    stopProgressTicker();
    if (currentAudio === audio) {
      currentAudio = null;
    }
    notifyStateChange({ status: 'idle' });
    options.onError?.(err);
  });

  return audio;
}

/**
 * Plays a Listening Lesson with full sentence sequence synchronization
 * Works for both AI Voice and Uploaded MP3 mode.
 */
export async function startListeningLessonPlayback(
  lesson: ListeningLesson,
  options: {
    startIndex?: number;
    sourceMode?: 'ai-voice' | 'uploaded-mp3';
    mp3Url?: string;
    speed?: number;
    voiceId?: VoiceProfileId;
  } = {}
): Promise<void> {
  stopCurrentAudio();
  const sequenceToken = ++activeSequenceToken;

  const startIndex = options.startIndex || 0;
  const sourceMode = options.sourceMode || 'ai-voice';
  const speed = options.speed || globalPlaybackState.speed || 1.0;
  const voiceId = options.voiceId || globalPlaybackState.voiceId || 'us-female';
  const sentences = lesson.sentences.map((s) => ({
    id: s.id,
    en: s.en,
    zh: s.zh,
    startTime: s.startTime,
    endTime: s.endTime,
  }));

  notifyStateChange({
    currentModule: 'listening',
    contentId: lesson.id,
    contentTitle: lesson.title,
    sentences,
    totalSentences: sentences.length,
    currentSentenceIndex: startIndex,
    currentSentenceId: sentences[startIndex]?.id || null,
    currentText: sentences[startIndex]?.en || '',
    speed,
    voiceId,
    status: 'playing',
    audioSource: sourceMode === 'uploaded-mp3' ? 'uploaded-mp3' : 'gemini',
    provider: sourceMode === 'uploaded-mp3' ? 'mp3' : 'gemini',
  });

  // Mode A: Uploaded MP3 Audio
  if (sourceMode === 'uploaded-mp3' && options.mp3Url) {
    const audio = new Audio(options.mp3Url);
    currentAudio = audio;
    audio.preservesPitch = true;
    audio.playbackRate = speed;

    if (sentences[startIndex]?.startTime) {
      audio.currentTime = sentences[startIndex].startTime;
    }

    audio.ontimeupdate = () => {
      const time = audio.currentTime;
      const match = sentences.find((s) => s.startTime !== undefined && s.endTime !== undefined && time >= s.startTime && time <= s.endTime);
      if (match && match.id !== globalPlaybackState.currentSentenceId) {
        const idx = sentences.findIndex((s) => s.id === match.id);
        notifyStateChange({
          currentSentenceId: match.id,
          currentSentenceIndex: idx,
          currentText: match.en,
          currentTime: time,
          duration: audio.duration || 0,
        });
      } else {
        notifyStateChange({
          currentTime: time,
          duration: audio.duration || 0,
        });
      }
    };

    audio.onended = () => {
      stopProgressTicker();
      notifyStateChange({ status: 'stopped', currentSentenceId: null });
    };

    await audio.play();
    return;
  }

  // Mode B: AI Neural Voice Sentence Sequence
  runSentenceSequenceLoop(sequenceToken, startIndex);
}

async function runSentenceSequenceLoop(token: number, index: number): Promise<void> {
  const sentences = globalPlaybackState.sentences;
  if (!sentences || index >= sentences.length) {
    notifyStateChange({ status: 'stopped', currentSentenceId: null });
    return;
  }

  if (activeSequenceToken !== token) return;

  const currentSentence = sentences[index];
  notifyStateChange({
    status: 'playing',
    currentSentenceIndex: index,
    currentSentenceId: currentSentence.id,
    currentText: currentSentence.en,
  });

  await new Promise<void>((resolve) => {
    let resolved = false;
    const safeResolve = () => {
      if (!resolved) {
        resolved = true;
        resolve();
      }
    };

    playNaturalVoice(currentSentence.en, {
      voiceId: globalPlaybackState.voiceId,
      speed: globalPlaybackState.speed,
      sentenceId: currentSentence.id,
      sentenceIndex: index,
      module: 'listening',
      allowFallbackIfWaiting: true,
      onEnd: () => {
        if (activeSequenceToken !== token) return safeResolve();

        if (globalPlaybackState.repeatMode) {
          setTimeout(() => safeResolve(), 300);
        } else {
          // 400ms natural breathing pause between sentences
          setTimeout(() => safeResolve(), 400);
        }
      },
      onError: () => safeResolve(),
    });
  });

  if (activeSequenceToken !== token) return;

  if (globalPlaybackState.status === 'paused') {
    // If paused, wait until resumed
    return;
  }

  const nextIdx = globalPlaybackState.repeatMode ? index : index + 1;
  runSentenceSequenceLoop(token, nextIdx);
}

function resumeSequencePlayback(): void {
  const token = ++activeSequenceToken;
  runSentenceSequenceLoop(token, globalPlaybackState.currentSentenceIndex);
}

/**
 * Advances to the Next Sentence in the current sequence
 */
export function playNextSentence(): void {
  const { sentences, currentSentenceIndex } = globalPlaybackState;
  if (!sentences || sentences.length === 0) return;
  const nextIdx = Math.min(sentences.length - 1, currentSentenceIndex + 1);

  if (globalPlaybackState.audioSource === 'uploaded-mp3' && currentAudio) {
    const nextSentence = sentences[nextIdx];
    if (nextSentence?.startTime !== undefined) {
      currentAudio.currentTime = nextSentence.startTime;
    }
    notifyStateChange({
      currentSentenceIndex: nextIdx,
      currentSentenceId: nextSentence.id,
      currentText: nextSentence.en,
    });
  } else {
    stopCurrentAudio();
    const token = ++activeSequenceToken;
    runSentenceSequenceLoop(token, nextIdx);
  }
}

/**
 * Returns to the Previous Sentence in the current sequence
 */
export function playPrevSentence(): void {
  const { sentences, currentSentenceIndex } = globalPlaybackState;
  if (!sentences || sentences.length === 0) return;
  const prevIdx = Math.max(0, currentSentenceIndex - 1);

  if (globalPlaybackState.audioSource === 'uploaded-mp3' && currentAudio) {
    const prevSentence = sentences[prevIdx];
    if (prevSentence?.startTime !== undefined) {
      currentAudio.currentTime = prevSentence.startTime;
    }
    notifyStateChange({
      currentSentenceIndex: prevIdx,
      currentSentenceId: prevSentence.id,
      currentText: prevSentence.en,
    });
  } else {
    stopCurrentAudio();
    const token = ++activeSequenceToken;
    runSentenceSequenceLoop(token, prevIdx);
  }
}

/**
 * Seeks to a specific timestamp in seconds
 */
export function seekPlayback(seconds: number): void {
  if (currentAudio) {
    currentAudio.currentTime = Math.max(0, Math.min(seconds, currentAudio.duration || seconds));
    notifyStateChange({ currentTime: currentAudio.currentTime });
  } else if (globalPlaybackState.sentences.length > 0) {
    // For AI voice sequence: find sentence corresponding to timestamp or jump by index
    const match = globalPlaybackState.sentences.find(
      (s) => s.startTime !== undefined && s.endTime !== undefined && seconds >= s.startTime && seconds <= s.endTime
    );
    if (match) {
      const idx = globalPlaybackState.sentences.findIndex((s) => s.id === match.id);
      stopCurrentAudio();
      const token = ++activeSequenceToken;
      runSentenceSequenceLoop(token, idx);
    }
  }
}

/**
 * Relative seek (+5s or -5s)
 */
export function seekRelative(deltaSeconds: number): void {
  if (currentAudio) {
    seekPlayback(currentAudio.currentTime + deltaSeconds);
  } else {
    if (deltaSeconds > 0) {
      playNextSentence();
    } else {
      playPrevSentence();
    }
  }
}

/**
 * Replays the current sentence or sequence
 */
export function replayPlayback(): void {
  if (globalPlaybackState.audioSource === 'uploaded-mp3' && currentAudio) {
    currentAudio.currentTime = 0;
    currentAudio.play();
    notifyStateChange({ status: 'playing' });
  } else if (globalPlaybackState.sentences.length > 0) {
    stopCurrentAudio();
    const token = ++activeSequenceToken;
    runSentenceSequenceLoop(token, 0);
  } else if (globalPlaybackState.currentText) {
    playNaturalVoice(globalPlaybackState.currentText);
  }
}

/**
 * Plays a paragraph with automatic sentence splitting & natural pauses
 */
export async function playParagraphSequence(
  text: string,
  options: PlaybackOptions = {}
): Promise<void> {
  const cleanParagraph = extractEnglishOnly(text);
  if (!cleanParagraph) return;

  const rawSentences = splitIntoSentences(cleanParagraph);
  if (rawSentences.length <= 1) {
    await playNaturalVoice(cleanParagraph, options);
    return;
  }

  const sentences: PlaybackSentenceItem[] = rawSentences.map((s, idx) => ({
    id: `p-seq-${idx}`,
    en: s,
  }));

  stopCurrentAudio();
  const sequenceToken = ++activeSequenceToken;

  notifyStateChange({
    currentModule: options.module || globalPlaybackState.currentModule || 'reading',
    contentId: options.contentId || null,
    contentTitle: options.contentTitle || 'Paragraph',
    sentences,
    totalSentences: sentences.length,
    currentSentenceIndex: 0,
    currentSentenceId: sentences[0].id,
    currentText: sentences[0].en,
    status: 'playing',
    voiceId: options.voiceId || globalPlaybackState.voiceId,
    speed: options.speed || globalPlaybackState.speed,
  });

  runSentenceSequenceLoop(sequenceToken, 0);
}

// Fallback SpeechSynthesis with strict Voice Matching
let cachedVoices: SpeechSynthesisVoice[] = [];

export function loadBrowserVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      resolve([]);
      return;
    }
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      cachedVoices = voices;
      resolve(voices);
      return;
    }
    window.speechSynthesis.onvoiceschanged = () => {
      cachedVoices = window.speechSynthesis.getVoices();
      resolve(cachedVoices);
    };
    setTimeout(() => {
      cachedVoices = window.speechSynthesis.getVoices();
      resolve(cachedVoices);
    }, 400);
  });
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  loadBrowserVoices();
}

/**
 * Strictly matches system voice to selected accent and gender
 */
export function getMatchedSystemVoice(
  voices: SpeechSynthesisVoice[],
  targetAccent: 'en-US' | 'en-GB' = 'en-US',
  preferredGender: 'female' | 'male' = 'female'
): SpeechSynthesisVoice | null {
  const englishVoices = voices.filter((v) => v.lang.startsWith('en'));
  if (englishVoices.length === 0) return null;

  // Strict accent candidates
  const isUK = targetAccent === 'en-GB';
  const accentMatches = englishVoices.filter((v) => {
    const l = v.lang.toLowerCase();
    return isUK ? (l.includes('gb') || l.includes('uk')) : (l.includes('us') || !l.includes('gb'));
  });

  const pool = accentMatches.length > 0 ? accentMatches : englishVoices;

  // Gender keywords
  const maleKeywords = ['daniel', 'oliver', 'george', 'male', 'guy', 'david', 'james'];
  const femaleKeywords = ['samantha', 'karen', 'victoria', 'female', 'siri', 'zira', 'catherine'];

  const targetKeywords = preferredGender === 'male' ? maleKeywords : femaleKeywords;

  // First choice: accent + gender match
  const genderMatched = pool.find((v) => {
    const nameLower = v.name.toLowerCase();
    return targetKeywords.some((kw) => nameLower.includes(kw));
  });

  if (genderMatched) return genderMatched;

  // Second choice: premium natural voice
  const premium = pool.find((v) => {
    const n = v.name.toLowerCase();
    return n.includes('natural') || n.includes('enhanced') || n.includes('premium') || n.includes('google');
  });

  return premium || pool[0];
}

export async function speakTextWithBrowser(
  text: string,
  options: PlaybackOptions = {}
): Promise<void> {
  const cleanText = extractEnglishOnly(text);
  if (!cleanText) return;

  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    options.onError?.(new Error('SpeechSynthesis not supported'));
    return;
  }

  window.speechSynthesis.cancel();

  const voices = cachedVoices.length > 0 ? cachedVoices : await loadBrowserVoices();
  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.rate = options.speed || globalPlaybackState.speed || 1.0;

  const targetVoiceId = options.voiceId || globalPlaybackState.voiceId;
  const targetAccent = options.accent || (targetVoiceId?.startsWith('uk') ? 'en-GB' : 'en-US');
  const preferredGender = options.voiceGender || (targetVoiceId?.endsWith('male') ? 'male' : 'female');

  const bestVoice = getMatchedSystemVoice(voices, targetAccent, preferredGender);
  if (bestVoice) {
    utterance.voice = bestVoice;
  }
  utterance.lang = targetAccent;

  utterance.onstart = () => {
    notifyStateChange({ status: 'playing', audioSource: 'fallback', provider: 'browser' });
    options.onStart?.();
  };

  utterance.onend = () => {
    notifyStateChange({ status: 'idle' });
    options.onEnd?.();
  };

  utterance.onerror = (e) => {
    notifyStateChange({ status: 'idle' });
    options.onError?.(e);
  };

  window.speechSynthesis.speak(utterance);
}

export async function speakText(
  text: string,
  options: PlaybackOptions = {}
): Promise<void> {
  await playNaturalVoice(text, options);
}

export function stopSpeech(): void {
  stopCurrentAudio();
}

export function playWithFallbackNow(text: string): void {
  bypassQueueToBrowserFallback();
  playNaturalVoice(text, { forceBrowserFallback: true });
}

// Sound effects for quizzes
export function playSound(type: 'correct' | 'wrong' | 'complete'): void {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    if (type === 'correct') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.12);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === 'wrong') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(160, now + 0.18);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.22);
    } else if (type === 'complete') {
      const notes = [440, 554.37, 659.25, 880];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.12, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.08 + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.2);
      });
    }
  } catch {}
}

export function evaluateSpokenSentence(
  target: string,
  spoken: string
): {
  score: number;
  isGood: boolean;
  tokenAnalysis: { word: string; matched: boolean }[];
} {
  const cleanTarget = extractEnglishOnly(target).toLowerCase();
  const cleanSpoken = extractEnglishOnly(spoken).toLowerCase();

  const targetWords = cleanTarget
    .replace(/[^\w\s']/g, '')
    .split(/\s+/)
    .filter(Boolean);

  const spokenWords = cleanSpoken
    .replace(/[^\w\s']/g, '')
    .split(/\s+/)
    .filter(Boolean);

  if (targetWords.length === 0) {
    return { score: 100, isGood: true, tokenAnalysis: [] };
  }

  let matchedCount = 0;
  const tokenAnalysis = targetWords.map((word) => {
    const isMatched = spokenWords.some((spk) => {
      if (spk === word) return true;
      if (spk.length > 3 && word.length > 3) {
        if (spk.startsWith(word.slice(0, -1)) || word.startsWith(spk.slice(0, -1))) {
          return true;
        }
      }
      return false;
    });

    if (isMatched) matchedCount++;
    return { word, matched: isMatched };
  });

  const rawScore = Math.round((matchedCount / targetWords.length) * 100);
  const score = Math.min(100, Math.max(0, rawScore));

  return {
    score,
    isGood: score >= 75,
    tokenAnalysis,
  };
}
