import { useState, useEffect } from "react";
import { WifiOff, RefreshCw, X } from "lucide-react";
import { useOnlineStatus } from "@/lib/useOnlineStatus";

export function OfflineIndicator() {
  const [isMounted, setIsMounted] = useState(false);
  const { isOnline, isChecking, checkNow } = useOnlineStatus();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // If status returns to online, reset dismissal so future real outages will show
  useEffect(() => {
    if (isOnline) {
      setDismissed(false);
    }
  }, [isOnline]);

  if (!isMounted || isOnline || dismissed) return null;

  return (
    <div
      id="pwa-offline-indicator"
      className="fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-sm flex items-center justify-between gap-3 rounded-xl border border-amber-600/40 bg-amber-950/95 px-3.5 py-2.5 text-xs font-medium text-amber-100 shadow-xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-3"
      role="status"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400" />
        </span>
        <WifiOff className="h-4 w-4 shrink-0 text-amber-300" />
        <div className="truncate">
          <p className="font-semibold text-white leading-tight">You're Offline</p>
          <p className="text-[11px] text-amber-200/80 truncate">
            Cached catalog remains accessible.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() => checkNow()}
          disabled={isChecking}
          className="flex items-center gap-1 rounded-lg bg-amber-800/80 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-amber-700 active:scale-95 disabled:opacity-60"
          title="Retry network connection"
        >
          <RefreshCw className={`h-3 w-3 ${isChecking ? "animate-spin" : ""}`} />
          <span>{isChecking ? "Checking…" : "Retry"}</span>
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="rounded-lg p-1 text-amber-300 hover:bg-amber-900 hover:text-white"
          aria-label="Dismiss offline banner"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
