import type { ReactNode } from 'react';

interface Props {
  icon?: string;
  title: string;
  description?: string;
  cta?: {
    label: string;
    onClick: () => void;
  };
  secondaryCta?: {
    label: string;
    onClick: () => void;
  };
  children?: ReactNode;
  variant?: 'default' | 'compact';
}

export default function EmptyState({
  icon = 'inbox',
  title,
  description,
  cta,
  secondaryCta,
  children,
  variant = 'default',
}: Props) {
  const isCompact = variant === 'compact';
  return (
    <div
      className={`text-center ${isCompact ? 'py-6' : 'py-12'} px-4 text-gray-600`}
      role="status"
    >
      <div
        className={`inline-flex items-center justify-center rounded-full bg-gray-100 text-gray-600 mb-3 ${
          isCompact ? 'w-10 h-10' : 'w-14 h-14'
        }`}
        aria-hidden="true"
      >
        <span className={`material-symbols-outlined ${isCompact ? '!text-[22px]' : '!text-[28px]'}`}>
          {icon}
        </span>
      </div>
      <div className={`font-semibold text-gray-700 ${isCompact ? 'text-sm' : 'text-base'}`}>
        {title}
      </div>
      {description && (
        <div className={`text-gray-600 mt-1 ${isCompact ? 'text-xs' : 'text-sm'} max-w-sm mx-auto`}>
          {description}
        </div>
      )}
      {(cta || secondaryCta || children) && (
        <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
          {cta && (
            <button
              type="button"
              onClick={cta.onClick}
              className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[40px] bg-brand-red text-white text-sm font-semibold rounded-brand hover:bg-brand-red/90 focus:outline-none focus:ring-2 focus:ring-brand-red/40 transition"
            >
              {cta.label}
            </button>
          )}
          {secondaryCta && (
            <button
              type="button"
              onClick={secondaryCta.onClick}
              className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[40px] border border-gray-300 text-gray-700 text-sm font-semibold rounded-brand hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 transition"
            >
              {secondaryCta.label}
            </button>
          )}
          {children}
        </div>
      )}
    </div>
  );
}
