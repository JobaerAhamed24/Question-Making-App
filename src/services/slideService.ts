import PptxGenJS from 'pptxgenjs';
import { mockDb } from '../lib/mockDb';
import type {
  SlideDeck,
  SlideDeckConfig,
  SlideItem,
  SlideMcqInput,
  SlideTemplateId,
} from '../types/domain';

export interface SlideTemplatePreset {
  id: SlideTemplateId;
  name: string;
  nameBn: string;
  bgColor: string;
  surfaceColor: string;
  textColor: string;
  mutedColor: string;
  accentColor: string;
  fontFamily: string;
}

export const SLIDE_TEMPLATES: SlideTemplatePreset[] = [
  {
    id: 'obsidian-gold',
    name: 'Obsidian Gold',
    nameBn: 'অবসিডিয়ান গোল্ড',
    bgColor: '#0B0F17',
    surfaceColor: '#141B29',
    textColor: '#F5EFE3',
    mutedColor: '#98A4B8',
    accentColor: '#D4A853',
    fontFamily: 'Noto Serif Bengali',
  },
  {
    id: 'editorial-cream',
    name: 'Editorial Paper',
    nameBn: 'এডিটোরিয়াল ক্রিম',
    bgColor: '#FAF7F0',
    surfaceColor: '#EFE9DC',
    textColor: '#1F2328',
    mutedColor: '#5B6470',
    accentColor: '#9F6A1E',
    fontFamily: 'Noto Serif Bengali',
  },
  {
    id: 'academic-navy',
    name: 'Academic Navy',
    nameBn: 'একাডেমিক নেভি',
    bgColor: '#0F1E36',
    surfaceColor: '#182C4C',
    textColor: '#F4F7FC',
    mutedColor: '#A3B6D4',
    accentColor: '#56B4E9',
    fontFamily: 'Hind Siliguri',
  },
  {
    id: 'forest-chalk',
    name: 'Chalkboard Forest',
    nameBn: 'চকবোর্ড সবুজ',
    bgColor: '#132620',
    surfaceColor: '#1B352D',
    textColor: '#F2F5F0',
    mutedColor: '#A9C2B8',
    accentColor: '#E6B85C',
    fontFamily: 'Hind Siliguri',
  },
  {
    id: 'minimal-studio',
    name: 'Minimal Studio',
    nameBn: 'মিনিমাল স্টুডিও',
    bgColor: '#FFFFFF',
    surfaceColor: '#F3F4F6',
    textColor: '#111827',
    mutedColor: '#6B7280',
    accentColor: '#1D4ED8',
    fontFamily: 'Plus Jakarta Sans',
  },
];

export const SLIDE_FONT_OPTIONS = [
  { value: 'Noto Serif Bengali', label: 'Noto Serif Bengali (এডিটোরিয়াল বাংলা)' },
  { value: 'Hind Siliguri', label: 'Hind Siliguri (মডার্ন বাংলা)' },
  { value: 'Plus Jakarta Sans', label: 'Plus Jakarta Sans (English Clean)' },
  { value: 'Tiro Bangla', label: 'Tiro Bangla (ক্লাসিক বাংলা)' },
];

export function createDefaultDeckConfig(): SlideDeckConfig {
  const tpl = SLIDE_TEMPLATES[0];
  return {
    title: 'অধ্যায়ভিত্তিক MCQ অনুশীলনী ক্লাস',
    subtitle: 'স্বয়ংক্রিয়ভাবে প্রস্তুতকৃত প্রশ্ন ও উত্তর উপস্থাপনা',
    presenterName: 'প্রশ্নঘর একাডেমি',
    templateId: tpl.id,
    aspectRatio: '16:9',
    layoutMode: 'grid-2x2',
    backgroundStyle: 'gradient',
    typographyScale: 'standard',
    answerRevealMode: 'after-each',
    fontFamily: tpl.fontFamily,
    customBgColor: tpl.bgColor,
    customTextColor: tpl.textColor,
    customAccentColor: tpl.accentColor,
    includeTitleSlide: true,
    includeSummarySlide: true,
  };
}

