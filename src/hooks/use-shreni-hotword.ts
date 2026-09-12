import { useEffect, useRef, useState, useCallback } from "react";
import {
  playAssistantActivationChime,
  unlockAudioContext,
  getAudioContext,
} from "@/lib/sound-effects";

// Types for Web Speech API
export interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

export interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

export interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives?: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onresult: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionErrorEvent) => void) | null;
  onend: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

interface WakeLockSentinelLike extends EventTarget {
  released: boolean;
  release: () => Promise<void>;
  onrelease?: ((this: WakeLockSentinelLike, ev: Event) => void) | null;
}

const STORAGE_KEY_ENABLED = "kalakart_shreni_voice_trigger_enabled";
const STORAGE_KEY_SOUND_WAKE = "kalakart_shreni_sound_wake_enabled";
const STORAGE_KEY_KEEP_AWAKE = "kalakart_shreni_keep_screen_awake";

// Comprehensive trigger phrases including Hindi, regional accents, and phonetic speech-to-text variations
export const TRIGGER_PATTERNS = [
  // 1. "Namaste Shreni" and phonetics (e.g. Namaste Sreni, Namaste Shrenee, Namaste Shiny, Namaste Sunny, Namaste Category)
  /(?:namaste|namasthe|namas\s*te|namaskar|namaskaram|namaskara|nomoshkar|pranam)\s+(?:shreni|sreni|shrenee|shreny|shrinie|shrani|shrene|shree|shrenik|shiny|sunny|sherry|serene|sany|saini|shreya|rainy|trainy|category|shani|shalini|shivani|shree\s*ni|shirin|shireen|shereen|shrine|ashwini|श्रेणी|शरेणी|शेरनी)/i,
  // 2. "Hey/Hello/Hi/Ok/Suno Shreni"
  /(?:hey|hello|hi|ok|okay|suno|bol|bolo)\s+(?:shreni|sreni|shrenee|shreny|shrinie|shrani|shrene|shree|shrenik|shiny|sunny|sherry|serene|sany|saini|shreya|category|shani|shalini|shivani|shirin|shireen|shereen|shrine|श्रेणी)/i,
  // 3. Reverse: "Shreni suno", "Shreni ji", "Shreni batao", "Shreni help", "श्रेणी सुनो"
  /(?:shreni|sreni|shrenee|shreny|shrene|श्रेणी)\s+(?:suno|ji|batao|kaho|madad|help|assist|kya|bataiye)/i,
  // 4. Standalone direct "Namaste Shreni" or "Shreni"
  /\b(?:namaste\s+shreni|hey\s+shreni|hello\s+shreni|suno\s+shreni|shreni|sreni|shrenee|श्रेणी)\b/i,
  // 5. Hindi script patterns
  /(?:नमस्ते|नमस्कार|प्रणाम)\s*(?:श्रेणी|शरेणी|शेरनी|सरणी)?/i,
];

/**
 * Robust phonetic and multi-variant matcher for "Namaste Shreni".
 */
