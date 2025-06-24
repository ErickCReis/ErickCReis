import { createStore } from "solid-js/store";
import { clientCursorPosition } from "./orpc";

export const [cursorsPositions, setCursorsPositions] = createStore<
  Record<string, { x: number; y: number }>
>({});

clientCursorPosition.onMessage().then(async (messages) => {
  for await (const message of messages) {
    setCursorsPositions({ [message.id]: message });
  }
});
