import { useEffect, useRef, type KeyboardEvent, type ClipboardEvent, type ChangeEvent } from 'react';

interface Props {
  length?: number;
  value: string;
  onChange: (v: string) => void;
  onComplete?: (v: string) => void;
  autoFocus?: boolean;
  disabled?: boolean;
  'aria-label'?: string;
}

/**
 * 6-digit OTP input. Auto-advances on type, supports paste, ESC/Backspace to go back,
 * fires onComplete when all slots are filled.
 * Uses autocomplete="one-time-code" on the first field (iOS SMS autofill).
 */
export default function OtpInput({
  length = 6,
  value,
  onChange,
  onComplete,
  autoFocus = true,
  disabled,
  'aria-label': ariaLabel = 'รหัส OTP',
}: Props) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const chars = value.slice(0, length).split('');
  while (chars.length < length) chars.push('');

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  useEffect(() => {
    if (value.length === length) onComplete?.(value);
  }, [value, length, onComplete]);

  const setChar = (i: number, ch: string) => {
    const next = (chars.slice(0, i).join('') + ch + chars.slice(i + 1).join('')).slice(0, length);
    onChange(next);
  };

  const handleChange = (i: number) => (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    if (!raw) {
      setChar(i, '');
      return;
    }
    // If user pasted multiple digits into one slot, spread
    if (raw.length > 1) {
      const spread = raw.slice(0, length - i);
      const next = (chars.slice(0, i).join('') + spread).padEnd(value.length, '').slice(0, length);
      onChange(next);
      const target = Math.min(i + spread.length, length - 1);
      refs.current[target]?.focus();
      refs.current[target]?.select();
      return;
    }
    setChar(i, raw);
    if (i < length - 1) {
      refs.current[i + 1]?.focus();
      refs.current[i + 1]?.select();
    }
  };

  const handleKeyDown = (i: number) => (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!chars[i] && i > 0) {
        e.preventDefault();
        setChar(i - 1, '');
        refs.current[i - 1]?.focus();
        refs.current[i - 1]?.select();
      }
    } else if (e.key === 'ArrowLeft' && i > 0) {
      e.preventDefault();
      refs.current[i - 1]?.focus();
      refs.current[i - 1]?.select();
    } else if (e.key === 'ArrowRight' && i < length - 1) {
      e.preventDefault();
      refs.current[i + 1]?.focus();
      refs.current[i + 1]?.select();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!text) return;
    e.preventDefault();
    onChange(text);
    const target = Math.min(text.length, length - 1);
    refs.current[target]?.focus();
    refs.current[target]?.select();
  };

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="flex items-center justify-center gap-1.5 sm:gap-2"
    >
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          value={chars[i] ?? ''}
          onChange={handleChange(i)}
          onKeyDown={handleKeyDown(i)}
          onPaste={handlePaste}
          onFocus={(e) => e.currentTarget.select()}
          disabled={disabled}
          aria-label={`หลักที่ ${i + 1}`}
          className="w-11 h-14 sm:w-12 sm:h-14 text-center text-2xl font-mono font-semibold bg-white/10 border border-white/20 rounded-brand text-white focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/40 disabled:opacity-50"
        />
      ))}
    </div>
  );
}
