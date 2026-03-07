import { Elysia, file } from "elysia";
import {
  loadDistAssetRoutes,
  type DistAssetRoute,
} from "./dist-assets.macro" with { type: "macro" };

const distAssetRoutes = loadDistAssetRoutes() as DistAssetRoute[];

function getCacheControl(asset: DistAssetRoute) {
  if (asset.routePath.startsWith("/_astro/")) {
    return "public, max-age=31536000, immutable";
  }

  if (asset.filePath.endsWith(".html")) {
    return "no-cache";
  }

  return "public, max-age=3600";
}

export function createDistAssetsSubrouter() {
  const router = new Elysia({ name: "dist-assets" });

  for (const asset of distAssetRoutes) {
    router.get(asset.routePath, ({ set }) => {
      set.headers["cache-control"] = getCacheControl(asset);
      return file(asset.filePath);
    });
  }

  return router;
}
