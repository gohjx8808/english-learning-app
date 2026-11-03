/**
 * High-Quality Natural Voice Speech Engine & Centralized Audio Services
 * Integrates Gemini Neural TTS via server-side /api/tts with:
 * - Persistent IndexedDB caching (never re-fetch spoken audio across page reloads)
 * - Safe 21-second request queue enforcing Gemini Free-Tier 3 RPM limits
 * - Deduplication for simultaneous requests
 * - Smart paragraph chunking and sentence cache reuse
 * - Premium browser natural system voice detection as high-quality fallback
 * - Live playback state subscriptions and sound effects
 */

import { VoiceProfileId } from '../types';
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

export interface NaturalVoiceOption {
  id: VoiceProfileId;
  name: string;
  label: string;
  gender: 'female' | 'male';
  accent: 'en-US' | 'en-GB';
  accentLabel: string;
  description: string;
  previewText: string;
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
  },
];

export interface PlaybackOptions {
  voiceId?: VoiceProfileId;
  speed?: number; // 0.75, 1.0, 1.25, 1.5
  accent?: 'en-US' | 'en-GB';
  voiceGender?: 'female' | 'male';
  forceBrowserFallback?: boolean;
  allowFallbackIfWaiting?: boolean;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: unknown) => void;
  onPause?: () => void;
  onResume?: () => void;
}

export type PlaybackSource = 'gemini' | 'cached' | 'fallback';

export interface ActivePlaybackState {
  currentText: string | null;
  activeSentence: string | null;
  isPlaying: boolean;
  isPaused: boolean;
  isLoading: boolean;
  speed: number;
  voiceId: VoiceProfileId;
  totalSentences: number;
  currentSentenceIndex: number;
  source: PlaybackSource;
}

// Global Playback State
let globalPlaybackState: ActivePlaybackState = {
  currentText: null,
  activeSentence: null,
  isPlaying: false,
  isPaused: false,
  isLoading: false,
  speed: 1.0,
  voiceId: 'us-female',
  totalSentences: 0,
  currentSentenceIndex: 0,
  source: 'gemini',
};

const stateListeners = new Set<(state: ActivePlaybackState) => void>();

function notifyStateChange(updates?: Partial<ActivePlaybackState>) {
  if (updates) {
    globalPlaybackState = { ...globalPlaybackState, ...updates };
  }
  stateListeners.forEach((listener) => {
    try {
      listener(globalPlaybackState);
    } catch (e) {
      console.warn('Playback listener error', e);
    }
  });
}

export function subscribePlaybackState(listener: (state: ActivePlaybackState) => void): () => void {
  stateListeners.add(listener);
  listener(globalPlaybackState);
  return () => {
    stateListeners.delete(listener);
  };
}

export function getPlaybackState(): ActivePlaybackState {
  return globalPlaybackState;
}

export function setGlobalPlaybackSpeed(speed: number): void {
  globalPlaybackState.speed = speed;
  if (currentAudio) {
    currentAudio.playbackRate = speed;
  }
  notifyStateChange({ speed });
}

export function setGlobalPlaybackVoice(voiceId: VoiceProfileId): void {
  globalPlaybackState.voiceId = voiceId;
  notifyStateChange({ voiceId });
}

/**
 * Strips Chinese characters, Chinese punctuation, and bracketed translations
 * so that only English content is read aloud by the TTS engine.
 */
export function extractEnglishOnly(text: string): string {
  if (!text) return '';
  // 1. Remove parenthesized/bracketed Chinese explanations: e.g. (苹果), （苹果）, [苹果]
  let cleaned = text.replace(/[\(（\[][^\)）\]]*[\u4e00-\u9fa5]+[^\)）\]]*[\)）\]]/g, '');
  // 2. Remove remaining Chinese characters and Chinese punctuation symbols
  cleaned = cleaned.replace(/[\u4e00-\u9fa5\u3000-\u303f\uff01-\uff5e]/g, ' ');
  // 3. Remove orphaned or empty parentheses
  cleaned = cleaned.replace(/[\(（\[]\s*[\)）\]]/g, ' ');
  // 4. Normalize whitespaces
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  // If entire string was non-English and was emptied, fall back to trimmed original
  return cleaned || text.trim();
}

/**
 * Splits long paragraphs or passages into individual natural sentences (. ! ?)
 */
