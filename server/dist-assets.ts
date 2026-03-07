import { Elysia, file } from "elysia";
import {
  loadDistAssetRoutes,
  type DistAssetRoute,
} from "./dist-assets.macro" with { type: "macro" };

const distAssetRoutes = loadDistAssetRoutes() as DistAssetRoute[];

export function createDistAssetsSubrouter() {
  const router = new Elysia({ name: "dist-assets" });

  for (const asset of distAssetRoutes) {
    router.get(asset.routePath, () => file(asset.filePath));
  }

  return router;
}
