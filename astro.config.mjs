// @ts-check
import { defineConfig } from "astro/config";

import preact from "@astrojs/preact";

import mdx from "@astrojs/mdx";

import tailwindcss from "@tailwindcss/vite";

import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  site: "https://space.shantou.university",
  integrations: [preact({ compat: true }), mdx(), sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
});
