import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from "react";

export type Lang = "en" | "hi" | "mr";

const translations: Record<string, Record<string, string>> = {
  en: {
    Products: "Products",
    "Your Orders": "Your Orders",
    Inquiry: "Inquiry",
    "Buyer Inquiries": "Buyer Inquiries",
    verified: "Verified Artisan",
    startVerification: "Start Verification",
    verifyLater: "Verify Later",
    errService: "Verification service unavailable. Please try again later.",
    Dashboard: "Dashboard",
    Handicrafts: "Handicrafts",
    "Crafting Traditions": "Crafting Traditions",
  },
  hi: {
    Products: "उत्पाद (Products)",
    "Your Orders": "आपके ऑर्डर (Orders)",
    Inquiry: "पूछताछ (Inquiry)",
    "Buyer Inquiries": "खरीदार की पूछताछ",
    verified: "सत्यापित शिल्पकार",
    startVerification: "सत्यापन शुरू करें",
    verifyLater: "बाद में सत्यापित करें",
    errService: "सत्यापन सेवा अनुपलब्ध है। कृपया बाद में प्रयास करें।",
    Dashboard: "डैशबोर्ड",
    Handicrafts: "हस्तशिल्प",
    "Crafting Traditions": "पारंपरिक कला",
  },
  mr: {
    Products: "उत्पादने (Products)",
    "Your Orders": "तुमच्या ऑर्डर्स (Orders)",
    Inquiry: "चौकशी (Inquiry)",
    "Buyer Inquiries": "ग्राहकांची चौकशी",
    verified: "प्रमाणित कारागीर",
    startVerification: "पडताळणी सुरू करा",
    verifyLater: "नंतर पडताळणी करा",
    errService: "पडताळणी सेवा उपलब्ध नाही. कृपया नंतर पुन्हा प्रयत्न करा.",
    Dashboard: "डॅशबोर्ड",
    Handicrafts: "हस्तकला",
    "Crafting Traditions": "पारंपरिक कला",
  },
};

interface I18nContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextValue>({
  lang: "en",
  setLang: () => {},
  t: (k: string) => k,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window !== "undefined") {
      const saved =
        window.localStorage.getItem("craftlink.lang") ||
        window.localStorage.getItem("shreni.preferred_language");
      if (saved === "hi" || saved === "mr" || saved === "en") return saved;
    }
    return "en";
  });

  const setLang = useCallback((newLang: Lang) => {
    setLangState(newLang);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("craftlink.lang", newLang);
      window.localStorage.setItem("shreni.preferred_language", newLang);
    }
  }, []);

  useEffect(() => {
    const handler = (e: CustomEvent<{ langCode: string }>) => {
      const code = e.detail?.langCode;
      if (code === "hi" || code === "mr" || code === "en") {
        setLangState(code);
      }
    };
    window.addEventListener(
      "shreni:language_changed" as unknown as keyof WindowEventMap,
      handler as EventListener,
    );
    return () => {
      window.removeEventListener(
        "shreni:language_changed" as unknown as keyof WindowEventMap,
        handler as EventListener,
      );
    };
  }, []);

  const t = useCallback(
    (key: string): string => {
      if (!key) return "";
      return translations[lang]?.[key] || translations.en?.[key] || key;
    },
    [lang],
  );

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  return ctx;
}
