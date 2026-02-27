import { pickColor } from "@/features/home/lib/cursor";
import type { CursorState } from "@/features/home/types";
import { publishCursor, subscribeCursor, type CursorPayload } from "@/lib/api";
import { createMemo, createSignal, onCleanup, onMount } from "solid-js";

export function useCursorPresence() {
  const [cursorsById, setCursorsById] = createSignal<Record<string, CursorState>>({});
  const pendingPointRef: { current: { x: number; y: number } | null } = { current: null };
  let frameScheduled = false;

  const selfId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
  const selfColor = pickColor(selfId);

  onMount(() => {
    const unsubscribe = subscribeCursor((payload) => {
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

    const onPointerMove = (event: PointerEvent) => {
      pendingPointRef.current = { x: event.clientX, y: event.clientY };

      if (frameScheduled) {
        return;
      }

      frameScheduled = true;
      window.requestAnimationFrame(() => {
        frameScheduled = false;

        const point = pendingPointRef.current;
        if (!point) {
          return;
        }

        const payload: CursorPayload = {
          id: selfId,
          x: point.x,
          y: point.y,
          color: selfColor,
        };

        setCursorsById((previous) => ({
          ...previous,
          [selfId]: {
            ...payload,
            updatedAt: Date.now(),
          },
        }));

        publishCursor(payload);
      });
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });

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
      window.removeEventListener("pointermove", onPointerMove);
      window.clearInterval(staleInterval);
    });
  });

  const cursors = createMemo(() => Object.values(cursorsById()));

  return {
    selfId,
    cursors,
  };
}
