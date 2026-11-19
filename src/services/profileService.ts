import { DEFAULT_PRIVACY_SETTINGS } from '../data/seedData';
import { mockDb } from '../lib/mockDb';
import type {
  ExamAttempt,
  LeaderboardEntry,
  StudentAchievement,
  StudentPrivacySettings,
  StudentPublicProfileView,
  SubjectPerformanceStat,
} from '../types/domain';

function computeAchievements(
  attempts: ExamAttempt[],
  rank: number | null
): StudentAchievement[] {
  const list: StudentAchievement[] = [];
  if (attempts.length >= 1) {
    list.push({
      id: 'ach-first-exam',
      title: 'প্রথম পদক্ষেপ',
      description: 'প্রথম লাইভ পরীক্ষা সফলভাবে সম্পন্ন করেছেন।',
      earnedAt: attempts[attempts.length - 1].submittedAt,
    });
  }
  const perfect = attempts.find((a) => a.accuracyPercent === 100);
  if (perfect) {
    list.push({
      id: 'ach-perfect',
      title: 'শতভাগ নির্ভুলতা',
      description: 'একটি পরীক্ষায় ১০০% সঠিক উত্তর প্রদান করেছেন।',
      earnedAt: perfect.submittedAt,
    });
  }
  if (attempts.length >= 2) {
    list.push({
      id: 'ach-consistent',
      title: 'নিয়মিত পরীক্ষার্থী',
      description: 'একাধিক লাইভ পরীক্ষায় সক্রিয় অংশগ্রহণ করেছেন।',
      earnedAt: attempts[0].submittedAt,
    });
  }
  if (rank !== null && rank <= 3) {
    list.push({
      id: 'ach-top-3',
      title: 'শীর্ষ ৩ র‍্যাংকার',
      description: 'সামগ্রিক লিডারবোর্ডের শীর্ষ তিনে স্থান অর্জন করেছেন।',
      earnedAt: attempts[0]?.submittedAt ?? new Date().toISOString(),
    });
  }
  const fast = attempts.find((a) => a.timeTakenSeconds <= 420 && a.accuracyPercent >= 80);
  if (fast) {
    list.push({
      id: 'ach-speed',
      title: 'দ্রুত ও নির্ভুল',
      description: 'নির্ধারিত সময়ের আগেই ৮০%+ নির্ভুলতায় পরীক্ষা শেষ করেছেন।',
      earnedAt: fast.submittedAt,
    });
  }
  return list;
}

