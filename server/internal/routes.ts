import { Elysia, status } from "elysia";
import { parseCodexUsageSyncPayload, persistCodexUsageSyncPayload } from "@server/stats/codex";

export const internalRoutes = new Elysia({ name: "internal-routes" }).post(
  "/internal/codex/sync",
  async ({ body, request }) => {
    const configuredSyncToken = Bun.env.CODEX_SYNC_TOKEN?.trim();
    if (!configuredSyncToken) {
      return status(503, { error: "Codex sync is not configured" });
    }

    const authorization = request.headers.get("authorization");
    const providedToken = authorization?.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length).trim()
      : "";
    if (!providedToken || providedToken !== configuredSyncToken) {
      return status(401, { error: "Unauthorized" });
    }

    const parsedPayload = parseCodexUsageSyncPayload(body);
    if (!parsedPayload.success) {
      return status(400, { error: "Invalid Codex sync payload" });
    }

    await persistCodexUsageSyncPayload(parsedPayload.output);

    return {
      ok: true,
      generatedAt: parsedPayload.output.generatedAt,
      daysSynced: parsedPayload.output.daily.length,
    };
  },
);
