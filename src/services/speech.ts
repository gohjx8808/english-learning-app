/**
 * Web Speech API and Audio Services
 */

export interface SpeechOptions {
  rate?: number;
  pitch?: number;
  voiceGender?: 'female' | 'male';
  accent?: 'en-US' | 'en-GB';
  onEnd?: () => void;
  onError?: (err: unknown) => void;
}

let cachedVoices: SpeechSynthesisVoice[] = [];

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
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
    // fallback timeout
    setTimeout(() => {
      cachedVoices = window.speechSynthesis.getVoices();
      resolve(cachedVoices);
    }, 500);
  });
}

// Preload voices
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  loadVoices();
}

export async function speakText(text: string, options: SpeechOptions = {}): Promise<void> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.warn('SpeechSynthesis is not supported in this browser.');
    options.onError?.(new Error('SpeechSynthesis not supported'));
    return;
  }

  window.speechSynthesis.cancel(); // Stop any pending speech

  const voices = cachedVoices.length > 0 ? cachedVoices : await loadVoices();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = options.rate ?? 1.0;
  utterance.pitch = options.pitch ?? 1.0;

  // Pick suitable English voice
  const langTarget = options.accent ?? 'en-US';
  const englishVoices = voices.filter((v) => v.lang.startsWith('en'));

  let matchedVoice = englishVoices.find((v) => v.lang.includes(langTarget.replace('-', '_')) || v.lang.includes(langTarget));
  if (!matchedVoice && englishVoices.length > 0) {
    matchedVoice = englishVoices[0];
  }

  if (matchedVoice) {
    utterance.voice = matchedVoice;
  }
  utterance.lang = langTarget;

  utterance.onend = () => {
    options.onEnd?.();
  };
  utterance.onerror = (e) => {
    console.warn('Speech synthesis error', e);
    options.onError?.(e);
  };

  window.speechSynthesis.speak(utterance);
}

export function stopSpeech(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

// Simple Web Audio API sound effects for quizzes
export function playSound(type: 'correct' | 'wrong' | 'complete'): void {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
  } catch {
    // Audio context may not be allowed before user interaction
  }
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
    // Exact or loose match
    const matched = spokenSet.has(cleaned) || spokenWords.some((sw) => {
      if (sw === cleaned) return true;
      if (cleaned.length > 3 && sw.includes(cleaned)) return true;
      if (sw.length > 3 && cleaned.includes(sw)) return true;
      return false;
    });
    if (matched) matchCount++;
    return { word, matched };
  });

  const rawScore = targetWords.length > 0 ? Math.round((matchCount / targetWords.length) * 100) : 0;
  // Soft curve for non-native speech learners
  const score = Math.min(100, Math.max(0, rawScore));
  const isGood = score >= 75;

  return { score, isGood, tokenAnalysis };
}
