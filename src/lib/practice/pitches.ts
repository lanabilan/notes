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
