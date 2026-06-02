import { Elysia, status } from "elysia";
import {
  parseTokenUsageSyncPayload,
  persistTokenUsageSyncPayload,
} from "@server/stats/token-usage";

function getConfiguredSyncToken() {
  return Bun.env.TOKEN_USAGE_SYNC_TOKEN?.trim() || null;
}

async function handleTokenUsageSync({ body, request }: { body: unknown; request: Request }) {
  const configuredSyncToken = getConfiguredSyncToken();
  if (!configuredSyncToken) {
    return status(503, { error: "Token usage sync is not configured" });
  }

  const authorization = request.headers.get("authorization");
  const providedToken = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";
  if (!providedToken || providedToken !== configuredSyncToken) {
    return status(401, { error: "Unauthorized" });
  }

  const parsedPayload = parseTokenUsageSyncPayload(body);
  if (!parsedPayload.success) {
    return status(400, { error: "Invalid token usage sync payload" });
  }

  await persistTokenUsageSyncPayload(parsedPayload.output);

  return {
    ok: true,
    generatedAt: parsedPayload.output.generatedAt,
    daysSynced: parsedPayload.output.daily.length,
  };
}

export const internalRoutes = new Elysia({ name: "internal-routes" }).post(
  "/internal/token-usage/sync",
  handleTokenUsageSync,
);
