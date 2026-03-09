import { existsSync, readdirSync, statSync } from "node:fs";
import { relative, resolve, sep } from "node:path";

export type DistAssetRoute = {
  routePath: string;
  filePath: string;
};

function shouldRequireDist() {
  return (
    Bun.argv.includes("build") ||
    Bun.argv.includes("--compile") ||
    Bun.env.NODE_ENV === "production"
  );
}

function walkFiles(root: string): string[] {
  const entries: string[] = [];

  for (const entry of readdirSync(root).sort()) {
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
    if (!shouldRequireDist()) {
      return [];
    }

    throw new Error(
      `Missing dist assets at ${distRoot}. Run the client build before bundling the server (for example: "bun --bun astro build").`,
    );
  }

  const routes = new Map<string, DistAssetRoute>();

  for (const filePath of walkFiles(distRoot)) {
    for (const routePath of toRouteCandidates(relative(distRoot, filePath))) {
      const existingRoute = routes.get(routePath);
      if (existingRoute) {
        throw new Error(
          `Duplicate dist route "${routePath}" for "${filePath}". Existing route entry: ${JSON.stringify(existingRoute)}.`,
        );
      }

      routes.set(routePath, {
        routePath,
        filePath,
      });
    }
  }

  return [...routes.values()].sort((left, right) => left.routePath.localeCompare(right.routePath));
}