export function splitIntoSentences(text: string): string[] {
  const english = extractEnglishOnly(text);
  if (!english) return [];
  // Split on sentence terminators while preserving them
  const regex = /[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g;
  const matches = english.match(regex);
  if (!matches) return [english];
  return matches.map((s) => s.trim()).filter((s) => s.length > 0);
}

// Client-side in-memory Audio Cache (quick URL lookups)
const memoryAudioCache = new Map<string, string>();

// Global Active Audio Player Instance
let currentAudio: HTMLAudioElement | null = null;
let currentAbortController: AbortController | null = null;
let activeSequenceToken = 0; // For aborting multi-sentence sequences

export function stopCurrentAudio(): void {
  activeSequenceToken++; // Invalidate any running sequence
  
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
    isPlaying: false,
    isPaused: false,
    isLoading: false,
    activeSentence: null,
    totalSentences: 0,
    currentSentenceIndex: 0,
  });
}

export function pauseCurrentAudio(): void {
  if (currentAudio && !currentAudio.paused) {
    currentAudio.pause();
    notifyStateChange({ isPlaying: false, isPaused: true });
  } else if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.speaking) {
    window.speechSynthesis.pause();
    notifyStateChange({ isPlaying: false, isPaused: true });
  }
}

export function resumeCurrentAudio(): void {
  if (currentAudio && currentAudio.paused) {
    currentAudio.play().then(() => {
      notifyStateChange({ isPlaying: true, isPaused: false });
    }).catch(console.warn);
  } else if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.paused) {
    window.speechSynthesis.resume();
    notifyStateChange({ isPlaying: true, isPaused: false });
  }
}

export function isAudioPlaying(): boolean {
  if (currentAudio && !currentAudio.paused && !currentAudio.ended) return true;
  if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.speaking && !window.speechSynthesis.paused) return true;
  return false;
}

export function isAudioPaused(): boolean {
  if (currentAudio && currentAudio.paused && currentAudio.currentTime > 0 && !currentAudio.ended) return true;
  if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.paused) return true;
  return false;
}

/**
 * High-Quality Natural Voice Player with 3-Layer Architecture:
 * 1. Memory Cache (instant 0ms)
 * 2. Persistent IndexedDB Cache (instant 0ms across page reloads)
 * 3. Rate-limited Queue for Gemini (21s delay safe guard to stay under 3 RPM)
 * 4. High-Quality Natural Browser Voice Fallback
 */
export async function playNaturalVoice(
  text: string,
  options: PlaybackOptions = {}
): Promise<HTMLAudioElement | null> {
  const cleanText = extractEnglishOnly(text);
  if (!cleanText) return null;

  stopCurrentAudio();

  const voiceId = options.voiceId || globalPlaybackState.voiceId || 'us-female';
  const speed = options.speed || globalPlaybackState.speed || 1.0;
  const cacheKey = buildAudioCacheKey(cleanText, voiceId);

  // If user requested browser fallback directly
  if (options.forceBrowserFallback) {
    notifyStateChange({
      currentText: cleanText,
      activeSentence: cleanText,
      isPlaying: true,
      isPaused: false,
      isLoading: false,
      speed,
      voiceId,
      source: 'fallback',
    });
    await speakTextWithBrowser(cleanText, { ...options, speed, voiceId });
    return null;
  }

  // Layer 1: Check in-memory URL cache
  const inMemoryUrl = memoryAudioCache.get(cacheKey);
  if (inMemoryUrl) {
    notifyStateChange({
      currentText: cleanText,
      activeSentence: cleanText,
      isPlaying: true,
      isPaused: false,
      isLoading: false,
      speed,
      voiceId,
      source: 'cached',
    });
    return playAudioUrl(inMemoryUrl, speed, options, 'cached');
  }

  // Layer 2: Check persistent IndexedDB cache
  const cachedFromDB = await getAudioFromCache(cacheKey);
  if (cachedFromDB && cachedFromDB.audioBase64) {
    const audioUrl = `data:${cachedFromDB.mimeType || 'audio/wav'};base64,${cachedFromDB.audioBase64}`;
    memoryAudioCache.set(cacheKey, audioUrl);

    notifyStateChange({
      currentText: cleanText,
      activeSentence: cleanText,
      isPlaying: true,
      isPaused: false,
      isLoading: false,
      speed,
      voiceId,
      source: 'cached',
    });
    return playAudioUrl(audioUrl, speed, options, 'cached');
  }

  // Layer 3: Not cached — Enqueue safe Gemini request
  notifyStateChange({
    currentText: cleanText,
    activeSentence: cleanText,
    isPlaying: true,
    isPaused: false,
    isLoading: true,
    speed,
    voiceId,
    source: 'gemini',
  });

  try {
    const result = await enqueueTTSRequest(cleanText, voiceId, cacheKey, {
      allowFallbackIfWaiting: options.allowFallbackIfWaiting,
    });

    notifyStateChange({ isLoading: false });

    if (result.fallback || !result.audioBase64) {
      console.info('[TTS] Using high-quality browser voice fallback:', result.message);
      notifyStateChange({ source: 'fallback' });
      await speakTextWithBrowser(cleanText, { ...options, speed, voiceId });
      return null;
    }

    // Success: save into persistent IndexedDB and memory cache
    await saveAudioToCache(cacheKey, cleanText, voiceId, result.audioBase64, result.mimeType || 'audio/wav');
    const audioUrl = `data:${result.mimeType || 'audio/wav'};base64,${result.audioBase64}`;
    memoryAudioCache.set(cacheKey, audioUrl);

    notifyStateChange({ source: 'gemini' });
    return playAudioUrl(audioUrl, speed, options, 'gemini');
  } catch (err: unknown) {
    notifyStateChange({ isLoading: false, source: 'fallback' });
    console.warn('[TTS] Enqueue error, falling back to browser speech:', err);
    await speakTextWithBrowser(cleanText, { ...options, speed, voiceId });
    return null;
  }
}

