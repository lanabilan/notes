import { useState } from "react";

import PianoKeyboard from "@/components/practice/PianoKeyboard";
import StaffNote from "@/components/practice/StaffNote";
import type { PitchId } from "@/types";

/** Static sample pitch for Phase 2 shell wiring; Phase 3 replaces with the round engine. */
const SAMPLE_PITCH: PitchId = "E4";

/**
 * Hydrated practice regions (score placeholder + staff + piano).
 * Mount with `client:only="react"` so VexFlow never evaluates on the server.
 */
export default function PracticeStage() {
  const [lastTap, setLastTap] = useState<PitchId | null>(null);

  return (
    <>
      <section className="border-border mx-4 shrink-0 border-b py-3" aria-label="Score">
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Score</p>
        <div className="mt-1 min-h-8">
          {lastTap ? (
            <p className="text-foreground text-sm">Last key: {lastTap}</p>
          ) : (
            <p className="text-muted-foreground text-sm">Tap a key to begin</p>
          )}
        </div>
      </section>

      <section className="border-border mx-4 flex min-h-0 flex-1 flex-col border-b py-3" aria-label="Staff">
        <p className="text-muted-foreground shrink-0 text-xs font-medium tracking-wide uppercase">Staff</p>
        <div className="mt-2 flex min-h-0 flex-1 items-center">
          <StaffNote pitch={SAMPLE_PITCH} />
        </div>
      </section>

      <section className="mx-4 flex min-h-0 flex-1 flex-col py-3 pb-4" aria-label="Piano">
        <p className="text-muted-foreground shrink-0 text-xs font-medium tracking-wide uppercase">Piano</p>
        <div className="mt-2 flex min-h-0 flex-1 flex-col justify-end">
          <PianoKeyboard onNote={setLastTap} />
        </div>
      </section>
    </>
  );
}
