import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  BookOpen,
  CheckCircle2,
  CreditCard,
  Globe,
  GraduationCap,
  Layers,
  Plus,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import {
  Button,
  Card,
  FormField,
  Modal,
  StatusTag,
  Textarea,
} from '../../components/ui/Primitives';
import { QuestionTypeQuickAddBar } from '../../components/admin/QuestionTypeButtons';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { formatBnDateTime, formatBnNumber, toBanglaDigits } from '../../lib/bn';
import { isSubscriptionCurrentlyActive } from '../../lib/rules';
import { questionBankService } from '../../services/questionBankService';
import type { Payment, QuestionTypeCode } from '../../types/domain';

export function AdminOverviewPage() {
  const { user, revision, bumpRevision } = useAuth();
  const { pushToast } = useToast();
  const [inspectPayment, setInspectPayment] = useState<Payment | null>(null);
  const [reviewNote, setReviewNote] = useState('');

  const state = useMemo(
    () => (user?.role === 'admin' ? questionBankService.getAdminDashboardSnapshot(user) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, revision]
  );

  if (!user || user.role !== 'admin' || !state) return null;

  const students = state.users.filter((u) => u.role === 'student');
  const activeSubs = state.subscriptions.filter((s) => isSubscriptionCurrentlyActive(s));
  const expiredSubs = state.subscriptions.filter((s) => !isSubscriptionCurrentlyActive(s));
  const pendingPayments = state.payments.filter((p) => p.status === 'pending');
  const approvedPayments = state.payments.filter((p) => p.status === 'approved');
  const totalRevenue = approvedPayments.reduce((sum, p) => sum + p.submittedAmountBdt, 0);
  const unreadMessages = state.contactMessages.filter((m) => m.status === 'unread').length;

  const classBreakdown = state.classes.map((cls) => {
    const qCount = state.questions.filter((q) => q.classId === cls.id).length;
    const subCount = activeSubs.filter((s) => s.grantedClassIds.includes(cls.id)).length;
    return {
      id: cls.id,
      name: cls.nameBn || cls.name,
      qCount,
      subCount,
    };
  });
  const maxQ = Math.max(1, ...classBreakdown.map((c) => c.qCount));

  const countsByType = state.questions.reduce<Partial<Record<QuestionTypeCode, number>>>((acc, q) => {
    acc[q.questionTypeCode] = (acc[q.questionTypeCode] || 0) + 1;
    return acc;
  }, {});

  const getPayer = (userId: string) => state.users.find((u) => u.id === userId);

  const handleQuickDecision = (decision: 'approved' | 'rejected') => {
    if (!inspectPayment) return;
    try {
      questionBankService.reviewPayment(user, inspectPayment.id, decision, reviewNote);
      setInspectPayment(null);
      setReviewNote('');
      bumpRevision();
      pushToast({
        title:
          decision === 'approved'
            ? 'পেমেন্ট অনুমোদিত ও সাবস্ক্রিপশন সক্রিয় হয়েছে'
            : 'পেমেন্ট বাতিল করা হয়েছে',
        description:
          decision === 'approved'
            ? 'শিক্ষার্থীর শ্রেণি এক্সেস তাৎক্ষণিকভাবে চালু হয়েছে।'
            : 'বাতিলের নোট সংরক্ষণ করা হয়েছে।',
        variant: decision === 'approved' ? 'success' : 'info',
      });
    } catch (err) {
      pushToast({
        title: 'যাচাই প্রক্রিয়া সম্পন্ন করা যায়নি',
        description: err instanceof Error ? err.message : 'সিদ্ধান্ত গ্রহণে ত্রুটি হয়েছে।',
        variant: 'error',
      });
    }
  };

  const quickModules = [
    {
      to: '/admin/academic',
      title: 'একাডেমিক কাঠামো',
      meta: `${toBanglaDigits(state.classes.length)} শ্রেণি · ${toBanglaDigits(state.subjects.length)} বিষয় · ${toBanglaDigits(state.chapters.length)} অধ্যায়`,
      icon: <Layers className="h-5 w-5 text-[#EAC779]" />,
    },
    {
      to: '/admin/questions',
      title: 'প্রশ্নভাণ্ডার ও বাল্ক ইমপোর্ট',
      meta: `${formatBnNumber(state.questions.length)}টি মাস্টার প্রশ্ন`,
      icon: <BookOpen className="h-5 w-5 text-[#EAC779]" />,
    },
    {
      to: '/admin/plans',
      title: 'সাবস্ক্রিপশন প্ল্যান ও মূল্য',
      meta: `${toBanglaDigits(state.plans.filter((p) => p.isActive).length)}টি সক্রিয় প্ল্যান`,
      icon: <ShieldCheck className="h-5 w-5 text-[#EAC779]" />,
    },
    {
      to: '/admin/subscribers',
      title: 'সাবস্ক্রাইবার ও ম্যানুয়াল এক্সেস',
      meta: `${toBanglaDigits(activeSubs.length)} জন সক্রিয় · ${toBanglaDigits(expiredSubs.length)} জন মেয়াদোত্তীর্ণ`,
      icon: <GraduationCap className="h-5 w-5 text-[#EAC779]" />,
    },
    {
      to: '/admin/website',
      title: 'ওয়েবসাইট, নোটিশ ও বার্তা',
      meta: `${toBanglaDigits(unreadMessages)}টি অপঠিত যোগাযোগ বার্তা`,
      icon: <Globe className="h-5 w-5 text-[#EAC779]" />,
    },
    {
      to: '/admin/logs',
      title: 'কার্যক্রম লগ ও সেটিংস',
      meta: `${formatBnNumber(state.activityLogs.length)}টি অডিট রেকর্ড`,
      icon: <Activity className="h-5 w-5 text-[#EAC779]" />,
    },
  ];

  return (
    <div className="space-y-6 font-bangla">
      {/* Executive Obsidian & Gold Header Banner */}
      <div className="obsidian-chamfer overflow-hidden rounded-xl p-6 bg-[radial-gradient(ellipse_at_top_right,rgba(212,168,83,0.16),transparent_65%)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-bold tracking-wider text-[#D4A853]">
              প্রশ্নব্যাংক প্রশাসন · {user.fullName}
            </p>
            <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold tracking-tight gold-text-gradient">
              অ্যাডমিন কন্ট্রোল ওভারভিউ
            </h1>
            <p className="mt-2 text-base text-[#C2C8D3] leading-relaxed">
              ম্যানুয়াল পেমেন্ট অনুমোদন, শ্রেণিভিত্তিক প্রশ্নভাণ্ডার, সাবস্ক্রিপশন প্ল্যান এবং শিক্ষার্থী পরিচালনা—এক জায়গায় সম্পূর্ণ নিয়ন্ত্রণ।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              to="/admin/payments"
              className="inline-flex items-center gap-2 rounded-lg gold-outline-btn px-4 py-2.5 text-sm font-semibold whitespace-nowrap"
            >
              <CreditCard className="h-4 w-4 text-[#EAC779]" />
              <span>অপেক্ষমাণ পেমেন্ট ({toBanglaDigits(pendingPayments.length)})</span>
            </Link>
            <Link
              to="/admin/questions/new"
              className="inline-flex items-center gap-2 rounded-lg gold-btn px-4 py-2.5 text-sm font-bold whitespace-nowrap"
            >
              <Plus className="h-4 w-4" />
              <span>নতুন প্রশ্ন যোগ করুন</span>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Metrics Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {[
          { label: 'মোট শিক্ষার্থী', value: formatBnNumber(students.length) },
          { label: 'সক্রিয় সাবস্ক্রিপশন', value: formatBnNumber(activeSubs.length) },
          { label: 'মেয়াদোত্তীর্ণ / নিষ্ক্রিয়', value: formatBnNumber(expiredSubs.length) },
          { label: 'অপেক্ষমাণ পেমেন্ট', value: formatBnNumber(pendingPayments.length) },
          { label: 'অনুমোদিত আয়', value: `৳${formatBnNumber(totalRevenue)}` },
          { label: 'মোট মাস্টার প্রশ্ন', value: formatBnNumber(state.questions.length) },
        ].map((kpi) => (
          <Card key={kpi.label} className="p-4">
            <p className="text-xs font-medium text-[#9DA6B5]">{kpi.label}</p>
            <p className="mt-2 font-display text-2xl font-bold gold-text-gradient tabular-nums">
              {kpi.value}
            </p>
          </Card>
        ))}
      </div>

      {/* Quick Add Question by Type */}
      <Card className="p-5 space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-[#F5EFE2]">
              ধরন অনুযায়ী নতুন প্রশ্ন যোগ করুন
            </h2>
            <p className="text-sm text-[#B8C0CE]">
              প্রশ্নের ধরন বেছে নিয়ে সরাসরি সংশ্লিষ্ট ফর্ম ও ফাংশন টুলসসহ নতুন প্রশ্ন তৈরি করুন।
            </p>
          </div>
          <Link
            to="/admin/questions"
            className="text-sm font-semibold text-[#EAC779] hover:underline whitespace-nowrap"
          >
            সকল প্রশ্ন দেখুন →
          </Link>
        </div>
        <QuestionTypeQuickAddBar
          questionTypes={state.questionTypes}
          countsByType={countsByType}
        />
      </Card>

      {/* Reports & Interactive Pending Queue */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-6 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-[#F5EFE2]">
              শ্রেণি অনুযায়ী প্রশ্ন ও সক্রিয় সাবস্ক্রাইবার
            </h2>
            <Link to="/admin/questions" className="text-sm font-semibold text-[#EAC779] hover:underline">
              প্রশ্ন ব্যবস্থাপনা →
            </Link>
          </div>
          <div className="space-y-3.5">
            {classBreakdown.map((item) => (
              <div key={item.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-[#F5EFE2]">{item.name}</span>
                  <span className="text-[#B8C0CE] tabular-nums">
                    {toBanglaDigits(item.qCount)}টি প্রশ্ন · {toBanglaDigits(item.subCount)} জন সক্রিয়
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#171C26]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#B88632] to-[#EAC779]"
                    style={{ width: `${Math.round((item.qCount / maxQ) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-6 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-[#F5EFE2]">
              অপেক্ষমাণ ম্যানুয়াল পেমেন্ট কিউ
            </h2>
            <Link to="/admin/payments" className="text-sm font-semibold text-[#EAC779] hover:underline">
              সম্পূর্ণ তালিকা →
            </Link>
          </div>

          {pendingPayments.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#D4A853]/25 py-8 text-center text-sm text-[#9DA6B5]">
              সকল ম্যানুয়াল পেমেন্ট ইতোমধ্যে যাচাই সম্পন্ন হয়েছে।
            </div>
          ) : (
            <div className="divide-y divide-[#D4A853]/15">
              {pendingPayments.slice(0, 5).map((p) => {
                const payer = getPayer(p.userId);
                return (
                  <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#F5EFE2]">
                        {payer?.fullName || p.userId}
                      </p>
                      <p className="text-sm text-[#B8C0CE] tabular-nums">
                        {p.transactionRef} · ৳{formatBnNumber(p.submittedAmountBdt)} · {p.planNameSnapshot}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusTag tone="pending" label="অপেক্ষমাণ" />
                      <Button
                        size="sm"
                        onClick={() => {
                          setInspectPayment(p);
                          setReviewNote(p.reviewNote || '');
                        }}
                      >
                        যাচাই করুন
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Quick Admin Modules Directory */}
      <div className="space-y-3">
        <h2 className="font-display text-lg font-bold text-[#F5EFE2]">
          দ্রুত ব্যবস্থাপনা মডিউলসমূহ
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quickModules.map((mod) => (
            <Link
              key={mod.to}
              to={mod.to}
              className="obsidian-card-interactive group flex items-start gap-3.5 rounded-xl p-4"
            >
              <div className="rounded-lg border border-[#D4A853]/30 bg-[#141822] p-2.5 shrink-0">
                {mod.icon}
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-[#F5EFE2] group-hover:text-[#EAC779]">
                  {mod.title}
                </h3>
                <p className="mt-0.5 text-sm text-[#9DA6B5] tabular-nums">{mod.meta}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity Logs */}
      <Card className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-[#F5EFE2]">
            সাম্প্রতিক অডিট ও কার্যক্রম লগ
          </h2>
          <Link to="/admin/logs" className="text-sm font-semibold text-[#EAC779] hover:underline">
            সম্পূর্ণ লগ দেখুন →
          </Link>
        </div>
        <div className="divide-y divide-[#D4A853]/15">
          {state.activityLogs.slice(0, 6).map((log) => (
            <div key={log.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 py-2.5 text-sm">
              <div>
                <span className="font-semibold text-[#F5EFE2]">{log.action}</span>{' '}
                <span className="text-[#B8C0CE]">— {log.details}</span>
              </div>
              <span className="text-[#8C95A4] tabular-nums shrink-0">
                {log.actorName} · {formatBnDateTime(log.createdAt)}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Inline Quick Payment Inspection Modal */}
      <Modal
        open={!!inspectPayment}
        onClose={() => setInspectPayment(null)}
        title="ম্যানুয়াল পেমেন্ট যাচাই ও অনুমোদন"
        maxWidth="max-w-lg"
      >
        {inspectPayment && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3 rounded-lg border border-[#D4A853]/25 bg-[#090B10] p-3.5 text-sm">
              <div>
                <p className="text-xs text-[#8C95A4]">শিক্ষার্থী</p>
                <p className="font-semibold text-[#F5EFE2]">
                  {getPayer(inspectPayment.userId)?.fullName || inspectPayment.userId}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#8C95A4]">প্ল্যান স্ন্যাপশট</p>
                <p className="font-semibold text-[#F5EFE2]">{inspectPayment.planNameSnapshot}</p>
              </div>
              <div>
                <p className="text-xs text-[#8C95A4]">ট্রানজেকশন আইডি</p>
                <p className="font-mono font-semibold text-[#EAC779]">{inspectPayment.transactionRef}</p>
              </div>
              <div>
                <p className="text-xs text-[#8C95A4]">প্রেরকের নম্বর</p>
                <p className="font-mono text-[#F5EFE2]">{inspectPayment.senderNumber}</p>
              </div>
              <div>
                <p className="text-xs text-[#8C95A4]">প্রেরিত পরিমাণ</p>
                <p className="font-mono font-semibold text-[#EAC779]">
                  ৳{formatBnNumber(inspectPayment.submittedAmountBdt)}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#8C95A4]">নির্ধারিত মূল্য</p>
                <p className="font-mono text-[#C2C8D3]">
                  ৳{formatBnNumber(inspectPayment.expectedAmountBdt)}
                </p>
              </div>
            </div>

            <FormField label="পর্যালোচনা নোট" htmlFor="ov-rev-note">
              <Textarea
                id="ov-rev-note"
                rows={2}
                placeholder="যাচাইয়ের মন্তব্য অথবা বাতিলের কারণ লিখুন..."
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
              />
            </FormField>

            <div className="flex flex-wrap justify-end gap-2.5 pt-2">
              <Button variant="danger" onClick={() => handleQuickDecision('rejected')}>
                <XCircle className="h-4 w-4" />
                <span>পেমেন্ট বাতিল করুন</span>
              </Button>
              <Button onClick={() => handleQuickDecision('approved')}>
                <CheckCircle2 className="h-4 w-4" />
                <span>অনুমোদন ও সক্রিয় করুন</span>
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
