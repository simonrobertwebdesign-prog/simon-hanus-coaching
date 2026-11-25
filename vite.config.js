import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// The fonts on the first screen start downloading straight away, alongside the code.
function preloadFonts() {
  let base = "/";
  return {
    name: "preload-fonts",
    configResolved(config) {
      base = config.base;
    },
    transformIndexHtml: {
      order: "post",
      handler(html, ctx) {
        if (!ctx.bundle) return html;
        const fonts = Object.keys(ctx.bundle).filter((f) => /(anybody-latin|instrument-sans-latin)-.*\.woff2$/.test(f));
        return {
          html,
          tags: fonts.map((f) => ({ tag: "link", attrs: { rel: "preload", href: base + f, as: "font", type: "font/woff2", crossorigin: "" }, injectTo: "head" })),
        };
      },
    },
  };
}

// "preview" mode builds one self-contained HTML file (for the clickable preview).
// Normal builds are the live site. It's hosted on GitHub Pages at
// https://simonrobertwebdesign-prog.github.io/simon-hanus-coaching/, so the
// GitHub build sets BASE_PATH=/simon-hanus-coaching/ (see .github/workflows/pages.yml).
export default defineConfig(({ mode }) => ({
  base: mode === "preview" ? "./" : process.env.BASE_PATH || "/",
  plugins: mode === "preview" ? [react(), viteSingleFile()] : [react(), preloadFonts()],
  build: {
    target: "es2022",
    outDir: mode === "preview" ? "preview-dist" : "dist",
    assetsInlineLimit: mode === "preview" ? 100000000 : 4096,
  },
}));
