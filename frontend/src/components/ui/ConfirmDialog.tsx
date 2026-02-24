import { useEffect, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import Button from './Button';
import { cn } from '../../lib/utils';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  items?: string[];
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  description,
  items,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onCancel]);

  // Focus trap
  useEffect(() => {
    if (open && dialogRef.current) {
      dialogRef.current.focus();
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden outline-none"
      >
        {/* Header */}
        <div className="flex items-start gap-3 p-5 pb-3">
          <div className={cn(
            'p-2 rounded-full shrink-0',
            variant === 'danger' ? 'bg-red-100' : 'bg-blue-100'
          )}>
            <AlertTriangle className={cn(
              'w-5 h-5',
              variant === 'danger' ? 'text-sentiment-negative' : 'text-primary'
            )} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-text-primary">
              {title}
            </h3>
            {description && (
              <p className="text-sm text-text-secondary mt-1">
                {description}
              </p>
            )}
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded-md text-text-secondary hover:text-text-primary hover:bg-gray-100 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Items list */}
        {items && items.length > 0 && (
          <div className="px-5 pb-3">
            <div className="bg-red-50 rounded-lg p-3 space-y-1.5">
              {items.map((item, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-text-primary">
                  <span className="text-sentiment-negative font-medium mt-px">
                    {i + 1}.
                  </span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 p-5 pt-3 border-t border-border">
          <Button variant="secondary" size="sm" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <button
            onClick={onConfirm}
            className={cn(
              'px-4 py-1.5 text-sm font-medium rounded-lg transition-colors',
              variant === 'danger'
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-primary text-white hover:bg-primary-dark'
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
