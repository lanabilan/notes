import { PIANO_BLACK_KEYS, PIANO_WHITE_KEYS } from "@/lib/practice";
import { cn } from "@/lib/utils";
import type { PitchId } from "@/types";

interface PianoKeyboardProps {
  onNote: (pitch: PitchId) => void;
  disabled?: boolean;
  highlightPitch?: PitchId | null;
  className?: string;
}

const WHITE_COUNT = PIANO_WHITE_KEYS.length;

export default function PianoKeyboard({
  onNote,
  disabled = false,
  highlightPitch = null,
  className,
}: PianoKeyboardProps) {
  return (
    <div className={cn("w-full max-w-full overflow-hidden", className)}>
      <div className="relative flex h-28 w-full touch-manipulation sm:h-32">
        {PIANO_WHITE_KEYS.map((pitch) => {
          const highlighted = highlightPitch === pitch;
          return (
            <button
              key={pitch}
              type="button"
              disabled={disabled}
              aria-label={pitch}
              onClick={() => {
                onNote(pitch);
              }}
              className={cn(
                "border-border bg-card relative h-full min-w-0 flex-1 border border-l-0 first:rounded-l-md first:border-l last:rounded-r-md",
                "active:bg-accent disabled:pointer-events-none disabled:opacity-50",
                highlighted && "bg-accent ring-ring z-10 ring-2 ring-inset",
              )}
            />
          );
        })}

        {PIANO_BLACK_KEYS.map(({ pitch, afterWhiteIndex }) => {
          const highlighted = highlightPitch === pitch;
          const leftPercent = ((afterWhiteIndex + 1) / WHITE_COUNT) * 100;
          const widthPercent = (0.62 / WHITE_COUNT) * 100;
          return (
            <button
              key={pitch}
              type="button"
              disabled={disabled}
              aria-label={pitch}
              onClick={() => {
                onNote(pitch);
              }}
              style={{
                left: `calc(${leftPercent}% - ${widthPercent / 2}%)`,
                width: `${widthPercent}%`,
              }}
              className={cn(
                "bg-foreground absolute top-0 z-20 h-[58%] rounded-b-sm",
                "active:opacity-80 disabled:pointer-events-none disabled:opacity-50",
                highlighted && "ring-ring ring-offset-background ring-2 ring-offset-1",
              )}
            />
          );
        })}
      </div>
    </div>
  );
}
