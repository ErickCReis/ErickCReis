import { createMousePosition } from "@solid-primitives/mouse";
import { throttle } from "@solid-primitives/scheduled";
import { pickColor } from "@web/lib/cursor";
import type { CursorState } from "@web/types/home";
import type { CursorPayload } from "@shared/telemetry";
import { getCursorIdentity, publishCursor, subscribeCursor } from "@web/lib/api";
import { createEffect, createMemo, createSignal, onCleanup, onMount } from "solid-js";

export function useCursorPresence() {
  const [cursorsById, setCursorsById] = createSignal<Record<string, CursorState>>({});
  const [localSelfPoint, setLocalSelfPoint] = createSignal<{ x: number; y: number } | null>(null);
  const [selfId, setSelfId] = createSignal<string | null>(null);
  const mouse = createMousePosition();

  const selfColor = createMemo(() => {
    const id = selfId();
    return id ? pickColor(id) : undefined;
  });

  const publishCursorPosition = (point: { x: number; y: number }) => {
    const ownCursorId = selfId();
    if (!ownCursorId) {
      return;
    }

    const payload: CursorPayload = {
      id: ownCursorId,
      x: point.x,
      y: point.y,
      color: selfColor(),
    };

    publishCursor(payload);
  };

  const throttledPublishCursorPosition = throttle(publishCursorPosition, 50);

  createEffect(() => {
    const x = mouse.x;
    const y = mouse.y;
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return;
    }

    setLocalSelfPoint({ x, y });
    throttledPublishCursorPosition({ x, y });
  });

  onCleanup(() => throttledPublishCursorPosition.clear());

  onMount(() => {
    const syncSelfId = async () => {
      for (let attempt = 0; attempt < 10; attempt += 1) {
        try {
          const { cursorId } = await getCursorIdentity();
          setSelfId(cursorId);
          return;
        } catch {
          await new Promise<void>((resolve) => {
            window.setTimeout(resolve, 150);
          });
        }
      }

      console.error("Failed to sync cursor identity from server");
    };

    void syncSelfId();

    const unsubscribe = subscribeCursor((payload) => {
      if (payload.id === selfId()) {
        return;
      }

      setCursorsById((previous) => ({
        ...previous,
        [payload.id]: {
          id: payload.id,
          x: payload.x,
          y: payload.y,
          color: payload.color ?? pickColor(payload.id),
          updatedAt: Date.now(),
        },
      }));
    });

    const staleInterval = window.setInterval(() => {
      const cutoff = Date.now() - 7000;
      setCursorsById((previous) =>
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
    const remoteCursors = Object.values(cursorsById());
    const localPoint = localSelfPoint();
    const ownCursorId = selfId();
    if (!localPoint || !ownCursorId) {
      return remoteCursors;
    }

    return [
      ...remoteCursors,
      {
        id: ownCursorId,
        x: localPoint.x,
        y: localPoint.y,
        color: selfColor() ?? pickColor(ownCursorId),
        updatedAt: Date.now(),
      },
    ];
  });

  return {
    selfId,
    cursors,
  };
}
