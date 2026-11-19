import React, { createContext, useContext, useEffect, useState } from 'react';

export type AppTheme = 'dark' | 'light';

export type ThemePresetId =
  | 'apex-academy'
  | 'obsidian-gold'
  | 'emerald-scholar'
  | 'royal-sapphire'
  | 'academic-indigo'
  | 'crimson-editorial'
  | 'teal-modern';

export type SiteFontId =
  | 'hind-siliguri'
  | 'noto-sans-bengali'
  | 'anek-bangla'
  | 'noto-serif-bengali'
  | 'tiro-bangla'
  | 'baloo-da-2'
  | 'mina'
  | 'inter'
  | 'plus-jakarta-sans'
  | 'poppins'
  | 'roboto';

export interface ThemePresetMeta {
  id: ThemePresetId;
  nameBn: string;
  descriptionBn: string;
  swatchPrimary: string;
  swatchSecondary: string;
  swatchBgDark: string;
  swatchBgLight: string;
}

export interface SiteFontOption {
  id: SiteFontId;
  name: string;
  labelBn: string;
  category: 'bangla' | 'global';
  cssFamily: string;
  sampleBn: string;
}

export const THEME_PRESETS: ThemePresetMeta[] = [
  {
    id: 'apex-academy',
    nameBn: 'অ্যাপেক্স একাডেমি — নেভি ও অরেঞ্জ (ডিফল্ট)',
    descriptionBn: 'ডিপ অক্সফোর্ড নেভি, ক্রিস্প হোয়াইট কার্ড এবং ভাইব্রেন্ট একাডেমিক অরেঞ্জ প্রিমিয়াম কোচিং থিম',
    swatchPrimary: '#F57C1F',
    swatchSecondary: '#0B1A33',
    swatchBgDark: '#0B1A33',
    swatchBgLight: '#F7F8FA',
  },
  {
    id: 'obsidian-gold',
    nameBn: 'অবসিডিয়ান গোল্ড',
    descriptionBn: 'ক্ল্যাসিক গাঢ় অবসিডিয়ান ও ব্রাশড গোল্ড একাডেমিক স্টাইল',
    swatchPrimary: '#D4A853',
    swatchSecondary: '#EAC779',
    swatchBgDark: '#07090C',
    swatchBgLight: '#F8F6F1',
  },
  {
    id: 'emerald-scholar',
    nameBn: 'এমেরাল্ড স্কলার',
    descriptionBn: 'সতেজ পান্না সবুজ — শিক্ষাপ্রতিষ্ঠান ও পাঠ্যবই অনুপ্রাণিত থিম',
    swatchPrimary: '#10B981',
    swatchSecondary: '#34D399',
    swatchBgDark: '#060C0A',
    swatchBgLight: '#F3FAF7',
  },
  {
    id: 'royal-sapphire',
    nameBn: 'রয়্যাল স্যাফায়ার',
    descriptionBn: 'বিশ্বাসযোগ্য ও পরিষ্কার নীল একাডেমিক পোর্টাল থিম',
    swatchPrimary: '#3B82F6',
    swatchSecondary: '#60A5FA',
    swatchBgDark: '#060A12',
    swatchBgLight: '#F3F7FD',
  },
  {
    id: 'academic-indigo',
    nameBn: 'একাডেমিক ইন্ডিগো',
    descriptionBn: 'আধুনিক SaaS এডটেক ও কোচিং প্ল্যাটফর্ম থিম',
    swatchPrimary: '#6366F1',
    swatchSecondary: '#818CF8',
    swatchBgDark: '#080814',
    swatchBgLight: '#F5F5FE',
  },
  {
    id: 'crimson-editorial',
    nameBn: 'ক্রিমসন এডিটোরিয়াল',
    descriptionBn: 'অভিজাত বিশ্ববিদ্যালয় ও প্রকাশনা অনুপ্রাণিত রুবি থিম',
    swatchPrimary: '#E11D48',
    swatchSecondary: '#FB7185',
    swatchBgDark: '#0E070A',
    swatchBgLight: '#FDF4F6',
  },
  {
    id: 'teal-modern',
    nameBn: 'টিল মডার্ন',
    descriptionBn: 'প্রশান্তিদায়ক টিল-সায়ান দীর্ঘ সময় পড়ার উপযোগী থিম',
    swatchPrimary: '#14B8A6',
    swatchSecondary: '#2DD4BF',
    swatchBgDark: '#060D0D',
    swatchBgLight: '#F2FAFA',
  },
];

