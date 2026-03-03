import { join } from "node:path";
import { mkdirSync } from "node:fs";

const DEFAULT_DATA_DIR = "./data";

let resolved: string | null = null;

function resolve(): string {
  if (resolved) return resolved;
  resolved = Bun.env.DATA_DIR?.trim() || DEFAULT_DATA_DIR;
  mkdirSync(resolved, { recursive: true });
  return resolved;
}

export function getDataPath(filename: string): string {
  return join(resolve(), filename);
}
