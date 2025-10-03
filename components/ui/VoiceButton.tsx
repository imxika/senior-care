'use client';

import { ButtonHTMLAttributes, forwardRef, useState } from 'react';

interface VoiceButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: 'sm' | 'base' | 'lg';
  variant?: 'primary' | 'success' | 'warning' | 'danger';
  fullWidth?: boolean;
  voiceText?: string; // 음성으로 읽을 텍스트 (미래 Eleven Labs 연동용)
}

const VoiceButton = forwardRef<HTMLButtonElement, VoiceButtonProps>(
  ({
    children,
    size = 'base',
    variant = 'primary',
    fullWidth = false,
    voiceText,
    onClick,
    className = '',
    ...props
  }, ref) => {
    const [isPlaying, setIsPlaying] = useState(false);

    const baseStyles = 'font-bold rounded-xl transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3';

    const sizeStyles = {
      sm: 'min-h-[var(--size-senior-btn-sm)] text-[var(--font-size-senior-sm)] px-6',
      base: 'min-h-[var(--size-senior-btn-base)] text-[var(--font-size-senior-base)] px-8',
      lg: 'min-h-[var(--size-senior-btn-lg)] text-[var(--font-size-senior-lg)] px-10',
    };

    const variantStyles = {
      primary: 'bg-[var(--senior-primary)] hover:bg-[#3A7BC8] text-white',
      success: 'bg-[var(--senior-success)] hover:bg-[#6DB31A] text-white',
      warning: 'bg-[var(--senior-warning)] hover:bg-[#E59512] text-white',
      danger: 'bg-[var(--senior-danger)] hover:bg-[#B00116] text-white',
    };

    const widthStyle = fullWidth ? 'w-full' : '';

    const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
      // 음성 재생 로직 (미래 Eleven Labs 연동)
      if (voiceText && !isPlaying) {
        setIsPlaying(true);

        // TODO: Eleven Labs API 연동
        // const audioUrl = await generateVoice(voiceText);
        // const audio = new Audio(audioUrl);
        // audio.onended = () => setIsPlaying(false);
        // audio.play();

        // 임시: 브라우저 기본 TTS 사용
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(voiceText);
          utterance.lang = 'ko-KR';
          utterance.rate = 0.9; // 약간 느리게
          utterance.onend = () => setIsPlaying(false);
          window.speechSynthesis.speak(utterance);
        }
      }

      onClick?.(e);
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${widthStyle} ${className}`}
        onClick={handleClick}
        {...props}
      >
        {isPlaying && (
          <svg className="w-6 h-6 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

VoiceButton.displayName = 'VoiceButton';

export default VoiceButton;
