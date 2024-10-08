// @ts-check
import { defineConfig } from "astro/config";

import preact from "@astrojs/preact";

import mdx from "@astrojs/mdx";

import tailwind from "@astrojs/tailwind";

import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  site: "https://space.shantou.university",
  integrations: [preact({ compat: true }), mdx(), tailwind(), sitemap()],
});