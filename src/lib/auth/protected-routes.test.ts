import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { isProtectedPath } from "@/lib/auth/protected-routes";

/**
 * Product paths (FR-007 / never a wall): guests reach practice and auth/API
 * without a login redirect; dashboard stays gated. Not derived from the
 * prefix list. Live prefix rule is startsWith (current contract, not PRD).
 */
const PATH_ROWS: readonly { path: string; protected: boolean }[] = [
  { path: "/", protected: false },
  { path: "/auth/signin", protected: false },
  { path: "/api/profile", protected: false },
  { path: "/dashboard", protected: true },
];

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");

function readRepoFile(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

describe("isProtectedPath", () => {
  it.each(PATH_ROWS)("$path → protected=$protected", ({ path, protected: isGated }) => {
    expect(isProtectedPath(path)).toBe(isGated);
  });
});

describe("home does not redirect guests", () => {
  it("index.astro mounts PracticeShell and does not redirect", () => {
    const source = readRepoFile("src/pages/index.astro");
    expect(source).toContain("PracticeShell");
    expect(source).not.toMatch(/Astro\.redirect|context\.redirect/);
  });

  it("PracticeShell.astro does not redirect unauthenticated users", () => {
    const source = readRepoFile("src/components/PracticeShell.astro");
    expect(source).not.toMatch(/Astro\.redirect|context\.redirect/);
  });
});
