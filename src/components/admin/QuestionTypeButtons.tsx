import React from 'react';
import { Link } from 'react-router-dom';
import {
  AlignLeft,
  Calculator,
  CheckSquare,
  FileSpreadsheet,
  Image as ImageIcon,
  PenLine,
  Plus,
  ToggleLeft,
} from 'lucide-react';
import { toBanglaDigits } from '../../lib/bn';
import type { QuestionType, QuestionTypeCode } from '../../types/domain';

export function getQuestionTypeIcon(code: QuestionTypeCode, className = 'h-4 w-4') {
  switch (code) {
    case 'mcq':
      return <CheckSquare className={className} />;
    case 'cq':
      return <FileSpreadsheet className={className} />;
    case 'short':
      return <AlignLeft className={className} />;
    case 'fill_blank':
      return <PenLine className={className} />;
    case 'true_false':
      return <ToggleLeft className={className} />;
    case 'math':
      return <Calculator className={className} />;
    case 'image_based':
      return <ImageIcon className={className} />;
  }
}

export function QuestionTypeQuickAddBar({
  questionTypes,
  countsByType,
  compact = false,
}: {
  questionTypes: QuestionType[];
  countsByType?: Partial<Record<QuestionTypeCode, number>>;
  compact?: boolean;
}) {
  const activeTypes = questionTypes.filter((qt) => qt.isActive);

  const getAddAriaLabel = (nameBn: string) =>
    nameBn.includes('প্রশ্ন') ? `${nameBn} যোগ করুন` : `${nameBn} প্রশ্ন যোগ করুন`;

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {activeTypes.map((qt) => (
          <Link
            key={qt.id}
            to={`/admin/questions/new?type=${qt.code}`}
            aria-label={`নতুন ${getAddAriaLabel(qt.nameBn)}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#D4A853]/30 bg-[#0A0D12] px-3 py-2 text-sm font-semibold text-[#EAC779] hover:border-[#EAC779] hover:bg-[#D4A853] hover:text-[#090B0E] transition-colors whitespace-nowrap"
          >
            {getQuestionTypeIcon(qt.code, 'h-4 w-4 shrink-0')}
            <span>+ {qt.nameBn}</span>
          </Link>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {activeTypes.map((qt) => {
        const count = countsByType?.[qt.code] ?? 0;
        return (
          <Link
            key={qt.id}
            to={`/admin/questions/new?type=${qt.code}`}
            aria-label={getAddAriaLabel(qt.nameBn)}
            className="group flex items-center justify-between gap-3 rounded-xl border border-[#D4A853]/28 bg-[#0A0D12] p-3.5 transition-all hover:border-[#EAC779] hover:bg-[#141822]"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#D4A853]/40 bg-[#141923] text-[#EAC779] group-hover:bg-[#D4A853] group-hover:text-[#090B0E] transition-colors">
                {getQuestionTypeIcon(qt.code, 'h-4 w-4')}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#F5EFE2] group-hover:text-[#EAC779]">
                  {qt.nameBn}
                </p>
                <p className="text-xs text-[#9DA6B5] tabular-nums">
                  {toBanglaDigits(qt.defaultMarks)} নম্বর · {toBanglaDigits(count)}টি রয়েছে
                </p>
              </div>
            </div>
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[#D4A853]/35 bg-[#12161F] text-[#EAC779] group-hover:border-[#EAC779] group-hover:bg-[#D4A853] group-hover:text-[#090B0E] transition-colors">
              <Plus className="h-4 w-4" />
            </span>
          </Link>
        );
      })}
    </div>
  );
}
