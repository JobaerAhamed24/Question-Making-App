import React, { useEffect } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Inbox,
  Lock,
  X,
  XCircle,
} from 'lucide-react';

import { toBanglaDigits } from '../../lib/bn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

  const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
    primary: 'gold-btn',
    secondary:
      'border border-[#D4A853]/40 bg-[#161B25] text-[#F3EEE3] hover:border-[#EAC779] hover:bg-[#1D2330]',
    outline: 'gold-outline-btn',
    ghost: 'bg-transparent text-[#C2C8D3] hover:bg-white/10 hover:text-[#F3EEE3]',
    danger: 'border border-rose-500/40 bg-rose-950/70 text-rose-200 hover:bg-rose-900/80 hover:text-white',
  };

  const sizes: Record<NonNullable<ButtonProps['size']>, string> = {
    sm: 'px-3.5 py-1.5 text-sm min-h-[36px]',
    md: 'px-4 py-2 text-sm min-h-[40px]',
    lg: 'px-6 py-2.5 text-base min-h-[44px]',
  };

  return (
    <button
      type={type}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Card({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`obsidian-card rounded-xl text-[#F3EEE3] ${className}`}>
      {children}
    </div>
  );
}

interface FormFieldProps {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}

export function FormField({ label, htmlFor, error, hint, required, children }: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-[#E5E0D5]">
        {label}
        {required && <span className="ml-1 text-[#E6C16E]">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-sm text-[#8C95A4]">{hint}</p>}
      {error && (
        <p role="alert" className="text-sm font-medium text-rose-400">
          {error}
        </p>
      )}
    </div>
  );
}

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className = '', ...props }, ref) => (
    <input
      ref={ref}
      className={`w-full rounded-lg border border-[#D4A853]/28 bg-[#090B10] px-3.5 py-2 text-sm text-[#F3EEE3] placeholder:text-[#6E7787] focus:border-[#E6C16E] focus:outline-none disabled:bg-[#0D1016] disabled:text-[#6E7787] min-h-[40px] ${className}`}
      {...props}
    />
  )
);
Input.displayName = 'Input';

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className = '', ...props }, ref) => (
  <textarea
    ref={ref}
    className={`w-full rounded-lg border border-[#D4A853]/28 bg-[#090B10] px-3.5 py-2 text-sm text-[#F3EEE3] placeholder:text-[#6E7787] focus:border-[#E6C16E] focus:outline-none disabled:bg-[#0D1016] disabled:text-[#6E7787] ${className}`}
    {...props}
  />
));
Textarea.displayName = 'Textarea';

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className = '', children, ...props }, ref) => (
    <select
      ref={ref}
      className={`w-full rounded-lg border border-[#D4A853]/28 bg-[#090B10] px-3 py-2 text-sm text-[#F3EEE3] focus:border-[#E6C16E] focus:outline-none disabled:bg-[#0D1016] disabled:text-[#6E7787] min-h-[40px] ${className}`}
      {...props}
    >
      {children}
    </select>
  )
);
Select.displayName = 'Select';

type SemanticTone = 'active' | 'pending' | 'expired' | 'neutral' | 'draft';

export function StatusTag({
  tone,
  label,
}: {
  tone: SemanticTone;
  label: string;
}) {
  const config: Record<SemanticTone, { classes: string; icon: React.ReactNode }> = {
    active: {
      classes: 'border-emerald-500/35 bg-emerald-950/60 text-emerald-300',
      icon: <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />,
    },
    pending: {
      classes: 'border-[#D4A853]/45 bg-[#2A200E]/70 text-[#F2D184]',
      icon: <Clock className="h-3.5 w-3.5 shrink-0" />,
    },
    expired: {
      classes: 'border-rose-500/35 bg-rose-950/60 text-rose-300',
      icon: <XCircle className="h-3.5 w-3.5 shrink-0" />,
    },
    draft: {
      classes: 'border-slate-600/50 bg-slate-800/70 text-slate-300',
      icon: <AlertCircle className="h-3.5 w-3.5 shrink-0" />,
    },
    neutral: {
      classes: 'border-sky-500/35 bg-sky-950/60 text-sky-300',
      icon: <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />,
    },
  };

  const selected = config[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${selected.classes}`}
    >
      {selected.icon}
      <span>{label}</span>
    </span>
  );
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  maxWidth = 'max-w-lg',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className={`w-full ${maxWidth} max-h-[90vh] overflow-y-auto rounded-xl border border-[#D4A853]/35 bg-[#0E1117] text-[#F3EEE3] shadow-2xl`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#D4A853]/20 px-6 py-4">
          <div>
            <h2 id="modal-title" className="text-lg font-semibold text-[#F5EFE2]">
              {title}
            </h2>
            {description && <p className="mt-1 text-sm text-[#A5AEBD]">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={`${title} বন্ধ করুন`}
            className="rounded-lg p-1.5 text-[#8C95A4] hover:bg-white/10 hover:text-[#F3EEE3] cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'নিশ্চিত করুন',
  danger = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} maxWidth="max-w-md">
      <p className="text-base text-[#C2C8D3] leading-relaxed">{message}</p>
      <div className="mt-6 flex items-center justify-end gap-3">
        <Button variant="outline" onClick={onClose}>
          বাতিল করুন
        </Button>
        <Button
          variant={danger ? 'danger' : 'primary'}
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#D4A853]/30 bg-[#0D1016] px-6 py-12 text-center">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg border border-[#D4A853]/30 bg-[#161B25] text-[#E6C16E]">
        {icon || <Inbox className="h-5 w-5" />}
      </div>
      <h3 className="text-base font-semibold text-[#F5EFE2]">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-[#A5AEBD]">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function AccessRestrictedState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="obsidian-card flex flex-col items-center justify-center rounded-xl px-6 py-14 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-[#D4A853]/40 bg-[#171C26] text-[#E6C16E]">
        <Lock className="h-5 w-5" />
      </div>
      <h2 className="text-lg font-semibold text-[#F5EFE2]">{title}</h2>
      <p className="mt-2 max-w-lg text-sm text-[#B8C0CE] leading-relaxed">{description}</p>
      {action && <div className="mt-6 flex flex-wrap items-center justify-center gap-3">{action}</div>}
    </div>
  );
}

export function LoadingSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="তথ্য লোড হচ্ছে">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-14 w-full animate-pulse rounded-lg border border-[#D4A853]/15 bg-[#12161F]"
        />
      ))}
    </div>
  );
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t border-[#D4A853]/20 pt-4">
      <p className="text-sm text-[#A5AEBD] tabular-nums">
        পৃষ্ঠা {toBanglaDigits(page)} / {toBanglaDigits(totalPages)}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="পূর্ববর্তী পৃষ্ঠা"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>পূর্ববর্তী</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="পরবর্তী পৃষ্ঠা"
        >
          <span>পরবর্তী</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