function playAudioUrl(
  url: string,
  speed: number,
  options: PlaybackOptions,
  source: PlaybackSource = 'gemini'
): HTMLAudioElement {
  const audio = new Audio(url);
  currentAudio = audio;

  // Preserve natural pitch during speed adjustments
  audio.preservesPitch = true;
  audio.playbackRate = speed;

  audio.onplay = () => {
    notifyStateChange({ isPlaying: true, isPaused: false, source });
    options.onStart?.();
  };

  audio.onended = () => {
    if (currentAudio === audio) {
      currentAudio = null;
    }
    notifyStateChange({ isPlaying: false, isPaused: false });
    options.onEnd?.();
  };

  audio.onerror = (e) => {
    console.warn('Audio playback error', e);
    if (currentAudio === audio) {
      currentAudio = null;
    }
    notifyStateChange({ isPlaying: false, isPaused: false });
    options.onError?.(e);
  };

  audio.play().catch((err) => {
    console.warn('Audio play request interrupted:', err);
    if (currentAudio === audio) {
      currentAudio = null;
    }
    notifyStateChange({ isPlaying: false, isPaused: false });
    options.onError?.(err);
  });

  return audio;
}

/**
 * Sequential Paragraph Player:
 * Smart paragraph chunking:
 * - Splits into sentences.
 * - Reuses cached sentences instantly (0s wait).
 * - If sentence is not cached and queue cooldown is active, uses smooth browser voice
 *   so the learner gets seamless continuous playback without 21s pauses!
 */
export async function playParagraphSequence(
  text: string,
  options: PlaybackOptions = {}
): Promise<void> {
  const cleanParagraph = extractEnglishOnly(text);
  if (!cleanParagraph) return;

  const sentences = splitIntoSentences(cleanParagraph);
  if (sentences.length <= 1) {
    await playNaturalVoice(cleanParagraph, options);
    return;
  }

  stopCurrentAudio();
  const sequenceToken = ++activeSequenceToken;

  const voiceId = options.voiceId || globalPlaybackState.voiceId || 'us-female';
  const speed = options.speed || globalPlaybackState.speed || 1.0;

  notifyStateChange({
    currentText: cleanParagraph,
    activeSentence: sentences[0],
    isPlaying: true,
    isPaused: false,
    isLoading: true,
    speed,
    voiceId,
    totalSentences: sentences.length,
    currentSentenceIndex: 0,
  });

  options.onStart?.();

  for (let i = 0; i < sentences.length; i++) {
    if (activeSequenceToken !== sequenceToken) {
      // Sequence was cancelled by user
      return;
    }

    const sentence = sentences[i];
    notifyStateChange({
      activeSentence: sentence,
      currentSentenceIndex: i,
    });

    await new Promise<void>((resolve) => {
      let isResolved = false;
      const safeResolve = () => {
        if (!isResolved) {
          isResolved = true;
          resolve();
        }
      };

      // For sentences inside a paragraph, allow instant browser voice if Gemini queue would delay
      playNaturalVoice(sentence, {
        voiceId,
        speed,
        allowFallbackIfWaiting: true,
        onEnd: () => {
          setTimeout(safeResolve, 400); // 400ms natural breath pause
        },
        onError: () => {
          safeResolve();
        },
      });
    });
  }

  if (activeSequenceToken === sequenceToken) {
    notifyStateChange({
      isPlaying: false,
      isPaused: false,
      activeSentence: null,
      totalSentences: 0,
      currentSentenceIndex: 0,
    });
    options.onEnd?.();
  }
}