export const SITE_FONT_OPTIONS: SiteFontOption[] = [
  {
    id: 'hind-siliguri',
    name: 'Hind Siliguri',
    labelBn: 'হিন্দ শিলিগুড়ি (সবচেয়ে জনপ্রিয় বাংলা — ডিফল্ট)',
    category: 'bangla',
    cssFamily: '"Hind Siliguri", ui-sans-serif, system-ui, sans-serif',
    sampleBn: 'বাংলাদেশ শিক্ষাবোর্ডের আধুনিক প্রশ্নপত্র তৈরি — ১ ২ ৩ ৪ ৫',
  },
  {
    id: 'noto-sans-bengali',
    name: 'Noto Sans Bengali',
    labelBn: 'নোটো স্যান্স বাংলা (গুগল ক্লিন বাংলা)',
    category: 'bangla',
    cssFamily: '"Noto Sans Bengali", "Hind Siliguri", sans-serif',
    sampleBn: 'বাংলাদেশ শিক্ষাবোর্ডের আধুনিক প্রশ্নপত্র তৈরি — ১ ২ ৩ ৪ ৫',
  },
  {
    id: 'anek-bangla',
    name: 'Anek Bangla',
    labelBn: 'অনেক বাংলা (মডার্ন ইউআই বাংলা)',
    category: 'bangla',
    cssFamily: '"Anek Bangla", "Hind Siliguri", sans-serif',
    sampleBn: 'বাংলাদেশ শিক্ষাবোর্ডের আধুনিক প্রশ্নপত্র তৈরি — ১ ২ ৩ ৪ ৫',
  },
  {
    id: 'noto-serif-bengali',
    name: 'Noto Serif Bengali',
    labelBn: 'নোটো সেরিফ বাংলা (বই ও পত্রিকার ফন্ট)',
    category: 'bangla',
    cssFamily: '"Noto Serif Bengali", "Hind Siliguri", serif',
    sampleBn: 'বাংলাদেশ শিক্ষাবোর্ডের আধুনিক প্রশ্নপত্র তৈরি — ১ ২ ৩ ৪ ৫',
  },
  {
    id: 'tiro-bangla',
    name: 'Tiro Bangla',
    labelBn: 'তিরো বাংলা (ক্ল্যাসিক ছাপাখানার বাংলা)',
    category: 'bangla',
    cssFamily: '"Tiro Bangla", "Hind Siliguri", serif',
    sampleBn: 'বাংলাদেশ শিক্ষাবোর্ডের আধুনিক প্রশ্নপত্র তৈরি — ১ ২ ৩ ৪ ৫',
  },
  {
    id: 'baloo-da-2',
    name: 'Baloo Da 2',
    labelBn: 'বালু দা ২ (রাউন্ডেড ও বন্ধুত্বপূর্ণ বাংলা)',
    category: 'bangla',
    cssFamily: '"Baloo Da 2", "Hind Siliguri", sans-serif',
    sampleBn: 'বাংলাদেশ শিক্ষাবোর্ডের আধুনিক প্রশ্নপত্র তৈরি — ১ ২ ৩ ৪ ৫',
  },
  {
    id: 'mina',
    name: 'Mina',
    labelBn: 'মীনা (জ্যামিতিক মডার্ন বাংলা)',
    category: 'bangla',
    cssFamily: '"Mina", "Hind Siliguri", sans-serif',
    sampleBn: 'বাংলাদেশ শিক্ষাবোর্ডের আধুনিক প্রশ্নপত্র তৈরি — ১ ২ ৩ ৪ ৫',
  },
  {
    id: 'inter',
    name: 'Inter',
    labelBn: 'Inter + Hind Siliguri (বিশ্বের সেরা SaaS ওয়েব ফন্ট)',
    category: 'global',
    cssFamily: '"Inter", "Hind Siliguri", ui-sans-serif, sans-serif',
    sampleBn: 'Academic Question Bank & বাংলা প্রশ্নপত্র — 2026',
  },
  {
    id: 'plus-jakarta-sans',
    name: 'Plus Jakarta Sans',
    labelBn: 'Plus Jakarta Sans + Hind Siliguri (প্রিমিয়াম ওয়েব ফন্ট)',
    category: 'global',
    cssFamily: '"Plus Jakarta Sans", "Hind Siliguri", ui-sans-serif, sans-serif',
    sampleBn: 'Academic Question Bank & বাংলা প্রশ্নপত্র — 2026',
  },
  {
    id: 'poppins',
    name: 'Poppins',
    labelBn: 'Poppins + Hind Siliguri (জনপ্রিয় জ্যামিতিক ওয়েব ফন্ট)',
    category: 'global',
    cssFamily: '"Poppins", "Hind Siliguri", ui-sans-serif, sans-serif',
    sampleBn: 'Academic Question Bank & বাংলা প্রশ্নপত্র — 2026',
  },
  {
    id: 'roboto',
    name: 'Roboto',
    labelBn: 'Roboto + Hind Siliguri (সর্বাধিক ব্যবহৃত ওয়েব ফন্ট)',
    category: 'global',
    cssFamily: '"Roboto", "Hind Siliguri", ui-sans-serif, sans-serif',
    sampleBn: 'Academic Question Bank & বাংলা প্রশ্নপত্র — 2026',
  },
];

