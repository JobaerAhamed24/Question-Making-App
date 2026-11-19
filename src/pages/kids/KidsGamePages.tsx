import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  Divide,
  Gamepad2,
  HelpCircle,
  Minus,
  Play,
  Plus,
  RotateCcw,
  Star,
  Trophy,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { Button, Card } from '../../components/ui/Primitives';
import { KIDS_GAME_LESSONS } from '../../data/platformSeedData';
import { toBanglaDigits } from '../../lib/bn';
import { platformService } from '../../services/platformService';
import type {
  KidsGameCategory,
  KidsGameConfig,
  KidsGameModeId,
  KidsGameProgress,
} from '../../types/domain';

interface GeneratedRoundQuestion {
  promptBn: string;
  expression: string;
  answer: number;
  options: number[];
  hintBn: string;
  visualGroup?: { total: number; groups: number };
}

// Lightweight Web Audio API sound effects (no external audio files needed)
function playKidsTone(type: 'correct' | 'wrong' | 'win', enabled: boolean) {
  if (!enabled || typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const playNote = (freq: number, startOffset: number, duration: number, wave: OscillatorType = 'sine') => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = wave;
      osc.frequency.setValueAtTime(freq, now + startOffset);
      gain.gain.setValueAtTime(0.12, now + startOffset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + startOffset + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + startOffset);
      osc.stop(now + startOffset + duration);
    };
    if (type === 'correct') {
      playNote(523.25, 0, 0.12, 'triangle');
      playNote(659.25, 0.1, 0.16, 'triangle');
    } else if (type === 'wrong') {
      playNote(240, 0, 0.18, 'sawtooth');
    } else {
      playNote(523.25, 0, 0.14, 'triangle');
      playNote(659.25, 0.12, 0.14, 'triangle');
      playNote(783.99, 0.24, 0.14, 'triangle');
      playNote(1046.5, 0.36, 0.28, 'triangle');
    }
  } catch {
    // ignore audio restrictions
  }
}

function buildOptions(answer: number): number[] {
  const set = new Set<number>([answer]);
  let attempts = 0;
  while (set.size < 4 && attempts < 40) {
    attempts++;
    const delta = Math.floor(Math.random() * 7) - 3;
    const candidate = Math.max(0, answer + (delta === 0 ? 4 : delta));
    set.add(candidate);
  }
  while (set.size < 4) set.add(answer + set.size + 1);
  return Array.from(set).sort(() => Math.random() - 0.5);
}

