import { RPCHandler } from "@orpc/server/fetch";
import type { APIRoute } from "astro";
import { router } from "@/api/router";

const handler = new RPCHandler(router);

export const ALL: APIRoute = async ({ request }) => {
  const { response } = await handler.handle(request, { prefix: "/api" });
  return response ?? new Response("Not found", { status: 404 });
};
