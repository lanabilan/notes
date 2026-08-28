import { useEffect, useRef } from "react";

import { toVexKey } from "@/lib/practice";
import { cn } from "@/lib/utils";
import type { PitchId } from "@/types";

interface StaffNoteProps {
  pitch: PitchId;
  className?: string;
}

const STAFF_HEIGHT = 132;

type VexFlowModule = (typeof import("vexflow"))["default"];

/** Load VexFlow + notation fonts once; redraws reuse the same module. */
let vexFlowReady: Promise<VexFlowModule> | null = null;

function loadVexFlow(): Promise<VexFlowModule> {
  vexFlowReady ??= (async () => {
    try {
      const VexFlow = (await import("vexflow")).default;
      await VexFlow.loadFonts("Bravura", "Academico");
      VexFlow.setFonts("Bravura", "Academico");
      return VexFlow;
    } catch (error) {
      vexFlowReady = null;
      throw error;
    }
  })();
  return vexFlowReady;
}

/**
 * Renders one treble-clef natural (or accidental) note via VexFlow.
 * Loads VexFlow only inside the effect so SSR / Workers never evaluate it.
 */
export default function StaffNote({ pitch, className }: StaffNoteProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const generation: { current: number } = { current: 0 };
    const effectId = ++generation.current;
    const isCurrent = () => generation.current === effectId;

    function draw(width: number, VexFlow: VexFlowModule) {
      if (!isCurrent() || width <= 0) return;
      const target = containerRef.current;
      if (!target) return;

      const { Renderer, Stave, StaveNote, Formatter } = VexFlow;

      target.innerHTML = "";
      const renderer = new Renderer(target, Renderer.Backends.SVG);
      renderer.resize(width, STAFF_HEIGHT);
      const context = renderer.getContext();

      const stave = new Stave(8, 18, Math.max(width - 16, 40));
      stave.addClef("treble");
      stave.setContext(context).draw();

      const note = new StaveNote({
        keys: [toVexKey(pitch)],
        duration: "w",
      });
      Formatter.FormatAndDraw(context, stave, [note]);
    }

    let resizeObserver: ResizeObserver | undefined;

    void (async () => {
      try {
        const VexFlow = await loadVexFlow();
        if (!isCurrent()) return;

        resizeObserver = new ResizeObserver((entries) => {
          const entry = entries.at(0);
          if (entry === undefined) return;
          draw(entry.contentRect.width, VexFlow);
        });
        resizeObserver.observe(container);
        draw(container.clientWidth, VexFlow);
      } catch {
        // Leave staff empty; avoid unhandled rejection on font/module failure.
        if (!isCurrent()) return;
      }
    })();

    return () => {
      generation.current += 1;
      resizeObserver?.disconnect();
      container.innerHTML = "";
    };
  }, [pitch]);

  return (
    <div
      ref={containerRef}
      className={cn("w-full max-w-full overflow-hidden", className)}
      style={{ minHeight: STAFF_HEIGHT }}
      role="img"
      aria-label={`Staff note ${pitch}`}
    />
  );
}
