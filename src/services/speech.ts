/**
 * High-Quality Natural Voice Speech Engine & Audio Services
 * Integrates Gemini Neural TTS via server-side /api/tts with intelligent caching,
 * pitch-preserving speed controls, and seamless Web Speech API fallback.
 */

import { VoiceProfileId } from '../types';

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
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: unknown) => void;
  onPause?: () => void;
  onResume?: () => void;
}

// Client-side in-memory Audio Cache
const clientAudioCache = new Map<string, string>();

// Global Active Audio Player Instance
let currentAudio: HTMLAudioElement | null = null;
let currentAbortController: AbortController | null = null;
let isSyntheticSpeaking = false;

export function stopCurrentAudio(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  if (currentAbortController) {
    currentAbortController.abort();
    currentAbortController = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  isSyntheticSpeaking = false;
}

export function pauseCurrentAudio(): void {
  if (currentAudio && !currentAudio.paused) {
    currentAudio.pause();
  } else if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.speaking) {
    window.speechSynthesis.pause();
  }
}

export function resumeCurrentAudio(): void {
  if (currentAudio && currentAudio.paused) {
    currentAudio.play().catch(console.warn);
  } else if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.paused) {
    window.speechSynthesis.resume();
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
 * High-Quality Natural Voice Player
 * Tries server-side Gemini TTS first; automatically falls back to browser SpeechSynthesis.
 */
export async function playNaturalVoice(
  text: string,
  options: PlaybackOptions = {}
): Promise<HTMLAudioElement | null> {
  const cleanText = text.trim();
  if (!cleanText) return null;

  stopCurrentAudio();

  const voiceId = options.voiceId || 'us-female';
  const speed = options.speed || 1.0;
  const cacheKey = `${voiceId}:::${cleanText.toLowerCase()}`;

  // Check client memory cache
  const cachedUrl = clientAudioCache.get(cacheKey);
  if (cachedUrl) {
    return playAudioUrl(cachedUrl, speed, options);
  }

  // Request high-quality audio from backend proxy
  try {
    currentAbortController = new AbortController();
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: cleanText,
        voiceId,
      }),
      signal: currentAbortController.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to fetch TTS`);
    }

    const data = await response.json();

    // If backend reports fallback or error, use browser SpeechSynthesis
    if (data.fallback || !data.audioBase64) {
      console.info('Using browser speech synthesis fallback:', data.message || data.error);
      speakTextWithBrowser(cleanText, options);
      return null;
    }

    const audioUrl = `data:${data.mimeType || 'audio/wav'};base64,${data.audioBase64}`;
    clientAudioCache.set(cacheKey, audioUrl);

    return playAudioUrl(audioUrl, speed, options);
  } catch (err: any) {
    if (err.name === 'AbortError') return null;
    console.warn('TTS API error, falling back to browser speech synthesis:', err?.message || err);
    speakTextWithBrowser(cleanText, options);
    return null;
  }
}

function playAudioUrl(
  url: string,
  speed: number,
  options: PlaybackOptions
): HTMLAudioElement {
  const audio = new Audio(url);
  currentAudio = audio;

  // Preserve pitch during speed adjustments
  audio.preservesPitch = true;
  audio.playbackRate = speed;

  audio.onplay = () => {
    options.onStart?.();
  };

  audio.onended = () => {
    if (currentAudio === audio) {
      currentAudio = null;
    }
    options.onEnd?.();
  };

  audio.onerror = (e) => {
    console.warn('Audio playback error', e);
    if (currentAudio === audio) {
      currentAudio = null;
    }
    options.onError?.(e);
  };

  audio.play().catch((err) => {
    console.warn('Audio play request interrupted or prevented:', err);
    options.onError?.(err);
  });

  return audio;
}

// Fallback SpeechSynthesis
let cachedVoices: SpeechSynthesisVoice[] = [];

function loadBrowserVoices(): Promise<SpeechSynthesisVoice[]> {
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

export async function speakTextWithBrowser(
  text: string,
  options: PlaybackOptions = {}
): Promise<void> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    options.onError?.(new Error('SpeechSynthesis not supported'));
    return;
  }

  window.speechSynthesis.cancel();
  isSyntheticSpeaking = true;

  const voices = cachedVoices.length > 0 ? cachedVoices : await loadBrowserVoices();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = options.speed || 1.0;

  const accent = options.accent || (options.voiceId?.startsWith('uk') ? 'en-GB' : 'en-US');
  const englishVoices = voices.filter((v) => v.lang.startsWith('en'));

  let matchedVoice = englishVoices.find(
    (v) => v.lang.includes(accent.replace('-', '_')) || v.lang.includes(accent)
  );
  if (!matchedVoice && englishVoices.length > 0) {
    matchedVoice = englishVoices[0];
  }

  if (matchedVoice) {
    utterance.voice = matchedVoice;
  }
  utterance.lang = accent;

  utterance.onstart = () => {
    options.onStart?.();
  };

  utterance.onend = () => {
    isSyntheticSpeaking = false;
    options.onEnd?.();
  };

  utterance.onerror = (e) => {
    isSyntheticSpeaking = false;
    options.onError?.(e);
  };

  window.speechSynthesis.speak(utterance);
}

/**
 * Universal Speak Function:
 * Automatically uses natural voice with user settings and falls back if needed.
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
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.12); // E5
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.24); // G5
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'wrong') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(190, now + 0.25);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'complete') {
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.12, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.25);
      });
    }
  } catch {}
}

// Compare spoken text with target text
export function evaluateSpokenSentence(target: string, spoken: string): {
  score: number;
  isGood: boolean;
  tokenAnalysis: { word: string; matched: boolean }[];
} {
  const cleanWord = (w: string) => w.toLowerCase().replace(/[^a-z0-9]/g, '');
  const targetWords = target.split(/\s+/).filter(Boolean);
  const spokenWords = spoken.split(/\s+/).map(cleanWord).filter(Boolean);

  let matchCount = 0;
  const spokenSet = new Set(spokenWords);

  const tokenAnalysis = targetWords.map((word) => {
    const cleaned = cleanWord(word);
    const matched =
      spokenSet.has(cleaned) ||
      spokenWords.some((sw) => {
        if (sw === cleaned) return true;
        if (cleaned.length > 3 && sw.includes(cleaned)) return true;
        if (sw.length > 3 && cleaned.includes(sw)) return true;
        return false;
      });
    if (matched) matchCount++;
    return { word, matched };
  });

  const rawScore =
    targetWords.length > 0 ? Math.round((matchCount / targetWords.length) * 100) : 0;
  const score = Math.min(100, Math.max(0, rawScore));
  const isGood = score >= 75;

  return { score, isGood, tokenAnalysis };
}
