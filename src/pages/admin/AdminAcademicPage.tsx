import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Edit, Eye, EyeOff, Plus, Search, Trash2, X } from 'lucide-react';
import {
  Button,
  Card,
  ConfirmDialog,
  FormField,
  Input,
  Select,
  StatusTag,
} from '../../components/ui/Primitives';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import {
  EDUCATION_LEVEL_LABELS,
  getSubjectsForClassAndGroup,
  inferEducationLevel,
  SUBJECT_CATEGORY_LABELS,
} from '../../data/curriculumData';
import { toBanglaDigits } from '../../lib/bn';
import { questionBankService } from '../../services/questionBankService';
import type {
  AcademicGroupCode,
  EducationLevel,
  Subject,
  SubjectCategory,
} from '../../types/domain';

type TabKey = 'classes' | 'groups' | 'subjects' | 'chapters' | 'topics' | 'types';

const CATEGORY_TAG_CLASSES: Record<SubjectCategory, string> = {
  compulsory: 'border-[#D4A853]/45 bg-[#D4A853]/12 text-[#EAC779]',
  group: 'border-sky-400/40 bg-sky-950/50 text-sky-200',
  optional: 'border-emerald-400/40 bg-emerald-950/45 text-emerald-200',
  fourth: 'border-amber-400/40 bg-amber-950/45 text-amber-200',
};

