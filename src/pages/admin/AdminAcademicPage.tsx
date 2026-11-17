import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button, Card, FormField, Input, Select, StatusTag } from '../../components/ui/Primitives';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { toBanglaDigits } from '../../lib/bn';
import { questionBankService } from '../../services/questionBankService';

type TabKey = 'classes' | 'groups' | 'subjects' | 'chapters' | 'topics' | 'types';

export function AdminAcademicPage() {
  const { user, revision, bumpRevision } = useAuth();
  const { pushToast } = useToast();
  const [tab, setTab] = useState<TabKey>('classes');

  const catalogue = useMemo(
    () => questionBankService.getAcademicCatalogue(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [revision]
  );

  const [clsName, setClsName] = useState('');
  const [clsNameBn, setClsNameBn] = useState('');
  const [clsOrder, setClsOrder] = useState(11);
  const [clsHasGroups, setClsHasGroups] = useState(false);

  const [grpClassId, setGrpClassId] = useState(catalogue.classes[0]?.id || 'cls-9-10');
  const [grpName, setGrpName] = useState('');
  const [grpNameBn, setGrpNameBn] = useState('');

  const [subClassId, setSubClassId] = useState(catalogue.classes[0]?.id || 'cls-6');
  const [subName, setSubName] = useState('');
  const [subNameBn, setSubNameBn] = useState('');
  const [subCode, setSubCode] = useState('');

  const [chSubId, setChSubId] = useState(catalogue.subjects[0]?.id || '');
  const [chNum, setChNum] = useState(1);
  const [chName, setChName] = useState('');
  const [chNameBn, setChNameBn] = useState('');

  const [topChId, setTopChId] = useState(catalogue.chapters[0]?.id || '');
  const [topName, setTopName] = useState('');
  const [topNameBn, setTopNameBn] = useState('');

  if (!user || user.role !== 'admin') return null;

  const tabs: Array<{ key: TabKey; label: string; count: number }> = [
    { key: 'classes', label: 'শ্রেণিসমূহ', count: catalogue.classes.length },
    { key: 'groups', label: 'বিভাগসমূহ', count: catalogue.groups.length },
    { key: 'subjects', label: 'বিষয়সমূহ', count: catalogue.subjects.length },
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
      hasGroups: clsHasGroups,
      isActive: true,
    });
    setClsName('');
    setClsNameBn('');
    bumpRevision();
    pushToast({ title: 'নতুন শ্রেণি যুক্ত হয়েছে', variant: 'success' });
  };

  const handleAddGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!grpName.trim() && !grpNameBn.trim()) return;
    questionBankService.adminAddGroup(user, {
      classId: grpClassId,
      name: grpName.trim() || grpNameBn.trim(),
      nameBn: grpNameBn.trim() || grpName.trim(),
      isActive: true,
    });
    setGrpName('');
    setGrpNameBn('');
    bumpRevision();
    pushToast({ title: 'নতুন বিভাগ যুক্ত হয়েছে', variant: 'success' });
  };

  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subName.trim() && !subNameBn.trim()) return;
    questionBankService.adminAddSubject(user, {
      classId: subClassId,
      name: subName.trim() || subNameBn.trim(),
      nameBn: subNameBn.trim() || subName.trim(),
      code: subCode.trim().toUpperCase() || 'SUB',
      isActive: true,
    });
    setSubName('');
    setSubNameBn('');
    setSubCode('');
    bumpRevision();
    pushToast({ title: 'নতুন বিষয় যুক্ত হয়েছে', variant: 'success' });
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

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h1 className="font-display text-2xl font-bold gold-text-gradient">একাডেমিক কাঠামো ব্যবস্থাপনা</h1>
        <p className="mt-1 text-base text-[#B8C0CE]">
          শ্রেণি, বিভাগ, বিষয়, অধ্যায়, টপিক এবং সমর্থিত প্রশ্নের ধরন পরিচালনা করুন।
        </p>

        {/* Tabs */}
        <div className="mt-4 flex flex-wrap gap-2 border-t border-[#D4A853]/15 pt-4">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
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

      {tab === 'classes' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <Card className="lg:col-span-7 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#D4A853]/20 bg-[#0A0D12] text-sm font-semibold text-[#EAC779]">
                <tr>
                  <th className="px-4 py-3">ক্রম</th>
                  <th className="px-4 py-3">শ্রেণির নাম (বাংলা)</th>
                  <th className="px-4 py-3">ইংরেজি নাম</th>
                  <th className="px-4 py-3">বিভাগ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D4A853]/15">
                {catalogue.classes.map((c) => (
                  <tr key={c.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-mono text-sm text-[#D4A853] tabular-nums">{toBanglaDigits(c.levelOrder)}</td>
                    <td className="px-4 py-3 font-medium text-[#F5EFE2]">{c.nameBn}</td>
                    <td className="px-4 py-3 text-[#B8C0CE]">{c.name}</td>
                    <td className="px-4 py-3 text-sm text-[#B8C0CE]">{c.hasGroups ? 'যুক্ত আছে' : 'নেই'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card className="lg:col-span-5 p-5">
            <h2 className="font-display text-lg font-semibold text-[#EAC779]">নতুন শ্রেণি যোগ করুন</h2>
            <form onSubmit={handleAddClass} className="mt-4 space-y-3">
              <FormField label="শ্রেণির নাম (বাংলা)" htmlFor="ac-cls-bn" required>
                <Input id="ac-cls-bn" placeholder="যেমন: একাদশ–দ্বাদশ শ্রেণি" value={clsNameBn} onChange={(e) => setClsNameBn(e.target.value)} required />
              </FormField>
              <FormField label="শ্রেণির নাম (ইংরেজি)" htmlFor="ac-cls-en">
                <Input id="ac-cls-en" placeholder="যেমন: Class 11–12 (HSC)" value={clsName} onChange={(e) => setClsName(e.target.value)} />
              </FormField>
              <FormField label="ক্রমিক নম্বর" htmlFor="ac-cls-ord">
                <Input id="ac-cls-ord" type="number" value={clsOrder} onChange={(e) => setClsOrder(Number(e.target.value))} />
              </FormField>
              <label className="flex items-center gap-2 text-sm text-[#C2C8D3] cursor-pointer">
                <input type="checkbox" checked={clsHasGroups} onChange={(e) => setClsHasGroups(e.target.checked)} className="accent-[#D4A853]" />
                <span>একাডেমিক বিভাগ সমর্থিত (বিজ্ঞান / ব্যবসায় শিক্ষা / মানবিক)</span>
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
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D4A853]/15">
                {catalogue.groups.map((g) => {
                  const cls = catalogue.classes.find((c) => c.id === g.classId);
                  return (
                    <tr key={g.id} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-sm text-[#B8C0CE]">
                        {cls?.nameBn || cls?.name || g.classId}
                      </td>
                      <td className="px-4 py-3 font-medium text-[#F5EFE2]">{g.nameBn}</td>
                      <td className="px-4 py-3 text-[#B8C0CE]">{g.name}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
          <Card className="lg:col-span-5 p-5">
            <h2 className="font-display text-lg font-semibold text-[#EAC779]">নতুন বিভাগ যোগ করুন</h2>
            <form onSubmit={handleAddGroup} className="mt-4 space-y-3">
              <FormField label="শ্রেণি নির্বাচন" htmlFor="ag-cls" required>
                <Select id="ag-cls" value={grpClassId} onChange={(e) => setGrpClassId(e.target.value)}>
                  {catalogue.classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.nameBn || c.name}</option>
                  ))}
                </Select>
              </FormField>
              <FormField label="বিভাগের নাম (বাংলা)" htmlFor="ag-bn" required>
                <Input id="ag-bn" placeholder="যেমন: বিজ্ঞান" value={grpNameBn} onChange={(e) => setGrpNameBn(e.target.value)} required />
              </FormField>
              <FormField label="বিভাগের নাম (ইংরেজি)" htmlFor="ag-en">
                <Input id="ag-en" placeholder="যেমন: Science" value={grpName} onChange={(e) => setGrpName(e.target.value)} />
              </FormField>
              <Button type="submit" size="sm">বিভাগ যুক্ত করুন</Button>
            </form>
          </Card>
        </div>
      )}

      {tab === 'subjects' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <Card className="lg:col-span-7 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#D4A853]/20 bg-[#0A0D12] text-sm font-semibold text-[#EAC779]">
                <tr>
                  <th className="px-4 py-3">কোড</th>
                  <th className="px-4 py-3">বিষয়</th>
                  <th className="px-4 py-3">শ্রেণি</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D4A853]/15">
                {catalogue.subjects.map((s) => {
                  const cls = catalogue.classes.find((c) => c.id === s.classId);
                  return (
                    <tr key={s.id} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3 font-mono text-sm text-[#D4A853]">{s.code}</td>
                      <td className="px-4 py-3 font-medium text-[#F5EFE2]">{s.nameBn} ({s.name})</td>
                      <td className="px-4 py-3 text-sm text-[#B8C0CE]">
                        {cls?.nameBn || cls?.name}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
          <Card className="lg:col-span-5 p-5">
            <h2 className="font-display text-lg font-semibold text-[#EAC779]">নতুন বিষয় যোগ করুন</h2>
            <form onSubmit={handleAddSubject} className="mt-4 space-y-3">
              <FormField label="শ্রেণি" htmlFor="as-cls" required>
                <Select id="as-cls" value={subClassId} onChange={(e) => setSubClassId(e.target.value)}>
                  {catalogue.classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.nameBn || c.name}</option>
                  ))}
                </Select>
              </FormField>
              <FormField label="বিষয়ের নাম (বাংলা)" htmlFor="as-bn" required>
                <Input id="as-bn" placeholder="যেমন: উচ্চতর গণিত" value={subNameBn} onChange={(e) => setSubNameBn(e.target.value)} required />
              </FormField>
              <FormField label="বিষয়ের নাম (ইংরেজি)" htmlFor="as-en">
                <Input id="as-en" placeholder="যেমন: Higher Mathematics" value={subName} onChange={(e) => setSubName(e.target.value)} />
              </FormField>
              <FormField label="বিষয় কোড" htmlFor="as-code">
                <Input id="as-code" placeholder="HMATH-9" value={subCode} onChange={(e) => setSubCode(e.target.value)} />
              </FormField>
              <Button type="submit" size="sm">বিষয় যুক্ত করুন</Button>
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
                      <td className="px-4 py-3 font-mono text-sm text-[#D4A853] tabular-nums">{toBanglaDigits(ch.chapterNumber)}</td>
                      <td className="px-4 py-3 font-medium text-[#F5EFE2]">{ch.nameBn} ({ch.name})</td>
                      <td className="px-4 py-3 text-sm text-[#B8C0CE]">
                        {sub?.nameBn || sub?.name}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
          <Card className="lg:col-span-5 p-5">
            <h2 className="font-display text-lg font-semibold text-[#EAC779]">নতুন অধ্যায় যোগ করুন</h2>
            <form onSubmit={handleAddChapter} className="mt-4 space-y-3">
              <FormField label="বিষয়" htmlFor="ach-sub" required>
                <Select id="ach-sub" value={chSubId} onChange={(e) => setChSubId(e.target.value)}>
                  {catalogue.subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.nameBn || s.name} ({s.code})</option>
                  ))}
                </Select>
              </FormField>
              <FormField label="অধ্যায় নম্বর" htmlFor="ach-num">
                <Input id="ach-num" type="number" min={1} value={chNum} onChange={(e) => setChNum(Number(e.target.value))} />
              </FormField>
              <FormField label="অধ্যায়ের শিরোনাম (বাংলা)" htmlFor="ach-bn" required>
                <Input id="ach-bn" value={chNameBn} onChange={(e) => setChNameBn(e.target.value)} required />
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
                      <td className="px-4 py-3 font-medium text-[#F5EFE2]">{t.nameBn} ({t.name})</td>
                      <td className="px-4 py-3 text-sm text-[#B8C0CE]">
                        {ch?.nameBn || ch?.name}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
          <Card className="lg:col-span-5 p-5">
            <h2 className="font-display text-lg font-semibold text-[#EAC779]">নতুন টপিক যোগ করুন</h2>
            <form onSubmit={handleAddTopic} className="mt-4 space-y-3">
              <FormField label="অধ্যায়" htmlFor="at-ch" required>
                <Select id="at-ch" value={topChId} onChange={(e) => setTopChId(e.target.value)}>
                  {catalogue.chapters.map((c) => (
                    <option key={c.id} value={c.id}>অধ্যায় {toBanglaDigits(c.chapterNumber)}: {c.nameBn || c.name}</option>
                  ))}
                </Select>
              </FormField>
              <FormField label="টপিকের নাম (বাংলা)" htmlFor="at-bn" required>
                <Input id="at-bn" value={topNameBn} onChange={(e) => setTopNameBn(e.target.value)} required />
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
                  <td className="px-4 py-3 font-mono text-sm text-[#F5EFE2] tabular-nums">{toBanglaDigits(qt.defaultMarks)}</td>
                  <td className="px-4 py-3"><StatusTag tone="active" label="সক্রিয়" /></td>
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
    </div>
  );
}
