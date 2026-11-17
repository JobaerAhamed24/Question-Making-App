import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Mail } from 'lucide-react';
import { Button, Card, FormField, Input, Select } from '../../components/ui/Primitives';
import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../services/authService';
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
  const { login } = useAuth();
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

  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6 font-bangla">
      <div>
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
        title: 'যাচাইকরণ ইমেইল পাঠানো হয়েছে',
        description: 'ইমেইলের লিংক খুলে অ্যাকাউন্ট সক্রিয় করুন।',
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
          <h1 className="font-display text-xl font-bold text-[#F5EFE2]">ইমেইল যাচাই করুন</h1>
          <p className="text-base text-[#B8C0CE] leading-relaxed">
            <span className="font-medium text-[#EAC779]">{verificationStepEmail}</span> ঠিকানায় পাঠানো লিংকটি খুলে অ্যাকাউন্ট সক্রিয় করুন। যাচাই সম্পন্ন হলে আবার লগইন করুন।
          </p>
          <Button className="w-full" onClick={() => navigate('/login')}>
            লগইন পেজে যান
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
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setFormError(null);
    try {
      await authService.forgotPassword(data.email);
      setSentEmail(data.email);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'রিসেট ইমেইল পাঠানো যায়নি।');
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-14 font-bangla">
      <Card className="p-6 sm:p-8">
        <h1 className="font-display text-2xl font-bold gold-text-gradient">পাসওয়ার্ড পুনরুদ্ধার</h1>
        {formError && <div role="alert" className="mt-4 rounded-lg border border-rose-500/40 bg-rose-950/60 px-3.5 py-2.5 text-sm text-rose-200">{formError}</div>}
        {sentEmail ? (
          <div className="mt-4 space-y-4">
            <div className="flex items-start gap-3 rounded-lg border border-emerald-500/35 bg-emerald-950/50 p-3.5 text-base text-emerald-200">
              <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5 text-emerald-400" />
              <p>যদি <span className="font-semibold">{sentEmail}</span> ঠিকানায় অ্যাকাউন্ট থাকে, সেখানে পাসওয়ার্ড রিসেট লিংক পাঠানো হয়েছে।</p>
            </div>
            <Link to="/login" className="block text-center text-sm font-medium text-[#EAC779] hover:underline">লগইন পেজে ফিরুন</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4" noValidate>
            <p className="text-base text-[#B8C0CE]">আপনার নিবন্ধিত ইমেইল ঠিকানায় একটি নিরাপদ রিসেট লিংক পাঠানো হবে।</p>
            <FormField label="ইমেইল ঠিকানা" htmlFor="fp-email" error={errors.email?.message} required>
              <Input id="fp-email" type="email" placeholder="you@example.com" {...register('email')} />
            </FormField>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'পাঠানো হচ্ছে…' : 'রিসেট লিংক পাঠান'}
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
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (values: ResetPasswordFormValues) => {
    setFormError(null);
    try {
      await authService.resetPassword('', values.password);
      await authService.logout();
      pushToast({ title: 'পাসওয়ার্ড হালনাগাদ হয়েছে', description: 'নতুন পাসওয়ার্ড দিয়ে লগইন করুন।', variant: 'success' });
      navigate('/login');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'পাসওয়ার্ড হালনাগাদ করা যায়নি।');
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-14 font-bangla">
      <Card className="p-6 sm:p-8">
        <h1 className="font-display text-2xl font-bold gold-text-gradient">পাসওয়ার্ড পরিবর্তন</h1>
        <p className="mt-2 text-sm text-[#B8C0CE]">ইমেইলের নিরাপদ রিসেট লিংক থেকে এই পেজে আসুন।</p>
        {formError && <div role="alert" className="mt-4 rounded-lg border border-rose-500/40 bg-rose-950/60 px-3.5 py-2.5 text-sm text-rose-200">{formError}</div>}
        <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4" noValidate>
          <FormField label="নতুন পাসওয়ার্ড" htmlFor="rp-pw" error={errors.password?.message} required>
            <Input id="rp-pw" type="password" placeholder="কমপক্ষে ৮ অক্ষর" {...register('password')} />
          </FormField>
          <FormField label="পাসওয়ার্ড নিশ্চিত করুন" htmlFor="rp-cpw" error={errors.confirmPassword?.message} required>
            <Input id="rp-cpw" type="password" placeholder="পুনরায় পাসওয়ার্ড লিখুন" {...register('confirmPassword')} />
          </FormField>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'সংরক্ষণ হচ্ছে…' : 'পাসওয়ার্ড সংরক্ষণ করুন'}
          </Button>
        </form>
      </Card>
    </div>
  );
}

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void authService.completeAuthCallback().then(async () => {
      const recovery = new URLSearchParams(window.location.search).get('type') === 'recovery';
      const { user } = await authService.getSessionUser();
      if (active) navigate(recovery ? '/reset-password' : user ? '/dashboard' : '/login', { replace: true });
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : 'ইমেইল লিংক যাচাই করা যায়নি।');
    });
    return () => { active = false; };
  }, [navigate]);

  return (
    <div className="mx-auto max-w-md px-4 py-16 font-bangla text-center">
      <Card className="p-6">
        <h1 className="font-display text-xl font-bold text-[#F5EFE2]">ইমেইল লিংক যাচাই হচ্ছে</h1>
        <p role={error ? 'alert' : undefined} className="mt-3 text-sm text-[#B8C0CE]">{error || 'নিরাপদে সেশন তৈরি করা হচ্ছে…'}</p>
        {error && <Link to="/login" className="mt-4 inline-block text-sm text-[#EAC779] hover:underline">লগইন পেজে যান</Link>}
      </Card>
    </div>
  );
}
