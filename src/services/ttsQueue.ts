/**
 * Global Safe Rate-Limited TTS Request Queue
 * Enforces Gemini Free-Tier strict limits (3 RPM = max 1 request every 20s).
 * - Minimum 21s interval between live API requests.
 * - In-flight deduplication (same text/voice shares a single request).
 * - Cooldown handling & exponential backoff on HTTP 429.
 * - Non-blocking: Allows learners to bypass queue instantly using high-quality browser voice.
 */

export interface TTSQueueState {
  queueLength: number;
  isProcessing: boolean;
  cooldownRemainingSeconds: number;
  activeText: string | null;
  lastSource: 'gemini' | 'cached' | 'fallback';
}

interface QueuedItem {
  id: string;
  cacheKey: string;
  text: string;
  voiceId: string;
  resolve: (result: { audioBase64?: string; mimeType?: string; fallback?: boolean; message?: string }) => void;
  reject: (err: unknown) => void;
  allowFallbackIfWaiting?: boolean;
}

const MIN_INTERVAL_MS = 21000; // 21 seconds between new live Gemini requests (stays safely under 3 RPM)
let lastRequestFinishedAt = 0;
let rateLimitUntil = 0;
let isProcessingQueue = false;
const queue: QueuedItem[] = [];
const inFlightDedupe = new Map<string, Promise<{ audioBase64?: string; mimeType?: string; fallback?: boolean; message?: string }>>();

let currentQueueState: TTSQueueState = {
  queueLength: 0,
  isProcessing: false,
  cooldownRemainingSeconds: 0,
  activeText: null,
  lastSource: 'gemini',
};

const listeners = new Set<(state: TTSQueueState) => void>();

function notifyListeners(updates?: Partial<TTSQueueState>) {
  if (updates) {
    currentQueueState = { ...currentQueueState, ...updates };
  }
  listeners.forEach((l) => {
    try {
      l(currentQueueState);
    } catch (e) {
      console.warn('Queue listener error', e);
    }
  });
}

// Countdown timer loop for UI feedback
setInterval(() => {
  const now = Date.now();
  const remainingCooldown = Math.max(0, Math.ceil((rateLimitUntil - now) / 1000));
  const remainingInterval = Math.max(0, Math.ceil((lastRequestFinishedAt + MIN_INTERVAL_MS - now) / 1000));
  const effectiveCooldown = Math.max(remainingCooldown, remainingInterval);

  if (effectiveCooldown !== currentQueueState.cooldownRemainingSeconds) {
    notifyListeners({
      cooldownRemainingSeconds: effectiveCooldown,
      queueLength: queue.length,
    });
  }
}, 1000);

export function subscribeTTSQueue(listener: (state: TTSQueueState) => void): () => void {
  listeners.add(listener);
  listener(currentQueueState);
  return () => {
    listeners.delete(listener);
  };
}

export function getTTSQueueState(): TTSQueueState {
  return currentQueueState;
}

/**
 * Enqueue a TTS request with automatic deduplication, 21s rate pacing, and cooldown protection
 */
export function enqueueTTSRequest(
  text: string,
  voiceId: string,
  cacheKey: string,
  options?: { allowFallbackIfWaiting?: boolean }
): Promise<{ audioBase64?: string; mimeType?: string; fallback?: boolean; message?: string }> {
  // 1. Deduplicate if exact same request is already pending
  const existingPromise = inFlightDedupe.get(cacheKey);
  if (existingPromise) {
    return existingPromise;
  }

  const promise = new Promise<{ audioBase64?: string; mimeType?: string; fallback?: boolean; message?: string }>((resolve, reject) => {
    const item: QueuedItem = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      cacheKey,
      text,
      voiceId,
      resolve,
      reject,
      allowFallbackIfWaiting: options?.allowFallbackIfWaiting,
    };

    queue.push(item);
    notifyListeners({ queueLength: queue.length });
    processNextInQueue();
  });

  inFlightDedupe.set(cacheKey, promise);

  // Clean dedupe map when promise finishes
  promise.finally(() => {
    inFlightDedupe.delete(cacheKey);
  });

  return promise;
}

async function processNextInQueue(): Promise<void> {
  if (isProcessingQueue || queue.length === 0) {
    return;
  }

  isProcessingQueue = true;
  notifyListeners({ isProcessing: true });

  while (queue.length > 0) {
    const item = queue[0];
    const now = Date.now();

    // Check if in cooldown or minimum interval delay
    const waitTillCooldown = Math.max(0, rateLimitUntil - now);
    const waitTillInterval = Math.max(0, (lastRequestFinishedAt + MIN_INTERVAL_MS) - now);
    const delayNeeded = Math.max(waitTillCooldown, waitTillInterval);

    if (delayNeeded > 0) {
      notifyListeners({
        cooldownRemainingSeconds: Math.ceil(delayNeeded / 1000),
        activeText: item.text,
      });

      // If user specified fallback if waiting or if wait is extensive (>10s) and queue has items,
      // allow fallback to keep app snappy
      if (item.allowFallbackIfWaiting && delayNeeded > 3000) {
        queue.shift();
        notifyListeners({ queueLength: queue.length, lastSource: 'fallback' });
        item.resolve({
          fallback: true,
          message: `Queue pacing active (${Math.ceil(delayNeeded / 1000)}s safe interval). Using instant natural system voice.`,
        });
        continue;
      }

      // Wait out the required delay to protect free tier
      await new Promise((r) => setTimeout(r, Math.min(delayNeeded, 1000)));
      continue;
    }

    // Dequeue item to process
    queue.shift();
    notifyListeners({
      queueLength: queue.length,
      activeText: item.text,
      cooldownRemainingSeconds: 0,
    });

    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: item.text,
          voiceId: item.voiceId,
        }),
      });

      lastRequestFinishedAt = Date.now();

      if (!response.ok) {
        if (response.status === 429) {
          // Received 429 rate limit
          const retryAfter = response.headers.get('Retry-After');
          const waitSeconds = retryAfter ? parseInt(retryAfter, 10) : 30;
          rateLimitUntil = Date.now() + (waitSeconds * 1000);
          console.warn(`[TTS Queue] 429 received. Cooldown set to ${waitSeconds}s`);
          notifyListeners({
            cooldownRemainingSeconds: waitSeconds,
            lastSource: 'fallback',
          });
          item.resolve({
            fallback: true,
            message: `Free-tier limit reached. Cooldown: ${waitSeconds}s. Using browser voice.`,
          });
          continue;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.rateLimited) {
        rateLimitUntil = Date.now() + 30000;
        notifyListeners({
          cooldownRemainingSeconds: 30,
          lastSource: 'fallback',
        });
      } else if (!data.fallback && data.audioBase64) {
        notifyListeners({ lastSource: 'gemini' });
      }

      item.resolve(data);
    } catch (err) {
      console.warn('[TTS Queue] Fetch error, triggering fallback:', err);
      notifyListeners({ lastSource: 'fallback' });
      item.resolve({
        fallback: true,
        message: 'Network issue, falling back to browser speech.',
      });
    }
  }

  isProcessingQueue = false;
  notifyListeners({
    isProcessing: false,
    activeText: null,
  });
}

/**
 * Remove an item from the queue or bypass all pending to immediate fallback
 */
export function bypassQueueToBrowserFallback(): void {
  while (queue.length > 0) {
    const item = queue.shift();
    if (item) {
      item.resolve({
        fallback: true,
        message: 'Learner requested instant playback using browser natural speech.',
      });
    }
  }
  notifyListeners({
    queueLength: 0,
    isProcessing: false,
    lastSource: 'fallback',
  });
}
