import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import solid from "@astrojs/solid-js";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  output: "static",
  site: "https://erickr.dev",
  integrations: [mdx(), solid()],
  vite: {
    plugins: [tailwindcss()],
  },
});
