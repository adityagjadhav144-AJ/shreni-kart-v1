/**
 * Web Audio and Speech Synthesis effects for Shreni AI assistant.
 * Guaranteed to work across modern browsers with auto-unlocking AudioContext and HTML5 Audio fallback.
 */

let audioCtx: AudioContext | null = null;
let isAudioUnlocked = false;

// Generate a clean in-memory WAV chime fallback data URI
function generateChimeWavDataUri(): string {
  const sampleRate = 22050;
  const duration = 0.38; // seconds
  const numSamples = Math.floor(sampleRate * duration);
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // RIFF identifier
  writeString(0, "RIFF");
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true); // SubChunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, 1, true); // NumChannels (1 = mono)
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // ByteRate
  view.setUint16(32, 2, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample
  writeString(36, "data");
  view.setUint32(40, numSamples * 2, true);

  // Generate pleasant 2-tone melodic chime: Tone 1 (G5 ~ 784Hz), Tone 2 (C6 ~ 1046Hz)
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;

    if (t < 0.16) {
      // First tone (D5 to G5 ramp)
      const freq = 600 + (784 - 600) * (t / 0.16);
      const env = Math.sin((t / 0.16) * Math.PI) * Math.exp(-t * 8);
      sample = Math.sin(2 * Math.PI * freq * t) * env * 0.7;
    } else if (t >= 0.1) {
      // Second tone (A5 to C6 high chime)
      const t2 = t - 0.1;
      const freq2 = 880 + (1046.5 - 880) * Math.min(1, t2 / 0.08);
      const env2 = Math.sin(Math.min(1, t2 / 0.04) * (Math.PI / 2)) * Math.exp(-t2 * 10);
      sample += Math.sin(2 * Math.PI * freq2 * t2) * env2 * 0.85;
    }

    // Clamp to 16-bit signed integer
    const intVal = Math.max(-32767, Math.min(32767, Math.floor(sample * 30000)));
    view.setInt16(offset, intVal, true);
    offset += 2;
  }

  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `data:audio/wav;base64,${btoa(binary)}`;
}

let cachedWavChime: string | null = null;
function getFallbackChimeUri(): string {
  if (!cachedWavChime) {
    try {
      cachedWavChime = generateChimeWavDataUri();
    } catch {
      return "";
    }
  }
  return cachedWavChime;
}

export function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  return audioCtx;
}

/**
 * Unlock AudioContext on initial browser user interaction or hotword wake-up
 */
export async function unlockAudioContext(): Promise<boolean> {
  const ctx = getAudioContext();
  if (!ctx) return false;
  try {
    if (ctx.state === "suspended") {
      await ctx.resume();
    }
    isAudioUnlocked = ctx.state === "running";
    return isAudioUnlocked;
  } catch (err) {
    console.debug("[Audio] AudioContext unlock error:", err);
    return false;
  }
}

// Automatically register ambient unlock events on user gesture for PWA and mobile
if (typeof window !== "undefined") {
  const unlock = () => {
    void unlockAudioContext();
  };
  window.addEventListener("click", unlock, { passive: true });
  window.addEventListener("touchstart", unlock, { passive: true });
  window.addEventListener("pointerdown", unlock, { passive: true });
  window.addEventListener("keydown", unlock, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      void unlockAudioContext();
    }
  });
}

/**
 * Play Google Assistant-style signature 2-tone melodic chime
 * Robust across Web Audio API and HTML5 Audio fallback.
 */
