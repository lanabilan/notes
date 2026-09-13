import { describe, expect, it } from "vitest";

import { generateRound } from "@/lib/practice";
import type { PitchId } from "@/types";

/**
 * FR-001 drill set as a test oracle. Not imported from production DRILL_NATURALS.
 */
const DRILL_C4_G5: readonly PitchId[] = ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5", "D5", "E5", "F5", "G5"];

const SAMPLE_COUNT = 200;

function isDrillNatural(pitch: PitchId): boolean {
  return DRILL_C4_G5.includes(pitch);
}

/** Neighbors on the C4–G5 scale; bounce at the ends, never wrap G5→C4. */
function areScaleNeighbors(a: PitchId, b: PitchId): boolean {
  const i = DRILL_C4_G5.indexOf(a);
  const j = DRILL_C4_G5.indexOf(b);
  return i !== -1 && j !== -1 && Math.abs(i - j) === 1;
}

describe("generateRound", () => {
  it("random rounds have length 10, stay in C4–G5, and skip immediate repeats", () => {
    // No immediate repeat is the live random refinement, not a PRD line.
    for (let n = 0; n < SAMPLE_COUNT; n++) {
      const notes = generateRound("random");
      expect(notes).toHaveLength(10);
      for (const pitch of notes) {
        expect(isDrillNatural(pitch)).toBe(true);
      }
      for (let i = 0; i < notes.length - 1; i++) {
        expect(notes[i]).not.toBe(notes[i + 1]);
      }
    }
  });

  it("stepwise rounds bounce at C4/G5 neighbors and never wrap G5→C4", () => {
    for (let n = 0; n < SAMPLE_COUNT; n++) {
      const notes = generateRound("stepwise");
      expect(notes).toHaveLength(10);
      for (const pitch of notes) {
        expect(isDrillNatural(pitch)).toBe(true);
      }
      for (let i = 0; i < notes.length - 1; i++) {
        const current = notes.at(i);
        const next = notes.at(i + 1);
        expect(current).toBeDefined();
        expect(next).toBeDefined();
        if (current === undefined || next === undefined) {
          throw new Error("expected adjacent notes");
        }
        expect(areScaleNeighbors(current, next)).toBe(true);
      }
    }
  });
});
