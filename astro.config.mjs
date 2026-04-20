import { defineConfig, fontProviders } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import solid from "@astrojs/solid-js";
import tailwindcss from "@tailwindcss/vite";
import astroTranslate from "./plugins/translate-plugin.ts";

export default defineConfig({
  srcDir: "./web",
  output: "static",
  site: "https://erickr.dev",
  integrations: [
    sitemap(),
    mdx(),
    solid(),
    astroTranslate({
      locales: ["en-US", "pt-BR"],
      defaultLocale: "en-US",
    }),
  ],
  devToolbar: {
    enabled: false,
  },
  fonts: [
    {
      provider: fontProviders.fontsource(),
      name: "Instrument Sans",
      cssVariable: "--font-family-sans",
      weights: ["400 700"],
      styles: ["normal", "italic"],
      fallbacks: ["ui-sans-serif", "system-ui", "sans-serif"],
    },
    {
      provider: fontProviders.fontsource(),
      name: "STIX Two Text",
      cssVariable: "--font-family-serif",
      weights: ["400 700"],
      styles: ["normal", "italic"],
      fallbacks: ["ui-serif", "Georgia", "serif"],
    },
    {
      provider: fontProviders.fontsource(),
      name: "IBM Plex Mono",
      cssVariable: "--font-family-mono",
      weights: [400, 500],
      styles: ["normal"],
      fallbacks: ["ui-monospace", "SFMono-Regular", "monospace"],
    },
  ],
  vite: {
    plugins: [tailwindcss()],
    server: {
      watch: {
        ignored: ["**/data/**"],
      },
    },
  },
});