// Enhanced High-Quality Browser SpeechSynthesis
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
 * Ranks system voices to pick natural/neural/enhanced voices on macOS, Windows, iOS, ChromeOS
 */
export function getBestNaturalSystemVoice(
  voices: SpeechSynthesisVoice[],
  targetAccent: 'en-US' | 'en-GB' = 'en-US',
  preferredGender: 'female' | 'male' = 'female'
): SpeechSynthesisVoice | null {
  const englishVoices = voices.filter((v) => v.lang.startsWith('en'));
  if (englishVoices.length === 0) return null;

  // Check if user set a custom preferred voice in localStorage
  if (typeof window !== 'undefined') {
    const userPrefURI = localStorage.getItem('my_english_preferred_sys_voice');
    if (userPrefURI) {
      const customVoice = englishVoices.find((v) => v.voiceURI === userPrefURI);
      if (customVoice) return customVoice;
    }
  }

  // Keywords that denote high-quality neural/enhanced speech
  const premiumKeywords = ['natural', 'enhanced', 'siri', 'neural', 'premium', 'google', 'daniel', 'samantha', 'karen', 'oliver'];

  // Score candidate voices
  const scored = englishVoices.map((voice) => {
    let score = 0;
    const nameLower = voice.name.toLowerCase();
    const langLower = voice.lang.toLowerCase();

    // Accent match
    if (targetAccent === 'en-GB' && (langLower.includes('gb') || langLower.includes('uk'))) {
      score += 40;
    } else if (targetAccent === 'en-US' && langLower.includes('us')) {
      score += 40;
    }

    // High quality badges
    premiumKeywords.forEach((kw) => {
      if (nameLower.includes(kw)) score += 20;
    });

    // Gender heuristic check
    if (preferredGender === 'female' && (nameLower.includes('samantha') || nameLower.includes('karen') || nameLower.includes('victoria') || nameLower.includes('female'))) {
      score += 15;
    } else if (preferredGender === 'male' && (nameLower.includes('daniel') || nameLower.includes('oliver') || nameLower.includes('george') || nameLower.includes('male'))) {
      score += 15;
    }

    // Avoid robotic generic speech synth
    if (nameLower.includes('espeak')) score -= 50;

    return { voice, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.voice || englishVoices[0];
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

  const targetAccent = options.accent || (options.voiceId?.startsWith('uk') ? 'en-GB' : 'en-US');
  const preferredGender = options.voiceGender || (options.voiceId?.endsWith('male') ? 'male' : 'female');

  const bestVoice = getBestNaturalSystemVoice(voices, targetAccent, preferredGender);
  if (bestVoice) {
    utterance.voice = bestVoice;
  }
  utterance.lang = targetAccent;

  utterance.onstart = () => {
    notifyStateChange({ isPlaying: true, isPaused: false, source: 'fallback' });
    options.onStart?.();
  };

  utterance.onend = () => {
    notifyStateChange({ isPlaying: false, isPaused: false });
    options.onEnd?.();
  };

  utterance.onerror = (e) => {
    notifyStateChange({ isPlaying: false, isPaused: false });
    options.onError?.(e);
  };

  window.speechSynthesis.speak(utterance);
}

/**
 * Universal Speak Function
 */
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

// Simple Web Audio API sound effects for quizzes
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

/**
 * Evaluates spoken transcript against target sentence:
 * Performs word normalization, token alignment, and scoring.
 */
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
