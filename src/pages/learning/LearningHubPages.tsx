import React, { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Atom,
  BookOpen,
  Calculator,
  ChevronRight,
  Edit3,
  ExternalLink,
  Flag,
  FlaskConical,
  GraduationCap,
  Heart,
  MessageSquare,
  Search,
  Sigma,
  Trash2,
  Youtube,
} from 'lucide-react';
import { SeoHead } from '../../components/seo/SeoHead';
import { Button, Card, Input, Textarea } from '../../components/ui/Primitives';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { formatBnDateTime, toBanglaDigits } from '../../lib/bn';
import { platformService } from '../../services/platformService';
import type { LearningCategorySlug, LearningComment, LearningContent } from '../../types/domain';

const LEARNING_CATEGORIES: Array<{
  slug: LearningCategorySlug;
  titleBn: string;
  subtitleBn: string;
  icon: React.ReactNode;
}> = [
  {
    slug: 'mathematics',
    titleBn: 'গণিত (Mathematics)',
    subtitleBn: 'শ্রেণি ৬–১০ এর অধ্যায় ও অনুশীলনীভিত্তিক সমাধান',
    icon: <Calculator className="h-5 w-5" />,
  },
  {
    slug: 'higher-mathematics',
    titleBn: 'উচ্চতর গণিত (Higher Math)',
    subtitleBn: 'এসএসসি ও এইচএসসি ত্রিকোণমিতি, ক্যালকুলাস ও জ্যামিতি',
    icon: <Sigma className="h-5 w-5" />,
  },
  {
    slug: 'physics',
    titleBn: 'পদার্থবিজ্ঞান (Physics)',
    subtitleBn: 'গতি, বল, তড়িৎ ও আধুনিক পদার্থবিজ্ঞানের গাণিতিক সমাধান',
    icon: <Atom className="h-5 w-5" />,
  },
  {
    slug: 'chemistry',
    titleBn: 'রসায়ন (Chemistry)',
    subtitleBn: 'রাসায়নিক সমীকরণ, pH, মোলারিটি ও জৈব রসায়ন',
    icon: <FlaskConical className="h-5 w-5" />,
  },
  {
    slug: 'admission',
    titleBn: 'ভর্তি প্রস্তুতি সমাধান',
    subtitleBn: 'DU, BUET ও মেডিকেল ভর্তি পরীক্ষার গুরুত্বপূর্ণ সমস্যা',
    icon: <GraduationCap className="h-5 w-5" />,
  },
];

function extractYouTubeEmbedUrl(url?: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
}