export function getSampleMcqs12(): SlideMcqInput[] {
  const state = mockDb.getState();
  const publishedMcqs = state.questions
    .filter((q) => q.status === 'published' && q.questionTypeCode === 'mcq' && (q.options?.length ?? 0) >= 2)
    .slice(0, 12);

  return publishedMcqs.map((q) => ({
    id: q.id,
    prompt: q.prompt,
    options: (q.options ?? []).map((opt) => ({
      label: opt.label,
      text: opt.text,
      isCorrect: opt.isCorrect,
    })),
    explanation: q.explanation,
  }));
}

export function getSampleRawMcqText12(): string {
  const items = getSampleMcqs12();
  return items
    .map((item, idx) => {
      const correctOpt = item.options.find((o) => o.isCorrect);
      const opts = item.options.map((o) => `${o.label}) ${o.text}`).join('\n');
      const exp = item.explanation ? `\nব্যাখ্যা: ${item.explanation}` : '';
      return `${idx + 1}. ${item.prompt}\n${opts}\nউত্তর: ${correctOpt?.label ?? 'ক'}${exp}`;
    })
    .join('\n\n');
}

function normalizeBengaliDigits(str: string): string {
  const map: Record<string, string> = {
    '০': '0',
    '১': '1',
    '২': '2',
    '৩': '3',
    '৪': '4',
    '৫': '5',
    '৬': '6',
    '৭': '7',
    '৮': '8',
    '৯': '9',
  };
  return str.replace(/[০-৯]/g, (d) => map[d] ?? d);
}

