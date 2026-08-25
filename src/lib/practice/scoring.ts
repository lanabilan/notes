import type { NoteResult, PitchId, RoundSummary } from "@/types";

/** Judge a piano tap against the current staff target. */
export function isCorrectTap(target: PitchId, tapped: PitchId): boolean {
  return target === tapped;
}

export function createNoteResult(target: PitchId, tapped: PitchId, responseMs: number): NoteResult {
  return {
    target,
    tapped,
    correct: isCorrectTap(target, tapped),
    responseMs,
  };
}

/** Aggregate per-note results into round summary metrics (FR-004). */
export function summarizeRound(results: readonly NoteResult[]): RoundSummary {
  const total = results.length;
  const correctCount = results.filter((r) => r.correct).length;
  const accuracyPercent = total === 0 ? 0 : (correctCount / total) * 100;

  if (total === 0) {
    return {
      total: 0,
      correctCount: 0,
      accuracyPercent: 0,
      averageResponseMs: null,
    };
  }

  const sumMs = results.reduce((acc, r) => acc + r.responseMs, 0);
  return {
    total,
    correctCount,
    accuracyPercent,
    averageResponseMs: sumMs / total,
  };
}
