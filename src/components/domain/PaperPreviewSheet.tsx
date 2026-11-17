import React from 'react';
import { toBanglaDigits } from '../../lib/bn';
import { calculatePaperTotalMarks } from '../../lib/rules';
import type { QuestionPaper } from '../../types/domain';

export function PaperPreviewSheet({
  paper,
  classNameLabel,
  subjectNameLabel,
  showAnswerKey = false,
}: {
  paper: QuestionPaper;
  classNameLabel: string;
  subjectNameLabel: string;
  showAnswerKey?: boolean;
}) {
  const totalMarks = calculatePaperTotalMarks(paper.items);

  return (
    <article className="print-paper-sheet mx-auto max-w-[820px] rounded-lg border border-slate-300 bg-white p-6 sm:p-10 text-slate-900 shadow-sm font-bangla">
      {/* পরীক্ষার শিরোনাম অংশ */}
      <header className="border-b-2 border-slate-900 pb-4 text-center">
        <div className="flex flex-col items-center justify-center gap-2">
          {paper.schoolLogoDataUrl && (
            <img
              src={paper.schoolLogoDataUrl}
              alt={`${paper.schoolName} লোগো`}
              referrerPolicy="no-referrer"
              className="h-14 w-14 object-contain"
            />
          )}
          <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            {paper.schoolName}
          </h1>
        </div>
        <p className="mt-1 text-base font-semibold text-slate-800">{paper.examName}</p>
        <p className="mt-0.5 text-sm text-slate-700">{paper.title}</p>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-300 pt-2.5 text-sm font-medium text-slate-800 tabular-nums">
          <span>শ্রেণি: {classNameLabel}</span>
          <span>বিষয়: {subjectNameLabel}</span>
          <span>সময়: {toBanglaDigits(paper.durationMinutes)} মিনিট</span>
          <span>পূর্ণমান: {toBanglaDigits(totalMarks)}</span>
        </div>
      </header>

      {/* ঐচ্ছিক শিক্ষার্থীর নাম ও রোল অংশ */}
      {paper.includeStudentFields && (
        <div className="mt-4 grid grid-cols-1 gap-4 border border-slate-300 bg-slate-50/50 px-4 py-2.5 text-sm sm:grid-cols-12">
          <div className="sm:col-span-6 flex items-baseline gap-2">
            <span className="font-medium text-slate-700 whitespace-nowrap">শিক্ষার্থীর নাম:</span>
            <span className="flex-1 border-b border-dotted border-slate-500 h-3" />
          </div>
          <div className="sm:col-span-3 flex items-baseline gap-2">
            <span className="font-medium text-slate-700 whitespace-nowrap">রোল / আইডি:</span>
            <span className="flex-1 border-b border-dotted border-slate-500 h-3" />
          </div>
          <div className="sm:col-span-3 sm:text-right tabular-nums whitespace-nowrap">
            <span className="font-medium text-slate-700">তারিখ:</span> {toBanglaDigits(paper.examDate)}
          </div>
        </div>
      )}

      {/* সাধারণ নির্দেশনা */}
      <div className="mt-4 border-b border-slate-200 pb-3 text-sm text-slate-700">
        <span className="font-semibold text-slate-900">নির্দেশনা: </span>
        <span>{paper.instructions}</span>
      </div>

      {/* প্রশ্নসমূহ */}
      {paper.items.length === 0 ? (
        <div className="py-12 text-center text-base text-slate-500">
          এই প্রশ্নপত্রে এখনো কোনো প্রশ্ন যুক্ত করা হয়নি।
        </div>
      ) : (
        <ol className="mt-6 space-y-6">
          {paper.items.map((item, idx) => {
            const q = item.snapshot;
            const numLabel = toBanglaDigits(idx + 1);
            return (
              <li key={item.id} className="print-avoid-break">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1 space-y-2">
                    {q.stimulus && (
                      <p className="rounded border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm sm:text-base leading-relaxed text-slate-800">
                        <span className="font-semibold">{numLabel}. </span>
                        {q.stimulus}
                      </p>
                    )}

                    <p className="text-sm sm:text-base leading-relaxed text-slate-900">
                      {!q.stimulus && <span className="font-semibold mr-1.5">{numLabel}.</span>}
                      <span>{q.prompt}</span>
                    </p>

                    {q.equationLatex && (
                      <div className="pl-5 font-mono text-sm text-slate-800">
                        {q.equationLatex}
                      </div>
                    )}

                    {q.imageUrl && (
                      <div className="pl-5 pt-1">
                        <img
                          src={q.imageUrl}
                          alt={`প্রশ্ন ${numLabel}-এর চিত্র`}
                          referrerPolicy="no-referrer"
                          className="max-h-48 rounded border border-slate-200 bg-white p-1 object-contain"
                        />
                      </div>
                    )}

                    {q.options && q.options.length > 0 && (
                      <div className="grid grid-cols-1 gap-1.5 pl-5 pt-1 sm:grid-cols-2 text-sm text-slate-800">
                        {q.options.map((opt) => (
                          <div key={opt.id}>
                            <span className="font-medium">({opt.label})</span> {opt.text}
                          </div>
                        ))}
                      </div>
                    )}

                    {q.subParts && q.subParts.length > 0 && (
                      <div className="space-y-1.5 pl-5 pt-1 text-sm text-slate-800">
                        {q.subParts.map((part) => (
                          <div key={part.id} className="flex items-baseline justify-between gap-3">
                            <span>
                              <span className="font-medium">{part.label})</span> {part.prompt}
                            </span>
                            <span className="shrink-0 text-sm text-slate-600 tabular-nums">
                              [{toBanglaDigits(part.marks)}]
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 pt-0.5 text-sm font-semibold text-slate-800 tabular-nums">
                    [{toBanglaDigits(item.customMarks)}]
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {/* ঐচ্ছিক উত্তরপত্র অংশ */}
      {showAnswerKey && paper.items.length > 0 && (
        <section className="mt-10 border-t-2 border-dashed border-slate-300 pt-6">
          <h2 className="font-display text-lg font-bold text-slate-900">
            উত্তরপত্র ও নম্বর বণ্টন নির্দেশিকা
          </h2>
          <ol className="mt-4 space-y-3 text-sm">
            {paper.items.map((item, idx) => {
              const q = item.snapshot;
              return (
                <li key={`ans-${item.id}`} className="print-avoid-break rounded border border-slate-200 bg-slate-50 p-3">
                  <p className="font-semibold text-slate-900">
                    প্রশ্ন {toBanglaDigits(idx + 1)} ({toBanglaDigits(item.customMarks)} নম্বর)
                  </p>
                  {q.correctAnswerText && (
                    <p className="mt-1 text-slate-800">
                      <span className="font-medium">সঠিক উত্তর:</span> {q.correctAnswerText}
                    </p>
                  )}
                  {q.subParts && q.subParts.length > 0 && (
                    <ul className="mt-1.5 space-y-1 text-slate-800">
                      {q.subParts.map((sp) => (
                        <li key={`ans-sp-${sp.id}`}>
                          <span className="font-medium">{sp.label})</span> {sp.answer}
                        </li>
                      ))}
                    </ul>
                  )}
                  {q.explanation && (
                    <p className="mt-1.5 text-sm text-slate-600">
                      <span className="font-medium">ব্যাখ্যা:</span> {q.explanation}
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {/* হেডার/ফুটার তথ্য */}
      {(paper.includeHeaderFooter || paper.includePageNumbers) && (
        <footer className="mt-10 flex items-center justify-between border-t border-slate-200 pt-3 text-sm text-slate-500 tabular-nums">
          <span>{paper.includeHeaderFooter ? `${paper.schoolName} · ${paper.examName}` : ''}</span>
          <span>{paper.includePageNumbers ? 'পৃষ্ঠা ১ / ১' : ''}</span>
        </footer>
      )}
    </article>
  );
}
