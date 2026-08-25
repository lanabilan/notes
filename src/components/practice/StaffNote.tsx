import { useEffect, useRef } from "react";

import { toVexKey } from "@/lib/practice";
import { cn } from "@/lib/utils";
import type { PitchId } from "@/types";

interface StaffNoteProps {
  pitch: PitchId;
  className?: string;
}

const STAFF_HEIGHT = 148;

/**
 * Renders one treble-clef natural (or accidental) note via VexFlow.
 * Loads VexFlow only inside the effect so SSR / Workers never evaluate it.
 */
export default function StaffNote({ pitch, className }: StaffNoteProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const active: { current: boolean } = { current: true };
    const isActive = () => active.current;

    async function draw(width: number) {
      if (!isActive() || width <= 0) return;
      const mount = containerRef.current;
      if (!mount) return;

      const VexFlow = (await import("vexflow")).default;
      if (!isActive()) return;

      await VexFlow.loadFonts("Bravura", "Academico");
      VexFlow.setFonts("Bravura", "Academico");
      if (!isActive()) return;

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

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries.at(0);
      if (entry === undefined) return;
      void draw(entry.contentRect.width);
    });
    resizeObserver.observe(container);

    return () => {
      active.current = false;
      resizeObserver.disconnect();
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
