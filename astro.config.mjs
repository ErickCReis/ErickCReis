import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import solid from "@astrojs/solid-js";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  output: "static",
  site: "http://localhost:3000",

  integrations: [mdx(), solid()],
  vite: {
    plugins: [tailwindcss()],
  },
});
