/** Natural note letter names. */
type Natural = "C" | "D" | "E" | "F" | "G" | "A" | "B";

/** Octaves used by the guest piano (C4–B5). */
type Octave = "4" | "5";

/** Letters that have a sharp key on the guest piano. */
type SharpOf = "C" | "D" | "F" | "G" | "A";

/** Letter-name pitch id, e.g. `C4` or `C#4`. */
export type PitchId = `${Natural}${Octave}` | `${SharpOf}#${Octave}`;

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
