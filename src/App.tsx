import React from 'react';
import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  Activity,
  BookOpen,
  Bookmark,
  CreditCard,
  Download,
  FilePlus2,
  FileText,
  Gamepad2,
  Globe,
  GraduationCap,
  Heart,
  Layers,
  LayoutDashboard,
  Library,
  Presentation,
  Radio,
  Receipt,
  Settings,
  ShieldCheck,
  Trophy,
  User,
  Users,
} from 'lucide-react';
import { DashboardLayout, type SidebarNavItem } from './components/layout/DashboardLayout';
import { PublicLayout } from './components/layout/PublicLayout';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { AcademicBuilderPage } from './pages/academic/AcademicBuilderPage';
import { AdmissionBuilderPage } from './pages/admission/AdmissionBuilderPage';
import {
  AuthCallbackPage,
  ForgotPasswordPage,
  LoginPage,
  RegisterPage,
  ResetPasswordPage,
} from './pages/auth/AuthPages';
import { AdminAcademicPage } from './pages/admin/AdminAcademicPage';
import { AdminOverviewPage } from './pages/admin/AdminOverviewPage';
import {
  AdminAdmissionManagePage,
  AdminKidsGameManagePage,
  AdminLearningManagePage,
} from './pages/admin/AdminPlatformModulesPage';
import { AdminQuestionFormPage, AdminQuestionsListPage } from './pages/admin/AdminQuestionsPage';
import {
  AdminPaymentsPage,
  AdminPlansPage,
  AdminSubscribersPage,
} from './pages/admin/AdminSubscriptionsPaymentsPage';
import {
  AdminLogsSettingsPage,
  AdminUsersPage,
  AdminWebsitePage,
} from './pages/admin/AdminSystemWebsitePage';
import {
  DashboardOverviewPage,
  DownloadsPage,
  MyClassesPage,
  ProfileSettingsPage,
} from './pages/dashboard/DashboardOverviewPage';
import { MyPapersPage, PaperBuilderPage, PaperPreviewPage } from './pages/dashboard/PapersPages';
import { QuestionBankPage, QuestionDetailPage } from './pages/dashboard/QuestionBankPage';
import {
  NewManualPaymentPage,
  PaymentHistoryPage,
  SubscriptionPage,
} from './pages/dashboard/SubscriptionPaymentPages';
import { QuestionPaperEditorPage } from './pages/editor/QuestionPaperEditorPage';
import {
  CreateLiveExamPage,
  ExamResultPage,
  LiveExamsHubPage,
  TakeLiveExamPage,
} from './pages/exams/LiveExamPages';
import { KidsGameCategoryPage, KidsGameHomePage } from './pages/kids/KidsGamePages';
import {
  LearningDirectoryPage,
  LearningHubHomePage,
  LearningSolutionPage,
} from './pages/learning/LearningHubPages';
import {
  LeaderboardPage,
  PublicStudentProfilePage,
} from './pages/profile/LeaderboardAndProfilePages';
import { CurriculumExplorerPage } from './pages/public/CurriculumExplorerPage';
import { HomePage } from './pages/public/HomePage';
import {
  AboutPage,
  ContactPage,
  FaqPage,
  HowItWorksPage,
  PaymentInstructionsPage,
} from './pages/public/InfoPages';
import { PricingPage } from './pages/public/PricingPage';
import { SlideMakerPage } from './pages/slides/SlideMakerPage';

const queryClient = new QueryClient();

function SessionLoadingScreen() {
  return (
    <div className="min-h-screen bg-[#07090C] text-[#F3EEE3] flex flex-col items-center justify-center px-4 font-bangla">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#D4A853] border-t-transparent" />
      <p className="mt-3 text-sm text-[#B8C0CE]">সেশন ও অনুমোদন যাচাই হচ্ছে...</p>
    </div>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isHydrating } = useAuth();
  if (isHydrating) return <SessionLoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, isHydrating, enterQuickAdmin } = useAuth();
  const [autoActivating, setAutoActivating] = React.useState(false);

  React.useEffect(() => {
    if (!isHydrating && (!user || user.role !== 'admin') && !autoActivating) {
      setAutoActivating(true);
      enterQuickAdmin()
        .catch(() => undefined)
        .finally(() => setAutoActivating(false));
    }
  }, [isHydrating, user, autoActivating, enterQuickAdmin]);

  if (isHydrating || autoActivating || !user || user.role !== 'admin') {
    return <SessionLoadingScreen />;
  }
  return <>{children}</>;
}

