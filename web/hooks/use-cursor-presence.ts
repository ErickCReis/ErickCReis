import { createMousePosition } from "@solid-primitives/mouse";
import { throttle } from "@solid-primitives/scheduled";
import {
  cursorBytesKey,
  formatCursorSlot,
  normalizedCursorToDocumentPoint,
  packCursorPosition,
  type PackedCursorPosition,
} from "@shared/cursor";
import { getCursorDocumentSize, pickCursorSlotColor } from "@web/lib/cursor";
import { publishCursor, subscribeCursor } from "@web/lib/api";
import type { CursorState } from "@web/types/home";
import { createEffect, createMemo, createSignal, onCleanup, onMount } from "solid-js";

function getDocumentSize() {
  return getCursorDocumentSize(document.documentElement);
}

export function useCursorPresence() {
  type RemoteCursorState = Omit<CursorState, "x" | "y"> & {
    position: PackedCursorPosition;
  };

  const [cursorsBySlot, setCursorsBySlot] = createSignal<Record<number, RemoteCursorState>>({});
  const [localSelfPoint, setLocalSelfPoint] = createSignal<{ x: number; y: number } | null>(null);
  const [documentSize, setDocumentSize] = createSignal(getDocumentSize());
  const mouse = createMousePosition(window, { followTouch: false });
  let localViewportPoint: { x: number; y: number } | null = null;
  let lastPublishedCursorKey: string | null = null;

  const publishCursorPosition = (point: { x: number; y: number }) => {
    const packedPosition = packCursorPosition(point, getDocumentSize());
    const packedKey = cursorBytesKey(packedPosition);
    if (packedKey === lastPublishedCursorKey) {
      return;
    }

    if (publishCursor(packedPosition)) {
      lastPublishedCursorKey = packedKey;
    }
  };

  const throttledPublishCursorPosition = throttle(publishCursorPosition, 50);
  const updateLocalCursorPosition = (point: { x: number; y: number }) => {
    setLocalSelfPoint(point);
    throttledPublishCursorPosition(point);
  };

  createEffect(() => {
    const x = mouse.x;
    const y = mouse.y;
    if (!mouse.sourceType || !Number.isFinite(x) || !Number.isFinite(y)) {
      return;
    }

    const point =
      mouse.sourceType === "touch" ? { x: x + window.scrollX, y: y + window.scrollY } : { x, y };

    localViewportPoint = {
      x: point.x - window.scrollX,
      y: point.y - window.scrollY,
    };
    updateLocalCursorPosition(point);
  });

  onCleanup(() => throttledPublishCursorPosition.clear());

  onMount(() => {
    const handleScroll = () => {
      setDocumentSize(getDocumentSize());

      if (!localViewportPoint) {
        return;
      }

      updateLocalCursorPosition({
        x: localViewportPoint.x + window.scrollX,
        y: localViewportPoint.y + window.scrollY,
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

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

      setCursorsBySlot((previous) => ({
        ...previous,
        [event.slot]: {
          slot: event.slot,
          label: formatCursorSlot(event.slot),
          position: event.position,
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
    const handleResize = () => setDocumentSize(getDocumentSize());
    window.addEventListener("resize", handleResize, { passive: true });

    onCleanup(() => {
      window.removeEventListener("scroll", handleScroll);
      unsubscribe();
      window.clearInterval(staleInterval);
      window.removeEventListener("resize", handleResize);
    });
  });

  const cursors = createMemo(() => {
    const currentDocumentSize = documentSize();
    const remoteCursors = Object.values(cursorsBySlot()).map(({ position, ...cursor }) => ({
      ...cursor,
      ...normalizedCursorToDocumentPoint(position, currentDocumentSize),
    }));
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