function generateQuestion(
  category: KidsGameCategory,
  modeId: KidsGameModeId,
  levelNumber: number
): GeneratedRoundQuestion {
  const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

  if (category === 'addition') {
    const maxVal = levelNumber === 1 ? 10 : levelNumber === 2 ? 25 : 50;
    const a = rand(1, maxVal);
    const b = rand(1, maxVal);
    const sum = a + b;
    if (modeId === 'number_puzzle') {
      return {
        promptBn: 'খালি ঘরে কোন সংখ্যাটি বসবে?',
        expression: `${toBanglaDigits(a)} + [ ? ] = ${toBanglaDigits(sum)}`,
        answer: b,
        options: buildOptions(b),
        hintBn: `${toBanglaDigits(sum)} থেকে ${toBanglaDigits(a)} বাদ দিলেই খালি ঘরের সংখ্যা পাওয়া যাবে!`,
      };
    }
    return {
      promptBn: 'সঠিক যোগফলটি বেছে নাও:',
      expression: `${toBanglaDigits(a)} + ${toBanglaDigits(b)} = ?`,
      answer: sum,
      options: buildOptions(sum),
      hintBn: `${toBanglaDigits(Math.max(a, b))} এর পর থেকে আরও ${toBanglaDigits(Math.min(a, b))} ঘর গোনো।`,
    };
  }

  if (category === 'subtraction') {
    const maxVal = levelNumber === 1 ? 15 : levelNumber === 2 ? 35 : 70;
    const a = rand(4, maxVal);
    const b = rand(1, a - 1);
    const diff = a - b;
    if (modeId === 'missing_number') {
      return {
        promptBn: 'হারানো সংখ্যাটি খুঁজে বের করো:',
        expression: `${toBanglaDigits(a)} − [ ? ] = ${toBanglaDigits(diff)}`,
        answer: b,
        options: buildOptions(b),
        hintBn: `${toBanglaDigits(a)} থেকে ${toBanglaDigits(diff)} বাদ দিলে কত হয়?`,
      };
    }
    return {
      promptBn: 'সঠিক বিয়োগফলটি বাছাই করো:',
      expression: `${toBanglaDigits(a)} − ${toBanglaDigits(b)} = ?`,
      answer: diff,
      options: buildOptions(diff),
      hintBn: `${toBanglaDigits(a)} থেকে ${toBanglaDigits(b)} ঘর পেছনে গোনো।`,
    };
  }

  if (category === 'multiplication') {
    const minTable = levelNumber === 1 ? 2 : levelNumber === 2 ? 6 : 9;
    const maxTable = levelNumber === 1 ? 5 : levelNumber === 2 ? 9 : 12;
    const a = rand(minTable, maxTable);
    const b = rand(2, 10);
    const prod = a * b;
    if (modeId === 'number_puzzle') {
      return {
        promptBn: 'গুণের ধাঁধা: খালি ঘরে কোন সংখ্যা বসবে?',
        expression: `${toBanglaDigits(a)} × [ ? ] = ${toBanglaDigits(prod)}`,
        answer: b,
        options: buildOptions(b),
        hintBn: `${toBanglaDigits(a)} এর নামতা গোনো যতক্ষণ না ${toBanglaDigits(prod)} আসে।`,
      };
    }
    return {
      promptBn: 'নামতা ব্যবহার করে সঠিক গুণফল বেছে নাও:',
      expression: `${toBanglaDigits(a)} × ${toBanglaDigits(b)} = ?`,
      answer: prod,
      options: buildOptions(prod),
      hintBn: `${toBanglaDigits(a)} কে ${toBanglaDigits(b)} বার যোগ করো।`,
    };
  }

  // Division
  const divisor = rand(2, levelNumber === 1 ? 5 : 9);
  const quotient = rand(2, levelNumber === 1 ? 6 : 10);
  const dividend = divisor * quotient;
  if (modeId === 'equal_grouping') {
    const safeDivisor = rand(2, 4);
    const safeQuotient = rand(2, 5);
    const total = safeDivisor * safeQuotient;
    return {
      promptBn: `${toBanglaDigits(total)}টি তারা ${toBanglaDigits(safeDivisor)}টি ঝুড়িতে সমান ভাগ করলে প্রতি ঝুড়িতে কয়টি পড়বে?`,
      expression: `${toBanglaDigits(total)} ÷ ${toBanglaDigits(safeDivisor)} = ?`,
      answer: safeQuotient,
      options: buildOptions(safeQuotient),
      hintBn: `${toBanglaDigits(safeDivisor)} এর নামতায় কত দিয়ে গুণ করলে ${toBanglaDigits(total)} হয়?`,
      visualGroup: { total, groups: safeDivisor },
    };
  }
  return {
    promptBn: 'সঠিক ভাগফলটি খুঁজে বের করো:',
    expression: `${toBanglaDigits(dividend)} ÷ ${toBanglaDigits(divisor)} = ?`,
    answer: quotient,
    options: buildOptions(quotient),
    hintBn: `${toBanglaDigits(divisor)} × ? = ${toBanglaDigits(dividend)}`,
  };
}

