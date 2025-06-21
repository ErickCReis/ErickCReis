import type { Context as HonoContext } from "hono";
import { auth } from "@/lib/auth";

export type CreateContextOptions = {
  context: HonoContext<{ Bindings: Env }>;
};

export async function createContext({ context }: CreateContextOptions) {
  const session = await auth.api.getSession({
    headers: context.req.raw.headers,
  });
  return {
    session,
    db: context.env.DB,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