export function parseMcqTextToItems(rawText: string): SlideMcqInput[] {
  const trimmed = rawText.trim();
  if (!trimmed) return [];

  // Try JSON format first if user pasted JSON array
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed) as Array<{
        prompt?: string;
        question?: string;
        options?: Array<string | { label?: string; text: string; isCorrect?: boolean }>;
        answer?: string | number;
        explanation?: string;
      }>;
      if (Array.isArray(parsed)) {
        return parsed
          .filter((item) => Boolean(item.prompt || item.question))
          .map((item, idx) => {
            const labels = ['ক', 'খ', 'গ', 'ঘ'];
            const opts = (item.options ?? []).map((opt, oi) => {
              if (typeof opt === 'string') {
                return {
                  label: labels[oi] ?? String.fromCharCode(65 + oi),
                  text: opt,
                  isCorrect: item.answer === oi || item.answer === labels[oi] || item.answer === String.fromCharCode(65 + oi),
                };
              }
              return {
                label: opt.label ?? labels[oi] ?? String.fromCharCode(65 + oi),
                text: opt.text,
                isCorrect: Boolean(opt.isCorrect),
              };
            });
            if (opts.length > 0 && !opts.some((o) => o.isCorrect)) {
              opts[0].isCorrect = true;
            }
            return {
              id: `mcq-json-${idx}-${Date.now()}`,
              prompt: (item.prompt ?? item.question ?? '').trim(),
              options: opts,
              explanation: item.explanation?.trim(),
            };
          });
      }
    } catch {
      // Fall through to plain text parser
    }
  }

  // Plain-text parser supporting Bengali and English MCQs separated by blank lines or numbered headings
  const lines = trimmed.split(/\r?\n/);
  const blocks: string[][] = [];
  let currentBlock: string[] = [];

  const questionStartRe = /^(?:Q?\s*[0-9০-৯]+[.)।:-]\s+|প্রশ্ন\s*[0-9০-৯]*[:.-]\s+)/i;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      if (currentBlock.length > 0) {
        blocks.push(currentBlock);
        currentBlock = [];
      }
      continue;
    }
    if (questionStartRe.test(line) && currentBlock.length >= 2) {
      blocks.push(currentBlock);
      currentBlock = [line];
    } else {
      currentBlock.push(line);
    }
  }
  if (currentBlock.length > 0) blocks.push(currentBlock);

  const optionRe = /^([A-Da-dকখগঘ])[).:-]\s+(.+)$/;
  const answerRe = /^(?:Answer|Ans|Correct|উত্তর|সঠিক উত্তর)\s*[:.-]\s*(.+)$/i;
  const explanationRe = /^(?:Explanation|Note|ব্যাখ্যা)\s*[:.-]\s*(.+)$/i;

  const parsed: SlideMcqInput[] = [];

  blocks.forEach((block, blockIndex) => {
    let promptLines: string[] = [];
    const options: Array<{ label: string; text: string; isCorrect: boolean }> = [];
    let answerHint = '';
    let explanation = '';

    for (const line of block) {
      const ansMatch = line.match(answerRe);
      if (ansMatch) {
        answerHint = ansMatch[1].trim();
        continue;
      }
      const expMatch = line.match(explanationRe);
      if (expMatch) {
        explanation = expMatch[1].trim();
        continue;
      }
      const optMatch = line.match(optionRe);
      if (optMatch) {
        let optText = optMatch[2].trim();
        let isMarked = false;
        if (optText.startsWith('*') || optText.endsWith('*') || /\((?:correct|সঠিক)\)/i.test(optText)) {
          isMarked = true;
          optText = optText.replace(/^\*|\*$/g, '').replace(/\((?:correct|সঠিক)\)/gi, '').trim();
        }
        options.push({
          label: optMatch[1].toUpperCase(),
          text: optText,
          isCorrect: isMarked,
        });
        continue;
      }

      if (options.length === 0) {
        const cleaned = line.replace(questionStartRe, '').trim();
        promptLines.push(cleaned);
      }
    }

    const prompt = promptLines.join(' ').trim();
    if (!prompt || options.length < 2) return;

    if (!options.some((o) => o.isCorrect) && answerHint) {
      const normalizedHint = normalizeBengaliDigits(answerHint).toUpperCase().replace(/[).]/g, '').trim();
      const matched = options.find(
        (o) =>
          o.label.toUpperCase() === normalizedHint ||
          o.text.toUpperCase() === normalizedHint ||
          normalizedHint.startsWith(o.label.toUpperCase())
      );
      if (matched) {
        matched.isCorrect = true;
      }
    }
    if (!options.some((o) => o.isCorrect)) {
      options[0].isCorrect = true;
    }

    parsed.push({
      id: `mcq-parsed-${blockIndex}-${Date.now()}`,
      prompt,
      options,
      explanation: explanation || undefined,
    });
  });

  return parsed;
}

export function generateSlidesFromMcqs(
  mcqs: SlideMcqInput[],
  config: SlideDeckConfig
): SlideItem[] {
  const slides: SlideItem[] = [];

  if (config.includeTitleSlide) {
    slides.push({
      id: `slide-title-${Date.now()}`,
      kind: 'title',
      title: config.title || 'MCQ উপস্থাপনা',
      subtitle: `${config.subtitle || 'অনুশীলনী স্লাইড'} • মোট ${mcqs.length}টি প্রশ্ন`,
      notes: `উপস্থাপক: ${config.presenterName}`,
    });
  }

  const questionSlides: SlideItem[] = mcqs.map((q, index) => ({
    id: `slide-q-${index}-${q.id}`,
    kind: 'question',
    questionNumber: index + 1,
    title: `প্রশ্ন ${index + 1}`,
    prompt: q.prompt,
    options: structuredClone(q.options),
    explanation: q.explanation,
    notes: q.explanation ? `ব্যাখ্যা: ${q.explanation}` : undefined,
  }));

  const answerSlides: SlideItem[] = mcqs.map((q, index) => {
    const correct = q.options.find((o) => o.isCorrect);
    return {
      id: `slide-a-${index}-${q.id}`,
      kind: 'answer',
      questionNumber: index + 1,
      title: `সঠিক উত্তর — প্রশ্ন ${index + 1}`,
      subtitle: correct ? `উত্তর: (${correct.label}) ${correct.text}` : undefined,
      prompt: q.prompt,
      options: structuredClone(q.options),
      explanation: q.explanation || 'সঠিক বিকল্পটি হাইলাইট করা হয়েছে।',
      notes: q.explanation,
    };
  });

  if (config.answerRevealMode === 'after-each') {
    for (let i = 0; i < mcqs.length; i++) {
      slides.push(questionSlides[i]);
      slides.push(answerSlides[i]);
    }
  } else if (config.answerRevealMode === 'at-end') {
    slides.push(...questionSlides);
    slides.push(...answerSlides);
  } else {
    slides.push(...questionSlides);
  }

  if (config.includeSummarySlide) {
    slides.push({
      id: `slide-summary-${Date.now()}`,
      kind: 'summary',
      title: 'স্লাইড সারসংক্ষেপ ও ধন্যবাদ',
      subtitle: `মোট ${mcqs.length}টি বহুনির্বাচনি প্রশ্ন পর্যালোচনা সম্পন্ন হয়েছে`,
      prompt: config.presenterName
        ? `উপস্থাপনায়: ${config.presenterName}`
        : 'নিয়মিত অনুশীলন ও লাইভ পরীক্ষায় অংশ নিন।',
    });
  }

  return slides;
}

