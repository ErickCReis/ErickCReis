import type { RouterClient } from "@orpc/server";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { router } from "@/api/router";

const link = new RPCLink({ url: "http://localhost:4321/api" });

export const client: RouterClient<typeof router> = createORPCClient(link);
