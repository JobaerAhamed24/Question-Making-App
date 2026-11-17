import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().email('সঠিক ইমেইল ঠিকানা লিখুন।'),
  password: z.string().min(6, 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।'),
});

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, 'পূর্ণ নাম কমপক্ষে ২ অক্ষরের হতে হবে।'),
    email: z.string().trim().email('সঠিক ইমেইল ঠিকানা লিখুন।'),
    phone: z
      .string()
      .trim()
      .min(10, 'সঠিক মোবাইল নম্বর লিখুন।')
      .max(18, 'মোবাইল নম্বরটি খুব বড়।'),
    institution: z.string().trim().optional(),
    preferredLanguage: z.enum(['en', 'bn']),
    password: z.string().min(8, 'পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে।'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'পাসওয়ার্ড দুটি মেলেনি।',
    path: ['confirmPassword'],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('সঠিক ইমেইল ঠিকানা লিখুন।'),
});

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, 'পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে।'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'পাসওয়ার্ড দুটি মেলেনি।',
    path: ['confirmPassword'],
  });

export const profileSchema = z.object({
  fullName: z.string().trim().min(2, 'পূর্ণ নাম আবশ্যক।'),
  phone: z.string().trim().min(10, 'সঠিক মোবাইল নম্বর লিখুন।'),
  institution: z.string().trim().optional(),
  preferredLanguage: z.enum(['en', 'bn']),
});

export const contactSchema = z.object({
  name: z.string().trim().min(2, 'অনুগ্রহ করে আপনার নাম লিখুন।'),
  email: z.string().trim().email('সঠিক ইমেইল ঠিকানা লিখুন।'),
  subject: z.string().trim().min(3, 'বিষয় কমপক্ষে ৩ অক্ষরের হতে হবে।'),
  message: z.string().trim().min(12, 'বার্তা কমপক্ষে ১২ অক্ষরের হতে হবে।'),
});

export const manualPaymentSchema = z.object({
  planId: z.string().min(1, 'অনুগ্রহ করে একটি সাবস্ক্রিপশন প্ল্যান নির্বাচন করুন।'),
  paymentMethodId: z.string().min(1, 'অনুগ্রহ করে একটি পেমেন্ট মাধ্যম নির্বাচন করুন।'),
  senderNumber: z
    .string()
    .trim()
    .min(6, 'প্রেরকের অ্যাকাউন্ট বা মোবাইল নম্বর লিখুন।')
    .max(32, 'প্রেরকের নম্বরটি খুব বড়।'),
  transactionRef: z
    .string()
    .trim()
    .min(4, 'সঠিক ট্রানজেকশন আইডি বা রেফারেন্স লিখুন।')
    .max(64, 'ট্রানজেকশন রেফারেন্সটি খুব বড়।'),
  submittedAmountBdt: z.coerce
    .number()
    .positive('পেমেন্টের পরিমাণ শূন্যের চেয়ে বেশি হতে হবে।'),
  acknowledgedRenewalRule: z.boolean().refine((v) => v === true, {
    message: 'জমা দেওয়ার আগে তাৎক্ষণিক নবায়ন নীতিমালাটি নিশ্চিত করুন।',
  }),
});

export const paperMetadataSchema = z.object({
  title: z.string().trim().min(3, 'প্রশ্নপত্রের শিরোনাম আবশ্যক।'),
  examName: z.string().trim().min(2, 'পরীক্ষার নাম আবশ্যক।'),
  classId: z.string().min(1, 'শ্রেণি নির্বাচন করুন।'),
  subjectId: z.string().min(1, 'বিষয় নির্বাচন করুন।'),
  schoolName: z.string().trim().min(2, 'প্রতিষ্ঠানের নাম আবশ্যক।'),
  examDate: z.string().min(1, 'পরীক্ষার তারিখ আবশ্যক।'),
  durationMinutes: z.coerce
    .number()
    .int()
    .min(10, 'সর্বনিম্ন ১০ মিনিট।')
    .max(300, 'সর্বোচ্চ ৩০০ মিনিট।'),
  instructions: z.string().trim().min(5, 'পরীক্ষার নির্দেশনা লিখুন।'),
  includeStudentFields: z.boolean(),
  includeHeaderFooter: z.boolean(),
  includePageNumbers: z.boolean(),
});

export const planFormSchema = z.object({
  name: z.string().trim().min(3, 'প্ল্যানের নাম আবশ্যক।'),
  nameBn: z.string().trim().min(2, 'বাংলায় প্ল্যানের নাম আবশ্যক।'),
  audienceLabel: z.string().trim().min(3, 'উদ্দেশ্যমূলক বিবরণ আবশ্যক।'),
  description: z.string().trim().min(10, 'বিবরণ কমপক্ষে ১০ অক্ষরের হতে হবে।'),
  priceBdt: z.coerce.number().int().positive('মূল্য ধনাত্মক হতে হবে।'),
  originalPriceBdt: z.coerce.number().int().nonnegative().optional().nullable(),
  durationDays: z.coerce.number().int().min(1, 'মেয়াদ কমপক্ষে ১ দিন হতে হবে।'),
  includedClassIds: z.array(z.string()).min(1, 'কমপক্ষে একটি শ্রেণি নির্বাচন করুন।'),
  featuresText: z.string().trim().min(3, 'কমপক্ষে একটি বৈশিষ্ট্য লিখুন।'),
  isActive: z.boolean(),
  displayOrder: z.coerce.number().int().min(1),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
export type ProfileFormValues = z.infer<typeof profileSchema>;
export type ContactFormValues = z.infer<typeof contactSchema>;
export type ManualPaymentFormValues = z.infer<typeof manualPaymentSchema>;
export type PaperMetadataFormValues = z.infer<typeof paperMetadataSchema>;
export type PlanFormValues = z.infer<typeof planFormSchema>;