function stripHash(hex: string): string {
  return hex.replace(/^#/, '').trim() || '0B0F17';
}

export async function exportDeckToPptx(deck: SlideDeck): Promise<void> {
  const pptx = new PptxGenJS();
  pptx.title = deck.config.title || 'MCQ Presentation';
  pptx.author = deck.config.presenterName || 'QuestionBank';

  if (deck.config.aspectRatio === '16:10') {
    pptx.layout = 'LAYOUT_16x10';
  } else if (deck.config.aspectRatio === '4:3') {
    pptx.layout = 'LAYOUT_4x3';
  } else {
    pptx.layout = 'LAYOUT_16x9';
  }

  const is4x3 = deck.config.aspectRatio === '4:3';
  const slideW = is4x3 ? 10 : 10;
  const slideH = is4x3 ? 7.5 : deck.config.aspectRatio === '16:10' ? 6.25 : 5.625;

  const bgHex = stripHash(deck.config.customBgColor);
  const textHex = stripHash(deck.config.customTextColor);
  const accentHex = stripHash(deck.config.customAccentColor);
  const fontFace = deck.config.fontFamily || 'Arial';

  for (const item of deck.slides) {
    const slide = pptx.addSlide();
    slide.background = { color: bgHex };

    // Top hairline accent
    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: slideW,
      h: 0.08,
      fill: { color: accentHex },
    });

    if (item.kind === 'title' || item.kind === 'summary') {
      slide.addText(item.title, {
        x: 0.8,
        y: slideH * 0.3,
        w: slideW - 1.6,
        h: 1.2,
        fontSize: 30,
        bold: true,
        color: textHex,
        fontFace,
        align: 'center',
      });
      if (item.subtitle) {
        slide.addText(item.subtitle, {
          x: 1.0,
          y: slideH * 0.54,
          w: slideW - 2.0,
          h: 0.7,
          fontSize: 16,
          color: accentHex,
          fontFace,
          align: 'center',
        });
      }
      if (item.prompt) {
        slide.addText(item.prompt, {
          x: 1.2,
          y: slideH * 0.7,
          w: slideW - 2.4,
          h: 0.6,
          fontSize: 13,
          color: textHex,
          fontFace,
          align: 'center',
        });
      }
    } else {
      // Question / Answer / Custom Slide
      slide.addText(item.title, {
        x: 0.6,
        y: 0.35,
        w: slideW - 1.2,
        h: 0.4,
        fontSize: 13,
        bold: true,
        color: accentHex,
        fontFace,
      });

      if (item.prompt) {
        slide.addText(item.prompt, {
          x: 0.6,
          y: 0.85,
          w: slideW - 1.2,
          h: 1.35,
          fontSize: 20,
          bold: true,
          color: textHex,
          fontFace,
          valign: 'top',
        });
      }

      const opts = item.options ?? [];
      const isTwoCol = deck.config.layoutMode !== 'stacked' && opts.length >= 2;
      const startY = 2.35;

      opts.forEach((opt, idx) => {
        const isAnswerSlide = item.kind === 'answer';
        const isCorrect = isAnswerSlide && opt.isCorrect;

        const col = isTwoCol ? idx % 2 : 0;
        const row = isTwoCol ? Math.floor(idx / 2) : idx;
        const boxW = isTwoCol ? (slideW - 1.5) / 2 : slideW - 1.2;
        const boxH = isTwoCol ? 0.95 : 0.62;
        const gapY = isTwoCol ? 0.22 : 0.14;
        const x = 0.6 + col * (boxW + 0.3);
        const y = startY + row * (boxH + gapY);

        slide.addShape(pptx.ShapeType.roundRect, {
          x,
          y,
          w: boxW,
          h: boxH,
          fill: { color: isCorrect ? '1F5E3B' : bgHex },
          line: { color: isCorrect ? '4ADE80' : accentHex, pt: isCorrect ? 2 : 0.8 },
          rectRadius: 0.08,
        });

        slide.addText(`${opt.label})  ${opt.text}`, {
          x: x + 0.16,
          y: y + 0.06,
          w: boxW - 0.32,
          h: boxH - 0.12,
          fontSize: 15,
          bold: isCorrect,
          color: isCorrect ? 'FFFFFF' : textHex,
          fontFace,
          valign: 'middle',
        });
      });

      if (item.kind === 'answer' && item.explanation) {
        slide.addText(`ব্যাখ্যা: ${item.explanation}`, {
          x: 0.6,
          y: slideH - 0.88,
          w: slideW - 1.2,
          h: 0.58,
          fontSize: 12,
          color: accentHex,
          fontFace,
          valign: 'middle',
        });
      }
    }

    if (item.notes) {
      slide.addNotes(item.notes);
    }
  }

  const safeName = (deck.config.title || 'mcq-slides')
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .trim()
    .replace(/\s+/g, '-');
  await pptx.writeFile({ fileName: `${safeName || 'mcq-presentation'}.pptx` });
}

