import React from 'react';
import { Volume2, VolumeX, Square, Loader2 } from 'lucide-react';
import { useTTS } from '../context/TTSContext';

export interface TTSButtonProps {
  text: string;
  label?: string;
  showLabel?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  variant?: 'ghost' | 'subtle' | 'solid' | 'badge' | 'minimal' | 'pill';
  className?: string;
  title?: string;
  isParagraph?: boolean;
  disabled?: boolean;
}

export const TTSButton: React.FC<TTSButtonProps> = ({
  text,
  label,
  showLabel = false,
  size = 'sm',
  variant = 'ghost',
  className = '',
  title = 'Click to listen with natural teacher voice',
  isParagraph = false,
  disabled = false,
}) => {
  const { play, playParagraph, stop, isTextPlaying, playbackState } = useTTS();

  const isCurrentText = isTextPlaying(text);
  const isPlaying = isCurrentText && playbackState.status === 'playing';
  const isPaused = isCurrentText && playbackState.status === 'paused';
  const isLoading = isCurrentText && playbackState.status === 'loading';

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;

    if (isPlaying) {
      stop();
    } else {
      if (isParagraph) {
        playParagraph(text);
      } else {
        play(text);
      }
    }
  };

  // Size mappings
  const sizeClasses = {
    xs: 'p-1 text-xs gap-1',
    sm: 'p-1.5 text-xs gap-1.5',
    md: 'px-2.5 py-1.5 text-sm gap-2',
    lg: 'px-3.5 py-2 text-base gap-2.5',
  }[size];

  const iconSizes = {
    xs: 'w-3.5 h-3.5',
    sm: 'w-4 h-4',
    md: 'w-4.5 h-4.5',
    lg: 'w-5 h-5',
  }[size];

  // Variant mappings
  let variantClasses = '';
  if (isPlaying) {
    variantClasses = 'bg-sky-500 text-white shadow-xs animate-pulse';
  } else if (isPaused) {
    variantClasses = 'bg-amber-100 text-amber-700 border border-amber-300';
  } else {
    switch (variant) {
      case 'ghost':
        variantClasses =
          'text-slate-500 hover:text-sky-600 hover:bg-sky-50 active:bg-sky-100 transition-colors';
        break;
      case 'subtle':
        variantClasses =
          'bg-slate-100 text-slate-700 hover:bg-sky-50 hover:text-sky-600 border border-slate-200/80 transition-colors';
        break;
      case 'solid':
        variantClasses =
          'bg-sky-600 text-white hover:bg-sky-700 shadow-xs transition-colors';
        break;
      case 'badge':
        variantClasses =
          'bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200/80 font-medium transition-colors';
        break;
      case 'pill':
        variantClasses =
          'bg-white text-slate-700 hover:text-sky-600 border border-slate-200 shadow-2xs hover:border-sky-300 transition-colors';
        break;
      case 'minimal':
        variantClasses =
          'text-slate-400 hover:text-sky-600 transition-colors p-0';
        break;
    }
  }

  const roundedClasses = variant === 'pill' || variant === 'badge' ? 'rounded-full' : 'rounded-lg';

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      title={isPlaying ? 'Click to stop audio' : title}
      aria-label={isPlaying ? 'Stop audio' : `Listen to ${label || 'text'}`}
      className={`inline-flex items-center justify-center font-medium cursor-pointer transition-all select-none ${roundedClasses} ${sizeClasses} ${variantClasses} ${className} ${
        disabled ? 'opacity-40 cursor-not-allowed' : ''
      }`}
    >
      {isLoading ? (
        <Loader2 className={`${iconSizes} animate-spin`} />
      ) : isPlaying ? (
        <div className="flex items-center gap-1">
          <Square className={`${iconSizes} fill-current`} />
          {/* Animated mini sound bars */}
          <span className="flex items-end gap-0.5 h-3 ml-0.5">
            <span className="w-0.5 bg-current h-full animate-[bounce_0.6s_ease-in-out_infinite]" />
            <span className="w-0.5 bg-current h-2/3 animate-[bounce_0.6s_ease-in-out_0.2s_infinite]" />
            <span className="w-0.5 bg-current h-4/5 animate-[bounce_0.6s_ease-in-out_0.4s_infinite]" />
          </span>
        </div>
      ) : (
        <Volume2 className={iconSizes} />
      )}

      {showLabel && (
        <span className="font-medium whitespace-nowrap">
          {isPlaying ? 'Stop' : label || 'Listen'}
        </span>
      )}
    </button>
  );
};
