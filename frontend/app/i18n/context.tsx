"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { interpolate, translations, type Locale, type TranslationKey, type TranslationParams } from "./translations";

const LOCALE_STORAGE_KEY = "in-car-locale";
const API_URL = "http://localhost:8000";

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, params?: TranslationParams) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatDate: (value: Date, options?: Intl.DateTimeFormatOptions) => string;
  formatTime: (value: Date, options?: Intl.DateTimeFormatOptions) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function isLocale(value: unknown): value is Locale {
  return value === "ro" || value === "en";
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("ro");

  useEffect(() => {
    const storedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isLocale(storedLocale)) setLocaleState(storedLocale);

    fetch(`${API_URL}/api/auth/me`, { credentials: "include" })
      .then(async (response) => (response.ok ? response.json() : null))
      .then((user) => {
        if (isLocale(user?.locale)) {
          setLocaleState(user.locale);
          window.localStorage.setItem(LOCALE_STORAGE_KEY, user.locale);
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  }, [locale]);

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale);
    fetch(`${API_URL}/api/auth/locale`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: nextLocale }),
    }).catch(() => undefined);
  }, []);

  const value = useMemo<I18nContextValue>(() => {
    const current = translations[locale];
    return {
      locale,
      setLocale,
      t: (key, params) => interpolate(current[key] ?? translations.ro[key] ?? key, params),
      formatNumber: (value, options) => new Intl.NumberFormat(locale === "ro" ? "ro-RO" : "en-US", options).format(value),
      formatDate: (value, options) => new Intl.DateTimeFormat(locale === "ro" ? "ro-RO" : "en-US", options).format(value),
      formatTime: (value, options) => new Intl.DateTimeFormat(locale === "ro" ? "ro-RO" : "en-US", options).format(value),
    };
  }, [locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside LocaleProvider");
  return context;
}
