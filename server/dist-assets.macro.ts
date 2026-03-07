import { existsSync, readdirSync, statSync } from "node:fs";
import { relative, resolve, sep } from "node:path";

export type DistAssetRoute = {
  routePath: string;
  filePath: string;
};

function walkFiles(root: string): string[] {
  const entries: string[] = [];

  for (const entry of readdirSync(root)) {
    const entryPath = resolve(root, entry);
    const stats = statSync(entryPath);

    if (stats.isDirectory()) {
      entries.push(...walkFiles(entryPath));
      continue;
    }

    if (stats.isFile()) {
      entries.push(entryPath);
    }
  }

  return entries;
}

function toRouteCandidates(relativePath: string): string[] {
  const routePath = `/${relativePath.split(sep).join("/")}`;
  const routes = new Set<string>([routePath]);

  if (routePath.endsWith("/index.html")) {
    const nestedIndexPath = routePath.slice(0, -"/index.html".length) || "/";
    routes.add(nestedIndexPath);

    if (nestedIndexPath !== "/") {
      routes.add(`${nestedIndexPath}/`);
    }
  } else if (routePath.endsWith(".html")) {
    routes.add(routePath.slice(0, -".html".length) || "/");
  }

  return [...routes];
}

export function loadDistAssetRoutes(): DistAssetRoute[] {
  const distRoot = resolve(import.meta.dir, "../dist");
  if (!existsSync(distRoot)) {
    return [];
  }

  const routes = new Map<string, DistAssetRoute>();

  for (const filePath of walkFiles(distRoot)) {
    for (const routePath of toRouteCandidates(relative(distRoot, filePath))) {
      if (routes.has(routePath)) {
        continue;
      }

      routes.set(routePath, {
        routePath,
        filePath,
      });
    }
  }

  return [...routes.values()].sort((left, right) => left.routePath.localeCompare(right.routePath));
}
