import { useEffect, useRef } from 'react';

interface Props {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Lightweight confirm dialog for destructive/risky actions.
 * Focus trap, ESC to cancel, primary action on Enter.
 */
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'ยืนยัน',
  cancelLabel = 'ยกเลิก',
  variant = 'danger',
  loading,
  onConfirm,
  onCancel,
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => confirmRef.current?.focus(), 0);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (!loading) onCancel();
      } else if (e.key === 'Enter' && document.activeElement === confirmRef.current) {
        // default behavior OK
      }
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      prev?.focus?.();
    };
  }, [open, loading, onCancel]);

  if (!open) return null;

  const confirmClasses =
    variant === 'danger'
      ? 'bg-brand-red hover:bg-brand-red/90 focus:ring-brand-red/40'
      : 'bg-brand-navy hover:bg-brand-navy/90 focus:ring-brand-navy/40';

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4"
      onClick={() => !loading && onCancel()}
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby={description ? 'confirm-desc' : undefined}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-brand-lg shadow-brand-lg w-full max-w-sm p-5"
      >
        <div className="flex items-start gap-3 mb-3">
          <div
            className={`w-10 h-10 rounded-full grid place-items-center flex-shrink-0 ${
              variant === 'danger' ? 'bg-brand-red/10 text-brand-red' : 'bg-brand-navy/10 text-brand-navy'
            }`}
            aria-hidden="true"
          >
            <span className="material-symbols-outlined !text-[22px]">
              {variant === 'danger' ? 'warning' : 'help'}
            </span>
          </div>
          <div className="flex-1 pt-0.5">
            <h3 id="confirm-title" className="font-semibold text-base text-gray-900">
              {title}
            </h3>
            {description && (
              <p id="confirm-desc" className="text-sm text-gray-700 mt-1">
                {description}
              </p>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 min-h-[40px] border border-gray-300 text-gray-700 text-sm font-semibold rounded-brand hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 min-h-[40px] text-white text-sm font-semibold rounded-brand focus:outline-none focus:ring-2 disabled:opacity-50 flex items-center gap-1.5 ${confirmClasses}`}
          >
            {loading && (
              <span className="material-symbols-outlined !text-[16px] animate-spin" aria-hidden="true">
                progress_activity
              </span>
            )}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
