import { createMousePosition } from "@solid-primitives/mouse";
import { throttle } from "@solid-primitives/scheduled";
import { createEffect, For } from "solid-js";
import { cursorsPositions } from "@/lib/cursor-position";
import { clientCursorPosition } from "@/lib/orpc";

const id = Math.random().toString(36).substring(2, 15);

export function CursorPosition() {
  const pos = createMousePosition(window);
  const throttledPos = throttle((x: number, y: number) => {
    console.log("sending", id, x, y);
    clientCursorPosition.send({ id, x, y });
  }, 50);

  createEffect(() => {
    throttledPos(pos.x, pos.y);
  });

  return (
    <div>
      <h1>Cursor Positions</h1>
      <ul>
        <For each={Object.entries(cursorsPositions)}>
          {([id, cursor]) => (
            <li>
              {id}: {cursor.x}, {cursor.y}
            </li>
          )}
        </For>
      </ul>
    </div>
  );
}
