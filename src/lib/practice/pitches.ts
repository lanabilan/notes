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

/** Convert `C4` / `C#4` pitch ids to VexFlow keys (`c/4`, `c#/4`). */
export function toVexKey(pitch: PitchId): string {
  const match = /^([A-G])([#b]?)(\d)$/.exec(pitch);
  if (!match?.[1] || !match[3]) {
    throw new Error(`Invalid pitch id: ${pitch}`);
  }
  return `${match[1].toLowerCase()}${match[2]}/${match[3]}`;
}