export async function playAssistantActivationChime(): Promise<void> {
  const ctx = getAudioContext();

  if (ctx) {
    if (ctx.state === "suspended") {
      try {
        await ctx.resume();
      } catch {
        // Fallback to HTML5 audio below
      }
    }

    if (ctx.state === "running") {
      try {
        const now = ctx.currentTime + 0.02;

        // Tone 1: D5 ramp to G5
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = "sine";
        osc1.frequency.setValueAtTime(587.33, now);
        osc1.frequency.exponentialRampToValueAtTime(783.99, now + 0.07);
        gain1.gain.setValueAtTime(0.001, now);
        gain1.gain.exponentialRampToValueAtTime(0.28, now + 0.03);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.16);

        // Tone 2: A5 ramp to C6 with rich harmonics
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(880, now + 0.09);
        osc2.frequency.exponentialRampToValueAtTime(1046.5, now + 0.14);
        gain2.gain.setValueAtTime(0.001, now + 0.09);
        gain2.gain.exponentialRampToValueAtTime(0.32, now + 0.12);
        gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.09);
        osc2.stop(now + 0.35);

        return;
      } catch (err) {
        console.debug("WebAudio chime error, attempting HTML5 fallback:", err);
      }
    }
  }

  // HTML5 Audio fallback
  try {
    const uri = getFallbackChimeUri();
    if (uri) {
      const audio = new Audio(uri);
      audio.volume = 0.5;
      await audio.play();
    }
  } catch (audioErr) {
    console.debug("Audio fallback prevented by browser:", audioErr);
  }
}

/**
 * Play soft deactivation chime (descending tones)
 */
export async function playAssistantCloseChime(): Promise<void> {
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      return;
    }
  }

  if (ctx.state !== "running") return;

  try {
    const now = ctx.currentTime + 0.02;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(659.25, now); // E5
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.12); // A4
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.16);
  } catch (e) {
    console.debug("Close chime playback error:", e);
  }
}

/**
 * Short crisp beep for mic toggle
 */
export async function playMicBeep(type: "start" | "stop" = "start"): Promise<void> {
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      return;
    }
  }

  if (ctx.state !== "running") return;

  try {
    const now = ctx.currentTime + 0.01;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    const freq = type === "start" ? 987.77 : 493.88; // B5 or B4
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  } catch (e) {
    console.debug("Beep error:", e);
  }
}

/**
 * Cached fixed Shreni female voice reference so it NEVER changes or varies
 * between triggers or sessions. A single, realistic, clear, soft human-like voice.
 */
let fixedShreniVoice: SpeechSynthesisVoice | null = null;

// Specific prioritized list of natural, realistic, soft female human voices
const PREFERRED_FEMALE_VOICES = [
  // Microsoft Natural Indian English Female
  "microsoft heera online (natural) - english (india)",
  "microsoft neerja online (natural) - english (india)",
  "microsoft heera - english (india)",
  "microsoft neerja - english (india)",
  // Google Natural Indian English Female
  "google en-in",
  "google english india",
  "google hindi",
  "google हिन्दी",
  // Apple / iOS Natural Female
  "lekha",
  "samantha (enhanced)",
  "samantha",
  "karen",
  "victoria",
  "serena",
  // Microsoft Natural English Female
  "microsoft jenny online (natural) - english (united states)",
  "microsoft aria online (natural) - english (united states)",
  "microsoft zira - english (united states)",
  "microsoft zira desktop - english (united states)",
  "google uk english female",
  "google us english",
];

// Robotic synth voices explicitly excluded
const ROBOTIC_VOICE_PATTERNS = [
  /espeak/i,
  /whisper/i,
  /bad news/i,
  /bells/i,
  /cellos/i,
  /zarvox/i,
  /trinoids/i,
  /albert/i,
  /fred/i,
  /organ/i,
  /boing/i,
  /bubbles/i,
  /jester/i,
  /wobble/i,
];

