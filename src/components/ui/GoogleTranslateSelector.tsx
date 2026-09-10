import { useState } from "react";
import {
  Check,
  ChevronDown,
  Globe,
  Languages,
  Loader2,
  RotateCcw,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  useGoogleTranslate,
  SUPPORTED_LANGUAGES,
  type LanguageOption,
} from "@/lib/google-translate";
import { useAuth } from "@/lib/auth";
import { saveUserProfile } from "@/lib/firestore-service";

interface GoogleTranslateSelectorProps {
  variant?: "badge" | "compact" | "grid" | "button";
  className?: string;
}

export function GoogleTranslateSelector({
  variant = "badge",
  className = "",
}: GoogleTranslateSelectorProps) {
  const { currentLang, currentLangOption, setLanguage, isTranslating } = useGoogleTranslate();
  const { user, session, refreshProfile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const artisanId = user?.uid || session?.user?.id;

  const handleSelect = async (option: LanguageOption) => {
    if (option.code === currentLang) {
      setIsOpen(false);
      return;
    }

    try {
      await setLanguage(option.code);

      // Save preference to Firestore user profile if authenticated
      if (artisanId) {
        void saveUserProfile(artisanId, {
          id: artisanId,
          preferredLanguage: option.code,
        })
          .then(() => refreshProfile?.())
          .catch(() => {});
      }

      toast.success(
        option.code === "en"
          ? "Restored app to English"
          : `Translating app to ${option.native} (${option.label}) via Google Translate`,
      );
    } catch {
      toast.error("Could not switch language. Please try again.");
    } finally {
      setIsOpen(false);
    }
  };

  const filteredLanguages = SUPPORTED_LANGUAGES.filter(
    (l) =>
      l.label.toLowerCase().includes(search.toLowerCase()) ||
      l.native.toLowerCase().includes(search.toLowerCase()) ||
      l.code.toLowerCase().includes(search.toLowerCase()),
  );

  // Variant: Interactive Grid (e.g. for Profile Settings)
  if (variant === "grid") {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Globe className="size-3.5 text-primary" />
            <span>Powered by Google Translate & Shreni Multilingual</span>
          </div>
          {currentLang !== "en" && (
            <button
              type="button"
              onClick={() => handleSelect(SUPPORTED_LANGUAGES[0])}
              className="tap inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              <RotateCcw className="size-3" />
              <span>Reset English</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {SUPPORTED_LANGUAGES.map((l) => {
            const active = currentLang === l.code;
            return (
              <button
                key={l.code}
                type="button"
                onClick={() => handleSelect(l)}
                disabled={isTranslating}
                className={`tap flex flex-col items-start rounded-2xl p-3.5 text-left transition-all ${
                  active
                    ? "bg-gradient-warm text-primary-foreground shadow-card"
                    : "bg-card text-card-foreground border border-border/60 hover:border-primary/50 shadow-soft"
                }`}
              >
                <div className="flex w-full items-center justify-between">
                  <span className="text-base">{l.flag}</span>
                  {active && <Check className="size-4 shrink-0 text-white" />}
                </div>
                <span className="mt-1.5 font-semibold text-sm leading-tight">{l.native}</span>
                <span
                  className={`text-[11px] ${active ? "text-white/80" : "text-muted-foreground"}`}
                >
                  {l.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Variant: Button
  if (variant === "button") {
    return (
      <>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`tap inline-flex items-center gap-2 rounded-2xl border border-border/70 bg-card px-3.5 py-2 text-xs font-semibold text-foreground shadow-soft hover:border-primary/50 ${className}`}
          aria-label="Change translation language"
        >
          <span className="text-sm">{currentLangOption.flag}</span>
          <span className="truncate">{currentLangOption.native}</span>
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </button>
        {renderModal()}
      </>
    );
  }

  // Variant: Compact icon button
  if (variant === "compact") {
    return (
      <>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`tap relative grid size-10 place-items-center rounded-2xl bg-card text-foreground shadow-soft hover:text-primary ${className}`}
          aria-label="Google Translate language switcher"
          title={`Google Translate: Current language ${currentLangOption.label}`}
        >
          {isTranslating ? (
            <Loader2 className="size-4 animate-spin text-primary" />
          ) : (
            <>
              <Languages className="size-4 text-primary" />
              <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-white">
                {currentLangOption.code.toUpperCase()}
              </span>
            </>
          )}
        </button>
        {renderModal()}
      </>
    );
  }

  // Default Variant: Badge pill
  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`tap inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-card/95 px-2.5 py-1 text-xs font-semibold text-foreground shadow-soft backdrop-blur-md hover:border-primary transition-all ${className}`}
        aria-label="Google Translate language selector"
        title="Translate page into Indian regional languages via Google Translate"
      >
        <span className="text-sm">{currentLangOption.flag}</span>
        <span className="font-medium text-[11px] tracking-tight text-foreground">
          {currentLangOption.native}
        </span>
        {isTranslating ? (
          <Loader2 className="size-3 animate-spin text-primary" />
        ) : (
          <ChevronDown className="size-3 text-muted-foreground" />
        )}
      </button>

      {renderModal()}
    </>
  );

  function renderModal() {
    if (!isOpen) return null;

    return (
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in"
        onClick={(e) => {
          if (e.target === e.currentTarget) setIsOpen(false);
        }}
      >
        <div className="relative flex max-h-[90vh] w-full max-w-md flex-col rounded-t-[2rem] sm:rounded-3xl border border-border/80 bg-card text-card-foreground shadow-2xl animate-in slide-in-from-bottom duration-250">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/50 px-5 pt-4 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="grid size-9 place-items-center rounded-2xl bg-gradient-warm text-primary-foreground shadow-xs">
                <Globe className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-display font-bold text-base text-foreground">
                    Google Translate
                  </h3>
                  <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">
                    Live
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Choose your language preference for the entire app
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="tap rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="Close language selector"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Search & Quick Reset */}
          <div className="px-5 pt-3 pb-2 space-y-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search languages (e.g. Hindi, मराठी, Gujarati)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-2xl border border-border/70 bg-secondary/30 pl-9 pr-4 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {currentLang !== "en" && (
              <div className="flex items-center justify-between rounded-xl bg-primary/10 px-3 py-1.5 text-xs text-primary">
                <span>Currently translating to {currentLangOption.native}</span>
                <button
                  type="button"
                  onClick={() => handleSelect(SUPPORTED_LANGUAGES[0])}
                  className="tap inline-flex items-center gap-1 font-semibold hover:underline"
                >
                  <RotateCcw className="size-3" />
                  <span>Restore English</span>
                </button>
              </div>
            )}
          </div>

          {/* Languages List */}
          <div className="no-scrollbar flex-1 overflow-y-auto px-5 py-2 space-y-1.5 min-h-[220px] max-h-[50vh]">
            <p className="text-[11px] font-semibold text-muted-foreground tracking-wider uppercase px-1">
              Indian & Regional Languages
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {filteredLanguages.map((l) => {
                const active = currentLang === l.code;
                return (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => handleSelect(l)}
                    className={`tap flex items-center justify-between rounded-2xl px-3.5 py-2.5 text-left transition-all ${
                      active
                        ? "bg-gradient-warm text-primary-foreground shadow-soft"
                        : "bg-secondary/40 text-foreground hover:bg-secondary border border-border/40"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-lg">{l.flag}</span>
                      <div className="truncate">
                        <p className="font-semibold text-xs leading-tight truncate">{l.native}</p>
                        <p
                          className={`text-[10px] truncate ${
                            active ? "text-white/80" : "text-muted-foreground"
                          }`}
                        >
                          {l.label}
                        </p>
                      </div>
                    </div>
                    {active && <Check className="size-4 shrink-0 text-white ml-2" />}
                  </button>
                );
              })}
            </div>

            {filteredLanguages.length === 0 && (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No languages found matching "{search}".
              </div>
            )}
          </div>

          {/* Footer note */}
          <div className="border-t border-border/50 bg-secondary/20 px-5 py-3 text-[11px] text-muted-foreground flex items-center gap-2">
            <Sparkles className="size-3.5 text-primary shrink-0" />
            <span>
              Google Translate dynamically converts product descriptions, artisan stories, and app
              menus into your chosen language.
            </span>
          </div>
        </div>
      </div>
    );
  }
}
