import { createSeedDatabase, type AppDatabaseState } from '../data/seedData';
import type { ActivityLog, UserProfile } from '../types/domain';

const DB_STORAGE_KEY = 'qb_mock_db_v4';
const SESSION_STORAGE_KEY = 'qb_mock_session_uid_v1';

let cachedState: AppDatabaseState | null = null;
let cachedSessionUserId: string | null | undefined;

function readStorage(key: string): string | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string | null): void {
  try {
    if (typeof window === 'undefined') return;
    if (value === null) {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // Ignore storage quota / privacy mode errors; in-memory state stays intact.
  }
}

export const mockDb = {
  getState(): AppDatabaseState {
    if (cachedState) return cachedState;
    const raw = readStorage(DB_STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as AppDatabaseState;
        const seed = createSeedDatabase();
        const oldHeadline = 'প্রশ্নপত্র তৈরি, স্লাইড মেকার ও লাইভ পরীক্ষা — এক প্ল্যাটফর্মে';
        const siteSettings =
          parsed.siteSettings?.heroHeadline === oldHeadline
            ? { ...parsed.siteSettings, heroHeadline: seed.siteSettings.heroHeadline }
            : parsed.siteSettings ?? seed.siteSettings;
        cachedState = {
          ...seed,
          ...parsed,
          siteSettings,
          exams: parsed.exams ?? seed.exams,
          examAttempts: parsed.examAttempts ?? seed.examAttempts,
          slideDecks: parsed.slideDecks ?? seed.slideDecks,
        };
        return cachedState;
      } catch {
        // Fall through to seed
      }
    }
    cachedState = createSeedDatabase();
    writeStorage(DB_STORAGE_KEY, JSON.stringify(cachedState));
    return cachedState;
  },

  save(): void {
    if (!cachedState) return;
    writeStorage(DB_STORAGE_KEY, JSON.stringify(cachedState));
  },

  getCurrentUserId(): string | null {
    if (cachedSessionUserId !== undefined) return cachedSessionUserId;
    cachedSessionUserId = readStorage(SESSION_STORAGE_KEY);
    return cachedSessionUserId;
  },

  setCurrentUserId(userId: string | null): void {
    cachedSessionUserId = userId;
    writeStorage(SESSION_STORAGE_KEY, userId);
  },

  getCurrentUser(): UserProfile | null {
    const uid = this.getCurrentUserId();
    if (!uid) return null;
    const user = this.getState().users.find((u) => u.id === uid) ?? null;
    if (user && user.status === 'suspended') {
      this.setCurrentUserId(null);
      return null;
    }
    return user;
  },

  uid(prefix: string): string {
    return `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;
  },

  logActivity(
    actor: UserProfile | null,
    action: string,
    targetType: ActivityLog['targetType'],
    targetId: string,
    details: string
  ): void {
    const state = this.getState();
    state.activityLogs.unshift({
      id: this.uid('log'),
      actorUserId: actor?.id ?? 'system',
      actorName: actor?.fullName ?? 'System',
      actorRole: actor?.role ?? 'student',
      action,
      targetType,
      targetId,
      details,
      createdAt: new Date().toISOString(),
    });
    if (state.activityLogs.length > 500) {
      state.activityLogs.length = 500;
    }
    this.save();
  },
};
