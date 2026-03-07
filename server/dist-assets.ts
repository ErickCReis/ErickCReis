import { Elysia } from "elysia";
import {
  loadDistAssetRoutes,
  type DistAssetRoute,
} from "./dist-assets.macro" with { type: "macro" };

const distAssetRoutes = loadDistAssetRoutes() as DistAssetRoute[];

export function createDistAssetsSubrouter() {
  const router = new Elysia({ name: "dist-assets" });

  for (const asset of distAssetRoutes) {
    const body = Uint8Array.from(Buffer.from(asset.bodyBase64, "base64"));
    const headers = new Headers({
      "content-type": asset.contentType,
    });

    if (asset.isHtml) {
      headers.set("cache-control", "no-cache");
    }

    router.get(asset.routePath, () => new Response(body, { headers }));
  }

  return router;
}
