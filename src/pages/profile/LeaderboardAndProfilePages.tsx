import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Award,
  BarChart3,
  BookOpen,
  Calendar,
  EyeOff,
  GraduationCap,
  Lock,
  Medal,
  School,
  Trophy,
} from 'lucide-react';
import { Card, EmptyState, Select } from '../../components/ui/Primitives';
import { useAuth } from '../../contexts/AuthContext';
import { formatBnDate, toBanglaDigits } from '../../lib/bn';
import { profileService } from '../../services/profileService';
import { questionBankService } from '../../services/questionBankService';
import type { LeaderboardEntry, StudentPublicProfileView } from '../../types/domain';

function AvatarMonogram({
  name,
  avatarUrl,
  size = 'md',
}: {
  name: string;
  avatarUrl?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const [imgError, setImgError] = useState(false);
  const dim =
    size === 'lg'
      ? 'h-20 w-20 text-2xl'
      : size === 'sm'
      ? 'h-9 w-9 text-sm'
      : 'h-12 w-12 text-base';

  if (avatarUrl && !imgError) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        onError={() => setImgError(true)}
        className={`${dim} rounded-full object-cover border border-[#D4A853]/50 shrink-0`}
      />
    );
  }

  const initial = (name || 'শ').trim().slice(0, 1);
  return (
    <div
      className={`${dim} rounded-full border border-[#D4A853]/50 bg-[#141822] text-[#EAC779] font-bold flex items-center justify-center shrink-0`}
      aria-hidden="true"
    >
      {initial}
    </div>
  );
}

