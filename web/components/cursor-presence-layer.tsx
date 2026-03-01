import { clsx } from "clsx";
import { formatCursorPosition, pickColor } from "@web/lib/cursor";
import type { CursorState } from "@web/types/home";
import { For, createMemo, type JSX } from "solid-js";

type CursorPresenceLayerProps = {
  selfId: string | null;
  cursors: CursorState[];
  isStatsHovered: boolean;
};

type CursorMarkerProps = {
  cursor: () => CursorState | undefined;
  selfId: string | null;
  isStatsHovered: boolean;
  smooth: boolean;
};

function CursorMarker(props: CursorMarkerProps) {
  const x = () => props.cursor()?.x ?? 0;
  const y = () => props.cursor()?.y ?? 0;
  const position = () => formatCursorPosition(x(), y());
  const style = createMemo(() => {
    const cursor = props.cursor();
    if (!cursor) {
      return {} as JSX.CSSProperties;
    }

    return {
      "--cursor-x": `${x()}px`,
      "--cursor-y": `${y()}px`,
      "--cursor-color": cursor.color ?? pickColor(cursor.id),
    } as JSX.CSSProperties;
  });
  const cursorLabel = () => props.cursor()?.id ?? "";
  const isSelf = () => cursorLabel() === props.selfId;

  if (!props.cursor()) {
    return null;
  }

  return (
    <div
      class={clsx(
        "absolute top-0 left-0 size-2 rounded-full border shadow-[0_0_0_2px_rgba(8,11,18,0.64)] border-(--cursor-color) bg-(--cursor-color) transform-[translate3d(var(--cursor-x,0px),var(--cursor-y,0px),0)_translate(-50%,-50%)] will-change-transform",
        props.smooth
          ? "transition-transform duration-180 linear motion-reduce:transition-none"
          : "transition-none",
        isSelf() && "opacity-45",
      )}
      style={style()}
    >
      {!props.isStatsHovered ? (
        <span class="absolute top-1/2 left-3 flex -translate-y-1/2 items-center gap-1 whitespace-nowrap font-mono text-[0.5rem] tracking-[0.08em] uppercase">
          <span class="text-slate-300/60">{isSelf() ? "you" : cursorLabel().slice(0, 4)}</span>
          <span class="text-slate-100/84">{position()}</span>
        </span>
      ) : null}
    </div>
  );
}

export function CursorPresenceLayer(props: CursorPresenceLayerProps) {
  const cursorsById = createMemo<Record<string, CursorState>>(() =>
    Object.fromEntries(props.cursors.map((cursor) => [cursor.id, cursor])),
  );
  const cursorIds = createMemo(() => props.cursors.map((cursor) => cursor.id));

  return (
    <div class="pointer-events-none fixed inset-0 z-40" aria-hidden="true">
      <For each={cursorIds()}>
        {(cursorId) => {
          return (
            <CursorMarker
              cursor={() => cursorsById()[cursorId]}
              selfId={props.selfId}
              isStatsHovered={props.isStatsHovered}
              smooth={cursorId !== props.selfId}
            />
          );
        }}
      </For>
    </div>
  );
}
