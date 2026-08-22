import { resolve } from "node:path";

export function createDistAssetsServeOptions() {
  return {
    routes: {
      "/*": { dir: resolve("dist") },
    },
  };
}