function QuestionDetailRoute() {
  const { questionId } = useParams<{ questionId: string }>();
  if (!questionId) return null;
  return <QuestionDetailPage questionId={questionId} />;
}

const studentNavItems: SidebarNavItem[] = [
  { to: '/dashboard', label: 'ড্যাশবোর্ড', icon: <LayoutDashboard className="h-4 w-4" />, end: true, group: 'সার্বিক চিত্র' },
  { to: '/academic', label: 'একাডেমিক বিল্ডার (১–১২)', icon: <FilePlus2 className="h-4 w-4" />, group: 'সার্বিক চিত্র' },
  { to: '/admission', label: 'ভর্তি পরীক্ষা বিল্ডার', icon: <GraduationCap className="h-4 w-4" />, group: 'সার্বিক চিত্র' },
  { to: '/dashboard/slides', label: 'অটো স্লাইড মেকার', icon: <Presentation className="h-4 w-4" />, group: 'সার্বিক চিত্র' },
  { to: '/dashboard/exams', label: 'লাইভ পরীক্ষা', icon: <Radio className="h-4 w-4" />, group: 'সার্বিক চিত্র' },
  { to: '/dashboard/leaderboard', label: 'লিডারবোর্ড', icon: <Trophy className="h-4 w-4" />, group: 'সার্বিক চিত্র' },
  { to: '/learning', label: 'ফ্রি লার্নিং হাব', icon: <Library className="h-4 w-4" />, group: 'অধ্যয়ন' },
  { to: '/kids-game', label: 'কিডস ম্যাথ গেম', icon: <Gamepad2 className="h-4 w-4" />, group: 'অধ্যয়ন' },
  { to: '/dashboard/classes', label: 'আমার শ্রেণিসমূহ', icon: <GraduationCap className="h-4 w-4" />, group: 'অধ্যয়ন' },
  { to: '/dashboard/curriculum', label: 'পাঠ্যক্রম (১–১২)', icon: <Layers className="h-4 w-4" />, group: 'অধ্যয়ন' },
  { to: '/dashboard/questions', label: 'প্রশ্নব্যাংক', icon: <BookOpen className="h-4 w-4" />, group: 'অধ্যয়ন' },
  { to: '/dashboard/favorites', label: 'পছন্দসই প্রশ্ন', icon: <Heart className="h-4 w-4" />, group: 'ব্যবস্থাপনা' },
  { to: '/dashboard/saved', label: 'সংরক্ষিত প্রশ্ন', icon: <Bookmark className="h-4 w-4" />, group: 'ব্যবস্থাপনা' },
  { to: '/dashboard/papers', label: 'আমার তৈরি প্রশ্ন', icon: <FileText className="h-4 w-4" />, end: true, group: 'ব্যবস্থাপনা' },
  { to: '/dashboard/downloads', label: 'ডাউনলোডসমূহ', icon: <Download className="h-4 w-4" />, group: 'ব্যবস্থাপনা' },
  { to: '/dashboard/subscription', label: 'আমার সাবস্ক্রিপশন', icon: <ShieldCheck className="h-4 w-4" />, group: 'সাবস্ক্রিপশন সংক্রান্ত' },
  { to: '/dashboard/payments', label: 'পেমেন্ট ইতিহাস', icon: <Receipt className="h-4 w-4" />, group: 'সাবস্ক্রিপশন সংক্রান্ত' },
  { to: '/dashboard/profile', label: 'প্রোফাইল ও গোপনীয়তা', icon: <User className="h-4 w-4" />, group: 'সাবস্ক্রিপশন সংক্রান্ত' },
];

