import { readFileSync } from "node:fs";

export function readTextFile(path: string): string | null {
  try {
    return readFileSync(path, "utf-8").trim();
  } catch {
    return null;
  }
}
