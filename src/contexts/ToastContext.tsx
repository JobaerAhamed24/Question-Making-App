import React, { createContext, useCallback, useContext, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, X, AlertTriangle } from 'lucide-react';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  pushToast: (toast: Omit<ToastItem, 'id'>) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback(
    (toast: Omit<ToastItem, 'id'>) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev, { ...toast, id }]);
      setTimeout(() => {
        dismiss(id);
      }, 4500);
    },
    [dismiss]
  );

  const iconMap: Record<ToastVariant, React.ReactNode> = {
    success: <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />,
    error: <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />,
    warning: <AlertTriangle className="h-4 w-4 text-[#E6C16E] shrink-0" />,
    info: <Info className="h-4 w-4 text-sky-400 shrink-0" />,
  };

  const styleMap: Record<ToastVariant, string> = {
    success: 'border-emerald-500/40 bg-[#10141C] text-[#F3EEE3]',
    error: 'border-rose-500/40 bg-[#10141C] text-[#F3EEE3]',
    warning: 'border-[#D4A853]/50 bg-[#10141C] text-[#F3EEE3]',
    info: 'border-[#D4A853]/35 bg-[#10141C] text-[#F3EEE3]',
  };

  return (
    <ToastContext.Provider value={{ pushToast }}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0 no-print"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`flex items-start gap-3 rounded-lg border p-3.5 shadow-xl transition-all ${styleMap[t.variant]}`}
          >
            <div className="mt-0.5">{iconMap[t.variant]}</div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-snug text-[#F3EEE3]">{t.title}</p>
              {t.description && (
                <p className="mt-0.5 text-sm text-[#B8C0CE] leading-relaxed">{t.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label={`বিজ্ঞপ্তি বন্ধ করুন ${t.title}`}
              className="rounded p-1 text-[#8C95A4] hover:bg-white/10 hover:text-[#F3EEE3]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
