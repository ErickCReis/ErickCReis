import { PUBLIC_API_URL } from "astro:env/client";
import { createAuthClient } from "better-auth/client";

export const authClient = createAuthClient({
  baseURL: PUBLIC_API_URL,
  basePath: "/api/auth",
});
