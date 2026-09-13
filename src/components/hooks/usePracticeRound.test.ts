// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { usePracticeRound } from "@/components/hooks/usePracticeRound";
import type { PitchId } from "@/types";

/** C4 and D4 are different treble naturals in the drill set (FR-001), not derived from isCorrectTap. */
function missFor(target: PitchId): PitchId {
  return target === "C4" ? "D4" : "C4";
}

describe("usePracticeRound wrong-answer sequencing", () => {
  it("keeps revealed false and stays on the note after a wrong tap", () => {
    const { result } = renderHook(() => usePracticeRound());
    const indexBefore = result.current.index;
    const targetBefore = result.current.target;

    act(() => {
      result.current.onNote(missFor(result.current.target));
    });

    expect(result.current.uiPhase).toBe("wrong");
    expect(result.current.revealed).toBe(false);
    expect(result.current.index).toBe(indexBefore);
    expect(result.current.target).toBe(targetBefore);
    // lastFeedback "wrong" is score feedback, not reveal (FR-003 / Risk #7).
    expect(result.current.lastFeedback).toBe("wrong");
  });

  it("sets revealed only after reveal() while staying on the same note", () => {
    const { result } = renderHook(() => usePracticeRound());

    act(() => {
      result.current.onNote(missFor(result.current.target));
    });
    const indexAfterWrong = result.current.index;

    act(() => {
      result.current.reveal();
    });

    expect(result.current.revealed).toBe(true);
    expect(result.current.uiPhase).toBe("wrong");
    expect(result.current.index).toBe(indexAfterWrong);
  });

  it("advances on Next without Reveal and clears revealed", () => {
    const { result } = renderHook(() => usePracticeRound());
    const indexBefore = result.current.index;

    act(() => {
      result.current.onNote(missFor(result.current.target));
    });
    act(() => {
      result.current.nextAfterWrong();
    });

    expect(result.current.revealed).toBe(false);
    expect(result.current.uiPhase).toBe("playing");
    expect(result.current.index).toBe(indexBefore + 1);
  });

  it("no-ops reveal and Next while playing", () => {
    const { result } = renderHook(() => usePracticeRound());

    act(() => {
      result.current.reveal();
      result.current.nextAfterWrong();
    });

    expect(result.current.uiPhase).toBe("playing");
    expect(result.current.revealed).toBe(false);
    expect(result.current.index).toBe(0);
    expect(result.current.lastFeedback).toBeNull();
  });

  it("reaches summary after the 10th wrong Next with revealed still false", () => {
    const { result } = renderHook(() => usePracticeRound());

    for (let n = 0; n < 10; n += 1) {
      act(() => {
        result.current.onNote(missFor(result.current.target));
      });
      act(() => {
        result.current.nextAfterWrong();
      });
    }

    expect(result.current.uiPhase).toBe("summary");
    expect(result.current.revealed).toBe(false);
  });
});
