import test from 'node:test';
import assert from 'node:assert/strict';
import {
  appendCqSubPart,
  appendMcqOption,
  calculateCqTotalMarks,
  createDefaultCqSubParts,
  createDefaultMcqOptions,
  insertTextSnippet,
  parseQuestionTypeParam,
  relabelMcqOptions,
  removeCqSubPart,
  removeMcqOption,
  validateQuestionDraftByType,
  type QuestionDraftInput,
} from './questionFormHelpers';

function baseDraft(overrides: Partial<QuestionDraftInput> = {}): QuestionDraftInput {
  return {
    classId: 'cls-6',
    subjectId: 'sub-6-math',
    chapterId: 'ch-6-m1',
    questionTypeCode: 'short',
    language: 'bn',
    difficulty: 'medium',
    marks: 2,
    status: 'published',
    prompt: 'নমুনা প্রশ্ন?',
    stimulus: '',
    equationLatex: '',
    imageUrl: '',
    correctAnswerText: 'নমুনা উত্তর',
    options: createDefaultMcqOptions('bn'),
    subParts: createDefaultCqSubParts(),
    ...overrides,
  };
}

test('MCQ option helpers add, remove, relabel, and keep at least one correct option', () => {
  const initial = createDefaultMcqOptions('bn');
  assert.deepEqual(
    initial.map((o) => o.label),
    ['ক', 'খ', 'গ', 'ঘ']
  );

  const added = appendMcqOption(initial, 'bn');
  assert.equal(added.length, 5);
  assert.equal(added[4].label, 'ঙ');

  const enRelabeled = relabelMcqOptions(added, 'en');
  assert.deepEqual(
    enRelabeled.map((o) => o.label),
    ['A', 'B', 'C', 'D', 'E']
  );

  // Removing the first (correct) option transfers correctness to next option
  const afterRemove = removeMcqOption(enRelabeled, 0);
  assert.equal(afterRemove.length, 4);
  assert.equal(afterRemove.some((o) => o.isCorrect), true);

  // Never removes below 2 options
  const twoOpts = afterRemove.slice(0, 2);
  assert.equal(removeMcqOption(twoOpts, 0).length, 2);
});

test('CQ sub-part helpers add, remove, and sum marks accurately', () => {
  const parts = createDefaultCqSubParts();
  assert.equal(calculateCqTotalMarks(parts), 10);

  const extended = appendCqSubPart(parts);
  assert.equal(extended.length, 5);
  assert.equal(extended[4].label, 'ঙ');
  assert.equal(calculateCqTotalMarks(extended), 12);

  const reduced = removeCqSubPart(extended, 4);
  assert.equal(reduced.length, 4);
  assert.equal(calculateCqTotalMarks(reduced), 10);
});

test('insertTextSnippet inserts blanks and math symbols at cursor or end', () => {
  assert.equal(insertTextSnippet('বাংলাদেশ একটি', ' ________ '), 'বাংলাদেশ একটি ________ ');
  assert.equal(insertTextSnippet('2x + 3', '^2', 2, 2), '2x^2 + 3');
});

test('validateQuestionDraftByType enforces rules for each question type', () => {
  assert.equal(
    validateQuestionDraftByType(
      baseDraft({
        questionTypeCode: 'cq',
        stimulus: '',
      })
    ),
    'সৃজনশীল প্রশ্নের জন্য উদ্দীপক প্রদান করুন।'
  );

  assert.equal(
    validateQuestionDraftByType(
      baseDraft({
        questionTypeCode: 'fill_blank',
        correctAnswerText: '',
      })
    ),
    'শূন্যস্থান পূরণের সঠিক উত্তর লিখুন।'
  );

  assert.equal(
    validateQuestionDraftByType(
      baseDraft({
        questionTypeCode: 'math',
        equationLatex: '',
        correctAnswerText: '',
      })
    ),
    'গাণিতিক প্রশ্নের জন্য সমীকরণ অথবা সঠিক উত্তর প্রদান করুন।'
  );

  assert.equal(
    validateQuestionDraftByType(
      baseDraft({
        questionTypeCode: 'image_based',
        imageUrl: '',
      })
    ),
    'চিত্রভিত্তিক প্রশ্নের জন্য একটি চিত্র নির্বাচন বা আপলোড করুন।'
  );

  assert.equal(
    validateQuestionDraftByType(
      baseDraft({
        questionTypeCode: 'mcq',
        options: createDefaultMcqOptions('bn').map((o, idx) => ({ ...o, text: `উত্তর ${idx + 1}` })),
      })
    ),
    null
  );
});

test('parseQuestionTypeParam accepts valid codes and rejects unknown values', () => {
  const valid = ['mcq', 'cq', 'short', 'fill_blank', 'true_false', 'math', 'image_based'] as const;
  assert.equal(parseQuestionTypeParam('cq', [...valid]), 'cq');
  assert.equal(parseQuestionTypeParam('unknown', [...valid]), null);
  assert.equal(parseQuestionTypeParam(null, [...valid]), null);
});
