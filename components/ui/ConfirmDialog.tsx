'use client';

import { createPortal } from 'react-dom';
import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Info, Trash2, X, RefreshCw } from 'lucide-react';
import { useConfirmStore } from '@/lib/confirmStore';
import { cn } from '@/lib/utils';

export function ConfirmDialog() {
  const { open, opts, dismiss } = useConfirmStore();
  const confirmBtnRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Auto-focus confirm button
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => confirmBtnRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); dismiss(); }
    };
    window.addEventListener('keydown', handler, { capture: true });
    return () => window.removeEventListener('keydown', handler, { capture: true });
  }, [open, dismiss]);

  if (!mounted || !open || !opts) return null;

  const {
    title,
    description,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    variant = 'danger',
    onConfirm,
  } = opts;

  const handleConfirm = () => { dismiss(); onConfirm(); };
  const handleCancel  = () => dismiss();

  const cfg = {
    danger: {
      icon:    <Trash2 size={22} />,
      iconBg:  'bg-rose-50 border-rose-100',
      iconFg:  'text-rose-500',
      btn:     'bg-rose-600 hover:bg-rose-700 focus-visible:ring-rose-500',
      ring:    'ring-rose-100',
    },
    warning: {
      icon:    <AlertTriangle size={22} />,
      iconBg:  'bg-amber-50 border-amber-100',
      iconFg:  'text-amber-500',
      btn:     'bg-amber-600 hover:bg-amber-700 focus-visible:ring-amber-500',
      ring:    'ring-amber-100',
    },
    info: {
      icon:    <Info size={22} />,
      iconBg:  'bg-blue-50 border-blue-100',
      iconFg:  'text-blue-500',
      btn:     'bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-500',
      ring:    'ring-blue-100',
    },
    reset: {
      icon:    <RefreshCw size={22} />,
      iconBg:  'bg-orange-50 border-orange-100',
      iconFg:  'text-orange-500',
      btn:     'bg-orange-600 hover:bg-orange-700 focus-visible:ring-orange-500',
      ring:    'ring-orange-100',
    },
  }[variant] ?? {
    icon:    <Trash2 size={22} />,
    iconBg:  'bg-rose-50 border-rose-100',
    iconFg:  'text-rose-500',
    btn:     'bg-rose-600 hover:bg-rose-700 focus-visible:ring-rose-500',
    ring:    'ring-rose-100',
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby={description ? 'confirm-desc' : undefined}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
        onClick={handleCancel}
        aria-hidden="true"
      />

      {/* Dialog panel */}
      <div className="relative w-full max-w-sm rounded-2xl border border-slate-200/80 bg-white shadow-2xl">
        {/* Top accent stripe */}
        <div className={cn(
          'h-1 w-full rounded-t-2xl',
          variant === 'danger'  ? 'bg-gradient-to-r from-rose-400 to-rose-600' :
          variant === 'warning' ? 'bg-gradient-to-r from-amber-400 to-amber-600' :
                                  'bg-gradient-to-r from-blue-400 to-blue-600',
        )} />

        <div className="p-6">
          {/* Close button */}
          <button
            onClick={handleCancel}
            className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <X size={14} />
          </button>

          {/* Icon */}
          <div className={cn(
            'mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border',
            cfg.iconBg, cfg.iconFg,
          )}>
            {cfg.icon}
          </div>

          {/* Title */}
          <h2 id="confirm-title" className="text-base font-bold leading-tight text-slate-800">
            {title}
          </h2>

          {/* Description */}
          {description && (
            <p id="confirm-desc" className="mt-2 text-sm leading-relaxed text-slate-500">
              {description}
            </p>
          )}

          {/* Actions */}
          <div className="mt-6 flex gap-2.5 justify-end">
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 active:scale-[0.98]"
            >
              {cancelLabel}
            </button>
            <button
              ref={confirmBtnRef}
              type="button"
              onClick={handleConfirm}
              className={cn(
                'rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                'active:scale-[0.98]',
                cfg.btn,
              )}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
