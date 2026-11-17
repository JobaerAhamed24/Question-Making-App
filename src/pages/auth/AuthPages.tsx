import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Mail } from 'lucide-react';
import { Button, Card, FormField, Input, Select } from '../../components/ui/Primitives';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  type ForgotPasswordFormValues,
  type LoginFormValues,
  type RegisterFormValues,
  type ResetPasswordFormValues,
} from '../../lib/validations';

export function LoginPage() {
  const { login, quickDemoLogin } = useAuth();
  const { pushToast } = useToast();
  const navigate = useNavigate();
  const [authError, setAuthError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setAuthError(null);
    try {
      const loggedIn = await login(data.email, data.password);
      pushToast({ title: `স্বাগতম, ${loggedIn.fullName}`, variant: 'success' });
      navigate(loggedIn.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'লগইন করা সম্ভব হয়নি।');
    }
  };

  const handleDemoUser = async (userId: string) => {
    setAuthError(null);
    try {
      const loggedIn = await quickDemoLogin(userId);
      pushToast({
        title: `${loggedIn.fullName} হিসেবে লগইন সম্পন্ন`,
        description: loggedIn.role === 'admin' ? 'অ্যাডমিন ড্যাশবোর্ড' : 'শিক্ষার্থী ড্যাশবোর্ড',
        variant: 'success',
      });
      navigate(loggedIn.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'ডেমো লগইন সম্পন্ন করা যায়নি।');
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 font-bangla">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <Card className="p-6 sm:p-8">
            <h1 className="font-display text-2xl font-bold gold-text-gradient">প্রশ্নব্যাংকে লগইন করুন</h1>
            <p className="mt-1.5 text-base text-[#B8C0CE]">
              আপনার সাবস্ক্রাইবকৃত শ্রেণি, সংরক্ষিত প্রশ্ন এবং প্রশ্নপত্রে প্রবেশ করুন।
            </p>

            {authError && (
              <div role="alert" className="mt-4 rounded-lg border border-rose-500/40 bg-rose-950/60 px-3.5 py-2.5 text-sm font-medium text-rose-200">
                {authError}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
              <FormField label="ইমেইল ঠিকানা" htmlFor="login-email" error={errors.email?.message} required>
                <Input id="login-email" type="email" placeholder="nadia@student.demo" {...register('email')} />
              </FormField>

              <FormField label="পাসওয়ার্ড" htmlFor="login-password" error={errors.password?.message} required>
                <Input id="login-password" type="password" placeholder="••••••••" {...register('password')} />
              </FormField>

              <div className="flex items-center justify-between text-sm">
                <Link to="/forgot-password" className="font-medium text-[#EAC779] hover:underline">
                  পাসওয়ার্ড ভুলে গেছেন?
                </Link>
                <Link to="/register" className="font-medium text-[#B8C0CE] hover:text-[#F5EFE2]">
                  নতুন অ্যাকাউন্ট তৈরি করুন
                </Link>
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                লগইন করুন
              </Button>
            </form>
          </Card>
        </div>

        {/* তাৎক্ষণিক ডেমো অ্যাকাউন্ট প্যানেল */}
        <div className="lg:col-span-6">
          <Card className="p-6 sm:p-8">
            <h2 className="font-display text-lg font-bold text-[#EAC779]">
              এক ক্লিকে ডেমো অ্যাকাউন্ট ব্যবহার করুন
            </h2>
            <p className="mt-1 text-sm text-[#B8C0CE] leading-relaxed">
              এক ক্লিকেই সকল সাবস্ক্রিপশন নিয়ম এবং ব্যবহারকারীর ভূমিকা পরীক্ষা করে দেখুন।
            </p>

            <div className="mt-5 space-y-3">
              {[
                {
                  id: 'u-student-active',
                  name: 'নাদিয়া রহমান — সক্রিয় সাবস্ক্রাইবার',
                  detail: '৬ষ্ঠ ও ৮ম শ্রেণিতে সক্রিয় (৭ম ও ৯ম–১০ম শ্রেণি অবরুদ্ধ)',
                  creds: 'nadia@student.demo / demo1234',
                },
                {
                  id: 'u-student-unsub',
                  name: 'তানভীর হাসান — সাবস্ক্রিপশনবিহীন শিক্ষার্থী',
                  detail: 'সক্রিয় সাবস্ক্রিপশন নেই · ১টি অপেক্ষমাণ ম্যানুয়াল পেমেন্ট রয়েছে',
                  creds: 'tanvir@student.demo / demo1234',
                },
                {
                  id: 'u-student-expired',
                  name: 'ফারহানা আক্তার — মেয়াদোত্তীর্ণ সাবস্ক্রাইবার',
                  detail: '৬ষ্ঠ শ্রেণির মেয়াদ শেষ · পূর্বের প্রশ্নপত্র দেখা ও ডাউনলোডযোগ্য',
                  creds: 'farhana@student.demo / demo1234',
                },
                {
                  id: 'u-admin',
                  name: 'ড. মাহবুব আলম — প্ল্যাটফর্ম অ্যাডমিন',
                  detail: 'একাডেমিক কাঠামো, প্রশ্ন, প্ল্যান, পেমেন্ট ও ব্যবহারকারী নিয়ন্ত্রণ',
                  creds: 'admin@questionbank.demo / admin1234',
                },
              ].map((demo) => (
                <button
                  key={demo.id}
                  type="button"
                  onClick={() => handleDemoUser(demo.id)}
                  className="w-full rounded-lg border border-[#D4A853]/25 bg-[#0A0D12] p-3.5 text-left hover:border-[#EAC779] hover:bg-[#131822] transition-all cursor-pointer"
                >
                  <p className="text-base font-semibold text-[#F5EFE2]">{demo.name}</p>
                  <p className="mt-0.5 text-sm text-[#B8C0CE]">{demo.detail}</p>
                  <p className="mt-1 font-mono text-xs text-[#D4A853]">{demo.creds}</p>
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export function RegisterPage() {
  const { register: registerAccount } = useAuth();
  const { pushToast } = useToast();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);
  const [verificationStepEmail, setVerificationStepEmail] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { preferredLanguage: 'bn' },
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setFormError(null);
    try {
      await registerAccount({
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        institution: data.institution,
        preferredLanguage: data.preferredLanguage,
        password: data.password,
      });
      setVerificationStepEmail(data.email);
      pushToast({
        title: 'অ্যাকাউন্ট তৈরি হয়েছে',
        description: 'ইমেইল যাচাই ধাপ সম্পন্ন হয়েছে। ড্যাশবোর্ডে প্রবেশ করুন।',
        variant: 'success',
      });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'নিবন্ধন সম্পন্ন করা যায়নি।');
    }
  };

  if (verificationStepEmail) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 font-bangla">
        <Card className="p-6 text-center space-y-4">
          <Mail className="mx-auto h-10 w-10 text-[#EAC779]" />
          <h1 className="font-display text-xl font-bold text-[#F5EFE2]">ইমেইল যাচাইকরণ সম্পন্ন</h1>
          <p className="text-base text-[#B8C0CE] leading-relaxed">
            মূল পরিবেশে <span className="font-medium text-[#EAC779]">{verificationStepEmail}</span> ঠিকানায় একটি যাচাইকরণ লিংক পাঠানো হয়। এই প্রোটোটাইপে আপনার শিক্ষার্থী অ্যাকাউন্ট তাৎক্ষণিকভাবে ব্যবহারের জন্য প্রস্তুত।
          </p>
          <Button className="w-full" onClick={() => navigate('/dashboard')}>
            শিক্ষার্থী ড্যাশবোর্ডে যান
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12 font-bangla">
      <Card className="p-6 sm:p-8">
        <h1 className="font-display text-2xl font-bold gold-text-gradient">শিক্ষার্থী অ্যাকাউন্ট তৈরি করুন</h1>
        <p className="mt-1.5 text-base text-[#B8C0CE]">
          শ্রেণি-ভিত্তিক সাবস্ক্রিপশন নিতে এবং প্রশ্নপত্র তৈরি করতে নিবন্ধন করুন।
        </p>

        {formError && (
          <div role="alert" className="mt-4 rounded-lg border border-rose-500/40 bg-rose-950/60 px-3.5 py-2.5 text-sm font-medium text-rose-200">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
          <FormField label="পূর্ণ নাম" htmlFor="reg-name" error={errors.fullName?.message} required>
            <Input id="reg-name" placeholder="যেমন: নুসরাত জাহান" {...register('fullName')} />
          </FormField>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="ইমেইল ঠিকানা" htmlFor="reg-email" error={errors.email?.message} required>
              <Input id="reg-email" type="email" placeholder="student@example.com" {...register('email')} />
            </FormField>
            <FormField label="মোবাইল নম্বর" htmlFor="reg-phone" error={errors.phone?.message} required>
              <Input id="reg-phone" placeholder="01711-000000" {...register('phone')} />
            </FormField>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="বিদ্যালয় / প্রতিষ্ঠান" htmlFor="reg-inst" error={errors.institution?.message}>
              <Input id="reg-inst" placeholder="ঐচ্ছিক" {...register('institution')} />
            </FormField>
            <FormField label="পছন্দের ভাষা" htmlFor="reg-lang" error={errors.preferredLanguage?.message}>
              <Select id="reg-lang" {...register('preferredLanguage')}>
                <option value="bn">বাংলা</option>
                <option value="en">English (ইংরেজি)</option>
              </Select>
            </FormField>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="পাসওয়ার্ড" htmlFor="reg-pw" error={errors.password?.message} required>
              <Input id="reg-pw" type="password" placeholder="কমপক্ষে ৮ অক্ষর" {...register('password')} />
            </FormField>
            <FormField label="পাসওয়ার্ড নিশ্চিত করুন" htmlFor="reg-cpw" error={errors.confirmPassword?.message} required>
              <Input id="reg-cpw" type="password" placeholder="পুনরায় পাসওয়ার্ড লিখুন" {...register('confirmPassword')} />
            </FormField>
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            অ্যাকাউন্ট তৈরি করুন
          </Button>
          <p className="text-center text-sm text-[#B8C0CE]">
            ইতিমধ্যেই অ্যাকাউন্ট আছে?{' '}
            <Link to="/login" className="font-medium text-[#EAC779] hover:underline">
              লগইন করুন
            </Link>
          </p>
        </form>
      </Card>
    </div>
  );
}

export function ForgotPasswordPage() {
  const [sentEmail, setSentEmail] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = (data: ForgotPasswordFormValues) => {
    setSentEmail(data.email);
  };

  return (
    <div className="mx-auto max-w-md px-4 py-14 font-bangla">
      <Card className="p-6 sm:p-8">
        <h1 className="font-display text-2xl font-bold gold-text-gradient">পাসওয়ার্ড পুনরুদ্ধার</h1>
        {sentEmail ? (
          <div className="mt-4 space-y-4">
            <div className="flex items-start gap-3 rounded-lg border border-emerald-500/35 bg-emerald-950/50 p-3.5 text-base text-emerald-200">
              <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5 text-emerald-400" />
              <p>
                <span className="font-semibold">{sentEmail}</span> ঠিকানার জন্য একটি নমুনা পাসওয়ার্ড রিসেট কোড প্রস্তুত করা হয়েছে।
              </p>
            </div>
            <Link
              to="/reset-password"
              className="block rounded-lg gold-btn px-4 py-2.5 text-center text-base font-bold"
            >
              নতুন পাসওয়ার্ড সেট করুন
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4" noValidate>
            <p className="text-base text-[#B8C0CE]">
              পাসওয়ার্ড পুনরুদ্ধার কোড পেতে আপনার নিবন্ধিত ইমেইল ঠিকানা লিখুন।
            </p>
            <FormField label="ইমেইল ঠিকানা" htmlFor="fp-email" error={errors.email?.message} required>
              <Input id="fp-email" type="email" placeholder="you@example.com" {...register('email')} />
            </FormField>
            <Button type="submit" className="w-full">
              রিসেট নির্দেশনা পাঠান
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = () => {
    pushToast({
      title: 'পাসওয়ার্ড হালনাগাদ হয়েছে',
      description: 'এখন আপনি নতুন পাসওয়ার্ড দিয়ে লগইন করতে পারবেন।',
      variant: 'success',
    });
    navigate('/login');
  };

  return (
    <div className="mx-auto max-w-md px-4 py-14 font-bangla">
      <Card className="p-6 sm:p-8">
        <h1 className="font-display text-2xl font-bold gold-text-gradient">পাসওয়ার্ড পরিবর্তন</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4" noValidate>
          <FormField label="যাচাইকরণ কোড" htmlFor="rp-token" error={errors.token?.message} required>
            <Input id="rp-token" placeholder="৬ সংখ্যার কোড লিখুন (যেমন: 123456)" {...register('token')} />
          </FormField>
          <FormField label="নতুন পাসওয়ার্ড" htmlFor="rp-pw" error={errors.password?.message} required>
            <Input id="rp-pw" type="password" placeholder="কমপক্ষে ৮ অক্ষর" {...register('password')} />
          </FormField>
          <FormField label="পাসওয়ার্ড নিশ্চিত করুন" htmlFor="rp-cpw" error={errors.confirmPassword?.message} required>
            <Input id="rp-cpw" type="password" placeholder="পুনরায় পাসওয়ার্ড লিখুন" {...register('confirmPassword')} />
          </FormField>
          <Button type="submit" className="w-full">
            পাসওয়ার্ড সংরক্ষণ করুন
          </Button>
        </form>
      </Card>
    </div>
  );
}