const adminNavItems: SidebarNavItem[] = [
  { to: '/admin', label: 'একনজরে', icon: <LayoutDashboard className="h-4 w-4" />, end: true, group: 'সারসংক্ষেপ' },
  { to: '/admin/academic', label: 'পাঠ্যক্রম ও বিষয় ব্যবস্থাপনা', icon: <Layers className="h-4 w-4" />, group: 'ক্যাটালগ' },
  { to: '/admin/admission', label: 'ভর্তি ও AI প্রশ্ন অনুমোদন', icon: <GraduationCap className="h-4 w-4" />, group: 'ক্যাটালগ' },
  { to: '/admin/questions', label: 'সকল প্রশ্ন', icon: <BookOpen className="h-4 w-4" />, end: true, group: 'ক্যাটালগ' },
  { to: '/admin/questions/new', label: 'নতুন প্রশ্ন যুক্ত করুন', icon: <FilePlus2 className="h-4 w-4" />, group: 'ক্যাটালগ' },
  { to: '/admin/learning', label: 'লার্নিং হাব ও মন্তব্য', icon: <Library className="h-4 w-4" />, group: 'কনটেন্ট ও গেম' },
  { to: '/admin/kids-games', label: 'কিডস গেম ব্যবস্থাপনা', icon: <Gamepad2 className="h-4 w-4" />, group: 'কনটেন্ট ও গেম' },
  { to: '/exams/new', label: 'লাইভ পরীক্ষা তৈরি', icon: <Radio className="h-4 w-4" />, group: 'প্ল্যাটফর্ম টুলস' },
  { to: '/slides', label: 'অটো স্লাইড মেকার', icon: <Presentation className="h-4 w-4" />, group: 'প্ল্যাটফর্ম টুলস' },
  { to: '/leaderboard', label: 'লিডারবোর্ড', icon: <Trophy className="h-4 w-4" />, group: 'প্ল্যাটফর্ম টুলস' },
  { to: '/admin/plans', label: 'সাবস্ক্রিপশন প্ল্যান', icon: <ShieldCheck className="h-4 w-4" />, group: 'সাবস্ক্রিপশন ও বিলিং' },
  { to: '/admin/subscribers', label: 'সাবস্ক্রাইবার তালিকা', icon: <GraduationCap className="h-4 w-4" />, group: 'সাবস্ক্রিপশন ও বিলিং' },
  { to: '/admin/payments', label: 'পেমেন্ট অনুমোদন', icon: <CreditCard className="h-4 w-4" />, group: 'সাবস্ক্রিপশন ও বিলিং' },
  { to: '/admin/users', label: 'ব্যবহারকারী ও ভূমিকা', icon: <Users className="h-4 w-4" />, group: 'প্ল্যাটফর্ম' },
  { to: '/admin/website', label: 'ওয়েবসাইট কনটেন্ট', icon: <Globe className="h-4 w-4" />, group: 'প্ল্যাটফর্ম' },
  { to: '/admin/logs', label: 'কার্যক্রম লগ', icon: <Activity className="h-4 w-4" />, group: 'সিস্টেম' },
  { to: '/admin/settings', label: 'UI থিম ও সেটিংস', icon: <Settings className="h-4 w-4" />, group: 'সিস্টেম' },
];