export const profileService = {
  async getLeaderboard(filters?: {
    subjectId?: string;
    classId?: string;
  }): Promise<{ entries: LeaderboardEntry[] }> {
    const state = mockDb.getState();
    const subjectMap = new Map(state.subjects.map((s) => [s.id, s]));
    const classMap = new Map(state.classes.map((c) => [c.id, c]));

    const grouped = new Map<string, ExamAttempt[]>();
    for (const attempt of state.examAttempts) {
      if (filters?.subjectId && attempt.subjectId !== filters.subjectId) continue;
      if (filters?.classId && attempt.classId !== filters.classId) continue;
      const list = grouped.get(attempt.userId) ?? [];
      list.push(attempt);
      grouped.set(attempt.userId, list);
    }

    const entries: LeaderboardEntry[] = [];
    for (const [userId, attempts] of grouped.entries()) {
      const user = state.users.find((u) => u.id === userId);
      if (user && user.role === 'admin') continue;

      const totalScore = Number(
        attempts.reduce((sum, a) => sum + a.finalScore, 0).toFixed(2)
      );
      const totalPossibleMarks = Number(
        attempts.reduce((sum, a) => sum + a.totalMarks, 0).toFixed(2)
      );
      const averagePercent =
        totalPossibleMarks > 0
          ? Math.round((totalScore / totalPossibleMarks) * 100)
          : 0;

      // Best subject by average %
      const bySub = new Map<string, { score: number; possible: number }>();
      for (const a of attempts) {
        const cur = bySub.get(a.subjectId) ?? { score: 0, possible: 0 };
        cur.score += a.finalScore;
        cur.possible += a.totalMarks;
        bySub.set(a.subjectId, cur);
      }
      let bestSubjectName: string | undefined;
      let bestPct = -1;
      for (const [subId, agg] of bySub.entries()) {
        const pct = agg.possible > 0 ? (agg.score / agg.possible) * 100 : 0;
        if (pct > bestPct) {
          bestPct = pct;
          bestSubjectName = subjectMap.get(subId)?.nameBn ?? subjectMap.get(subId)?.name;
        }
      }

      const privacy: StudentPrivacySettings = {
        ...DEFAULT_PRIVACY_SETTINGS,
        ...(user?.privacySettings ?? {}),
      };
      const clsId = user?.classId ?? attempts[0]?.classId;
      const cls = clsId ? classMap.get(clsId) : undefined;

      entries.push({
        rank: 0,
        userId,
        fullName: user?.fullName ?? attempts[0]?.userName ?? 'শিক্ষার্থী',
        avatarUrl: user?.avatarUrl,
        institution: privacy.showSchool ? user?.institution : undefined,
        classId: clsId,
        className: cls?.nameBn ?? cls?.name,
        examsParticipated: attempts.length,
        totalScore,
        totalPossibleMarks,
        averagePercent,
        bestSubjectName,
      });
    }

    entries.sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      if (b.averagePercent !== a.averagePercent) return b.averagePercent - a.averagePercent;
      return b.examsParticipated - a.examsParticipated;
    });

    entries.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    return { entries };
  },

  async getStudentPublicProfile(userId: string): Promise<{ profile: StudentPublicProfileView }> {
    const state = mockDb.getState();
    const viewer = mockDb.getCurrentUser();
    const targetUser = state.users.find((u) => u.id === userId);
    const subjectMap = new Map(state.subjects.map((s) => [s.id, s]));
    const classMap = new Map(state.classes.map((c) => [c.id, c]));

    const userAttempts = state.examAttempts
      .filter((a) => a.userId === userId)
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

    if (!targetUser && userAttempts.length === 0) {
      throw new Error('শিক্ষার্থীর প্রোফাইল পাওয়া যায়নি।');
    }

    const privacy: StudentPrivacySettings = {
      ...DEFAULT_PRIVACY_SETTINGS,
      ...(targetUser?.privacySettings ?? {}),
    };

    const isOwnerOrAdmin =
      Boolean(viewer) && (viewer?.id === userId || viewer?.role === 'admin');

    const { entries: leaderboard } = await this.getLeaderboard();
    const lbEntry = leaderboard.find((e) => e.userId === userId);
    const rank = lbEntry ? lbEntry.rank : null;

    const totalScore = Number(
      userAttempts.reduce((sum, a) => sum + a.finalScore, 0).toFixed(2)
    );
    const totalPossibleMarks = Number(
      userAttempts.reduce((sum, a) => sum + a.totalMarks, 0).toFixed(2)
    );
    const averagePercent =
      totalPossibleMarks > 0 ? Math.round((totalScore / totalPossibleMarks) * 100) : 0;

    // Subject-wise stats
    const subAgg = new Map<string, { count: number; scored: number; possible: number }>();
    for (const a of userAttempts) {
      const cur = subAgg.get(a.subjectId) ?? { count: 0, scored: 0, possible: 0 };
      cur.count += 1;
      cur.scored += a.finalScore;
      cur.possible += a.totalMarks;
      subAgg.set(a.subjectId, cur);
    }
    const subjectPerformance: SubjectPerformanceStat[] = Array.from(subAgg.entries()).map(
      ([subjectId, agg]) => {
        const sub = subjectMap.get(subjectId);
        return {
          subjectId,
          subjectName: sub?.nameBn ?? sub?.name ?? subjectId,
          examsCount: agg.count,
          totalScored: Number(agg.scored.toFixed(2)),
          totalPossible: Number(agg.possible.toFixed(2)),
          averagePercent: agg.possible > 0 ? Math.round((agg.scored / agg.possible) * 100) : 0,
        };
      }
    );

    const examHistory = userAttempts.map((a) => {
      const sub = subjectMap.get(a.subjectId);
      return {
        attemptId: a.id,
        examId: a.examId,
        examTitle: a.examTitle,
        subjectName: sub?.nameBn ?? sub?.name ?? a.subjectId,
        finalScore: a.finalScore,
        totalMarks: a.totalMarks,
        accuracyPercent: a.accuracyPercent,
        submittedAt: a.submittedAt,
      };
    });

    const achievements = computeAchievements(userAttempts, rank);
    const clsId = targetUser?.classId ?? userAttempts[0]?.classId;
    const cls = clsId ? classMap.get(clsId) : undefined;

    if (!privacy.showProfilePublicly && !isOwnerOrAdmin) {
      return {
        profile: {
          userId,
          fullName: targetUser?.fullName ?? userAttempts[0]?.userName ?? 'শিক্ষার্থী',
          avatarUrl: targetUser?.avatarUrl,
          classId: clsId,
          className: cls?.nameBn ?? cls?.name,
          isPrivate: true,
          privacySettings: privacy,
          stats: {
            examsParticipated: userAttempts.length,
            totalScore,
            totalPossibleMarks,
            averagePercent,
            leaderboardRank: rank,
          },
          subjectPerformance: [],
          examHistory: [],
          achievements: [],
        },
      };
    }

    return {
      profile: {
        userId,
        fullName: targetUser?.fullName ?? userAttempts[0]?.userName ?? 'শিক্ষার্থী',
        avatarUrl: targetUser?.avatarUrl,
        classId: clsId,
        className: cls?.nameBn ?? cls?.name,
        institution: isOwnerOrAdmin || privacy.showSchool ? targetUser?.institution : undefined,
        bio: targetUser?.bio,
        isPrivate: false,
        privacySettings: privacy,
        stats: {
          examsParticipated: userAttempts.length,
          totalScore,
          totalPossibleMarks,
          averagePercent,
          leaderboardRank: rank,
        },
        subjectPerformance:
          isOwnerOrAdmin || privacy.showSubjectPerformance ? subjectPerformance : [],
        examHistory: isOwnerOrAdmin || privacy.showExamHistory ? examHistory : [],
        achievements: isOwnerOrAdmin || privacy.showAchievements ? achievements : [],
      },
    };
  },
};
