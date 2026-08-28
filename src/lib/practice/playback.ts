import type { PitchId } from "@/types";

import { pitchToHz } from "./pitches";

/** Short confirmation envelope — long enough to hear, short enough not to smear into the next note. */
const ATTACK_SECONDS = 0.012;
const DURATION_SECONDS = 0.35;
const PEAK_GAIN = 0.18;
const SILENT_GAIN = 0.0001;

type AudioContextCtor = new () => AudioContext;

let sharedContext: AudioContext | null = null;
let activeOscillator: OscillatorNode | null = null;
let activeGain: GainNode | null = null;

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

/** Stop any in-flight confirmation tone. Safe to call when nothing is playing. */
export function stopPlayback(): void {
  disconnectActive();
}

/**
 * Play a short sine tone for `pitch`. Lazy-creates AudioContext on first call.
 * No-ops when Web Audio is missing or node setup / resume fails.
 * Must not be imported from SSR / Astro frontmatter.
 */
export function playPitch(pitch: PitchId): void {
  try {
    const hz = pitchToHz(pitch);
    const ctx = getSharedAudioContext();
    if (!ctx) {
      return;
    }

    disconnectActive();

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(hz, ctx.currentTime);

    const now = ctx.currentTime;
    gain.gain.setValueAtTime(SILENT_GAIN, now);
    gain.gain.exponentialRampToValueAtTime(PEAK_GAIN, now + ATTACK_SECONDS);
    gain.gain.exponentialRampToValueAtTime(SILENT_GAIN, now + DURATION_SECONDS);

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

    void ctx.resume().catch(() => {
      disconnectActive();
    });
  } catch {
    disconnectActive();
  }
}