export const slideService = {
  templates: SLIDE_TEMPLATES,
  fontOptions: SLIDE_FONT_OPTIONS,

  async importMcqsFromQuestionBank(filters?: {
    classId?: string;
    subjectId?: string;
    limit?: number;
  }): Promise<SlideMcqInput[]> {
    const state = mockDb.getState();
    const limit = Math.max(1, Math.min(100, filters?.limit ?? 15));
    const filtered = state.questions
      .filter((q) => q.status === 'published' && q.questionTypeCode === 'mcq' && (q.options?.length ?? 0) >= 2)
      .filter((q) => {
        if (filters?.classId && q.classId !== filters.classId) return false;
        if (filters?.subjectId && q.subjectId !== filters.subjectId) return false;
        return true;
      })
      .slice(0, limit);

    return filtered.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      options: (q.options ?? []).map((o) => ({
        label: o.label,
        text: o.text,
        isCorrect: o.isCorrect,
      })),
      explanation: q.explanation,
    }));
  },

  async listSavedDecks(): Promise<SlideDeck[]> {
    const state = mockDb.getState();
    return structuredClone(state.slideDecks);
  },

  async saveDeck(deck: SlideDeck): Promise<SlideDeck> {
    const state = mockDb.getState();
    const current = mockDb.getCurrentUser();
    const now = new Date().toISOString();
    const idx = state.slideDecks.findIndex((d) => d.id === deck.id);
    const record: SlideDeck = {
      ...structuredClone(deck),
      userId: current?.id ?? deck.userId,
      updatedAt: now,
    };
    if (idx === -1) {
      state.slideDecks.unshift(record);
    } else {
      state.slideDecks[idx] = record;
    }
    mockDb.save();
    return structuredClone(record);
  },

  async deleteDeck(deckId: string): Promise<void> {
    const state = mockDb.getState();
    state.slideDecks = state.slideDecks.filter((d) => d.id !== deckId);
    mockDb.save();
  },
};
