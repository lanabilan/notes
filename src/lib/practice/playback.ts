import type { PitchId } from "@/types";

import { pitchToHz } from "./pitches";

/** Short confirmation envelope — long enough to hear, short enough not to smear into the next note. */
const ATTACK_SECONDS = 0.012;
const DURATION_SECONDS = 0.35;
const PEAK_GAIN = 0.18;

type AudioContextCtor = new () => AudioContext;

let sharedContext: AudioContext | null = null;
let activeOscillator: OscillatorNode | null = null;
let activeGain: GainNode | null = null;
let silentUnlockPlayed = false;
let playGeneration = 0;

function resolveAudioContextConstructor(): AudioContextCtor | undefined {
  if (typeof globalThis === "undefined") {
    return undefined;
  }
  const globals = globalThis as typeof globalThis & {
    AudioContext?: AudioContextCtor;
    webkitAudioContext?: AudioContextCtor;
  };
  return globals.AudioContext ?? globals.webkitAudioContext;
}

function getSharedAudioContext(): AudioContext | null {
  if (sharedContext) {
    return sharedContext;
  }
  const Ctor = resolveAudioContextConstructor();
  if (!Ctor) {
    return null;
  }
  sharedContext = new Ctor();
  return sharedContext;
}

function isRunning(ctx: AudioContext): boolean {
  return ctx.state === "running";
}

/** iOS Safari: resume() must be invoked in the same tick as the user gesture. */
function resumeContext(ctx: AudioContext): void {
  if (ctx.state === "closed") {
    return;
  }
  if (!isRunning(ctx)) {
    void ctx.resume().catch(() => {
      // Autoplay policy or interruption — next gesture can retry.
    });
  }
}

/**
 * One-sample buffer in the gesture. iOS often stays silent if the first node
 * is an oscillator started while the context is still suspended.
 */
function playSilentUnlock(ctx: AudioContext): void {
  if (silentUnlockPlayed) {
    return;
  }
  silentUnlockPlayed = true;
  try {
    const buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
  } catch {
    silentUnlockPlayed = false;
  }
}

function disconnectActive(): void {
  const oscillator = activeOscillator;
  const gain = activeGain;
  activeOscillator = null;
  activeGain = null;
  if (oscillator) {
    oscillator.onended = null;
    try {
      oscillator.stop();
    } catch {
      // Already stopped.
    }
    try {
      oscillator.disconnect();
    } catch {
      // Already disconnected.
    }
  }
  if (gain) {
    try {
      gain.disconnect();
    } catch {
      // Already disconnected.
    }
  }
}

/**
 * Create/resume AudioContext inside a user gesture (pointerdown/click).
 * Safe to call repeatedly; no-ops when Web Audio is missing.
 */
export function unlockPlayback(): void {
  try {
    const ctx = getSharedAudioContext();
    if (!ctx) {
      return;
    }
    resumeContext(ctx);
    playSilentUnlock(ctx);
  } catch {
    // no-op
  }
}

function startTone(ctx: AudioContext, hz: number): void {
  disconnectActive();

  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = "sine";

  const now = ctx.currentTime;
  oscillator.frequency.setValueAtTime(hz, now);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(PEAK_GAIN, now + ATTACK_SECONDS);
  gain.gain.linearRampToValueAtTime(0, now + DURATION_SECONDS);

  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.onended = () => {
    if (activeOscillator === oscillator) {
      disconnectActive();
    }
  };
  oscillator.start(now);
  oscillator.stop(now + DURATION_SECONDS);
  activeOscillator = oscillator;
  activeGain = gain;
}

/** Stop any in-flight confirmation tone. Safe to call when nothing is playing. */
export function stopPlayback(): void {
  playGeneration += 1;
  disconnectActive();
}

/**
 * Play a short sine tone for `pitch`. Lazy-creates AudioContext on first call.
 * No-ops when Web Audio is missing or `resume()` / node setup fails.
 * Must not be imported from SSR / Astro frontmatter.
 *
 * iOS Safari: do not start the oscillator while the context is suspended —
 * `currentTime` is frozen and start/stop times become no-ops after resume.
 */
export function playPitch(pitch: PitchId): void {
  try {
    const hz = pitchToHz(pitch);
    const ctx = getSharedAudioContext();
    if (!ctx) {
      return;
    }

    unlockPlayback();

    const generation = ++playGeneration;
    const kick = () => {
      if (generation !== playGeneration) {
        return;
      }
      startTone(ctx, hz);
    };

    if (isRunning(ctx)) {
      kick();
      return;
    }

    void ctx
      .resume()
      .then(() => {
        if (!isRunning(ctx)) {
          return;
        }
        kick();
      })
      .catch(() => {
        // Swallow — visual loop must stay intact.
      });
  } catch {
    disconnectActive();
  }
}
