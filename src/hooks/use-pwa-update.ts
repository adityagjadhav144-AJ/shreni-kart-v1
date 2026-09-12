import { useEffect } from "react";
import { registerSW } from "virtual:pwa-register";

/**
 * usePWAUpdate hook
 * Automatically detects when a new Service Worker version is available
 * and triggers a page reload so users immediately get updated scripts and fixes.
 */
export function usePWAUpdate() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        console.log("[PWA] New service worker version detected. Reloading page...");
        // Calling updateSW(true) tells the new service worker to skipWaiting and reloads the window
        void updateSW(true);
      },
      onOfflineReady() {
        console.log("[PWA] App is ready to work offline.");
      },
      onRegisteredSW(swUrl, registration) {
        console.log("[PWA] Service worker registered successfully:", swUrl);
        // Periodically check for updates every 15 minutes when online
        if (registration) {
          const intervalId = setInterval(
            () => {
              if (navigator.onLine) {
                void registration.update();
              }
            },
            15 * 60 * 1000,
          );

          return () => clearInterval(intervalId);
        }
      },
    });
  }, []);
}
