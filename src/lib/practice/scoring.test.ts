import { describe, expect, it } from "vitest";

import { createNoteResult, isCorrectTap, summarizeRound } from "@/lib/practice";
import type { NoteResult, PitchId } from "@/types";

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

describe("summarizeRound", () => {
  it("computes 70% and the mean of all responseMs including wrongs", () => {
    // Live contract (not FR-004): wrongs are included in the average.
    const results: NoteResult[] = [
      { target: "C4", tapped: "C4", correct: true, responseMs: 100 },
      { target: "D4", tapped: "D4", correct: true, responseMs: 200 },
      { target: "E4", tapped: "E4", correct: true, responseMs: 300 },
      { target: "F4", tapped: "F4", correct: true, responseMs: 150 },
      { target: "G4", tapped: "G4", correct: true, responseMs: 50 },
      { target: "A4", tapped: "A4", correct: true, responseMs: 400 },
      { target: "B4", tapped: "B4", correct: true, responseMs: 250 },
      { target: "C5", tapped: "D5", correct: false, responseMs: 80 },
      { target: "D5", tapped: "E5", correct: false, responseMs: 120 },
      { target: "E5", tapped: "F5", correct: false, responseMs: 350 },
    ];
    const summary = summarizeRound(results);
    expect(summary.total).toBe(10);
    expect(summary.correctCount).toBe(7);
    expect(summary.accuracyPercent).toBe(70);
    expect(summary.averageResponseMs).toBe((100 + 200 + 300 + 150 + 50 + 400 + 250 + 80 + 120 + 350) / 10);
  });

  it("returns 0% and null average for an empty log", () => {
    // Live contract (not FR-004): empty average is null, not 0.
    const summary = summarizeRound([]);
    expect(summary.total).toBe(0);
    expect(summary.correctCount).toBe(0);
    expect(summary.accuracyPercent).toBe(0);
    expect(summary.averageResponseMs).toBeNull();
  });
});
