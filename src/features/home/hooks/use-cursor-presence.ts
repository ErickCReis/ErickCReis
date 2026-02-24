import { pickColor } from "@/features/home/lib/cursor";
import type { CursorState } from "@/features/home/types";
import { publishCursor, subscribeCursor, type CursorPayload } from "@/lib/api";
import { useEffect, useRef, useState } from "react";

export function useCursorPresence() {
  const [cursors, setCursors] = useState<Record<string, CursorState>>({});
  const pendingPointRef = useRef<{ x: number; y: number } | null>(null);
  const frameScheduledRef = useRef(false);
  const selfIdRef = useRef(
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
  );
  const selfColorRef = useRef(pickColor(selfIdRef.current));

  useEffect(() => {
    const selfId = selfIdRef.current;

    const unsubscribe = subscribeCursor((payload) => {
      setCursors((previous) => ({
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

      if (frameScheduledRef.current) {
        return;
      }

      frameScheduledRef.current = true;
      window.requestAnimationFrame(() => {
        frameScheduledRef.current = false;

        const point = pendingPointRef.current;
        if (!point) {
          return;
        }

        const payload: CursorPayload = {
          id: selfId,
          x: point.x,
          y: point.y,
          color: selfColorRef.current,
        };

        setCursors((previous) => ({
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
      setCursors((previous) =>
        Object.fromEntries(
          Object.entries(previous).filter(([, cursor]) => cursor.updatedAt >= cutoff),
        ),
      );
    }, 2200);

    return () => {
      unsubscribe();
      window.removeEventListener("pointermove", onPointerMove);
      window.clearInterval(staleInterval);
    };
  }, []);

  return {
    selfId: selfIdRef.current,
    cursors: Object.values(cursors),
  };
}
