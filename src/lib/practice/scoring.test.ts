import { describe, expect, it } from "vitest";

import { createNoteResult, isCorrectTap } from "@/lib/practice";
import type { PitchId } from "@/types";

/**
 * Product mapping (FR-001 / S-01): same natural letter+octave is correct;
 * any other piano id is wrong. Not derived from isCorrectTap.
 */
const MAPPING_ROWS: readonly { target: PitchId; tapped: PitchId; expected: boolean }[] = [
  { target: "C4", tapped: "C4", expected: true },
  { target: "C4", tapped: "D4", expected: false },
  { target: "C4", tapped: "C5", expected: false },
  { target: "C4", tapped: "C#4", expected: false },
  { target: "G5", tapped: "A5", expected: false },
  { target: "G5", tapped: "G5", expected: true },
];

describe("isCorrectTap", () => {
  it.each(MAPPING_ROWS)("$target vs $tapped → $expected", ({ target, tapped, expected }) => {
    expect(isCorrectTap(target, tapped)).toBe(expected);
  });
});

describe("createNoteResult", () => {
  it.each(MAPPING_ROWS)("sets correct=$expected for $target vs $tapped", ({ target, tapped, expected }) => {
    expect(createNoteResult(target, tapped, 100).correct).toBe(expected);
  });
});
