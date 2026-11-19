import React, { useMemo, useState } from 'react';
import { Check, Moon, Palette, RotateCcw, Sparkles, Sun, Type } from 'lucide-react';
import {
  Button,
  Card,
  FormField,
  Input,
  Modal,
  StatusTag,
  Textarea,
} from '../../components/ui/Primitives';
import { GEOMETRY_TRIANGLE_SVG, PHYSICS_CIRCUIT_SVG } from '../../data/seedData';
import { useAuth } from '../../contexts/AuthContext';
import {
  FONT_SIZE_PRESETS,
  SITE_FONT_OPTIONS,
  THEME_PRESETS,
  useTheme,
} from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { formatBnDate, formatBnDateTime, getRoleLabelBn, toBanglaDigits } from '../../lib/bn';
import { isSubscriptionCurrentlyActive } from '../../lib/rules';
import { questionBankService } from '../../services/questionBankService';
import type { UserProfile } from '../../types/domain';

export function AdminUsersPage() {
  const { user, revision, bumpRevision } = useAuth();
  const { pushToast } = useToast();
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  const state = useMemo(
    () => (user?.role === 'admin' ? questionBankService.getAdminDashboardSnapshot(user) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, revision]
  );

  if (!user || user.role !== 'admin' || !state) return null;

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h1 className="font-display text-2xl font-bold gold-text-gradient">ব্যবহারকারী ও ভূমিকা ব্যবস্থাপনা</h1>
        <p className="mt-1 text-base text-[#B8C0CE]">
          নিবন্ধিত ব্যবহারকারী, সাবস্ক্রিপশনের ইতিহাস ও অ্যাকাউন্টের অবস্থা দেখুন। ব্যবহারকারীর ভূমিকা কেবল সার্ভার-সাইড থেকে নির্ধারিত হয়।
        </p>
      </Card>

      <Card className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[#D4A853]/20 bg-[#0A0D12] text-sm font-semibold text-[#EAC779]">
            <tr>
              <th className="px-4 py-3">নাম ও ইমেইল</th>
              <th className="px-4 py-3">ফোন</th>
              <th className="px-4 py-3">ভূমিকা</th>
              <th className="px-4 py-3">সক্রিয় শ্রেণি</th>
              <th className="px-4 py-3">অবস্থা</th>
              <th className="px-4 py-3 text-right">কার্যক্রম</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D4A853]/15">
            {state.users.map((u) => {
              const userSubs = state.subscriptions.filter(
                (s) => s.userId === u.id && isSubscriptionCurrentlyActive(s)
              );
              const classCount = new Set(userSubs.flatMap((s) => s.grantedClassIds)).size;
              return (
                <tr key={u.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <div className="font-medium text-[#F5EFE2]">{u.fullName}</div>
                    <div className="text-xs text-[#8C95A4]">{u.email}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-[#C2C8D3]">{u.phone}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-[#EAC779]">
                    {getRoleLabelBn(u.role)}
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-[#F5EFE2] tabular-nums">{toBanglaDigits(classCount)}</td>
                  <td className="px-4 py-3">
                    <StatusTag
                      tone={u.status === 'active' ? 'active' : 'expired'}
                      label={u.status === 'active' ? 'সক্রিয়' : 'স্থগিত'}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setSelectedUser(u)}>
                        বিস্তারিত
                      </Button>
                      {u.id !== user.id && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            questionBankService.adminUpdateUserStatus(
                              user,
                              u.id,
                              u.status === 'active' ? 'suspended' : 'active'
                            );
                            bumpRevision();
                            pushToast({ title: 'ব্যবহারকারীর অবস্থা হালনাগাদ হয়েছে', variant: 'info' });
                          }}
                        >
                          {u.status === 'active' ? 'স্থগিত করুন' : 'সক্রিয় করুন'}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <Modal
        open={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        title={selectedUser ? `${selectedUser.fullName} — অ্যাকাউন্টের বিস্তারিত` : 'ব্যবহারকারীর তথ্য'}
      >
        {selectedUser && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-[#8C95A4]">ইমেইল</p>
                <p className="font-medium text-[#F5EFE2]">{selectedUser.email}</p>
              </div>
              <div>
                <p className="text-xs text-[#8C95A4]">প্রতিষ্ঠান</p>
                <p className="font-medium text-[#F5EFE2]">{selectedUser.institution || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-[#8C95A4]">ভূমিকা</p>
                <p className="font-semibold text-[#EAC779]">{getRoleLabelBn(selectedUser.role)}</p>
              </div>
              <div>
                <p className="text-xs text-[#8C95A4]">যোগদানের তারিখ</p>
                <p className="font-medium text-[#F5EFE2] tabular-nums">
                  {formatBnDate(selectedUser.createdAt)}
                </p>
              </div>
            </div>

            <div className="border-t border-[#D4A853]/20 pt-3">
              <p className="mb-2 text-sm font-semibold text-[#EAC779]">সাবস্ক্রিপশনের ইতিহাস</p>
              {state.subscriptions.filter((s) => s.userId === selectedUser.id).length === 0 ? (
                <p className="text-sm text-[#8C95A4]">কোনো সাবস্ক্রিপশনের রেকর্ড পাওয়া যায়নি।</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {state.subscriptions
                    .filter((s) => s.userId === selectedUser.id)
                    .map((s) => (
                      <li key={s.id} className="rounded-lg border border-[#D4A853]/25 bg-[#090B10] p-2.5">
                        <div className="font-semibold text-[#F5EFE2]">{s.planNameSnapshot}</div>
                        <div className="text-[#9DA6B5] tabular-nums">
                          {formatBnDate(s.startsAt)} → {formatBnDate(s.expiresAt)}
                        </div>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export function AdminWebsitePage() {
  const { user, revision, bumpRevision } = useAuth();
  const { pushToast } = useToast();
  const [tab, setTab] = useState<'homepage' | 'notices' | 'faqs' | 'messages' | 'media'>('homepage');

  const state = useMemo(
    () => (user?.role === 'admin' ? questionBankService.getAdminDashboardSnapshot(user) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, revision]
  );

  const [heroHeadline, setHeroHeadline] = useState(state?.siteSettings.heroHeadline || '');
  const [heroSubheadline, setHeroSubheadline] = useState(state?.siteSettings.heroSubheadline || '');
  const [supportEmail, setSupportEmail] = useState(state?.siteSettings.supportEmail || '');

  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeBody, setNoticeBody] = useState('');

  const [faqQ, setFaqQ] = useState('');
  const [faqA, setFaqA] = useState('');
  const [faqCat, setFaqCat] = useState('সাধারণ');

  if (!user || user.role !== 'admin' || !state) return null;

  const handleSaveHomepage = (e: React.FormEvent) => {
    e.preventDefault();
    questionBankService.adminUpdateSiteSettings(user, {
      ...state.siteSettings,
      heroHeadline,
      heroSubheadline,
      supportEmail,
    });
    bumpRevision();
    pushToast({ title: 'হোমপেজের কনটেন্ট হালনাগাদ হয়েছে', variant: 'success' });
  };

  const handleAddNotice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeTitle.trim()) return;
    questionBankService.adminSaveNotice(user, {
      title: noticeTitle.trim(),
      body: noticeBody.trim(),
      isPublished: true,
    });
    setNoticeTitle('');
    setNoticeBody('');
    bumpRevision();
    pushToast({ title: 'নোটিশ প্রকাশিত হয়েছে', variant: 'success' });
  };

  const handleAddFaq = (e: React.FormEvent) => {
    e.preventDefault();
    if (!faqQ.trim() || !faqA.trim()) return;
    questionBankService.adminSaveFaq(user, {
      question: faqQ.trim(),
      answer: faqA.trim(),
      category: faqCat.trim(),
      displayOrder: state.faqs.length + 1,
      isPublished: true,
    });
    setFaqQ('');
    setFaqA('');
    bumpRevision();
    pushToast({ title: 'নতুন প্রশ্নোত্তর যুক্ত হয়েছে', variant: 'success' });
  };

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h1 className="font-display text-2xl font-bold gold-text-gradient">ওয়েবসাইট কনটেন্ট ব্যবস্থাপনা</h1>
        <p className="mt-1 text-base text-[#B8C0CE]">
          হোমপেজের লেখা, নোটিশ বোর্ড, সাধারণ জিজ্ঞাসা, যোগাযোগ বার্তা ও চিত্র লাইব্রেরি পরিচালনা করুন।
        </p>

        <div className="mt-4 flex flex-wrap gap-2 border-t border-[#D4A853]/15 pt-4">
          {[
            { key: 'homepage', label: 'হোমপেজ কনটেন্ট' },
            { key: 'notices', label: `নোটিশসমূহ (${toBanglaDigits(state.notices.length)})` },
            { key: 'faqs', label: `সাধারণ জিজ্ঞাসা (${toBanglaDigits(state.faqs.length)})` },
            { key: 'messages', label: `যোগাযোগ বার্তা (${toBanglaDigits(state.contactMessages.length)})` },
            { key: 'media', label: 'মিডিয়া লাইব্রেরি' },
          ].map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key as typeof tab)}
              className={`rounded-lg px-3.5 py-2 text-sm font-semibold cursor-pointer ${
                tab === t.key
                  ? 'gold-btn'
                  : 'border border-[#D4A853]/28 bg-[#0A0D12] text-[#C2C8D3] hover:border-[#EAC779]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </Card>

      {tab === 'homepage' && (
        <Card className="max-w-2xl p-6">
          <form onSubmit={handleSaveHomepage} className="space-y-4">
            <FormField label="হিরো শিরোনাম" htmlFor="ws-head">
              <Input id="ws-head" value={heroHeadline} onChange={(e) => setHeroHeadline(e.target.value)} />
            </FormField>
            <FormField label="হিরো সহায়ক বিবরণ" htmlFor="ws-sub">
              <Textarea id="ws-sub" rows={3} value={heroSubheadline} onChange={(e) => setHeroSubheadline(e.target.value)} />
            </FormField>
            <FormField label="সহায়তা ইমেইল" htmlFor="ws-email">
              <Input id="ws-email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} />
            </FormField>
            <Button type="submit">ওয়েবসাইট কনটেন্ট সংরক্ষণ করুন</Button>
          </form>
        </Card>
      )}

      {tab === 'notices' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7 space-y-3">
            {state.notices.map((n) => (
              <Card key={n.id} className="p-4">
                <p className="text-xs font-mono text-[#D4A853] tabular-nums">{formatBnDate(n.createdAt)}</p>
                <h3 className="mt-1 text-base font-semibold text-[#F5EFE2]">{n.title}</h3>
                <p className="mt-1 text-sm text-[#B8C0CE]">{n.body}</p>
              </Card>
            ))}
          </div>
          <Card className="lg:col-span-5 p-5">
            <h2 className="font-display text-lg font-semibold text-[#EAC779]">নতুন নোটিশ প্রকাশ করুন</h2>
            <form onSubmit={handleAddNotice} className="mt-4 space-y-3">
              <FormField label="শিরোনাম" htmlFor="nt-title" required>
                <Input id="nt-title" value={noticeTitle} onChange={(e) => setNoticeTitle(e.target.value)} required />
              </FormField>
              <FormField label="বার্তা" htmlFor="nt-body" required>
                <Textarea id="nt-body" rows={3} value={noticeBody} onChange={(e) => setNoticeBody(e.target.value)} required />
              </FormField>
              <Button type="submit" size="sm">নোটিশ প্রকাশ করুন</Button>
            </form>
          </Card>
        </div>
      )}

      {tab === 'faqs' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7 space-y-3">
            {state.faqs.map((f) => (
              <Card key={f.id} className="p-4">
                <p className="text-xs font-semibold text-[#D4A853]">{f.category}</p>
                <p className="mt-0.5 text-base font-semibold text-[#F5EFE2]">{f.question}</p>
                <p className="mt-1 text-sm text-[#B8C0CE]">{f.answer}</p>
              </Card>
            ))}
          </div>
          <Card className="lg:col-span-5 p-5">
            <h2 className="font-display text-lg font-semibold text-[#EAC779]">সাধারণ জিজ্ঞাসা যোগ করুন</h2>
            <form onSubmit={handleAddFaq} className="mt-4 space-y-3">
              <FormField label="বিভাগ" htmlFor="fq-cat">
                <Input id="fq-cat" value={faqCat} onChange={(e) => setFaqCat(e.target.value)} />
              </FormField>
              <FormField label="প্রশ্ন" htmlFor="fq-q" required>
                <Input id="fq-q" value={faqQ} onChange={(e) => setFaqQ(e.target.value)} required />
              </FormField>
              <FormField label="উত্তর" htmlFor="fq-a" required>
                <Textarea id="fq-a" rows={3} value={faqA} onChange={(e) => setFaqA(e.target.value)} required />
              </FormField>
              <Button type="submit" size="sm">যুক্ত করুন</Button>
            </form>
          </Card>
        </div>
      )}

      {tab === 'messages' && (
        <div className="space-y-3">
          {state.contactMessages.map((msg) => (
            <Card key={msg.id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold text-[#F5EFE2]">{msg.subject}</span>
                  <StatusTag
                    tone={msg.status === 'resolved' ? 'active' : 'pending'}
                    label={msg.status === 'resolved' ? 'সমাধানকৃত' : 'অপঠিত'}
                  />
                </div>
                <p className="mt-1 text-sm text-[#8C95A4]">
                  প্রেরক: {msg.name} ({msg.email}) · {formatBnDateTime(msg.createdAt)}
                </p>
                <p className="mt-2 text-sm text-[#C2C8D3]">{msg.message}</p>
              </div>
              {msg.status === 'unread' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    questionBankService.adminResolveContactMessage(user, msg.id);
                    bumpRevision();
                  }}
                >
                  সমাধান হিসেবে চিহ্নিত করুন
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}

      {tab === 'media' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card className="p-4 space-y-2">
            <img src={GEOMETRY_TRIANGLE_SVG} alt="জ্যামিতিক ত্রিভুজ চিত্র" className="h-40 w-full object-contain bg-[#F5EFE2] border border-[#D4A853]/30 rounded-lg p-2" />
            <p className="text-sm font-semibold text-[#F5EFE2]">জ্যামিতিক ত্রিভুজ ও উচ্চতা চিত্র</p>
            <p className="text-sm text-[#9DA6B5]">ষষ্ঠ শ্রেণির গণিতে ব্যবহৃত (q-103)</p>
          </Card>
          <Card className="p-4 space-y-2">
            <img src={PHYSICS_CIRCUIT_SVG} alt="পদার্থবিজ্ঞান বর্তনী চিত্র" className="h-40 w-full object-contain bg-[#F5EFE2] border border-[#D4A853]/30 rounded-lg p-2" />
            <p className="text-sm font-semibold text-[#F5EFE2]">পদার্থবিজ্ঞান শ্রেণি-সংযোগ বর্তনী চিত্র</p>
            <p className="text-sm text-[#9DA6B5]">নবম–দশম শ্রেণির পদার্থবিজ্ঞানে ব্যবহৃত (q-401)</p>
          </Card>
        </div>
      )}
    </div>
  );
}

export function AdminLogsSettingsPage({ mode }: { mode: 'logs' | 'settings' }) {
  const { user, revision } = useAuth();
  const { pushToast } = useToast();
  const {
    theme,
    themePreset,
    fontFamilyId,
    fontSizeScale,
    setTheme,
    setThemePreset,
    setFontFamilyId,
    setFontSizeScale,
    resetAppearance,
  } = useTheme();
  const [fontFilter, setFontFilter] = useState<'all' | 'bangla' | 'global'>('all');

  const state = useMemo(
    () => (user?.role === 'admin' ? questionBankService.getAdminDashboardSnapshot(user) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, revision]
  );

  if (!user || user.role !== 'admin' || !state) return null;

  if (mode === 'settings') {
    const activeFont = SITE_FONT_OPTIONS.find((f) => f.id === fontFamilyId) || SITE_FONT_OPTIONS[0];
    const activePreset = THEME_PRESETS.find((p) => p.id === themePreset) || THEME_PRESETS[0];
    const filteredFonts =
      fontFilter === 'all'
        ? SITE_FONT_OPTIONS
        : SITE_FONT_OPTIONS.filter((f) => f.category === fontFilter);

    const handleResetUi = () => {
      resetAppearance();
      pushToast({
        title: 'UI সেটিংস রিসেট হয়েছে',
        description: 'ডিফল্ট অ্যাপেক্স একাডেমি (নেভি ও অরেঞ্জ) থিম, Hind Siliguri ফন্ট এবং ১০০% সাইজ পুনরুদ্ধার করা হয়েছে।',
        variant: 'info',
      });
    };

    return (
      <div className="space-y-6">
        {/* Header */}
        <Card className="p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold gold-text-gradient">
              UI থিম, ফন্ট ও সিস্টেম সেটিংস
            </h1>
            <p className="mt-1 text-base text-[#B8C0CE]">
              এখান থেকে পুরো ওয়েবসাইটের কালার থিম, ডার্ক/লাইট মোড, ডাউনলোডকৃত বাংলা ও ওয়েব ফন্ট এবং ফন্ট সাইজ সাথে সাথে পরিবর্তন করে দেখতে পারবেন।
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleResetUi}>
            <RotateCcw className="h-4 w-4" />
            <span>ডিফল্ট রিসেট</span>
          </Button>
        </Card>

        {/* Live Preview Strip */}
        <Card className="p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#EAC779]" />
              <h2 className="font-display text-lg font-bold text-[#F5EFE2]">লাইভ প্রিভিউ (তাৎক্ষণিক পরিবর্তন)</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#B8C0CE]">
              <span className="rounded-md border border-[#D4A853]/30 bg-[#0A0D12] px-2.5 py-1">
                মোড: <strong className="text-[#EAC779]">{theme === 'dark' ? 'ডার্ক' : 'লাইট'}</strong>
              </span>
              <span className="rounded-md border border-[#D4A853]/30 bg-[#0A0D12] px-2.5 py-1">
                থিম: <strong className="text-[#EAC779]">{activePreset.nameBn}</strong>
              </span>
              <span className="rounded-md border border-[#D4A853]/30 bg-[#0A0D12] px-2.5 py-1">
                ফন্ট: <strong className="text-[#EAC779]">{activeFont.name}</strong>
              </span>
              <span className="rounded-md border border-[#D4A853]/30 bg-[#0A0D12] px-2.5 py-1 tabular-nums">
                সাইজ: <strong className="text-[#EAC779]">{toBanglaDigits(Math.round(fontSizeScale * 100))}%</strong>
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-[#D4A853]/25 bg-[#0A0D12] p-5 space-y-3">
            <p className="text-xs font-semibold tracking-wide text-[#EAC779]">নমুনা কার্ড ও টাইপোগ্রাফি</p>
            <h3 className="font-display text-xl font-bold text-[#F5EFE2]">
              শ্রেণি ১–১২ একাডেমিক ও অ্যাডমিশন প্রশ্নপত্র তৈরি — ২০২৬
            </h3>
            <p className="text-sm text-[#C2C8D3] leading-relaxed">
              এই অনুচ্ছেদটি আপনার নির্বাচিত ফন্ট ({activeFont.name}) এবং ফন্ট সাইজে প্রদর্শিত হচ্ছে। নিচের ছোট টেক্সট, বাটন ও ব্যাজ দেখে সহজেই পাঠযোগ্যতা যাচাই করুন।
            </p>
            <p className="text-xs text-[#9DA6B5]">
              ছোট টেক্সট নমুনা: ঢাকা বোর্ড ২০২৫ • গণিত • অধ্যায় ১: বাস্তব সংখ্যা • সময়: ৬০ মিনিট • পূর্ণমান: ৫০
            </p>
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <Button size="sm">প্রশ্নপত্র তৈরি করুন</Button>
              <Button variant="outline" size="sm">প্রিভিউ দেখুন</Button>
              <StatusTag tone="active" label="সক্রিয় থিম" />
              <StatusTag tone="pending" label="নমুনা ট্যাগ" />
            </div>
          </div>
        </Card>

        {/* Section 1: Color Mode & Custom Themes */}
        <Card className="p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Palette className="h-5 w-5 text-[#EAC779]" />
              <div>
                <h2 className="font-display text-lg font-bold text-[#F5EFE2]">১. কালার মোড ও কাস্টম থিম</h2>
                <p className="text-xs text-[#9DA6B5]">পছন্দের যেকোনো থিমে ক্লিক করলেই পুরো ওয়েবসাইটে তাৎক্ষণিকভাবে প্রয়োগ হবে।</p>
              </div>
            </div>

            {/* Dark / Light Mode Toggle */}
            <div className="inline-flex rounded-lg border border-[#D4A853]/30 bg-[#0A0D12] p-1">
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-sm font-semibold transition-colors cursor-pointer ${
                  theme === 'dark'
                    ? 'gold-btn'
                    : 'text-[#B8C0CE] hover:text-[#F5EFE2]'
                }`}
              >
                <Moon className="h-4 w-4" />
                <span>ডার্ক মোড</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-sm font-semibold transition-colors cursor-pointer ${
                  theme === 'light'
                    ? 'gold-btn'
                    : 'text-[#B8C0CE] hover:text-[#F5EFE2]'
                }`}
              >
                <Sun className="h-4 w-4" />
                <span>লাইট মোড</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {THEME_PRESETS.map((preset) => {
              const isSelected = themePreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setThemePreset(preset.id);
                    pushToast({
                      title: `${preset.nameBn} চালু হয়েছে`,
                      description: 'নতুন কালার থিম পুরো ওয়েবসাইটে প্রয়োগ করা হয়েছে।',
                      variant: 'success',
                    });
                  }}
                  className={`group relative rounded-xl border p-4 text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#EAC779] bg-[#D4A853]/12 shadow-md'
                      : 'border-[#D4A853]/25 bg-[#0A0D12] hover:border-[#EAC779]/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-6 w-6 rounded-full border border-white/25 shadow-sm"
                        style={{ background: preset.swatchPrimary }}
                      />
                      <span
                        className="h-5 w-5 -ml-3 rounded-full border border-white/25 shadow-sm"
                        style={{ background: preset.swatchSecondary }}
                      />
                      <span
                        className="h-5 w-5 rounded-md border border-white/20"
                        style={{ background: theme === 'light' ? preset.swatchBgLight : preset.swatchBgDark }}
                        title="ব্যাকগ্রাউন্ড প্রিভিউ"
                      />
                    </div>
                    {isSelected && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-[#D4A853] px-2 py-0.5 text-xs font-bold text-[#090B0E]">
                        <Check className="h-3.5 w-3.5" />
                        নির্বাচিত
                      </span>
                    )}
                  </div>
                  <p className="mt-3 text-base font-bold text-[#F5EFE2]">{preset.nameBn}</p>
                  <p className="mt-1 text-xs text-[#9DA6B5] leading-relaxed">{preset.descriptionBn}</p>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Section 2: Global Font Size Control */}
        <Card className="p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Type className="h-5 w-5 text-[#EAC779]" />
              <div>
                <h2 className="font-display text-lg font-bold text-[#F5EFE2]">২. গ্লোবাল ফন্ট সাইজ কন্ট্রোল</h2>
                <p className="text-xs text-[#9DA6B5]">
                  পুরো ওয়েবসাইটের সব হেডিং, প্যারাগ্রাফ ও ছোট টেক্সট একসাথে বড় বা ছোট করে দেখুন।
                </p>
              </div>
            </div>
            <span className="rounded-lg border border-[#D4A853]/35 bg-[#0A0D12] px-3 py-1.5 text-sm font-bold text-[#EAC779] tabular-nums">
              বর্তমান স্কেল: {toBanglaDigits(Math.round(fontSizeScale * 100))}% ({toBanglaDigits((16 * fontSizeScale).toFixed(1))}px)
            </span>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <span className="text-xs font-semibold text-[#9DA6B5] shrink-0">ছোট (৯০%)</span>
              <input
                type="range"
                min={0.9}
                max={1.25}
                step={0.02}
                value={fontSizeScale}
                onChange={(e) => setFontSizeScale(Number(e.target.value))}
                aria-label="ফন্ট সাইজ স্কেল"
                className="w-full accent-[#D4A853] cursor-pointer"
              />
              <span className="text-base font-semibold text-[#F5EFE2] shrink-0">বড় (১২৫%)</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {FONT_SIZE_PRESETS.map((preset) => {
                const active = Math.abs(fontSizeScale - preset.scale) < 0.015;
                return (
                  <button
                    key={preset.labelBn}
                    type="button"
                    onClick={() => setFontSizeScale(preset.scale)}
                    className={`rounded-lg border px-3.5 py-2 text-sm font-semibold transition-colors cursor-pointer ${
                      active
                        ? 'gold-btn'
                        : 'border-[#D4A853]/30 bg-[#0A0D12] text-[#C2C8D3] hover:border-[#EAC779]'
                    }`}
                  >
                    {preset.labelBn} ({preset.pctLabel})
                  </button>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Section 3: Locally Downloaded & Bundled Website Fonts */}
        <Card className="p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold text-[#F5EFE2]">
                ৩. ডাউনলোডকৃত বাংলা ও জনপ্রিয় ওয়েব ফন্ট ({toBanglaDigits(SITE_FONT_OPTIONS.length)}টি ফন্ট)
              </h2>
              <p className="mt-0.5 text-xs text-[#9DA6B5]">
                সবগুলো ফন্ট আপনার ওয়েবসাইটে লোকালি ডাউনলোড ও বান্ডেল করা হয়েছে — ক্লিক করলেই পুরো সাইটের ফন্ট পরিবর্তন হবে।
              </p>
            </div>

            <div className="inline-flex rounded-lg border border-[#D4A853]/30 bg-[#0A0D12] p-1 text-xs font-semibold">
              {[
                { id: 'all' as const, label: 'সব ফন্ট' },
                { id: 'bangla' as const, label: 'বাংলা ফন্ট (৭টি)' },
                { id: 'global' as const, label: 'গ্লোবাল ওয়েব ফন্ট (৪টি)' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFontFilter(tab.id)}
                  className={`rounded-md px-3 py-1.5 transition-colors cursor-pointer ${
                    fontFilter === tab.id ? 'gold-btn' : 'text-[#B8C0CE] hover:text-[#F5EFE2]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
            {filteredFonts.map((font) => {
              const isSelected = fontFamilyId === font.id;
              return (
                <button
                  key={font.id}
                  type="button"
                  onClick={() => {
                    setFontFamilyId(font.id);
                    pushToast({
                      title: `${font.name} ফন্ট সক্রিয় হয়েছে`,
                      description: 'পুরো ওয়েবসাইটের ফন্ট আপডেট করা হয়েছে।',
                      variant: 'success',
                    });
                  }}
                  className={`rounded-xl border p-4 text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#EAC779] bg-[#D4A853]/12 shadow-md'
                      : 'border-[#D4A853]/25 bg-[#0A0D12] hover:border-[#EAC779]/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-base font-bold text-[#F5EFE2]">{font.name}</p>
                      <p className="text-xs text-[#9DA6B5]">{font.labelBn}</p>
                    </div>
                    <span
                      className={`rounded-md px-2.5 py-1 text-xs font-semibold shrink-0 ${
                        isSelected
                          ? 'bg-[#D4A853] text-[#090B0E]'
                          : 'border border-[#D4A853]/30 text-[#EAC779]'
                      }`}
                    >
                      {isSelected ? 'ব্যবহৃত হচ্ছে' : 'ব্যবহার করুন'}
                    </span>
                  </div>
                  <p
                    className="mt-3 rounded-lg border border-[#D4A853]/15 bg-[#12161F] px-3 py-2.5 text-base text-[#F5EFE2]"
                    style={{ fontFamily: font.cssFamily }}
                  >
                    {font.sampleBn}
                  </p>
                </button>
              );
            })}
          </div>
        </Card>

        {/* System / Database Info Card */}
        <Card className="p-6 space-y-2.5">
          <h2 className="font-display text-lg font-semibold text-[#F5EFE2]">ডাটাবেস ও সুরক্ষা</h2>
          <p className="text-sm text-[#B8C0CE] leading-relaxed">
            প্রশ্ন, সাবস্ক্রিপশন, পেমেন্ট, ব্যবহারকারী এবং সংরক্ষিত প্রশ্নপত্র Supabase PostgreSQL ও লোকাল প্রোটোটাইপ স্টোরেজে সংরক্ষিত থাকে। উপরের UI থিম, ফন্ট এবং ফন্ট সাইজ পরিবর্তন আপনার ব্রাউজারে তাৎক্ষণিকভাবে সংরক্ষিত হয়।
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h1 className="font-display text-2xl font-bold gold-text-gradient">কার্যক্রম লগ ও প্রতিবেদন</h1>
        <p className="mt-1 text-base text-[#B8C0CE]">
          পেমেন্ট অনুমোদন, প্রশ্ন হালনাগাদ, প্রশ্নপত্র তৈরি ও ম্যানুয়াল সক্রিয়করণের অডিট তালিকা।
        </p>
      </Card>

      <Card className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[#D4A853]/20 bg-[#0A0D12] text-sm font-semibold text-[#EAC779]">
            <tr>
              <th className="px-4 py-3">সময়</th>
              <th className="px-4 py-3">সম্পাদনকারী</th>
              <th className="px-4 py-3">কার্যক্রম</th>
              <th className="px-4 py-3">বিস্তারিত</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D4A853]/15">
            {state.activityLogs.map((log) => (
              <tr key={log.id} className="hover:bg-white/[0.02]">
                <td className="px-4 py-3 text-sm text-[#8C95A4] tabular-nums">
                  {formatBnDateTime(log.createdAt)}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-[#F5EFE2]">
                  {log.actorName} ({getRoleLabelBn(log.actorRole)})
                </td>
                <td className="px-4 py-3 font-medium text-[#EAC779]">{log.action}</td>
                <td className="px-4 py-3 text-sm text-[#B8C0CE]">{log.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
