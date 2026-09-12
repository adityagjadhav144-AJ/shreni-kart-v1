import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Mic,
  MicOff,
  Send,
  Sparkles,
  Volume2,
  VolumeX,
  X,
  ArrowRight,
  Settings2,
  CheckCircle2,
  Globe,
  PackageCheck,
  PlusCircle,
  Share2,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { GoogleTranslateSelector } from "@/components/ui/GoogleTranslateSelector";
import {
  useShreniHotword,
  type SpeechRecognitionInstance,
  type SpeechRecognitionEvent,
  type SpeechRecognitionErrorEvent,
} from "@/hooks/use-shreni-hotword";
import { askShreniAi, type ShreniResponse, type ShreniAction } from "@/lib/shreni-ai.functions";
import { resolveShreniIntent } from "@/lib/shreni-intent-engine";
import { executeShreniAction } from "@/lib/shreni-app-controller";
import {
  playAssistantActivationChime,
  playAssistantCloseChime,
  playMicBeep,
  speakWithShreniVoice,
  getFixedShreniVoice,
  stopSpeaking,
  unlockAudioContext,
} from "@/lib/sound-effects";

interface ShreniDialogMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  actions?: ShreniAction[];
  action?: ShreniAction;
  timestamp: Date;
}

const QUICK_PROMPTS = [
  "Change language to Hindi (हिन्दी)",
  "Open my orders and shipments",
  "Add a Terracotta Pot for ₹750",
  "Mark my order as Shipped",
  "How do I complete artisan e-KYC?",
  "Share my storefront link",
];

