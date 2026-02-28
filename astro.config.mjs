import { defineConfig, fontProviders } from "astro/config";
import mdx from "@astrojs/mdx";
import solid from "@astrojs/solid-js";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  output: "static",
  site: "https://erickr.dev",
  integrations: [mdx(), solid()],
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
  },
});
