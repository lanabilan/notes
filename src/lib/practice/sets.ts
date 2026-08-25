import type { PitchId, PracticeSetMode } from "@/types";

import { DRILL_NATURAL_COUNT, DRILL_NATURALS, pitchAt } from "./pitches";

export const ROUND_LENGTH = 10;

function randomInt(maxExclusive: number): number {
  return Math.floor(Math.random() * maxExclusive);
}

/**
 * Uniform random sequence of `ROUND_LENGTH` drill naturals.
 * Avoids immediate repeats when the set has more than one pitch.
 */
function generateRandomRound(): PitchId[] {
  const notes: PitchId[] = [];
  let previous: number | null = null;

  for (let i = 0; i < ROUND_LENGTH; i++) {
    let index = randomInt(DRILL_NATURAL_COUNT);
    if (previous !== null && DRILL_NATURAL_COUNT > 1) {
      while (index === previous) {
        index = randomInt(DRILL_NATURAL_COUNT);
      }
    }
    notes.push(pitchAt(index));
    previous = index;
  }

  return notes;
}

/**
 * Consecutive naturals within the drill set, bouncing at C4 / G5
 * (reverse direction at ends — do not wrap).
 */
function generateStepwiseRound(): PitchId[] {
  const notes: PitchId[] = [];
  let index = randomInt(DRILL_NATURAL_COUNT);
  let direction: 1 | -1 = Math.random() < 0.5 ? 1 : -1;

  notes.push(pitchAt(index));

  for (let i = 1; i < ROUND_LENGTH; i++) {
    let next = index + direction;
    if (next < 0 || next >= DRILL_NATURAL_COUNT) {
      direction = direction === 1 ? -1 : 1;
      next = index + direction;
    }
    index = next;
    notes.push(pitchAt(index));
  }

  return notes;
}

/** Produce a 10-note practice sequence for the given set mode. */
export function generateRound(mode: PracticeSetMode): PitchId[] {
  switch (mode) {
    case "random":
      return generateRandomRound();
    case "stepwise":
      return generateStepwiseRound();
  }
}

/** Expose the drill set for callers that only need the constant list. */
export { DRILL_NATURALS };
