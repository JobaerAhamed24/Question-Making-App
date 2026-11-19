import type {
  AcademicClass,
  AcademicGroup,
  AcademicGroupCode,
  EducationLevel,
  Subject,
  SubjectCategory,
} from '../types/domain';

export const EDUCATION_LEVEL_LABELS: Record<
  EducationLevel,
  { name: string; nameBn: string; rangeLabel: string; rangeLabelBn: string }
> = {
  primary: {
    name: 'Primary',
    nameBn: 'প্রাথমিক স্তর',
    rangeLabel: 'Class 1–5',
    rangeLabelBn: 'শ্রেণি ১–৫',
  },
  secondary: {
    name: 'Secondary',
    nameBn: 'মাধ্যমিক স্তর',
    rangeLabel: 'Class 6–10',
    rangeLabelBn: 'শ্রেণি ৬–১০',
  },
  higher_secondary: {
    name: 'Higher Secondary',
    nameBn: 'উচ্চ মাধ্যমিক স্তর',
    rangeLabel: 'Class 11–12',
    rangeLabelBn: 'শ্রেণি ১১–১২',
  },
};

export const SUBJECT_CATEGORY_LABELS: Record<
  SubjectCategory,
  { name: string; nameBn: string }
> = {
  compulsory: { name: 'Compulsory', nameBn: 'আবশ্যিক' },
  group: { name: 'Group Subject', nameBn: 'বিভাগভিত্তিক' },
  optional: { name: 'Optional', nameBn: 'ঐচ্ছিক' },
  fourth: { name: 'Fourth Subject', nameBn: 'চতুর্থ বিষয়' },
};

export function inferEducationLevel(levelOrder: number): EducationLevel {
  if (levelOrder <= 5) return 'primary';
  if (levelOrder <= 10) return 'secondary';
  return 'higher_secondary';
}

const classBanglaTitles: Record<number, string> = {
  1: 'প্রথম শ্রেণি (শ্রেণি ১)',
  2: 'দ্বিতীয় শ্রেণি (শ্রেণি ২)',
  3: 'তৃতীয় শ্রেণি (শ্রেণি ৩)',
  4: 'চতুর্থ শ্রেণি (শ্রেণি ৪)',
  5: 'পঞ্চম শ্রেণি (শ্রেণি ৫)',
  6: 'ষষ্ঠ শ্রেণি (শ্রেণি ৬)',
  7: 'সপ্তম শ্রেণি (শ্রেণি ৭)',
  8: 'অষ্টম শ্রেণি (শ্রেণি ৮)',
  9: 'নবম শ্রেণি (শ্রেণি ৯)',
  10: 'দশম শ্রেণি (শ্রেণি ১০)',
  11: 'একাদশ শ্রেণি (শ্রেণি ১১)',
  12: 'দ্বাদশ শ্রেণি (শ্রেণি ১২)',
};

