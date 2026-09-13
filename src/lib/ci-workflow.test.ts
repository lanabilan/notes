import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

function readRepoFile(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function stepIndex(source: string, run: string): number {
  return source.search(new RegExp(`^[ \\t]*- run: ${run}$`, "m"));
}

describe("CI quality gate", () => {
  it("runs npm test after lint and before build, without Supabase env", () => {
    const source = readRepoFile(".github/workflows/ci.yml");
    const lintAt = stepIndex(source, "npm run lint");
    const testAt = stepIndex(source, "npm test");
    const buildAt = stepIndex(source, "npm run build");

    expect(lintAt).toBeGreaterThan(-1);
    expect(testAt).toBeGreaterThan(lintAt);
    expect(buildAt).toBeGreaterThan(testAt);

    const testStep = /^[ \t]*- run: npm test$(?:\n(?![ \t]*- ).+)*/m.exec(source);
    expect(testStep?.[0]).toBeDefined();
    expect(testStep?.[0]).not.toMatch(/SUPABASE_URL|SUPABASE_KEY/);
  });

  it("does not load Astro getViteConfig in Vitest", () => {
    const source = readRepoFile("vitest.config.ts");
    expect(source).not.toMatch(/astro\/config|getViteConfig/);
  });
});
