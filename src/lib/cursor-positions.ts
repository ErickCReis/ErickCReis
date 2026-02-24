import { createStore } from "solid-js/store";
import { client } from "./orpc";

export const [cursorsPositions, setCursorsPositions] = createStore<
  Record<string, { x: number; y: number }>
>({});

(async () => {
  while (true) {
    try {
      const iterator = await client.live();
      for await (const payload of iterator) {
        setCursorsPositions(payload.id, { x: payload.x, y: payload.y });
      }
    } catch (error) {
      console.error(error);
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second before retrying
    }
  }
})();
