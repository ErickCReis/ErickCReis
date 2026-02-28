import { formatCursorPosition, pickColor } from "@/lib/cursor";
import type { CursorState } from "@/types/home";
import { createTween } from "@solid-primitives/tween";
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
  tween: boolean;
};

function CursorMarker(props: CursorMarkerProps) {
  const tweenX = createTween(() => props.cursor()?.x ?? 0, { duration: 200 });
  const tweenY = createTween(() => props.cursor()?.y ?? 0, { duration: 200 });

  const x = () => (props.tween ? tweenX() : (props.cursor()?.x ?? 0));
  const y = () => (props.tween ? tweenY() : (props.cursor()?.y ?? 0));
  const position = () => formatCursorPosition(x(), y());
  const style = createMemo(() => {
    const cursor = props.cursor();
    if (!cursor) {
      return {} as JSX.CSSProperties;
    }

    return {
      left: `${x()}px`,
      top: `${y()}px`,
      "background-color": cursor.color ?? pickColor(cursor.id),
      "border-color": cursor.color ?? pickColor(cursor.id),
    } as JSX.CSSProperties;
  });
  const cursorLabel = () => props.cursor()?.id ?? "";
  const isSelf = () => cursorLabel() === props.selfId;

  if (!props.cursor()) {
    return null;
  }

  return (
    <div
      class={`absolute -mt-1 -ml-1 size-2 rounded-full border shadow-[0_0_0_2px_rgba(8,11,18,0.64)] ${
        isSelf() ? "opacity-45" : ""
      }`}
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
              tween={cursorId !== props.selfId}
            />
          );
        }}
      </For>
    </div>
  );
}
