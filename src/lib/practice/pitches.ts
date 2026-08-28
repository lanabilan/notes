import type { PitchId } from "@/types";

/** Natural notes in the guest drill set: C4 through G5 (FR-001). */
export const DRILL_NATURALS: readonly PitchId[] = [
  "C4",
  "D4",
  "E4",
  "F4",
  "G4",
  "A4",
  "B4",
  "C5",
  "D5",
  "E5",
  "F5",
  "G5",
] as const;

export const DRILL_NATURAL_COUNT = DRILL_NATURALS.length;

export function isDrillNatural(pitch: PitchId): boolean {
  return DRILL_NATURALS.includes(pitch);
}

export function drillIndex(pitch: PitchId): number {
  return DRILL_NATURALS.indexOf(pitch);
}

export function pitchAt(index: number): PitchId {
  if (index < 0 || index >= DRILL_NATURAL_COUNT) {
    throw new RangeError(`Drill pitch index out of range: ${index}`);
  }
  return DRILL_NATURALS[index];
}

/** White keys for the on-screen piano (C4–B5). */
export const PIANO_WHITE_KEYS: readonly PitchId[] = [
  "C4",
  "D4",
  "E4",
  "F4",
  "G4",
  "A4",
  "B4",
  "C5",
  "D5",
  "E5",
  "F5",
  "G5",
  "A5",
  "B5",
] as const;

/**
 * Black keys for the on-screen piano (C4–B5 range).
 * `afterWhiteIndex` is the white-key index the sharp sits to the right of.
 */
export const PIANO_BLACK_KEYS: readonly { pitch: PitchId; afterWhiteIndex: number }[] = [
  { pitch: "C#4", afterWhiteIndex: 0 },
  { pitch: "D#4", afterWhiteIndex: 1 },
  { pitch: "F#4", afterWhiteIndex: 3 },
  { pitch: "G#4", afterWhiteIndex: 4 },
  { pitch: "A#4", afterWhiteIndex: 5 },
  { pitch: "C#5", afterWhiteIndex: 7 },
  { pitch: "D#5", afterWhiteIndex: 8 },
  { pitch: "F#5", afterWhiteIndex: 10 },
  { pitch: "G#5", afterWhiteIndex: 11 },
  { pitch: "A#5", afterWhiteIndex: 12 },
] as const;

const PITCH_ID_RE = /^([A-G])([#b]?)(\d)$/;

const SEMITONE_FROM_C = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
} as const;

type NaturalLetter = keyof typeof SEMITONE_FROM_C;

const A4_HZ = 440;
const A4_MIDI = 69;

function parsePitchId(pitch: PitchId): { letter: string; accidental: string; octave: number } {
  const match = PITCH_ID_RE.exec(pitch);
  if (!match?.[1] || !match[3]) {
    throw new Error(`Invalid pitch id: ${pitch}`);
  }
  return {
    letter: match[1],
    accidental: match[2],
    octave: Number(match[3]),
  };
}

function semitoneFromC(letter: string): number {
  if (letter in SEMITONE_FROM_C) {
    return SEMITONE_FROM_C[letter as NaturalLetter];
  }
  throw new Error(`Invalid pitch letter: ${letter}`);
}

/** Convert `C4` / `C#4` pitch ids to VexFlow keys (`c/4`, `c#/4`). */
export function toVexKey(pitch: PitchId): string {
  const { letter, accidental, octave } = parsePitchId(pitch);
  return `${letter.toLowerCase()}${accidental}/${octave}`;
}

/**
 * Equal-temperament frequency for a pitch id.
 * A4 = 440 Hz; C4 = MIDI 60.
 */
export function pitchToHz(pitch: PitchId): number {
  const { letter, accidental, octave } = parsePitchId(pitch);
  const offset = accidental === "#" ? 1 : accidental === "b" ? -1 : 0;
  const midi = (octave + 1) * 12 + semitoneFromC(letter) + offset;
  return A4_HZ * 2 ** ((midi - A4_MIDI) / 12);
}
