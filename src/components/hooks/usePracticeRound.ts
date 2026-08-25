import { useEffect, useRef, useState } from "react";

import { ROUND_LENGTH, createNoteResult, generateRound, summarizeRound } from "@/lib/practice";
import type { NoteResult, PitchId, PracticeSetMode, RoundSummary } from "@/types";

export type PracticeUiPhase = "playing" | "wrong" | "summary";

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
  startRound: (nextMode: PracticeSetMode) => void;
  onNote: (tapped: PitchId) => void;
  reveal: () => void;
  nextAfterWrong: () => void;
}

function otherSetMode(mode: PracticeSetMode): PracticeSetMode {
  return mode === "random" ? "stepwise" : "random";
}

export function usePracticeRound(): PracticeRoundState {
  const [mode, setMode] = useState<PracticeSetMode>("random");
  const [notes, setNotes] = useState<PitchId[]>(() => generateRound("random"));
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<NoteResult[]>([]);
  const [uiPhase, setUiPhase] = useState<PracticeUiPhase>("playing");
  const [revealed, setRevealed] = useState(false);
  const [lastFeedback, setLastFeedback] = useState<"correct" | "wrong" | null>(null);
  const shownAtRef = useRef(0);

  const target = notes.at(index) ?? "C4";

  useEffect(() => {
    if (uiPhase === "playing") {
      shownAtRef.current = performance.now();
    }
  }, [uiPhase, index, notes]);

  function goToNext(nextResults: NoteResult[]) {
    if (nextResults.length >= ROUND_LENGTH) {
      setUiPhase("summary");
      setLastFeedback(null);
      setRevealed(false);
      return;
    }
    setIndex(nextResults.length);
    setUiPhase("playing");
    setRevealed(false);
  }

  function startRound(nextMode: PracticeSetMode) {
    setMode(nextMode);
    setNotes(generateRound(nextMode));
    setIndex(0);
    setResults([]);
    setUiPhase("playing");
    setRevealed(false);
    setLastFeedback(null);
  }

  function onNote(tapped: PitchId) {
    if (uiPhase !== "playing") return;
    const responseMs = Math.max(0, performance.now() - shownAtRef.current);
    const result = createNoteResult(target, tapped, responseMs);
    const nextResults = [...results, result];
    setResults(nextResults);
    if (result.correct) {
      setLastFeedback("correct");
      goToNext(nextResults);
    } else {
      setLastFeedback("wrong");
      setUiPhase("wrong");
    }
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
    startRound,
    onNote,
    reveal,
    nextAfterWrong,
  };
}