export function AdminAcademicPage() {
  const { user, revision, bumpRevision } = useAuth();
  const { pushToast } = useToast();
  const [tab, setTab] = useState<TabKey>('subjects');

  const catalogue = useMemo(
    () => questionBankService.getAcademicCatalogue(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [revision]
  );

  // Class form state
  const [clsName, setClsName] = useState('');
  const [clsNameBn, setClsNameBn] = useState('');
  const [clsOrder, setClsOrder] = useState(13);
  const [clsEduLevel, setClsEduLevel] = useState<EducationLevel>('higher_secondary');
  const [clsHasGroups, setClsHasGroups] = useState(false);

  // Group form state
  const [grpClassId, setGrpClassId] = useState(
    catalogue.classes.find((c) => c.hasGroups)?.id || 'cls-9'
  );
  const [grpCode, setGrpCode] = useState<AcademicGroupCode>('science');
  const [grpName, setGrpName] = useState('');
  const [grpNameBn, setGrpNameBn] = useState('');

  // Subject filter state
  const [subFilterClassId, setSubFilterClassId] = useState<string>('all');
  const [subFilterGroupId, setSubFilterGroupId] = useState<string>('all');
  const [subFilterCategory, setSubFilterCategory] = useState<'all' | SubjectCategory>('all');
  const [subSearch, setSubSearch] = useState('');

  // Subject add/edit form state
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [subClassId, setSubClassId] = useState<string>('cls-9');
  const [subCommonAllGroups, setSubCommonAllGroups] = useState<boolean>(false);
  const [subSelectedGroupIds, setSubSelectedGroupIds] = useState<string[]>(['grp-science']);
  const [subCategory, setSubCategory] = useState<SubjectCategory>('group');
  const [subName, setSubName] = useState('');
  const [subNameBn, setSubNameBn] = useState('');
  const [subCode, setSubCode] = useState('');
  const [subIsActive, setSubIsActive] = useState(true);
  const [deleteSubjectTarget, setDeleteSubjectTarget] = useState<Subject | null>(null);

  // Chapter form state
  const [chSubId, setChSubId] = useState(catalogue.subjects[0]?.id || '');
  const [chNum, setChNum] = useState(1);
  const [chName, setChName] = useState('');
  const [chNameBn, setChNameBn] = useState('');

  // Topic form state
  const [topChId, setTopChId] = useState(catalogue.chapters[0]?.id || '');
  const [topName, setTopName] = useState('');
  const [topNameBn, setTopNameBn] = useState('');

  if (!user || user.role !== 'admin') return null;

  const sortedClasses = catalogue.classes
    .slice()
    .sort((a, b) => a.levelOrder - b.levelOrder);

  const selectedFormClass = sortedClasses.find((c) => c.id === subClassId);
  const formClassGroups = selectedFormClass?.hasGroups
    ? catalogue.groups.filter((g) => g.classId === selectedFormClass.id)
    : [];

  const filterClassObj =
    subFilterClassId !== 'all'
      ? sortedClasses.find((c) => c.id === subFilterClassId)
      : undefined;
  const filterClassGroups = filterClassObj?.hasGroups
    ? catalogue.groups.filter((g) => g.classId === filterClassObj.id)
    : [];

  const filteredSubjects = useMemo(() => {
    let base: Subject[];
    if (filterClassObj) {
      base = getSubjectsForClassAndGroup(
        catalogue.subjects,
        filterClassObj,
        subFilterGroupId !== 'all' ? subFilterGroupId : null,
        true
      );
    } else {
      base = catalogue.subjects;
    }

    const q = subSearch.trim().toLowerCase();
    return base.filter((s) => {
      if (subFilterCategory !== 'all' && (s.category || 'compulsory') !== subFilterCategory) {
        return false;
      }
      if (q) {
        const hay = `${s.nameBn} ${s.name} ${s.code}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [
    catalogue.subjects,
    filterClassObj,
    subFilterGroupId,
    subFilterCategory,
    subSearch,
  ]);

  const tabs: Array<{ key: TabKey; label: string; count: number }> = [
    { key: 'subjects', label: 'বিষয় ব্যবস্থাপনা', count: catalogue.subjects.length },
    { key: 'classes', label: 'শ্রেণিসমূহ (১–১২)', count: catalogue.classes.length },
    { key: 'groups', label: 'বিভাগসমূহ (৯–১২)', count: catalogue.groups.length },
    { key: 'chapters', label: 'অধ্যায়সমূহ', count: catalogue.chapters.length },
    { key: 'topics', label: 'টপিকসমূহ', count: catalogue.topics.length },
    { key: 'types', label: 'প্রশ্নের ধরন', count: catalogue.questionTypes.length },
  ];

  const handleAddClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clsName.trim() && !clsNameBn.trim()) return;
    const en = clsName.trim() || clsNameBn.trim();
    const bn = clsNameBn.trim() || clsName.trim();
    questionBankService.adminAddClass(user, {
      name: en,
      nameBn: bn,
      slug: en.toLowerCase().replace(/\s+/g, '-'),
      levelOrder: clsOrder,
      educationLevel: clsEduLevel,
      hasGroups: clsHasGroups,
      isActive: true,
    });
    setClsName('');
    setClsNameBn('');
    bumpRevision();
    pushToast({ title: 'নতুন শ্রেণি যুক্ত হয়েছে', variant: 'success' });
  };

  const handleToggleClassActive = (classId: string, nextActive: boolean) => {
    questionBankService.adminToggleClassStatus(user, classId, nextActive);
    bumpRevision();
    pushToast({
      title: nextActive ? 'শ্রেণি সক্রিয় করা হয়েছে' : 'শ্রেণি নিষ্ক্রিয় করা হয়েছে',
      variant: 'info',
    });
  };

  const handleAddGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!grpName.trim() && !grpNameBn.trim()) return;
    questionBankService.adminAddGroup(user, {
      classId: grpClassId,
      code: grpCode,
      name: grpName.trim() || grpNameBn.trim(),
      nameBn: grpNameBn.trim() || grpName.trim(),
      isActive: true,
    });
    setGrpName('');
    setGrpNameBn('');
    bumpRevision();
    pushToast({ title: 'নতুন বিভাগ যুক্ত হয়েছে', variant: 'success' });
  };

  const resetSubjectForm = () => {
    setEditingSubjectId(null);
    setSubName('');
    setSubNameBn('');
    setSubCode('');
    setSubIsActive(true);
  };

  const handleSubClassChange = (nextClassId: string) => {
    setSubClassId(nextClassId);
    const targetCls = sortedClasses.find((c) => c.id === nextClassId);
    if (targetCls?.hasGroups) {
      const firstGrp = catalogue.groups.find((g) => g.classId === nextClassId);
      setSubSelectedGroupIds(firstGrp ? [firstGrp.id] : []);
      setSubCommonAllGroups(false);
    } else {
      setSubSelectedGroupIds([]);
      setSubCommonAllGroups(true);
      if (subCategory === 'group') setSubCategory('compulsory');
    }
  };

  const handleToggleFormGroup = (groupId: string) => {
    setSubCommonAllGroups(false);
    setSubSelectedGroupIds((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );
  };

  const handleEditSubject = (sub: Subject) => {
    setEditingSubjectId(sub.id);
    setSubClassId(sub.classId);
    setSubName(sub.name);
    setSubNameBn(sub.nameBn);
    setSubCode(sub.code);
    setSubCategory(sub.category || 'compulsory');
    setSubIsActive(sub.isActive);

    const cls = sortedClasses.find((c) => c.id === sub.classId);
    if (cls?.hasGroups) {
      const ids =
        sub.groupIds && sub.groupIds.length > 0
          ? sub.groupIds
          : sub.groupId
          ? [sub.groupId]
          : [];
      if (ids.length === 0) {
        setSubCommonAllGroups(true);
        setSubSelectedGroupIds([]);
      } else {
        setSubCommonAllGroups(false);
        setSubSelectedGroupIds(ids);
      }
    } else {
      setSubCommonAllGroups(true);
      setSubSelectedGroupIds([]);
    }
  };

  const handleSaveSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subName.trim() && !subNameBn.trim()) {
      pushToast({ title: 'বিষয়ের নাম প্রদান করুন', variant: 'error' });
      return;
    }

    const cls = sortedClasses.find((c) => c.id === subClassId);
    let resolvedGroupId: string | null = null;
    let resolvedGroupIds: string[] | undefined = undefined;

    if (cls?.hasGroups && !subCommonAllGroups) {
      if (subSelectedGroupIds.length === 0) {
        pushToast({
          title: 'কমপক্ষে একটি বিভাগ নির্বাচন করুন অথবা "সকল বিভাগ" নির্বাচন করুন',
          variant: 'error',
        });
        return;
      }
      resolvedGroupId = subSelectedGroupIds[0];
      resolvedGroupIds = [...subSelectedGroupIds];
    }

    const payload = {
      classId: subClassId,
      groupId: resolvedGroupId,
      groupIds: resolvedGroupIds,
      category: subCategory,
      name: subName.trim() || subNameBn.trim(),
      nameBn: subNameBn.trim() || subName.trim(),
      code: subCode.trim().toUpperCase() || 'SUB',
      isActive: subIsActive,
    };

    try {
      if (editingSubjectId) {
        questionBankService.adminUpdateSubject(user, {
          id: editingSubjectId,
          ...payload,
        });
        pushToast({ title: 'বিষয়ের তথ্য হালনাগাদ হয়েছে', variant: 'success' });
      } else {
        questionBankService.adminAddSubject(user, payload);
        pushToast({ title: 'নতুন বিষয় যুক্ত হয়েছে', variant: 'success' });
      }
      resetSubjectForm();
      bumpRevision();
    } catch (err) {
      pushToast({
        title: 'ডুপ্লিকেট বিষয় অনুমোদিত নয়',
        description: err instanceof Error ? err.message : 'একই শ্রেণি ও বিভাগে বিষয়টি রয়েছে।',
        variant: 'error',
      });
    }
  };

  const handleToggleSubjectActive = (sub: Subject) => {
    try {
      questionBankService.adminUpdateSubject(user, {
        ...sub,
        isActive: !sub.isActive,
      });
      bumpRevision();
      pushToast({
        title: !sub.isActive ? 'বিষয় সক্রিয় করা হয়েছে' : 'বিষয় নিষ্ক্রিয় করা হয়েছে',
        variant: 'info',
      });
    } catch (err) {
      pushToast({
        title: 'আপডেট ব্যর্থ হয়েছে',
        description: err instanceof Error ? err.message : undefined,
        variant: 'error',
      });
    }
  };

  const handleConfirmDeleteSubject = () => {
    if (!deleteSubjectTarget) return;
    questionBankService.adminDeleteSubject(user, deleteSubjectTarget.id);
    if (editingSubjectId === deleteSubjectTarget.id) resetSubjectForm();
    setDeleteSubjectTarget(null);
    bumpRevision();
    pushToast({ title: 'বিষয় মুছে ফেলা হয়েছে', variant: 'info' });
  };

  const handleAddChapter = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!chName.trim() && !chNameBn.trim()) || !chSubId) return;
    questionBankService.adminAddChapter(user, {
      subjectId: chSubId,
      chapterNumber: chNum,
      name: chName.trim() || chNameBn.trim(),
      nameBn: chNameBn.trim() || chName.trim(),
      isActive: true,
    });
    setChName('');
    setChNameBn('');
    bumpRevision();
    pushToast({ title: 'নতুন অধ্যায় যুক্ত হয়েছে', variant: 'success' });
  };

  const handleAddTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!topName.trim() && !topNameBn.trim()) || !topChId) return;
    questionBankService.adminAddTopic(user, {
      chapterId: topChId,
      name: topName.trim() || topNameBn.trim(),
      nameBn: topNameBn.trim() || topName.trim(),
      isActive: true,
    });
    setTopName('');
    setTopNameBn('');
    bumpRevision();
    pushToast({ title: 'নতুন টপিক যুক্ত হয়েছে', variant: 'success' });
  };

  const getSubjectGroupSummary = (s: Subject) => {
    const cls = sortedClasses.find((c) => c.id === s.classId);
    if (!cls?.hasGroups) return 'সাধারণ';
    const ids =
      s.groupIds && s.groupIds.length > 0 ? s.groupIds : s.groupId ? [s.groupId] : [];
    if (ids.length === 0) return 'সকল বিভাগ (সাধারণ)';
    return ids
      .map((gid) => catalogue.groups.find((g) => g.id === gid)?.nameBn || gid)
      .join(', ');
  };

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold gold-text-gradient">
              শ্রেণি ১–১২ পাঠ্যক্রম ও একাডেমিক কাঠামো ব্যবস্থাপনা
            </h1>
            <p className="mt-1 text-base text-[#B8C0CE]">
              প্রাথমিক, মাধ্যমিক ও উচ্চ মাধ্যমিক স্তরের শ্রেণি, বিভাগ, বিষয় কোড, আবশ্যিক/ঐচ্ছিক/চতুর্থ বিষয় ও ডুপ্লিকেট নিয়ন্ত্রণ পরিচালনা করুন।
            </p>
          </div>
          <Link
            to="/curriculum"
            className="inline-flex items-center gap-1.5 rounded-lg gold-outline-btn px-3.5 py-2 text-sm font-semibold whitespace-nowrap shrink-0"
          >
            <Eye className="h-4 w-4 text-[#D4A853]" />
            <span>পাবলিক পাঠ্যক্রম দেখুন</span>
          </Link>
        </div>

        {/* Tabs */}
        <div className="mt-4 flex flex-wrap gap-2 border-t border-[#D4A853]/15 pt-4">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition-all whitespace-nowrap cursor-pointer tabular-nums ${
                tab === t.key
                  ? 'gold-btn'
                  : 'border border-[#D4A853]/28 bg-[#0A0D12] text-[#C2C8D3] hover:border-[#EAC779]'
              }`}
            >
              {t.label} ({toBanglaDigits(t.count)})
            </button>
          ))}
        </div>
      </Card>

      {tab === 'subjects' && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          {/* Subject Catalogue Table & Filters */}
          <div className="xl:col-span-8 space-y-4">
            <Card className="p-4 space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="relative lg:col-span-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9DA6B5]" />
                  <Input
                    value={subSearch}
                    onChange={(e) => setSubSearch(e.target.value)}
                    placeholder="নাম বা কোড খুঁজুন..."
                    className="pl-9"
                  />
                </div>

                <Select
                  value={subFilterClassId}
                  onChange={(e) => {
                    setSubFilterClassId(e.target.value);
                    setSubFilterGroupId('all');
                  }}
                >
                  <option value="all">সকল শ্রেণি (১–১২)</option>
                  {sortedClasses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nameBn}
                    </option>
                  ))}
                </Select>

                {filterClassObj?.hasGroups ? (
                  <Select
                    value={subFilterGroupId}
                    onChange={(e) => setSubFilterGroupId(e.target.value)}
                  >
                    <option value="all">সকল বিভাগ</option>
                    {filterClassGroups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.nameBn} ({g.name})
                      </option>
                    ))}
                  </Select>
                ) : (
                  <div className="flex items-center rounded-lg border border-[#D4A853]/15 bg-[#0A0D12] px-3 py-2 text-xs text-[#7D8696]">
                    {filterClassObj ? 'বিভাগ নেই (শ্রেণি ১–৮)' : 'বিভাগ ফিল্টারের জন্য ৯–১২ বাছুন'}
                  </div>
                )}

                <Select
                  value={subFilterCategory}
                  onChange={(e) =>
                    setSubFilterCategory(e.target.value as 'all' | SubjectCategory)
                  }
                >
                  <option value="all">সকল ক্যাটাগরি</option>
                  <option value="compulsory">আবশ্যিক (Compulsory)</option>
                  <option value="group">বিভাগভিত্তিক (Group)</option>
                  <option value="optional">ঐচ্ছিক (Optional)</option>
                  <option value="fourth">চতুর্থ বিষয় (Fourth)</option>
                </Select>
              </div>
              <p className="text-xs text-[#9DA6B5] tabular-nums">
                প্রদর্শিত হচ্ছে: {toBanglaDigits(filteredSubjects.length)}টি বিষয়
              </p>
            </Card>

            <Card className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[#D4A853]/20 bg-[#0A0D12] text-xs font-semibold text-[#EAC779]">
                  <tr>
                    <th className="px-4 py-3">কোড</th>
                    <th className="px-4 py-3">বিষয়</th>
                    <th className="px-4 py-3">ধরন</th>
                    <th className="px-4 py-3">শ্রেণি ও বিভাগ</th>
                    <th className="px-4 py-3">অবস্থা</th>
                    <th className="px-4 py-3 text-right">কার্যক্রম</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D4A853]/15">
                  {filteredSubjects.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-[#9DA6B5]">
                        নির্বাচিত ফিল্টারে কোনো বিষয় পাওয়া যায়নি।
                      </td>
                    </tr>
                  ) : (
                    filteredSubjects.map((s) => {
                      const cls = sortedClasses.find((c) => c.id === s.classId);
                      const cat: SubjectCategory = s.category || 'compulsory';
                      const catMeta = SUBJECT_CATEGORY_LABELS[cat];
                      return (
                        <tr key={s.id} className="hover:bg-white/[0.02]">
                          <td className="px-4 py-3 font-mono text-xs text-[#D4A853] whitespace-nowrap tabular-nums">
                            {s.code}
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-[#F5EFE2]">{s.nameBn}</p>
                            <p className="text-xs text-[#8C95A4]">{s.name}</p>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={`rounded border px-2 py-0.5 text-xs font-semibold ${CATEGORY_TAG_CLASSES[cat]}`}
                            >
                              {catMeta.nameBn}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-[#B8C0CE]">
                            <p className="font-medium text-[#E5E0D5]">
                              {cls?.nameBn || cls?.name || s.classId}
                            </p>
                            <p className="text-[#9DA6B5]">{getSubjectGroupSummary(s)}</p>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <StatusTag
                              tone={s.isActive ? 'active' : 'draft'}
                              label={s.isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                            />
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleToggleSubjectActive(s)}
                                title={s.isActive ? 'নিষ্ক্রিয় করুন' : 'সক্রিয় করুন'}
                                className="rounded-lg border border-[#D4A853]/25 bg-[#0A0D12] p-1.5 text-[#B8C0CE] hover:border-[#EAC779] hover:text-[#EAC779] cursor-pointer"
                              >
                                {s.isActive ? (
                                  <EyeOff className="h-3.5 w-3.5" />
                                ) : (
                                  <Eye className="h-3.5 w-3.5" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleEditSubject(s)}
                                title="সম্পাদনা"
                                className="rounded-lg border border-[#D4A853]/25 bg-[#0A0D12] p-1.5 text-[#EAC779] hover:border-[#EAC779] cursor-pointer"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteSubjectTarget(s)}
                                title="মুছুন"
                                className="rounded-lg border border-rose-500/30 bg-[#0A0D12] p-1.5 text-rose-300 hover:bg-rose-950/50 cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </Card>
          </div>

          {/* Add / Edit Subject Form */}
          <Card className="xl:col-span-4 p-5 h-fit">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-lg font-semibold text-[#EAC779]">
                {editingSubjectId ? 'বিষয় সম্পাদনা করুন' : 'নতুন বিষয় যোগ করুন'}
              </h2>
              {editingSubjectId && (
                <button
                  type="button"
                  onClick={resetSubjectForm}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#9DA6B5] hover:text-[#F5EFE2] cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>বাতিল</span>
                </button>
              )}
            </div>

            <form onSubmit={handleSaveSubject} className="mt-4 space-y-3.5">
              <FormField label="শ্রেণি নির্বাচন" htmlFor="as-cls" required>
                <Select
                  id="as-cls"
                  value={subClassId}
                  onChange={(e) => handleSubClassChange(e.target.value)}
                >
                  {sortedClasses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nameBn || c.name}
                    </option>
                  ))}
                </Select>
              </FormField>

              {/* Group assignment ONLY when class hasGroups (Class 9-12) */}
              {selectedFormClass?.hasGroups ? (
                <div className="space-y-2 rounded-lg border border-[#D4A853]/20 bg-[#090C11] p-3">
                  <span className="block text-xs font-semibold text-[#EAC779]">
                    বিভাগ নির্ধারণ (শ্রেণি ৯–১২)
                  </span>
                  <label className="flex items-center gap-2 text-xs text-[#E5E0D5] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={subCommonAllGroups}
                      onChange={(e) => {
                        setSubCommonAllGroups(e.target.checked);
                        if (e.target.checked) setSubSelectedGroupIds([]);
                      }}
                      className="accent-[#D4A853]"
                    />
                    <span>সকল বিভাগে প্রযোজ্য (সাধারণ আবশ্যিক)</span>
                  </label>

                  {!subCommonAllGroups && (
                    <div className="space-y-1.5 border-t border-[#D4A853]/12 pt-2">
                      {formClassGroups.map((g) => (
                        <label
                          key={g.id}
                          className="flex items-center gap-2 text-xs text-[#C2C8D3] cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={subSelectedGroupIds.includes(g.id)}
                            onChange={() => handleToggleFormGroup(g.id)}
                            className="accent-[#D4A853]"
                          />
                          <span>
                            {g.nameBn} ({g.name})
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="rounded-lg border border-[#D4A853]/15 bg-[#090C11] px-3 py-2 text-xs text-[#9DA6B5]">
                  শ্রেণি ১–৮ এর জন্য কোনো বিভাগ নেই; বিষয়টি সরাসরি উক্ত শ্রেণিতে যুক্ত হবে।
                </p>
              )}

              <FormField label="বিষয়ের ধরন (ক্যাটাগরি)" htmlFor="as-cat" required>
                <Select
                  id="as-cat"
                  value={subCategory}
                  onChange={(e) => setSubCategory(e.target.value as SubjectCategory)}
                >
                  <option value="compulsory">আবশ্যিক (Compulsory)</option>
                  {selectedFormClass?.hasGroups && (
                    <option value="group">বিভাগভিত্তিক (Group Subject)</option>
                  )}
                  <option value="optional">ঐচ্ছিক (Optional Subject)</option>
                  <option value="fourth">চতুর্থ বিষয় (Fourth Subject)</option>
                </Select>
              </FormField>

              <FormField label="বিষয়ের নাম (বাংলা)" htmlFor="as-bn" required>
                <Input
                  id="as-bn"
                  placeholder="যেমন: উচ্চতর গণিত"
                  value={subNameBn}
                  onChange={(e) => setSubNameBn(e.target.value)}
                  required
                />
              </FormField>

              <FormField label="বিষয়ের নাম (ইংরেজি)" htmlFor="as-en">
                <Input
                  id="as-en"
                  placeholder="যেমন: Higher Mathematics"
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                />
              </FormField>

              <FormField label="বিষয় কোড" htmlFor="as-code" required>
                <Input
                  id="as-code"
                  placeholder="যেমন: 126 বা PHY-11"
                  value={subCode}
                  onChange={(e) => setSubCode(e.target.value)}
                  required
                />
              </FormField>

              <label className="flex items-center gap-2 text-sm text-[#C2C8D3] cursor-pointer">
                <input
                  type="checkbox"
                  checked={subIsActive}
                  onChange={(e) => setSubIsActive(e.target.checked)}
                  className="accent-[#D4A853]"
                />
                <span>বিষয়টি সক্রিয় রাখুন</span>
              </label>

              <div className="flex items-center gap-2 pt-1">
                <Button type="submit" size="sm" className="w-full justify-center">
                  {editingSubjectId ? (
                    <>
                      <Check className="h-4 w-4" />
                      <span>হালনাগাদ সংরক্ষণ করুন</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      <span>বিষয় যুক্ত করুন</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {tab === 'classes' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <Card className="lg:col-span-8 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#D4A853]/20 bg-[#0A0D12] text-xs font-semibold text-[#EAC779]">
                <tr>
                  <th className="px-4 py-3">ক্রম</th>
                  <th className="px-4 py-3">শ্রেণির নাম</th>
                  <th className="px-4 py-3">শিক্ষা স্তর</th>
                  <th className="px-4 py-3">বিভাগ</th>
                  <th className="px-4 py-3">বিষয়</th>
                  <th className="px-4 py-3">অবস্থা</th>
                  <th className="px-4 py-3 text-right">নিয়ন্ত্রণ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D4A853]/15">
                {sortedClasses.map((c) => {
                  const edu = c.educationLevel || inferEducationLevel(c.levelOrder);
                  const eduMeta = EDUCATION_LEVEL_LABELS[edu];
                  const subCount = catalogue.subjects.filter((s) => s.classId === c.id).length;
                  return (
                    <tr key={c.id} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3 font-mono text-sm text-[#D4A853] tabular-nums">
                        {toBanglaDigits(c.levelOrder)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-[#F5EFE2]">{c.nameBn}</p>
                        <p className="text-xs text-[#8C95A4]">{c.name}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-[#B8C0CE]">
                        {eduMeta.nameBn}
                      </td>
                      <td className="px-4 py-3 text-xs text-[#B8C0CE]">
                        {c.hasGroups ? 'বিজ্ঞান / মানবিক / ব্যবসায়' : 'নেই'}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-[#F5EFE2] tabular-nums">
                        {toBanglaDigits(subCount)}টি
                      </td>
                      <td className="px-4 py-3">
                        <StatusTag
                          tone={c.isActive ? 'active' : 'draft'}
                          label={c.isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleToggleClassActive(c.id, !c.isActive)}
                          className="rounded-lg border border-[#D4A853]/25 bg-[#0A0D12] px-2.5 py-1 text-xs font-semibold text-[#EAC779] hover:border-[#EAC779] cursor-pointer whitespace-nowrap"
                        >
                          {c.isActive ? 'নিষ্ক্রিয় করুন' : 'সক্রিয় করুন'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>

          <Card className="lg:col-span-4 p-5 h-fit">
            <h2 className="font-display text-lg font-semibold text-[#EAC779]">নতুন শ্রেণি যোগ করুন</h2>
            <form onSubmit={handleAddClass} className="mt-4 space-y-3">
              <FormField label="শ্রেণির নাম (বাংলা)" htmlFor="ac-cls-bn" required>
                <Input
                  id="ac-cls-bn"
                  placeholder="যেমন: বিশেষ প্রস্তুতি শ্রেণি"
                  value={clsNameBn}
                  onChange={(e) => setClsNameBn(e.target.value)}
                  required
                />
              </FormField>
              <FormField label="শ্রেণির নাম (ইংরেজি)" htmlFor="ac-cls-en">
                <Input
                  id="ac-cls-en"
                  placeholder="যেমন: Class 13 (Admission)"
                  value={clsName}
                  onChange={(e) => setClsName(e.target.value)}
                />
              </FormField>
              <FormField label="ক্রমিক নম্বর" htmlFor="ac-cls-ord">
                <Input
                  id="ac-cls-ord"
                  type="number"
                  min={1}
                  value={clsOrder}
                  onChange={(e) => {
                    const ord = Number(e.target.value) || 1;
                    setClsOrder(ord);
                    setClsEduLevel(inferEducationLevel(ord));
                  }}
                />
              </FormField>
              <FormField label="শিক্ষা স্তর" htmlFor="ac-cls-lvl">
                <Select
                  id="ac-cls-lvl"
                  value={clsEduLevel}
                  onChange={(e) => setClsEduLevel(e.target.value as EducationLevel)}
                >
                  <option value="primary">প্রাথমিক স্তর (Class 1–5)</option>
                  <option value="secondary">মাধ্যমিক স্তর (Class 6–10)</option>
                  <option value="higher_secondary">উচ্চ মাধ্যমিক স্তর (Class 11–12)</option>
                </Select>
              </FormField>
              <label className="flex items-center gap-2 text-sm text-[#C2C8D3] cursor-pointer">
                <input
                  type="checkbox"
                  checked={clsHasGroups}
                  onChange={(e) => setClsHasGroups(e.target.checked)}
                  className="accent-[#D4A853]"
                />
                <span>একাডেমিক বিভাগ সমর্থিত (বিজ্ঞান / মানবিক / ব্যবসায় শিক্ষা)</span>
              </label>
              <Button type="submit" size="sm">
                <Plus className="h-4 w-4" />
                <span>শ্রেণি যুক্ত করুন</span>
              </Button>
            </form>
          </Card>
        </div>
      )}

      {tab === 'groups' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <Card className="lg:col-span-7 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#D4A853]/20 bg-[#0A0D12] text-sm font-semibold text-[#EAC779]">
                <tr>
                  <th className="px-4 py-3">শ্রেণি</th>
                  <th className="px-4 py-3">বিভাগের নাম (বাংলা)</th>
                  <th className="px-4 py-3">ইংরেজি নাম</th>
                  <th className="px-4 py-3">ধরন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D4A853]/15">
                {catalogue.groups.map((g) => {
                  const cls = sortedClasses.find((c) => c.id === g.classId);
                  return (
                    <tr key={g.id} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-sm text-[#B8C0CE]">
                        {cls?.nameBn || cls?.name || g.classId}
                      </td>
                      <td className="px-4 py-3 font-medium text-[#F5EFE2]">{g.nameBn}</td>
                      <td className="px-4 py-3 text-[#B8C0CE]">{g.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-[#D4A853]">
                        {g.code || 'custom'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
          <Card className="lg:col-span-5 p-5 h-fit">
            <h2 className="font-display text-lg font-semibold text-[#EAC779]">নতুন বিভাগ যোগ করুন</h2>
            <form onSubmit={handleAddGroup} className="mt-4 space-y-3">
              <FormField label="শ্রেণি নির্বাচন (শ্রেণি ৯–১২)" htmlFor="ag-cls" required>
                <Select id="ag-cls" value={grpClassId} onChange={(e) => setGrpClassId(e.target.value)}>
                  {sortedClasses
                    .filter((c) => c.hasGroups)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nameBn || c.name}
                      </option>
                    ))}
                </Select>
              </FormField>
              <FormField label="গ্রুপ কোড" htmlFor="ag-code">
                <Select
                  id="ag-code"
                  value={grpCode}
                  onChange={(e) => setGrpCode(e.target.value as AcademicGroupCode)}
                >
                  <option value="science">Science (বিজ্ঞান)</option>
                  <option value="humanities">Humanities / Arts (মানবিক)</option>
                  <option value="business">Business Studies / Commerce (ব্যবসায় শিক্ষা)</option>
                </Select>
              </FormField>
              <FormField label="বিভাগের নাম (বাংলা)" htmlFor="ag-bn" required>
                <Input
                  id="ag-bn"
                  placeholder="যেমন: বিজ্ঞান"
                  value={grpNameBn}
                  onChange={(e) => setGrpNameBn(e.target.value)}
                  required
                />
              </FormField>
              <FormField label="বিভাগের নাম (ইংরেজি)" htmlFor="ag-en">
                <Input
                  id="ag-en"
                  placeholder="যেমন: Science"
                  value={grpName}
                  onChange={(e) => setGrpName(e.target.value)}
                />
              </FormField>
              <Button type="submit" size="sm">বিভাগ যুক্ত করুন</Button>
            </form>
          </Card>
        </div>
      )}

      {tab === 'chapters' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <Card className="lg:col-span-7 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#D4A853]/20 bg-[#0A0D12] text-sm font-semibold text-[#EAC779]">
                <tr>
                  <th className="px-4 py-3">অধ্যায় #</th>
                  <th className="px-4 py-3">অধ্যায়ের নাম</th>
                  <th className="px-4 py-3">বিষয়</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D4A853]/15">
                {catalogue.chapters.map((ch) => {
                  const sub = catalogue.subjects.find((s) => s.id === ch.subjectId);
                  return (
                    <tr key={ch.id} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3 font-mono text-sm text-[#D4A853] tabular-nums">
                        {toBanglaDigits(ch.chapterNumber)}
                      </td>
                      <td className="px-4 py-3 font-medium text-[#F5EFE2]">
                        {ch.nameBn} ({ch.name})
                      </td>
                      <td className="px-4 py-3 text-sm text-[#B8C0CE]">
                        {sub?.nameBn || sub?.name}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
          <Card className="lg:col-span-5 p-5 h-fit">
            <h2 className="font-display text-lg font-semibold text-[#EAC779]">নতুন অধ্যায় যোগ করুন</h2>
            <form onSubmit={handleAddChapter} className="mt-4 space-y-3">
              <FormField label="বিষয়" htmlFor="ach-sub" required>
                <Select id="ach-sub" value={chSubId} onChange={(e) => setChSubId(e.target.value)}>
                  {catalogue.subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nameBn || s.name} ({s.code})
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="অধ্যায় নম্বর" htmlFor="ach-num">
                <Input
                  id="ach-num"
                  type="number"
                  min={1}
                  value={chNum}
                  onChange={(e) => setChNum(Number(e.target.value))}
                />
              </FormField>
              <FormField label="অধ্যায়ের শিরোনাম (বাংলা)" htmlFor="ach-bn" required>
                <Input
                  id="ach-bn"
                  value={chNameBn}
                  onChange={(e) => setChNameBn(e.target.value)}
                  required
                />
              </FormField>
              <FormField label="অধ্যায়ের শিরোনাম (ইংরেজি)" htmlFor="ach-en">
                <Input id="ach-en" value={chName} onChange={(e) => setChName(e.target.value)} />
              </FormField>
              <Button type="submit" size="sm">অধ্যায় যুক্ত করুন</Button>
            </form>
          </Card>
        </div>
      )}

      {tab === 'topics' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <Card className="lg:col-span-7 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#D4A853]/20 bg-[#0A0D12] text-sm font-semibold text-[#EAC779]">
                <tr>
                  <th className="px-4 py-3">টপিক</th>
                  <th className="px-4 py-3">অধ্যায়</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D4A853]/15">
                {catalogue.topics.map((t) => {
                  const ch = catalogue.chapters.find((c) => c.id === t.chapterId);
                  return (
                    <tr key={t.id} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3 font-medium text-[#F5EFE2]">
                        {t.nameBn} ({t.name})
                      </td>
                      <td className="px-4 py-3 text-sm text-[#B8C0CE]">
                        {ch?.nameBn || ch?.name}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
          <Card className="lg:col-span-5 p-5 h-fit">
            <h2 className="font-display text-lg font-semibold text-[#EAC779]">নতুন টপিক যোগ করুন</h2>
            <form onSubmit={handleAddTopic} className="mt-4 space-y-3">
              <FormField label="অধ্যায়" htmlFor="at-ch" required>
                <Select id="at-ch" value={topChId} onChange={(e) => setTopChId(e.target.value)}>
                  {catalogue.chapters.map((c) => (
                    <option key={c.id} value={c.id}>
                      অধ্যায় {toBanglaDigits(c.chapterNumber)}: {c.nameBn || c.name}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="টপিকের নাম (বাংলা)" htmlFor="at-bn" required>
                <Input
                  id="at-bn"
                  value={topNameBn}
                  onChange={(e) => setTopNameBn(e.target.value)}
                  required
                />
              </FormField>
              <FormField label="টপিকের নাম (ইংরেজি)" htmlFor="at-en">
                <Input id="at-en" value={topName} onChange={(e) => setTopName(e.target.value)} />
              </FormField>
              <Button type="submit" size="sm">টপিক যুক্ত করুন</Button>
            </form>
          </Card>
        </div>
      )}

      {tab === 'types' && (
        <Card className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#D4A853]/20 bg-[#0A0D12] text-sm font-semibold text-[#EAC779]">
              <tr>
                <th className="px-4 py-3">কোড</th>
                <th className="px-4 py-3">প্রশ্নের ধরন (বাংলা)</th>
                <th className="px-4 py-3">ইংরেজি লেবেল</th>
                <th className="px-4 py-3">ডিফল্ট নম্বর</th>
                <th className="px-4 py-3">অবস্থা</th>
                <th className="px-4 py-3 text-right">দ্রুত কার্যক্রম</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D4A853]/15">
              {catalogue.questionTypes.map((qt) => (
                <tr key={qt.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-mono text-sm text-[#D4A853]">{qt.code}</td>
                  <td className="px-4 py-3 font-medium text-[#F5EFE2]">{qt.nameBn}</td>
                  <td className="px-4 py-3 text-[#B8C0CE]">{qt.name}</td>
                  <td className="px-4 py-3 font-mono text-sm text-[#F5EFE2] tabular-nums">
                    {toBanglaDigits(qt.defaultMarks)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusTag tone="active" label="সক্রিয়" />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/admin/questions/new?type=${qt.code}`}
                      className="inline-flex items-center gap-1.5 rounded-lg gold-btn px-3 py-1.5 text-xs font-bold whitespace-nowrap"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>এই ধরনে প্রশ্ন যোগ করুন</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <ConfirmDialog
        open={Boolean(deleteSubjectTarget)}
        onClose={() => setDeleteSubjectTarget(null)}
        onConfirm={handleConfirmDeleteSubject}
        title="বিষয় মুছে ফেলতে চান?"
        message={
          deleteSubjectTarget
            ? `"${deleteSubjectTarget.nameBn}" (${deleteSubjectTarget.code}) বিষয়টি স্থায়ীভাবে তালিকা থেকে অপসারণ করা হবে।`
            : ''
        }
        confirmLabel="হ্যাঁ, মুছে ফেলুন"
        danger
      />
    </div>
  );
}
