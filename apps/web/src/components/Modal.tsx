import { useEffect, useRef } from 'react';

interface Props {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export default function Modal({ open, title, onClose, children, footer }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // ESC to close + focus trap (basic: focus first focusable on open, trap Tab within modal)
  useEffect(() => {
    if (!open) return;
    const prevActive = document.activeElement as HTMLElement | null;

    const focusableSelector =
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const focusFirst = () => {
      const el = dialogRef.current?.querySelector<HTMLElement>(focusableSelector);
      el?.focus();
    };
    // next tick so the dialog is in the DOM
    const timer = window.setTimeout(focusFirst, 0);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const items = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector),
        ).filter((el) => !el.hasAttribute('disabled'));
        if (items.length === 0) return;
        const first = items[0]!;
        const last = items[items.length - 1]!;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', onKey);
    // Prevent body scroll while modal is open
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      prevActive?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="bg-white rounded-brand-lg shadow-brand-lg w-full max-w-lg max-h-[90vh] flex flex-col outline-none"
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <h2 id="modal-title" className="font-display font-bold text-base text-brand-navy">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 min-w-[36px] min-h-[36px] rounded hover:bg-gray-100 text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-red/50"
            aria-label="ปิดหน้าต่าง"
            title="ปิด (Esc)"
          >
            <span className="material-symbols-outlined !text-[19px]" aria-hidden="true">close</span>
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto flex-1">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-200 bg-gray-50 rounded-b-brand-lg">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
