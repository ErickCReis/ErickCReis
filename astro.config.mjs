import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import solid from "@astrojs/solid-js";
import tailwindcss from "@tailwindcss/vite";

const apiPort = process.env.API_PORT ?? "3000";
const apiTarget = `http://127.0.0.1:${apiPort}`;

export default defineConfig({
  integrations: [mdx(), solid()],
  vite: {
    plugins: [tailwindcss()],
    server: {
      proxy: {
        "/api": {
          target: apiTarget,
          changeOrigin: true,
          ws: true,
        },
        "/health": {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
  },
});
