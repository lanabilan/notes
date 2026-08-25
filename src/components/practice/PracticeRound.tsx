import type { ReactNode } from "react";

import PianoKeyboard from "@/components/practice/PianoKeyboard";
import StaffNote from "@/components/practice/StaffNote";
import { usePracticeRound } from "@/components/hooks/usePracticeRound";
import { ROUND_LENGTH } from "@/lib/practice";
import { cn } from "@/lib/utils";
import type { PracticeSetMode } from "@/types";

function modeLabel(mode: PracticeSetMode): string {
  return mode === "random" ? "random" : "stepwise";
}

function promptFor(state: ReturnType<typeof usePracticeRound>): string {
  if (state.uiPhase === "summary") {
    return "Round complete — practice again or switch set";
  }
  if (state.uiPhase === "wrong") {
    return state.revealed ? `Correct note: ${state.target}` : "Not quite — reveal the answer or go next";
  }
  return "Tap the key that matches the note";
}

function ActionButton({
  children,
  onClick,
  variant = "primary",
  className,
}: {
  children: ReactNode;
  onClick: () => void;
  variant?: "primary" | "secondary" | "outline";
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-9 items-center justify-center rounded-md px-4 text-sm font-medium transition-colors",
        "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
        variant === "primary" && "bg-primary text-primary-foreground hover:bg-primary/90",
        variant === "secondary" && "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        variant === "outline" && "border-border bg-background hover:bg-accent border",
        className,
      )}
    >
      {children}
    </button>
  );
}

/**
 * Full guest practice round island (score, staff, piano, summary).
 * Mount with `client:only="react"`.
 */
export default function PracticeRound() {
  const round = usePracticeRound();
  const pianoDisabled = round.uiPhase !== "playing";
  const highlightPitch = round.revealed ? round.target : null;

  return (
    <>
      <p className="text-muted-foreground mx-4 mt-1 shrink-0 text-sm sm:text-base">{promptFor(round)}</p>

      <section className="border-border mx-4 shrink-0 border-b py-3" aria-label="Score">
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Score</p>
        <div className="mt-1 flex min-h-8 flex-wrap items-baseline gap-x-3 gap-y-1">
          {round.uiPhase === "summary" && round.summary ? (
            <>
              <p className="text-foreground text-sm">Accuracy {Math.round(round.summary.accuracyPercent)}%</p>
              <p className="text-muted-foreground text-sm">
                Avg{" "}
                {round.summary.averageResponseMs === null ? "—" : `${Math.round(round.summary.averageResponseMs)} ms`}
              </p>
            </>
          ) : (
            <>
              <p className="text-foreground text-sm">
                Note {round.noteNumber}/{ROUND_LENGTH}
              </p>
              {round.lastFeedback === "correct" ? <p className="text-foreground text-sm font-medium">Correct</p> : null}
              {round.lastFeedback === "wrong" ? <p className="text-destructive text-sm">Wrong</p> : null}
            </>
          )}
        </div>
      </section>

      {round.uiPhase === "summary" ? (
        <section className="mx-4 flex flex-1 flex-col justify-center gap-4 py-6" aria-label="Summary">
          <div className="flex flex-col gap-2 sm:flex-row">
            <ActionButton
              className="w-full sm:w-auto"
              onClick={() => {
                round.startRound(round.mode);
              }}
            >
              Practice again
            </ActionButton>
            <ActionButton
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => {
                round.startRound(round.otherMode);
              }}
            >
              Next set: {modeLabel(round.otherMode)}
            </ActionButton>
          </div>
          <p className="text-muted-foreground text-xs">Set mode was {modeLabel(round.mode)}</p>
        </section>
      ) : (
        <>
          <section className="border-border mx-4 flex min-h-0 flex-1 flex-col border-b py-3" aria-label="Staff">
            <p className="text-muted-foreground shrink-0 text-xs font-medium tracking-wide uppercase">Staff</p>
            <div className="mt-2 flex min-h-0 flex-1 items-center">
              <StaffNote pitch={round.target} />
            </div>
          </section>

          <section className="mx-4 flex min-h-0 flex-1 flex-col py-3 pb-4" aria-label="Piano">
            <p className="text-muted-foreground shrink-0 text-xs font-medium tracking-wide uppercase">Piano</p>
            {round.uiPhase === "wrong" ? (
              <div className="mt-2 mb-3 flex flex-wrap gap-2">
                <ActionButton variant="secondary" onClick={round.reveal}>
                  Reveal
                </ActionButton>
                <ActionButton onClick={round.nextAfterWrong}>Next</ActionButton>
              </div>
            ) : null}
            <div className="mt-2 flex min-h-0 flex-1 flex-col justify-end">
              <PianoKeyboard onNote={round.onNote} disabled={pianoDisabled} highlightPitch={highlightPitch} />
            </div>
          </section>
        </>
      )}
    </>
  );
}
