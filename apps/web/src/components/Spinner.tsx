interface Props {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Inline loading indicator for non-table contexts (page-level, modal bodies, sections).
 * Uses Material Symbols 'progress_activity' with CSS spin.
 */
export default function Spinner({ label, size = 'md', className = '' }: Props) {
  const px = size === 'sm' ? 18 : size === 'lg' ? 40 : 28;
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center gap-2 py-8 text-gray-700 ${className}`}
    >
      <span
        className="material-symbols-outlined animate-spin text-brand-red"
        style={{ fontSize: px }}
        aria-hidden="true"
      >
        progress_activity
      </span>
      {label && <span className="text-xs">{label}</span>}
    </div>
  );
}
