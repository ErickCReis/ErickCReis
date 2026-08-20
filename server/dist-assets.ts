import { resolve } from "node:path";

export function createDistAssetsServeOptions() {
  const routes = {
    "/*": { dir: resolve("dist") },
  };

  // Bun 1.4 directory routes shipped before @types/bun's 1.4 declarations.
  return { routes: routes as unknown as Bun.Serve.Options<unknown>["routes"] };
}