function NotFoundPage() {
  return (
    <div className="min-h-screen bg-[#07090C] text-[#F3EEE3] flex flex-col items-center justify-center px-4 text-center space-y-4 font-bangla">
      <h1 className="font-display text-3xl font-bold gold-text-gradient">পৃষ্ঠাটি পাওয়া যায়নি</h1>
      <p className="text-base text-[#B8C0CE]">আপনার অনুসন্ধানকৃত ঠিকানাটি সঠিক নয় বা বিদ্যমান নেই।</p>
      <a href="/" className="inline-block rounded-lg gold-btn px-5 py-2.5 text-base font-bold">
        হোম পেজে ফিরে যান
      </a>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <BrowserRouter>
              <Routes>
                {/* Public Marketing, Builders, Learning Hub, Kids Game & Auth Routes */}
                <Route element={<PublicLayout />}>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/academic" element={<AcademicBuilderPage />} />
                  <Route path="/admission" element={<AdmissionBuilderPage />} />
                  <Route path="/admission/:category" element={<AdmissionBuilderPage />} />
                  <Route path="/paper-editor/:paperId" element={<QuestionPaperEditorPage />} />

                  {/* Free Public SEO Learning Hub */}
                  <Route path="/learning" element={<LearningHubHomePage />} />
                  <Route path="/learning/admission/:categorySlug/:problemSlug" element={<LearningSolutionPage />} />
                  <Route path="/learning/:classSlug/:subjectSlug" element={<LearningDirectoryPage />} />
                  <Route path="/learning/:classSlug/:subjectSlug/:chapterSlug" element={<LearningDirectoryPage />} />
                  <Route
                    path="/learning/:classSlug/:subjectSlug/:chapterSlug/:exerciseSlug/:problemSlug"
                    element={<LearningSolutionPage />}
                  />

                  {/* Free Public Kids Math Game */}
                  <Route path="/kids-game" element={<KidsGameHomePage />} />
                  <Route path="/kids-game/:category" element={<KidsGameCategoryPage />} />

                  {/* Preserved Platform Tools */}
                  <Route path="/slides" element={<SlideMakerPage />} />
                  <Route path="/exams" element={<LiveExamsHubPage />} />
                  <Route path="/exams/new" element={<CreateLiveExamPage />} />
                  <Route path="/exams/:examId/take" element={<TakeLiveExamPage />} />
                  <Route path="/exams/:examId/result/:attemptId" element={<ExamResultPage />} />
                  <Route path="/leaderboard" element={<LeaderboardPage />} />
                  <Route path="/students/:userId" element={<PublicStudentProfilePage />} />

                  <Route path="/curriculum" element={<CurriculumExplorerPage />} />
                  <Route path="/subjects" element={<CurriculumExplorerPage />} />
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="/pricing" element={<PricingPage />} />
                  <Route path="/how-it-works" element={<HowItWorksPage />} />
                  <Route path="/payment-instructions" element={<PaymentInstructionsPage />} />
                  <Route path="/faq" element={<FaqPage />} />
                  <Route path="/contact" element={<ContactPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/auth/callback" element={<AuthCallbackPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />
                </Route>

                {/* Student / User Dashboard */}
                <Route
                  path="/dashboard"
                  element={
                    <RequireAuth>
                      <DashboardLayout
                        portalLabel="শিক্ষার্থী পোর্টাল"
                        navItems={studentNavItems}
                        homePath="/dashboard"
                        variant="student"
                      />
                    </RequireAuth>
                  }
                >
                  <Route index element={<DashboardOverviewPage />} />
                  <Route path="slides" element={<SlideMakerPage />} />
                  <Route path="exams" element={<LiveExamsHubPage />} />
                  <Route path="exams/new" element={<CreateLiveExamPage />} />
                  <Route path="leaderboard" element={<LeaderboardPage />} />
                  <Route path="classes" element={<MyClassesPage />} />
                  <Route path="curriculum" element={<CurriculumExplorerPage inDashboard />} />
                  <Route path="questions" element={<QuestionBankPage mode="browse" />} />
                  <Route path="questions/:questionId" element={<QuestionDetailRoute />} />
                  <Route path="favorites" element={<QuestionBankPage mode="favorites" />} />
                  <Route path="saved" element={<QuestionBankPage mode="saved" />} />
                  <Route path="papers" element={<MyPapersPage />} />
                  <Route path="papers/new" element={<PaperBuilderPage />} />
                  <Route path="papers/:paperId" element={<PaperBuilderPage />} />
                  <Route path="papers/:paperId/preview" element={<PaperPreviewPage />} />
                  <Route path="papers/:paperId/editor" element={<QuestionPaperEditorPage />} />
                  <Route path="subscription" element={<SubscriptionPage />} />
                  <Route path="payments" element={<PaymentHistoryPage />} />
                  <Route path="payments/new" element={<NewManualPaymentPage />} />
                  <Route path="downloads" element={<DownloadsPage />} />
                  <Route path="profile" element={<ProfileSettingsPage />} />
                </Route>

                {/* Admin Dashboard */}
                <Route
                  path="/admin"
                  element={
                    <RequireAdmin>
                      <DashboardLayout
                        portalLabel="অ্যাডমিন কনসোল"
                        navItems={adminNavItems}
                        homePath="/admin"
                      />
                    </RequireAdmin>
                  }
                >
                  <Route index element={<AdminOverviewPage />} />
                  <Route path="academic" element={<AdminAcademicPage />} />
                  <Route path="admission" element={<AdminAdmissionManagePage />} />
                  <Route path="learning" element={<AdminLearningManagePage />} />
                  <Route path="kids-games" element={<AdminKidsGameManagePage />} />
                  <Route path="questions" element={<AdminQuestionsListPage />} />
                  <Route path="questions/new" element={<AdminQuestionFormPage />} />
                  <Route path="questions/:questionId/edit" element={<AdminQuestionFormPage />} />
                  <Route path="plans" element={<AdminPlansPage />} />
                  <Route path="subscribers" element={<AdminSubscribersPage />} />
                  <Route path="payments" element={<AdminPaymentsPage />} />
                  <Route path="users" element={<AdminUsersPage />} />
                  <Route path="website" element={<AdminWebsitePage />} />
                  <Route path="logs" element={<AdminLogsSettingsPage mode="logs" />} />
                  <Route path="settings" element={<AdminLogsSettingsPage mode="settings" />} />
                </Route>

                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </BrowserRouter>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
