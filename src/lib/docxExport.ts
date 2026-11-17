import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import type { QuestionPaper } from '../types/domain';
import { toBanglaDigits } from './bn';
import { calculatePaperTotalMarks } from './rules';

export async function generatePaperDocxBlob(
  paper: QuestionPaper,
  className: string,
  subjectName: string,
  includeAnswerKey: boolean
): Promise<Blob> {
  const totalMarks = calculatePaperTotalMarks(paper.items);

  const children: Array<Paragraph | Table> = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      heading: HeadingLevel.HEADING_1,
      children: [
        new TextRun({
          text: paper.schoolName,
          bold: true,
          size: 32,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: `${paper.examName} — ${paper.title}`,
          bold: true,
          size: 24,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 160 },
      children: [
        new TextRun({
          text: `শ্রেণি: ${className}   |   বিষয়: ${subjectName}   |   সময়: ${toBanglaDigits(paper.durationMinutes)} মিনিট   |   পূর্ণমান: ${toBanglaDigits(totalMarks)}`,
          size: 20,
        }),
      ],
    }),
  ];

  if (paper.includeStudentFields) {
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
                  bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
                  left: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
                  right: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
                },
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: 'শিক্ষার্থীর নাম: ________________________________', size: 20 })],
                  }),
                ],
              }),
              new TableCell({
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
                  bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
                  left: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
                  right: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
                },
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: `রোল নং: ____________   তারিখ: ${toBanglaDigits(paper.examDate)}`, size: 20 })],
                  }),
                ],
              }),
            ],
          }),
        ],
      })
    );
  }

  children.push(
    new Paragraph({
      spacing: { before: 180, after: 200 },
      children: [
        new TextRun({ text: 'সাধারণ নির্দেশনা: ', bold: true, size: 20 }),
        new TextRun({ text: paper.instructions, italics: true, size: 20 }),
      ],
    })
  );

  paper.items.forEach((item, index) => {
    const q = item.snapshot;
    const numBn = toBanglaDigits(index + 1);
    const marksBn = toBanglaDigits(item.customMarks);
    if (q.stimulus) {
      children.push(
        new Paragraph({
          spacing: { before: 160, after: 60 },
          children: [
            new TextRun({ text: `${numBn}. [উদ্দীপক] `, bold: true, size: 22 }),
            new TextRun({ text: q.stimulus, size: 22 }),
          ],
        })
      );
      children.push(
        new Paragraph({
          spacing: { after: 60 },
          children: [
            new TextRun({ text: q.prompt, size: 21 }),
            new TextRun({ text: `   [${marksBn} নম্বর]`, bold: true, size: 20 }),
          ],
        })
      );
    } else {
      children.push(
        new Paragraph({
          spacing: { before: 160, after: 60 },
          children: [
            new TextRun({ text: `${numBn}. `, bold: true, size: 22 }),
            new TextRun({ text: q.prompt, size: 22 }),
            new TextRun({ text: `   [${marksBn} নম্বর]`, bold: true, size: 20 }),
          ],
        })
      );
    }

    if (q.equationLatex) {
      children.push(
        new Paragraph({
          spacing: { before: 40, after: 60 },
          indent: { left: 360 },
          children: [new TextRun({ text: `সমীকরণ: ${q.equationLatex}`, font: 'Courier New', size: 20 })],
        })
      );
    }

    if (q.options && q.options.length > 0) {
      q.options.forEach((opt) => {
        children.push(
          new Paragraph({
            indent: { left: 420 },
            spacing: { after: 30 },
            children: [new TextRun({ text: `(${opt.label}) ${opt.text}`, size: 20 })],
          })
        );
      });
    }

    if (q.subParts && q.subParts.length > 0) {
      q.subParts.forEach((part) => {
        children.push(
          new Paragraph({
            indent: { left: 420 },
            spacing: { after: 40 },
            children: [
              new TextRun({ text: `${part.label}) ${part.prompt} `, size: 20 }),
              new TextRun({ text: `[${toBanglaDigits(part.marks)}]`, bold: true, size: 19 }),
            ],
          })
        );
      });
    }
  });

  if (includeAnswerKey) {
    children.push(
      new Paragraph({
        pageBreakBefore: true,
        heading: HeadingLevel.HEADING_2,
        spacing: { after: 120 },
        children: [new TextRun({ text: 'উত্তরপত্র ও নম্বর বণ্টন নির্দেশিকা', bold: true, size: 26 })],
      })
    );

    paper.items.forEach((item, index) => {
      const q = item.snapshot;
      const answerSummary =
        q.correctAnswerText ||
        (q.subParts ? q.subParts.map((sp) => `${sp.label}) ${sp.answer}`).join(' | ') : 'পাঠ্যবইয়ের নম্বর নির্দেশিকা অনুসরণ করুন।');

      children.push(
        new Paragraph({
          spacing: { after: 80 },
          children: [
            new TextRun({ text: `${toBanglaDigits(index + 1)}. উত্তর: `, bold: true, size: 20 }),
            new TextRun({ text: answerSummary, size: 20 }),
          ],
        })
      );

      if (q.explanation) {
        children.push(
          new Paragraph({
            indent: { left: 280 },
            spacing: { after: 100 },
            children: [
              new TextRun({ text: `ব্যাখ্যা: ${q.explanation}`, italics: true, size: 19 }),
            ],
          })
        );
      }
    });
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  return Packer.toBlob(doc);
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
