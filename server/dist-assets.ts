import { Elysia, file } from "elysia";
import { loadDistAssetRoutes } from "./dist-assets.macro" with { type: "macro" };

const distAssetRoutes = await loadDistAssetRoutes();

type DistAsset = (typeof distAssetRoutes)[number];

function getCacheControl(asset: DistAsset) {
  if (asset.routePath.startsWith("/_astro/")) {
    return "public, max-age=31536000, immutable";
  }

  if (asset.filePath.endsWith(".html")) {
    return "no-cache";
  }

  return "public, max-age=3600";
}

function matchesIfNoneMatch(ifNoneMatch: string | null, etag: string) {
  if (!ifNoneMatch) return false;

  const expected = etag.replace(/^W\//, "");

  return ifNoneMatch.split(",").some((candidate) => {
    const value = candidate.trim();
    return value === "*" || value.replace(/^W\//, "") === expected;
  });
}

export function createDistAssetsSubrouter() {
  const router = new Elysia({ name: "dist-assets" });

  for (const asset of distAssetRoutes) {
    router.get(asset.routePath, ({ request, set }) => {
      set.headers["cache-control"] = getCacheControl(asset);
      set.headers.etag = asset.etag;

      if (matchesIfNoneMatch(request.headers.get("if-none-match"), asset.etag)) {
        set.status = 304;
        return;
      }

      return file(asset.filePath);
    });
  }

  return router;
}