export function LeaderboardPage() {
  const { classes, subjects } = questionBankService.getAcademicCatalogue();
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const filteredSubjects = useMemo(
    () => (classId ? subjects.filter((s) => s.classId === classId) : subjects),
    [classId, subjects]
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    profileService
      .getLeaderboard({
        classId: classId || undefined,
        subjectId: subjectId || undefined,
      })
      .then((res) => {
        if (active) setEntries(res.entries);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [classId, subjectId]);

  const topThree = entries.slice(0, 3);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 space-y-8 font-bangla text-[#F3EEE3]">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold tracking-widest text-[#D4A853]">
            LIVE EXAM LEADERBOARD
          </p>
          <h1 className="mt-1 font-display text-3xl sm:text-4xl font-bold gold-text-gradient">
            মেধা তালিকা ও লিডারবোর্ড
          </h1>
          <p className="mt-2 text-base text-[#B8C0CE]">
            লাইভ পরীক্ষার মোট নম্বর, অংশগ্রহণ এবং বিষয়ভিত্তিক পারফরম্যান্স অনুযায়ী শীর্ষ শিক্ষার্থীদের অবস্থান।
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            to="/exams"
            className="rounded-lg gold-btn px-4 py-2.5 text-sm font-bold whitespace-nowrap"
          >
            লাইভ পরীক্ষায় অংশ নিন
          </Link>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 items-end">
          <div>
            <label htmlFor="lb-class" className="block text-xs font-semibold text-[#EAC779] mb-1.5">
              শ্রেণি অনুযায়ী ফিল্টার
            </label>
            <Select
              id="lb-class"
              value={classId}
              onChange={(e) => {
                setClassId(e.target.value);
                setSubjectId('');
              }}
            >
              <option value="">সকল শ্রেণি</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nameBn}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label htmlFor="lb-subject" className="block text-xs font-semibold text-[#EAC779] mb-1.5">
              বিষয়ভিত্তিক র‍্যাংকিং
            </label>
            <Select
              id="lb-subject"
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
            >
              <option value="">সকল বিষয় (সামগ্রিক)</option>
              {filteredSubjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nameBn} ({s.code})
                </option>
              ))}
            </Select>
          </div>
          <div className="text-sm text-[#B8C0CE] tabular-nums sm:text-right">
            মোট র‍্যাংককৃত পরীক্ষার্থী:{' '}
            <strong className="text-[#EAC779]">{toBanglaDigits(entries.length)} জন</strong>
          </div>
        </div>
      </Card>

      {/* Top 3 Podium */}
      {!loading && topThree.length > 0 && (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {topThree.map((entry, idx) => {
            const rankLabels = ['প্রথম স্থান', 'দ্বিতীয় স্থান', 'তৃতীয় স্থান'];
            const accentBorders = [
              'border-[#EAC779] bg-[#D4A853]/10',
              'border-[#C2C8D3]/50',
              'border-[#B87333]/55',
            ];
            return (
              <Link
                key={entry.userId}
                to={`/students/${entry.userId}`}
                className={`obsidian-card-interactive rounded-xl p-5 flex flex-col justify-between space-y-4 ${accentBorders[idx]}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <AvatarMonogram name={entry.fullName} avatarUrl={entry.avatarUrl} />
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-[#EAC779]">
                        #{toBanglaDigits(entry.rank)} • {rankLabels[idx]}
                      </span>
                      <h2 className="text-lg font-bold text-[#F5EFE2] truncate">
                        {entry.fullName}
                      </h2>
                      <p className="text-xs text-[#9DA6B5] truncate">
                        {entry.institution || 'প্রতিষ্ঠানের তথ্য ব্যক্তিগত'}
                      </p>
                    </div>
                  </div>
                  {idx === 0 ? (
                    <Trophy className="h-6 w-6 text-[#EAC779] shrink-0" />
                  ) : (
                    <Medal className="h-6 w-6 text-[#C2C8D3] shrink-0" />
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 border-t border-[#D4A853]/20 pt-3 text-center tabular-nums">
                  <div>
                    <p className="text-lg font-bold gold-text-gradient">
                      {toBanglaDigits(entry.totalScore)}
                    </p>
                    <p className="text-[11px] text-[#9DA6B5]">মোট নম্বর</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-[#F5EFE2]">
                      {toBanglaDigits(entry.examsParticipated)}
                    </p>
                    <p className="text-[11px] text-[#9DA6B5]">পরীক্ষা</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-emerald-400">
                      {toBanglaDigits(entry.averagePercent)}%
                    </p>
                    <p className="text-[11px] text-[#9DA6B5]">গড় নির্ভুলতা</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Full Leaderboard Table */}
      {loading ? (
        <Card className="p-8 text-center text-[#B8C0CE]">লিডারবোর্ড লোড হচ্ছে...</Card>
      ) : entries.length === 0 ? (
        <EmptyState
          title="এই ফিল্টারে কোনো ফলাফল নেই"
          description="ভিন্ন শ্রেণি বা বিষয় নির্বাচন করুন অথবা একটি লাইভ পরীক্ষায় অংশগ্রহণ করুন।"
          icon={<Trophy className="h-5 w-5" />}
        />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#D4A853]/20 bg-[#0A0D12] text-xs uppercase tracking-wider text-[#EAC779]">
              <tr>
                <th className="px-4 py-3.5">র‍্যাংক</th>
                <th className="px-4 py-3.5">শিক্ষার্থী</th>
                <th className="px-4 py-3.5">শ্রেণি ও প্রতিষ্ঠান</th>
                <th className="px-4 py-3.5">সেরা বিষয়</th>
                <th className="px-4 py-3.5 text-right">পরীক্ষা</th>
                <th className="px-4 py-3.5 text-right">গড়</th>
                <th className="px-4 py-3.5 text-right">মোট নম্বর</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D4A853]/15 tabular-nums">
              {entries.map((entry) => (
                <tr key={entry.userId} className="hover:bg-white/[0.03] transition-colors">
                  <td className="px-4 py-3.5 font-mono font-bold text-[#EAC779]">
                    #{toBanglaDigits(entry.rank)}
                  </td>
                  <td className="px-4 py-3.5">
                    <Link
                      to={`/students/${entry.userId}`}
                      className="inline-flex items-center gap-2.5 group"
                    >
                      <AvatarMonogram
                        name={entry.fullName}
                        avatarUrl={entry.avatarUrl}
                        size="sm"
                      />
                      <span className="font-semibold text-[#F5EFE2] group-hover:text-[#EAC779] transition-colors">
                        {entry.fullName}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3.5 text-[#B8C0CE]">
                    <span className="block text-xs text-[#EAC779]">{entry.className || '—'}</span>
                    <span className="text-xs text-[#9DA6B5]">
                      {entry.institution || 'প্রতিষ্ঠান গোপনীয়'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-[#C2C8D3]">
                    {entry.bestSubjectName || '—'}
                  </td>
                  <td className="px-4 py-3.5 text-right text-[#E5E0D5]">
                    {toBanglaDigits(entry.examsParticipated)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-semibold text-emerald-400">
                    {toBanglaDigits(entry.averagePercent)}%
                  </td>
                  <td className="px-4 py-3.5 text-right font-bold text-[#EAC779]">
                    {toBanglaDigits(entry.totalScore)}
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

export function PublicStudentProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { user: viewer } = useAuth();
  const [profile, setProfile] = useState<StudentPublicProfileView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    profileService
      .getStudentPublicProfile(userId)
      .then((res) => {
        if (active) setProfile(res.profile);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'প্রোফাইল লোড করা যায়নি।');
      });
    return () => {
      active = false;
    };
  }, [userId, viewer?.id]);

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <EmptyState
          title="শিক্ষার্থীর প্রোফাইল পাওয়া যায়নি"
          description={error}
          icon={<GraduationCap className="h-5 w-5" />}
          action={
            <Link to="/leaderboard" className="rounded-lg gold-btn px-4 py-2 text-sm font-bold">
              লিডারবোর্ডে ফিরুন
            </Link>
          }
        />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 text-center text-[#B8C0CE] font-bangla">
        শিক্ষার্থীর প্রোফাইল লোড হচ্ছে...
      </div>
    );
  }

  const isOwnProfile = viewer?.id === profile.userId;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 space-y-6 font-bangla text-[#F3EEE3]">
      <div className="flex items-center justify-between gap-4">
        <Link to="/leaderboard" className="text-sm font-semibold text-[#EAC779] hover:underline">
          ← লিডারবোর্ডে ফিরে যান
        </Link>
        {isOwnProfile && (
          <Link
            to="/dashboard/profile"
            className="rounded-lg gold-outline-btn px-3.5 py-1.5 text-xs font-semibold"
          >
            প্রোফাইল ও গোপনীয়তা সম্পাদনা করুন
          </Link>
        )}
      </div>

      {/* Profile Header Card */}
      <Card className="p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <AvatarMonogram name={profile.fullName} avatarUrl={profile.avatarUrl} size="lg" />
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="font-display text-2xl sm:text-3xl font-bold gold-text-gradient">
                  {profile.fullName}
                </h1>
                {profile.className && (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded border border-[#D4A853]/35 bg-[#141822] text-[#EAC779]">
                    {profile.className}
                  </span>
                )}
              </div>
              {profile.institution ? (
                <p className="inline-flex items-center gap-1.5 text-sm text-[#C2C8D3]">
                  <School className="h-4 w-4 text-[#D4A853]" />
                  <span>{profile.institution}</span>
                </p>
              ) : (
                <p className="inline-flex items-center gap-1.5 text-xs text-[#8C95A4]">
                  <EyeOff className="h-3.5 w-3.5" />
                  <span>প্রতিষ্ঠানের নাম গোপনীয় রাখা হয়েছে</span>
                </p>
              )}
              {profile.bio && (
                <p className="text-sm text-[#9DA6B5] max-w-2xl pt-1">{profile.bio}</p>
              )}
            </div>
          </div>

          {profile.stats.leaderboardRank !== null && (
            <div className="rounded-xl border border-[#D4A853]/35 bg-[#0A0D12] px-5 py-3 text-center shrink-0 tabular-nums">
              <p className="text-xs text-[#9DA6B5]">লিডারবোর্ড অবস্থান</p>
              <p className="text-3xl font-bold gold-text-gradient">
                #{toBanglaDigits(profile.stats.leaderboardRank)}
              </p>
            </div>
          )}
        </div>
      </Card>

      {profile.isPrivate ? (
        <Card className="p-8 text-center space-y-3">
          <Lock className="h-8 w-8 text-[#D4A853] mx-auto" />
          <h2 className="text-xl font-bold text-[#F5EFE2]">এই প্রোফাইলটি ব্যক্তিগত (Private)</h2>
          <p className="text-sm text-[#B8C0CE] max-w-md mx-auto">
            শিক্ষার্থী তার গোপনীয়তা সেটিংসের মাধ্যমে বিস্তারিত পরিসংখ্যান ও পরীক্ষার ইতিহাস শুধুমাত্র নিজের জন্য সংরক্ষিত রেখেছেন।
          </p>
        </Card>
      ) : (
        <>
          {/* 4 KPI Cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 tabular-nums">
            <Card className="p-4">
              <p className="text-xs text-[#9DA6B5]">অংশগ্রহণকৃত পরীক্ষা</p>
              <p className="mt-1 text-2xl font-bold text-[#F5EFE2]">
                {toBanglaDigits(profile.stats.examsParticipated)}টি
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-[#9DA6B5]">মোট অর্জিত নম্বর</p>
              <p className="mt-1 text-2xl font-bold gold-text-gradient">
                {toBanglaDigits(profile.stats.totalScore)} /{' '}
                {toBanglaDigits(profile.stats.totalPossibleMarks)}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-[#9DA6B5]">গড় পারফরম্যান্স</p>
              <p className="mt-1 text-2xl font-bold text-emerald-400">
                {toBanglaDigits(profile.stats.averagePercent)}%
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-[#9DA6B5]">অর্জিত ব্যাজ</p>
              <p className="mt-1 text-2xl font-bold text-[#EAC779]">
                {toBanglaDigits(profile.achievements.length)}টি
              </p>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Subject-wise Performance */}
            <Card className="lg:col-span-6 p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-[#D4A853]/20 pb-3">
                <BarChart3 className="h-5 w-5 text-[#EAC779]" />
                <h2 className="text-lg font-bold text-[#F5EFE2]">বিষয়ভিত্তিক পারফরম্যান্স</h2>
              </div>
              {profile.subjectPerformance.length === 0 ? (
                <p className="text-sm text-[#8C95A4]">
                  {profile.privacySettings.showSubjectPerformance
                    ? 'এখনো কোনো বিষয়ভিত্তিক ডেটা নেই।'
                    : 'গোপনীয়তা সেটিংস দ্বারা বিষয়ভিত্তিক তথ্য আড়ালকৃত।'}
                </p>
              ) : (
                <div className="space-y-4 tabular-nums">
                  {profile.subjectPerformance.map((sub) => (
                    <div key={sub.subjectId}>
                      <div className="flex items-center justify-between text-sm mb-1.5">
                        <span className="font-semibold text-[#E5E0D5]">
                          {sub.subjectName}{' '}
                          <span className="text-xs text-[#8C95A4]">
                            ({toBanglaDigits(sub.examsCount)} পরীক্ষা)
                          </span>
                        </span>
                        <span className="font-mono text-[#EAC779]">
                          {toBanglaDigits(sub.averagePercent)}%
                        </span>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-[#171C26] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#B88632] to-[#EAC779]"
                          style={{ width: `${Math.min(100, sub.averagePercent)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Achievements */}
            <Card className="lg:col-span-6 p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-[#D4A853]/20 pb-3">
                <Award className="h-5 w-5 text-[#EAC779]" />
                <h2 className="text-lg font-bold text-[#F5EFE2]">অর্জনসমূহ</h2>
              </div>
              {profile.achievements.length === 0 ? (
                <p className="text-sm text-[#8C95A4]">
                  {profile.privacySettings.showAchievements
                    ? 'লাইভ পরীক্ষায় অংশ নিয়ে প্রথম অর্জন আনলক করুন।'
                    : 'গোপনীয়তা সেটিংস দ্বারা অর্জনসমূহ আড়ালকৃত।'}
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {profile.achievements.map((ach) => (
                    <div
                      key={ach.id}
                      className="rounded-lg border border-[#D4A853]/25 bg-[#0A0D12] p-3.5 space-y-1"
                    >
                      <div className="flex items-center gap-2 text-[#EAC779]">
                        <Trophy className="h-4 w-4 shrink-0" />
                        <span className="text-sm font-bold">{ach.title}</span>
                      </div>
                      <p className="text-xs text-[#B8C0CE] leading-relaxed">{ach.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Exam History */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-[#D4A853]/20 pb-3">
              <BookOpen className="h-5 w-5 text-[#EAC779]" />
              <h2 className="text-lg font-bold text-[#F5EFE2]">সাম্প্রতিক পরীক্ষার ইতিহাস</h2>
            </div>
            {profile.examHistory.length === 0 ? (
              <p className="text-sm text-[#8C95A4]">
                {profile.privacySettings.showExamHistory
                  ? 'এখনো কোনো লাইভ পরীক্ষায় অংশ নেওয়া হয়নি।'
                  : 'গোপনীয়তা সেটিংস দ্বারা পরীক্ষার ইতিহাস আড়ালকৃত।'}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm tabular-nums">
                  <thead className="border-b border-[#D4A853]/15 text-xs text-[#EAC779]">
                    <tr>
                      <th className="py-2.5 pr-4">পরীক্ষার নাম</th>
                      <th className="py-2.5 pr-4">বিষয়</th>
                      <th className="py-2.5 pr-4">তারিখ</th>
                      <th className="py-2.5 pr-4 text-right">নির্ভুলতা</th>
                      <th className="py-2.5 text-right">প্রাপ্ত নম্বর</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D4A853]/10">
                    {profile.examHistory.map((h) => (
                      <tr key={h.attemptId}>
                        <td className="py-3 pr-4 font-medium text-[#F5EFE2]">{h.examTitle}</td>
                        <td className="py-3 pr-4 text-xs text-[#B8C0CE]">{h.subjectName}</td>
                        <td className="py-3 pr-4 text-xs text-[#9DA6B5]">
                          <Calendar className="inline h-3.5 w-3.5 mr-1 text-[#D4A853]" />
                          {formatBnDate(h.submittedAt)}
                        </td>
                        <td className="py-3 pr-4 text-right text-emerald-400 font-semibold">
                          {toBanglaDigits(h.accuracyPercent)}%
                        </td>
                        <td className="py-3 text-right font-bold text-[#EAC779]">
                          {toBanglaDigits(h.finalScore)} / {toBanglaDigits(h.totalMarks)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