const CATEGORY_CARDS: Array<{
  id: KidsGameCategory;
  titleBn: string;
  enLabel: string;
  descBn: string;
  accentBg: string;
  accentBorder: string;
  icon: React.ReactNode;
}> = [
  {
    id: 'addition',
    titleBn: 'যোগ খেলা',
    enLabel: 'Addition (+)',
    descBn: 'সংখ্যা মিলিয়ে যোগ করা শেখো এবং দ্রুত যোগের চ্যাম্পিয়ন হও!',
    accentBg: 'bg-emerald-500/15 text-emerald-400',
    accentBorder: 'border-emerald-500/40',
    icon: <Plus className="h-7 w-7" />,
  },
  {
    id: 'subtraction',
    titleBn: 'বিয়োগ খেলা',
    enLabel: 'Subtraction (−)',
    descBn: 'হারানো সংখ্যা খোঁজো আর মজার বিয়োগ চ্যালেঞ্জ জিতো!',
    accentBg: 'bg-sky-500/15 text-sky-400',
    accentBorder: 'border-sky-500/40',
    icon: <Minus className="h-7 w-7" />,
  },
  {
    id: 'multiplication',
    titleBn: 'গুণ খেলা',
    enLabel: 'Multiplication (×)',
    descBn: 'নামতা জাদুকর হয়ে গুণের ধাঁধা সমাধান করে স্টার জিতো!',
    accentBg: 'bg-amber-500/15 text-amber-400',
    accentBorder: 'border-amber-500/40',
    icon: <X className="h-7 w-7" />,
  },
  {
    id: 'division',
    titleBn: 'ভাগ খেলা',
    enLabel: 'Division (÷)',
    descBn: 'সমান ভাগে ভাগ করে ভাগফল বের করার মজার ছবিভিত্তিক খেলা!',
    accentBg: 'bg-violet-500/15 text-violet-400',
    accentBorder: 'border-violet-500/40',
    icon: <Divide className="h-7 w-7" />,
  },
];

