import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import solidJs from "@astrojs/solid-js";

export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
    server: {
      proxy: {
        "/api": "http://localhost:3000",
      },
    },
  },
  integrations: [solidJs()],
});
