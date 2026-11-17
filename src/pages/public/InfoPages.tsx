import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, ChevronDown } from 'lucide-react';
import { Button, Card, FormField, Input, Textarea } from '../../components/ui/Primitives';
import { useToast } from '../../contexts/ToastContext';
import { FAQ_TRANSLATIONS_BN, toBanglaDigits } from '../../lib/bn';
import { contactSchema, type ContactFormValues } from '../../lib/validations';
import { questionBankService } from '../../services/questionBankService';

export function AboutPage() {
  const { classes, subjects, questionTypes } = questionBankService.getPublicSiteData();
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 space-y-10 font-bangla">
      <div>
        <h1 className="font-display text-3xl font-bold gold-text-gradient">প্রশ্নব্যাংক সম্পর্কে</h1>
        <p className="mt-3 text-base sm:text-lg text-[#C2C8D3] leading-relaxed">
          প্রশ্নব্যাংক হলো শ্রেণি-ভিত্তিক সাবস্ক্রিপশন, বাংলা ও ইংরেজি উভয় মাধ্যমের একাডেমিক প্রশ্ন এবং স্থায়ী প্রশ্নপত্র স্ন্যাপশট ব্যবস্থাপনার ওপর ভিত্তি করে নির্মিত একটি সুসংগঠিত শিক্ষা প্ল্যাটফর্ম ও প্রশ্নপত্র জেনারেটর।
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-3xl font-bold gold-text-gradient tabular-nums">{toBanglaDigits(classes.length)}</p>
          <p className="mt-1 text-base font-semibold text-[#F5EFE2]">একাডেমিক শ্রেণি স্তর</p>
          <p className="mt-1 text-sm text-[#9DA6B5]">ষষ্ঠ শ্রেণি থেকে এসএসসি (নবম–দশম) পর্যন্ত</p>
        </Card>
        <Card className="p-5">
          <p className="text-3xl font-bold gold-text-gradient tabular-nums">{toBanglaDigits(subjects.length)}</p>
          <p className="mt-1 text-base font-semibold text-[#F5EFE2]">নির্বাচিত বিষয়সমূহ</p>
          <p className="mt-1 text-sm text-[#9DA6B5]">অধ্যায় ও টপিক অনুযায়ী সুবিন্যস্ত</p>
        </Card>
        <Card className="p-5">
          <p className="text-3xl font-bold gold-text-gradient tabular-nums">{toBanglaDigits(questionTypes.length)}</p>
          <p className="mt-1 text-base font-semibold text-[#F5EFE2]">প্রশ্নের ধরন</p>
          <p className="mt-1 text-sm text-[#9DA6B5]">এমসিকিউ, সৃজনশীল, গণিত ও চিত্রভিত্তিক প্রশ্ন</p>
        </Card>
      </div>

      <Card className="p-6 space-y-4">
        <h2 className="font-display text-xl font-bold text-[#EAC779]">
          সম্পাদনা ও মান নিয়ন্ত্রণ কাঠামো
        </h2>
        <p className="text-base text-[#C2C8D3] leading-relaxed">
          প্রশ্নব্যাংকের প্রতিটি মূল প্রশ্ন প্ল্যাটফর্মের অ্যাডমিন ও একাডেমিক সম্পাদনা পর্ষদ কর্তৃক কেন্দ্রীয়ভাবে তৈরি, যাচাই এবং প্রকাশ করা হয়। শিক্ষার্থীরা তাদের সক্রিয় সাবস্ক্রিপশনে অন্তর্ভুক্ত নির্দিষ্ট শ্রেণিসমূহে প্রবেশাধিকার পান, ফলে পাঠ্যক্রমের সঠিক সীমারেখা ও নির্ভরযোগ্য উত্তর নির্দেশিকা বজায় থাকে।
        </p>
        <p className="text-base text-[#C2C8D3] leading-relaxed">
          কোনো শিক্ষার্থী যখন প্রশ্নপত্র তৈরি করেন, তখন নির্বাচিত প্রতিটি প্রশ্নের একটি অপরিবর্তনীয় স্ন্যাপশট সংরক্ষিত হয়। ফলে পরবর্তীতে মূল প্রশ্ন হালনাগাদ হলেও বা সাবস্ক্রিপশনের মেয়াদ শেষ হলেও পূর্বে তৈরি করা প্রশ্নপত্র সম্পূর্ণ নির্ভুল অবস্থায় দেখা ও এক্সপোর্ট করা যায়।
        </p>
      </Card>
    </div>
  );
}