export function KidsGameHomePage() {
  const [progress, setProgress] = useState<KidsGameProgress>(() => platformService.getKidsProgress());
  const games = useMemo(() => platformService.listKidsGames(false), []);

  const handleToggleSound = () => {
    setProgress(platformService.toggleKidsSound());
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 space-y-8 font-bangla">
      {/* Fun, clean header + Stars/Score/Sound Bar */}
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between border-b border-[#D4A853]/20 pb-6">
        <div className="space-y-1.5">
          <p className="text-xs font-mono font-bold tracking-[0.2em] text-[#D4A853] uppercase">
            KIDS INTERACTIVE MATH ZONE • FREE FOR ALL
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold gold-text-gradient">
            কিডস ম্যাথ গেম ও শেখার জগত
          </h1>
          <p className="text-sm sm:text-base text-[#B8C0CE]">
            আগে ছবির সাহায্যে সহজ বাংলায় নিয়ম শেখো, তারপর মজার গেম খেলে স্টার ও পুরস্কার জিতো!
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-2.5 text-amber-300 font-bold tabular-nums">
            <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
            <span>{toBanglaDigits(progress.totalStars)} স্টার</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-2.5 text-emerald-300 font-bold tabular-nums">
            <Trophy className="h-5 w-5" />
            <span>{toBanglaDigits(progress.totalScore)} পয়েন্ট</span>
          </div>
          <button
            type="button"
            onClick={handleToggleSound}
            aria-label={progress.soundEnabled ? 'সাউন্ড বন্ধ করুন' : 'সাউন্ড চালু করুন'}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#D4A853]/35 bg-[#0E1117] px-3.5 py-2.5 text-sm font-semibold text-[#EAC779] hover:border-[#EAC779] cursor-pointer"
          >
            {progress.soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            <span>{progress.soundEnabled ? 'সাউন্ড চালু' : 'সাউন্ড বন্ধ'}</span>
          </button>
        </div>
      </div>

      {/* 4 Big Category Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {CATEGORY_CARDS.map((cat) => {
          const catGames = games.filter((g) => g.category === cat.id);
          const completedCount = progress.completedLevelsByCategory[cat.id]?.length || 0;
          const lessonDone = progress.completedLessons.includes(cat.id);
          return (
            <Link
              key={cat.id}
              to={`/kids-game/${cat.id}`}
              className={`obsidian-card-interactive rounded-2xl p-6 flex flex-col justify-between gap-5 border-2 ${cat.accentBorder}`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${cat.accentBg}`}>
                    {cat.icon}
                  </div>
                  {lessonDone && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" /> পাঠ শেষ
                    </span>
                  )}
                </div>
                <div>
                  <h2 className="font-display text-2xl font-bold text-[#F5EFE2]">{cat.titleBn}</h2>
                  <p className="text-xs font-mono text-[#9DA6B5]">{cat.enLabel}</p>
                </div>
                <p className="text-sm text-[#C2C8D3] leading-relaxed">{cat.descBn}</p>
              </div>

              <div className="space-y-3 border-t border-[#D4A853]/15 pt-4">
                <div className="flex items-center justify-between text-xs text-[#9DA6B5] tabular-nums">
                  <span>{toBanglaDigits(catGames.length)}টি খেলার মোড</span>
                  <span>{toBanglaDigits(completedCount)}টি লেভেল জয়</span>
                </div>
                <div className="rounded-xl gold-btn py-2.5 text-center text-sm font-bold flex items-center justify-center gap-2">
                  <Play className="h-4 w-4" />
                  <span>শিখো ও খেলো</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Recent Rewards Strip */}
      {progress.recentRewards.length > 0 && (
        <Card className="p-5 space-y-3">
          <h2 className="text-base font-bold text-[#EAC779] flex items-center gap-2">
            <Award className="h-5 w-5" />
            তোমার সাম্প্রতিক অর্জনসমূহ
          </h2>
          <div className="flex flex-wrap gap-2.5">
            {progress.recentRewards.slice(0, 6).map((rew) => (
              <div
                key={rew.id}
                className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3.5 py-2 text-xs text-[#F5EFE2] flex items-center gap-2"
              >
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 shrink-0" />
                <span>{rew.titleBn}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

export function KidsGameCategoryPage() {
  const { category } = useParams<{ category: string }>();
  const navigate = useNavigate();

  const validCat: KidsGameCategory =
    category === 'addition' ||
    category === 'subtraction' ||
    category === 'multiplication' ||
    category === 'division'
      ? category
      : 'addition';

  const lesson = KIDS_GAME_LESSONS[validCat];
  const categoryGames = useMemo(
    () => platformService.listKidsGames(false).filter((g) => g.category === validCat),
    [validCat]
  );

  const [progress, setProgress] = useState<KidsGameProgress>(() => platformService.getKidsProgress());
  const [viewMode, setViewMode] = useState<'lesson' | 'play'>('lesson');
  const [practiceInputs, setPracticeInputs] = useState<Record<number, string>>({});
  const [practiceResults, setPracticeResults] = useState<Record<number, boolean | null>>({});

  // Active Game State
  const [selectedGame, setSelectedGame] = useState<KidsGameConfig | null>(categoryGames[0] || null);
  const [selectedLevelNum, setSelectedLevelNum] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [roundNumber, setRoundNumber] = useState(1);
  const [totalRounds] = useState(6);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [question, setQuestion] = useState<GeneratedRoundQuestion | null>(null);
  const [feedback, setFeedback] = useState<{ kind: 'correct' | 'wrong'; msg: string } | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [gameOverSummary, setGameOverSummary] = useState<{ score: number; stars: number } | null>(
    null
  );

  useEffect(() => {
    setSelectedGame(categoryGames[0] || null);
    setIsPlaying(false);
    setGameOverSummary(null);
  }, [validCat, categoryGames]);

  // Countdown Timer for Timed Challenges
  useEffect(() => {
    if (!isPlaying || timeLeft === null) return;
    if (timeLeft <= 0) {
      finishGame(score);
      return;
    }
    const id = window.setTimeout(() => setTimeLeft((t) => (t !== null ? t - 1 : null)), 1000);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, timeLeft]);

  const startRound = (game: KidsGameConfig, lvlNum: number) => {
    const lvl = game.levels.find((l) => l.levelNumber === lvlNum) || game.levels[0];
    setSelectedGame(game);
    setSelectedLevelNum(lvlNum);
    setIsPlaying(true);
    setGameOverSummary(null);
    setRoundNumber(1);
    setScore(0);
    setStreak(0);
    setFeedback(null);
    setShowHint(false);
    setTimeLeft(lvl?.timeLimitSeconds ?? null);
    setQuestion(generateQuestion(validCat, game.modeId, lvlNum));
  };

  const finishGame = (finalScore: number) => {
    setIsPlaying(false);
    const stars = finalScore >= 60 ? 3 : finalScore >= 30 ? 2 : 1;
    playKidsTone('win', progress.soundEnabled);
    const updated = platformService.recordKidsGameWin({
      category: validCat,
      modeId: selectedGame?.modeId || 'match_answer',
      levelNumber: selectedLevelNum,
      score: finalScore,
      starsEarned: stars,
      titleBn: `${selectedGame?.titleBn || lesson.titleBn} (লেভেল ${toBanglaDigits(selectedLevelNum)})`,
    });
    setProgress(updated);
    setGameOverSummary({ score: finalScore, stars });
  };

  const handleSelectAnswer = (choice: number) => {
    if (!question || !selectedGame || feedback) return;
    if (choice === question.answer) {
      const gained = 15 + streak * 5;
      const nextScore = score + gained;
      setScore(nextScore);
      setStreak((s) => s + 1);
      setFeedback({ kind: 'correct', msg: `দারুণ! সঠিক উত্তর ${toBanglaDigits(question.answer)} (+${toBanglaDigits(gained)} পয়েন্ট)` });
      playKidsTone('correct', progress.soundEnabled);

      window.setTimeout(() => {
        setFeedback(null);
        setShowHint(false);
        if (timeLeft === null && roundNumber >= totalRounds) {
          finishGame(nextScore);
        } else {
          setRoundNumber((r) => r + 1);
          setQuestion(generateQuestion(validCat, selectedGame.modeId, selectedLevelNum));
        }
      }, 750);
    } else {
      setStreak(0);
      setFeedback({ kind: 'wrong', msg: `আবার চেষ্টা করো! একটু ভেবে দেখো।` });
      playKidsTone('wrong', progress.soundEnabled);
      window.setTimeout(() => setFeedback(null), 700);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-6 font-bangla">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D4A853]/20 pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/kids-game')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#D4A853]/30 px-3 py-2 text-xs font-bold text-[#EAC779] hover:border-[#EAC779] cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            সব গেম
          </button>
          <div>
            <h1 className="font-display text-2xl font-bold gold-text-gradient">{lesson.titleBn}</h1>
            <p className="text-xs text-[#9DA6B5]">{lesson.subtitleBn}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-amber-400/40 bg-amber-500/10 px-3 py-1.5 text-sm font-bold text-amber-300 tabular-nums">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            {toBanglaDigits(progress.totalStars)}
          </span>
          <button
            type="button"
            onClick={() => setProgress(platformService.toggleKidsSound())}
            className="rounded-xl border border-[#D4A853]/35 p-2 text-[#EAC779] cursor-pointer"
            aria-label="সাউন্ড পরিবর্তন"
          >
            {progress.soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mode Switcher: Learning Mode vs Playable Game Mode */}
      <div className="grid grid-cols-2 gap-3 max-w-md">
        <button
          type="button"
          onClick={() => {
            setViewMode('lesson');
            setIsPlaying(false);
          }}
          className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold border-2 cursor-pointer transition-all ${
            viewMode === 'lesson'
              ? 'gold-btn border-[#EAC779]'
              : 'border-[#D4A853]/30 bg-[#0E1117] text-[#C2C8D3]'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          <span>১. আগে শিখি (Lesson)</span>
        </button>
        <button
          type="button"
          onClick={() => setViewMode('play')}
          className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold border-2 cursor-pointer transition-all ${
            viewMode === 'play'
              ? 'gold-btn border-[#EAC779]'
              : 'border-[#D4A853]/30 bg-[#0E1117] text-[#C2C8D3]'
          }`}
        >
          <Gamepad2 className="h-4 w-4" />
          <span>২. গেম খেলি (Play)</span>
        </button>
      </div>

      {/* VIEW 1: LEARNING MODE (Lesson Before Play) */}
      {viewMode === 'lesson' && (
        <div className="space-y-6">
          <Card className="p-6 space-y-4">
            <h2 className="text-xl font-bold text-[#EAC779]">সহজ ধারণা ও নিয়ম</h2>
            <p className="text-base text-[#F5EFE2] leading-relaxed">{lesson.conceptBn}</p>
            <ul className="space-y-2 pt-2">
              {lesson.rulesBn.map((r, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2.5 rounded-xl bg-[#0A0D12] border border-[#D4A853]/20 px-4 py-2.5 text-sm text-[#E5E0D5]"
                >
                  <span className="font-bold text-[#EAC779] tabular-nums">{toBanglaDigits(i + 1)}.</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </Card>

          {/* Visual Step-by-Step Examples */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {lesson.visualExamples.map((ex, idx) => (
              <Card key={idx} className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-[#F5EFE2]">{ex.titleBn}</h3>
                  <span className="rounded-lg bg-[#D4A853]/20 px-3 py-1 text-base font-bold text-[#EAC779]">
                    {ex.expression}
                  </span>
                </div>

                {/* Interactive Colorful Counters */}
                <div className="rounded-xl bg-[#0A0D12] border border-[#D4A853]/20 p-4 flex flex-wrap items-center justify-center gap-3">
                  <div className="flex flex-wrap gap-1.5 justify-center max-w-[140px]">
                    {Array.from({ length: Math.min(ex.leftCount, 12) }).map((_, i) => (
                      <span
                        key={i}
                        className="h-6 w-6 rounded-full bg-emerald-400 border-2 border-emerald-200 inline-block"
                      />
                    ))}
                  </div>
                  <span className="text-2xl font-bold text-[#EAC779]">{ex.operator}</span>
                  <div className="flex flex-wrap gap-1.5 justify-center max-w-[140px]">
                    {Array.from({ length: Math.min(ex.rightCount, 12) }).map((_, i) => (
                      <span
                        key={i}
                        className="h-6 w-6 rounded-full bg-sky-400 border-2 border-sky-200 inline-block"
                      />
                    ))}
                  </div>
                  <span className="text-2xl font-bold text-[#EAC779]">=</span>
                  <span className="rounded-xl bg-amber-400/20 border border-amber-400 px-3.5 py-1 text-xl font-bold text-amber-300">
                    {toBanglaDigits(ex.result)}
                  </span>
                </div>

                <p className="text-sm text-[#C2C8D3]">{ex.explanationBn}</p>
              </Card>
            ))}
          </div>

          {/* Quick Interactive Practice Check */}
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-bold text-[#EAC779]">ছোট্ট অনুশীলন (নিজে যাচাই করো)</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {lesson.practiceItems.map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-[#D4A853]/25 bg-[#0A0D12] p-4 space-y-3"
                >
                  <p className="text-base font-bold text-[#F5EFE2]">{item.promptBn}</p>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={practiceInputs[idx] || ''}
                      onChange={(e) =>
                        setPracticeInputs((prev) => ({ ...prev, [idx]: e.target.value }))
                      }
                      placeholder="উত্তর লেখো..."
                      className="flex-1 rounded-lg border border-[#D4A853]/30 bg-[#141922] px-3 py-2 text-sm text-[#F5EFE2]"
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        const ok = Number(practiceInputs[idx]) === item.answer;
                        setPracticeResults((prev) => ({ ...prev, [idx]: ok }));
                        playKidsTone(ok ? 'correct' : 'wrong', progress.soundEnabled);
                      }}
                    >
                      যাচাই
                    </Button>
                  </div>
                  {practiceResults[idx] === true && (
                    <p className="text-xs font-bold text-emerald-400">✓ একদম ঠিক হয়েছে!</p>
                  )}
                  {practiceResults[idx] === false && (
                    <p className="text-xs text-amber-300">আবার চেষ্টা করো! ইঙ্গিত: {item.hintBn}</p>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                size="lg"
                onClick={() => {
                  const updated = platformService.markKidsLessonComplete(validCat);
                  setProgress(updated);
                  playKidsTone('win', updated.soundEnabled);
                  setViewMode('play');
                }}
              >
                <Gamepad2 className="h-5 w-5" />
                <span>পাঠ সম্পন্ন! এবার গেম শুরু করি (+২ স্টার)</span>
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* VIEW 2: PLAYABLE GAME MODES */}
      {viewMode === 'play' && (
        <div className="space-y-6">
          {!isPlaying && !gameOverSummary && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {categoryGames.map((game) => (
                <Card key={game.id} className="p-5 flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <span className="text-xs font-mono font-bold text-[#D4A853]">
                      {game.subtitleBn}
                    </span>
                    <h2 className="text-xl font-bold text-[#F5EFE2]">{game.titleBn}</h2>
                    <p className="text-sm text-[#B8C0CE]">{game.instructionsBn}</p>
                  </div>

                  <div className="space-y-2 border-t border-[#D4A853]/15 pt-3">
                    <p className="text-xs font-bold text-[#EAC779]">লেভেল বাছাই করে খেলা শুরু করো:</p>
                    {game.levels.map((lvl) => (
                      <button
                        key={lvl.id}
                        type="button"
                        onClick={() => startRound(game, lvl.levelNumber)}
                        className="w-full flex items-center justify-between rounded-xl border border-[#D4A853]/30 bg-[#0A0D12] px-3.5 py-2.5 text-left text-xs font-semibold text-[#F5EFE2] hover:border-[#EAC779] hover:bg-[#D4A853]/10 cursor-pointer"
                      >
                        <span>{lvl.titleBn}</span>
                        <span className="inline-flex items-center gap-1 text-[#EAC779] shrink-0">
                          <Play className="h-3.5 w-3.5" /> খেলো
                        </span>
                      </button>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Active Gameplay Arena */}
          {isPlaying && question && selectedGame && (
            <Card className="p-6 sm:p-8 max-w-2xl mx-auto space-y-6 border-2 border-[#EAC779]/50">
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm font-bold tabular-nums">
                <span className="rounded-lg bg-[#D4A853]/15 px-3 py-1 text-[#EAC779]">
                  প্রশ্ন {toBanglaDigits(roundNumber)}
                  {timeLeft === null ? ` / ${toBanglaDigits(totalRounds)}` : ''}
                </span>
                <span className="rounded-lg bg-emerald-500/15 px-3 py-1 text-emerald-300">
                  স্কোর: {toBanglaDigits(score)}
                </span>
                {timeLeft !== null && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-rose-500/20 px-3 py-1 text-rose-300">
                    <Clock className="h-4 w-4" />
                    {toBanglaDigits(timeLeft)} সে.
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setIsPlaying(false)}
                  className="text-xs text-[#9DA6B5] hover:text-rose-300 cursor-pointer"
                >
                  বিরতি
                </button>
              </div>

              <div className="text-center space-y-4 py-2">
                <p className="text-base font-semibold text-[#C2C8D3]">{question.promptBn}</p>
                <div className="inline-block rounded-2xl border-2 border-[#D4A853]/45 bg-[#0A0D12] px-8 py-5 text-3xl sm:text-4xl font-bold text-[#F5EFE2] tracking-wide">
                  {question.expression}
                </div>

                {/* Visual Grouping Helper for Division */}
                {question.visualGroup && (
                  <div className="flex flex-wrap justify-center gap-3 pt-2">
                    {Array.from({ length: question.visualGroup.groups }).map((_, gIdx) => (
                      <div
                        key={gIdx}
                        className="rounded-xl border border-dashed border-violet-400/60 bg-violet-500/10 p-2.5 min-w-[82px]"
                      >
                        <p className="text-[11px] text-violet-300 mb-1">ঝুড়ি {toBanglaDigits(gIdx + 1)}</p>
                        <div className="flex flex-wrap justify-center gap-1">
                          {Array.from({
                            length: question.visualGroup!.total / question.visualGroup!.groups,
                          }).map((_, sIdx) => (
                            <Star key={sIdx} className="h-4 w-4 fill-amber-400 text-amber-400" />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 4 Large Child-Friendly Answer Buttons */}
              <div className="grid grid-cols-2 gap-4">
                {question.options.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleSelectAnswer(opt)}
                    className="rounded-2xl border-2 border-[#D4A853]/40 bg-[#121722] py-5 text-2xl sm:text-3xl font-bold text-[#F5EFE2] hover:border-[#EAC779] hover:bg-[#D4A853]/20 active:scale-[0.98] transition-all cursor-pointer tabular-nums"
                  >
                    {toBanglaDigits(opt)}
                  </button>
                ))}
              </div>

              {/* Instant Feedback + Hint */}
              <div className="flex items-center justify-between gap-2 pt-2 min-h-[36px]">
                {feedback ? (
                  <p
                    className={`text-sm font-bold ${
                      feedback.kind === 'correct' ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {feedback.msg}
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowHint((v) => !v)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#D4A853] hover:underline cursor-pointer"
                  >
                    <HelpCircle className="h-4 w-4" />
                    সাহায্য (Hint)
                  </button>
                )}
                {streak >= 2 && (
                  <span className="text-xs font-bold text-amber-300">
                    স্ট্রিক: {toBanglaDigits(streak)} টানা সঠিক!
                  </span>
                )}
              </div>
              {showHint && !feedback && (
                <p className="rounded-xl bg-amber-500/10 border border-amber-400/30 px-4 py-2 text-xs text-amber-200">
                  ইঙ্গিত: {question.hintBn}
                </p>
              )}
            </Card>
          )}

          {/* Victory / Level Complete Card */}
          {gameOverSummary && selectedGame && (
            <Card className="p-8 max-w-lg mx-auto text-center space-y-5 border-2 border-amber-400/50">
              <div className="flex justify-center gap-2">
                {Array.from({ length: gameOverSummary.stars }).map((_, i) => (
                  <Star key={i} className="h-10 w-10 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <h2 className="font-display text-3xl font-bold gold-text-gradient">সাবাশ! খেলা সম্পন্ন!</h2>
              <p className="text-base text-[#E5E0D5] tabular-nums">
                তুমি পেয়েছো <strong className="text-emerald-400">{toBanglaDigits(gameOverSummary.score)} পয়েন্ট</strong> এবং{' '}
                <strong className="text-amber-300">+{toBanglaDigits(gameOverSummary.stars)}টি স্টার</strong>!
              </p>
              <div className="flex flex-wrap justify-center gap-3 pt-2">
                <Button onClick={() => startRound(selectedGame, selectedLevelNum)}>
                  <RotateCcw className="h-4 w-4" />
                  আবার খেলো
                </Button>
                <Button variant="secondary" onClick={() => setGameOverSummary(null)}>
                  অন্য গেম বাছাই করো
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
