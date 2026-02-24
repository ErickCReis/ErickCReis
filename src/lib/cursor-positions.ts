import { createStore } from "solid-js/store";
import { subscribeCursor } from "./eden";

export const [cursorsPositions, setCursorsPositions] = createStore<
  Record<string, { x: number; y: number }>
>({});

subscribeCursor((payload) => {
  setCursorsPositions(payload.id, { x: payload.x, y: payload.y });
});