export function getFixedShreniVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return null;
  }

  if (fixedShreniVoice) {
    return fixedShreniVoice;
  }

  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) {
    return null;
  }

  // Filter out known robotic / novelty voices
  const eligibleVoices = voices.filter(
    (v) => !ROBOTIC_VOICE_PATTERNS.some((pat) => pat.test(v.name)),
  );

  // 1. Try matching preferred priority list in deterministic order
  for (const preferredName of PREFERRED_FEMALE_VOICES) {
    const found = eligibleVoices.find((v) => v.name.toLowerCase().includes(preferredName));
    if (found) {
      fixedShreniVoice = found;
      return found;
    }
  }

  // 2. Look for Indian English female voice
  const inFemale = eligibleVoices.find(
    (v) =>
      (v.lang === "en-IN" || v.lang === "hi-IN") &&
      (v.name.toLowerCase().includes("female") ||
        v.name.toLowerCase().includes("heera") ||
        v.name.toLowerCase().includes("neerja") ||
        v.name.toLowerCase().includes("swara") ||
        v.name.toLowerCase().includes("lekha")),
  );
  if (inFemale) {
    fixedShreniVoice = inFemale;
    return inFemale;
  }

  // 3. Look for any English voice with female indicator
  const anyFemale = eligibleVoices.find(
    (v) =>
      v.lang.startsWith("en") &&
      (v.name.toLowerCase().includes("female") ||
        v.name.toLowerCase().includes("woman") ||
        v.name.toLowerCase().includes("samantha") ||
        v.name.toLowerCase().includes("zira") ||
        v.name.toLowerCase().includes("jenny") ||
        v.name.toLowerCase().includes("victoria")),
  );
  if (anyFemale) {
    fixedShreniVoice = anyFemale;
    return anyFemale;
  }

  // 4. Fallback to en-IN or first English voice deterministically
  const fallback =
    eligibleVoices.find((v) => v.lang === "en-IN") ||
    eligibleVoices.find((v) => v.lang.startsWith("en")) ||
    voices[0] ||
    null;

  fixedShreniVoice = fallback;
  return fallback;
}

// Pre-warm and lock voice once available in browser
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  if (window.speechSynthesis.getVoices().length > 0) {
    getFixedShreniVoice();
  }
  window.speechSynthesis.onvoiceschanged = () => {
    getFixedShreniVoice();
  };
}

// Keep reference to active utterance to prevent Chromium garbage-collection bug
let activeUtterance: SpeechSynthesisUtterance | null = null;

/**
 * Speak text response using Web Speech Synthesis API with Shreni's fixed, realistic, soft voice
 */
export function speakWithShreniVoice(text: string, onEnd?: () => void) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    onEnd?.();
    return;
  }

  try {
    window.speechSynthesis.cancel(); // Stop any pending utterances
    activeUtterance = null;

    // Strip markdown formatting and URLs so speech sounds human and natural
    const plainText = text
      .replace(/[*_#`~>]/g, "")
      .replace(/https?:\/\/\S+/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .trim();

    if (!plainText) {
      onEnd?.();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(plainText);
    // Soft, realistic, gentle conversational cadence
    utterance.rate = 0.96;
    utterance.pitch = 1.02;
    utterance.volume = 1.0;

    const voice = getFixedShreniVoice();
    if (voice) {
      utterance.voice = voice;
      if (voice.lang) {
        utterance.lang = voice.lang;
      }
    }

    let finishDispatched = false;
    let watchdogTimer: ReturnType<typeof setTimeout> | null = null;

    const handleFinish = () => {
      if (finishDispatched) return;
      finishDispatched = true;
      if (watchdogTimer) {
        clearTimeout(watchdogTimer);
        watchdogTimer = null;
      }
      activeUtterance = null;
      onEnd?.();
    };

    // Calculate maximum expected duration with 3s buffer (approx 12 characters per second + 3s buffer)
    const expectedDurationMs = Math.max(3000, Math.ceil((plainText.length / 12) * 1000) + 3000);
    watchdogTimer = setTimeout(() => {
      console.debug("[SpeechSynthesis] Watchdog timer expired, triggering fallback finish.");
      handleFinish();
    }, expectedDurationMs);

    utterance.onend = handleFinish;
    utterance.onerror = handleFinish;
    activeUtterance = utterance;

    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.debug("Speech synthesis error:", e);
    activeUtterance = null;
    onEnd?.();
  }
}

export function stopSpeaking() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    activeUtterance = null;
    window.speechSynthesis.cancel();
  }
}
