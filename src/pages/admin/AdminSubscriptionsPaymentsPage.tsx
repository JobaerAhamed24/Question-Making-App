import React, { useMemo, useState } from 'react';
import { CheckCircle2, Edit, Plus, XCircle } from 'lucide-react';
import {
  Button,
  Card,
  EmptyState,
  FormField,
  Input,
  Modal,
  Select,
  StatusTag,
  Textarea,
} from '../../components/ui/Primitives';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import {
  formatBnDate,
  formatBnDateTime,
  formatBnNumber,
  getPaymentStatusLabelBn,
  toBanglaDigits,
} from '../../lib/bn';
import { isSubscriptionCurrentlyActive } from '../../lib/rules';
import { questionBankService } from '../../services/questionBankService';
import type { Payment, PaymentMethod, Plan } from '../../types/domain';

export function AdminPlansPage() {
  const { user, revision, bumpRevision } = useAuth();
  const { pushToast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

  const state = useMemo(
    () => (user?.role === 'admin' ? questionBankService.getAdminDashboardSnapshot(user) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, revision]
  );

  const [name, setName] = useState('');
  const [nameBn, setNameBn] = useState('');
  const [audienceLabel, setAudienceLabel] = useState('একক শ্রেণির শিক্ষার্থীদের জন্য');
  const [description, setDescription] = useState('');
  const [priceBdt, setPriceBdt] = useState(299);
  const [durationDays, setDurationDays] = useState(30);
  const [includedClassIds, setIncludedClassIds] = useState<string[]>(['cls-6']);
  const [featuresText, setFeaturesText] = useState('সম্পূর্ণ প্রশ্নব্যাংক এক্সেস\nপ্রশ্নপত্র তৈরি ও এক্সপোর্ট');
  const [isActive, setIsActive] = useState(true);

  if (!user || user.role !== 'admin' || !state) return null;

  const openCreate = () => {
    setEditingPlan(null);
    setName('');
    setNameBn('');
    setAudienceLabel('একক শ্রেণির শিক্ষার্থীদের জন্য');
    setDescription('');
    setPriceBdt(299);
    setDurationDays(30);
    setIncludedClassIds(['cls-6']);
    setFeaturesText('সম্পূর্ণ প্রশ্নব্যাংক এক্সেস\nপ্রশ্নপত্র জেনারেটর ও ওয়ার্ড এক্সপোর্ট');
    setIsActive(true);
    setModalOpen(true);
  };

  const openEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setName(plan.name);
    setNameBn(plan.nameBn);
    setAudienceLabel(plan.audienceLabel);
    setDescription(plan.description);
    setPriceBdt(plan.priceBdt);
    setDurationDays(plan.durationDays);
    setIncludedClassIds(plan.includedClassIds);
    setFeaturesText(plan.features.join('\n'));
    setIsActive(plan.isActive);
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!name.trim() && !nameBn.trim()) || includedClassIds.length === 0) {
      pushToast({ title: 'প্ল্যানের নাম এবং অন্তত একটি শ্রেণি নির্বাচন আবশ্যক', variant: 'error' });
      return;
    }
    const primaryName = name.trim() || nameBn.trim();
    const bnName = nameBn.trim() || name.trim();
    questionBankService.adminSavePlan(user, {
      id: editingPlan?.id,
      name: primaryName,
      nameBn: bnName,
      audienceLabel: audienceLabel.trim(),
      description: description.trim(),
      priceBdt: Number(priceBdt),
      originalPriceBdt: editingPlan?.originalPriceBdt || null,
      currency: 'BDT',
      durationDays: Number(durationDays),
      includedClassIds,
      features: featuresText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      isActive,
      displayOrder: editingPlan?.displayOrder || state.plans.length + 1,
    });
    setModalOpen(false);
    bumpRevision();
    pushToast({ title: editingPlan ? 'প্ল্যান হালনাগাদ হয়েছে' : 'নতুন প্ল্যান তৈরি হয়েছে', variant: 'success' });
  };

  const getClassName = (id: string) => {
    const cls = state.classes.find((c) => c.id === id);
    return cls?.nameBn || cls?.name || id;
  };

  return (
    <div className="space-y-6">
      <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold gold-text-gradient">সাবস্ক্রিপশন প্ল্যান</h1>
          <p className="mt-1 text-base text-[#B8C0CE]">
            প্ল্যানের মূল্য, মেয়াদ (দিন) এবং অন্তর্ভুক্ত শ্রেণি নির্ধারণ করুন। প্ল্যান পরিবর্তন করলে পূর্বের সাবস্ক্রাইবারের স্ন্যাপশট অপরিবর্তিত থাকে।
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          <span>নতুন প্ল্যান তৈরি</span>
        </Button>
      </Card>

      <Card className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[#D4A853]/20 bg-[#0A0D12] text-sm font-semibold text-[#EAC779]">
            <tr>
              <th className="px-4 py-3">প্ল্যানের নাম</th>
              <th className="px-4 py-3">অন্তর্ভুক্ত শ্রেণিসমূহ</th>
              <th className="px-4 py-3">মূল্য</th>
              <th className="px-4 py-3">মেয়াদ</th>
              <th className="px-4 py-3">অবস্থা</th>
              <th className="px-4 py-3 text-right">কার্যক্রম</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D4A853]/15">
            {state.plans.map((p) => (
              <tr key={p.id} className="hover:bg-white/[0.02]">
                <td className="px-4 py-3 font-medium text-[#F5EFE2]">
                  <div>{p.nameBn || p.name}</div>
                  {p.nameBn && p.nameBn !== p.name && (
                    <div className="text-xs text-[#8C95A4]">{p.name}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-[#C2C8D3]">
                  {p.includedClassIds.map(getClassName).join(', ')}
                </td>
                <td className="px-4 py-3 font-mono text-sm tabular-nums font-semibold text-[#EAC779]">
                  ৳{formatBnNumber(p.priceBdt)}
                </td>
                <td className="px-4 py-3 text-sm text-[#C2C8D3] tabular-nums">{toBanglaDigits(p.durationDays)} দিন</td>
                <td className="px-4 py-3">
                  <StatusTag tone={p.isActive ? 'active' : 'draft'} label={p.isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'} />
                </td>
                <td className="px-4 py-3 text-right">
                  <Button variant="outline" size="sm" onClick={() => openEdit(p)}>
                    <Edit className="h-3.5 w-3.5" />
                    <span>সম্পাদনা</span>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingPlan ? 'সাবস্ক্রিপশন প্ল্যান সম্পাদনা' : 'নতুন সাবস্ক্রিপশন প্ল্যান তৈরি'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField label="প্ল্যানের নাম (বাংলা)" htmlFor="pl-bn" required>
              <Input id="pl-bn" value={nameBn} onChange={(e) => setNameBn(e.target.value)} required />
            </FormField>
            <FormField label="প্ল্যানের নাম (ইংরেজি)" htmlFor="pl-name">
              <Input id="pl-name" value={name} onChange={(e) => setName(e.target.value)} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="মূল্য (টাকায়)" htmlFor="pl-price" required>
              <Input id="pl-price" type="number" min={1} value={priceBdt} onChange={(e) => setPriceBdt(Number(e.target.value))} />
            </FormField>
            <FormField label="মেয়াদ (দিন)" htmlFor="pl-dur" required>
              <Input id="pl-dur" type="number" min={1} value={durationDays} onChange={(e) => setDurationDays(Number(e.target.value))} />
            </FormField>
          </div>
          <div>
            <p className="mb-1.5 text-sm font-medium text-[#E5E0D5]">অন্তর্ভুক্ত শ্রেণিসমূহ</p>
            <div className="flex flex-wrap gap-3">
              {state.classes.map((c) => (
                <label key={c.id} className="inline-flex items-center gap-1.5 text-sm text-[#C2C8D3] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includedClassIds.includes(c.id)}
                    onChange={(e) =>
                      setIncludedClassIds((prev) =>
                        e.target.checked ? [...prev, c.id] : prev.filter((id) => id !== c.id)
                      )
                    }
                    className="accent-[#D4A853]"
                  />
                  <span>{c.nameBn || c.name}</span>
                </label>
              ))}
            </div>
          </div>
          <FormField label="বিবরণ" htmlFor="pl-desc">
            <Textarea id="pl-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </FormField>
          <FormField label="সুবিধাসমূহ (প্রতি লাইনে একটি)" htmlFor="pl-feat">
            <Textarea id="pl-feat" rows={3} value={featuresText} onChange={(e) => setFeaturesText(e.target.value)} />
          </FormField>
          <label className="inline-flex items-center gap-2 text-sm text-[#C2C8D3] cursor-pointer">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="accent-[#D4A853]" />
            <span>প্ল্যানটি সক্রিয় এবং মূল্য তালিকায় প্রদর্শিত হবে</span>
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>বাতিল</Button>
            <Button type="submit">প্ল্যান সংরক্ষণ করুন</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export function AdminSubscribersPage() {
  const { user, revision, bumpRevision } = useAuth();
  const { pushToast } = useToast();
  const [tab, setTab] = useState<'all' | 'active' | 'expired'>('all');
  const [grantOpen, setGrantOpen] = useState(false);

  const state = useMemo(
    () => (user?.role === 'admin' ? questionBankService.getAdminDashboardSnapshot(user) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, revision]
  );

  const [grantUserId, setGrantUserId] = useState('u-student-unsub');
  const [grantPlanId, setGrantPlanId] = useState('plan-c6-monthly');

  if (!user || user.role !== 'admin' || !state) return null;

  const filteredSubs = state.subscriptions.filter((s) => {
    const active = isSubscriptionCurrentlyActive(s);
    if (tab === 'active') return active;
    if (tab === 'expired') return !active;
    return true;
  });

  const getClassName = (id: string) => {
    const cls = state.classes.find((c) => c.id === id);
    return cls?.nameBn || cls?.name || id;
  };
  const getUserName = (id: string) => state.users.find((u) => u.id === id)?.fullName || id;

  const handleManualGrant = (e: React.FormEvent) => {
    e.preventDefault();
    questionBankService.adminManualActivateSubscription(user, grantUserId, grantPlanId);
    setGrantOpen(false);
    bumpRevision();
    pushToast({ title: 'সাবস্ক্রিপশন ম্যানুয়ালি সক্রিয় করা হয়েছে', variant: 'success' });
  };

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold gold-text-gradient">সাবস্ক্রাইবার ও অধিকার তালিকা</h1>
            <p className="mt-1 text-base text-[#B8C0CE]">
              সক্রিয় ও মেয়াদোত্তীর্ণ সাবস্ক্রিপশন দেখুন অথবা ম্যানুয়ালি শিক্ষার্থীর প্ল্যান সক্রিয় করুন।
            </p>
          </div>
          <Button size="sm" onClick={() => setGrantOpen(true)}>
            <Plus className="h-4 w-4" />
            <span>ম্যানুয়াল সক্রিয়করণ</span>
          </Button>
        </div>

        <div className="mt-4 flex gap-2 border-t border-[#D4A853]/15 pt-4">
          {(
            [
              { key: 'all', label: 'সকল' },
              { key: 'active', label: 'সক্রিয়' },
              { key: 'expired', label: 'মেয়াদোত্তীর্ণ' },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={`rounded-lg px-3.5 py-2 text-sm font-semibold cursor-pointer ${
                tab === item.key
                  ? 'gold-btn'
                  : 'border border-[#D4A853]/28 bg-[#0A0D12] text-[#C2C8D3] hover:border-[#EAC779]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </Card>

      <Card className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[#D4A853]/20 bg-[#0A0D12] text-sm font-semibold text-[#EAC779]">
            <tr>
              <th className="px-4 py-3">শিক্ষার্থী</th>
              <th className="px-4 py-3">প্ল্যান স্ন্যাপশট</th>
              <th className="px-4 py-3">অনুমোদিত শ্রেণি</th>
              <th className="px-4 py-3">সময়কাল</th>
              <th className="px-4 py-3">অবস্থা</th>
              <th className="px-4 py-3 text-right">কার্যক্রম</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D4A853]/15">
            {filteredSubs.map((s) => {
              const active = isSubscriptionCurrentlyActive(s);
              return (
                <tr key={s.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-medium text-[#F5EFE2]">{getUserName(s.userId)}</td>
                  <td className="px-4 py-3 text-sm text-[#C2C8D3]">{s.planNameSnapshot}</td>
                  <td className="px-4 py-3 text-sm text-[#C2C8D3]">
                    {s.grantedClassIds.map(getClassName).join(', ')}
                  </td>
                  <td className="px-4 py-3 text-sm text-[#9DA6B5] tabular-nums">
                    {formatBnDate(s.startsAt)} → {formatBnDate(s.expiresAt)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusTag tone={active ? 'active' : 'expired'} label={active ? 'সক্রিয়' : 'মেয়াদোত্তীর্ণ'} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {active && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          questionBankService.adminUpdateSubscriptionStatus(user, s.id, 'cancelled');
                          bumpRevision();
                          pushToast({ title: 'সাবস্ক্রিপশন স্থগিত করা হয়েছে', variant: 'info' });
                        }}
                      >
                        স্থগিত করুন
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <Modal open={grantOpen} onClose={() => setGrantOpen(false)} title="ম্যানুয়াল সাবস্ক্রিপশন সক্রিয়করণ">
        <form onSubmit={handleManualGrant} className="space-y-4">
          <FormField label="শিক্ষার্থী" htmlFor="ms-user">
            <Select id="ms-user" value={grantUserId} onChange={(e) => setGrantUserId(e.target.value)}>
              {state.users
                .filter((u) => u.role === 'student')
                .map((u) => (
                  <option key={u.id} value={u.id}>{u.fullName} ({u.email})</option>
                ))}
            </Select>
          </FormField>
          <FormField label="প্ল্যান" htmlFor="ms-plan">
            <Select id="ms-plan" value={grantPlanId} onChange={(e) => setGrantPlanId(e.target.value)}>
              {state.plans.map((p) => (
                <option key={p.id} value={p.id}>{p.nameBn || p.name} ({toBanglaDigits(p.durationDays)} দিন)</option>
              ))}
            </Select>
          </FormField>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setGrantOpen(false)}>বাতিল</Button>
            <Button type="submit">তাৎক্ষণিক সক্রিয় করুন</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export function AdminPaymentsPage() {
  const { user, revision, bumpRevision } = useAuth();
  const { pushToast } = useToast();
  const [tab, setTab] = useState<'pending' | 'approved' | 'rejected' | 'methods'>('pending');
  const [inspectPayment, setInspectPayment] = useState<Payment | null>(null);
  const [reviewNote, setReviewNote] = useState('');

  const [methodModalOpen, setMethodModalOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [mName, setMName] = useState('');
  const [mAcc, setMAcc] = useState('');
  const [mType, setMType] = useState('');
  const [mInst, setMInst] = useState('');

  const state = useMemo(
    () => (user?.role === 'admin' ? questionBankService.getAdminDashboardSnapshot(user) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, revision]
  );

  if (!user || user.role !== 'admin' || !state) return null;

  const filteredPayments = state.payments.filter((p) => p.status === tab);
  const getUser = (id: string) => state.users.find((u) => u.id === id);

  const handleDecision = (decision: 'approved' | 'rejected') => {
    if (!inspectPayment) return;
    try {
      questionBankService.reviewPayment(user, inspectPayment.id, decision, reviewNote);
      setInspectPayment(null);
      setReviewNote('');
      bumpRevision();
      pushToast({
        title: decision === 'approved' ? 'পেমেন্ট অনুমোদিত ও সাবস্ক্রিপশন সক্রিয় হয়েছে' : 'পেমেন্ট বাতিল করা হয়েছে',
        description:
          decision === 'approved'
            ? 'অনুমোদনের মুহূর্ত থেকেই সাবস্ক্রিপশনের মেয়াদ শুরু হয়েছে।'
            : 'ব্যবহারকারীর জন্য বাতিলের কারণ নোট হিসেবে সংরক্ষণ করা হয়েছে।',
        variant: decision === 'approved' ? 'success' : 'info',
      });
    } catch (err) {
      pushToast({
        title: 'পর্যালোচনা সম্পন্ন করা যায়নি',
        description: err instanceof Error ? err.message : 'সিদ্ধান্ত প্রক্রিয়ায় ত্রুটি হয়েছে।',
        variant: 'error',
      });
    }
  };

  const openMethodModal = (pm?: PaymentMethod) => {
    setEditingMethod(pm || null);
    setMName(pm?.name || '');
    setMAcc(pm?.accountNumber || '');
    setMType(pm?.accountType || '');
    setMInst(pm?.instructions || '');
    setMethodModalOpen(true);
  };

  const handleSaveMethod = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mName.trim() || !mAcc.trim()) return;
    questionBankService.adminSavePaymentMethod(user, {
      id: editingMethod?.id,
      name: mName.trim(),
      accountNumber: mAcc.trim(),
      accountType: mType.trim(),
      instructions: mInst.trim(),
      isActive: true,
    });
    setMethodModalOpen(false);
    bumpRevision();
    pushToast({ title: 'পেমেন্ট মাধ্যম সংরক্ষিত হয়েছে', variant: 'success' });
  };

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold gold-text-gradient">ম্যানুয়াল পেমেন্ট যাচাই</h1>
            <p className="mt-1 text-base text-[#B8C0CE]">
              ট্রানজেকশন নম্বর যাচাই করে পেমেন্ট অনুমোদন বা বাতিল করুন। অনুমোদনের সাথে সাথে সাবস্ক্রিপশন চালু হয়।
            </p>
          </div>
          {tab === 'methods' && (
            <Button size="sm" onClick={() => openMethodModal()}>
              <Plus className="h-4 w-4" />
              <span>নতুন মাধ্যম যোগ করুন</span>
            </Button>
          )}
        </div>

        {/* Tabs */}
        <div className="mt-4 flex flex-wrap gap-2 border-t border-[#D4A853]/15 pt-4">
          {[
            { key: 'pending', label: `অপেক্ষমাণ (${toBanglaDigits(state.payments.filter((p) => p.status === 'pending').length)})` },
            { key: 'approved', label: `অনুমোদিত (${toBanglaDigits(state.payments.filter((p) => p.status === 'approved').length)})` },
            { key: 'rejected', label: `বাতিলকৃত (${toBanglaDigits(state.payments.filter((p) => p.status === 'rejected').length)})` },
            { key: 'methods', label: 'পেমেন্ট মাধ্যম ও নির্দেশনা' },
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

      {tab === 'methods' ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {state.paymentMethods.map((pm) => (
            <Card key={pm.id} className="p-5 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-semibold text-[#F5EFE2]">{pm.name}</h2>
                  <p className="font-mono text-sm text-[#EAC779]">{pm.accountNumber}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => openMethodModal(pm)}>
                  সম্পাদনা
                </Button>
              </div>
              <p className="text-sm text-[#8C95A4]">{pm.accountType}</p>
              <p className="text-sm text-[#C2C8D3] leading-relaxed">{pm.instructions}</p>
            </Card>
          ))}
        </div>
      ) : filteredPayments.length === 0 ? (
        <EmptyState
          title={`কোনো ${getPaymentStatusLabelBn(tab)} পেমেন্ট নেই`}
          description="এই তালিকায় বর্তমানে কোনো পেমেন্ট রেকর্ড পাওয়া যায়নি।"
        />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#D4A853]/20 bg-[#0A0D12] text-sm font-semibold text-[#EAC779]">
              <tr>
                <th className="px-4 py-3">শিক্ষার্থী</th>
                <th className="px-4 py-3">প্ল্যান</th>
                <th className="px-4 py-3">ট্রানজেকশন আইডি ও প্রেরক</th>
                <th className="px-4 py-3">প্রেরিত / নির্ধারিত</th>
                <th className="px-4 py-3">অবস্থা</th>
                <th className="px-4 py-3 text-right">কার্যক্রম</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D4A853]/15">
              {filteredPayments.map((p) => {
                const payer = getUser(p.userId);
                return (
                  <tr key={p.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <div className="font-medium text-[#F5EFE2]">{payer?.fullName || p.userId}</div>
                      <div className="text-xs text-[#8C95A4]">{payer?.email}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-[#C2C8D3]">{p.planNameSnapshot}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="font-mono font-semibold text-[#EAC779]">{p.transactionRef}</div>
                      <div className="text-[#9DA6B5]">{p.paymentMethodNameSnapshot} · {p.senderNumber}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-sm tabular-nums">
                      <span className={p.submittedAmountBdt !== p.expectedAmountBdt ? 'text-rose-400 font-semibold' : 'text-[#F5EFE2]'}>
                        ৳{formatBnNumber(p.submittedAmountBdt)}
                      </span>{' '}
                      <span className="text-[#8C95A4]">/ ৳{formatBnNumber(p.expectedAmountBdt)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusTag
                        tone={p.status === 'approved' ? 'active' : p.status === 'pending' ? 'pending' : 'expired'}
                        label={getPaymentStatusLabelBn(p.status)}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant={p.status === 'pending' ? 'primary' : 'outline'}
                        onClick={() => {
                          setInspectPayment(p);
                          setReviewNote(p.reviewNote || '');
                        }}
                      >
                        {p.status === 'pending' ? 'যাচাই করুন' : 'বিস্তারিত'}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {/* Payment Inspection Modal */}
      <Modal
        open={!!inspectPayment}
        onClose={() => setInspectPayment(null)}
        title="ম্যানুয়াল পেমেন্ট যাচাই"
        maxWidth="max-w-lg"
      >
        {inspectPayment && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3 rounded-lg border border-[#D4A853]/25 bg-[#090B10] p-3.5 text-sm">
              <div>
                <p className="text-xs text-[#8C95A4]">শিক্ষার্থী</p>
                <p className="font-semibold text-[#F5EFE2]">{getUser(inspectPayment.userId)?.fullName}</p>
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
                <p className="font-mono font-semibold text-[#EAC779]">৳{formatBnNumber(inspectPayment.submittedAmountBdt)}</p>
              </div>
              <div>
                <p className="text-xs text-[#8C95A4]">প্ল্যানের নির্ধারিত মূল্য</p>
                <p className="font-mono text-[#C2C8D3]">৳{formatBnNumber(inspectPayment.expectedAmountBdt)}</p>
              </div>
            </div>

            {inspectPayment.receiptDataUrl && (
              <div>
                <p className="mb-1 text-sm font-medium text-[#C2C8D3]">আপলোডকৃত রসিদের স্ক্রিনশট</p>
                <img
                  src={inspectPayment.receiptDataUrl}
                  alt="রসিদের স্ক্রিনশট"
                  className="max-h-48 rounded border border-[#D4A853]/30 object-contain"
                />
              </div>
            )}

            <FormField label="পর্যালোচনা নোট" htmlFor="rev-note">
              <Textarea
                id="rev-note"
                rows={2}
                placeholder="যাচাইয়ের মন্তব্য অথবা বাতিলের কারণ লিখুন..."
                value={reviewNote}
                disabled={inspectPayment.status !== 'pending'}
                onChange={(e) => setReviewNote(e.target.value)}
              />
            </FormField>

            {inspectPayment.status === 'pending' ? (
              <div className="flex flex-wrap justify-end gap-2.5 pt-2">
                <Button variant="danger" onClick={() => handleDecision('rejected')}>
                  <XCircle className="h-4 w-4" />
                  <span>পেমেন্ট বাতিল করুন</span>
                </Button>
                <Button onClick={() => handleDecision('approved')}>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>অনুমোদন ও সক্রিয় করুন</span>
                </Button>
              </div>
            ) : (
              <p className="text-sm text-[#9DA6B5]">
                পর্যালোচনার সময়: {inspectPayment.reviewedAt ? formatBnDateTime(inspectPayment.reviewedAt) : '—'}।
              </p>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={methodModalOpen}
        onClose={() => setMethodModalOpen(false)}
        title={editingMethod ? 'পেমেন্ট মাধ্যম সম্পাদনা' : 'নতুন পেমেন্ট মাধ্যম যুক্ত করুন'}
      >
        <form onSubmit={handleSaveMethod} className="space-y-3">
          <FormField label="মাধ্যমের নাম" htmlFor="pm-name" required>
            <Input id="pm-name" value={mName} onChange={(e) => setMName(e.target.value)} required />
          </FormField>
          <FormField label="অ্যাকাউন্ট / ওয়ালেট নম্বর" htmlFor="pm-acc" required>
            <Input id="pm-acc" value={mAcc} onChange={(e) => setMAcc(e.target.value)} required />
          </FormField>
          <FormField label="অ্যাকাউন্টের ধরন" htmlFor="pm-type">
            <Input id="pm-type" value={mType} onChange={(e) => setMType(e.target.value)} />
          </FormField>
          <FormField label="পেমেন্ট নির্দেশনা" htmlFor="pm-inst" required>
            <Textarea id="pm-inst" rows={3} value={mInst} onChange={(e) => setMInst(e.target.value)} required />
          </FormField>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setMethodModalOpen(false)}>বাতিল</Button>
            <Button type="submit">সংরক্ষণ করুন</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