export function ShreniAssistantOverlay() {
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const artisanId = user?.uid || session?.user?.id || "";
  const artisanName = user?.displayName || session?.user?.name || "Artisan";

  const [isMounted, setIsMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isSpeakingOutLoud, setIsSpeakingOutLoud] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [inputText, setInputText] = useState("");
  const [isQueryLoading, setIsQueryLoading] = useState(false);
  const [isListeningInput, setIsListeningInput] = useState(false);
  const [liveTranscription, setLiveTranscription] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [pauseSecondsLeft, setPauseSecondsLeft] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isPermissionBannerDismissed, setIsPermissionBannerDismissed] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [messages, setMessages] = useState<ShreniDialogMessage[]>([
    {
      id: "initial-greeting",
      role: "assistant",
      content:
        "Namaste! I am Shreni AI with FULL APP CONTROL. Speak or ask me to change languages, open orders, list new crafts, update shipments, or manage your storefront.",
      timestamp: new Date(0),
    },
  ]);

  const activeRecognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pauseCountdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const liveTranscriptionRef = useRef("");
  const finalTranscriptRef = useRef("");
  const isListeningInputRef = useRef(false);
  const isStartingActiveRef = useRef(false);
  const isFinalizingRef = useRef(false);
  const isOpenRef = useRef(isOpen);
  const startActiveListeningRef = useRef<() => void>(() => {});
  const stopActiveListeningRef = useRef<() => void>(() => {});
  const closeAssistantRef = useRef<() => void>(() => {});

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  // Clear timers helper
  const clearPauseTimers = useCallback(() => {
    if (pauseTimerRef.current) {
      clearTimeout(pauseTimerRef.current);
      pauseTimerRef.current = null;
    }
    if (pauseCountdownIntervalRef.current) {
      clearInterval(pauseCountdownIntervalRef.current);
      pauseCountdownIntervalRef.current = null;
    }
    setPauseSecondsLeft(null);
  }, []);

  // Stop active listening cleanly and clear all listeners
  const stopActiveListening = useCallback(() => {
    isStartingActiveRef.current = false;
    clearPauseTimers();
    if (activeRecognitionRef.current) {
      const rec = activeRecognitionRef.current;
      activeRecognitionRef.current = null;
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
    isListeningInputRef.current = false;
    setIsListeningInput(false);
    setLiveTranscription("");
    liveTranscriptionRef.current = "";
    setFinalTranscript("");
    finalTranscriptRef.current = "";
    setInterimTranscript("");
    setPauseSecondsLeft(null);
  }, [clearPauseTimers]);

  useEffect(() => {
    stopActiveListeningRef.current = stopActiveListening;
  }, [stopActiveListening]);

  // Send user query to Shreni AI backend
  const handleUserQuery = useCallback(
    async (queryText: string) => {
      const trimmed = queryText.trim();
      if (!trimmed) return;

      // Stop speech synthesis if already speaking
      stopSpeaking();
      setIsSpeakingOutLoud(false);

      // Add user message
      const userMsg: ShreniDialogMessage = {
        id: "usr-" + Date.now(),
        role: "user",
        content: trimmed,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setInputText("");
      setLiveTranscription("");
      liveTranscriptionRef.current = "";
      setFinalTranscript("");
      finalTranscriptRef.current = "";
      setInterimTranscript("");
      setIsQueryLoading(true);

      // 1. Resolve localized deterministic intent immediately
      const localResolution = resolveShreniIntent(trimmed);
      let res: ShreniResponse;

      const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
      const isDirectAction =
        localResolution.actions.length > 0 &&
        localResolution.actions[0].type !== "none" &&
        [
          "navigate",
          "change_language",
          "update_order_status",
          "create_product",
          "toggle_tts",
          "test_sound",
        ].includes(localResolution.actions[0].type);

      if (isOffline) {
        console.log("[Shreni PWA Voice] Offline mode active: executing local intent directly.");
        res = localResolution;
      } else {
        try {
          // 2. Query server/Gemini with a responsive timeout (1.8s for direct intents, 3.5s for conversational)
          const timeoutMs = isDirectAction ? 1800 : 3500;
          const serverPromise = askShreniAi({ data: { message: trimmed } });
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Timeout")), timeoutMs),
          );
          const serverRes = await Promise.race([serverPromise, timeoutPromise]);

          const serverActions =
            Array.isArray(serverRes.actions) && serverRes.actions.length > 0
              ? serverRes.actions
              : serverRes.action && serverRes.action.type !== "none"
                ? [serverRes.action]
                : [];

          // If localResolution matched deterministic actionable intent (e.g. language change or navigation)
          // and server omitted actionable controls, ensure local actions are carried over!
          if (serverActions.length === 0 && localResolution.actions.length > 0) {
            res = {
              reply: serverRes.reply || localResolution.reply,
              actions: localResolution.actions,
              action: localResolution.action,
              detectedIntent: localResolution.detectedIntent,
            };
          } else {
            res = serverRes;
          }
        } catch (err) {
          console.debug("[Shreni PWA Voice] Seamlessly using localized intent engine:", err);
          res = localResolution;
        }
      }

      const allActions =
        Array.isArray(res.actions) && res.actions.length > 0
          ? res.actions
          : res.action && res.action.type !== "none"
            ? [res.action]
            : [];

      console.log(
        "[Shreni PWA Voice] Intent detected:",
        res.detectedIntent,
        "Actions:",
        allActions,
      );

      const assistantMsg: ShreniDialogMessage = {
        id: "ast-" + Date.now(),
        role: "assistant",
        content: res.reply,
        actions: allActions,
        action: res.action,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // Auto-execute actions to give Shreni AI full in-app control!
      if (allActions.length > 0) {
        for (const act of allActions) {
          if (act && act.type !== "none" && act.autoExecute !== false) {
            console.log("[Shreni PWA Voice] Auto-executing action:", act);
            try {
              await executeShreniAction(act, {
                artisanId,
                artisanName,
                navigate: ({ href, to }) => {
                  const target = href || to;
                  if (target) {
                    console.log("[Shreni PWA Voice] Navigating to:", target);
                    if (href) {
                      void navigate({ href });
                    } else if (to) {
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      void navigate({ to: to as any });
                    }
                  }
                },
                closeAssistant: () => closeAssistantRef.current(),
                setTtsEnabled: (val) => setTtsEnabled(val),
                testChime: async () => {
                  await playAssistantActivationChime();
                },
              });
            } catch (actErr) {
              console.warn("[Shreni PWA Voice] Action execution error:", actErr);
            }
          }
        }
      }

      // Speak response with fixed realistic female voice if TTS enabled
      if (ttsEnabled) {
        setIsSpeakingOutLoud(true);
        speakWithShreniVoice(res.reply, () => {
          setIsSpeakingOutLoud(false);
          // Auto-Mic Activation: immediately after AI finishes speaking, re-bind mic for natural reply
          if (isOpenRef.current) {
            setTimeout(() => {
              if (isOpenRef.current) {
                console.log(
                  "[Shreni PWA Voice] Speech synthesis turn completed: Re-binding active speech recognition.",
                );
                stopActiveListeningRef.current?.();
                void startActiveListeningRef.current?.();
              }
            }, 200);
          }
        });
      } else {
        // Auto-Mic Activation when TTS is disabled: re-bind mic shortly after message is displayed
        if (isOpenRef.current) {
          setTimeout(() => {
            if (isOpenRef.current) {
              console.log(
                "[Shreni PWA Voice] Intent execution turn completed: Re-binding active speech recognition.",
              );
              stopActiveListeningRef.current?.();
              void startActiveListeningRef.current?.();
            }
          }, 250);
        }
      }

      setIsQueryLoading(false);
    },
    [artisanId, artisanName, navigate, ttsEnabled],
  );

  // Commit and send user's voice statement after pause or on speech completion
  const commitAndSendVoiceInput = useCallback(() => {
    if (isFinalizingRef.current) return;
    isFinalizingRef.current = true;
    clearPauseTimers();

    const queryToSend = liveTranscriptionRef.current.trim();
    stopActiveListening();

    setLiveTranscription("");
    liveTranscriptionRef.current = "";
    setFinalTranscript("");
    finalTranscriptRef.current = "";
    setInterimTranscript("");
    setPauseSecondsLeft(null);

    if (queryToSend.length > 0) {
      console.log("[Shreni PWA Voice] Committing voice command:", queryToSend);
      toast.info(`🎙️ Command: "${queryToSend}"`, { id: "shreni-voice-cmd", duration: 2500 });
      void handleUserQuery(queryToSend);
    }
    setTimeout(() => {
      isFinalizingRef.current = false;
    }, 400);
  }, [clearPauseTimers, handleUserQuery, stopActiveListening]);

  // Handle continuous active speech recognition with PWA standalone lifecycle & fast finalization
  const startActiveListening = useCallback(async () => {
    if (typeof window === "undefined") return;
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      toast.info("Microphone not supported in this browser. You can type your question.");
      return;
    }

    // Prevent duplicate recognition instances from spawning concurrently
    if (isListeningInputRef.current || isStartingActiveRef.current) {
      console.log(
        "[Shreni PWA Voice] Active speech recognition already listening or starting; ignoring duplicate start.",
      );
      return;
    }

    isStartingActiveRef.current = true;

    try {
      // 1. Resume AudioContext without blocking for PWA standalone webview
      void unlockAudioContext();
      stopSpeaking();
      setIsSpeakingOutLoud(false);
      clearPauseTimers();
      isFinalizingRef.current = false;

      // 2. Safely tear down any prior active recognition instance
      if (activeRecognitionRef.current) {
        const prevRec = activeRecognitionRef.current;
        activeRecognitionRef.current = null;
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

      const rec = new SpeechRecognitionClass();
      activeRecognitionRef.current = rec;
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-IN";

      rec.onstart = () => {
        if (activeRecognitionRef.current !== rec) return;
        isStartingActiveRef.current = false;
        console.log("[Shreni PWA Voice] Active speech recognition started.");
        setIsListeningInput(true);
        isListeningInputRef.current = true;
        setLiveTranscription("");
        liveTranscriptionRef.current = "";
        setFinalTranscript("");
        finalTranscriptRef.current = "";
        setInterimTranscript("");
        setPauseSecondsLeft(null);
        void playMicBeep("start");
      };

      rec.onresult = (e: SpeechRecognitionEvent) => {
        if (activeRecognitionRef.current !== rec) return;
        if (!isListeningInputRef.current || isFinalizingRef.current) return;

        // User spoke or resumed speaking: clear pending commit timers
        clearPauseTimers();

        let newFinalText = "";
        let currentInterim = "";
        let hasFinalResult = false;

        // Pitfall 2: Loop from e.resultIndex instead of 0 to avoid re-processing old results
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const resItem = e.results[i];
          if (!resItem || !resItem[0]) continue;

          const piece = resItem[0].transcript;

          // Pitfall 1: Properly separate interim guesses from final transcripts
          if (resItem.isFinal) {
            newFinalText += piece + " ";
            hasFinalResult = true;
          } else {
            currentInterim += piece + " ";
          }
        }

        const trimmedNewFinal = newFinalText.trim();
        const trimmedInterim = currentInterim.trim();

        // Pitfall 3: React State Closures - use functional state updates
        if (trimmedNewFinal) {
          setFinalTranscript((prevFinal) => {
            const updatedFinal = (
              prevFinal ? `${prevFinal} ${trimmedNewFinal}` : trimmedNewFinal
            ).trim();
            finalTranscriptRef.current = updatedFinal;

            const fullCombined = (
              trimmedInterim ? `${updatedFinal} ${trimmedInterim}` : updatedFinal
            ).trim();
            setLiveTranscription(fullCombined);
            liveTranscriptionRef.current = fullCombined;
            return updatedFinal;
          });
        } else {
          // Interim hypothesis update against accumulated final text
          const currentFinal = finalTranscriptRef.current;
          const fullCombined = (
            currentFinal ? `${currentFinal} ${trimmedInterim}` : trimmedInterim
          ).trim();
          setLiveTranscription(fullCombined);
          liveTranscriptionRef.current = fullCombined;
        }

        setInterimTranscript(trimmedInterim);

        const fullSpoken = liveTranscriptionRef.current;

        console.log("[Shreni PWA Voice] onresult:", {
          newFinal: trimmedNewFinal,
          interim: trimmedInterim,
          fullSpoken,
          isFinal: hasFinalResult,
        });

        if (fullSpoken.length > 0) {
          // If the speech engine marked this result as final, finalize with a short 550ms debounce
          if (hasFinalResult) {
            setPauseSecondsLeft(1);
            pauseTimerRef.current = setTimeout(() => {
              console.log("[Shreni PWA Voice] Committing final voice transcript:", fullSpoken);
              commitAndSendVoiceInput();
            }, 550);
          } else {
            // Interim results: run 3-second continuous pause detector
            let secondsCountdown = 3;
            setPauseSecondsLeft(3);

            pauseCountdownIntervalRef.current = setInterval(() => {
              secondsCountdown -= 1;
              if (secondsCountdown > 0) {
                setPauseSecondsLeft(secondsCountdown);
              } else {
                if (pauseCountdownIntervalRef.current) {
                  clearInterval(pauseCountdownIntervalRef.current);
                  pauseCountdownIntervalRef.current = null;
                }
              }
            }, 1000);

            pauseTimerRef.current = setTimeout(() => {
              console.log("[Shreni PWA Voice] 3-second pause elapsed, committing:", fullSpoken);
              commitAndSendVoiceInput();
            }, 2800);
          }
        }
      };

      rec.onerror = (e: SpeechRecognitionErrorEvent) => {
        if (activeRecognitionRef.current !== rec) return;
        isStartingActiveRef.current = false;
        console.warn("[Shreni PWA Voice] Active speech error:", e.error);
        if (e.error === "not-allowed" || e.error === "service-not-allowed") {
          toast.error("Microphone permission required. Tap the microphone to grant.", {
            id: "shreni-active-mic-perm",
          });
          setIsListeningInput(false);
          isListeningInputRef.current = false;
        } else if (e.error === "audio-capture") {
          console.debug(
            "[Shreni PWA Voice] Microphone audio-capture contention; retrying in 350ms.",
          );
          setTimeout(() => {
            if (isOpen && isListeningInputRef.current && !isFinalizingRef.current) {
              stopActiveListeningRef.current?.();
              void startActiveListening();
            }
          }, 350);
        } else if (e.error === "no-speech") {
          // If user stopped speaking, check if we have any captured speech to commit
          const pending = liveTranscriptionRef.current.trim();
          if (pending.length > 0 && !isFinalizingRef.current) {
            commitAndSendVoiceInput();
          }
        }
      };

      rec.onend = () => {
        if (activeRecognitionRef.current !== rec) return;
        isStartingActiveRef.current = false;
        activeRecognitionRef.current = null;
        console.log(
          "[Shreni PWA Voice] Active speech onend. Pending text:",
          liveTranscriptionRef.current,
        );
        // CRITICAL PWA LIFECYCLE FIX:
        // When speech recognition ends, if we have captured any spoken transcription, commit it immediately!
        const pending = liveTranscriptionRef.current.trim();
        if (pending.length > 0 && !isFinalizingRef.current) {
          commitAndSendVoiceInput();
          return;
        }

        // If no speech was captured, reset listening state so the user can tap mic again
        if (isListeningInputRef.current && !isFinalizingRef.current) {
          setIsListeningInput(false);
          isListeningInputRef.current = false;
        }
      };

      rec.start();
    } catch (err) {
      console.warn("[Shreni PWA Voice] Failed to start active speech recognition:", err);
      isStartingActiveRef.current = false;
      setIsListeningInput(false);
      isListeningInputRef.current = false;
    }
  }, [clearPauseTimers, commitAndSendVoiceInput, isOpen]);

  useEffect(() => {
    startActiveListeningRef.current = startActiveListening;
  }, [startActiveListening]);

  // Hotword listener triggered callback
  const handleHotwordTriggered = useCallback(
    async (initialQuery?: string) => {
      console.log("[Shreni PWA Voice] handleHotwordTriggered with initialQuery:", initialQuery);
      void unlockAudioContext();
      void playAssistantActivationChime();
      setIsOpen(true);
      if (initialQuery && initialQuery.trim().length > 1) {
        void handleUserQuery(initialQuery.trim());
      } else {
        // Allow 150ms buffer for microphone hardware to release before starting active listener
        setTimeout(() => {
          stopActiveListeningRef.current?.();
          void startActiveListeningRef.current?.();
        }, 150);
      }
    },
    [handleUserQuery],
  );

  // Standalone PWA / Webview Fallback:
  // Add immediate fallback click/pointer listeners to resume AudioContext and start recognition without blocking
  useEffect(() => {
    if (!isOpen) return;

    const handlePwaInteraction = (e: MouseEvent | TouchEvent | PointerEvent) => {
      // Immediately unblock AudioContext
      void unlockAudioContext();

      // If clicking interactive controls inside overlay (buttons, inputs, close btn), let them handle it
      const target = e.target as HTMLElement | null;
      if (target?.closest("button, input, textarea, a")) {
        return;
      }

      // If user tapped outside buttons when overlay is open, and Shreni is neither speaking nor listening, activate mic
      if (
        isOpenRef.current &&
        !isSpeakingOutLoud &&
        !isQueryLoading &&
        !isListeningInputRef.current &&
        !isStartingActiveRef.current &&
        !isFinalizingRef.current
      ) {
        console.log(
          "[Shreni PWA Voice] Standalone PWA tap detected: Activating active speech recognition.",
        );
        void startActiveListeningRef.current?.();
      }
    };

    window.addEventListener("pointerdown", handlePwaInteraction, { passive: true, capture: true });
    window.addEventListener("touchstart", handlePwaInteraction, { passive: true, capture: true });

    return () => {
      window.removeEventListener("pointerdown", handlePwaInteraction, { capture: true });
      window.removeEventListener("touchstart", handlePwaInteraction, { capture: true });
    };
  }, [isOpen, isSpeakingOutLoud, isQueryLoading]);

  const hotword = useShreniHotword(handleHotwordTriggered);
  const hotwordRef = useRef(hotword);
  useEffect(() => {
    hotwordRef.current = hotword;
  }, [hotword]);

  const closeAssistant = useCallback(() => {
    void playAssistantCloseChime();
    stopSpeaking();
    stopActiveListening();
    setIsSpeakingOutLoud(false);
    setLiveTranscription("");
    setPauseSecondsLeft(null);
    clearPauseTimers();
    setIsOpen(false);
  }, [clearPauseTimers, stopActiveListening]);

  useEffect(() => {
    closeAssistantRef.current = closeAssistant;
  }, [closeAssistant]);

  // Robust lifecycle synchronization: Re-arm background hotword when overlay closes
  useEffect(() => {
    if (!isOpen) {
      stopSpeaking();
      stopActiveListening();
      clearPauseTimers();
      setLiveTranscription("");
      setPauseSecondsLeft(null);

      // Hardware cooldown buffer allows mobile & PWA audio capture tracks to completely release before re-arming
      const timer = setTimeout(() => {
        if (hotwordRef.current?.isEnabled) {
          console.log(
            "[Shreni PWA Voice] Overlay closed: Re-arming background hotword listener loop.",
          );
          void hotwordRef.current.rearmHotword();
        }
      }, 350);

      return () => {
        clearTimeout(timer);
      };
    } else {
      // Pause background listener when active assistant dialog is open
      console.log("[Shreni PWA Voice] Overlay opened: Pausing background hotword listener.");
      hotwordRef.current?.pauseHotword();
    }
  }, [isOpen, clearPauseTimers, stopActiveListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSpeaking();
      stopActiveListening();
      clearPauseTimers();
      hotwordRef.current?.stopListening();
    };
  }, [clearPauseTimers, stopActiveListening]);

  if (!isMounted) {
    return null;
  }

  return (
    <>
      {/* 0. Proactive Microphone Permission Request Prompt Banner */}
      {!isOpen &&
        !isPermissionBannerDismissed &&
        hotword.hasPermission !== true &&
        hotword.isSupported && (
          <aside
            id="shreni-mic-permission-prompt"
            aria-label="Microphone permission required for sound trigger"
            className="fixed bottom-24 right-4 left-4 sm:left-auto sm:right-6 sm:w-96 z-50 rounded-2xl border border-primary/30 bg-card/95 p-4 shadow-2xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-4"
          >
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Mic className="size-5 animate-pulse text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-foreground">
                    {hotword.permissionStatus === "denied"
                      ? "Microphone Blocked by Browser"
                      : "Activate Voice & Sound Trigger"}
                  </h4>
                  <button
                    type="button"
                    id="shreni-dismiss-mic-prompt-btn"
                    onClick={() => setIsPermissionBannerDismissed(true)}
                    className="tap rounded p-1 text-muted-foreground hover:bg-muted"
                    aria-label="Dismiss permission prompt"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                {hotword.permissionStatus === "denied" ? (
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    Microphone access was blocked. To enable voice wake-up, click the camera/mic
                    permissions icon in your browser URL address bar to allow access, then click
                    Retry below.
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    Allow microphone access so Shreni can listen for{" "}
                    <span className="font-semibold text-primary">“Namaste Shreni”</span> and sound
                    commands hands-free across the app.
                  </p>
                )}

                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    id="shreni-grant-mic-permission-btn"
                    onClick={async () => {
                      const granted = await hotword.requestMicrophonePermission();
                      if (granted) {
                        toast.success(
                          "Microphone enabled! Voice trigger is listening. Say 'Namaste Shreni'!",
                        );
                        setIsPermissionBannerDismissed(true);
                      } else {
                        toast.error(
                          "Microphone access was not granted. Please check browser permissions.",
                        );
                      }
                    }}
                    className="tap inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all"
                  >
                    <Mic className="size-3.5" />
                    <span>
                      {hotword.permissionStatus === "denied"
                        ? "Retry Permission"
                        : "Allow Microphone"}
                    </span>
                  </button>

                  <button
                    type="button"
                    id="shreni-test-chime-in-prompt-btn"
                    onClick={async () => {
                      await hotword.testChime();
                      toast.success("Activation chime playing!");
                    }}
                    className="tap inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
                  >
                    <Volume2 className="size-3.5" />
                    <span>Test Chime</span>
                  </button>
                </div>
              </div>
            </div>
          </aside>
        )}

      {/* 1. Ambient Persistent Floating Hotword Pill (Visible across all screens including Login) */}
      {!isOpen && (
        <aside
          aria-label="Shreni voice assistant control"
          className="fixed bottom-20 landscape:bottom-14 right-4 z-40 flex items-center gap-2 sm:bottom-6 sm:right-6 pb-[env(safe-area-inset-bottom,0px)]"
        >
          <div
            id="shreni-voice-status-pill"
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold backdrop-blur-md shadow-card transition-all ${
              hotword.hasPermission !== true
                ? "border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:border-amber-500"
                : hotword.needsGesture
                  ? "border-amber-500/60 bg-card/95 text-amber-600 dark:text-amber-400 hover:border-amber-500 animate-pulse"
                  : hotword.isEnabled
                    ? "border-primary/40 bg-card/95 text-foreground hover:border-primary"
                    : "border-muted-foreground/30 bg-muted/90 text-muted-foreground"
            }`}
          >
            <button
              type="button"
              id="shreni-manual-trigger-btn"
              onClick={async () => {
                await unlockAudioContext();
                if (hotword.hasPermission !== true) {
                  const granted = await hotword.requestMicrophonePermission();
                  if (!granted) {
                    toast.info(
                      "Microphone not granted. You can still type your questions to Shreni.",
                    );
                  }
                }
                // Pause background hotword so microphone hardware is released for the active session
                hotword.pauseHotword();
                await playAssistantActivationChime();
                setIsOpen(true);
                setTimeout(() => {
                  void startActiveListening();
                }, 150);
              }}
              className="flex items-center gap-2 outline-none group"
              title="Click or say 'Namaste Shreni' to activate sound trigger"
            >
              <span className="relative flex size-3.5 items-center justify-center">
                {hotword.hasPermission !== true ? (
                  <span className="relative inline-flex size-2 rounded-full bg-amber-500" />
                ) : hotword.needsGesture ? (
                  <>
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-500 opacity-75" />
                    <span className="relative inline-flex size-2 rounded-full bg-amber-500" />
                  </>
                ) : hotword.isEnabled && hotword.isListening ? (
                  hotword.audioLevel > 5 ? (
                    <span className="flex items-center gap-0.5 h-3.5">
                      <span
                        className="w-0.5 rounded-full bg-emerald-500 transition-all duration-75"
                        style={{ height: `${Math.max(4, hotword.audioLevel * 0.14)}px` }}
                      />
                      <span
                        className="w-0.5 rounded-full bg-emerald-500 transition-all duration-75"
                        style={{ height: `${Math.max(6, hotword.audioLevel * 0.2)}px` }}
                      />
                      <span
                        className="w-0.5 rounded-full bg-emerald-500 transition-all duration-75"
                        style={{ height: `${Math.max(3, hotword.audioLevel * 0.12)}px` }}
                      />
                    </span>
                  ) : (
                    <>
                      <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                      <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                    </>
                  )
                ) : (
                  <span className="size-2 rounded-full bg-muted-foreground/60" />
                )}
              </span>

              <span className="font-display font-medium tracking-tight text-primary group-hover:underline">
                “Namaste Shreni”
              </span>

              <span className="hidden rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary sm:inline-block">
                {hotword.hasPermission !== true
                  ? "Allow Mic"
                  : hotword.needsGesture
                    ? "Tap to Listen"
                    : hotword.isEnabled
                      ? hotword.isListening
                        ? hotword.audioLevel > 15
                          ? "Sound Active"
                          : "Listening"
                        : "Ready"
                      : "Muted"}
              </span>
            </button>

            {/* Test Sound Trigger chime button */}
            <button
              type="button"
              id="shreni-test-sound-btn"
              onClick={async (e) => {
                e.stopPropagation();
                await hotword.testChime();
                toast.success("Sound trigger chime playing! Voice hotword: 'Namaste Shreni'");
              }}
              className="tap rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-primary"
              aria-label="Test trigger sound chime"
              title="Test trigger sound chime"
            >
              <Volume2 className="size-3.5" />
            </button>

            {/* Quick hotword toggle */}
            <button
              type="button"
              id="shreni-quick-toggle-btn"
              onClick={async (e) => {
                e.stopPropagation();
                await hotword.toggleEnabled();
                if (!hotword.isEnabled) {
                  toast.success("Voice trigger enabled: Say 'Namaste Shreni' anytime!");
                } else {
                  toast.info("Voice trigger paused.");
                }
              }}
              className="tap rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label={hotword.isEnabled ? "Disable voice trigger" : "Enable voice trigger"}
              title={hotword.isEnabled ? "Pause voice trigger" : "Resume voice trigger"}
            >
              {hotword.isEnabled ? (
                <Mic className="size-3.5 text-primary" />
              ) : (
                <MicOff className="size-3.5" />
              )}
            </button>
          </div>
        </aside>
      )}

      {/* 2. Google Assistant-style Bottom Sheet & Overlay */}
      {isOpen && (
        <div
          id="shreni-assistant-backdrop"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeAssistant();
          }}
        >
          <div
            id="shreni-assistant-sheet"
            className="relative flex max-h-[88vh] landscape:max-h-[96vh] w-full max-w-lg landscape:max-w-2xl flex-col rounded-t-[2rem] sm:rounded-t-[2.25rem] border-t border-border/80 bg-card text-card-foreground shadow-2xl animate-in slide-in-from-bottom duration-300"
          >
            {/* Google Assistant Signature Multicolor Lightbar on top edge */}
            <div className="assistant-lightbar h-1.5 landscape:h-1 w-full rounded-t-[2rem] sm:rounded-t-[2.25rem]" />

            {/* Drag handle / top bar */}
            <div className="flex items-center justify-between px-4 sm:px-5 pt-2.5 sm:pt-3 pb-2 landscape:py-1.5 border-b border-border/40">
              <div className="flex items-center gap-2.5">
                <div className="grid size-9 place-items-center rounded-2xl bg-gradient-warm text-primary-foreground shadow-sm">
                  <Sparkles className="size-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h2 className="font-display text-base font-bold tracking-tight text-foreground">
                      Shreni AI
                    </h2>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      Voice Assistant
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Trigger: <span className="font-medium text-foreground">“Namaste Shreni”</span>
                  </p>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-1">
                {/* Voice speech toggle */}
                <button
                  type="button"
                  id="shreni-tts-toggle-btn"
                  onClick={() => {
                    if (ttsEnabled) {
                      stopSpeaking();
                      setIsSpeakingOutLoud(false);
                      setTtsEnabled(false);
                      toast.info("Voice read-aloud turned off");
                    } else {
                      setTtsEnabled(true);
                      toast.success("Voice read-aloud enabled");
                    }
                  }}
                  className="tap rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
                  aria-label={ttsEnabled ? "Mute speech audio" : "Enable speech audio"}
                  title={ttsEnabled ? "Mute speech audio" : "Enable speech audio"}
                >
                  {ttsEnabled ? (
                    <Volume2
                      className={`size-4 ${isSpeakingOutLoud ? "text-primary animate-pulse" : ""}`}
                    />
                  ) : (
                    <VolumeX className="size-4 text-muted-foreground/60" />
                  )}
                </button>

                {/* Google Translate selector */}
                <GoogleTranslateSelector variant="compact" />

                {/* Settings toggle */}
                <button
                  type="button"
                  id="shreni-settings-toggle-btn"
                  onClick={() => setShowSettings(!showSettings)}
                  className="tap rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
                  aria-label="Assistant settings"
                  title="Voice trigger settings"
                >
                  <Settings2 className="size-4" />
                </button>

                {/* Close button */}
                <button
                  type="button"
                  id="shreni-close-btn"
                  onClick={closeAssistant}
                  className="tap rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
                  aria-label="Close assistant"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            {/* Autonomous Full App Control Status Banner */}
            <div className="flex items-center justify-between px-5 py-2 bg-gradient-to-r from-amber-500/10 via-primary/10 to-emerald-500/10 border-b border-border/50 text-[11px]">
              <div className="flex items-center gap-2 min-w-0">
                <span className="relative flex size-2 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                </span>
                <span className="font-semibold text-foreground flex items-center gap-1">
                  <Zap className="size-3 text-primary" /> Full App Control
                </span>
                <span className="text-muted-foreground hidden sm:inline truncate">
                  — Translates app, manages crafts, updates orders & navigates
                </span>
              </div>
              <span className="shrink-0 ml-2 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold px-2 py-0.5 text-[9px] uppercase tracking-wider">
                Autonomous
              </span>
            </div>

            {/* Optional Settings Drawer */}
            {showSettings && (
              <div className="border-b border-border/50 bg-secondary/30 px-5 py-3 text-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground">
                      Voice & Sound Trigger ('Namaste Shreni')
                    </p>
                    <p className="text-muted-foreground">
                      Always listens in background for “Namaste Shreni”, “Hey Shreni”, or “Shreni”.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => hotword.toggleEnabled()}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      hotword.isEnabled ? "bg-primary" : "bg-muted"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        hotword.isEnabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Keep Screen Awake Toggle */}
                <div className="flex items-center justify-between pt-2 border-t border-border/40">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-foreground">Keep Screen Awake</p>
                      {hotword.isWakeLockSupported && (
                        <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold text-primary">
                          Wake Lock
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Prevents the phone from sleeping so Shreni can always hear you while you work.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !hotword.keepScreenAwake;
                      hotword.setKeepScreenAwake(next);
                      if (next) {
                        toast.success("Keep Screen Awake enabled");
                      } else {
                        toast.info("Keep Screen Awake disabled");
                      }
                    }}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      hotword.keepScreenAwake ? "bg-primary" : "bg-muted"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        hotword.keepScreenAwake ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Sound chime test */}
                <div className="flex items-center justify-between pt-2 border-t border-border/40">
                  <div>
                    <p className="font-medium text-foreground">Test Sound Effect Chime</p>
                    <p className="text-[11px] text-muted-foreground">
                      Verify speaker audio activation chime
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await hotword.testChime();
                      toast.success("Activation chime played!");
                    }}
                    className="tap inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/20"
                  >
                    <Volume2 className="size-3.5" />
                    <span>Play Chime</span>
                  </button>
                </div>

                {/* Live sound level indicator */}
                <div className="flex items-center justify-between pt-2 border-t border-border/40">
                  <div>
                    <p className="font-medium text-foreground">Microphone Sound Input</p>
                    <p className="text-[11px] text-muted-foreground">
                      {hotword.hasPermission === false
                        ? "Microphone access is blocked in browser"
                        : hotword.isEnabled
                          ? "Detecting ambient sound level"
                          : "Sound trigger is muted"}
                    </p>
                  </div>
                  {hotword.hasPermission === false ? (
                    <button
                      type="button"
                      onClick={async () => {
                        const ok = await hotword.requestMicrophonePermission();
                        if (ok) {
                          toast.success("Microphone permission enabled!");
                        } else {
                          toast.error("Please allow microphone access in browser settings.");
                        }
                      }}
                      className="tap rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-600"
                    >
                      Allow Mic
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-16 overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full bg-emerald-500 transition-all duration-75"
                          style={{ width: `${Math.min(100, hotword.audioLevel * 1.5)}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono w-6 text-right">
                        {hotword.audioLevel}%
                      </span>
                    </div>
                  )}
                </div>

                {/* Live Hotword Detection Diagnostic */}
                <div className="flex items-center justify-between pt-2 border-t border-border/40">
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="font-medium text-foreground">Live Hotword Detection</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {hotword.lastHeard ? (
                        <>
                          Last heard:{" "}
                          <span className="font-mono text-primary font-medium">
                            “{hotword.lastHeard}”
                          </span>
                        </>
                      ) : (
                        "Listening for “Namaste Shreni” or “नमस्ते श्रेणी”"
                      )}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0 ${
                      hotword.isListening
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {hotword.isListening ? "Listening" : "Standby"}
                  </span>
                </div>

                {/* Fixed Voice Persona Info & Test */}
                <div className="flex items-center justify-between pt-2 border-t border-border/40">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="font-medium text-foreground">Fixed Realistic Voice</p>
                      <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">
                        Permanent
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Realistic, soft human female voice for every trigger & interaction
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      speakWithShreniVoice(
                        "Namaste! I am Shreni AI. My voice is fixed, realistic, soft, and clear for every artisan.",
                      );
                      toast.success("Playing fixed Shreni voice sample");
                    }}
                    className="tap inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-foreground hover:bg-secondary/80"
                  >
                    <Volume2 className="size-3.5 text-primary" />
                    <span>Test Voice</span>
                  </button>
                </div>

                {/* Sound Activity Wake-up toggle */}
                <div className="flex items-center justify-between pt-2 border-t border-border/40">
                  <div>
                    <p className="font-medium text-foreground">Sound Activity Wake-up</p>
                    <p className="text-[11px] text-muted-foreground">
                      Wake Shreni on loud call-out or clapping (great when hands are working with
                      clay or dye)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => hotword.setSoundThresholdWake(!hotword.soundThresholdWake)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      hotword.soundThresholdWake ? "bg-primary" : "bg-muted"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        hotword.soundThresholdWake ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Google Translation language setting */}
                <div className="flex items-center justify-between pt-2 border-t border-border/40">
                  <div>
                    <p className="font-medium text-foreground">Google Translation & App Language</p>
                    <p className="text-[11px] text-muted-foreground">
                      Translate app and voice responses to your preferred language
                    </p>
                  </div>
                  <GoogleTranslateSelector variant="button" />
                </div>

                {/* Continuous Voice Pause Rules */}
                <div className="pt-2 border-t border-border/40 text-[11px] text-muted-foreground bg-background/50 p-2.5 rounded-xl">
                  <span className="font-semibold text-foreground">Continuous Dictation:</span>{" "}
                  Pauses of 1–2 seconds keep listening active so you can think and continue. A
                  3-second pause automatically completes and sends your statement.
                </div>
              </div>
            )}

            {/* Conversation Messages */}
            <div className="no-scrollbar flex-1 overflow-y-auto px-5 py-4 space-y-3 min-h-[180px] max-h-[44vh]">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} items-start gap-2.5`}
                >
                  {msg.role === "assistant" && (
                    <div className="grid size-7 shrink-0 place-items-center rounded-full bg-maroon text-maroon-foreground text-xs shadow-xs mt-0.5">
                      <Sparkles className="size-3.5" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-xs shadow-soft"
                        : "bg-secondary/60 text-foreground border border-border/50 rounded-bl-xs shadow-xs"
                    }`}
                  >
                    <p>{msg.content}</p>

                    {/* Interactive Executed Action Cards */}
                    {msg.actions && msg.actions.length > 0 ? (
                      <div className="mt-2.5 pt-2 border-t border-border/40 space-y-1.5">
                        <div className="flex items-center gap-1 text-[10px] font-semibold tracking-wider text-primary uppercase">
                          <Zap className="size-3" />
                          <span>Action Executed</span>
                        </div>
                        {msg.actions.map((act, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between gap-2 rounded-xl bg-background/90 border border-border/60 p-2 text-xs shadow-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="grid size-6 place-items-center rounded-lg bg-primary/10 text-primary shrink-0">
                                {act.type === "navigate" && <ArrowRight className="size-3.5" />}
                                {act.type === "change_language" && <Globe className="size-3.5" />}
                                {act.type === "create_product" && (
                                  <PlusCircle className="size-3.5" />
                                )}
                                {act.type === "fill_product_form" && (
                                  <PlusCircle className="size-3.5" />
                                )}
                                {act.type === "update_order_status" && (
                                  <PackageCheck className="size-3.5" />
                                )}
                                {act.type === "share_storefront" && <Share2 className="size-3.5" />}
                                {act.type === "toggle_tts" && <Volume2 className="size-3.5" />}
                                {act.type === "test_sound" && <Volume2 className="size-3.5" />}
                                {act.type === "none" && <CheckCircle2 className="size-3.5" />}
                              </span>
                              <div className="min-w-0">
                                <p className="font-semibold text-foreground truncate">
                                  {act.type === "navigate" &&
                                    `Navigate to ${act.label || act.target}`}
                                  {act.type === "change_language" &&
                                    `Switch to ${act.languageLabel || act.languageCode}`}
                                  {act.type === "create_product" && `Listed: ${act.title}`}
                                  {act.type === "fill_product_form" &&
                                    `Prefilled Studio: ${act.title}`}
                                  {act.type === "update_order_status" && `Status: ${act.status}`}
                                  {act.type === "share_storefront" && "Shared Storefront Link"}
                                  {act.type === "toggle_tts" &&
                                    `Voice Audio: ${act.enabled ? "On" : "Muted"}`}
                                  {act.type === "test_sound" && "Sound Chime Played"}
                                  {act.type === "install_app" && "Install App Prompt"}
                                  {act.type === "send_inquiry_reply" && "Inquiry Reply Drafted"}
                                </p>
                                <p className="text-[10px] text-muted-foreground truncate">
                                  {act.type === "navigate" && act.target}
                                  {act.type === "create_product" &&
                                    `₹${act.price || 850} · ${act.category || "Handicrafts"}`}
                                  {act.type === "fill_product_form" && `₹${act.price || 850}`}
                                  {act.type === "change_language" && "Google Translate live"}
                                  {act.type === "update_order_status" && "Updated in database"}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                void executeShreniAction(act, {
                                  artisanId,
                                  artisanName,
                                  navigate: ({ href, to }) => {
                                    if (to) void navigate({ to });
                                    else if (href) void navigate({ href });
                                  },
                                  closeAssistant: () => closeAssistant(),
                                  setTtsEnabled: (val) => setTtsEnabled(val),
                                  testChime: async () => {
                                    await playAssistantActivationChime();
                                  },
                                });
                              }}
                              className="tap inline-flex items-center gap-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary px-2 py-0.5 text-[11px] font-semibold shrink-0"
                            >
                              <span>{act.type === "navigate" ? "Open" : "Run"}</span>
                              <ArrowRight className="size-2.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : msg.action && msg.action.type === "navigate" && msg.action.target ? (
                      <div className="mt-2.5 pt-2 border-t border-border/40">
                        <button
                          type="button"
                          onClick={() => {
                            closeAssistant();
                            navigate({ href: msg.action!.target });
                          }}
                          className="tap inline-flex items-center gap-1.5 rounded-xl bg-gradient-warm px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-xs"
                        >
                          <span>{msg.action.label || "Open Screen"}</span>
                          <ArrowRight className="size-3" />
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}

              {isQueryLoading && (
                <div className="flex items-start gap-2.5">
                  <div className="grid size-7 shrink-0 place-items-center rounded-full bg-maroon text-maroon-foreground text-xs shadow-xs">
                    <Sparkles className="size-3.5" />
                  </div>
                  <div className="flex items-center gap-1.5 rounded-2xl bg-secondary/50 px-4 py-3 border border-border/40">
                    <span
                      className="size-2 animate-bounce rounded-full bg-primary/70"
                      style={{ animationDelay: "0ms" }}
                    />
                    <span
                      className="size-2 animate-bounce rounded-full bg-primary/70"
                      style={{ animationDelay: "150ms" }}
                    />
                    <span
                      className="size-2 animate-bounce rounded-full bg-primary/70"
                      style={{ animationDelay: "300ms" }}
                    />
                    <span className="ml-2 text-xs text-muted-foreground">Shreni is thinking…</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Continuous Voice Indicator with 3-Second Pause Logic */}
            {isListeningInput && (
              <div className="flex flex-col px-4 py-3 bg-secondary/40 border-t border-border/50 gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <span
                        className="voice-wave-bar w-1 rounded-full bg-red-500"
                        style={{ animationDelay: "0ms" }}
                      />
                      <span
                        className="voice-wave-bar w-1 rounded-full bg-yellow-500"
                        style={{ animationDelay: "150ms" }}
                      />
                      <span
                        className="voice-wave-bar w-1 rounded-full bg-green-500"
                        style={{ animationDelay: "300ms" }}
                      />
                      <span
                        className="voice-wave-bar w-1 rounded-full bg-blue-500"
                        style={{ animationDelay: "450ms" }}
                      />
                    </div>
                    <span className="text-[11px] font-medium text-foreground">
                      {pauseSecondsLeft !== null && pauseSecondsLeft > 0
                        ? `Pausing… sending in ${pauseSecondsLeft}s (speak to resume)`
                        : "Listening continuously (1–2s pauses allowed)"}
                    </span>
                  </div>

                  {liveTranscription && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={commitAndSendVoiceInput}
                        className="tap inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground shadow-xs hover:bg-primary/90"
                      >
                        <span>Send Now</span>
                        <Send className="size-3" />
                      </button>
                      <button
                        type="button"
                        onClick={stopActiveListening}
                        className="tap rounded-full p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                        title="Cancel listening"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="bg-background/90 border border-border/60 rounded-xl px-3 py-2 shadow-xs">
                  <p className="text-xs sm:text-sm font-medium text-foreground leading-relaxed">
                    {liveTranscription ? (
                      <span>
                        “
                        {finalTranscript && (
                          <span className="text-foreground">{finalTranscript}</span>
                        )}
                        {finalTranscript && interimTranscript && " "}
                        {interimTranscript && (
                          <span className="text-muted-foreground italic">{interimTranscript}</span>
                        )}
                        ”
                      </span>
                    ) : (
                      <span className="text-muted-foreground italic">
                        Speak freely… take your time, 1–2s pauses won't cut you off. A 3s pause
                        completes your statement.
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* Quick Prompt Chips */}
            <div className="no-scrollbar flex gap-2 overflow-x-auto px-5 py-2 border-t border-border/40 bg-card/60">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handleUserQuery(prompt)}
                  className="tap shrink-0 rounded-full border border-border/80 bg-card px-3 py-1.5 text-[11px] font-medium text-muted-foreground hover:bg-secondary hover:text-foreground shadow-xs"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Input Footer */}
            <div className="p-4 pt-2 landscape:p-2.5 pb-[max(1rem,env(safe-area-inset-bottom,1rem))]">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (inputText.trim()) {
                    void handleUserQuery(inputText);
                  }
                }}
                className="flex items-center gap-2 rounded-full border border-border bg-background p-1.5 shadow-inner"
              >
                {/* Microphone button */}
                <button
                  type="button"
                  id="shreni-mic-input-btn"
                  onClick={async () => {
                    await unlockAudioContext();
                    if (isSpeakingOutLoud) {
                      stopSpeaking();
                      setIsSpeakingOutLoud(false);
                      void startActiveListening();
                      return;
                    }
                    if (isListeningInput) {
                      stopActiveListening();
                    } else {
                      void startActiveListening();
                    }
                  }}
                  className={`tap grid size-10 shrink-0 place-items-center rounded-full transition-colors ${
                    isListeningInput
                      ? "bg-red-500 text-white animate-pulse"
                      : isSpeakingOutLoud
                        ? "bg-primary text-primary-foreground animate-bounce"
                        : "bg-secondary text-primary hover:bg-secondary/80"
                  }`}
                  aria-label={
                    isListeningInput
                      ? "Stop listening"
                      : isSpeakingOutLoud
                        ? "Interrupt Shreni and speak"
                        : "Speak question"
                  }
                  title={
                    isListeningInput
                      ? "Stop listening"
                      : isSpeakingOutLoud
                        ? "Interrupt Shreni and speak"
                        : "Speak question"
                  }
                >
                  <Mic className="size-5" />
                </button>

                <input
                  type="text"
                  id="shreni-input-field"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={
                    isListeningInput ? "Listening to your voice…" : "Ask Shreni AI or speak…"
                  }
                  className="min-w-0 flex-1 bg-transparent px-2 text-xs sm:text-sm outline-none placeholder:text-muted-foreground"
                />

                <button
                  type="submit"
                  id="shreni-send-btn"
                  disabled={!inputText.trim() || isQueryLoading}
                  className="tap grid size-10 shrink-0 place-items-center rounded-full bg-gradient-warm text-primary-foreground disabled:opacity-40"
                  aria-label="Send question"
                >
                  <Send className="size-4" />
                </button>
              </form>
            </div>

            {/* Google Assistant Bottom Edge Lightbar */}
            <div className="assistant-lightbar h-1 w-full" />
          </div>
        </div>
      )}
    </>
  );
}