export const FONT_SIZE_PRESETS: Array<{ labelBn: string; scale: number; pctLabel: string }> = [
  { labelBn: 'ছোট', scale: 0.94, pctLabel: '৯৪%' },
  { labelBn: 'স্বাভাবিক', scale: 1.0, pctLabel: '১০০%' },
  { labelBn: 'আরামদায়ক', scale: 1.06, pctLabel: '১০৬%' },
  { labelBn: 'বড়', scale: 1.12, pctLabel: '১১২%' },
  { labelBn: 'খুব বড়', scale: 1.2, pctLabel: '১২০%' },
];

interface StoredAppearance {
  theme: AppTheme;
  themePreset: ThemePresetId;
  fontFamilyId: SiteFontId;
  fontSizeScale: number;
}

interface ThemeContextValue {
  theme: AppTheme;
  themePreset: ThemePresetId;
  fontFamilyId: SiteFontId;
  fontSizeScale: number;
  toggleTheme: () => void;
  setTheme: (next: AppTheme) => void;
  setThemePreset: (preset: ThemePresetId) => void;
  setFontFamilyId: (fontId: SiteFontId) => void;
  setFontSizeScale: (scale: number) => void;
  resetAppearance: () => void;
}

const APPEARANCE_STORAGE_KEY = 'qb_ui_appearance_v3';

const DEFAULT_APPEARANCE: StoredAppearance = {
  theme: 'light',
  themePreset: 'apex-academy',
  fontFamilyId: 'hind-siliguri',
  fontSizeScale: 1.0,
};

const ThemeContext = createContext<ThemeContextValue>({
  ...DEFAULT_APPEARANCE,
  toggleTheme: () => undefined,
  setTheme: () => undefined,
  setThemePreset: () => undefined,
  setFontFamilyId: () => undefined,
  setFontSizeScale: () => undefined,
  resetAppearance: () => undefined,
});

function readStoredAppearance(): StoredAppearance {
  if (typeof window === 'undefined') return DEFAULT_APPEARANCE;
  try {
    const raw = window.localStorage.getItem(APPEARANCE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StoredAppearance>;
      const validTheme: AppTheme = parsed.theme === 'light' || parsed.theme === 'dark' ? parsed.theme : 'light';
      const validPreset = THEME_PRESETS.some((p) => p.id === parsed.themePreset)
        ? (parsed.themePreset as ThemePresetId)
        : 'apex-academy';
      const validFont = SITE_FONT_OPTIONS.some((f) => f.id === parsed.fontFamilyId)
        ? (parsed.fontFamilyId as SiteFontId)
        : 'hind-siliguri';
      const scaleNum = typeof parsed.fontSizeScale === 'number' && Number.isFinite(parsed.fontSizeScale)
        ? Math.min(1.25, Math.max(0.88, parsed.fontSizeScale))
        : 1.0;
      return {
        theme: validTheme,
        themePreset: validPreset,
        fontFamilyId: validFont,
        fontSizeScale: scaleNum,
      };
    }
  } catch {
    // ignore storage access errors
  }
  return DEFAULT_APPEARANCE;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [appearance, setAppearance] = useState<StoredAppearance>(readStoredAppearance);

  useEffect(() => {
    const root = document.documentElement;
    if (appearance.theme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
      root.style.colorScheme = 'light';
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    }

    root.dataset.themePreset = appearance.themePreset;

    const fontObj = SITE_FONT_OPTIONS.find((f) => f.id === appearance.fontFamilyId) || SITE_FONT_OPTIONS[0];
    root.style.setProperty('--site-font-family', fontObj.cssFamily);
    root.style.setProperty('--ui-font-scale', String(appearance.fontSizeScale));

    try {
      window.localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(appearance));
    } catch {
      // ignore storage errors
    }
  }, [appearance]);

  const setTheme = (theme: AppTheme) => setAppearance((prev) => ({ ...prev, theme }));
  const toggleTheme = () =>
    setAppearance((prev) => ({ ...prev, theme: prev.theme === 'dark' ? 'light' : 'dark' }));
  const setThemePreset = (themePreset: ThemePresetId) =>
    setAppearance((prev) => ({ ...prev, themePreset }));
  const setFontFamilyId = (fontFamilyId: SiteFontId) =>
    setAppearance((prev) => ({ ...prev, fontFamilyId }));
  const setFontSizeScale = (scale: number) => {
    const clamped = Math.min(1.25, Math.max(0.88, Number(scale.toFixed(2))));
    setAppearance((prev) => ({ ...prev, fontSizeScale: clamped }));
  };
  const resetAppearance = () => setAppearance(DEFAULT_APPEARANCE);

  return (
    <ThemeContext.Provider
      value={{
        ...appearance,
        toggleTheme,
        setTheme,
        setThemePreset,
        setFontFamilyId,
        setFontSizeScale,
        resetAppearance,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
