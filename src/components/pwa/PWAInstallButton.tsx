import { useState } from "react";
import { Download, Share, PlusSquare, CheckCircle2, Smartphone, X } from "lucide-react";
import { usePWAInstall } from "@/lib/usePWAInstall";

interface PWAInstallButtonProps {
  variant?: "compact" | "prominent" | "outline" | "banner";
  className?: string;
}

export function PWAInstallButton({ variant = "compact", className = "" }: PWAInstallButtonProps) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  // If already installed and running standalone, do not clutter the UI
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const outcome = await install();
      if (outcome) {
        setInstallSuccess(true);
        setTimeout(() => setInstallSuccess(false), 3000);
      }
    } else {
      setShowModal(true);
    }
  };

  return (
    <>
      {variant === "compact" && (
        <button
          id="pwa-install-btn-compact"
          type="button"
          onClick={handleInstallClick}
          className={`inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-all hover:bg-primary hover:text-primary-foreground active:scale-95 shadow-sm ${className}`}
          title="Install Shreni Kart app on your device"
        >
          {installSuccess ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5 text-leaf" />
              <span>Installed</span>
            </>
          ) : (
            <>
              <Download className="h-3.5 w-3.5" />
              <span>Install App</span>
            </>
          )}
        </button>
      )}

      {variant === "prominent" && (
        <button
          id="pwa-install-btn-prominent"
          type="button"
          onClick={handleInstallClick}
          className={`inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-md transition-all hover:bg-primary/90 hover:shadow-lg active:scale-98 ${className}`}
        >
          <Download className="h-4 w-4" />
          <span>Install Shreni Kart App</span>
        </button>
      )}

      {variant === "outline" && (
        <button
          id="pwa-install-btn-outline"
          type="button"
          onClick={handleInstallClick}
          className={`inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground transition-all hover:border-primary/50 hover:bg-primary/5 active:scale-98 ${className}`}
        >
          <Smartphone className="h-4 w-4 text-primary" />
          <span>Install PWA</span>
        </button>
      )}

      {variant === "banner" && (
        <div
          id="pwa-install-banner"
          className={`flex items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/15 via-primary/5 to-transparent p-3 sm:p-4 ${className}`}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">Get Shreni Kart App</h4>
              <p className="text-xs text-muted-foreground">
                Install on your phone or computer for instant access & offline capability.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleInstallClick}
            className="shrink-0 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow transition hover:bg-primary/90 active:scale-95"
          >
            Install
          </button>
        </div>
      )}

      {/* Installation Helper Modal (for iOS or browsers requiring guidance) */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Smartphone className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Install Shreni Kart</h3>
                <p className="text-xs text-muted-foreground">Progressive Web Application (PWA)</p>
              </div>
            </div>

            {isIOS ? (
              <div className="space-y-3.5 text-sm text-foreground/90">
                <p className="text-xs text-muted-foreground">
                  Follow these simple steps on iPhone / iPad Safari to install:
                </p>
                <div className="flex items-start gap-3 rounded-xl bg-muted/60 p-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-primary font-bold text-xs">
                    1
                  </div>
                  <p className="text-xs leading-relaxed">
                    Tap the <strong className="text-primary font-semibold">Share</strong> button{" "}
                    <Share className="inline h-3.5 w-3.5 mx-0.5 text-primary" /> in the bottom bar
                    of Safari.
                  </p>
                </div>
                <div className="flex items-start gap-3 rounded-xl bg-muted/60 p-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-primary font-bold text-xs">
                    2
                  </div>
                  <p className="text-xs leading-relaxed">
                    Scroll down and tap{" "}
                    <strong className="text-primary font-semibold">Add to Home Screen</strong>{" "}
                    <PlusSquare className="inline h-3.5 w-3.5 mx-0.5 text-primary" />.
                  </p>
                </div>
                <div className="flex items-start gap-3 rounded-xl bg-muted/60 p-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-primary font-bold text-xs">
                    3
                  </div>
                  <p className="text-xs leading-relaxed">
                    Tap <strong className="text-primary font-semibold">Add</strong> in the top right
                    corner. Shreni Kart will launch from your home screen like a native app!
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3.5 text-sm text-foreground/90">
                <p className="text-xs text-muted-foreground">
                  Install Shreni Kart directly to your home screen or desktop:
                </p>
                <div className="flex items-start gap-3 rounded-xl bg-muted/60 p-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-primary font-bold text-xs">
                    1
                  </div>
                  <p className="text-xs leading-relaxed">
                    On Chrome or Edge, click the <strong className="text-primary">Install</strong>{" "}
                    icon in the address bar (or browser menu ⋮ &gt;{" "}
                    <span className="font-semibold">Install App</span>).
                  </p>
                </div>
                <div className="flex items-start gap-3 rounded-xl bg-muted/60 p-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-primary font-bold text-xs">
                    2
                  </div>
                  <p className="text-xs leading-relaxed">
                    On Android, tap the three dots <span className="font-bold">⋮</span> in Chrome
                    and choose <span className="font-semibold text-primary">Install app</span> or{" "}
                    <span className="font-semibold text-primary">Add to Home screen</span>.
                  </p>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="mt-5 w-full rounded-xl bg-secondary py-2.5 text-xs font-semibold text-secondary-foreground transition hover:bg-secondary/80"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
