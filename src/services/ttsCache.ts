/**
 * Persistent Audio Cache using Browser IndexedDB
 * Caches synthesized audio base64/blobs permanently across browser reloads
 * to prevent hitting Gemini Free-Tier rate limits on repeated listening.
 */

const DB_NAME = 'MyEnglish_TTS_DB';
const DB_VERSION = 1;
const STORE_NAME = 'audio_cache';

export interface CachedAudioRecord {
  key: string;
  cleanText: string;
  voiceId: string;
  audioBase64: string;
  mimeType: string;
  createdAt: number;
  lastAccessed: number;
  sizeBytes: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      reject(new Error('IndexedDB not supported in this environment'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        store.createIndex('voiceId', 'voiceId', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('lastAccessed', 'lastAccessed', { unique: false });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error('Failed to open IndexedDB'));
    };
  });

  return dbPromise;
}

/**
 * Generates a unique cache key based on voice persona and normalized text
 */
export function buildAudioCacheKey(text: string, voiceId: string): string {
  const normalized = text.trim().toLowerCase().replace(/\s+/g, ' ');
  return `${voiceId}:::${normalized}`;
}

/**
 * Retrieves audio data from persistent IndexedDB
 */
export async function getAudioFromCache(key: string): Promise<CachedAudioRecord | null> {
  try {
    const db = await getDB();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => {
        const record = request.result as CachedAudioRecord | undefined;
        if (record) {
          // Asynchronously update last accessed timestamp
          updateLastAccessed(db, key).catch(() => {});
          resolve(record);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => {
        resolve(null);
      };
    });
  } catch (err) {
    console.warn('[TTS Cache] Read error:', err);
    return null;
  }
}

async function updateLastAccessed(db: IDBDatabase, key: string): Promise<void> {
  try {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(key);
    getReq.onsuccess = () => {
      const data = getReq.result;
      if (data) {
        data.lastAccessed = Date.now();
        store.put(data);
      }
    };
  } catch {}
}

/**
 * Saves generated audio permanently in IndexedDB
 */
export async function saveAudioToCache(
  key: string,
  cleanText: string,
  voiceId: string,
  audioBase64: string,
  mimeType = 'audio/wav'
): Promise<void> {
  try {
    const db = await getDB();
    const approxBytes = Math.round((audioBase64.length * 3) / 4);

    const record: CachedAudioRecord = {
      key,
      cleanText,
      voiceId,
      audioBase64,
      mimeType,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      sizeBytes: approxBytes,
    };

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(record);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('[TTS Cache] Save error:', err);
  }
}

/**
 * Retrieves total cached items and estimated storage size
 */
export async function getCacheStats(): Promise<{ count: number; totalEstimatedBytes: number }> {
  try {
    const db = await getDB();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        const records = (req.result as CachedAudioRecord[]) || [];
        const count = records.length;
        const totalEstimatedBytes = records.reduce((acc, r) => acc + (r.sizeBytes || 0), 0);
        resolve({ count, totalEstimatedBytes });
      };

      req.onerror = () => {
        resolve({ count: 0, totalEstimatedBytes: 0 });
      };
    });
  } catch {
    return { count: 0, totalEstimatedBytes: 0 };
  }
}

/**
 * Clears all cached audio files
 */
export async function clearAllAudioCache(): Promise<void> {
  try {
    const db = await getDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[TTS Cache] Clear error:', err);
  }
}