export function matchShreniHotword(rawTranscript: string): {
  matched: boolean;
  initialQuery?: string;
} {
  if (!rawTranscript) return { matched: false };
  const lower = rawTranscript
    .toLowerCase()
    .replace(/[.,!?;:'"()[\]{}]/g, " ")
    .trim();

  // 1. Check direct regex patterns
  for (const pattern of TRIGGER_PATTERNS) {
    const m = lower.match(pattern);
    if (m) {
      const matchIndex = m.index ?? 0;
      const trailing = lower.substring(matchIndex + m[0].length).trim();
      return { matched: true, initialQuery: trailing.length > 2 ? trailing : undefined };
    }
  }

  // 2. Co-occurrence of greeting + Shreni phonetic candidate
  const hasGreeting =
    /(?:namaste|namaskar|namasthe|pranam|hello|hey|hi|ok|suno|bolo|bol|नमस्ते|नमस्कार|प्रणाम|सुनो)/i.test(
      lower,
    );
  const hasShreniName =
    /(?:shreni|sreni|shrenee|shreny|shrani|shrene|shree|shrenik|shiny|sunny|sherry|serene|sany|saini|shreya|category|shani|shalini|shivani|shirin|shireen|श्रेणी|शरेणी|शेरनी)/i.test(
      lower,
    );

  if (hasGreeting && hasShreniName) {
    const nameMatch = lower.match(
      /(?:shreni|sreni|shrenee|shreny|shrani|shrene|shree|shrenik|shiny|sunny|sherry|serene|sany|saini|shreya|category|shani|shalini|shivani|shirin|shireen|श्रेणी|शरेणी|शेरनी)/i,
    );
    const trailing = nameMatch
      ? lower.substring((nameMatch.index ?? 0) + nameMatch[0].length).trim()
      : "";
    return { matched: true, initialQuery: trailing.length > 2 ? trailing : undefined };
  }

  // 3. Standalone "Shreni"
  const standaloneMatch = lower.match(/\b(?:shreni|sreni|shrenee|shreny|श्रेणी)\b/i);
  if (standaloneMatch) {
    const trailing = lower
      .substring((standaloneMatch.index ?? 0) + standaloneMatch[0].length)
      .trim();
    return { matched: true, initialQuery: trailing.length > 2 ? trailing : undefined };
  }

  return { matched: false };
}

export type MicrophonePermissionStatus = "prompt" | "granted" | "denied" | "unsupported";

/**
 * Detect if running inside an installed Progressive Web App (PWA) / standalone mode
 */
export function isPwaStandaloneMode(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
    document.referrer.includes("android-app://") ||
    window.location.search.includes("mode=pwa")
  );
}

export interface ShreniHotwordState {
  isSupported: boolean;
  isEnabled: boolean;
  isListening: boolean;
  hasPermission: boolean | null;
  permissionStatus: MicrophonePermissionStatus;
  lastHeard: string;
  audioLevel: number;
  soundThresholdWake: boolean;
  needsGesture: boolean;
  keepScreenAwake: boolean;
  isWakeLockSupported: boolean;
  toggleEnabled: (enabled?: boolean) => Promise<void>;
  setSoundThresholdWake: (enabled: boolean) => void;
  setKeepScreenAwake: (enabled: boolean) => void;
  startListening: () => Promise<void>;
  stopListening: () => void;
  pauseHotword: () => void;
  rearmHotword: () => Promise<void>;
  requestMicrophonePermission: () => Promise<boolean>;
  triggerAssistant: (query?: string) => Promise<void>;
  testChime: () => Promise<void>;
}

export function useShreniHotword(onTrigger: (initialQuery?: string) => void): ShreniHotwordState {
  const [isEnabled, setIsEnabled] = useState<boolean>(true);
  const [soundThresholdWake, setSoundThresholdWakeState] = useState<boolean>(false);
  const [keepScreenAwake, setKeepScreenAwakeState] = useState<boolean>(true);

  // Sync initial state from localStorage after mount to prevent SSR hydration mismatch
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedEnabled = localStorage.getItem(STORAGE_KEY_ENABLED);
      if (storedEnabled !== null) {
        setIsEnabled(storedEnabled !== "false");
      }
      const storedWake = localStorage.getItem(STORAGE_KEY_SOUND_WAKE);
      if (storedWake !== null) {
        setSoundThresholdWakeState(storedWake === "true");
      }
      const storedKeepAwake = localStorage.getItem(STORAGE_KEY_KEEP_AWAKE);
      if (storedKeepAwake !== null) {
        setKeepScreenAwakeState(storedKeepAwake !== "false");
      }
    }
  }, []);

  const [isListening, setIsListening] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<MicrophonePermissionStatus>("prompt");
  const [isSupported, setIsSupported] = useState(true);
  const [lastHeard, setLastHeard] = useState("");
  const [audioLevel, setAudioLevel] = useState(0);
  const [needsGesture, setNeedsGesture] = useState(false);
  const needsGestureRef = useRef(false);

  const isListeningRef = useRef(false);
  const isStartingRef = useRef(false);

  const keepScreenAwakeRef = useRef(true);
  const wakeLockSentinelRef = useRef<WakeLockSentinelLike | null>(null);
  const isWakeLockAcquiringRef = useRef(false);
  const isWakeLockSupported = typeof navigator !== "undefined" && "wakeLock" in navigator;

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const restartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isEnabledRef = useRef(isEnabled);
  const soundThresholdWakeRef = useRef(soundThresholdWake);
  const isPausedForAssistantRef = useRef(false);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioMeterAnimRef = useRef<number | null>(null);
  const hasPermissionRef = useRef<boolean | null>(null);
  const lastSoundTriggerTimeRef = useRef<number>(0);
  const consecutiveErrorsRef = useRef<number>(0);
  const audioDecayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    needsGestureRef.current = needsGesture;
  }, [needsGesture]);

  useEffect(() => {
    isEnabledRef.current = isEnabled;
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_ENABLED, String(isEnabled));
    }
  }, [isEnabled]);

  useEffect(() => {
    soundThresholdWakeRef.current = soundThresholdWake;
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_SOUND_WAKE, String(soundThresholdWake));
    }
  }, [soundThresholdWake]);

  const setSoundThresholdWake = useCallback((enabled: boolean) => {
    setSoundThresholdWakeState(enabled);
  }, []);

  useEffect(() => {
    keepScreenAwakeRef.current = keepScreenAwake;
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_KEEP_AWAKE, String(keepScreenAwake));
    }
  }, [keepScreenAwake]);

  const setKeepScreenAwake = useCallback((enabled: boolean) => {
    setKeepScreenAwakeState(enabled);
  }, []);

  // Screen Wake Lock API management: Keeps phone from sleeping while voice trigger is active
  const releaseWakeLock = useCallback(async () => {
    if (wakeLockSentinelRef.current) {
      const sentinel = wakeLockSentinelRef.current;
      wakeLockSentinelRef.current = null;
      try {
        if (!sentinel.released) {
          await sentinel.release();
          console.log("[Shreni Hotword] Screen Wake Lock cleanly released.");
        }
      } catch (err) {
        console.debug("[Shreni Hotword] Wake Lock release notice:", err);
      }
    }
  }, []);

  const acquireWakeLock = useCallback(async () => {
    if (typeof window === "undefined" || typeof document === "undefined") return;
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) {
      return;
    }
    // Only acquire if keepScreenAwake is enabled, hotword is enabled, and permission is granted
    if (!keepScreenAwakeRef.current || !isEnabledRef.current || hasPermissionRef.current !== true) {
      return;
    }
    // Avoid redundant requests if existing lock is active
    if (wakeLockSentinelRef.current && !wakeLockSentinelRef.current.released) {
      return;
    }
    if (isWakeLockAcquiringRef.current) return;

    try {
      isWakeLockAcquiringRef.current = true;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sentinel = await (navigator as any).wakeLock.request("screen");
      wakeLockSentinelRef.current = sentinel;
      console.log("[Shreni Hotword] Screen Wake Lock successfully acquired.");

      sentinel.addEventListener("release", () => {
        console.log("[Shreni Hotword] Screen Wake Lock was released.");
        if (wakeLockSentinelRef.current === sentinel) {
          wakeLockSentinelRef.current = null;
        }
      });
    } catch (err) {
      // Degrade gracefully: can fail if screen is off, battery saver active, or tab hidden
      console.debug("[Shreni Hotword] Screen Wake Lock acquisition notice:", err);
    } finally {
      isWakeLockAcquiringRef.current = false;
    }
  }, []);

  // Synchronize Wake Lock state whenever configuration or permission changes
  useEffect(() => {
    if (keepScreenAwake && isEnabled && hasPermission === true) {
      void acquireWakeLock();
    } else {
      void releaseWakeLock();
    }
  }, [keepScreenAwake, isEnabled, hasPermission, acquireWakeLock, releaseWakeLock]);

  useEffect(() => {
    hasPermissionRef.current = hasPermission;
  }, [hasPermission]);

  // Clean trigger helper with sound chime
  const triggerAssistant = useCallback(
    async (query?: string) => {
      console.log("[Shreni Hotword] Triggered with initial query:", query);
      void unlockAudioContext();
      isPausedForAssistantRef.current = true;
      isStartingRef.current = false;
      isListeningRef.current = false;
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
        restartTimeoutRef.current = null;
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onend = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current.onresult = null;
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
        recognitionRef.current = null;
      }
      setIsListening(false);
      onTrigger(query);
    },
    [onTrigger],
  );

  const testChime = useCallback(async () => {
    await unlockAudioContext();
    await playAssistantActivationChime();
  }, []);

  // Audio level decay helper
  const pulseAudioMeter = useCallback((level: number) => {
    setAudioLevel(level);
    if (audioDecayTimerRef.current) clearTimeout(audioDecayTimerRef.current);
    audioDecayTimerRef.current = setTimeout(() => {
      setAudioLevel(0);
    }, 600);
  }, []);

  // Continuous speech recognition session runner
  const startRecognitionSession = useCallback(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      setIsSupported(false);
      return;
    }

    setIsSupported(true);

    if (isPausedForAssistantRef.current) {
      return;
    }

    // Prevent duplicate recognition instances from spawning concurrently
    if (isListeningRef.current || isStartingRef.current) {
      console.log(
        "[Shreni Hotword] Speech recognition already listening or starting; ignoring duplicate start.",
      );
      return;
    }

    // Stop any existing instance cleanly before initiating a fresh session
    if (recognitionRef.current) {
      const prevRec = recognitionRef.current;
      recognitionRef.current = null;
      try {
        prevRec.onstart = null;
        prevRec.onend = null;
        prevRec.onerror = null;
        prevRec.onresult = null;
        prevRec.abort();
      } catch {
        // ignore
      }
    }

    try {
      const rec = new SpeechRecognitionClass();
      recognitionRef.current = rec;
      isStartingRef.current = true;
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-IN"; // Mixed Indian English & Hindi support
      if ("maxAlternatives" in rec) {
        rec.maxAlternatives = 3;
      }

      rec.onstart = () => {
        if (recognitionRef.current !== rec) return;
        isStartingRef.current = false;
        isListeningRef.current = true;
        setIsListening(true);
        setHasPermission(true);
        hasPermissionRef.current = true;
        setPermissionStatus("granted");
        setNeedsGesture(false);
        needsGestureRef.current = false;
        consecutiveErrorsRef.current = 0;
      };

      rec.onresult = (event: SpeechRecognitionEvent) => {
        if (recognitionRef.current !== rec || isPausedForAssistantRef.current) return;

        // Visual feedback: user is speaking
        pulseAudioMeter(65);

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i];
          if (!item) continue;

          // Check all alternatives provided by Google Speech recognition
          for (let alt = 0; alt < item.length; alt++) {
            const alternative = item[alt];
            if (!alternative || !alternative.transcript) continue;

            const transcript = alternative.transcript.trim();
            setLastHeard(transcript);

            const match = matchShreniHotword(transcript);
            if (match.matched) {
              pulseAudioMeter(95);
              void triggerAssistant(match.initialQuery);
              return;
            }
          }
        }
      };

      rec.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (recognitionRef.current !== rec) return;
        isStartingRef.current = false;
        consecutiveErrorsRef.current += 1;

        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          // If microphone permission was already granted, transient not-allowed should NOT permanently kill the loop
          if (hasPermissionRef.current !== true) {
            setNeedsGesture(true);
            needsGestureRef.current = true;
            isListeningRef.current = false;
            setIsListening(false);
            consecutiveErrorsRef.current = 5;
          } else {
            console.debug("[Shreni Hotword] Transient not-allowed event while permission granted.");
          }
        } else if (event.error === "audio-capture") {
          console.debug(
            "[Shreni Hotword] Microphone audio-capture contention; retrying speech recognition.",
          );
        } else if (event.error !== "no-speech") {
          console.debug("[Shreni Hotword] Background event:", event.error);
        }
      };

      rec.onend = () => {
        if (recognitionRef.current !== rec) return;
        isStartingRef.current = false;
        isListeningRef.current = false;
        setIsListening(false);
        recognitionRef.current = null;

        // Resilient automatic restart
        // If hotword is enabled and not paused for active assistant, keep the loop alive
        if (
          isEnabledRef.current &&
          !isPausedForAssistantRef.current &&
          hasPermissionRef.current !== false &&
          (!needsGestureRef.current || hasPermissionRef.current === true)
        ) {
          if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);

          // Exponential backoff capped at 1.2s
          const delay = consecutiveErrorsRef.current > 3 ? 1200 : 250;
          restartTimeoutRef.current = setTimeout(() => {
            if (
              isEnabledRef.current &&
              !isPausedForAssistantRef.current &&
              hasPermissionRef.current !== false &&
              !isListeningRef.current &&
              !isStartingRef.current
            ) {
              startRecognitionSession();
            }
          }, delay);
        }
      };

      rec.start();
    } catch (e) {
      console.debug("Speech recognition start notice:", e);
      isStartingRef.current = false;
      isListeningRef.current = false;
      setIsListening(false);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onstart = null;
          recognitionRef.current.onend = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current.onresult = null;
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
        recognitionRef.current = null;
      }
      if (
        isEnabledRef.current &&
        !isPausedForAssistantRef.current &&
        hasPermissionRef.current !== false
      ) {
        if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
        restartTimeoutRef.current = setTimeout(() => {
          if (
            isEnabledRef.current &&
            !isPausedForAssistantRef.current &&
            hasPermissionRef.current !== false &&
            !isListeningRef.current &&
            !isStartingRef.current
          ) {
            startRecognitionSession();
          }
        }, 400);
      }
    }
  }, [pulseAudioMeter, triggerAssistant]);

  // Request explicit mic permission on user gesture (click/tap)
  const requestMicrophonePermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setIsSupported(false);
      setPermissionStatus("unsupported");
      return false;
    }

    try {
      await unlockAudioContext();

      // Request userMedia to prompt the native browser microphone dialog
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      setHasPermission(true);
      hasPermissionRef.current = true;
      setPermissionStatus("granted");
      setNeedsGesture(false);

      // CRITICAL FOR MOBILE PWA: Stop getUserMedia stream tracks immediately!
      // Keeping getUserMedia tracks active locks the hardware microphone on mobile devices
      // and causes webkitSpeechRecognition to fail with audio-capture errors.
      if (!soundThresholdWakeRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        micStreamRef.current = null;
      } else {
        micStreamRef.current = stream;
      }

      // Play signature activation chime
      void playAssistantActivationChime();

      // Start the unblocked speech recognition session
      startRecognitionSession();

      return true;
    } catch (err: unknown) {
      console.warn("Microphone permission was not granted or error:", err);
      const isDenied =
        err &&
        typeof err === "object" &&
        ("name" in err
          ? (err as { name: string }).name === "NotAllowedError" ||
            (err as { name: string }).name === "PermissionDeniedError"
          : false);

      if (isDenied) {
        setHasPermission(false);
        hasPermissionRef.current = false;
        setPermissionStatus("denied");
      } else {
        setPermissionStatus("prompt");
      }
      return false;
    }
  }, [startRecognitionSession]);

  // Check initial browser permission status if Permissions API is available
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!navigator.mediaDevices?.getUserMedia) {
      setIsSupported(false);
      setPermissionStatus("unsupported");
      return;
    }

    if (navigator.permissions && navigator.permissions.query) {
      try {
        navigator.permissions
          .query({ name: "microphone" as PermissionName })
          .then((status) => {
            if (status.state === "granted") {
              setHasPermission(true);
              hasPermissionRef.current = true;
              setPermissionStatus("granted");
              startRecognitionSession();
            } else if (status.state === "denied") {
              setHasPermission(false);
              hasPermissionRef.current = false;
              setPermissionStatus("denied");
            } else {
              setPermissionStatus("prompt");
            }

            status.onchange = () => {
              if (status.state === "granted") {
                setHasPermission(true);
                hasPermissionRef.current = true;
                setPermissionStatus("granted");
                startRecognitionSession();
              } else if (status.state === "denied") {
                setHasPermission(false);
                hasPermissionRef.current = false;
                setPermissionStatus("denied");
              }
            };
          })
          .catch(() => {
            setPermissionStatus("prompt");
          });
      } catch {
        setPermissionStatus("prompt");
      }
    } else {
      setPermissionStatus("prompt");
    }

    // PWA & Mobile User-Gesture Re-arming:
    // On installed PWAs and mobile browsers, background speech recognition requires a user gesture.
    // As soon as the user taps anywhere on the screen (scrolling, clicking), re-arm the listener.
    const handleUserInteraction = () => {
      void unlockAudioContext();
      if (needsGestureRef.current) {
        needsGestureRef.current = false;
        setNeedsGesture(false);
        consecutiveErrorsRef.current = 0;
      }
      if (
        isEnabledRef.current &&
        !isPausedForAssistantRef.current &&
        hasPermissionRef.current !== false &&
        !recognitionRef.current &&
        !isListeningRef.current &&
        !isStartingRef.current
      ) {
        startRecognitionSession();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void unlockAudioContext();

        // Lifecycle Management: Automatically re-acquire Wake Lock when foregrounded
        if (
          keepScreenAwakeRef.current &&
          isEnabledRef.current &&
          hasPermissionRef.current === true
        ) {
          void acquireWakeLock();
        }

        // Gracefully restart speech recognition session loop
        if (
          isEnabledRef.current &&
          !isPausedForAssistantRef.current &&
          hasPermissionRef.current !== false
        ) {
          if (!isListeningRef.current && !isStartingRef.current) {
            if (recognitionRef.current) {
              try {
                recognitionRef.current.onstart = null;
                recognitionRef.current.onend = null;
                recognitionRef.current.onerror = null;
                recognitionRef.current.onresult = null;
                recognitionRef.current.abort();
              } catch {
                // ignore
              }
              recognitionRef.current = null;
            }
            startRecognitionSession();
          }
        }
      }
    };

    window.addEventListener("pointerdown", handleUserInteraction, { passive: true });
    window.addEventListener("touchstart", handleUserInteraction, { passive: true });
    window.addEventListener("click", handleUserInteraction, { passive: true });
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      void releaseWakeLock();
      if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
      if (audioDecayTimerRef.current) clearTimeout(audioDecayTimerRef.current);
      window.removeEventListener("pointerdown", handleUserInteraction);
      window.removeEventListener("touchstart", handleUserInteraction);
      window.removeEventListener("click", handleUserInteraction);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((t) => t.stop());
        micStreamRef.current = null;
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onstart = null;
          recognitionRef.current.onend = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current.onresult = null;
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
        recognitionRef.current = null;
      }
      isStartingRef.current = false;
      isListeningRef.current = false;
    };
  }, [acquireWakeLock, releaseWakeLock, startRecognitionSession]);

  // Pause background hotword while assistant overlay dialog is open
  const pauseHotword = useCallback(() => {
    console.log("[Shreni Hotword] Pausing background hotword recognition.");
    isPausedForAssistantRef.current = true;
    isStartingRef.current = false;
    isListeningRef.current = false;
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
    if (recognitionRef.current) {
      const rec = recognitionRef.current;
      recognitionRef.current = null;
      try {
        rec.onstart = null;
        rec.onend = null;
        rec.onerror = null;
        rec.onresult = null;
        rec.abort();
      } catch {
        // ignore
      }
    }
    setIsListening(false);
  }, []);

  // Robustly re-arm background hotword listener loop after overlay closes
  const rearmHotword = useCallback(async () => {
    console.log("[Shreni Hotword] Re-arming background hotword recognition loop.");
    void unlockAudioContext();
    isPausedForAssistantRef.current = false;
    isStartingRef.current = false;
    isListeningRef.current = false;
    needsGestureRef.current = false;
    setNeedsGesture(false);
    consecutiveErrorsRef.current = 0;

    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }

    if (!isEnabledRef.current) {
      return;
    }

    if (hasPermissionRef.current !== true) {
      await requestMicrophonePermission();
    } else {
      // 250ms buffer ensures microphone hardware audio-capture tracks are completely released
      setTimeout(() => {
        if (
          !isPausedForAssistantRef.current &&
          isEnabledRef.current &&
          !isListeningRef.current &&
          !isStartingRef.current
        ) {
          startRecognitionSession();
        }
      }, 250);
    }
  }, [requestMicrophonePermission, startRecognitionSession]);

  const startListening = useCallback(async () => {
    setIsEnabled(true);
    await rearmHotword();
  }, [rearmHotword]);

  const stopListening = useCallback(() => {
    pauseHotword();
    setIsEnabled(false);
    void releaseWakeLock();
  }, [pauseHotword, releaseWakeLock]);

  const toggleEnabled = useCallback(
    async (forceVal?: boolean) => {
      const next = typeof forceVal === "boolean" ? forceVal : !isEnabledRef.current;
      setIsEnabled(next);

      if (!next) {
        stopListening();
      } else {
        await startListening();
      }
    },
    [startListening, stopListening],
  );

  return {
    isSupported,
    isEnabled,
    isListening,
    hasPermission,
    permissionStatus,
    lastHeard,
    audioLevel,
    soundThresholdWake,
    needsGesture,
    keepScreenAwake,
    isWakeLockSupported,
    setSoundThresholdWake,
    setKeepScreenAwake,
    toggleEnabled,
    startListening,
    stopListening,
    pauseHotword,
    rearmHotword,
    requestMicrophonePermission,
    triggerAssistant,
    testChime,
  };
}
