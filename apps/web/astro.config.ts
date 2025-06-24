import solidJs from "@astrojs/solid-js";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, envField } from "astro/config";

export default defineConfig({
  site: "https://erickcreis.github.io",
  base: "/ErickCReis",
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [solidJs()],
  env: {
    schema: {
      PUBLIC_API_URL: envField.string({
        context: "client",
        access: "public",
      }),
    },
  },
});
