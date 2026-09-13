import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { PIANO_WHITE_KEYS } from "@/lib/practice";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");

function readRepoFile(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

describe("PianoKeyboard phone fit", () => {
  it("scales with the container and has no px min-width", () => {
    const source = readRepoFile("src/components/practice/PianoKeyboard.tsx");

    expect(source).toContain("w-full");
    expect(source).toContain("aspect-[16/5]");
    expect(source).toContain("min-w-0");
    expect(source).toContain("flex-1");
    expect(source).toContain("min-h-11");
    expect(source).toMatch(/width:\s*`\$\{widthPercent\}%`/);

    expect(source).not.toMatch(/\b100vw\b/);
    expect(source).not.toMatch(/min-w-\[/);
    expect(source).not.toMatch(/w-\[\d+px\]/);
  });

  it("renders two octaves of white keys (C4–B5)", () => {
    expect(PIANO_WHITE_KEYS).toHaveLength(14);
  });
});