export function HowItWorksPage() {
  const steps = [
    {
      num: '০১',
      title: 'নিবন্ধন করুন ও শ্রেণি প্ল্যান বাছাই করুন',
      body: 'বিনামূল্যে একটি শিক্ষার্থী অ্যাকাউন্ট তৈরি করুন এবং আপনার প্রয়োজন অনুযায়ী একক শ্রেণি অথবা একাধিক শ্রেণির বান্ডেল প্ল্যান নির্বাচন করুন।',
    },
    {
      num: '০২',
      title: 'ম্যানুয়াল পেমেন্ট সম্পন্ন করে তথ্য জমা দিন',
      body: 'অ্যাডমিন নির্ধারিত বিকাশ, নগদ বা ব্যাংক ট্রান্সফার নির্দেশনা অনুসরণ করে পেমেন্ট সম্পন্ন করুন এবং প্রেরকের নম্বর, ট্রানজেকশন আইডি ও ঐচ্ছিক রসিদ জমা দিন।',
    },
    {
      num: '০৩',
      title: 'অ্যাডমিন যাচাই ও তাৎক্ষণিক সক্রিয়করণ',
      body: 'অ্যাডমিন আপনার প্রদত্ত ট্রানজেকশন নম্বর যাচাই করে পেমেন্ট অনুমোদন করবেন। অনুমোদনের মুহূর্ত থেকেই আপনার সাবস্ক্রিপশন চালু হয়ে যাবে।',
    },
    {
      num: '০৪',
      title: 'প্রশ্ন ফিল্টার করুন ও প্রশ্নপত্র তৈরি করুন',
      body: 'অনুমোদিত শ্রেণির প্রশ্ন ব্রাউজ করুন, পছন্দসই প্রশ্ন সংরক্ষণ করুন, স্বয়ংক্রিয় নম্বর হিসাবসহ কাস্টম প্রশ্নপত্র সাজান এবং পিডিএফ বা ওয়ার্ড (.docx) আকারে ডাউনলোড করুন।',
    },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 space-y-10 font-bangla">
      <div>
        <h1 className="font-display text-3xl font-bold gold-text-gradient">প্রশ্নব্যাংক যেভাবে কাজ করে</h1>
        <p className="mt-3 text-base sm:text-lg text-[#C2C8D3]">
          শ্রেণি-ভিত্তিক বান্ডেল বাছাই থেকে শুরু করে প্রিন্ট-উপযোগী প্রশ্নপত্র ডাউনলোড পর্যন্ত সম্পূর্ণ প্রক্রিয়া।
        </p>
      </div>

      <div className="space-y-4">
        {steps.map((s) => (
          <Card key={s.num} className="p-6 flex flex-col sm:flex-row gap-4 sm:items-start">
            <span className="text-xl font-bold text-[#EAC779] tabular-nums shrink-0">
              {s.num}.
            </span>
            <div>
              <h2 className="font-display text-lg font-bold text-[#F5EFE2]">{s.title}</h2>
              <p className="mt-1.5 text-base text-[#B8C0CE] leading-relaxed">{s.body}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          to="/pricing"
          className="rounded-lg gold-btn px-5 py-2.5 text-base font-bold"
        >
          সাবস্ক্রিপশন প্ল্যান দেখুন
        </Link>
        <Link
          to="/payment-instructions"
          className="rounded-lg gold-outline-btn px-5 py-2.5 text-base font-semibold"
        >
          পেমেন্ট নির্দেশনা পড়ুন
        </Link>
      </div>
    </div>
  );
}

export function PaymentInstructionsPage() {
  const { paymentMethods, siteSettings } = questionBankService.getPublicSiteData();

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 space-y-8 font-bangla">
      <div>
        <h1 className="font-display text-3xl font-bold gold-text-gradient">
          ম্যানুয়াল পেমেন্ট নির্দেশনা
        </h1>
        <p className="mt-2 text-base text-[#B8C0CE]">
          {siteSettings.demoDisclaimer}
        </p>
      </div>

      <div className="space-y-4">
        {paymentMethods.map((pm) => (
          <Card key={pm.id} className="p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-lg font-bold text-[#F5EFE2]">{pm.name}</h2>
              <span className="font-mono text-base font-semibold text-[#EAC779] tabular-nums">
                {pm.accountNumber}
              </span>
            </div>
            <p className="mt-1 text-sm text-[#8C95A4]">{pm.accountType}</p>
            <p className="mt-3 text-base text-[#C2C8D3] leading-relaxed">{pm.instructions}</p>
          </Card>
        ))}
      </div>

      <div className="rounded-xl border border-[#D4A853]/45 bg-[#2A200E]/45 p-6">
        <h3 className="text-base font-bold text-[#F2D184]">তাৎক্ষণিক নবায়ন নীতিমালা</h3>
        <p className="mt-1.5 text-base text-[#E5E0D5] leading-relaxed">
          {siteSettings.renewalRuleNotice}
        </p>
      </div>
    </div>
  );
}

export function FaqPage() {
  const { faqs } = questionBankService.getPublicSiteData();
  const [openId, setOpenId] = useState<string | null>(faqs[0]?.id || null);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 font-bangla">
      <h1 className="font-display text-3xl font-bold gold-text-gradient">
        সচরাচর জিজ্ঞাসিত প্রশ্ন (FAQ)
      </h1>
      <p className="mt-2 text-base text-[#B8C0CE]">
        শ্রেণি-ভিত্তিক সাবস্ক্রিপশন, ম্যানুয়াল পেমেন্ট অনুমোদন, নবায়ন ও প্রশ্নপত্র এক্সপোর্ট সম্পর্কিত উত্তর।
      </p>

      <div className="mt-8 obsidian-card divide-y divide-[#D4A853]/15 rounded-xl">
        {faqs.map((faq) => {
          const isOpen = openId === faq.id;
          const bn = FAQ_TRANSLATIONS_BN[faq.id];
          return (
            <div key={faq.id}>
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpenId(isOpen ? null : faq.id)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-white/5 cursor-pointer transition-colors"
              >
                <div>
                  <span className="text-xs font-semibold text-[#D4A853]">{bn?.category || faq.category}</span>
                  <p className="mt-0.5 text-base font-semibold text-[#F5EFE2]">{bn?.question || faq.question}</p>
                </div>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-[#EAC779] transition-transform ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {isOpen && (
                <div className="px-5 pb-4 text-base text-[#B8C0CE] leading-relaxed">
                  {bn?.answer || faq.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ContactPage() {
  const { siteSettings } = questionBankService.getPublicSiteData();
  const { pushToast } = useToast();
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = (data: ContactFormValues) => {
    questionBankService.submitContactMessage(data);
    setSubmitted(true);
    reset();
    pushToast({
      title: 'বার্তা পাঠানো হয়েছে',
      description: 'আপনার বার্তাটি অ্যাডমিন পর্যালোচনার জন্য সংরক্ষণ করা হয়েছে।',
      variant: 'success',
    });
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 font-bangla">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
        <div className="lg:col-span-5 space-y-4">
          <h1 className="font-display text-3xl font-bold gold-text-gradient">যোগাযোগ ও সহায়তা</h1>
          <p className="text-base text-[#B8C0CE] leading-relaxed">
            শ্রেণি, সাবস্ক্রিপশন, পেমেন্ট যাচাই কিংবা সিলেবাস হালনাগাদ সম্পর্কে কোনো প্রশ্ন থাকলে সরাসরি আমাদের ইনবক্সে বার্তা পাঠান।
          </p>
          <Card className="p-5 space-y-3 text-base">
            <div>
              <p className="text-xs text-[#D4A853]">ইমেইল</p>
              <p className="font-medium text-[#F5EFE2]">{siteSettings.supportEmail}</p>
            </div>
            <div>
              <p className="text-xs text-[#D4A853]">ফোন</p>
              <p className="font-medium text-[#F5EFE2]">{siteSettings.supportPhone}</p>
            </div>
            <div>
              <p className="text-xs text-[#D4A853]">কার্যালয়</p>
              <p className="font-medium text-[#F5EFE2]">{siteSettings.officeAddress}</p>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-7">
          <Card className="p-6">
            {submitted ? (
              <div className="py-6 text-center space-y-3">
                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400" />
                <h2 className="font-display text-xl font-bold text-[#F5EFE2]">
                  আপনার বার্তা জমা হয়েছে
                </h2>
                <p className="text-base text-[#B8C0CE]">
                  অ্যাডমিন ড্যাশবোর্ডের «ওয়েবসাইট কনটেন্ট → যোগাযোগের বার্তা» অংশ থেকে এই বার্তাটি দেখা যাবে।
                </p>
                <Button variant="outline" onClick={() => setSubmitted(false)}>
                  আরেকটি বার্তা পাঠান
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField label="আপনার নাম" htmlFor="contact-name" error={errors.name?.message} required>
                    <Input id="contact-name" placeholder="যেমন: আরিফ হোসেন" {...register('name')} />
                  </FormField>
                  <FormField label="ইমেইল ঠিকানা" htmlFor="contact-email" error={errors.email?.message} required>
                    <Input id="contact-email" type="email" placeholder="you@example.com" {...register('email')} />
                  </FormField>
                </div>
                <FormField label="বিষয়" htmlFor="contact-subject" error={errors.subject?.message} required>
                  <Input id="contact-subject" placeholder="সাবস্ক্রিপশন বা সিলেবাস বিষয়ক জিজ্ঞাসা" {...register('subject')} />
                </FormField>
                <FormField label="বার্তা" htmlFor="contact-message" error={errors.message?.message} required>
                  <Textarea id="contact-message" rows={4} placeholder="আপনার বিস্তারিত বার্তা এখানে লিখুন..." {...register('message')} />
                </FormField>
                <Button type="submit" disabled={isSubmitting}>
                  বার্তা পাঠান
                </Button>
              </form>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
