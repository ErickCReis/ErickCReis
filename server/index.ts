import { Elysia } from "elysia";
import cors from "@elysiajs/cors";
import { contentRoutes } from "@server/content/routes";
import { batteryAlertCron } from "@server/cron/battery-alert";
import { createDistAssetsSubrouter } from "@server/dist-assets";
import { internalRoutes } from "@server/internal/routes";
import { liveRoutes } from "@server/live/routes";
import { presenceRoutes } from "@server/presence/routes";
import { applySecureHeaders } from "@server/lib/secure-headers";
import { startStatsServices, statsRoutes } from "@server/stats/routes";

const app = new Elysia()
  .onAfterHandle(({ set }) => {
    applySecureHeaders(set.headers);
  })
  .use(
    cors({
      origin:
        Bun.env.NODE_ENV === "production"
          ? ["https://erickr.dev", "https://www.erickr.dev"]
          : ["http://localhost:4321"],
      credentials: true,
    }),
  )
  .use(statsRoutes)
  .use(presenceRoutes)
  .use(contentRoutes)
  .use(internalRoutes)
  .use(liveRoutes)
  .use(batteryAlertCron);

if (Bun.env.NODE_ENV === "production") {
  app.use(createDistAssetsSubrouter());
}

app.listen({ hostname: "0.0.0.0", port: 3000 }, ({ hostname, port }) => {
  console.log(`Server is running on: http://${hostname}:${port}`);
});

if (app.server) {
  startStatsServices();
}

export { app };
export type App = typeof app;
