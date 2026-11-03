import React, { useState } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  RotateCcw, 
  Volume2, 
  ChevronDown, 
  ChevronUp, 
  Sparkles,
  Gauge,
  Zap,
  Clock,
  Radio
} from 'lucide-react';
import { useTTS } from '../context/TTSContext';
import { NATURAL_VOICE_OPTIONS } from '../services/speech';

export const GlobalTTSPlayer: React.FC = () => {
  const {
    playbackState,
    queueState,
    pause,
    resume,
    stop,
    replay,
    setSpeed,
    setVoiceId,
    currentVoiceOption,
    playImmediateFallback,
  } = useTTS();

  const [isMinimized, setIsMinimized] = useState(false);
  const [showVoiceMenu, setShowVoiceMenu] = useState(false);

  // If no audio active and not paused and not loading, do not show player
  if (!playbackState.isPlaying && !playbackState.isPaused && !playbackState.isLoading && !playbackState.currentText) {
    return null;
  }

  const speedOptions = [0.75, 1.0, 1.25, 1.5];

  const displayText =
    playbackState.activeSentence ||
    playbackState.currentText ||
    'Playing English audio...';

  return (
    <aside aria-label="Global Audio Player" className="fixed bottom-4 right-4 z-50 max-w-md w-[calc(100vw-2rem)] sm:w-auto">
      <div className="bg-slate-900/95 backdrop-blur-md text-white rounded-2xl shadow-xl border border-slate-700/60 p-3 sm:p-3.5 transition-all animate-in slide-in-from-bottom-3 duration-200">
        
        {/* Header row: Speaker info, source badge & controls */}
        <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2 relative">
            <div className="w-6 h-6 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
              <Volume2 className="w-3.5 h-3.5" />
            </div>

            {/* Persona Selector Pill */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowVoiceMenu(!showVoiceMenu)}
                className="flex items-center gap-1.5 text-xs font-medium text-slate-200 hover:text-white bg-slate-800/80 hover:bg-slate-800 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                title="Switch voice persona"
              >
                <Sparkles className="w-3 h-3 text-sky-400" />
                <span>{currentVoiceOption.name}</span>
                <span className="text-[10px] text-slate-400">({currentVoiceOption.accent === 'en-US' ? 'US' : 'UK'})</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {/* Voice popover dropdown */}
              {showVoiceMenu && (
                <div className="absolute bottom-full left-0 mb-2 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1.5 z-50 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                  <span className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1 block">
                    Choose Natural Teacher Voice:
                  </span>
                  {NATURAL_VOICE_OPTIONS.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => {
                        setVoiceId(v.id);
                        setShowVoiceMenu(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between cursor-pointer transition-colors ${
                        playbackState.voiceId === v.id
                          ? 'bg-sky-600 text-white font-medium'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span>{v.label}</span>
                      <span className="text-[10px] opacity-75">{v.gender}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Source indicator badge */}
            {playbackState.source === 'cached' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                <Zap className="w-2.5 h-2.5" />
                Cached
              </span>
            )}
            {playbackState.source === 'fallback' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded">
                <Radio className="w-2.5 h-2.5" />
                System Voice
              </span>
            )}
            {playbackState.source === 'gemini' && !playbackState.isLoading && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-sky-500/20 text-sky-300 border border-sky-500/30 px-1.5 py-0.5 rounded">
                <Sparkles className="w-2.5 h-2.5" />
                Gemini
              </span>
            )}

            {/* Paragraph progress if multiple sentences */}
            {playbackState.totalSentences > 1 && (
              <span className="text-[11px] text-slate-400 tabular-nums">
                {playbackState.currentSentenceIndex + 1}/{playbackState.totalSentences}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 text-slate-400 hover:text-slate-200 rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
              title={isMinimized ? 'Expand player' : 'Collapse player'}
            >
              {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={stop}
              className="p-1 text-slate-400 hover:text-rose-400 rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
              title="Stop audio"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
            </button>
          </div>
        </div>

        {/* Content body (Hidden if minimized) */}
        {!isMinimized && (
          <div className="pt-2.5 space-y-2.5">
            {/* Live sentence text */}
            <div className="bg-slate-950/60 rounded-lg p-2 border border-slate-800/80 max-h-20 overflow-y-auto">
              <p className="text-xs text-slate-200 leading-snug line-clamp-3 font-normal">
                {displayText}
              </p>
            </div>

            {/* Queue / Cooldown Banner if waiting on rate-limited queue */}
            {playbackState.isLoading && queueState.cooldownRemainingSeconds > 0 && (
              <div className="bg-amber-950/40 border border-amber-500/30 rounded-lg p-2 flex items-center justify-between gap-2 text-xs text-amber-200">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Clock className="w-3.5 h-3.5 shrink-0 text-amber-400 animate-spin" />
                  <span className="truncate">
                    Gemini Free-Tier safe interval: <strong>{queueState.cooldownRemainingSeconds}s</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => playImmediateFallback()}
                  className="shrink-0 px-2 py-0.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-semibold rounded transition-colors cursor-pointer"
                  title="Play instantly without waiting for Gemini cooldown"
                >
                  Play Now
                </button>
              </div>
            )}

            {/* Playback Controls & Speed */}
            <div className="flex items-center justify-between gap-3">
              {/* Main Playback Buttons */}
              <div className="flex items-center gap-1.5">
                {playbackState.isPaused ? (
                  <button
                    type="button"
                    onClick={resume}
                    className="p-2 bg-sky-500 hover:bg-sky-400 text-white rounded-lg transition-colors cursor-pointer shadow-xs"
                    title="Resume playback"
                  >
                    <Play className="w-4 h-4 fill-current" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={pause}
                    className="p-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg transition-colors cursor-pointer shadow-xs"
                    title="Pause playback"
                  >
                    <Pause className="w-4 h-4 fill-current" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={stop}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors cursor-pointer"
                  title="Stop playback"
                >
                  <Square className="w-4 h-4 fill-current" />
                </button>

                <button
                  type="button"
                  onClick={replay}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors cursor-pointer"
                  title="Replay text"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              {/* Speed Buttons */}
              <div className="flex items-center gap-1 bg-slate-800/80 p-0.5 rounded-lg border border-slate-700/60">
                <Gauge className="w-3 h-3 text-slate-400 ml-1.5 mr-0.5" />
                {speedOptions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSpeed(s)}
                    className={`px-1.5 py-0.5 text-[11px] font-semibold rounded cursor-pointer transition-colors ${
                      playbackState.speed === s
                        ? 'bg-sky-500 text-white shadow-2xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>

          </div>
        )}

      </div>
    </aside>
  );
};
