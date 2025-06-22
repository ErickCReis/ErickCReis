import tailwindcss from "@tailwindcss/vite";
import { defineConfig, envField } from "astro/config";

export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
  },
  env: {
    schema: {
      BETTER_AUTH_URL: envField.string({
        context: "client",
        access: "public",
      }),
    },
  },
});
