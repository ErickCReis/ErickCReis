import { BETTER_AUTH_URL } from "astro:env/client";
import { createAuthClient } from "better-auth/client";

export const authClient = createAuthClient({
  baseURL: BETTER_AUTH_URL,
  basePath: "/api/auth",
});
