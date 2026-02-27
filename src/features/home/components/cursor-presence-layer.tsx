import { formatCursorPosition, pickColor } from "@/features/home/lib/cursor";
import type { CursorState } from "@/features/home/types";
import { For, type JSX } from "solid-js";

type CursorPresenceLayerProps = {
  selfId: string;
  cursors: CursorState[];
  isStatsHovered: boolean;
};

export function CursorPresenceLayer(props: CursorPresenceLayerProps) {
  return (
    <div class="pointer-events-none fixed inset-0 z-40" aria-hidden="true">
      <For each={props.cursors}>
        {(cursor) => {
          const position = formatCursorPosition(cursor.x, cursor.y);
          const style = {
            left: `${cursor.x}px`,
            top: `${cursor.y}px`,
            "background-color": cursor.color ?? pickColor(cursor.id),
            "border-color": cursor.color ?? pickColor(cursor.id),
          } as JSX.CSSProperties;

          return (
            <div
              class={`absolute -mt-1 -ml-1 size-2 rounded-full border shadow-[0_0_0_2px_rgba(8,11,18,0.64)] ${
                cursor.id === props.selfId ? "opacity-45" : ""
              }`}
              style={style}
            >
              {!props.isStatsHovered ? (
                <span class="absolute top-1/2 left-3 flex -translate-y-1/2 items-center gap-1 whitespace-nowrap font-mono text-[0.5rem] tracking-[0.08em] uppercase">
                  <span class="text-slate-300/60">
                    {cursor.id === props.selfId ? "you" : cursor.id.slice(0, 4)}
                  </span>
                  <span class="text-slate-100/84">{position}</span>
                </span>
              ) : null}
            </div>
          );
        }}
      </For>
    </div>
  );
}
