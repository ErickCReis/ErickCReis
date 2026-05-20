import { createMousePosition, getPositionToScreen } from "@solid-primitives/mouse";
import { throttle } from "@solid-primitives/scheduled";
import {
  cursorBytesKey,
  formatCursorSlot,
  normalizedCursorToViewportPoint,
  packCursorPosition,
} from "@shared/cursor";
import { pickCursorSlotColor } from "@web/lib/cursor";
import { publishCursor, subscribeCursor } from "@web/lib/api";
import type { CursorState } from "@web/types/home";
import { createEffect, createMemo, createSignal, onCleanup, onMount } from "solid-js";

function getViewport() {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

export function useCursorPresence() {
  const [cursorsBySlot, setCursorsBySlot] = createSignal<Record<number, CursorState>>({});
  const [localSelfPoint, setLocalSelfPoint] = createSignal<{ x: number; y: number } | null>(null);
  const mouse = createMousePosition(window, { followTouch: false });
  let lastPublishedCursorKey: string | null = null;

  const publishCursorPosition = (point: { x: number; y: number }) => {
    const packedPosition = packCursorPosition(point, getViewport());
    const packedKey = cursorBytesKey(packedPosition);
    if (packedKey === lastPublishedCursorKey) {
      return;
    }

    if (publishCursor(packedPosition)) {
      lastPublishedCursorKey = packedKey;
    }
  };

  const throttledPublishCursorPosition = throttle(publishCursorPosition, 50);

  createEffect(() => {
    const x = mouse.x;
    const y = mouse.y;
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return;
    }

    const point = getPositionToScreen(x, y);
    setLocalSelfPoint(point);
    throttledPublishCursorPosition(point);
  });

  onCleanup(() => throttledPublishCursorPosition.clear());

  onMount(() => {
    const unsubscribe = subscribeCursor((event) => {
      if (event.type === "leave") {
        setCursorsBySlot((previous) => {
          const next = { ...previous };
          delete next[event.slot];
          return next;
        });
        return;
      }

      if (event.type !== "move") {
        return;
      }

      const point = normalizedCursorToViewportPoint(event.position, getViewport());
      setCursorsBySlot((previous) => ({
        ...previous,
        [event.slot]: {
          slot: event.slot,
          label: formatCursorSlot(event.slot),
          x: point.x,
          y: point.y,
          color: pickCursorSlotColor(event.slot),
          updatedAt: Date.now(),
          isSelf: false,
        },
      }));
    });

    const staleInterval = window.setInterval(() => {
      const cutoff = Date.now() - 7000;
      setCursorsBySlot((previous) =>
        Object.fromEntries(
          Object.entries(previous).filter(([, cursor]) => cursor.updatedAt >= cutoff),
        ),
      );
    }, 2200);

    onCleanup(() => {
      unsubscribe();
      window.clearInterval(staleInterval);
    });
  });

  const cursors = createMemo(() => {
    const remoteCursors = Object.values(cursorsBySlot());
    const localPoint = localSelfPoint();
    if (!localPoint) {
      return remoteCursors;
    }

    return [
      ...remoteCursors,
      {
        slot: null,
        label: "you",
        x: localPoint.x,
        y: localPoint.y,
        color: pickCursorSlotColor(0),
        updatedAt: Date.now(),
        isSelf: true,
      },
    ];
  });

  return {
    cursors,
  };
}
