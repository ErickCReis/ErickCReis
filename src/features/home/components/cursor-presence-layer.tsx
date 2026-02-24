import { formatCursorPosition, pickColor } from "@/features/home/lib/cursor";
import type { CursorState } from "@/features/home/types";
import type { CSSProperties } from "react";

type CursorPresenceLayerProps = {
  selfId: string;
  cursors: CursorState[];
  isStatsHovered: boolean;
};

export function CursorPresenceLayer({ selfId, cursors, isStatsHovered }: CursorPresenceLayerProps) {
  return (
    <div className="pointer-events-none fixed inset-0 z-40" aria-hidden="true">
      {cursors.map((cursor) => {
        const position = formatCursorPosition(cursor.x, cursor.y);
        const style = {
          left: `${cursor.x}px`,
          top: `${cursor.y}px`,
          backgroundColor: cursor.color ?? pickColor(cursor.id),
          borderColor: cursor.color ?? pickColor(cursor.id),
        } as CSSProperties;

        return (
          <div
            key={cursor.id}
            className={`absolute -mt-1 -ml-1 size-2 rounded-full border shadow-[0_0_0_2px_rgba(8,11,18,0.64)] ${
              cursor.id === selfId ? "opacity-45" : ""
            }`}
            style={style}
          >
            {!isStatsHovered ? (
              <span className="absolute top-1/2 left-3 flex -translate-y-1/2 items-center gap-1 whitespace-nowrap font-mono text-[0.5rem] tracking-[0.08em] uppercase">
                <span className="text-slate-300/60">{cursor.id === selfId ? "you" : cursor.id.slice(0, 4)}</span>
                <span className="text-slate-100/84">{position}</span>
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
