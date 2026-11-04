import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '10mb' }));

// Initialize GoogleGenAI client (Server-Side Only)
let aiClient: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  aiClient = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// High-quality Teacher Voice Profiles
export const VOICE_PROFILES = {
  'us-female': {
    id: 'us-female',
    name: 'Sarah',
    label: 'Sarah (US Female)',
    gender: 'female',
    accent: 'en-US',
    accentLabel: 'American English (美式)',
    voiceName: 'Kore',
    style: 'Warm, clear, and friendly American English teacher for adult learners, with natural pauses and expressive intonation.',
    description: 'Encouraging, clear American English teacher voice',
    previewText: 'Hello! I am Sarah, your American English teacher. Consistent daily practice brings fluency!',
  },
  'us-male': {
    id: 'us-male',
    name: 'Michael',
    label: 'Michael (US Male)',
    gender: 'male',
    accent: 'en-US',
    accentLabel: 'American English (美式)',
    voiceName: 'Puck',
    style: 'Conversational, articulate American English instructor, with natural cadence, warm tone, and clear pacing.',
    description: 'Friendly, natural American conversational instructor',
    previewText: 'Hi there! I am Michael. Let us practice English together step by step today.',
  },
  'uk-female': {
    id: 'uk-female',
    name: 'Emma',
    label: 'Emma (UK Female)',
    gender: 'female',
    accent: 'en-GB',
    accentLabel: 'British English (英式)',
    voiceName: 'Aoede',
    style: 'Polite, articulate British Received Pronunciation English instructor, calm, encouraging with natural rhythm.',
    description: 'Articulate, elegant British RP teacher voice',
    previewText: 'Good day! I am Emma. Welcome to your British English listening and speaking lesson.',
  },
  'uk-male': {
    id: 'uk-male',
    name: 'Oliver',
    label: 'Oliver (UK Male)',
    gender: 'male',
    accent: 'en-GB',
    accentLabel: 'British English (英式)',
    voiceName: 'Charon',
    style: 'Thoughtful, warm British English teacher, clear enunciation with gentle rhythm and natural pauses.',
    description: 'Warm, articulate British English instructor',
    previewText: 'Hello! I am Oliver. Take your time, listen carefully, and repeat after me.',
  },
} as const;

export type VoiceId = keyof typeof VOICE_PROFILES;

// In-Memory Audio Cache to avoid redundant API calls
const audioCache = new Map<string, { base64: string; mimeType: string; timestamp: number }>();
const MAX_CACHE_ITEMS = 600;

// Rate-limiting cooldown tracker for Gemini Free-Tier (3 requests/minute)
let rateLimitUntil = 0;

function pruneCache() {
  if (audioCache.size > MAX_CACHE_ITEMS) {
    const keys = Array.from(audioCache.keys());
    for (let i = 0; i < 100; i++) {
      audioCache.delete(keys[i]);
    }
  }
}

// API: Get voice options
app.get('/api/voices', (_req: Request, res: Response) => {
  res.json({
    voices: Object.values(VOICE_PROFILES),
    hasApiKey: !!process.env.GEMINI_API_KEY,
  });
});

// API: High-Quality Neural Text-to-Speech
app.post('/api/tts', async (req: Request, res: Response): Promise<void> => {
  try {
    const { text, voiceId = 'us-female' } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      res.status(400).json({ error: 'Text is required' });
      return;
    }

    const cleanText = text.trim();
    const selectedVoice = VOICE_PROFILES[voiceId as VoiceId] || VOICE_PROFILES['us-female'];

    console.log(`[Server TTS] Request: voiceId="${voiceId}" -> resolved to "${selectedVoice.id}" (VoiceName: ${selectedVoice.voiceName}, ${selectedVoice.accent}, ${selectedVoice.gender})`);

    // Check cache first
    const cacheKey = `${selectedVoice.id}:::${cleanText.toLowerCase()}`;
    const cached = audioCache.get(cacheKey);
    if (cached) {
      console.log(`[Server TTS Cache] HIT for key: ${cacheKey}`);
      res.json({
        audioBase64: cached.base64,
        mimeType: cached.mimeType,
        cached: true,
        voiceId: selectedVoice.id,
      });
      return;
    }
    console.log(`[Server TTS Cache] MISS for key: ${cacheKey}`);

    // If currently within rate-limit cooldown, seamlessly trigger browser fallback
    if (Date.now() < rateLimitUntil) {
      const remainingSec = Math.max(1, Math.ceil((rateLimitUntil - Date.now()) / 1000));
      res.setHeader('Retry-After', String(remainingSec));
      res.status(200).json({
        fallback: true,
        rateLimited: true,
        cooldownRemaining: remainingSec,
        message: `Free-tier TTS rate limit cooldown active (${remainingSec}s remaining). Seamlessly using browser speech engine.`,
      });
      return;
    }

    // Check if API key is present
    if (!process.env.GEMINI_API_KEY) {
      res.status(200).json({
        fallback: true,
        error: 'GEMINI_API_KEY not configured on server.',
        message: 'Falling back to browser speech synthesis.',
      });
      return;
    }

    // Lazy instantiate if env var became available
    if (!aiClient) {
      aiClient = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    }

    // Generate speech with gemini-3.8-flash-lite-tts
    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: cleanText,
              speechMetadata: {
                style: selectedVoice.style,
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: selectedVoice.voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      throw new Error('No audio data returned from Gemini TTS model');
    }

    // Store in cache
    audioCache.set(cacheKey, {
      base64: base64Audio,
      mimeType: 'audio/wav',
      timestamp: Date.now(),
    });
    pruneCache();

    res.json({
      audioBase64: base64Audio,
      mimeType: 'audio/wav',
      cached: false,
      voiceId: selectedVoice.id,
    });
  } catch (err: any) {
    const errorStr = typeof err === 'object' ? JSON.stringify(err) : String(err);
    const isQuotaError =
      errorStr.includes('429') ||
      errorStr.includes('RESOURCE_EXHAUSTED') ||
      errorStr.includes('Quota exceeded') ||
      errorStr.includes('quota');

    if (isQuotaError) {
      let waitMs = 30000;
      const retryMatch = errorStr.match(/retry in ([\d\.]+)s/i) || errorStr.match(/retryDelay"?:\s*"(\d+)s/i);
      if (retryMatch && retryMatch[1]) {
        waitMs = Math.ceil(parseFloat(retryMatch[1]) * 1000) + 1000;
      }
      rateLimitUntil = Date.now() + waitMs;
      const cooldownSec = Math.ceil(waitMs / 1000);
      res.setHeader('Retry-After', String(cooldownSec));
      console.warn(`[TTS] Gemini Free-Tier limit reached (3 RPM). Cooldown: ${cooldownSec}s. Using browser speech engine fallback.`);
      res.status(200).json({
        fallback: true,
        rateLimited: true,
        cooldownRemaining: cooldownSec,
        message: `Free-tier TTS rate limit (3 RPM) reached. Cooldown: ${cooldownSec}s. Seamlessly using browser speech engine.`,
      });
      return;
    } else {
      console.warn('[TTS] Non-fatal TTS error, falling back to browser speech:', err?.message || err);
      res.status(200).json({
        fallback: true,
        rateLimited: false,
        message: 'Falling back to browser speech synthesis.',
      });
      return;
    }
  }
});

// Setup Vite or Static File Serving
async function startServer() {
  if (!isProd) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`My English server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
