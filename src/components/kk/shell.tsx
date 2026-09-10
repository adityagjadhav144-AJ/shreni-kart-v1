import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { ChevronLeft, MessageCircle, Package, ShoppingBag } from "lucide-react";
import type { ReactNode } from "react";
import { GoogleTranslateSelector } from "@/components/ui/GoogleTranslateSelector";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Responsive container with adaptive portrait and landscape scaling across mobile, tablet, and PWA viewports. */
export function Phone({
  children,
  withNav = false,
  className,
}: {
  children: ReactNode;
  withNav?: boolean;
  className?: string;
}) {
  return (
    <div className="flex min-h-screen justify-center bg-white">
      <div
        className={cn(
          "relative flex min-h-screen w-full max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-4xl landscape:max-w-4xl landscape:lg:max-w-5xl flex-col bg-white shadow-soft transition-all duration-300 pt-[env(safe-area-inset-top,0px)]",
          className,
        )}
      >
        <div className={cn("flex-1 w-full", withNav && "pb-28 sm:pb-32 landscape:pb-20")}>
          {children}
        </div>
        {withNav ? <BottomNav /> : null}
      </div>
    </div>
  );
}

const tabs = [
  { to: "/dashboard", label: "Products", icon: ShoppingBag },
  { to: "/orders", label: "Your Orders", icon: Package },
  { to: "/inquiry", label: "Inquiry", icon: MessageCircle },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { t } = useI18n();

  return (
    <nav className="pointer-events-none fixed bottom-0 inset-x-0 mx-auto z-40 w-full max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-4xl landscape:max-w-4xl landscape:lg:max-w-5xl px-3 sm:px-4 pb-[max(1rem,env(safe-area-inset-bottom,1rem))] landscape:pb-[max(0.5rem,env(safe-area-inset-bottom,0.5rem))] transition-all duration-300">
      <div className="pointer-events-auto flex items-center justify-between gap-1 rounded-4xl border border-border/60 bg-card/95 p-1.5 sm:p-2 landscape:py-1 shadow-float backdrop-blur">
        {tabs.map(({ to, label, icon: Icon }) => {
          const active = pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "tap flex flex-1 items-center justify-center gap-1.5 sm:gap-2 rounded-3xl px-3 py-2 sm:py-2.5 landscape:py-1 text-xs sm:text-sm font-semibold transition-colors",
                active
                  ? "bg-gradient-warm text-primary-foreground shadow-card"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon
                className="size-4 sm:size-4.5 landscape:size-4 shrink-0"
                strokeWidth={active ? 2.4 : 2}
              />
              <span className={cn("truncate text-xs", !active && "hidden sm:inline")}>
                {t(label)}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function ScreenHeader({
  title,
  subtitle,
  right,
  back = true,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  back?: boolean;
}) {
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border/50 bg-card/90 px-4 py-3 sm:py-4 landscape:py-2.5 backdrop-blur">
      {back ? (
        <button
          type="button"
          aria-label="Go back"
          onClick={() => navigate({ to: "/dashboard" })}
          className="tap grid size-10 shrink-0 place-items-center rounded-2xl bg-secondary text-secondary-foreground"
        >
          <ChevronLeft className="size-5" />
        </button>
      ) : null}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-semibold text-foreground">{t(title)}</h1>
        {subtitle ? <p className="truncate text-xs text-muted-foreground">{t(subtitle)}</p> : null}
      </div>
      {right !== undefined ? right : <GoogleTranslateSelector variant="badge" />}
    </header>
  );
}

export function SectionTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  const { t } = useI18n();

  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{t(title)}</h2>
        {subtitle ? <p className="text-xs text-muted-foreground">{t(subtitle)}</p> : null}
      </div>
      {action}
    </div>
  );
}
