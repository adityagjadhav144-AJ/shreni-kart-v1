import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { applyInAppDomTranslation, ALL_LANGUAGES, type LangInfo } from "./app-translations";
import { useAuth } from "./auth";
import { saveUserProfile } from "./firestore-service";

export type LanguageOption = LangInfo;
export const SUPPORTED_LANGUAGES: LanguageOption[] = ALL_LANGUAGES;

export const STORAGE_LANG_KEY = "shreni.preferred_language";

export function setGoogleTranslateCookie(langCode: string) {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const target = langCode === "en" ? "/en/en" : `/en/${langCode}`;
  const hostname = window.location.hostname;

  document.cookie = `googtrans=${target}; path=/; max-age=${60 * 60 * 24 * 365}`;
  document.cookie = `googtrans=${target}; path=/; domain=${hostname}; max-age=${60 * 60 * 24 * 365}`;

  if (hostname.includes(".") && !/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    const parts = hostname.split(".");
    if (parts.length >= 2) {
      const rootDomain = parts.slice(-2).join(".");
      document.cookie = `googtrans=${target}; path=/; domain=.${rootDomain}; max-age=${60 * 60 * 24 * 365}`;
    }
  }
}

export function getGoogleTranslateCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)googtrans=\/en\/([a-zA-Z-]+)/);
  return match ? match[1] : null;
}

export function applyGoogleTranslate(langCode: string): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") return false;

  // 1. Instant robust in-app DOM translation across all 11 Indian languages
  applyInAppDomTranslation(langCode);

  // 2. Set browser cookies for Google Translate widget
  setGoogleTranslateCookie(langCode);
  try {
    localStorage.setItem(STORAGE_LANG_KEY, langCode);
    localStorage.setItem("craftlink.lang", langCode);
    localStorage.setItem("shreni.preferred_language", langCode);
  } catch {
    /* ignore */
  }

  // 3. Dispatch to Google Translate dropdown if loaded
  const select = document.querySelector<HTMLSelectElement>(".goog-te-combo");
  if (select) {
    select.value = langCode;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  }

  // 4. Dispatch global event to sync all React components and providers
  window.dispatchEvent(new CustomEvent("shreni:language_changed", { detail: { langCode } }));

  return true;
}

export function initGoogleTranslateScript() {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  if (document.getElementById("google-translate-script")) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).googleTranslateElementInit = function () {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).google?.translate?.TranslateElement) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      new (window as any).google.translate.TranslateElement(
        {
          pageLanguage: "en",
          includedLanguages: "en,hi,mr,gu,bn,ta,te,kn,ml,pa,or,ur,as,sa,ne,es,fr,de,ar",
          layout: 0,
          autoDisplay: false,
        },
        "google_translate_element",
      );

      const saved = localStorage.getItem(STORAGE_LANG_KEY) || getGoogleTranslateCookie() || "en";
      if (saved) {
        setTimeout(() => {
          applyGoogleTranslate(saved);
        }, 300);
      }
    }
  };

  const script = document.createElement("script");
  script.id = "google-translate-script";
  script.type = "text/javascript";
  script.async = true;
  script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
  document.body.appendChild(script);
}

interface GoogleTranslateContextValue {
  currentLang: string;
  currentLangOption: LanguageOption;
  setLanguage: (langCode: string) => Promise<void>;
  isTranslating: boolean;
  isReady: boolean;
  supportedLanguages: LanguageOption[];
}

const GoogleTranslateContext = createContext<GoogleTranslateContextValue>({
  currentLang: "en",
  currentLangOption: SUPPORTED_LANGUAGES[0],
  setLanguage: async () => {},
  isTranslating: false,
  isReady: false,
  supportedLanguages: SUPPORTED_LANGUAGES,
});

export function GoogleTranslateProvider({ children }: { children: ReactNode }) {
  const { profile, user, session } = useAuth();
  const artisanId = user?.uid || session?.user?.id;
  const userPrefLang = profile?.preferred_language || profile?.preferredLanguage;

  // Always start with "en" during SSR and initial hydration so server and client flags/labels match
  const [currentLang, setCurrentLang] = useState<string>("en");
  const [isTranslating, setIsTranslating] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // 1. Check existing saved user preference after client mount
    let saved = "en";
    try {
      saved = localStorage.getItem(STORAGE_LANG_KEY) || getGoogleTranslateCookie() || "en";
    } catch {
      /* ignore */
    }
    if (saved !== "en") {
      setCurrentLang(saved);
      setGoogleTranslateCookie(saved);
    }
    applyInAppDomTranslation(saved);

    // 2. Initialize Google Translate Script
    initGoogleTranslateScript();

    // 3. Check for Google Translate combo element
    const timer = setInterval(() => {
      const select = document.querySelector<HTMLSelectElement>(".goog-te-combo");
      if (select) {
        setIsReady(true);
        clearInterval(timer);
        if (saved !== "en") {
          applyGoogleTranslate(saved);
        }
      }
    }, 400);

    const fallbackTimer = setTimeout(() => {
      clearInterval(timer);
      setIsReady(true);
    }, 4000);

    return () => {
      clearInterval(timer);
      clearTimeout(fallbackTimer);
    };
  }, []);

  // Synchronize automatically when user profile language is loaded or updated
  useEffect(() => {
    if (userPrefLang && userPrefLang !== currentLang) {
      setCurrentLang(userPrefLang);
      applyGoogleTranslate(userPrefLang);
    }
  }, [userPrefLang]);

  // Synchronize immediately when Shreni AI or any app component dispatches language change
  useEffect(() => {
    const handleLangChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ langCode: string }>;
      const newLang = customEvent.detail?.langCode;
      if (newLang && newLang !== currentLang) {
        setCurrentLang(newLang);
      }
    };
    window.addEventListener("shreni:language_changed", handleLangChange);
    return () => {
      window.removeEventListener("shreni:language_changed", handleLangChange);
    };
  }, [currentLang]);

  const setLanguage = useCallback(
    async (langCode: string) => {
      setCurrentLang(langCode);
      setIsTranslating(true);

      applyGoogleTranslate(langCode);

      // Persist to user profile in database if logged in
      if (artisanId) {
        void saveUserProfile(artisanId, {
          id: artisanId,
          preferredLanguage: langCode,
        }).catch(() => {});
      }

      setTimeout(() => {
        setIsTranslating(false);
      }, 400);
    },
    [artisanId],
  );

  const currentLangOption =
    SUPPORTED_LANGUAGES.find((l) => l.code === currentLang) || SUPPORTED_LANGUAGES[0];

  return (
    <GoogleTranslateContext.Provider
      value={{
        currentLang,
        currentLangOption,
        setLanguage,
        isTranslating,
        isReady,
        supportedLanguages: SUPPORTED_LANGUAGES,
      }}
    >
      {children}
    </GoogleTranslateContext.Provider>
  );
}

export function useGoogleTranslate() {
  return useContext(GoogleTranslateContext);
}
