import React from 'react';
import { TTSButton } from './TTSButton';
import { useTTS } from '../context/TTSContext';
import { splitIntoSentences } from '../services/speech';

export interface SpeakableTextProps {
  en: string;
  zh?: string;
  className?: string;
  enClassName?: string;
  zhClassName?: string;
  isParagraph?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  buttonVariant?: 'ghost' | 'subtle' | 'badge' | 'minimal';
  showButton?: boolean;
}

export const SpeakableText: React.FC<SpeakableTextProps> = ({
  en,
  zh,
  className = '',
  enClassName = '',
  zhClassName = '',
  isParagraph = false,
  size = 'sm',
  buttonVariant = 'ghost',
  showButton = true,
}) => {
  const { isSentencePlaying, isTextPlaying, play } = useTTS();

  const isWholeTextActive = isTextPlaying(en);
  const sentences = isParagraph ? splitIntoSentences(en) : [en];

  return (
    <div className={`group/speakable relative ${className}`}>
      <div className="flex items-start gap-2">
        <div className={`flex-1 ${enClassName}`}>
          {isParagraph && sentences.length > 1 ? (
            <p className="leading-relaxed">
              {sentences.map((sent, idx) => {
                const isActive = isSentencePlaying(sent);
                return (
                  <span
                    key={idx}
                    onClick={() => play(sent)}
                    title="Click sentence to listen"
                    className={`transition-colors cursor-pointer rounded px-0.5 ${
                      isActive
                        ? 'bg-sky-100 text-sky-900 font-medium underline decoration-sky-400 decoration-2'
                        : 'hover:bg-slate-100/80 hover:text-sky-800'
                    }`}
                  >
                    {sent}{' '}
                  </span>
                );
              })}
            </p>
          ) : (
            <span
              className={`leading-relaxed transition-colors ${
                isWholeTextActive
                  ? 'text-sky-700 font-medium'
                  : ''
              }`}
            >
              {en}
            </span>
          )}

          {zh && (
            <p className={`text-slate-500 mt-0.5 text-xs ${zhClassName}`}>
              {zh}
            </p>
          )}
        </div>

        {showButton && (
          <div className="shrink-0 pt-0.5">
            <TTSButton
              text={en}
              size={size}
              variant={buttonVariant}
              isParagraph={isParagraph}
            />
          </div>
        )}
      </div>
    </div>
  );
};
