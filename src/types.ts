/** Letter-name pitch id, e.g. `C4` or `C#4`. */
export type PitchId = string;

export type PracticeSetMode = "random" | "stepwise";

export interface NoteResult {
  target: PitchId;
  tapped: PitchId;
  correct: boolean;
  /** Milliseconds from note shown to tap. */
  responseMs: number;
}

export interface RoundSummary {
  total: number;
  correctCount: number;
  /** Accuracy as a percentage 0–100. */
  accuracyPercent: number;
  /** Average response time in ms across all notes; null if no results. */
  averageResponseMs: number | null;
}