export const NCTB_CLASSES: AcademicClass[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(
  (levelOrder) => ({
    id: `cls-${levelOrder}`,
    name: `Class ${levelOrder}`,
    nameBn: classBanglaTitles[levelOrder] ?? `শ্রেণি ${levelOrder}`,
    slug: `class-${levelOrder}`,
    levelOrder,
    educationLevel: inferEducationLevel(levelOrder),
    hasGroups: levelOrder >= 9,
    isActive: true,
  })
);

export const NCTB_GROUPS: AcademicGroup[] = [
  // Class 9 Groups (preserving existing IDs grp-science, grp-commerce, grp-arts)
  { id: 'grp-science', classId: 'cls-9', code: 'science', name: 'Science', nameBn: 'বিজ্ঞান', isActive: true },
  { id: 'grp-arts', classId: 'cls-9', code: 'humanities', name: 'Humanities / Arts', nameBn: 'মানবিক', isActive: true },
  { id: 'grp-commerce', classId: 'cls-9', code: 'business', name: 'Business Studies / Commerce', nameBn: 'ব্যবসায় শিক্ষা', isActive: true },

  // Class 10 Groups (preserving grp-science-10)
  { id: 'grp-science-10', classId: 'cls-10', code: 'science', name: 'Science', nameBn: 'বিজ্ঞান', isActive: true },
  { id: 'grp-arts-10', classId: 'cls-10', code: 'humanities', name: 'Humanities / Arts', nameBn: 'মানবিক', isActive: true },
  { id: 'grp-commerce-10', classId: 'cls-10', code: 'business', name: 'Business Studies / Commerce', nameBn: 'ব্যবসায় শিক্ষা', isActive: true },

  // Class 11 Groups
  { id: 'grp-science-11', classId: 'cls-11', code: 'science', name: 'Science', nameBn: 'বিজ্ঞান', isActive: true },
  { id: 'grp-arts-11', classId: 'cls-11', code: 'humanities', name: 'Humanities / Arts', nameBn: 'মানবিক', isActive: true },
  { id: 'grp-commerce-11', classId: 'cls-11', code: 'business', name: 'Business Studies / Commerce', nameBn: 'ব্যবসায় শিক্ষা', isActive: true },

  // Class 12 Groups
  { id: 'grp-science-12', classId: 'cls-12', code: 'science', name: 'Science', nameBn: 'বিজ্ঞান', isActive: true },
  { id: 'grp-arts-12', classId: 'cls-12', code: 'humanities', name: 'Humanities / Arts', nameBn: 'মানবিক', isActive: true },
  { id: 'grp-commerce-12', classId: 'cls-12', code: 'business', name: 'Business Studies / Commerce', nameBn: 'ব্যবসায় শিক্ষা', isActive: true },
];

function groupIdFor(level: 9 | 10 | 11 | 12, code: AcademicGroupCode): string {
  if (level === 9) {
    if (code === 'science') return 'grp-science';
    if (code === 'humanities') return 'grp-arts';
    return 'grp-commerce';
  }
  if (code === 'science') return `grp-science-${level}`;
  if (code === 'humanities') return `grp-arts-${level}`;
  return `grp-commerce-${level}`;
}

function buildPrimarySubjects(): Subject[] {
  const result: Subject[] = [];

  for (const level of [1, 2] as const) {
    const classId = `cls-${level}`;
    result.push(
      { id: `sub-${level}-bangla`, classId, category: 'compulsory', name: 'Amar Bangla Boi', nameBn: 'আমার বাংলা বই', code: `BAN-${level}`, isActive: true },
      { id: `sub-${level}-english`, classId, category: 'compulsory', name: 'English for Today', nameBn: 'English for Today (ইংরেজি)', code: `ENG-${level}`, isActive: true },
      { id: `sub-${level}-math`, classId, category: 'compulsory', name: 'Elementary Mathematics', nameBn: 'প্রাথমিক গণিত', code: `MATH-${level}`, isActive: true }
    );
  }

  for (const level of [3, 4, 5] as const) {
    const classId = `cls-${level}`;
    result.push(
      { id: `sub-${level}-bangla`, classId, category: 'compulsory', name: 'Amar Bangla Boi', nameBn: 'আমার বাংলা বই', code: `BAN-${level}`, isActive: true },
      { id: `sub-${level}-english`, classId, category: 'compulsory', name: 'English for Today', nameBn: 'English for Today (ইংরেজি)', code: `ENG-${level}`, isActive: true },
      { id: `sub-${level}-math`, classId, category: 'compulsory', name: 'Elementary Mathematics', nameBn: 'প্রাথমিক গণিত', code: `MATH-${level}`, isActive: true },
      { id: `sub-${level}-science`, classId, category: 'compulsory', name: 'Elementary Science', nameBn: 'প্রাথমিক বিজ্ঞান', code: `SCI-${level}`, isActive: true },
      { id: `sub-${level}-bgs`, classId, category: 'compulsory', name: 'Bangladesh and Global Studies', nameBn: 'বাংলাদেশ ও বিশ্বপরিচয়', code: `BGS-${level}`, isActive: true },
      { id: `sub-${level}-religion`, classId, category: 'compulsory', name: 'Religion and Moral Education', nameBn: 'ধর্ম ও নৈতিক শিক্ষা', code: `REL-${level}`, isActive: true }
    );
  }

  return result;
}

function buildJuniorSecondarySubjects(): Subject[] {
  const result: Subject[] = [];
  for (const level of [6, 7, 8] as const) {
    const classId = `cls-${level}`;
    // Preserve exact legacy IDs: sub-{level}-math, sub-{level}-science, sub-{level}-english
    result.push(
      { id: `sub-${level}-bangla`, classId, category: 'compulsory', name: 'Bangla (1st & 2nd Paper)', nameBn: 'বাংলা (প্রথম ও দ্বিতীয় পত্র)', code: `BAN-${level}`, isActive: true },
      { id: `sub-${level}-english`, classId, category: 'compulsory', name: 'English (1st & 2nd Paper)', nameBn: 'ইংরেজি (প্রথম ও দ্বিতীয় পত্র)', code: `ENG-${level}`, isActive: true },
      { id: `sub-${level}-math`, classId, category: 'compulsory', name: 'Mathematics', nameBn: 'গণিত', code: `MATH-${level}`, isActive: true },
      { id: `sub-${level}-science`, classId, category: 'compulsory', name: 'General Science', nameBn: 'সাধারণ বিজ্ঞান', code: `SCI-${level}`, isActive: true },
      { id: `sub-${level}-bgs`, classId, category: 'compulsory', name: 'Bangladesh and Global Studies', nameBn: 'বাংলাদেশ ও বিশ্বপরিচয়', code: `BGS-${level}`, isActive: true },
      { id: `sub-${level}-ict`, classId, category: 'compulsory', name: 'Information and Communication Technology', nameBn: 'তথ্য ও যোগাযোগ প্রযুক্তি', code: `ICT-${level}`, isActive: true },
      { id: `sub-${level}-religion`, classId, category: 'compulsory', name: 'Religion and Moral Education', nameBn: 'ধর্ম ও নৈতিক শিক্ষা', code: `REL-${level}`, isActive: true },
      { id: `sub-${level}-agri`, classId, category: 'optional', name: 'Agriculture Studies', nameBn: 'কৃষি শিক্ষা', code: `AGR-${level}`, isActive: true },
      { id: `sub-${level}-home`, classId, category: 'optional', name: 'Home Science', nameBn: 'গার্হস্থ্য বিজ্ঞান', code: `HOM-${level}`, isActive: true },
      { id: `sub-${level}-work`, classId, category: 'optional', name: 'Work and Life Oriented Education', nameBn: 'কর্ম ও জীবনমুখী শিক্ষা', code: `WLO-${level}`, isActive: true }
    );
  }
  return result;
}

function buildSscSubjects(): Subject[] {
  const result: Subject[] = [];
  for (const level of [9, 10] as const) {
    const classId = `cls-${level}`;
    const gSci = groupIdFor(level, 'science');
    const gArt = groupIdFor(level, 'humanities');
    const gBus = groupIdFor(level, 'business');

    // Common compulsory for all 3 groups (groupId: null)
    result.push(
      { id: `sub-${level}-bangla`, classId, groupId: null, category: 'compulsory', name: 'Bangla', nameBn: 'বাংলা (১ম ও ২য় পত্র)', code: '101-102', isActive: true },
      { id: `sub-${level}-english`, classId, groupId: null, category: 'compulsory', name: 'English', nameBn: 'ইংরেজি (১ম ও ২য় পত্র)', code: '107-108', isActive: true },
      { id: `sub-${level}-math`, classId, groupId: null, category: 'compulsory', name: 'Mathematics', nameBn: 'গণিত', code: '109', isActive: true },
      { id: `sub-${level}-ict`, classId, groupId: null, category: 'compulsory', name: 'Information and Communication Technology', nameBn: 'তথ্য ও যোগাযোগ প্রযুক্তি', code: '154', isActive: true },
      { id: `sub-${level}-religion`, classId, groupId: null, category: 'compulsory', name: 'Religion and Moral Education', nameBn: 'ধর্ম ও নৈতিক শিক্ষা', code: '111-114', isActive: true },

      // Science-compulsory board subject & Science Group subjects
      { id: `sub-${level}-bgs`, classId, groupId: gSci, groupIds: [gSci], category: 'compulsory', name: 'Bangladesh and Global Studies', nameBn: 'বাংলাদেশ ও বিশ্বপরিচয়', code: '150', isActive: true },
      { id: `sub-${level}-physics`, classId, groupId: gSci, groupIds: [gSci], category: 'group', name: 'Physics', nameBn: 'পদার্থবিজ্ঞান', code: '136', isActive: true },
      { id: `sub-${level}-chemistry`, classId, groupId: gSci, groupIds: [gSci], category: 'group', name: 'Chemistry', nameBn: 'রসায়ন', code: '137', isActive: true },
      { id: `sub-${level}-biology`, classId, groupId: gSci, groupIds: [gSci], category: 'group', name: 'Biology', nameBn: 'জীববিজ্ঞান', code: '138', isActive: true },
      { id: `sub-${level}-hmath`, classId, groupId: gSci, groupIds: [gSci], category: 'fourth', name: 'Higher Mathematics', nameBn: 'উচ্চতর গণিত', code: '126', isActive: true },

      // General Science (Compulsory for Humanities & Business Studies; keep legacy id sub-{level}-science)
      { id: `sub-${level}-science`, classId, groupId: gArt, groupIds: [gArt, gBus], category: 'compulsory', name: 'General Science', nameBn: 'সাধারণ বিজ্ঞান', code: '127', isActive: true },

      // Humanities Group Subjects
      { id: `sub-${level}-history`, classId, groupId: gArt, groupIds: [gArt], category: 'group', name: 'History of Bangladesh and World Civilization', nameBn: 'বাংলাদেশের ইতিহাস ও বিশ্বসভ্যতা', code: '153', isActive: true },
      { id: `sub-${level}-geography`, classId, groupId: gArt, groupIds: [gArt], category: 'group', name: 'Geography and Environment', nameBn: 'ভূগোল ও পরিবেশ', code: '110', isActive: true },
      { id: `sub-${level}-economics`, classId, groupId: gArt, groupIds: [gArt], category: 'group', name: 'Economics', nameBn: 'অর্থনীতি', code: '141', isActive: true },
      { id: `sub-${level}-civics`, classId, groupId: gArt, groupIds: [gArt], category: 'group', name: 'Civics and Citizenship', nameBn: 'পৌরনীতি ও নাগরিকতা', code: '140', isActive: true },

      // Business Studies Group Subjects
      { id: `sub-${level}-accounting`, classId, groupId: gBus, groupIds: [gBus], category: 'group', name: 'Accounting', nameBn: 'হিসাববিজ্ঞান', code: '146', isActive: true },
      { id: `sub-${level}-finance`, classId, groupId: gBus, groupIds: [gBus], category: 'group', name: 'Finance and Banking', nameBn: 'ফিন্যান্স ও ব্যাংকিং', code: '152', isActive: true },
      { id: `sub-${level}-business-ent`, classId, groupId: gBus, groupIds: [gBus], category: 'group', name: 'Business Entrepreneurship', nameBn: 'ব্যবসায় উদ্যোগ', code: '143', isActive: true },

      // Cross-group Fourth & Optional Subjects (Class 9-10)
      { id: `sub-${level}-agri`, classId, groupId: null, groupIds: [gSci, gArt, gBus], category: 'fourth', name: 'Agriculture Studies', nameBn: 'কৃষি শিক্ষা', code: '134', isActive: true },
      { id: `sub-${level}-home-sci`, classId, groupId: null, groupIds: [gSci, gArt, gBus], category: 'optional', name: 'Home Science', nameBn: 'গার্হস্থ্য বিজ্ঞান', code: '151', isActive: true }
    );
  }
  return result;
}

function buildHscSubjects(): Subject[] {
  const result: Subject[] = [];
  for (const level of [11, 12] as const) {
    const classId = `cls-${level}`;
    const gSci = groupIdFor(level, 'science');
    const gArt = groupIdFor(level, 'humanities');
    const gBus = groupIdFor(level, 'business');

    // Common Compulsory across all 3 HSC groups
    result.push(
      { id: `sub-${level}-bangla`, classId, groupId: null, category: 'compulsory', name: 'Bangla (1st & 2nd Paper)', nameBn: 'বাংলা (১ম ও ২য় পত্র)', code: '101-102', isActive: true },
      { id: `sub-${level}-english`, classId, groupId: null, category: 'compulsory', name: 'English (1st & 2nd Paper)', nameBn: 'ইংরেজি (১ম ও ২য় পত্র)', code: '107-108', isActive: true },
      { id: `sub-${level}-ict`, classId, groupId: null, category: 'compulsory', name: 'Information and Communication Technology', nameBn: 'তথ্য ও যোগাযোগ প্রযুক্তি', code: '275', isActive: true },

      // HSC Science Group
      { id: `sub-${level}-physics`, classId, groupId: gSci, groupIds: [gSci], category: 'group', name: 'Physics', nameBn: 'পদার্থবিজ্ঞান (১ম ও ২য় পত্র)', code: '174-175', isActive: true },
      { id: `sub-${level}-chemistry`, classId, groupId: gSci, groupIds: [gSci], category: 'group', name: 'Chemistry', nameBn: 'রসায়ন (১ম ও ২য় পত্র)', code: '176-177', isActive: true },
      { id: `sub-${level}-biology`, classId, groupId: gSci, groupIds: [gSci], category: 'group', name: 'Biology', nameBn: 'জীববিজ্ঞান (১ম ও ২য় পত্র)', code: '178-179', isActive: true },
      { id: `sub-${level}-hmath`, classId, groupId: gSci, groupIds: [gSci], category: 'fourth', name: 'Higher Mathematics', nameBn: 'উচ্চতর গণিত (১ম ও ২য় পত্র)', code: '265-266', isActive: true },
      { id: `sub-${level}-stats-sci`, classId, groupId: gSci, groupIds: [gSci, gBus], category: 'fourth', name: 'Statistics', nameBn: 'পরিসংখ্যান', code: '129-130', isActive: true },

      // HSC Humanities / Arts Group
      { id: `sub-${level}-economics`, classId, groupId: gArt, groupIds: [gArt, gBus], category: 'group', name: 'Economics', nameBn: 'অর্থনীতি (১ম ও ২য় পত্র)', code: '109-110', isActive: true },
      { id: `sub-${level}-civics`, classId, groupId: gArt, groupIds: [gArt], category: 'group', name: 'Civics and Good Governance', nameBn: 'পৌরনীতি ও সুশাসন', code: '269-270', isActive: true },
      { id: `sub-${level}-history`, classId, groupId: gArt, groupIds: [gArt], category: 'group', name: 'History', nameBn: 'ইতিহাস (১ম ও ২য় পত্র)', code: '304-305', isActive: true },
      { id: `sub-${level}-islamic-history`, classId, groupId: gArt, groupIds: [gArt], category: 'group', name: 'Islamic History and Culture', nameBn: 'ইসলামের ইতিহাস ও সংস্কৃতি', code: '267-268', isActive: true },
      { id: `sub-${level}-sociology`, classId, groupId: gArt, groupIds: [gArt], category: 'group', name: 'Sociology', nameBn: 'সমাজবিজ্ঞান (১ম ও ২য় পত্র)', code: '117-118', isActive: true },
      { id: `sub-${level}-logic`, classId, groupId: gArt, groupIds: [gArt], category: 'group', name: 'Logic', nameBn: 'যুক্তিবিদ্যা (১ম ও ২য় পত্র)', code: '121-122', isActive: true },
      { id: `sub-${level}-geography`, classId, groupId: gArt, groupIds: [gArt], category: 'fourth', name: 'Geography', nameBn: 'ভূগোল (১ম ও ২য় পত্র)', code: '125-126', isActive: true },
      { id: `sub-${level}-social-work`, classId, groupId: gArt, groupIds: [gArt], category: 'optional', name: 'Social Work', nameBn: 'সমাজকর্ম', code: '271-272', isActive: true },

      // HSC Business Studies / Commerce Group
      { id: `sub-${level}-accounting`, classId, groupId: gBus, groupIds: [gBus], category: 'group', name: 'Accounting', nameBn: 'হিসাববিজ্ঞান (১ম ও ২য় পত্র)', code: '253-254', isActive: true },
      { id: `sub-${level}-bom`, classId, groupId: gBus, groupIds: [gBus], category: 'group', name: 'Business Organization and Management', nameBn: 'ব্যবসায় সংগঠন ও ব্যবস্থাপনা', code: '277-278', isActive: true },
      { id: `sub-${level}-fbi`, classId, groupId: gBus, groupIds: [gBus], category: 'group', name: 'Finance, Banking and Insurance', nameBn: 'ফিন্যান্স, ব্যাংকিং ও বিমা', code: '292-293', isActive: true },
      { id: `sub-${level}-pmm`, classId, groupId: gBus, groupIds: [gBus], category: 'group', name: 'Production Management and Marketing', nameBn: 'উৎপাদন ব্যবস্থাপনা ও বিপণন', code: '286-287', isActive: true },

      // HSC Optional / Fourth Subjects
      { id: `sub-${level}-agri`, classId, groupId: null, groupIds: [gSci, gArt, gBus], category: 'fourth', name: 'Agriculture Education', nameBn: 'কৃষি শিক্ষা', code: '239-240', isActive: true },
      { id: `sub-${level}-psychology`, classId, groupId: null, groupIds: [gSci, gArt], category: 'optional', name: 'Psychology', nameBn: 'মনোবিজ্ঞান', code: '123-124', isActive: true }
    );
  }
  return result;
}

export const NCTB_SUBJECTS: Subject[] = [
  ...buildPrimarySubjects(),
  ...buildJuniorSecondarySubjects(),
  ...buildSscSubjects(),
  ...buildHscSubjects(),
];

/**
 * Helper to retrieve combined subjects for a class and optional group.
 * - For Classes 1–8 (hasGroups = false), returns all subjects for that class regardless of groupId.
 * - For Classes 9–12 (hasGroups = true), combines common compulsory subjects (no specific group)
 *   with group-specific, optional, and fourth subjects assigned to the selected groupId.
 */
export function getSubjectsForClassAndGroup(
  allSubjects: Subject[],
  cls: AcademicClass | undefined,
  selectedGroupId?: string | null,
  includeInactive = false
): Subject[] {
  if (!cls) return [];
  const base = allSubjects.filter(
    (s) => s.classId === cls.id && (includeInactive || s.isActive)
  );
  if (!cls.hasGroups || !selectedGroupId) {
    return base;
  }
  return base.filter((s) => {
    const hasSpecificGroups =
      (s.groupIds && s.groupIds.length > 0) || Boolean(s.groupId);
    if (!hasSpecificGroups) return true; // Common across all groups
    if (s.groupIds && s.groupIds.length > 0) {
      return s.groupIds.includes(selectedGroupId);
    }
    return s.groupId === selectedGroupId;
  });
}

export function subjectBelongsToGroup(subject: Subject, groupId: string | null): boolean {
  const hasSpecificGroups =
    (subject.groupIds && subject.groupIds.length > 0) || Boolean(subject.groupId);
  if (!groupId) return !hasSpecificGroups;
  if (!hasSpecificGroups) return true;
  if (subject.groupIds && subject.groupIds.length > 0) {
    return subject.groupIds.includes(groupId);
  }
  return subject.groupId === groupId;
}

/**
 * Prevents duplicate subjects within the same class and group scope.
 */
export function findDuplicateSubject(
  existingSubjects: Subject[],
  candidate: {
    id?: string;
    classId: string;
    groupId?: string | null;
    groupIds?: string[];
    name: string;
    nameBn: string;
    code: string;
  }
): Subject | undefined {
  const normEn = candidate.name.trim().toLowerCase();
  const normBn = candidate.nameBn.trim().toLowerCase();
  const normCode = candidate.code.trim().toLowerCase();

  const candidateGroups =
    candidate.groupIds && candidate.groupIds.length > 0
      ? candidate.groupIds
      : candidate.groupId
      ? [candidate.groupId]
      : [];

  return existingSubjects.find((s) => {
    if (candidate.id && s.id === candidate.id) return false;
    if (s.classId !== candidate.classId) return false;

    const existingGroups =
      s.groupIds && s.groupIds.length > 0
        ? s.groupIds
        : s.groupId
        ? [s.groupId]
        : [];

    // Overlap occurs if either is common (empty group list) or they share any groupId
    const groupsOverlap =
      candidateGroups.length === 0 ||
      existingGroups.length === 0 ||
      candidateGroups.some((g) => existingGroups.includes(g));

    if (!groupsOverlap) return false;

    const sameName =
      (normEn && s.name.trim().toLowerCase() === normEn) ||
      (normBn && s.nameBn.trim().toLowerCase() === normBn);
    const sameCode = normCode && normCode !== 'SUB' && s.code.trim().toLowerCase() === normCode;
    return sameName || sameCode;
  });
}

export interface ClassDisplayCard {
  id: string;
  primaryClass: AcademicClass;
  memberClassIds: string[];
  name: string;
  nameBn: string;
  educationLevel: EducationLevel;
  hasGroups: boolean;
  levelOrder: number;
}

/**
 * Merges Class 9 & Class 10 into a single SSC card (Class 9–10) and
 * Class 11 & Class 12 into a single HSC card (Class 11–12) for card views,
 * while keeping individual class IDs intact for question bank, plans, and exams.
 */
export function buildClassDisplayCards(classes: AcademicClass[]): ClassDisplayCard[] {
  const sorted = classes
    .filter((c) => c.isActive)
    .slice()
    .sort((a, b) => a.levelOrder - b.levelOrder);

  const cards: ClassDisplayCard[] = [];
  const consumedIds = new Set<string>();

  for (const cls of sorted) {
    if (consumedIds.has(cls.id)) continue;

    if (cls.levelOrder === 9) {
      const cls10 = sorted.find((c) => c.levelOrder === 10);
      if (cls10) {
        consumedIds.add(cls.id);
        consumedIds.add(cls10.id);
        cards.push({
          id: 'card-9-10',
          primaryClass: cls,
          memberClassIds: [cls.id, cls10.id],
          name: 'Class 9–10 (SSC)',
          nameBn: 'নবম–দশম শ্রেণি (শ্রেণি ৯–১০)',
          educationLevel: cls.educationLevel || 'secondary',
          hasGroups: cls.hasGroups || cls10.hasGroups,
          levelOrder: 9,
        });
        continue;
      }
    }

    if (cls.levelOrder === 11) {
      const cls12 = sorted.find((c) => c.levelOrder === 12);
      if (cls12) {
        consumedIds.add(cls.id);
        consumedIds.add(cls12.id);
        cards.push({
          id: 'card-11-12',
          primaryClass: cls,
          memberClassIds: [cls.id, cls12.id],
          name: 'Class 11–12 (HSC)',
          nameBn: 'একাদশ–দ্বাদশ শ্রেণি (শ্রেণি ১১–১২)',
          educationLevel: cls.educationLevel || 'higher_secondary',
          hasGroups: cls.hasGroups || cls12.hasGroups,
          levelOrder: 11,
        });
        continue;
      }
    }

    consumedIds.add(cls.id);
    cards.push({
      id: cls.id,
      primaryClass: cls,
      memberClassIds: [cls.id],
      name: cls.name,
      nameBn: cls.nameBn,
      educationLevel: cls.educationLevel || inferEducationLevel(cls.levelOrder),
      hasGroups: cls.hasGroups,
      levelOrder: cls.levelOrder,
    });
  }

  return cards;
}

