import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");

function readRepoFile(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

describe("PracticeRound reveal wiring", () => {
  it("gates highlightPitch and Correct note: on revealed", () => {
    const source = readRepoFile("src/components/practice/PracticeRound.tsx");

    expect(source).toMatch(/const highlightPitch =\s*round\.revealed\s*\?\s*round\.target\s*:\s*null/);

    const gatedCorrectNote = source.match(/state\.revealed\s*\?\s*`[^`]*Correct note:[^`]*`/g) ?? [];
    const allCorrectNote = source.match(/Correct note:/g) ?? [];
    expect(gatedCorrectNote.length).toBe(allCorrectNote.length);
    expect(allCorrectNote.length).toBeGreaterThan(0);
  });
});
