import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, CheckCircle2, CreditCard, Upload } from 'lucide-react';
import {
  Button,
  Card,
  EmptyState,
  FormField,
  Input,
  Select,
  StatusTag,
} from '../../components/ui/Primitives';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { formatBnDate, getPaymentStatusLabelBn, toBanglaDigits } from '../../lib/bn';
import { getRemainingDays, isSubscriptionCurrentlyActive } from '../../lib/rules';
import { manualPaymentSchema, type ManualPaymentFormValues } from '../../lib/validations';
import { questionBankService } from '../../services/questionBankService';

export function SubscriptionPage() {
  const { user, revision } = useAuth();
  const catalogue = questionBankService.getAcademicCatalogue();
  const { siteSettings } = questionBankService.getPublicSiteData();

  const subscriptions = useMemo(
    () => (user ? questionBankService.getUserSubscriptions(user.id) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, revision]
  );

  if (!user) return null;

  const activeSubs = subscriptions.filter((s) => isSubscriptionCurrentlyActive(s));
  const getClassName = (id: string) => catalogue.classes.find((c) => c.id === id)?.nameBn || id;

  return (
    <div className="space-y-6 font-bangla">
      <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold gold-text-gradient">আমার সাবস্ক্রিপশনসমূহ</h1>
          <p className="mt-1 text-base text-[#B8C0CE]">
            শ্রেণি-ভিত্তিক প্রবেশাধিকার কেনার সময় নির্ধারিত হয় এবং অ্যাডমিন পেমেন্ট যাচাইয়ের পর সক্রিয় হয়।
          </p>
        </div>
        <Link
          to="/dashboard/payments/new"
          className="inline-flex items-center gap-2 rounded-lg gold-btn px-4 py-2 text-sm font-bold whitespace-nowrap self-start"
        >
          <CreditCard className="h-4 w-4" />
          <span>{activeSubs.length > 0 ? 'নবায়ন / নতুন প্ল্যান যোগ করুন' : 'এখনই সাবস্ক্রাইব করুন'}</span>
        </Link>
      </Card>

      {/* নীতিমালা সারসংক্ষেপ */}
      <Card className="p-5">
        <h2 className="text-base font-bold text-[#EAC779]">সাবস্ক্রিপশন নীতিমালা</h2>
        <ul className="mt-2 grid grid-cols-1 gap-2 text-sm text-[#C2C8D3] md:grid-cols-2">
          <li>• কেবল আপনার সক্রিয় সাবস্ক্রিপশনে অনুমোদিত শ্রেণিগুলোর প্রশ্নব্যাংক দেখা যাবে।</li>
          <li>• মেয়াদ শেষ হওয়ার সাথে সাথে প্রশ্নব্যাংকের প্রশ্ন ও উত্তর দেখা বন্ধ হয়ে যাবে।</li>
          <li>• {siteSettings.renewalRuleNotice}</li>
          <li>• মেয়াদ শেষ হলেও পূর্বে সংরক্ষিত প্রশ্নপত্র দেখা ও এক্সপোর্ট করা যাবে।</li>
        </ul>
      </Card>

      {subscriptions.length === 0 ? (
        <EmptyState
          title="কোনো সাবস্ক্রিপশন পাওয়া যায়নি"
          description="একটি শ্রেণি প্ল্যান বেছে নিয়ে ম্যানুয়াল পেমেন্ট তথ্য জমা দিন এবং আপনার অ্যাকাউন্ট সক্রিয় করুন।"
          icon={<CreditCard className="h-5 w-5" />}
          action={
            <Link
              to="/dashboard/payments/new"
              className="rounded-lg gold-btn px-4 py-2 text-sm font-bold"
            >
              প্ল্যান দেখুন ও পেমেন্ট করুন
            </Link>
          }
        />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#D4A853]/20 bg-[#0A0D12] text-sm font-semibold text-[#EAC779]">
              <tr>
                <th className="px-4 py-3">প্ল্যানের নাম</th>
                <th className="px-4 py-3">অনুমোদিত শ্রেণিসমূহ</th>
                <th className="px-4 py-3">মূল্য</th>
                <th className="px-4 py-3">মেয়াদকাল</th>
                <th className="px-4 py-3">অবস্থা</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D4A853]/15">
              {subscriptions.map((sub) => {
                const isActive = isSubscriptionCurrentlyActive(sub);
                const remDays = getRemainingDays(sub.expiresAt);
                return (
                  <tr key={sub.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3.5 font-medium text-[#F5EFE2]">{sub.planNameSnapshot}</td>
                    <td className="px-4 py-3.5 text-sm text-[#C2C8D3]">
                      {sub.grantedClassIds.map(getClassName).join(', ')}
                    </td>
                    <td className="px-4 py-3.5 text-sm tabular-nums font-mono text-[#EAC779]">
                      ৳{toBanglaDigits(sub.priceSnapshotBdt.toLocaleString())}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-[#9DA6B5] tabular-nums">
                      {formatBnDate(sub.startsAt)} → {formatBnDate(sub.expiresAt)}
                      {isActive && (
                        <span className="ml-1.5 font-medium text-emerald-300">
                          ({toBanglaDigits(remDays)} দিন বাকি)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {isActive ? (
                        <StatusTag tone="active" label="সক্রিয়" />
                      ) : (
                        <StatusTag tone="expired" label="মেয়াদোত্তীর্ণ" />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

export function PaymentHistoryPage() {
  const { user, revision } = useAuth();
  const payments = useMemo(
    () => (user ? questionBankService.getUserPayments(user.id) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, revision]
  );

  if (!user) return null;

  return (
    <div className="space-y-6 font-bangla">
      <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold gold-text-gradient">পেমেন্ট ইতিহাস</h1>
          <p className="mt-1 text-base text-[#B8C0CE]">
            আপনার জমাকৃত ম্যানুয়াল পেমেন্ট, ট্রানজেকশন রেফারেন্স এবং অ্যাডমিনের পর্যালোচনা মন্তব্য দেখুন।
          </p>
        </div>
        <Link
          to="/dashboard/payments/new"
          className="inline-flex items-center gap-2 rounded-lg gold-btn px-4 py-2 text-sm font-bold whitespace-nowrap self-start"
        >
          <CreditCard className="h-4 w-4" />
          <span>ম্যানুয়াল পেমেন্ট জমা দিন</span>
        </Link>
      </Card>

      {payments.length === 0 ? (
        <EmptyState
          title="এখনো কোনো পেমেন্ট জমা দেওয়া হয়নি"
          description="একটি সাবস্ক্রিপশন প্ল্যান বেছে নিয়ে আপনার বিকাশ, নগদ বা ব্যাংক ট্রান্সফার ট্রানজেকশন আইডি জমা দিন।"
          icon={<CreditCard className="h-5 w-5" />}
          action={
            <Link
              to="/dashboard/payments/new"
              className="rounded-lg gold-btn px-4 py-2 text-sm font-bold"
            >
              পেমেন্ট জমা দিন
            </Link>
          }
        />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#D4A853]/20 bg-[#0A0D12] text-sm font-semibold text-[#EAC779]">
              <tr>
                <th className="px-4 py-3">তারিখ</th>
                <th className="px-4 py-3">প্ল্যান</th>
                <th className="px-4 py-3">মাধ্যম ও প্রেরক</th>
                <th className="px-4 py-3">ট্রানজেকশন আইডি</th>
                <th className="px-4 py-3">পরিমাণ</th>
                <th className="px-4 py-3">অবস্থা</th>
                <th className="px-4 py-3">মন্তব্য</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D4A853]/15">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-sm text-[#9DA6B5] tabular-nums">
                    {formatBnDate(p.createdAt)}
                  </td>
                  <td className="px-4 py-3 font-medium text-[#F5EFE2]">{p.planNameSnapshot}</td>
                  <td className="px-4 py-3 text-sm text-[#C2C8D3]">
                    <div>{p.paymentMethodNameSnapshot}</div>
                    <div className="font-mono text-xs text-[#8C95A4]">{p.senderNumber}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-sm font-semibold text-[#EAC779]">
                    {p.transactionRef}
                  </td>
                  <td className="px-4 py-3 font-mono text-sm tabular-nums text-[#F5EFE2]">
                    ৳{toBanglaDigits(p.submittedAmountBdt.toLocaleString())}
                  </td>
                  <td className="px-4 py-3">
                    <StatusTag
                      tone={
                        p.status === 'approved'
                          ? 'active'
                          : p.status === 'pending'
                          ? 'pending'
                          : 'expired'
                      }
                      label={getPaymentStatusLabelBn(p.status)}
                    />
                  </td>
                  <td className="px-4 py-3 text-sm text-[#B8C0CE] max-w-xs">
                    {p.reviewNote || (p.status === 'pending' ? 'অ্যাডমিন যাচাইয়ের অপেক্ষায়' : '—')}
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

export function NewManualPaymentPage() {
  const { user, bumpRevision } = useAuth();
  const { pushToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { plans, paymentMethods, classes, siteSettings } = questionBankService.getPublicSiteData();
  const [receiptDataUrl, setReceiptDataUrl] = useState<string | undefined>();
  const [receiptFileName, setReceiptFileName] = useState<string | undefined>();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedPending, setSubmittedPending] = useState(false);

  const preselectedPlanId = searchParams.get('planId') || plans[0]?.id || '';
  const preselectedPlan = plans.find((p) => p.id === preselectedPlanId) || plans[0];

  const {
    register,
    watch,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ManualPaymentFormValues>({
    resolver: zodResolver(manualPaymentSchema) as never,
    defaultValues: {
      planId: preselectedPlan?.id || '',
      paymentMethodId: paymentMethods[0]?.id || '',
      submittedAmountBdt: preselectedPlan?.priceBdt || 0,
      senderNumber: user?.phone || '',
      transactionRef: '',
    },
  });

  if (!user) return null;

  const selectedPlanId = watch('planId');
  const selectedMethodId = watch('paymentMethodId');
  const selectedPlan = plans.find((p) => p.id === selectedPlanId);
  const selectedMethod = paymentMethods.find((m) => m.id === selectedMethodId);
  const getClassName = (id: string) => classes.find((c) => c.id === id)?.nameBn || id;

  const handleReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceiptFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setReceiptDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const onSubmit = (data: ManualPaymentFormValues) => {
    setSubmitError(null);
    try {
      questionBankService.submitManualPayment(user, {
        planId: data.planId,
        paymentMethodId: data.paymentMethodId,
        senderNumber: data.senderNumber,
        transactionRef: data.transactionRef,
        submittedAmountBdt: data.submittedAmountBdt,
        receiptDataUrl,
        receiptFileName,
      });
      bumpRevision();
      setSubmittedPending(true);
      pushToast({
        title: 'পেমেন্ট জমা হয়েছে (অপেক্ষমাণ)',
        description: 'অ্যাডমিন যাচাই করে অনুমোদন দেওয়ার পর আপনার সাবস্ক্রিপশন সক্রিয় হবে।',
        variant: 'info',
      });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'পেমেন্ট জমা দেওয়া যায়নি।');
    }
  };

  if (submittedPending) {
    return (
      <div className="max-w-xl mx-auto py-8 font-bangla">
        <Card className="p-6 text-center space-y-4">
          <CheckCircle2 className="mx-auto h-10 w-10 text-[#EAC779]" />
          <h1 className="font-display text-xl font-bold text-[#F5EFE2]">
            ম্যানুয়াল পেমেন্ট জমা হয়েছে — অবস্থা: অপেক্ষমাণ
          </h1>
          <p className="text-base text-[#B8C0CE] leading-relaxed">
            আপনার পেমেন্ট রেফারেন্স সংরক্ষণ করা হয়েছে এবং অ্যাডমিন যাচাইয়ের জন্য অপেক্ষমাণ রয়েছে। এই ফর্ম জমা দেওয়ামাত্র এক্সেস চালু হয় না—অ্যাডমিন অনুমোদনের সাথে সাথেই সাবস্ক্রিপশন সক্রিয় হবে।
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Button onClick={() => navigate('/dashboard/payments')}>পেমেন্ট ইতিহাস দেখুন</Button>
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              ড্যাশবোর্ডে ফিরুন
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6 font-bangla">
      <Card className="p-5">
        <h1 className="font-display text-2xl font-bold gold-text-gradient">
          ম্যানুয়াল পেমেন্ট জমা দিন
        </h1>
        <p className="mt-1 text-base text-[#B8C0CE]">
          {siteSettings.demoDisclaimer}
        </p>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Card className="p-6">
            {submitError && (
              <div role="alert" className="mb-4 rounded-lg border border-rose-500/40 bg-rose-950/60 px-3.5 py-2.5 text-sm font-medium text-rose-200">
                {submitError}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <FormField label="১. সাবস্ক্রিপশন প্ল্যান নির্বাচন করুন" htmlFor="pay-plan" error={errors.planId?.message} required>
                <Select
                  id="pay-plan"
                  {...register('planId', {
                    onChange: (e) => {
                      const nextPlan = plans.find((p) => p.id === e.target.value);
                      if (nextPlan) setValue('submittedAmountBdt', nextPlan.priceBdt);
                    },
                  })}
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nameBn || p.name} — ৳{toBanglaDigits(p.priceBdt)} ({toBanglaDigits(p.durationDays)} দিন)
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField label="২. পেমেন্ট মাধ্যম নির্বাচন করুন" htmlFor="pay-method" error={errors.paymentMethodId?.message} required>
                <Select id="pay-method" {...register('paymentMethodId')}>
                  {paymentMethods.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.accountNumber})
                    </option>
                  ))}
                </Select>
              </FormField>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="৩. প্রেরকের নম্বর / অ্যাকাউন্ট" htmlFor="pay-sender" error={errors.senderNumber?.message} required>
                  <Input id="pay-sender" placeholder="যেমন: 01711-000000" {...register('senderNumber')} />
                </FormField>
                <FormField label="৪. ট্রানজেকশন আইডি / রেফারেন্স" htmlFor="pay-trx" error={errors.transactionRef?.message} required>
                  <Input id="pay-trx" placeholder="যেমন: BK994411XX" {...register('transactionRef')} />
                </FormField>
              </div>

              <FormField
                label="৫. জমাকৃত টাকার পরিমাণ (টাকা)"
                htmlFor="pay-amount"
                error={errors.submittedAmountBdt?.message}
                hint={selectedPlan ? `নির্ধারিত প্ল্যান মূল্য: ৳${toBanglaDigits(selectedPlan.priceBdt)}` : undefined}
                required
              >
                <Input id="pay-amount" type="number" {...register('submittedAmountBdt')} />
              </FormField>

              <FormField label="৬. পেমেন্ট রসিদ বা স্ক্রিনশট (ঐচ্ছিক)" htmlFor="pay-receipt">
                <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-[#D4A853]/35 bg-[#090B10] px-4 py-3 text-sm text-[#C2C8D3] hover:border-[#EAC779]">
                  <Upload className="h-4 w-4 text-[#D4A853] shrink-0" />
                  <span className="truncate">
                    {receiptFileName ? `নির্বাচিত: ${receiptFileName}` : 'স্ক্রিনশট ছবি আপলোড করুন (PNG, JPG)'}
                  </span>
                  <input
                    id="pay-receipt"
                    type="file"
                    accept="image/*"
                    onChange={handleReceiptChange}
                    className="sr-only"
                  />
                </label>
                {receiptDataUrl && (
                  <img
                    src={receiptDataUrl}
                    alt="আপলোডকৃত রসিদ প্রিভিউ"
                    className="mt-2 max-h-36 rounded border border-[#D4A853]/30 object-contain"
                  />
                )}
              </FormField>

              <div className="rounded-lg border border-[#D4A853]/40 bg-[#2A200E]/45 p-3.5 space-y-2">
                <div className="flex items-start gap-2 text-sm text-[#F2D184]">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-[#EAC779]" />
                  <p>{siteSettings.renewalRuleNotice}</p>
                </div>
                <label className="flex items-start gap-2 text-sm font-medium text-[#E5E0D5] cursor-pointer">
                  <input
                    type="checkbox"
                    {...register('acknowledgedRenewalRule')}
                    className="mt-0.5 accent-[#D4A853]"
                  />
                  <span>আমি তাৎক্ষণিক নবায়ন নীতিমালা এবং ম্যানুয়াল যাচাই প্রক্রিয়া সম্পর্কে অবগত আছি।</span>
                </label>
                {errors.acknowledgedRenewalRule && (
                  <p role="alert" className="text-sm font-medium text-rose-400">
                    {errors.acknowledgedRenewalRule.message}
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                যাচাইয়ের জন্য পেমেন্ট জমা দিন
              </Button>
            </form>
          </Card>
        </div>

        {/* ডান পাশ: প্ল্যান সারসংক্ষেপ ও নির্দেশনা */}
        <div className="lg:col-span-5 space-y-4">
          {selectedPlan && (
            <Card className="p-5 space-y-3">
              <p className="text-xs font-semibold text-[#D4A853]">নির্বাচিত প্ল্যানের সারসংক্ষেপ</p>
              <h2 className="font-display text-lg font-bold text-[#F5EFE2]">{selectedPlan.nameBn || selectedPlan.name}</h2>
              <p className="text-2xl font-bold gold-text-gradient tabular-nums">
                ৳{toBanglaDigits(selectedPlan.priceBdt.toLocaleString())}{' '}
                <span className="text-sm font-normal text-[#9DA6B5]">/ {toBanglaDigits(selectedPlan.durationDays)} দিন</span>
              </p>
              <div className="border-t border-[#D4A853]/15 pt-3 text-sm text-[#C2C8D3]">
                <span className="font-semibold text-[#EAC779]">অন্তর্ভুক্ত শ্রেণিসমূহ: </span>
                {selectedPlan.includedClassIds.map(getClassName).join(', ')}
              </div>
            </Card>
          )}

          {selectedMethod && (
            <Card className="p-5 space-y-2.5">
              <p className="text-xs font-semibold text-[#9DA6B5]">পেমেন্ট নির্দেশনা</p>
              <h3 className="text-base font-semibold text-[#F5EFE2]">{selectedMethod.name}</h3>
              <p className="font-mono text-base font-bold text-[#EAC779] tabular-nums">
                {selectedMethod.accountNumber}
              </p>
              <p className="text-sm text-[#8C95A4]">{selectedMethod.accountType}</p>
              <p className="text-sm text-[#C2C8D3] leading-relaxed">{selectedMethod.instructions}</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
