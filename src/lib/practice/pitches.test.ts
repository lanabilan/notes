import { describe, expect, it } from "vitest";

import { toVexKey } from "@/lib/practice";
import type { PitchId } from "@/types";

/**
 * Conventional VexFlow keys for treble naturals C4–G5 (FR-001).
 * Independent of DRILL_NATURALS and of toVexKey's parser.
 */
const VEX_KEYS: readonly { pitch: PitchId; vexKey: string }[] = [
  { pitch: "C4", vexKey: "c/4" },
  { pitch: "D4", vexKey: "d/4" },
  { pitch: "E4", vexKey: "e/4" },
  { pitch: "F4", vexKey: "f/4" },
  { pitch: "G4", vexKey: "g/4" },
  { pitch: "A4", vexKey: "a/4" },
  { pitch: "B4", vexKey: "b/4" },
  { pitch: "C5", vexKey: "c/5" },
  { pitch: "D5", vexKey: "d/5" },
  { pitch: "E5", vexKey: "e/5" },
  { pitch: "F5", vexKey: "f/5" },
  { pitch: "G5", vexKey: "g/5" },
];

describe("toVexKey", () => {
  it.each(VEX_KEYS)("$pitch → $vexKey", ({ pitch, vexKey }) => {
    expect(toVexKey(pitch)).toBe(vexKey);
  });
});
