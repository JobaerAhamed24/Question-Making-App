import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { questionBankService } from '../services/questionBankService';
import type { UserProfile } from '../types/domain';

interface AuthContextValue {
  user: UserProfile | null;
  isHydrating: boolean;
  revision: number;
  bumpRevision: () => void;
  login: (email: string, password: string) => Promise<UserProfile>;
  quickDemoLogin: (userId: string) => Promise<UserProfile>;
  register: (input: {
    fullName: string;
    email: string;
    phone: string;
    institution?: string;
    preferredLanguage: 'en' | 'bn';
    password: string;
  }) => Promise<UserProfile>;
  logout: () => Promise<void>;
  updateProfile: (patch: {
    fullName: string;
    phone: string;
    institution?: string;
    preferredLanguage: 'en' | 'bn';
  }) => Promise<UserProfile>;
  resetDemoData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(() => questionBankService.getCurrentUser());
  const [isHydrating, setIsHydrating] = useState<boolean>(true);
  const [revision, setRevision] = useState(0);

  const bumpRevision = useCallback(() => {
    setRevision((r) => r + 1);
    setUser(questionBankService.getCurrentUser());
  }, []);

  useEffect(() => {
    questionBankService.setSyncListener(() => {
      setUser(questionBankService.getCurrentUser());
      setRevision((r) => r + 1);
    });

    let active = true;
    questionBankService
      .hydrateFromServer()
      .then((sessionUser) => {
        if (!active) return;
        setUser(sessionUser);
        setRevision((r) => r + 1);
      })
      .catch((err) => {
        console.error('Bootstrap hydration failed:', err);
      })
      .finally(() => {
        if (active) setIsHydrating(false);
      });

    return () => {
      active = false;
      questionBankService.setSyncListener(null);
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const loggedIn = await questionBankService.login(email, password);
    setUser(loggedIn);
    setRevision((r) => r + 1);
    return loggedIn;
  }, []);

  const quickDemoLogin = useCallback(async (userId: string) => {
    const loggedIn = await questionBankService.quickDemoLogin(userId);
    setUser(loggedIn);
    setRevision((r) => r + 1);
    return loggedIn;
  }, []);

  const register = useCallback(
    async (input: {
      fullName: string;
      email: string;
      phone: string;
      institution?: string;
      preferredLanguage: 'en' | 'bn';
      password: string;
    }) => {
      const created = await questionBankService.register(input);
      setUser(created);
      setRevision((r) => r + 1);
      return created;
    },
    []
  );

  const logout = useCallback(async () => {
    await questionBankService.logout();
    setUser(null);
    setRevision((r) => r + 1);
  }, []);

  const updateProfile = useCallback(
    async (patch: {
      fullName: string;
      phone: string;
      institution?: string;
      preferredLanguage: 'en' | 'bn';
    }) => {
      if (!user) throw new Error('Not authenticated.');
      const updated = await questionBankService.updateProfile(user.id, patch);
      setUser(updated);
      setRevision((r) => r + 1);
      return updated;
    },
    [user]
  );

  const resetDemoData = useCallback(async () => {
    await questionBankService.resetDemoDatabase();
    setUser(questionBankService.getCurrentUser());
    setRevision((r) => r + 1);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isHydrating,
        revision,
        bumpRevision,
        login,
        quickDemoLogin,
        register,
        logout,
        updateProfile,
        resetDemoData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
