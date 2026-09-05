import { useEffect, useRef, useState } from "react";

import { ROUND_LENGTH, createNoteResult, generateRound, summarizeRound } from "@/lib/practice";
import type { NoteResult, PitchId, PracticeSetMode, RoundSummary } from "@/types";

/** Hold the judged note so ear and eye agree; slightly longer than the playback envelope. */
const CORRECT_DWELL_MS = 400;

export type PracticeUiPhase = "playing" | "correct" | "wrong" | "summary";

export interface PracticeRoundState {
  mode: PracticeSetMode;
  notes: PitchId[];
  index: number;
  results: NoteResult[];
  uiPhase: PracticeUiPhase;
  revealed: boolean;
  lastFeedback: "correct" | "wrong" | null;
  target: PitchId;
  noteNumber: number;
  summary: RoundSummary | null;
  otherMode: PracticeSetMode;
  roundId: number;
  startRound: (nextMode: PracticeSetMode) => void;
  onNote: (tapped: PitchId) => NoteResult | undefined;
  reveal: () => void;
  nextAfterWrong: () => void;
}

function otherSetMode(mode: PracticeSetMode): PracticeSetMode {
  return mode === "random" ? "stepwise" : "random";
}

export function usePracticeRound(initialMode: PracticeSetMode = "random"): PracticeRoundState {
  const [mode, setMode] = useState<PracticeSetMode>(initialMode);
  const [notes, setNotes] = useState<PitchId[]>(() => generateRound(initialMode));
  const [roundId, setRoundId] = useState(1);
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<NoteResult[]>([]);
  const [uiPhase, setUiPhase] = useState<PracticeUiPhase>("playing");
  const [revealed, setRevealed] = useState(false);
  const [lastFeedback, setLastFeedback] = useState<"correct" | "wrong" | null>(null);
  const shownAtRef = useRef(0);
  const dwellTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const target = notes.at(index) ?? "C4";

  function clearDwellTimeout() {
    if (dwellTimeoutRef.current !== null) {
      clearTimeout(dwellTimeoutRef.current);
      dwellTimeoutRef.current = null;
    }
  }

  useEffect(() => {
    if (uiPhase === "playing") {
      shownAtRef.current = performance.now();
    }
  }, [uiPhase, index, notes]);

  useEffect(() => {
    return () => {
      if (dwellTimeoutRef.current !== null) {
        clearTimeout(dwellTimeoutRef.current);
      }
    };
  }, []);

  function goToNext(nextResults: NoteResult[]) {
    if (nextResults.length >= ROUND_LENGTH) {
      setUiPhase("summary");
      setLastFeedback(null);
      setRevealed(false);
      return;
    }
    setIndex(nextResults.length);
    setUiPhase("playing");
    setLastFeedback(null);
    setRevealed(false);
  }

  function startRound(nextMode: PracticeSetMode) {
    clearDwellTimeout();
    setRoundId((id) => id + 1);
    setMode(nextMode);
    setNotes(generateRound(nextMode));
    setIndex(0);
    setResults([]);
    setUiPhase("playing");
    setRevealed(false);
    setLastFeedback(null);
  }

  function onNote(tapped: PitchId): NoteResult | undefined {
    if (uiPhase !== "playing") {
      return undefined;
    }
    const responseMs = Math.max(0, performance.now() - shownAtRef.current);
    const result = createNoteResult(target, tapped, responseMs);
    const nextResults = [...results, result];
    setResults(nextResults);
    if (result.correct) {
      setLastFeedback("correct");
      setUiPhase("correct");
      clearDwellTimeout();
      dwellTimeoutRef.current = setTimeout(() => {
        dwellTimeoutRef.current = null;
        goToNext(nextResults);
      }, CORRECT_DWELL_MS);
    } else {
      setLastFeedback("wrong");
      setUiPhase("wrong");
    }
    return result;
  }

  function reveal() {
    if (uiPhase !== "wrong") return;
    setRevealed(true);
  }

  function nextAfterWrong() {
    if (uiPhase !== "wrong") return;
    setLastFeedback(null);
    goToNext(results);
  }

  return {
    mode,
    notes,
    index,
    results,
    uiPhase,
    revealed,
    lastFeedback,
    target,
    noteNumber: uiPhase === "summary" ? ROUND_LENGTH : index + 1,
    summary: uiPhase === "summary" ? summarizeRound(results) : null,
    otherMode: otherSetMode(mode),
    roundId,
    startRound,
    onNote,
    reveal,
    nextAfterWrong,
  };
}
