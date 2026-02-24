import { cursorsPositions } from "@/lib/cursor-positions";
import { client } from "@/lib/orpc";
import { createMousePosition } from "@solid-primitives/mouse";
import { throttle } from "@solid-primitives/scheduled";
import { createDerivedSpring } from "@solid-primitives/spring";
import { createEffect, For } from "solid-js";

const id = Math.random().toString(36).substring(2, 15);

export function CursorPosition() {
  const pos = createMousePosition(window);
  const throttledPos = throttle((x: number, y: number) => {
    console.log("sending", id, x, y);
    client.publish({ id, x, y });
  }, 100);

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
              <Point x={cursor.x} y={cursor.y} />
            </li>
          )}
        </For>
      </ul>
    </div>
  );
}

export function Point(props: { x: number; y: number }) {
  const springPosX = createDerivedSpring(() => props.x);
  const springPosY = createDerivedSpring(() => props.y);
  return (
    <div
      style={{
        position: "absolute",
        width: "10px",
        height: "10px",
        "background-color": "red",
        left: `${springPosX()}px`,
        top: `${springPosY()}px`,
      }}
    />
  );
}