export function LearningHubHomePage() {
  const [activeCategory, setActiveCategory] = useState<LearningCategorySlug | 'all'>('all');
  const [search, setSearch] = useState('');

  const allItems = useMemo(() => platformService.listLearningContents(false), []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allItems.filter((item) => {
      if (activeCategory !== 'all' && item.categorySlug !== activeCategory) return false;
      if (!q) return true;
      return `${item.title} ${item.questionText} ${item.classNameBn} ${item.subjectNameBn} ${item.chapterNameBn}`
        .toLowerCase()
        .includes(q);
    });
  }, [allItems, activeCategory, search]);

  const jsonLd = useMemo(
    () => ({
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'ফ্রি লার্নিং হাব — গণিত, উচ্চতর গণিত, পদার্থবিজ্ঞান ও রসায়ন সমাধান',
      description:
        'বাংলাদেশ শিক্ষা বোর্ডের অধ্যায় ও অনুশীলনীভিত্তিক বিনামূল্যে ধাপে ধাপে গাণিতিক সমাধান ও ভিডিও টিউটোরিয়াল।',
    }),
    []
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 space-y-8 font-bangla">
      <SeoHead
        title="লার্নিং হাব | গণিত, পদার্থবিজ্ঞান ও রসায়ন ধাপে ধাপে ফ্রি সমাধান"
        description="শ্রেণি ৬–১২ এবং ভর্তি পরীক্ষার গণিত, উচ্চতর গণিত, পদার্থবিজ্ঞান ও রসায়নের অধ্যায়ভিত্তিক লিখিত সমাধান, সূত্র ও ভিডিও টিউটোরিয়াল।"
        canonicalPath="/learning"
        ogType="website"
        jsonLd={jsonLd}
      />

      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <p className="text-xs font-mono font-bold tracking-[0.22em] text-[#D4A853] uppercase">
          FREE PUBLIC LEARNING HUB
        </p>
        <h1 className="font-display text-3xl sm:text-4xl font-bold gold-text-gradient">
          ফ্রি লার্নিং হাব ও অধ্যায়ভিত্তিক সমাধান
        </h1>
        <p className="text-base text-[#B8C0CE] leading-relaxed">
          কোনো সাবস্ক্রিপশন ছাড়াই গণিত, উচ্চতর গণিত, পদার্থবিজ্ঞান, রসায়ন ও ভর্তি পরীক্ষার ধাপে ধাপে সমাধান, সূত্র ও ইউটিউব ক্লাস দেখুন।
        </p>
      </div>

      {/* Category Cards */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
        {LEARNING_CATEGORIES.map((cat) => {
          const active = activeCategory === cat.slug;
          const count = allItems.filter((i) => i.categorySlug === cat.slug).length;
          return (
            <button
              key={cat.slug}
              type="button"
              onClick={() => setActiveCategory(active ? 'all' : cat.slug)}
              className={`rounded-xl border p-4 text-left transition-all cursor-pointer ${
                active
                  ? 'border-[#EAC779] bg-[#D4A853]/15'
                  : 'obsidian-card-interactive'
              }`}
            >
              <div className="flex items-center justify-between text-[#EAC779]">
                {cat.icon}
                <span className="text-xs font-mono tabular-nums">{toBanglaDigits(count)}টি</span>
              </div>
              <h2 className="mt-2.5 text-sm font-bold text-[#F5EFE2]">{cat.titleBn}</h2>
              <p className="mt-1 text-xs text-[#9DA6B5] leading-snug">{cat.subtitleBn}</p>
            </button>
          );
        })}
      </div>

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-xl">
          <Search className="h-4 w-4 text-[#8C95A4] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="অধ্যায়, অনুশীলনী বা গাণিতিক সমস্যা খুঁজুন (যেমন: পরিমাপ, pH, পরাবৃত্ত)..."
            className="pl-10"
          />
        </div>
        {activeCategory !== 'all' && (
          <Button variant="secondary" size="sm" onClick={() => setActiveCategory('all')}>
            সকল বিষয় দেখুন
          </Button>
        )}
      </div>

      {/* Solutions Grid */}
      {filtered.length === 0 ? (
        <Card className="p-10 text-center space-y-2">
          <p className="text-base font-bold text-[#F5EFE2]">কোনো সমাধান খুঁজে পাওয়া যায়নি</p>
          <p className="text-sm text-[#9DA6B5]">অন্য কোনো শব্দ দিয়ে খুঁজুন অথবা সব বিষয় নির্বাচন করুন।</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {filtered.map((item) => {
            const url = platformService.getLearningContentUrl(item);
            return (
              <Card key={item.id} className="p-5 flex flex-col justify-between gap-4">
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#D4A853] font-medium">
                    <Link
                      to={
                        item.domain === 'academic'
                          ? `/learning/${item.classSlug}/${item.subjectSlug}`
                          : '/learning'
                      }
                      className="hover:underline"
                    >
                      {item.classNameBn} · {item.subjectNameBn}
                    </Link>
                    <span>›</span>
                    <span>{item.chapterNameBn}</span>
                    <span>›</span>
                    <span>{item.exerciseNameBn}</span>
                  </div>

                  <Link to={url} className="block group">
                    <h2 className="font-display text-lg font-bold text-[#F5EFE2] group-hover:text-[#EAC779] transition-colors">
                      {item.title}
                    </h2>
                  </Link>
                  <p className="text-sm text-[#C2C8D3] line-clamp-2 leading-relaxed">
                    {item.questionText}
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-[#D4A853]/15 pt-3 text-xs">
                  <div className="flex items-center gap-3 text-[#9DA6B5] tabular-nums">
                    <span>{toBanglaDigits(item.solutionSteps.length)}টি ধাপ</span>
                    {item.youtubeUrl && (
                      <span className="inline-flex items-center gap-1 text-rose-400">
                        <Youtube className="h-3.5 w-3.5" /> ভিডিও ক্লাস
                      </span>
                    )}
                  </div>
                  <Link
                    to={url}
                    className="inline-flex items-center gap-1 font-bold text-[#EAC779] hover:underline"
                  >
                    <span>সমাধান দেখুন</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function LearningDirectoryPage() {
  const { classSlug, subjectSlug, chapterSlug } = useParams<{
    classSlug?: string;
    subjectSlug?: string;
    chapterSlug?: string;
  }>();

  const items = useMemo(() => {
    return platformService
      .listLearningContents(false)
      .filter(
        (c) =>
          (!classSlug || c.classSlug === classSlug) &&
          (!subjectSlug || c.subjectSlug === subjectSlug) &&
          (!chapterSlug || c.chapterSlug === chapterSlug)
      );
  }, [classSlug, subjectSlug, chapterSlug]);

  const first = items[0];
  const heading = first
    ? `${first.classNameBn} — ${first.subjectNameBn}${chapterSlug ? ` (${first.chapterNameBn})` : ''}`
    : 'লার্নিং হাব অধ্যায় তালিকা';

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 space-y-6 font-bangla">
      <SeoHead
        title={`${heading} | ফ্রি লার্নিং হাব`}
        description={`${heading} এর অধ্যায় ও অনুশীলনীভিত্তিক সমাধানসমূহ।`}
        canonicalPath={
          chapterSlug
            ? `/learning/${classSlug}/${subjectSlug}/${chapterSlug}`
            : `/learning/${classSlug}/${subjectSlug}`
        }
      />

      <nav aria-label="ব্রেডক্রাম্ব" className="flex flex-wrap items-center gap-1.5 text-xs text-[#9DA6B5]">
        <Link to="/learning" className="text-[#D4A853] hover:underline">
          লার্নিং হাব
        </Link>
        {first && (
          <>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link to={`/learning/${first.classSlug}/${first.subjectSlug}`} className="hover:text-[#EAC779]">
              {first.classNameBn} · {first.subjectNameBn}
            </Link>
          </>
        )}
        {chapterSlug && first && (
          <>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-[#F5EFE2] font-semibold">{first.chapterNameBn}</span>
          </>
        )}
      </nav>

      <h1 className="font-display text-2xl sm:text-3xl font-bold gold-text-gradient">{heading}</h1>

      <div className="space-y-4">
        {items.map((item) => (
          <Card key={item.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs text-[#D4A853]">
                {item.chapterNameBn} · {item.exerciseNameBn}
              </p>
              <h2 className="text-lg font-bold text-[#F5EFE2]">{item.title}</h2>
              <p className="text-sm text-[#B8C0CE] line-clamp-2">{item.questionText}</p>
            </div>
            <Link
              to={platformService.getLearningContentUrl(item)}
              className="rounded-lg gold-btn px-4 py-2 text-xs font-bold whitespace-nowrap shrink-0 text-center"
            >
              সম্পূর্ণ সমাধান
            </Link>
          </Card>
        ))}
        {items.length === 0 && (
          <Card className="p-8 text-center space-y-3">
            <p className="text-sm text-[#B8C0CE]">এই অধ্যায়ে এখনো কোনো প্রকাশিত সমাধান নেই।</p>
            <Link to="/learning" className="inline-block rounded-lg gold-outline-btn px-4 py-2 text-xs font-semibold">
              লার্নিং হাবে ফিরে যান
            </Link>
          </Card>
        )}
      </div>
    </div>
  );
}

export function LearningSolutionPage() {
  const params = useParams<{
    classSlug?: string;
    subjectSlug?: string;
    chapterSlug?: string;
    exerciseSlug?: string;
    problemSlug?: string;
    categorySlug?: string;
  }>();
  const { user } = useAuth();
  const { pushToast } = useToast();

  const [commentBody, setCommentBody] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [commentRev, setCommentRev] = useState(0);

  const allPublished = useMemo(() => platformService.listLearningContents(false), []);
  const content: LearningContent | null = useMemo(
    () => platformService.getLearningContentByPath(params),
    [params]
  );

  const comments: LearningComment[] = useMemo(
    () => (content ? platformService.listComments(content.id) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [content?.id, commentRev]
  );

  if (!content) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center space-y-4 font-bangla">
        <h1 className="font-display text-2xl font-bold gold-text-gradient">সমাধান পৃষ্ঠাটি পাওয়া যায়নি</h1>
        <Link to="/learning" className="inline-block rounded-lg gold-btn px-5 py-2.5 text-sm font-bold">
          লার্নিং হাবে ফিরে যান
        </Link>
      </div>
    );
  }

  const currentIdx = allPublished.findIndex((i) => i.id === content.id);
  const prevProblem = currentIdx > 0 ? allPublished[currentIdx - 1] : null;
  const nextProblem =
    currentIdx >= 0 && currentIdx < allPublished.length - 1 ? allPublished[currentIdx + 1] : null;

  const relatedItems = content.relatedIds
    .map((id) => allPublished.find((c) => c.id === id))
    .filter((c): c is LearningContent => Boolean(c));

  const embedUrl = extractYouTubeEmbedUrl(content.youtubeUrl);
  const canonicalPath = platformService.getLearningContentUrl(content);

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Learning Hub', item: `${window.location.origin}/learning` },
        { '@type': 'ListItem', position: 2, name: content.subjectNameBn, item: `${window.location.origin}/learning/${content.classSlug}/${content.subjectSlug}` },
        { '@type': 'ListItem', position: 3, name: content.title, item: `${window.location.origin}${canonicalPath}` },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'QAPage',
      mainEntity: {
        '@type': 'Question',
        name: content.title,
        text: content.questionText,
        answerCount: 1,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `${content.solutionSteps.map((s) => `${s.heading}: ${s.detail}`).join(' ')} চূড়ান্ত উত্তর: ${content.finalAnswer}`,
        },
      },
    },
  ];

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!commentBody.trim()) {
      pushToast({ title: 'মন্তব্য লিখুন', variant: 'error' });
      return;
    }
    platformService.addComment(content.id, user, commentBody);
    setCommentBody('');
    setCommentRev((r) => r + 1);
    pushToast({ title: 'আপনার মন্তব্য যুক্ত হয়েছে', variant: 'success' });
  };

  return (
    <article className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-7 font-bangla">
      <SeoHead
        title={content.seoTitle || content.title}
        description={content.seoDescription || content.questionText}
        canonicalPath={canonicalPath}
        ogType="article"
        jsonLd={jsonLd}
      />

      {/* Breadcrumbs */}
      <nav aria-label="ব্রেডক্রাম্ব" className="flex flex-wrap items-center gap-1.5 text-xs text-[#9DA6B5]">
        <Link to="/learning" className="text-[#D4A853] hover:underline">
          লার্নিং হাব
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        {content.domain === 'academic' ? (
          <>
            <Link
              to={`/learning/${content.classSlug}/${content.subjectSlug}`}
              className="hover:text-[#EAC779]"
            >
              {content.classNameBn} · {content.subjectNameBn}
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link
              to={`/learning/${content.classSlug}/${content.subjectSlug}/${content.chapterSlug}`}
              className="hover:text-[#EAC779]"
            >
              {content.chapterNameBn}
            </Link>
          </>
        ) : (
          <span>{content.classNameBn} · {content.subjectNameBn}</span>
        )}
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-[#F5EFE2] font-semibold">{content.exerciseNameBn}</span>
      </nav>

      {/* Main Title & Question Card */}
      <header className="space-y-4">
        <h1 className="font-display text-2xl sm:text-3xl font-bold gold-text-gradient leading-snug">
          {content.title}
        </h1>
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-[#EAC779] uppercase tracking-wider">
            <BookOpen className="h-4 w-4" />
            <span>প্রশ্ন / গাণিতিক সমস্যা</span>
          </div>
          <p className="text-base sm:text-lg font-medium text-[#F5EFE2] leading-relaxed">
            {content.questionText}
          </p>
          {content.diagramSvg && (
            <div
              className="rounded-xl bg-white p-4 max-w-md mx-auto border border-[#D4A853]/30"
              dangerouslySetInnerHTML={{ __html: content.diagramSvg }}
            />
          )}
          {content.imageUrl && (
            <img
              src={content.imageUrl}
              alt={content.title}
              className="rounded-xl max-h-72 mx-auto border border-[#D4A853]/30 object-contain"
            />
          )}
        </Card>
      </header>

      {/* Formulas & Equations */}
      {(content.formulas.length > 0 || content.equations.length > 0) && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {content.formulas.length > 0 && (
            <Card className="p-5 space-y-2.5">
              <h2 className="text-sm font-bold text-[#EAC779]">প্রয়োজনীয় সূত্রাবলি</h2>
              <ul className="space-y-1.5 text-sm text-[#E5E0D5]">
                {content.formulas.map((f, i) => (
                  <li key={i} className="rounded-lg bg-[#0A0D12] border border-[#D4A853]/20 px-3 py-2">
                    {f}
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {content.equations.length > 0 && (
            <Card className="p-5 space-y-2.5">
              <h2 className="text-sm font-bold text-[#EAC779]">গাণিতিক সমীকরণ</h2>
              <ul className="space-y-1.5 text-sm font-mono text-[#E5E0D5]">
                {content.equations.map((eq, i) => (
                  <li key={i} className="rounded-lg bg-[#0A0D12] border border-[#D4A853]/20 px-3 py-2">
                    {eq}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}

      {/* Step-by-Step Solution */}
      <section className="space-y-4">
        <h2 className="font-display text-xl font-bold text-[#EAC779]">ধাপে ধাপে লিখিত সমাধান</h2>
        <div className="space-y-3">
          {content.solutionSteps.map((step) => (
            <Card key={step.stepNumber} className="p-5 space-y-2">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#D4A853]/20 border border-[#D4A853]/45 text-xs font-bold text-[#EAC779] tabular-nums shrink-0">
                  {toBanglaDigits(step.stepNumber)}
                </span>
                <h3 className="text-base font-bold text-[#F5EFE2]">{step.heading}</h3>
              </div>
              <p className="text-sm text-[#C2C8D3] leading-relaxed pl-9">{step.detail}</p>
              {step.mathLine && (
                <p className="ml-9 mt-2 rounded-lg bg-[#0A0D12] border border-[#D4A853]/25 px-3.5 py-2 font-mono text-sm text-[#EAC779]">
                  {step.mathLine}
                </p>
              )}
            </Card>
          ))}
        </div>

        {/* Highlighted Final Answer */}
        <Card className="p-5 border-emerald-500/40 bg-emerald-950/20">
          <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">চূড়ান্ত উত্তর</p>
          <p className="mt-1 text-lg font-bold text-[#F5EFE2]">{content.finalAnswer}</p>
        </Card>
      </section>

      {/* Embedded YouTube Video */}
      {embedUrl && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold text-[#EAC779] flex items-center gap-2">
              <Youtube className="h-5 w-5 text-rose-500" />
              ভিডিও ব্যাখ্যা (YouTube)
            </h2>
            {content.youtubeUrl && (
              <a
                href={content.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#D4A853] hover:underline"
              >
                <span>YouTube-এ দেখুন</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
          <div className="overflow-hidden rounded-xl border border-[#D4A853]/30 aspect-video bg-black">
            <iframe
              src={embedUrl}
              title={content.title}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </section>
      )}

      {/* Previous & Next Problem Navigation */}
      <nav className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#D4A853]/20">
        {prevProblem ? (
          <Link
            to={platformService.getLearningContentUrl(prevProblem)}
            className="obsidian-card-interactive rounded-xl p-4 flex items-center gap-3"
          >
            <ArrowLeft className="h-4 w-4 text-[#EAC779] shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] text-[#9DA6B5]">পূর্ববর্তী সমাধান</p>
              <p className="text-sm font-bold text-[#F5EFE2] truncate">{prevProblem.title}</p>
            </div>
          </Link>
        ) : (
          <div />
        )}
        {nextProblem && (
          <Link
            to={platformService.getLearningContentUrl(nextProblem)}
            className="obsidian-card-interactive rounded-xl p-4 flex items-center justify-end gap-3 text-right"
          >
            <div className="min-w-0">
              <p className="text-[11px] text-[#9DA6B5]">পরবর্তী সমাধান</p>
              <p className="text-sm font-bold text-[#F5EFE2] truncate">{nextProblem.title}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-[#EAC779] shrink-0" />
          </Link>
        )}
      </nav>

      {/* Related Problems */}
      {relatedItems.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-[#EAC779]">সম্পর্কিত অন্যান্য সমাধান</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {relatedItems.map((rel) => (
              <Link
                key={rel.id}
                to={platformService.getLearningContentUrl(rel)}
                className="obsidian-card-interactive rounded-xl p-4 space-y-1"
              >
                <p className="text-xs text-[#D4A853]">
                  {rel.classNameBn} · {rel.subjectNameBn}
                </p>
                <p className="text-sm font-bold text-[#F5EFE2]">{rel.title}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Comments Section (Guests Read-Only, Logged-In Users Full CRUD + Like/Report) */}
      <section className="space-y-4 border-t border-[#D4A853]/20 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-[#EAC779] flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            আলোচনা ও প্রশ্নোত্তর ({toBanglaDigits(comments.length)})
          </h2>
        </div>

        {user ? (
          <form onSubmit={handleAddComment} className="space-y-3">
            <Textarea
              rows={3}
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              placeholder="এই সমাধান সম্পর্কে কোনো প্রশ্ন বা মতামত থাকলে লিখুন..."
            />
            <div className="flex justify-end">
              <Button type="submit" size="sm">
                মন্তব্য প্রকাশ করুন
              </Button>
            </div>
          </form>
        ) : (
          <Card className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-sm text-[#C2C8D3]">
              সমাধান ও মন্তব্য পড়ার জন্য লগইন প্রয়োজন নেই। নতুন মন্তব্য, লাইক বা রিপোর্ট করতে লগইন করুন।
            </p>
            <Link
              to="/login"
              className="rounded-lg gold-btn px-4 py-2 text-xs font-bold whitespace-nowrap text-center"
            >
              লগইন করুন
            </Link>
          </Card>
        )}

        <div className="space-y-3">
          {comments.map((cm) => {
            const isOwner = user && (user.id === cm.userId || user.role === 'admin');
            const isLiked = user ? cm.likedByUserIds.includes(user.id) : false;
            return (
              <Card key={cm.id} className="p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#F5EFE2]">{cm.userName}</span>
                    {cm.userRole === 'admin' && (
                      <span className="rounded bg-[#D4A853]/20 border border-[#D4A853]/40 px-1.5 py-0.5 text-[10px] font-bold text-[#EAC779]">
                        শিক্ষক / অ্যাডমিন
                      </span>
                    )}
                  </div>
                  <span className="text-[#8C95A4] tabular-nums">{formatBnDateTime(cm.createdAt)}</span>
                </div>

                {editingId === cm.id ? (
                  <div className="space-y-2">
                    <Textarea
                      rows={2}
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          if (!user) return;
                          platformService.editComment(cm.id, user, editingText);
                          setEditingId(null);
                          setCommentRev((r) => r + 1);
                          pushToast({ title: 'মন্তব্য হালনাগাদ হয়েছে', variant: 'success' });
                        }}
                      >
                        সংরক্ষণ
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => setEditingId(null)}>
                        বাতিল
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-[#E5E0D5] leading-relaxed">{cm.body}</p>
                )}

                <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-[#9DA6B5]">
                  <button
                    type="button"
                    onClick={() => {
                      if (!user) {
                        pushToast({ title: 'লাইক দিতে লগইন করুন', variant: 'info' });
                        return;
                      }
                      platformService.toggleLikeComment(cm.id, user.id);
                      setCommentRev((r) => r + 1);
                    }}
                    className={`inline-flex items-center gap-1 cursor-pointer ${
                      isLiked ? 'text-rose-400 font-semibold' : 'hover:text-[#EAC779]'
                    }`}
                  >
                    <Heart className="h-3.5 w-3.5" />
                    <span className="tabular-nums">{toBanglaDigits(cm.likedByUserIds.length)}</span>
                  </button>

                  {isOwner && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(cm.id);
                          setEditingText(cm.body);
                        }}
                        className="inline-flex items-center gap-1 hover:text-[#EAC779] cursor-pointer"
                      >
                        <Edit3 className="h-3.5 w-3.5" /> সম্পাদনা
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!user) return;
                          platformService.deleteComment(cm.id, user);
                          setCommentRev((r) => r + 1);
                          pushToast({ title: 'মন্তব্য মুছে ফেলা হয়েছে', variant: 'info' });
                        }}
                        className="inline-flex items-center gap-1 text-rose-400 hover:underline cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> মুছুন
                      </button>
                    </>
                  )}

                  {user && user.id !== cm.userId && (
                    <button
                      type="button"
                      onClick={() => {
                        platformService.reportComment(cm.id, user.id);
                        setCommentRev((r) => r + 1);
                        pushToast({
                          title: 'মন্তব্যটি অ্যাডমিন পর্যালোচনার জন্য রিপোর্ট করা হয়েছে',
                          variant: 'info',
                        });
                      }}
                      className="inline-flex items-center gap-1 hover:text-amber-400 ml-auto cursor-pointer"
                    >
                      <Flag className="h-3.5 w-3.5" /> রিপোর্ট
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </section>
    </article>
  );
}
